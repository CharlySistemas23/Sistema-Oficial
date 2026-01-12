import express from 'express';
import { query, getClient } from '../config/database.js';
import { requireBranchAccess } from '../middleware/auth.js';
import { emitSaleUpdate } from '../socket/socketHandler.js';

// Importar io desde el módulo principal
let io;
export const setIO = (socketIO) => {
  io = socketIO;
};

const router = express.Router();

// Obtener ventas
router.get('/', requireBranchAccess, async (req, res) => {
  try {
    const { branch_id, start_date, end_date, status, seller_id, guide_id, agency_id } = req.query;
    const branchId = branch_id || req.user.branchId;

    let sql = `
      SELECT s.*,
             (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) as items_count
      FROM sales s
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    // Filtro por sucursal
    if (req.user.isMasterAdmin) {
      if (branchId) {
        sql += ` AND s.branch_id = $${paramCount}`;
        params.push(branchId);
        paramCount++;
      }
    } else {
      sql += ` AND s.branch_id = $${paramCount}`;
      params.push(req.user.branchId);
      paramCount++;
    }

    if (start_date) {
      sql += ` AND s.created_at >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      sql += ` AND s.created_at <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    if (status) {
      sql += ` AND s.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (seller_id) {
      sql += ` AND s.seller_id = $${paramCount}`;
      params.push(seller_id);
      paramCount++;
    }

    if (guide_id) {
      sql += ` AND s.guide_id = $${paramCount}`;
      params.push(guide_id);
      paramCount++;
    }

    if (agency_id) {
      sql += ` AND s.agency_id = $${paramCount}`;
      params.push(agency_id);
      paramCount++;
    }

    sql += ` ORDER BY s.created_at DESC LIMIT 1000`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo ventas:', error);
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
});

// Obtener una venta con sus items y pagos
router.get('/:id', requireBranchAccess, async (req, res) => {
  try {
    const { id } = req.params;

    const saleResult = await query(
      'SELECT * FROM sales WHERE id = $1',
      [id]
    );

    if (saleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    const sale = saleResult.rows[0];

    // Verificar acceso
    if (!req.user.isMasterAdmin && sale.branch_id !== req.user.branchId) {
      return res.status(403).json({ error: 'No tienes acceso a esta venta' });
    }

    // Obtener items
    const itemsResult = await query(
      'SELECT * FROM sale_items WHERE sale_id = $1',
      [id]
    );

    // Obtener pagos
    const paymentsResult = await query(
      'SELECT * FROM payments WHERE sale_id = $1',
      [id]
    );

    res.json({
      ...sale,
      items: itemsResult.rows,
      payments: paymentsResult.rows
    });
  } catch (error) {
    console.error('Error obteniendo venta:', error);
    res.status(500).json({ error: 'Error al obtener venta' });
  }
});

// Crear venta
router.post('/', requireBranchAccess, async (req, res) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    const {
      folio, branch_id, seller_id, guide_id, agency_id, customer_id,
      items, payments, discount_percent = 0, discount_amount = 0
    } = req.body;

    const finalBranchId = branch_id || req.user.branchId;

    // Calcular totales
    let subtotal = 0;
    items.forEach(item => {
      subtotal += (item.unit_price || 0) * (item.quantity || 1);
    });

    const total = subtotal - discount_amount;

    // Crear venta
    const saleResult = await client.query(
      `INSERT INTO sales (
        folio, branch_id, seller_id, guide_id, agency_id, customer_id,
        subtotal, discount_percent, discount_amount, total, status, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        folio || `SALE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        finalBranchId,
        seller_id,
        guide_id,
        agency_id,
        customer_id,
        subtotal,
        discount_percent,
        discount_amount,
        total,
        'completed',
        req.user.id
      ]
    );

    const sale = saleResult.rows[0];

    // Crear items de venta y actualizar inventario
    for (const item of items) {
      // Validar stock antes de crear la venta
      if (item.item_id) {
        const inventoryResult = await client.query(
          'SELECT stock_actual, status FROM inventory_items WHERE id = $1',
          [item.item_id]
        );

        if (inventoryResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `Item ${item.item_id} no encontrado` });
        }

        const currentStock = inventoryResult.rows[0].stock_actual || 0;
        const requestedQuantity = item.quantity || 1;

        if (currentStock < requestedQuantity) {
          await client.query('ROLLBACK');
          return res.status(400).json({ 
            error: `Stock insuficiente para ${item.name || item.sku}. Stock disponible: ${currentStock}, solicitado: ${requestedQuantity}` 
          });
        }

        if (inventoryResult.rows[0].status !== 'disponible') {
          await client.query('ROLLBACK');
          return res.status(400).json({ 
            error: `El item ${item.name || item.sku} no está disponible para venta` 
          });
        }
      }

      // Crear sale_item
      await client.query(
        `INSERT INTO sale_items (
          sale_id, item_id, sku, name, quantity, unit_price,
          discount_percent, subtotal, guide_commission, seller_commission
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          sale.id,
          item.item_id,
          item.sku,
          item.name,
          item.quantity || 1,
          item.unit_price,
          item.discount_percent || 0,
          item.subtotal,
          item.guide_commission || 0,
          item.seller_commission || 0
        ]
      );

      // Actualizar stock del inventario
      if (item.item_id) {
        const inventoryResult = await client.query(
          'SELECT stock_actual FROM inventory_items WHERE id = $1',
          [item.item_id]
        );

        if (inventoryResult.rows.length > 0) {
          const currentStock = inventoryResult.rows[0].stock_actual || 0;
          const newStock = Math.max(0, currentStock - (item.quantity || 1));
          const newStatus = newStock <= 0 ? 'vendida' : 'disponible';

          await client.query(
            `UPDATE inventory_items
             SET stock_actual = $1, status = $2
             WHERE id = $3`,
            [newStock, newStatus, item.item_id]
          );

          // Log de inventario
          await client.query(
            `INSERT INTO inventory_logs (item_id, action, quantity, stock_before, stock_after, reason, notes, user_id)
             VALUES ($1, 'vendida', $2, $3, $4, 'venta', $5, $6)`,
            [
              item.item_id,
              item.quantity || 1,
              currentStock,
              newStock,
              `Venta ${sale.folio}`,
              req.user.id
            ]
          );
        }
      }
    }

    // Crear pagos
    for (const payment of payments) {
      await client.query(
        `INSERT INTO payments (sale_id, method, amount, currency, bank, card_type)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          sale.id,
          payment.method,
          payment.amount,
          payment.currency || 'MXN',
          payment.bank,
          payment.card_type
        ]
      );
    }

    await client.query('COMMIT');

    // Obtener venta completa
    const fullSaleResult = await query(
      `SELECT s.*,
              (SELECT json_agg(json_build_object(
                'id', si.id,
                'item_id', si.item_id,
                'sku', si.sku,
                'name', si.name,
                'quantity', si.quantity,
                'unit_price', si.unit_price,
                'subtotal', si.subtotal
              )) FROM sale_items si WHERE si.sale_id = s.id) as items,
              (SELECT json_agg(json_build_object(
                'id', p.id,
                'method', p.method,
                'amount', p.amount,
                'currency', p.currency
              )) FROM payments p WHERE p.sale_id = s.id) as payments
       FROM sales s
       WHERE s.id = $1`,
      [sale.id]
    );

    const fullSale = fullSaleResult.rows[0];

    // Registrar en audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'create', 'sale', $2, $3)`,
      [req.user.id, sale.id, JSON.stringify({ folio: sale.folio, total })]
    );

    // Emitir actualización en tiempo real
    if (io) {
      emitSaleUpdate(io, finalBranchId, 'created', fullSale);
    }

    res.status(201).json(fullSale);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creando venta:', error);
    res.status(500).json({ error: 'Error al crear venta' });
  } finally {
    client.release();
  }
});

