import express from 'express';
import { query } from '../config/database.js';
import { requireBranchAccess, requireMasterAdmin } from '../middleware/authOptional.js';
import { body, validationResult } from 'express-validator';
import { emitRepairUpdate } from '../socket/socketHandler.js';

// Importar io desde el módulo principal
let io;
export const setIO = (socketIO) => {
  io = socketIO;
};

const router = express.Router();

// Listar reparaciones
router.get('/', requireBranchAccess, async (req, res) => {
  try {
    const { branch_id, status, start_date, end_date, search } = req.query;
    const branchId = branch_id || req.user.branchId;

    let sql = `
      SELECT r.*, c.name as customer_name, b.name as branch_name
      FROM repairs r
      LEFT JOIN customers c ON r.customer_id = c.id
      LEFT JOIN branches b ON r.branch_id = b.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    // Filtro por sucursal
    if (req.user.isMasterAdmin) {
      if (branchId) {
        sql += ` AND r.branch_id = $${paramCount}`;
        params.push(branchId);
        paramCount++;
      }
    } else {
      sql += ` AND r.branch_id = $${paramCount}`;
      params.push(req.user.branchId);
      paramCount++;
    }

    if (status) {
      sql += ` AND r.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (start_date) {
      sql += ` AND r.created_at >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      sql += ` AND r.created_at <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    if (search) {
      sql += ` AND (r.folio ILIKE $${paramCount} OR r.description ILIKE $${paramCount} OR c.name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    sql += ' ORDER BY r.created_at DESC LIMIT 500';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo reparaciones:', error);
    res.status(500).json({ error: 'Error al obtener reparaciones' });
  }
});

// Obtener reparación por ID (con fotos)
router.get('/:id', requireBranchAccess, async (req, res) => {
  try {
    const { id } = req.params;

    const repairResult = await query(
      `SELECT r.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email
       FROM repairs r
       LEFT JOIN customers c ON r.customer_id = c.id
       WHERE r.id = $1`,
      [id]
    );

    if (repairResult.rows.length === 0) {
      return res.status(404).json({ error: 'Reparación no encontrada' });
    }

    const repair = repairResult.rows[0];

    // Verificar acceso
    if (!req.user.isMasterAdmin && repair.branch_id !== req.user.branchId) {
      return res.status(403).json({ error: 'No tienes acceso a esta reparación' });
    }

    // Obtener fotos
    const photosResult = await query(
      'SELECT * FROM repair_photos WHERE repair_id = $1 ORDER BY created_at',
      [id]
    );

    res.json({
      ...repair,
      photos: photosResult.rows
    });
  } catch (error) {
    console.error('Error obteniendo reparación:', error);
    res.status(500).json({ error: 'Error al obtener reparación' });
  }
});

// Crear reparación
router.post('/', requireBranchAccess, [
  body('folio').notEmpty().withMessage('Folio requerido'),
  body('description').notEmpty().withMessage('Descripción requerida'),
  body('branch_id').optional({ nullable: true }).isUUID().withMessage('branch_id debe ser UUID'),
  body('customer_id').optional({ nullable: true }).isUUID().withMessage('customer_id debe ser UUID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      folio, branch_id, customer_id, description, estimated_cost,
      estimated_delivery_date, notes, status = 'pending', photos = []
    } = req.body;

    // Seguridad:
    // - usuarios normales SIEMPRE crean en su sucursal (req.user.branchId)
    // - master admin puede especificar branch_id explícito
    const finalBranchId = req.user.isMasterAdmin && branch_id ? branch_id : req.user.branchId;

    if (!finalBranchId) {
      return res.status(400).json({ error: 'Sucursal requerida' });
    }

    const result = await query(
      `INSERT INTO repairs (
        folio, branch_id, customer_id, description, estimated_cost,
        estimated_delivery_date, notes, status, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        folio,
        finalBranchId,
        customer_id,
        description,
        estimated_cost || 0,
        estimated_delivery_date,
        notes,
        status,
        req.user.id
      ]
    );

    const repair = result.rows[0];

    // Agregar fotos si existen
    if (photos && photos.length > 0) {
      for (const photo of photos) {
        await query(
          `INSERT INTO repair_photos (repair_id, photo_url, description)
           VALUES ($1, $2, $3)`,
          [repair.id, photo.url || photo, photo.description || '']
        );
      }
    }

    // Registrar en audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'create', 'repair', $2, $3)`,
      [req.user.id, repair.id, JSON.stringify({ folio, status })]
    );

    // Emitir actualización en tiempo real
    if (io) {
      emitRepairUpdate(io, finalBranchId, 'created', repair);
    }

    res.status(201).json(repair);
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'El folio ya existe' });
    }
    if (error.code === '22P02') { // invalid_text_representation (UUID inválido)
      return res.status(400).json({ error: 'UUID inválido en la solicitud' });
    }
    if (error.code === '23503') { // foreign_key_violation
      return res.status(400).json({ error: 'Referencia inválida (customer_id/branch_id no existe)' });
    }
    console.error('Error creando reparación:', error);
    res.status(500).json({ error: 'Error al crear reparación' });
  }
});

