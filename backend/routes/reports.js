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

export default router;
