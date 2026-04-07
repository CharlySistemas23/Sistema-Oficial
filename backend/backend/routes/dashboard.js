import express from 'express';
import { query } from '../config/database.js';
import { authenticateOptional } from '../middleware/authOptional.js';

const router = express.Router();

// Dashboard principal con métricas
router.get('/metrics', authenticateOptional, async (req, res) => {
  try {
    const { branch_id, start_date, end_date, date } = req.query;
    const appTimezone = process.env.APP_TIMEZONE || 'America/Mexico_City';
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // Para master_admin: si branch_id no se envía o es null, significa vista consolidada (todas las sucursales)
    // Para usuarios normales: usar su branch_id asignado
    let branchId = null;
    if (req.user.isMasterAdmin) {
      // Master admin: solo usar branch_id si se envía explícitamente y no es 'null'
      if (branch_id && branch_id !== 'null' && branch_id !== 'undefined') {
        branchId = branch_id;
      }
      // Si no se envía branch_id, branchId queda como null (vista consolidada)
    } else {
      // Usuarios normales: usar su branch_id asignado
      branchId = req.user.branchId;
    }

    const statusCompletedClause = `LOWER(COALESCE(s.status, '')) IN ('completed', 'completada', 'completado')`;

    const salesParams = [];
    const salesConditions = [];
    let salesParamCount = 1;

    if (req.user.isMasterAdmin) {
      if (branchId) {
        salesConditions.push(`s.branch_id = $${salesParamCount}`);
        salesParams.push(branchId);
        salesParamCount++;
      }
    } else {
      if (!req.user.branchId) {
        return res.status(400).json({ error: 'Usuario no tiene sucursal asignada' });
      }
      salesConditions.push(`s.branch_id = $${salesParamCount}`);
      salesParams.push(req.user.branchId);
      salesParamCount++;
    }

    if (start_date) {
      salesConditions.push(`DATE(s.created_at AT TIME ZONE $${salesParamCount}) >= $${salesParamCount + 1}`);
      salesParams.push(appTimezone, start_date);
      salesParamCount += 2;
    }

    if (end_date) {
      salesConditions.push(`DATE(s.created_at AT TIME ZONE $${salesParamCount}) <= $${salesParamCount + 1}`);
      salesParams.push(appTimezone, end_date);
      salesParamCount += 2;
    }

    const salesWhere = salesConditions.length ? `WHERE ${salesConditions.join(' AND ')}` : 'WHERE 1=1';

    const todayParams = [...salesParams, appTimezone, targetDate];
    const todayWhere = `${salesWhere} AND DATE(s.created_at AT TIME ZONE $${todayParams.length - 1}) = $${todayParams.length}`;

    const salesTodayResult = await query(
      `SELECT 
        COUNT(*) as count,
        COALESCE(SUM(total), 0) as total_sales,
        COALESCE(AVG(total), 0) as avg_ticket
       FROM sales s
         ${todayWhere}
         AND ${statusCompletedClause}`,
      todayParams
    );

    const salesToday = salesTodayResult.rows[0];

    const sellersParams = [...salesParams];

    const topSellersResult = await query(
      `SELECT 
        cs.name as seller_name,
        COUNT(s.id) as sales_count,
        COALESCE(SUM(s.total), 0) as total_sales
       FROM sales s
       LEFT JOIN catalog_sellers cs ON s.seller_id = cs.id
       ${salesWhere}
       AND ${statusCompletedClause}
       GROUP BY cs.name
       ORDER BY total_sales DESC
       LIMIT 5`,
      sellersParams
    );

    // Llegadas del día
    let arrivalsFilter = '';
    const arrivalsParams = [];
    let arrivalsParamCount = 1;
    
    if (req.user.isMasterAdmin) {
      if (branchId) {
        arrivalsFilter = `WHERE aa.branch_id = $${arrivalsParamCount}`;
        arrivalsParams.push(branchId);
        arrivalsParamCount++;
        arrivalsFilter += ` AND aa.date = $${arrivalsParamCount}`;
        arrivalsParams.push(targetDate);
      } else {
        // Vista consolidada: mostrar todas las sucursales
        arrivalsFilter = `WHERE aa.date = $${arrivalsParamCount}`;
        arrivalsParams.push(targetDate);
      }
    } else {
      if (!req.user.branchId) {
        // Si no tiene branch_id, retornar vacío
        arrivalsFilter = `WHERE 1=0`; // No mostrar nada
      } else {
        arrivalsFilter = `WHERE aa.branch_id = $${arrivalsParamCount}`;
        arrivalsParams.push(req.user.branchId);
        arrivalsParamCount++;
        arrivalsFilter += ` AND aa.date = $${arrivalsParamCount}`;
        arrivalsParams.push(targetDate);
      }
    }
    
    const arrivalsResult = await query(
      `SELECT aa.*, ca.name as agency_name
       FROM agency_arrivals aa
       LEFT JOIN catalog_agencies ca ON aa.agency_id = ca.id
       ${arrivalsFilter}
       AND aa.passengers > 0 AND aa.units > 0`,
      arrivalsParams
    );
    
    const totalPassengers = arrivalsResult.rows.reduce((sum, a) => sum + (a.passengers || 0), 0);
    
    // Obtener todas las ventas para el período
    const allSalesResult = await query(
      `SELECT s.*
       FROM sales s
       ${salesWhere}
       AND ${statusCompletedClause}
       ORDER BY s.created_at DESC`,
      salesParams
    );

    // Productos más vendidos
    const topProductsResult = await query(
      `SELECT 
        si.name,
        SUM(si.quantity) as quantity_sold,
        COALESCE(SUM(si.subtotal), 0) as total_revenue
       FROM sale_items si
       INNER JOIN sales s ON si.sale_id = s.id
       ${salesWhere}
       AND ${statusCompletedClause}
       GROUP BY si.name
       ORDER BY quantity_sold DESC
       LIMIT 10`,
      sellersParams
    );

    res.json({
      sales: allSalesResult.rows,
      sales_today: {
        count: parseInt(salesToday.count) || 0,
        total: parseFloat(salesToday.total_sales) || 0,
        avg_ticket: parseFloat(salesToday.avg_ticket) || 0
      },
      top_sellers: topSellersResult.rows,
      top_products: topProductsResult.rows,
      arrivals: arrivalsResult.rows,
      totalPassengers: totalPassengers
    });
  } catch (error) {
    console.error('Error obteniendo métricas:', error);
    res.status(500).json({ error: 'Error al obtener métricas' });
  }
});

