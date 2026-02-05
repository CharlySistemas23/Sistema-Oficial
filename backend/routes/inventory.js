import express from 'express';
import { query, getClient } from '../config/database.js';
import { requireBranchAccess } from '../middleware/authOptional.js';
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
    const { 
      branch_id, status, search, category, metal, stone_type, min_price, max_price,
      material, purity, plating, style, finish, theme, condition, location_detail, collection
    } = req.query;
    
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
      // Master admin: si branchId es null, mostrar todos los items (incluyendo sin branch_id)
      if (branchId) {
        sql += ` AND (branch_id = $${paramCount} OR branch_id IS NULL)`;
        params.push(branchId);
        paramCount++;
      }
      // Si branchId es null, no agregar filtro (mostrar todos, incluyendo sin branch_id)
    } else {
      // Usuarios normales: SOLO ven items de su sucursal (NO incluir items sin branch_id)
      // Esto previene mezclar datos entre sucursales
      sql += ` AND branch_id = $${paramCount}`;
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

    // Filtros avanzados
    if (material) {
      sql += ` AND (material = $${paramCount} OR metal ILIKE $${paramCount})`;
      params.push(`%${material}%`);
      paramCount++;
    }

    if (purity) {
      sql += ` AND (purity = $${paramCount} OR metal ILIKE $${paramCount})`;
      params.push(`%${purity}%`);
      paramCount++;
    }

    if (plating) {
      sql += ` AND plating = $${paramCount}`;
      params.push(plating);
      paramCount++;
    }

    if (style) {
      sql += ` AND style = $${paramCount}`;
      params.push(style);
      paramCount++;
    }

    if (finish) {
      sql += ` AND finish_type = $${paramCount}`;
      params.push(finish);
      paramCount++;
    }

    if (theme) {
      sql += ` AND theme = $${paramCount}`;
      params.push(theme);
      paramCount++;
    }

    if (condition) {
      sql += ` AND condition = $${paramCount}`;
      params.push(condition);
      paramCount++;
    }

    if (location_detail) {
      sql += ` AND (location_detail = $${paramCount} OR location = $${paramCount})`;
      params.push(location_detail);
      paramCount++;
    }

    if (collection) {
      sql += ` AND collection = $${paramCount}`;
      params.push(collection);
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
      sku, barcode, name, description, category, subcategory, collection, metal, material, purity, plating,
      stone_type, stone_weight, stones, weight, measurements, price, sale_price, cost, discount, discount_amount,
      currency, margin_percent, stock_actual, stock_min, stock_max, status, condition, location_detail,
      style, finish_type, theme, branch_id, certificate_number, certificate_details, supplier, supplier_code,
      notes, photos
    } = req.body;

    const finalBranchId = branch_id || req.user.branchId;

    const result = await query(
      `INSERT INTO inventory_items (
        sku, barcode, name, description, category, subcategory, collection, metal, material, purity, plating,
        stone_type, stone_weight, stones, weight, measurements, price, sale_price, cost, discount, discount_amount,
        currency, margin_percent, stock_actual, stock_min, stock_max, status, condition, location_detail,
        style, finish_type, theme, branch_id, certificate_number, certificate_details, supplier, supplier_code,
        notes, photos
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39)
      RETURNING *`,
      [
        sku, barcode, name, description || name, category, subcategory || null, collection || null, metal, material || null, purity || null, plating || null,
        stone_type || null, stone_weight || null, stones || null, weight || 0, measurements || null, price || null, sale_price || null, cost || 0, discount || null, discount_amount || null,
        currency || 'MXN', margin_percent || null, stock_actual || 0, stock_min || 0, stock_max || 0,
        status || 'disponible', condition || null, location_detail || null,
        style || null, finish_type || null, theme || null, finalBranchId, certificate_number || null, certificate_details || null, supplier || null, supplier_code || null,
        notes || null, photos || []
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
      // Determinar qué campo está duplicado
      // Usar req.body para obtener sku y barcode de forma segura
      const skuValue = req.body?.sku || 'desconocido';
      const barcodeValue = req.body?.barcode || 'desconocido';
      
      let errorMessage = 'El SKU o código de barras ya existe';
      if (error.constraint === 'inventory_items_sku_key') {
        errorMessage = `El SKU "${skuValue}" ya existe. Si estás creando en una sucursal diferente, el sistema agregará automáticamente el prefijo de sucursal.`;
      } else if (error.constraint === 'inventory_items_barcode_key') {
        errorMessage = `El código de barras "${barcodeValue}" ya existe`;
      }
      return res.status(400).json({ 
        error: errorMessage,
        code: 'DUPLICATE_SKU',
        duplicateField: error.constraint === 'inventory_items_sku_key' ? 'sku' : 'barcode',
        suggestedFix: error.constraint === 'inventory_items_sku_key' ? 'add_branch_prefix' : null
      });
    }
    console.error('Error creando item:', error);
    res.status(500).json({ error: 'Error al crear item' });
  }
});

