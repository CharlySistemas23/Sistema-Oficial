import express from 'express';
import { query, getClient } from '../config/database.js';
import { requireBranchAccess } from '../middleware/authOptional.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Listar reglas de llegadas
router.get('/rules', requireBranchAccess, async (req, res) => {
  try {
    const { branch_id } = req.query;
    const branchId = branch_id || req.user.branchId;

    let sql = 'SELECT * FROM arrival_rate_rules WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (req.user.isMasterAdmin) {
      if (branchId) {
        sql += ` AND branch_id = $${paramCount}`;
        params.push(branchId);
        paramCount++;
      }
    } else {
      sql += ` AND branch_id = $${paramCount}`;
      params.push(req.user.branchId);
      paramCount++;
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo reglas de llegadas:', error);
    res.status(500).json({ error: 'Error al obtener reglas de llegadas' });
  }
});

// Crear regla de llegada
router.post('/rules', requireBranchAccess, [
  body('agency_id').notEmpty().withMessage('Agencia requerida'),
  body('rate_per_passenger').isNumeric().withMessage('Tasa por pasajero requerida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { agency_id, rate_per_passenger, min_passengers, max_passengers, branch_id } = req.body;
    const finalBranchId = branch_id || req.user.branchId;

    const result = await query(
      `INSERT INTO arrival_rate_rules (agency_id, rate_per_passenger, min_passengers, max_passengers, branch_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [agency_id, rate_per_passenger, min_passengers || null, max_passengers || null, finalBranchId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creando regla de llegada:', error);
    res.status(500).json({ error: 'Error al crear regla de llegada' });
  }
});

// Listar llegadas
router.get('/arrivals', requireBranchAccess, async (req, res) => {
  try {
    const { branch_id, date, start_date, end_date } = req.query;
    const branchId = branch_id || req.user.branchId;

    let sql = `
      SELECT aa.*, ca.name as agency_name
      FROM agency_arrivals aa
      LEFT JOIN catalog_agencies ca ON aa.agency_id = ca.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (req.user.isMasterAdmin) {
      if (branchId) {
        sql += ` AND aa.branch_id = $${paramCount}`;
        params.push(branchId);
        paramCount++;
      }
    } else {
      sql += ` AND aa.branch_id = $${paramCount}`;
      params.push(req.user.branchId);
      paramCount++;
    }

    if (date) {
      sql += ` AND aa.date = $${paramCount}`;
      params.push(date);
      paramCount++;
    }

    if (start_date) {
      sql += ` AND aa.date >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      sql += ` AND aa.date <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    sql += ' ORDER BY aa.date DESC, aa.created_at DESC LIMIT 1000';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo llegadas:', error);
    res.status(500).json({ error: 'Error al obtener llegadas' });
  }
});

// Crear llegada
router.post('/arrivals', requireBranchAccess, [
  body('agency_id').notEmpty().withMessage('Agencia requerida'),
  body('date').notEmpty().withMessage('Fecha requerida'),
  body('passengers').isInt({ min: 0 }).withMessage('Número de pasajeros requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { agency_id, date, passengers, units, branch_id } = req.body;
    const finalBranchId = branch_id || req.user.branchId;

    // Calcular costo de llegada basado en reglas
    let arrivalFee = 0;
    const rulesResult = await query(
      'SELECT * FROM arrival_rate_rules WHERE agency_id = $1 AND branch_id = $2 ORDER BY created_at DESC LIMIT 1',
      [agency_id, finalBranchId]
    );

    if (rulesResult.rows.length > 0) {
      const rule = rulesResult.rows[0];
      const pax = passengers || 0;
      
      if ((!rule.min_passengers || pax >= rule.min_passengers) && 
          (!rule.max_passengers || pax <= rule.max_passengers)) {
        arrivalFee = (rule.rate_per_passenger || 0) * pax;
      }
    }

    const result = await query(
      `INSERT INTO agency_arrivals (agency_id, date, passengers, units, arrival_fee, branch_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [agency_id, date, passengers || 0, units || 0, arrivalFee, finalBranchId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creando llegada:', error);
    res.status(500).json({ error: 'Error al crear llegada' });
  }
});

// Listar reportes turísticos
router.get('/reports', requireBranchAccess, async (req, res) => {
  try {
    const { branch_id, date, start_date, end_date, status } = req.query;
    const branchId = branch_id || req.user.branchId;

    let sql = `
      SELECT tr.*, b.name as branch_name, u.username as created_by_username
      FROM tourist_reports tr
      LEFT JOIN branches b ON tr.branch_id = b.id
      LEFT JOIN users u ON tr.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (req.user.isMasterAdmin) {
      if (branchId) {
        sql += ` AND tr.branch_id = $${paramCount}`;
        params.push(branchId);
        paramCount++;
      }
    } else {
      sql += ` AND tr.branch_id = $${paramCount}`;
      params.push(req.user.branchId);
      paramCount++;
    }

    if (date) {
      sql += ` AND tr.date = $${paramCount}`;
      params.push(date);
      paramCount++;
    }

    if (start_date) {
      sql += ` AND tr.date >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      sql += ` AND tr.date <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    if (status) {
      sql += ` AND tr.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    sql += ' ORDER BY tr.date DESC, tr.created_at DESC LIMIT 100';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo reportes turísticos:', error);
    res.status(500).json({ error: 'Error al obtener reportes turísticos' });
  }
});

// Obtener reporte turístico por ID
router.get('/reports/:id', requireBranchAccess, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT tr.*, b.name as branch_name, u.username as created_by_username
       FROM tourist_reports tr
       LEFT JOIN branches b ON tr.branch_id = b.id
       LEFT JOIN users u ON tr.created_by = u.id
       WHERE tr.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    const report = result.rows[0];

    // Verificar acceso
    if (!req.user.isMasterAdmin && report.branch_id !== req.user.branchId) {
      return res.status(403).json({ error: 'No tienes acceso a este reporte' });
    }

    // Obtener líneas del reporte
    const linesResult = await query(
      `SELECT trl.*, s.folio as sale_folio, s.total as sale_total
       FROM tourist_report_lines trl
       LEFT JOIN sales s ON trl.sale_id = s.id
       WHERE trl.report_id = $1
       ORDER BY trl.created_at`,
      [id]
    );

    res.json({
      ...report,
      lines: linesResult.rows
    });
  } catch (error) {
    console.error('Error obteniendo reporte turístico:', error);
    res.status(500).json({ error: 'Error al obtener reporte turístico' });
  }
});

// Crear reporte turístico
router.post('/reports', requireBranchAccess, [
  body('date').notEmpty().withMessage('Fecha requerida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { branch_id, date, total_pax, total_sales, notes, sale_ids = [] } = req.body;
    const finalBranchId = branch_id || req.user.branchId;

    const result = await query(
      `INSERT INTO tourist_reports (
        branch_id, date, total_pax, total_sales, notes, status, created_by
      )
      VALUES ($1, $2, $3, $4, $5, 'draft', $6)
      RETURNING *`,
      [
        finalBranchId,
        date,
        total_pax || 0,
        total_sales || 0,
        notes,
        req.user.id
      ]
    );

    const report = result.rows[0];

    // Crear líneas del reporte
    for (const saleId of sale_ids) {
      await query(
        `INSERT INTO tourist_report_lines (report_id, sale_id)
         VALUES ($1, $2)`,
        [report.id, saleId]
      );
    }

    // Registrar en audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'create', 'tourist_report', $2, $3)`,
      [req.user.id, report.id, JSON.stringify({ date, total_pax })]
    );

    res.status(201).json(report);
  } catch (error) {
    console.error('Error creando reporte turístico:', error);
    res.status(500).json({ error: 'Error al crear reporte turístico' });
  }
});

// Actualizar reporte turístico
router.put('/reports/:id', requireBranchAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { total_pax, total_sales, notes, observations, additional, status, sale_ids } = req.body;

    // Verificar que el reporte existe y tiene acceso
    const existingResult = await query(
      'SELECT * FROM tourist_reports WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    const existing = existingResult.rows[0];

    if (!req.user.isMasterAdmin && existing.branch_id !== req.user.branchId) {
      return res.status(403).json({ error: 'No tienes acceso a este reporte' });
    }

    // Actualizar reporte
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (total_pax !== undefined) {
      updateFields.push(`total_pax = $${paramCount}`);
      updateValues.push(total_pax);
      paramCount++;
    }
    if (total_sales !== undefined) {
      updateFields.push(`total_sales = $${paramCount}`);
      updateValues.push(total_sales);
      paramCount++;
    }
    if (notes !== undefined) {
      updateFields.push(`notes = $${paramCount}`);
      updateValues.push(notes);
      paramCount++;
    }
    if (observations !== undefined) {
      updateFields.push(`observations = $${paramCount}`);
      updateValues.push(observations);
      paramCount++;
    }
    if (additional !== undefined) {
      updateFields.push(`additional = $${paramCount}`);
      updateValues.push(additional);
      paramCount++;
    }
    if (status !== undefined) {
      updateFields.push(`status = $${paramCount}`);
      updateValues.push(status);
      paramCount++;
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id);

    const result = await query(
      `UPDATE tourist_reports 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      updateValues
    );

    // Si se proporcionan sale_ids, actualizar líneas del reporte
    if (sale_ids && Array.isArray(sale_ids)) {
      // Eliminar líneas existentes
      await query('DELETE FROM tourist_report_lines WHERE report_id = $1', [id]);

      // Crear nuevas líneas
      for (const saleId of sale_ids) {
        await query(
          `INSERT INTO tourist_report_lines (report_id, sale_id)
           VALUES ($1, $2)`,
          [id, saleId]
        );
      }
    }

    // Registrar en audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'update', 'tourist_report', $2, $3)`,
      [req.user.id, id, JSON.stringify({ status, total_pax, total_sales })]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error actualizando reporte turístico:', error);
    res.status(500).json({ error: 'Error al actualizar reporte turístico' });
  }
});

// Eliminar reporte turístico
router.delete('/reports/:id', requireBranchAccess, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el reporte existe y tiene acceso
    const existingResult = await query(
      'SELECT * FROM tourist_reports WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    const existing = existingResult.rows[0];

    if (!req.user.isMasterAdmin && existing.branch_id !== req.user.branchId) {
      return res.status(403).json({ error: 'No tienes acceso a este reporte' });
    }

    // Eliminar líneas del reporte
    await query('DELETE FROM tourist_report_lines WHERE report_id = $1', [id]);

    // Eliminar reporte
    await query('DELETE FROM tourist_reports WHERE id = $1', [id]);

    // Registrar en audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'delete', 'tourist_report', $2, $3)`,
      [req.user.id, id, JSON.stringify({ date: existing.date })]
    );

    res.status(204).send();
  } catch (error) {
    console.error('Error eliminando reporte turístico:', error);
    res.status(500).json({ error: 'Error al eliminar reporte turístico' });
  }
});

export default router;
