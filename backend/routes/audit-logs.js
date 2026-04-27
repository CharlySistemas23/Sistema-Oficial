import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

const requireMaster = (req, res, next) => {
  if (!req.user || !req.user.isMasterAdmin) {
    return res.status(403).json({ error: 'Solo master_admin puede ver el log de auditoria' });
  }
  next();
};

// GET /api/audit-logs?limit=100&action=login&entity_type=user
// Devuelve las ultimas N entradas con join opcional al user.username.
router.get('/', requireMaster, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const { action, entity_type, user_id } = req.query;

    let sql = `
      SELECT al.id, al.user_id, al.action, al.entity_type, al.entity_id,
             al.details, al.ip_address, al.created_at,
             u.username
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let pos = 1;

    if (action) {
      sql += ` AND al.action = $${pos++}`;
      params.push(action);
    }
    if (entity_type) {
      sql += ` AND al.entity_type = $${pos++}`;
      params.push(entity_type);
    }
    if (user_id) {
      sql += ` AND al.user_id = $${pos++}`;
      params.push(user_id);
    }

    sql += ` ORDER BY al.created_at DESC LIMIT $${pos}`;
    params.push(limit);

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo audit_logs:', error);
    res.status(500).json({ error: 'Error al obtener audit logs' });
  }
});

export default router;
