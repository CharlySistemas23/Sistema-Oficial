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

    res.json({
      valid: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.employee_name,
        role: user.role || user.employee_role,
        branchId: user.branch_id,
        branchIds: user.branch_ids || (user.branch_id ? [user.branch_id] : []),
        isMasterAdmin: user.role === 'master_admin'
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

export default router;
