import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Login
router.post('/login', [
  body('username').notEmpty().withMessage('Usuario requerido'),
  body('password').notEmpty().withMessage('Contraseña requerida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    // Buscar usuario
    const userResult = await query(
      `SELECT u.*, e.branch_id, e.branch_ids, e.role as employee_role, e.name as employee_name
       FROM users u
       LEFT JOIN employees e ON u.employee_id = e.id
       WHERE u.username = $1 AND u.active = true`,
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const user = userResult.rows[0];

    // Verificar contraseña (soporta tanto bcrypt como SHA-256 para compatibilidad)
    let isValidPassword = false;
    
    // Verificar si el hash es bcrypt (empieza con $2a$, $2b$, $2y$)
    const isBcryptHash = user.password_hash && (
      user.password_hash.startsWith('$2a$') ||
      user.password_hash.startsWith('$2b$') ||
      user.password_hash.startsWith('$2y$')
    );
    
    if (isBcryptHash) {
      // Intentar con bcrypt (nuevo sistema)
      try {
        isValidPassword = await bcrypt.compare(password, user.password_hash);
      } catch (bcryptError) {
        console.error('Error comparando con bcrypt:', bcryptError);
        isValidPassword = false;
      }
    } else {
      // Intentar con SHA-256 (sistema legacy)
      try {
        const crypto = await import('crypto');
        const sha256Hash = crypto.createHash('sha256').update(password).digest('hex');
        isValidPassword = (sha256Hash === user.password_hash);
      } catch (shaError) {
        console.error('Error comparando con SHA-256:', shaError);
        isValidPassword = false;
      }
    }
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    // Actualizar último login
    await query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generar token JWT
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role || user.employee_role,
        employeeId: user.employee_id
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Registrar en audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, details, ip_address)
       VALUES ($1, 'login', 'user', $2, $3)`,
      [
        user.id,
        JSON.stringify({ username: user.username }),
        req.ip || req.connection.remoteAddress
      ]
    );

    // Verificar si es master_admin (puede estar en user.role o employee_role)
    const userRole = user.role || user.employee_role;
    const isMasterAdmin = userRole === 'master_admin';
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.employee_name,
        role: userRole,
        branchId: user.branch_id,
        branchIds: user.branch_ids || (user.branch_id ? [user.branch_id] : []),
        isMasterAdmin: isMasterAdmin,
        is_master_admin: isMasterAdmin, // Compatibilidad con frontend
        employeeId: user.employee_id
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// Verificar token
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token requerido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const userResult = await query(
      `SELECT u.*, e.branch_id, e.branch_ids, e.role as employee_role, e.name as employee_name
       FROM users u
       LEFT JOIN employees e ON u.employee_id = e.id
       WHERE u.id = $1 AND u.active = true`,
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    const user = userResult.rows[0];
    const userRole = user.role || user.employee_role;
    const isMasterAdmin = userRole === 'master_admin';

    res.json({
      valid: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.employee_name,
        role: userRole,
        branchId: user.branch_id,
        branchIds: user.branch_ids || (user.branch_id ? [user.branch_id] : []),
        isMasterAdmin: isMasterAdmin,
        is_master_admin: isMasterAdmin, // Compatibilidad con frontend
        employeeId: user.employee_id
      }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }
    console.error('Error verificando token:', error);
    res.status(500).json({ error: 'Error al verificar token' });
  }
});

// Endpoint temporal para crear usuario admin si no existe
router.post('/ensure-admin', async (req, res) => {
  try {
    const { query } = await import('../config/database.js');
    const bcrypt = await import('bcryptjs');
    
    // Verificar si el usuario master_admin existe
    const adminCheck = await query(`
      SELECT id FROM users WHERE username = 'master_admin' LIMIT 1
    `);
    
    if (adminCheck.rows.length > 0) {
      return res.json({ 
        message: 'Usuario master_admin ya existe',
        username: 'master_admin'
      });
    }
    
    // Verificar/crear sucursal MAIN
    let branchResult = await query(`SELECT id FROM branches WHERE code = 'MAIN' LIMIT 1`);
    let branchId;
    
    if (branchResult.rows.length === 0) {
      await query(`
        INSERT INTO branches (id, name, code, address, phone, email, active)
        VALUES (
          '00000000-0000-0000-0000-000000000001',
          'Sucursal Principal',
          'MAIN',
          'Dirección principal',
          '1234567890',
          'admin@opalco.com',
          true
        )
        ON CONFLICT (id) DO NOTHING
      `);
      branchResult = await query(`SELECT id FROM branches WHERE code = 'MAIN' LIMIT 1`);
    }
    
    branchId = branchResult.rows[0]?.id;
    if (!branchId) {
      const firstBranch = await query(`SELECT id FROM branches WHERE active = true LIMIT 1`);
      branchId = firstBranch.rows[0]?.id;
    }
    
    // Verificar/crear empleado ADMIN
    let employeeResult = await query(`SELECT id FROM employees WHERE code = 'ADMIN' LIMIT 1`);
    let employeeId;
    
    if (employeeResult.rows.length === 0) {
      // Crear empleado admin (master_admin NO debe tener branch_id para acceder a todas las sucursales)
      await query(`
        INSERT INTO employees (id, code, name, role, branch_id, active)
        VALUES (
          '00000000-0000-0000-0000-000000000002',
          'ADMIN',
          'Administrador Maestro',
          'master_admin',
          NULL,
          true
        )
        ON CONFLICT (id) DO UPDATE SET
          role = 'master_admin',
          branch_id = NULL
      `);
      employeeResult = await query(`SELECT id FROM employees WHERE code = 'ADMIN' LIMIT 1`);
    } else {
      // Asegurar que el empleado master_admin tenga branch_id NULL
      await query(`
        UPDATE employees 
        SET role = 'master_admin', branch_id = NULL 
        WHERE code = 'ADMIN' AND role = 'master_admin'
      `);
    }
    
    employeeId = employeeResult.rows[0]?.id || '00000000-0000-0000-0000-000000000002';
    
    // Crear usuario admin
    const passwordHash = await bcrypt.hash('1234', 10);
    
    try {
      await query(`
        INSERT INTO users (id, username, password_hash, employee_id, role, active)
        VALUES (
          '00000000-0000-0000-0000-000000000001',
          'master_admin',
          $1,
          $2,
          'master_admin',
          true
        )
        ON CONFLICT (id) DO UPDATE SET
          username = EXCLUDED.username,
          password_hash = EXCLUDED.password_hash,
          employee_id = EXCLUDED.employee_id,
          role = EXCLUDED.role,
          active = EXCLUDED.active
      `, [passwordHash, employeeId]);
      
      return res.json({ 
        success: true,
        message: 'Usuario master_admin creado exitosamente',
        username: 'master_admin',
        pin: '1234'
      });
    } catch (userError) {
      if (userError.code === '23505') {
        // Usuario ya existe con otro ID, actualizar
        await query(`
          UPDATE users 
          SET password_hash = $1, 
              employee_id = $2, 
              role = 'master_admin',
              active = true
          WHERE username = 'master_admin'
        `, [passwordHash, employeeId]);
        
        return res.json({ 
          success: true,
          message: 'Usuario master_admin actualizado',
          username: 'master_admin',
          pin: '1234'
        });
      } else {
        throw userError;
      }
    }
  } catch (error) {
    console.error('Error creando usuario admin:', error);
    res.status(500).json({ 
      error: 'Error al crear usuario admin',
      details: error.message 
    });
  }
});

// Endpoint temporal para limpiar usuarios (excepto master_admin)
router.post('/cleanup-users', async (req, res) => {
  try {
    console.log('🧹 Limpiando usuarios (excepto master_admin)...');
    
    // Obtener todos los usuarios
    const allUsersResult = await query('SELECT id, username, role FROM users ORDER BY username');
    
    if (allUsersResult.rows.length === 0) {
      return res.json({ 
        message: 'No hay usuarios en la base de datos',
        usersRemaining: 0
      });
    }
    
    // Identificar usuarios a eliminar (todos excepto master_admin)
    const usersToDelete = allUsersResult.rows.filter(user => user.role !== 'master_admin');
    
    if (usersToDelete.length === 0) {
      // Buscar usuario master_admin y devolver credenciales
      const masterAdmin = allUsersResult.rows.find(user => user.role === 'master_admin');
      return res.json({ 
        message: 'No hay usuarios para eliminar. Solo existe master_admin.',
        usersRemaining: 1,
        credentials: masterAdmin ? {
          username: masterAdmin.username,
          pin: '1234'
        } : null
      });
    }
    
    // Eliminar usuarios
    let deletedCount = 0;
    const deletedUsers = [];
    
    for (const user of usersToDelete) {
      try {
        await query('DELETE FROM users WHERE id = $1', [user.id]);
        deletedUsers.push({ username: user.username, role: user.role });
        deletedCount++;
      } catch (error) {
        console.error(`Error eliminando usuario ${user.username}:`, error.message);
      }
    }
    
    // Buscar usuario master_admin restante
    const remainingUsersResult = await query('SELECT id, username, role FROM users WHERE role = $1', ['master_admin']);
    const masterAdmin = remainingUsersResult.rows[0] || null;
    
    return res.json({
      success: true,
      message: `✅ ${deletedCount} usuario(s) eliminado(s) exitosamente`,
      deletedCount,
      deletedUsers,
      usersRemaining: remainingUsersResult.rows.length,
      credentials: masterAdmin ? {
        username: masterAdmin.username,
        pin: '1234'
      } : null
    });
  } catch (error) {
    console.error('Error limpiando usuarios:', error);
    return res.status(500).json({ 
      error: 'Error al limpiar usuarios',
      details: error.message 
    });
  }
});

export default router;
