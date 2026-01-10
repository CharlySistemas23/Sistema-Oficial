import express from 'express';
import { query } from '../config/database.js';
import { requireMasterAdmin } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Obtener empleados
router.get('/', async (req, res) => {
  try {
    let result;

    if (req.user.isMasterAdmin) {
      // Admin maestro ve todos los empleados
      result = await query(
        `SELECT e.*, b.name as branch_name
         FROM employees e
         LEFT JOIN branches b ON e.branch_id = b.id
         ORDER BY e.name`
      );
    } else {
      // Otros usuarios solo ven empleados de sus sucursales
      const branchIds = req.user.branchIds || [];
      if (branchIds.length === 0) {
        return res.json([]);
      }
      result = await query(
        `SELECT e.*, b.name as branch_name
         FROM employees e
         LEFT JOIN branches b ON e.branch_id = b.id
         WHERE e.branch_id = ANY($1) OR e.branch_id IS NULL
         ORDER BY e.name`,
        [branchIds]
      );
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo empleados:', error);
    res.status(500).json({ error: 'Error al obtener empleados' });
  }
});

// Crear empleado (solo admin maestro)
router.post('/', requireMasterAdmin, async (req, res) => {
  try {
    const { code, barcode, name, email, phone, role, branch_id, branch_ids, active = true } = req.body;

    const result = await query(
      `INSERT INTO employees (code, barcode, name, email, phone, role, branch_id, branch_ids, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [code, barcode, name, email, phone, role, branch_id, branch_ids || [], active]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'El código o código de barras ya existe' });
    }
    console.error('Error creando empleado:', error);
    res.status(500).json({ error: 'Error al crear empleado' });
  }
});

// Crear usuario para empleado
router.post('/:employeeId/user', requireMasterAdmin, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { username, password, role } = req.body;

    // Verificar que el empleado existe
    const employeeResult = await query(
      'SELECT * FROM employees WHERE id = $1',
      [employeeId]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    // Hash de contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO users (username, password_hash, employee_id, role, active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, username, role, active`,
      [username, passwordHash, employeeId, role || 'employee']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'El nombre de usuario ya existe' });
    }
    console.error('Error creando usuario:', error);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

export default router;
