import express from 'express';
import { query, getClient } from '../config/database.js';
import { requireBranchAccess } from '../middleware/auth.js';
import { emitInventoryUpdate } from '../socket/socketHandler.js';

// Importar io desde el módulo principal
let io;
export const setIO = (socketIO) => {
  io = socketIO;
};

const router = express.Router();

// Obtener items de inventario
router.get('/', requireBranchAccess, async (req, res) => {
  try {
    const { branch_id, status, search, category, metal, stone_type, min_price, max_price } = req.query;
    
    // Manejar branch_id cuando viene como string "null" desde el frontend
    let branchId = null;
    if (branch_id && branch_id !== 'null' && branch_id !== 'undefined') {
      branchId = branch_id;
    } else if (!req.user.isMasterAdmin) {
      // Usuarios normales usan su branch_id
      branchId = req.user.branchId;
    }

    let sql = `
      SELECT * FROM inventory_items
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    // Filtro por sucursal
    if (req.user.isMasterAdmin) {
      // Master admin: si branchId es null, mostrar todos los items
      if (branchId) {
        sql += ` AND (branch_id = $${paramCount} OR branch_id IS NULL)`;
        params.push(branchId);
        paramCount++;
      }
      // Si branchId es null, no agregar filtro (mostrar todos)
    } else {
      // Usuarios normales solo ven su sucursal
      sql += ` AND (branch_id = $${paramCount} OR branch_id IS NULL)`;
      params.push(req.user.branchId);
      paramCount++;
    }

    // Filtros adicionales
    if (status) {
      sql += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (search) {
      sql += ` AND (name ILIKE $${paramCount} OR sku ILIKE $${paramCount} OR barcode ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (category) {
      sql += ` AND category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }

    if (metal) {
      sql += ` AND metal = $${paramCount}`;
      params.push(metal);
      paramCount++;
    }

    if (stone_type) {
      sql += ` AND stone_type = $${paramCount}`;
      params.push(stone_type);
      paramCount++;
    }

    if (min_price) {
      sql += ` AND price >= $${paramCount}`;
      params.push(min_price);
      paramCount++;
    }

    if (max_price) {
      sql += ` AND price <= $${paramCount}`;
      params.push(max_price);
      paramCount++;
    }

    sql += ` ORDER BY created_at DESC LIMIT 1000`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo inventario:', error);
    res.status(500).json({ error: 'Error al obtener inventario' });
  }
});

// Obtener un item por ID
router.get('/:id', requireBranchAccess, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM inventory_items WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }

    const item = result.rows[0];

    // Verificar acceso a la sucursal
    if (!req.user.isMasterAdmin && item.branch_id && item.branch_id !== req.user.branchId) {
      return res.status(403).json({ error: 'No tienes acceso a este item' });
    }

    res.json(item);
  } catch (error) {
    console.error('Error obteniendo item:', error);
    res.status(500).json({ error: 'Error al obtener item' });
  }
});

// Crear item
router.post('/', requireBranchAccess, async (req, res) => {
  try {
    const {
      sku, barcode, name, description, category, metal, stone_type, stone_weight,
      weight, price, cost, stock_actual, stock_min, stock_max, status, branch_id,
      certificate_number, photos
    } = req.body;

    const finalBranchId = branch_id || req.user.branchId;

    const result = await query(
      `INSERT INTO inventory_items (
        sku, barcode, name, description, category, metal, stone_type, stone_weight,
        weight, price, cost, stock_actual, stock_min, stock_max, status, branch_id,
        certificate_number, photos
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        sku, barcode, name, description, category, metal, stone_type, stone_weight,
        weight, price, cost, stock_actual || 0, stock_min || 0, stock_max || 0,
        status || 'disponible', finalBranchId, certificate_number, photos || []
      ]
    );

    const item = result.rows[0];

    // Log de inventario
    await query(
      `INSERT INTO inventory_logs (item_id, action, quantity, stock_before, stock_after, reason, notes, user_id)
       VALUES ($1, 'entrada', $2, 0, $2, 'creacion', 'Item creado', $3)`,
      [item.id, stock_actual || 0, req.user.id]
    );

    // Registrar en audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'create', 'inventory_item', $2, $3)`,
      [req.user.id, item.id, JSON.stringify({ sku, name })]
    );

    // Emitir actualización en tiempo real
    if (io) {
      emitInventoryUpdate(io, finalBranchId, 'created', item);
    }

    res.status(201).json(item);
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'El SKU o código de barras ya existe' });
    }
    console.error('Error creando item:', error);
    res.status(500).json({ error: 'Error al crear item' });
  }
});