// Actualizar reparación
router.put('/:id', requireBranchAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Verificar que existe y tiene acceso
    const existingResult = await query(
      'SELECT * FROM repairs WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Reparación no encontrada' });
    }

    const existingRepair = existingResult.rows[0];

    // Verificar acceso
    if (!req.user.isMasterAdmin && existingRepair.branch_id !== req.user.branchId) {
      return res.status(403).json({ error: 'No tienes acceso a esta reparación' });
    }

    // Construir query de actualización dinámica
    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'description', 'estimated_cost', 'actual_cost', 'estimated_delivery_date',
      'completed_date', 'notes', 'status'
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
    const sql = `UPDATE repairs SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING *`;

    const result = await query(sql, values);
    const updatedRepair = result.rows[0];

    // Registrar en audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'update', 'repair', $2, $3)`,
      [req.user.id, id, JSON.stringify(updateData)]
    );

    // Emitir actualización en tiempo real
    if (io) {
      const action = updatedRepair.status === 'completed' ? 'completed' : 'updated';
      emitRepairUpdate(io, updatedRepair.branch_id || req.user.branchId, action, updatedRepair);
    }

    res.json(updatedRepair);
  } catch (error) {
    console.error('Error actualizando reparación:', error);
    res.status(500).json({ error: 'Error al actualizar reparación' });
  }
});

// Completar reparación
router.post('/:id/complete', requireBranchAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { actual_cost, notes } = req.body;

    const existingResult = await query(
      'SELECT * FROM repairs WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Reparación no encontrada' });
    }

    const repair = existingResult.rows[0];

    // Verificar acceso
    if (!req.user.isMasterAdmin && repair.branch_id !== req.user.branchId) {
      return res.status(403).json({ error: 'No tienes acceso a esta reparación' });
    }

    const result = await query(
      `UPDATE repairs
       SET status = 'completed',
           actual_cost = COALESCE($1, actual_cost),
           completed_date = CURRENT_TIMESTAMP,
           notes = CASE WHEN $2 IS NOT NULL THEN $2 ELSE notes END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [actual_cost, notes, id]
    );

    const completedRepair = result.rows[0];

    // Registrar en audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'complete', 'repair', $2, $3)`,
      [req.user.id, id, JSON.stringify({ actual_cost })]
    );

    // Emitir actualización en tiempo real
    if (io) {
      emitRepairUpdate(io, completedRepair.branch_id || req.user.branchId, 'completed', completedRepair);
    }

    res.json(completedRepair);
  } catch (error) {
    console.error('Error completando reparación:', error);
    res.status(500).json({ error: 'Error al completar reparación' });
  }
});

// Agregar foto a reparación
router.post('/:id/photos', requireBranchAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { photo_url, description } = req.body;

    // Verificar que la reparación existe y tiene acceso
    const repairResult = await query(
      'SELECT * FROM repairs WHERE id = $1',
      [id]
    );

    if (repairResult.rows.length === 0) {
      return res.status(404).json({ error: 'Reparación no encontrada' });
    }

    const repair = repairResult.rows[0];

    // Verificar acceso
    if (!req.user.isMasterAdmin && repair.branch_id !== req.user.branchId) {
      return res.status(403).json({ error: 'No tienes acceso a esta reparación' });
    }

    const result = await query(
      `INSERT INTO repair_photos (repair_id, photo_url, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, photo_url, description || '']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error agregando foto:', error);
    res.status(500).json({ error: 'Error al agregar foto' });
  }
});

// Eliminar reparación
router.delete('/:id', requireMasterAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM repairs WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reparación no encontrada' });
    }

    // Registrar en audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'delete', 'repair', $2, $3)`,
      [req.user.id, id, JSON.stringify({ folio: result.rows[0].folio })]
    );

    // Emitir actualización en tiempo real
    const repair = result.rows[0];
    if (io && repair.branch_id) {
      emitRepairUpdate(io, repair.branch_id, 'deleted', repair);
    }

    res.json({ message: 'Reparación eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando reparación:', error);
    res.status(500).json({ error: 'Error al eliminar reparación' });
  }
});

export default router;
