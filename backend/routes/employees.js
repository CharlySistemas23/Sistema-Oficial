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

// Actualizar empleado (solo admin maestro)
router.put('/:id', requireMasterAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { code, barcode, name, email, phone, role, branch_id, branch_ids, active } = req.body;

    // Verificar que el empleado existe
    const existingResult = await query(
      'SELECT * FROM employees WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    const result = await query(
      `UPDATE employees 
       SET code = $1, barcode = $2, name = $3, email = $4, phone = $5, 
           role = $6, branch_id = $7, branch_ids = $8, active = $9,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [code, barcode, name, email, phone, role, branch_id, branch_ids || [], active, id]
    );

    // Si el rol cambió a master_admin o desde master_admin, actualizar también el usuario asociado
    if (role && role !== existingResult.rows[0].role) {
      const userResult = await query(
        'SELECT * FROM users WHERE employee_id = $1',
        [id]
      );

      if (userResult.rows.length > 0) {
        // Actualizar el rol del usuario para que coincida con el empleado
        await query(
          `UPDATE users 
           SET role = $1, updated_at = CURRENT_TIMESTAMP
           WHERE employee_id = $2`,
          [role, id]
        );
      }
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'El código o código de barras ya existe' });
    }
    console.error('Error actualizando empleado:', error);
    res.status(500).json({ error: 'Error al actualizar empleado' });
  }
});

// Eliminar empleado (solo admin maestro)
router.delete('/:id', requireMasterAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM employees WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    res.json({ message: 'Empleado eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando empleado:', error);
    res.status(500).json({ error: 'Error al eliminar empleado' });
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

    const employee = employeeResult.rows[0];

    // Hash de contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // Usar el rol del empleado si no se especifica uno diferente
    const userRole = role || employee.role || 'employee';

    const result = await query(
      `INSERT INTO users (username, password_hash, employee_id, role, active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, username, role, active`,
      [username, passwordHash, employeeId, userRole]
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

// Eliminar usuario (solo admin maestro)
router.delete('/user/:userId', requireMasterAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verificar que el usuario existe
    const userResult = await query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = userResult.rows[0];

    // Eliminar el usuario
    const result = await query(
      'DELETE FROM users WHERE id = $1 RETURNING *',
      [userId]
    );

    // Registrar en audit log
    try {
      await query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
         VALUES ($1, 'delete', 'user', $2, $3)`,
        [req.user.id, userId, JSON.stringify({ username: user.username })]
      );
    } catch (auditError) {
      console.warn('Error registrando en audit_log (no crítico):', auditError.message);
    }

    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

export default router;
