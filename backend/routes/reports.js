import express from 'express';
import { query } from '../config/database.js';
import { requireBranchAccess } from '../middleware/authOptional.js';

const router = express.Router();

// Reportes de utilidad
router.get('/profit', requireBranchAccess, async (req, res) => {
  try {
    const { branch_id, start_date, end_date } = req.query;
    const branchId = branch_id || req.user.branchId;

    let branchFilter = '';
    const params = [];
    let paramCount = 1;

    if (req.user.isMasterAdmin) {
      if (branchId) {
        branchFilter = `WHERE s.branch_id = $${paramCount}`;
        params.push(branchId);
        paramCount++;
      }
    } else {
      branchFilter = `WHERE s.branch_id = $${paramCount}`;
      params.push(req.user.branchId);
      paramCount++;
    }

    if (start_date) {
      branchFilter += ` AND s.created_at >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      branchFilter += ` AND s.created_at <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    const profitResult = await query(
      `SELECT 
        DATE(s.created_at) as date,
        COUNT(s.id) as sales_count,
        COALESCE(SUM(s.total), 0) as total_sales,
        COALESCE(SUM(
          (SELECT SUM(ii.cost * si.quantity)
           FROM sale_items si
           INNER JOIN inventory_items ii ON si.item_id = ii.id
           WHERE si.sale_id = s.id)
        ), 0) as total_cogs,
        COALESCE(SUM(
          (SELECT SUM(si.guide_commission + si.seller_commission)
           FROM sale_items si
           WHERE si.sale_id = s.id)
        ), 0) as total_commissions
       FROM sales s
       ${branchFilter}
       AND s.status = 'completed'
       GROUP BY DATE(s.created_at)
       ORDER BY date DESC`,
      params
    );

    // Calcular utilidad
    const profitData = profitResult.rows.map(row => ({
      ...row,
      gross_profit: parseFloat(row.total_sales) - parseFloat(row.total_cogs),
      net_profit: parseFloat(row.total_sales) - parseFloat(row.total_cogs) - parseFloat(row.total_commissions)
    }));

    res.json(profitData);
  } catch (error) {
    console.error('Error obteniendo reporte de utilidad:', error);
    res.status(500).json({ error: 'Error al obtener reporte de utilidad' });
  }
});

// Guardar reporte
router.post('/save', requireBranchAccess, async (req, res) => {
  try {
    const {
      name,
      report_type,
      branch_id,
      date_from,
      date_to,
      filters = {},
      report_data,
      summary = {}
    } = req.body;

    if (!name || !report_type || !report_data) {
      return res.status(400).json({ error: 'Faltan campos requeridos: name, report_type, report_data' });
    }

    const finalBranchId = branch_id || req.user.branchId;

    const result = await query(
      `INSERT INTO saved_reports (
        name, report_type, branch_id, date_from, date_to, filters, report_data, summary, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        name,
        report_type,
        finalBranchId,
        date_from || null,
        date_to || null,
        JSON.stringify(filters),
        JSON.stringify(report_data),
        JSON.stringify(summary),
        req.user.id
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error guardando reporte:', error);
    res.status(500).json({ error: 'Error al guardar reporte' });
  }
});

// Listar reportes guardados
router.get('/saved', requireBranchAccess, async (req, res) => {
  try {
    const { branch_id, report_type, limit = 50, offset = 0 } = req.query;
    
    // Asegurar que req.user existe
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    const branchId = branch_id || req.user.branchId;

    let sql = `
      SELECT 
        sr.*,
        b.name as branch_name,
        u.username as created_by_username
      FROM saved_reports sr
      LEFT JOIN branches b ON sr.branch_id = b.id
      LEFT JOIN users u ON sr.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    // Filtro por sucursal
    if (req.user.isMasterAdmin) {
      if (branchId) {
        sql += ` AND sr.branch_id = $${paramCount}`;
        params.push(branchId);
        paramCount++;
      }
    } else {
      if (req.user.branchId) {
        sql += ` AND sr.branch_id = $${paramCount}`;
        params.push(req.user.branchId);
        paramCount++;
      }
    }

    // Filtro por tipo de reporte
    if (report_type) {
      sql += ` AND sr.report_type = $${paramCount}`;
      params.push(report_type);
      paramCount++;
    }

    sql += ` ORDER BY sr.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);

    // Parsear JSONB fields
    const reports = result.rows.map(row => ({
      ...row,
      filters: typeof row.filters === 'string' ? JSON.parse(row.filters) : row.filters,
      report_data: typeof row.report_data === 'string' ? JSON.parse(row.report_data) : row.report_data,
      summary: typeof row.summary === 'string' ? JSON.parse(row.summary) : row.summary
    }));

    res.json(reports);
  } catch (error) {
    console.error('Error obteniendo reportes guardados:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Error al obtener reportes guardados', details: error.message });
  }
});

// Obtener un reporte guardado por ID
router.get('/saved/:id', requireBranchAccess, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT 
        sr.*,
        b.name as branch_name,
        u.username as created_by_username
      FROM saved_reports sr
      LEFT JOIN branches b ON sr.branch_id = b.id
      LEFT JOIN users u ON sr.created_by = u.id
      WHERE sr.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    // Verificar acceso por sucursal
    const report = result.rows[0];
    if (!req.user.isMasterAdmin && report.branch_id !== req.user.branchId) {
      return res.status(403).json({ error: 'No tienes acceso a este reporte' });
    }

    // Parsear JSONB fields
    const parsedReport = {
      ...report,
      filters: typeof report.filters === 'string' ? JSON.parse(report.filters) : report.filters,
      report_data: typeof report.report_data === 'string' ? JSON.parse(report.report_data) : report.report_data,
      summary: typeof report.summary === 'string' ? JSON.parse(report.summary) : report.summary
    };

    res.json(parsedReport);
  } catch (error) {
    console.error('Error obteniendo reporte guardado:', error);
    res.status(500).json({ error: 'Error al obtener reporte guardado' });
  }
});

// Eliminar reporte guardado
router.delete('/saved/:id', requireBranchAccess, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el reporte existe y el usuario tiene acceso
    const checkResult = await query(
      'SELECT branch_id, created_by FROM saved_reports WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    const report = checkResult.rows[0];

    // Verificar permisos: solo el creador o master_admin puede eliminar
    if (!req.user.isMasterAdmin && report.created_by !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este reporte' });
    }

    // Verificar acceso por sucursal
    if (!req.user.isMasterAdmin && report.branch_id !== req.user.branchId) {
      return res.status(403).json({ error: 'No tienes acceso a este reporte' });
    }

    await query('DELETE FROM saved_reports WHERE id = $1', [id]);

    res.json({ message: 'Reporte eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando reporte guardado:', error);
    res.status(500).json({ error: 'Error al eliminar reporte guardado' });
  }
});

// ============================================
// CAPTURAS RÁPIDAS (Quick Captures)
// ============================================

// Crear captura rápida
router.post('/quick-captures', requireBranchAccess, async (req, res) => {
  try {
    const {
      branch_id,
      seller_id,
      guide_id,
      agency_id,
      product,
      quantity,
      currency,
      total,
      merchandise_cost,
      notes,
      is_street,
      payment_method,
      payments,
      date,
      original_report_date
    } = req.body;

    if (!product || !quantity || !currency || !total || !date) {
      return res.status(400).json({ error: 'Faltan campos requeridos: product, quantity, currency, total, date' });
    }

    const finalBranchId = branch_id || req.user.branchId;

    const result = await query(
      `INSERT INTO quick_captures (
        branch_id, seller_id, guide_id, agency_id, product, quantity, currency,
        total, merchandise_cost, notes, is_street, payment_method, payments,
        date, original_report_date, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        finalBranchId,
        seller_id || null,
        guide_id || null,
        agency_id || null,
        product,
        quantity,
        currency,
        total,
        merchandise_cost || 0,
        notes || null,
        is_street || false,
        payment_method || null,
        payments ? JSON.stringify(payments) : null,
        date,
        original_report_date || date,
        req.user.id
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creando captura rápida:', error);
    res.status(500).json({ error: 'Error al crear captura rápida', details: error.message });
  }
});

// Obtener capturas rápidas
router.get('/quick-captures', requireBranchAccess, async (req, res) => {
  try {
    const { branch_id, date_from, date_to, date } = req.query;
    
    let branchFilter = '';
    const params = [];
    let paramCount = 1;

    if (req.user.isMasterAdmin) {
      if (branch_id) {
        branchFilter = `WHERE qc.branch_id = $${paramCount}`;
        params.push(branch_id);
        paramCount++;
      }
    } else {
      branchFilter = `WHERE qc.branch_id = $${paramCount}`;
      params.push(req.user.branchId);
      paramCount++;
    }

    // Filtro por fecha específica
    if (date) {
      branchFilter += ` AND qc.date = $${paramCount}`;
      params.push(date);
      paramCount++;
    } else {
      // Filtro por rango de fechas
      if (date_from) {
        branchFilter += ` AND qc.date >= $${paramCount}`;
        params.push(date_from);
        paramCount++;
      }
      if (date_to) {
        branchFilter += ` AND qc.date <= $${paramCount}`;
        params.push(date_to);
        paramCount++;
      }
    }

    const result = await query(
      `SELECT 
        qc.*,
        b.name as branch_name,
        s.name as seller_name,
        g.name as guide_name,
        a.name as agency_name
      FROM quick_captures qc
      LEFT JOIN branches b ON qc.branch_id = b.id
      LEFT JOIN catalog_sellers s ON qc.seller_id = s.id
      LEFT JOIN catalog_guides g ON qc.guide_id = g.id
      LEFT JOIN catalog_agencies a ON qc.agency_id = a.id
      ${branchFilter}
      ORDER BY qc.date DESC, qc.created_at DESC`,
      params
    );

    // Parsear JSONB fields
    const captures = result.rows.map(row => ({
      ...row,
      payments: row.payments ? (typeof row.payments === 'string' ? JSON.parse(row.payments) : row.payments) : null
    }));

    res.json(captures);
  } catch (error) {
    console.error('Error obteniendo capturas rápidas:', error);
    res.status(500).json({ error: 'Error al obtener capturas rápidas', details: error.message });
  }
});

// Actualizar captura rápida
router.put('/quick-captures/:id', requireBranchAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Verificar que existe y tiene acceso
    const existingResult = await query(
      'SELECT branch_id FROM quick_captures WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Captura no encontrada' });
    }

    const existing = existingResult.rows[0];

    // Verificar acceso
    if (!req.user.isMasterAdmin && existing.branch_id !== req.user.branchId) {
      return res.status(403).json({ error: 'No tienes acceso a esta captura' });
    }

    // Construir query de actualización
    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'seller_id', 'guide_id', 'agency_id', 'product', 'quantity', 'currency',
      'total', 'merchandise_cost', 'notes', 'is_street', 'payment_method',
      'payments', 'date', 'original_report_date'
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        if (field === 'payments' && updateData[field]) {
          fields.push(`${field} = $${paramCount}`);
          values.push(JSON.stringify(updateData[field]));
        } else {
          fields.push(`${field} = $${paramCount}`);
          values.push(updateData[field]);
        }
        paramCount++;
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const sql = `UPDATE quick_captures SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await query(sql, values);

    // Parsear JSONB
    const updated = result.rows[0];
    if (updated.payments) {
      updated.payments = typeof updated.payments === 'string' ? JSON.parse(updated.payments) : updated.payments;
    }

    res.json(updated);
  } catch (error) {
    console.error('Error actualizando captura rápida:', error);
    res.status(500).json({ error: 'Error al actualizar captura rápida', details: error.message });
  }
});

// Eliminar captura rápida
router.delete('/quick-captures/:id', requireBranchAccess, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que existe y tiene acceso
    const existingResult = await query(
      'SELECT branch_id FROM quick_captures WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Captura no encontrada' });
    }

    const existing = existingResult.rows[0];

    // Verificar acceso
    if (!req.user.isMasterAdmin && existing.branch_id !== req.user.branchId) {
      return res.status(403).json({ error: 'No tienes acceso a esta captura' });
    }

    await query('DELETE FROM quick_captures WHERE id = $1', [id]);

    res.json({ message: 'Captura eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando captura rápida:', error);
    res.status(500).json({ error: 'Error al eliminar captura rápida', details: error.message });
  }
});

export default router;