// Analíticas avanzadas (solo admin maestro)
router.get('/analytics', async (req, res) => {
  try {
    if (!req.user.isMasterAdmin) {
      return res.status(403).json({ error: 'Solo administradores maestros pueden ver analíticas' });
    }

    const { branch_id, start_date, end_date, group_by = 'day' } = req.query;

    let branchFilter = '';
    const params = [];
    let paramCount = 1;

    if (branch_id) {
      branchFilter = `WHERE s.branch_id = $${paramCount}`;
      params.push(branch_id);
      paramCount++;
    }

    if (start_date) {
      branchFilter += branchFilter ? ` AND s.created_at >= $${paramCount}` : `WHERE s.created_at >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      branchFilter += branchFilter ? ` AND s.created_at <= $${paramCount}` : `WHERE s.created_at <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    let dateFormat = "DATE_TRUNC('day', s.created_at)";
    if (group_by === 'week') {
      dateFormat = "DATE_TRUNC('week', s.created_at)";
    } else if (group_by === 'month') {
      dateFormat = "DATE_TRUNC('month', s.created_at)";
    }

    const analyticsResult = await query(
      `SELECT 
        ${dateFormat} as period,
        b.name as branch_name,
        COUNT(s.id) as sales_count,
        COALESCE(SUM(s.total), 0) as total_sales,
        COALESCE(AVG(s.total), 0) as avg_ticket
       FROM sales s
       LEFT JOIN branches b ON s.branch_id = b.id
       ${branchFilter || 'WHERE 1=1'}
       AND s.status = 'completed'
       GROUP BY ${dateFormat}, b.name
       ORDER BY period DESC`,
      params
    );

    res.json(analyticsResult.rows);
  } catch (error) {
    console.error('Error obteniendo analíticas:', error);
    res.status(500).json({ error: 'Error al obtener analíticas' });
  }
});

// Estadísticas de proveedores
router.get('/suppliers-stats', authenticateOptional, async (req, res) => {
  try {
    const { branch_id } = req.query;
    
    let branchId = null;
    if (req.user.isMasterAdmin) {
      if (branch_id && branch_id !== 'null' && branch_id !== 'undefined') {
        branchId = branch_id;
      }
    } else {
      branchId = req.user.branchId;
    }

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
      if (!req.user.branchId) {
        return res.status(400).json({ error: 'Usuario no tiene sucursal asignada' });
      }
      branchFilter = `WHERE s.branch_id = $${paramCount}`;
      params.push(req.user.branchId);
      paramCount++;
    }

    // Total de proveedores activos
    const totalSuppliersResult = await query(
      `SELECT COUNT(*) as count
       FROM suppliers s
       ${branchFilter || 'WHERE 1=1'}
       AND s.status = 'active'`,
      params
    );

    // Proveedores recientes (últimos 30 días)
    const recentSuppliersResult = await query(
      `SELECT COUNT(*) as count
       FROM suppliers s
       ${branchFilter || 'WHERE 1=1'}
       AND s.status = 'active'
       AND s.created_at >= NOW() - INTERVAL '30 days'`,
      params
    );

    // Total de compras a proveedores (últimos 30 días)
    const purchasesResult = await query(
      `SELECT COUNT(*) as count, COALESCE(SUM(ce.amount), 0) as total
       FROM cost_entries ce
       LEFT JOIN suppliers s ON ce.supplier_id = s.id
       ${branchFilter ? branchFilter.replace('s.branch_id', 'ce.branch_id') : 'WHERE 1=1'}
       AND ce.date >= NOW() - INTERVAL '30 days'
       AND ce.supplier_id IS NOT NULL`,
      params
    );

    // Top 5 proveedores por monto (últimos 30 días)
    const topSuppliersResult = await query(
      `SELECT 
        s.id,
        s.name,
        s.code,
        COUNT(ce.id) as purchase_count,
        COALESCE(SUM(ce.amount), 0) as total_amount
       FROM suppliers s
       LEFT JOIN cost_entries ce ON s.id = ce.supplier_id
         AND ce.date >= NOW() - INTERVAL '30 days'
       ${branchFilter || 'WHERE 1=1'}
       AND s.status = 'active'
       GROUP BY s.id, s.name, s.code
       HAVING COUNT(ce.id) > 0
       ORDER BY total_amount DESC
       LIMIT 5`,
      params
    );

    res.json({
      totalSuppliers: parseInt(totalSuppliersResult.rows[0]?.count || 0),
      recentSuppliers: parseInt(recentSuppliersResult.rows[0]?.count || 0),
      totalPurchases: parseInt(purchasesResult.rows[0]?.count || 0),
      totalPurchaseAmount: parseFloat(purchasesResult.rows[0]?.total || 0),
      topSuppliers: topSuppliersResult.rows
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas de proveedores:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas de proveedores' });
  }
});

export default router;