// Actualizar item
router.put('/:id', requireBranchAccess, async (req, res) => {
  let existingItem = null; // Declarar fuera del try para que esté disponible en el catch
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

    existingItem = existingResult.rows[0];

    // Verificar acceso
    if (!req.user.isMasterAdmin && existingItem.branch_id && existingItem.branch_id !== req.user.branchId) {
      return res.status(403).json({ error: 'No tienes acceso a este item' });
    }

    // Si cambió el stock, registrar en log
    if (updateData.stock_actual !== undefined && updateData.stock_actual !== existingItem.stock_actual) {
      const stockDiff = updateData.stock_actual - existingItem.stock_actual;
      const userId = req.user?.id || req.user?.userId || null;
      if (userId) {
        try {
          await query(
            `INSERT INTO inventory_logs (item_id, action, quantity, stock_before, stock_after, reason, notes, user_id)
             VALUES ($1, $2, $3, $4, $5, 'edicion', 'Stock modificado', $6)`,
            [
              id,
              stockDiff > 0 ? 'entrada' : 'salida',
              Math.abs(stockDiff),
              existingItem.stock_actual,
              updateData.stock_actual,
              userId
            ]
          );
        } catch (logError) {
          console.warn('Error registrando log de inventario (continuando):', logError);
        }
      }
    }

    // Construir query de actualización dinámica
    const fields = [];
    const values = [];
    let paramCount = 1;

    // Solo campos que existen en la tabla inventory_items del esquema
    const allowedFields = [
      'subcategory',
      'collection',
      'material',
      'purity',
      'plating',
      'stones',
      'measurements',
      'sale_price',
      'discount',
      'discount_amount',
      'currency',
      'margin_percent',
      'condition',
      'location_detail',
      'style',
      'finish_type',
      'theme',
      'certificate_details',
      'supplier',
      'supplier_code',
      'notes',
      'name', 'description', 'category', 'metal', 'stone_type', 'stone_weight',
      'weight', 'price', 'cost', 'stock_actual', 'stock_min', 'stock_max',
      'status', 'certificate_number', 'photos', 'barcode', 'sku'
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
    const userId = req.user?.id || req.user?.userId || null;
    if (userId) {
      try {
        await query(
          `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
           VALUES ($1, 'update', 'inventory_item', $2, $3)`,
          [userId, id, JSON.stringify(updateData)]
        );
      } catch (auditError) {
        console.warn('Error registrando audit log (continuando):', auditError);
      }
    }

    // Emitir actualización en tiempo real
    if (io) {
      emitInventoryUpdate(io, updatedItem.branch_id || req.user.branchId, 'updated', updatedItem);
    }

    res.json(updatedItem);
  } catch (error) {
    console.error('Error actualizando item:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
      stack: error.stack
    });
    
    // Manejar errores específicos
    if (error.code === '23505') { // Unique violation
      const skuValue = req.body?.sku || existingItem?.sku || 'desconocido';
      const barcodeValue = req.body?.barcode || existingItem?.barcode || 'desconocido';
      
      let errorMessage = 'El SKU o código de barras ya existe';
      if (error.constraint === 'inventory_items_sku_key') {
        errorMessage = `El SKU "${skuValue}" ya existe`;
      } else if (error.constraint === 'inventory_items_barcode_key') {
        errorMessage = `El código de barras "${barcodeValue}" ya existe. Si estás actualizando, verifica que no esté duplicado.`;
      }
      
      return res.status(400).json({ 
        error: errorMessage,
        code: 'DUPLICATE_KEY',
        duplicateField: error.constraint === 'inventory_items_sku_key' ? 'sku' : 'barcode',
        constraint: error.constraint
      });
    }
    
    res.status(500).json({ 
      error: 'Error al actualizar item',
      details: error.message,
      code: error.code
    });
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