// Actualizar item
router.put('/:id', requireBranchAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Verificar que el item existe y tiene acceso
    const existingResult = await query(
      'SELECT * FROM inventory_items WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }

    const existingItem = existingResult.rows[0];

    // Verificar acceso
    if (!req.user.isMasterAdmin && existingItem.branch_id && existingItem.branch_id !== req.user.branchId) {
      return res.status(403).json({ error: 'No tienes acceso a este item' });
    }

    // Si cambió el stock, registrar en log
    if (updateData.stock_actual !== undefined && updateData.stock_actual !== existingItem.stock_actual) {
      const stockDiff = updateData.stock_actual - existingItem.stock_actual;
      await query(
        `INSERT INTO inventory_logs (item_id, action, quantity, stock_before, stock_after, reason, notes, user_id)
         VALUES ($1, $2, $3, $4, $5, 'edicion', 'Stock modificado', $6)`,
        [
          id,
          stockDiff > 0 ? 'entrada' : 'salida',
          Math.abs(stockDiff),
          existingItem.stock_actual,
          updateData.stock_actual,
          req.user.id
        ]
      );
    }

    // Construir query de actualización dinámica
    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'name', 'description', 'category', 'metal', 'stone_type', 'stone_weight',
      'weight', 'price', 'cost', 'stock_actual', 'stock_min', 'stock_max',
      'status', 'certificate_number', 'photos', 'barcode'
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        fields.push(`${field} = $${paramCount}`);
        values.push(updateData[field]);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    values.push(id);
    const sql = `UPDATE inventory_items SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await query(sql, values);

    const updatedItem = result.rows[0];

    // Registrar en audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'update', 'inventory_item', $2, $3)`,
      [req.user.id, id, JSON.stringify(updateData)]
    );

    // Emitir actualización en tiempo real
    if (io) {
      emitInventoryUpdate(io, updatedItem.branch_id || req.user.branchId, 'updated', updatedItem);
    }

    res.json(updatedItem);
  } catch (error) {
    console.error('Error actualizando item:', error);
    res.status(500).json({ error: 'Error al actualizar item' });
  }
});

// Eliminar item
router.delete('/:id', requireBranchAccess, async (req, res) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    const { id } = req.params;

    // Verificar que existe y tiene acceso
    const existingResult = await client.query(
      'SELECT * FROM inventory_items WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Item no encontrado' });
    }

    const item = existingResult.rows[0];

    // Verificar acceso
    if (!req.user.isMasterAdmin && item.branch_id && item.branch_id !== req.user.branchId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'No tienes acceso a este item' });
    }

    // Verificar si hay referencias en sale_items
    const saleItemsCheck = await client.query(
      'SELECT COUNT(*) as count FROM sale_items WHERE item_id = $1',
      [id]
    );

    if (parseInt(saleItemsCheck.rows[0].count) > 0) {
      // Si tiene ventas asociadas, no eliminar físicamente, solo marcar como eliminado
      await client.query(
        `UPDATE inventory_items 
         SET status = 'eliminado', updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [id]
      );
    } else {
      // Si no tiene referencias, eliminar físicamente
      // Primero eliminar logs de inventario relacionados
      await client.query('DELETE FROM inventory_logs WHERE item_id = $1', [id]);
      
      // Luego eliminar el item
      await client.query('DELETE FROM inventory_items WHERE id = $1', [id]);
    }

    // Registrar en audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'delete', 'inventory_item', $2, $3)`,
      [req.user.id, id, JSON.stringify({ sku: item.sku, name: item.name })]
    );

    await client.query('COMMIT');

    // Emitir actualización en tiempo real
    if (io) {
      emitInventoryUpdate(io, item.branch_id || req.user.branchId, 'deleted', { id });
    }

    res.json({ message: 'Item eliminado correctamente' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error eliminando item:', error);
    
    // Mensaje de error más específico
    let errorMessage = 'Error al eliminar item';
    if (error.code === '23503') { // Foreign key violation
      errorMessage = 'No se puede eliminar el item porque tiene ventas asociadas';
    } else if (error.code === '23505') { // Unique violation
      errorMessage = 'Error de integridad de datos';
    }
    
    res.status(500).json({ error: errorMessage });
  } finally {
    client.release();
  }
});

export default router;
