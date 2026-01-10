import express from 'express';
import { query } from '../config/database.js';
import { requireMasterAdmin } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Obtener todas las sucursales (admin maestro ve todas, otros solo las suyas)
router.get('/', async (req, res) => {
  try {
    let branchesResult;

    if (req.user.isMasterAdmin) {
      // Admin maestro ve todas las sucursales
      branchesResult = await query(
        'SELECT * FROM branches ORDER BY name'
      );
    } else {
      // Otros usuarios solo ven sus sucursales
      const branchIds = req.user.branchIds || [];
      if (branchIds.length === 0) {
        return res.json([]);
      }
      branchesResult = await query(
        'SELECT * FROM branches WHERE id = ANY($1) ORDER BY name',
        [branchIds]
      );
    }

    res.json(branchesResult.rows);
  } catch (error) {
    console.error('Error obteniendo sucursales:', error);
    res.status(500).json({ error: 'Error al obtener sucursales' });
  }
});

// Obtener una sucursal por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar acceso
    if (!req.user.isMasterAdmin) {
      const branchIds = req.user.branchIds || [];
      if (!branchIds.includes(id)) {
        return res.status(403).json({ error: 'No tienes acceso a esta sucursal' });
      }
    }

    const result = await query(
      'SELECT * FROM branches WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sucursal no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo sucursal:', error);
    res.status(500).json({ error: 'Error al obtener sucursal' });
  }
});

// Crear sucursal (solo admin maestro)
router.post('/', requireMasterAdmin, [
  body('code').notEmpty().withMessage('Código requerido'),
  body('name').notEmpty().withMessage('Nombre requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { code, name, address, phone, email, active = true } = req.body;

    const result = await query(
      `INSERT INTO branches (code, name, address, phone, email, active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [code, name, address, phone, email, active]
    );

    // Registrar en audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'create', 'branch', $2, $3)`,
      [req.user.id, result.rows[0].id, JSON.stringify({ code, name })]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'El código de sucursal ya existe' });
    }
    console.error('Error creando sucursal:', error);
    res.status(500).json({ error: 'Error al crear sucursal' });
  }
});

// Actualizar sucursal (solo admin maestro)
router.put('/:id', requireMasterAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, address, phone, email, active } = req.body;

    const result = await query(
      `UPDATE branches
       SET code = COALESCE($1, code),
           name = COALESCE($2, name),
           address = COALESCE($3, address),
           phone = COALESCE($4, phone),
           email = COALESCE($5, email),
           active = COALESCE($6, active)
       WHERE id = $7
       RETURNING *`,
      [code, name, address, phone, email, active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sucursal no encontrada' });
    }

    // Registrar en audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'update', 'branch', $2, $3)`,
      [req.user.id, id, JSON.stringify(req.body)]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error actualizando sucursal:', error);
    res.status(500).json({ error: 'Error al actualizar sucursal' });
  }
});

// Eliminar sucursal (solo admin maestro)
router.delete('/:id', requireMasterAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM branches WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sucursal no encontrada' });
    }

    // Registrar en audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'delete', 'branch', $2, $3)`,
      [req.user.id, id, JSON.stringify({ name: result.rows[0].name })]
    );

    res.json({ message: 'Sucursal eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando sucursal:', error);
    res.status(500).json({ error: 'Error al eliminar sucursal' });
  }
});

export default router;
