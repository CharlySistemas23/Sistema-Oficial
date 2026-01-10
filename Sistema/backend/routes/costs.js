import express from 'express';
import { query } from '../config/database.js';
import { requireBranchAccess } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Nota: La tabla cost_entries debe agregarse al esquema si no existe
// Por ahora asumimos que existe con esta estructura:
// CREATE TABLE IF NOT EXISTS cost_entries (
//     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
//     branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
//     type VARCHAR(50) NOT NULL, -- 'fijo', 'variable'
//     category VARCHAR(100), -- 'renta', 'agua', 'comisiones', 'costo_ventas', etc.
//     amount DECIMAL(12, 2) NOT NULL,
//     date DATE NOT NULL,
//     description TEXT,
//     notes TEXT,
//     period_type VARCHAR(50), -- 'one_time', 'daily', 'weekly', 'monthly', 'yearly'
//     recurring BOOLEAN DEFAULT false,
//     created_by UUID REFERENCES users(id) ON DELETE SET NULL,
//     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
//     updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
// );

// Listar costos
router.get('/', requireBranchAccess, async (req, res) => {
  try {
    const { branch_id, type, category, start_date, end_date } = req.query;
    const branchId = branch_id || req.user.branchId;

    let sql = `
      SELECT ce.*, b.name as branch_name
      FROM cost_entries ce
      LEFT JOIN branches b ON ce.branch_id = b.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    // Filtro por sucursal
    if (req.user.isMasterAdmin) {
      if (branchId) {
        sql += ` AND ce.branch_id = $${paramCount}`;
        params.push(branchId);
        paramCount++;
      }
    } else {
      sql += ` AND ce.branch_id = $${paramCount}`;
      params.push(req.user.branchId);
      paramCount++;
    }

    if (type) {
      sql += ` AND ce.type = $${paramCount}`;
      params.push(type);
      paramCount++;
    }

    if (category) {
      sql += ` AND ce.category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }

    if (start_date) {
      sql += ` AND ce.date >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      sql += ` AND ce.date <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    sql += ' ORDER BY ce.date DESC, ce.created_at DESC LIMIT 1000';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo costos:', error);
    res.status(500).json({ error: 'Error al obtener costos' });
  }
});

// Obtener costo por ID
router.get('/:id', requireBranchAccess, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT ce.*, b.name as branch_name
       FROM cost_entries ce
       LEFT JOIN branches b ON ce.branch_id = b.id
       WHERE ce.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Costo no encontrado' });
    }

    const cost = result.rows[0];

    // Verificar acceso
    if (!req.user.isMasterAdmin && cost.branch_id !== req.user.branchId) {
      return res.status(403).json({ error: 'No tienes acceso a este costo' });
    }

    res.json(cost);
  } catch (error) {
    console.error('Error obteniendo costo:', error);
    res.status(500).json({ error: 'Error al obtener costo' });
  }
});

// Crear costo
router.post('/', requireBranchAccess, [
  body('amount').isNumeric().withMessage('Monto requerido'),
  body('type').isIn(['fijo', 'variable']).withMessage('Tipo inválido'),
  body('date').notEmpty().withMessage('Fecha requerida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      branch_id, type, category, amount, date, description, notes,
      period_type = 'one_time', recurring = false
    } = req.body;

    const finalBranchId = branch_id || req.user.branchId;

    const result = await query(
      `INSERT INTO cost_entries (
        branch_id, type, category, amount, date, description, notes,
        period_type, recurring, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        finalBranchId,
        type,
        category,
        amount,
        date,
        description,
        notes,
        period_type,
        recurring,
        req.user.id
      ]
    );

    // Registrar en audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'create', 'cost_entry', $2, $3)`,
      [req.user.id, result.rows[0].id, JSON.stringify({ type, category, amount })]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creando costo:', error);
    res.status(500).json({ error: 'Error al crear costo' });
  }
});

// Actualizar costo
router.put('/:id', requireBranchAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Verificar que existe y tiene acceso
    const existingResult = await query(
      'SELECT * FROM cost_entries WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Costo no encontrado' });
    }

    const existingCost = existingResult.rows[0];

    // Verificar acceso
    if (!req.user.isMasterAdmin && existingCost.branch_id !== req.user.branchId) {
      return res.status(403).json({ error: 'No tienes acceso a este costo' });
    }

    // Construir query de actualización dinámica
    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'type', 'category', 'amount', 'date', 'description', 'notes',
      'period_type', 'recurring'
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
    const sql = `UPDATE cost_entries SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING *`;

    const result = await query(sql, values);

    // Registrar en audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'update', 'cost_entry', $2, $3)`,
      [req.user.id, id, JSON.stringify(updateData)]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error actualizando costo:', error);
    res.status(500).json({ error: 'Error al actualizar costo' });
  }
});

// Eliminar costo
router.delete('/:id', requireBranchAccess, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que existe y tiene acceso
    const existingResult = await query(
      'SELECT * FROM cost_entries WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Costo no encontrado' });
    }

    const cost = existingResult.rows[0];

    // Verificar acceso
    if (!req.user.isMasterAdmin && cost.branch_id !== req.user.branchId) {
      return res.status(403).json({ error: 'No tienes acceso a este costo' });
    }

    await query('DELETE FROM cost_entries WHERE id = $1', [id]);

    // Registrar en audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'delete', 'cost_entry', $2, $3)`,
      [req.user.id, id, JSON.stringify({ type: cost.type, category: cost.category })]
    );

    res.json({ message: 'Costo eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando costo:', error);
    res.status(500).json({ error: 'Error al eliminar costo' });
  }
});

// Resumen de costos
router.get('/summary', requireBranchAccess, async (req, res) => {
  try {
    const { branch_id, start_date, end_date } = req.query;
    const branchId = branch_id || req.user.branchId;

    let branchFilter = '';
    const params = [];
    let paramCount = 1;

    if (req.user.isMasterAdmin) {
      if (branchId) {
        branchFilter = `WHERE ce.branch_id = $${paramCount}`;
        params.push(branchId);
        paramCount++;
      }
    } else {
      branchFilter = `WHERE ce.branch_id = $${paramCount}`;
      params.push(req.user.branchId);
      paramCount++;
    }

    if (start_date) {
      branchFilter += ` AND ce.date >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      branchFilter += ` AND ce.date <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    const summaryResult = await query(
      `SELECT 
        ce.type,
        ce.category,
        COUNT(*) as count,
        COALESCE(SUM(ce.amount), 0) as total
       FROM cost_entries ce
       ${branchFilter}
       GROUP BY ce.type, ce.category
       ORDER BY ce.type, ce.category`,
      params
    );

    res.json(summaryResult.rows);
  } catch (error) {
    console.error('Error obteniendo resumen de costos:', error);
    res.status(500).json({ error: 'Error al obtener resumen de costos' });
  }
});

export default router;