// Eliminar venta (solo para reversión/corrección)
router.delete('/:id', requireBranchAccess, async (req, res) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    const { id } = req.params;

    // Verificar que existe y tiene acceso
    const saleResult = await client.query(
      'SELECT * FROM sales WHERE id = $1',
      [id]
    );

    if (saleResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    const sale = saleResult.rows[0];

    // Verificar acceso
    if (!req.user.isMasterAdmin && sale.branch_id !== req.user.branchId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'No tienes acceso a esta venta' });
    }

    // Obtener items de la venta para reversión de stock
    const itemsResult = await client.query(
      'SELECT * FROM sale_items WHERE sale_id = $1',
      [id]
    );

    // Revertir stock del inventario
    for (const saleItem of itemsResult.rows) {
      if (saleItem.item_id) {
        // Obtener stock actual
        const inventoryResult = await client.query(
          'SELECT stock_actual FROM inventory_items WHERE id = $1',
          [saleItem.item_id]
        );

        if (inventoryResult.rows.length > 0) {
          const currentStock = inventoryResult.rows[0].stock_actual || 0;
          const quantityToRestore = saleItem.quantity || 1;
          const newStock = currentStock + quantityToRestore;

          await client.query(
            `UPDATE inventory_items
             SET stock_actual = $1,
                 status = CASE 
                   WHEN $1 > 0 THEN 'disponible'
                   ELSE status
                 END
             WHERE id = $2`,
            [newStock, saleItem.item_id]
          );

          // Log de inventario
          await client.query(
            `INSERT INTO inventory_logs (item_id, action, quantity, stock_before, stock_after, reason, notes, user_id)
             VALUES ($1, 'devolucion', $2, $3, $4, 'venta_eliminada', $5, $6)`,
            [
              saleItem.item_id,
              quantityToRestore,
              currentStock,
              newStock,
              `Venta ${sale.folio} eliminada`,
              req.user.id
            ]
          );
        }
      }
    }

    // Eliminar sale_items
    await client.query('DELETE FROM sale_items WHERE sale_id = $1', [id]);
    
    // Eliminar payments
    await client.query('DELETE FROM payments WHERE sale_id = $1', [id]);

    // Eliminar la venta
    await client.query('DELETE FROM sales WHERE id = $1', [id]);

    // Registrar en audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'delete', 'sale', $2, $3)`,
      [req.user.id, id, JSON.stringify({ folio: sale.folio, total: sale.total })]
    );

    await client.query('COMMIT');

    // Emitir actualización en tiempo real
    if (io) {
      emitSaleUpdate(io, sale.branch_id || req.user.branchId, 'deleted', { id });
    }

    res.json({ message: 'Venta eliminada correctamente' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error eliminando venta:', error);
    res.status(500).json({ error: 'Error al eliminar venta' });
  } finally {
    client.release();
  }
});

export default router;
