import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Lockout en memoria por (IP + username). Despues de N intentos fallidos
// rechazamos por M minutos. No reemplaza al rate limiter de Express, lo
// complementa con granularidad por usuario.
const LOGIN_FAIL_MAX = parseInt(process.env.LOGIN_FAIL_MAX || '8', 10);
const LOGIN_LOCKOUT_MS = parseInt(process.env.LOGIN_LOCKOUT_MS || String(15 * 60 * 1000), 10);
const loginAttempts = new Map(); // key -> { count, firstAt, lockedUntil }

const getLockoutKey = (req, username) => `${req.ip || 'unknown'}::${String(username || '').toLowerCase()}`;

const isLockedOut = (key) => {
  const entry = loginAttempts.get(key);
  if (!entry) return 0;
  if (entry.lockedUntil && entry.lockedUntil > Date.now()) {
    return entry.lockedUntil - Date.now();
  }
  if (entry.lockedUntil && entry.lockedUntil <= Date.now()) {
    loginAttempts.delete(key);
  }
  return 0;
};

const recordLoginFailure = (key) => {
  const entry = loginAttempts.get(key) || { count: 0, firstAt: Date.now(), lockedUntil: 0 };
  entry.count++;
  if (entry.count >= LOGIN_FAIL_MAX) {
    entry.lockedUntil = Date.now() + LOGIN_LOCKOUT_MS;
  }
  loginAttempts.set(key, entry);
};

const clearLoginFailures = (key) => {
  loginAttempts.delete(key);
};

// Comparacion timing-safe para hashes ya conocidos. bcrypt.compare ya es
// timing-safe internamente; este helper es para el camino legacy SHA-256.
const timingSafeEqualStr = (a, b) => {
  const aStr = String(a || '');
  const bStr = String(b || '');
  if (aStr.length !== bStr.length) {
    // Aun en mismatch de longitud, hacer una comparacion dummy para evitar
    // que el atacante deduzca el largo del hash por timing.
    crypto.timingSafeEqual(Buffer.from('a'), Buffer.from('a'));
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(aStr), Buffer.from(bStr));
};

// Cache liviano para /verify para reducir presión de BD en estaciones abiertas por horas.
const verifyUserCache = new Map();
const VERIFY_USER_CACHE_TTL_MS = parseInt(process.env.AUTH_VERIFY_CACHE_TTL_MS || '120000', 10); // 2 min

const getCachedVerifyUser = (userId) => {
  const key = String(userId || '');
  if (!key) return null;
  const entry = verifyUserCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > VERIFY_USER_CACHE_TTL_MS) {
    verifyUserCache.delete(key);
    return null;
  }
  return entry.user;
};

const setCachedVerifyUser = (userId, user) => {
  const key = String(userId || '');
  if (!key || !user) return;
  verifyUserCache.set(key, { user, timestamp: Date.now() });
};

// (Maintenance endpoints + helpers removidos. Ver nota al final del archivo.)

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

    // Lockout por (IP+username) tras N intentos fallidos.
    const lockoutKey = getLockoutKey(req, username);
    const remainingMs = isLockedOut(lockoutKey);
    if (remainingMs > 0) {
      const minutes = Math.ceil(remainingMs / 60000);
      return res.status(429).json({
        error: `Demasiados intentos fallidos. Intenta de nuevo en ${minutes} minuto(s).`,
        code: 'LOGIN_LOCKED_OUT'
      });
    }

    // Buscar usuario
    const userResult = await query(
       `SELECT u.*, e.branch_id, e.branch_ids, e.role as employee_role, e.name as employee_name
       FROM users u
       LEFT JOIN employees e ON u.employee_id = e.id
       WHERE u.username = $1 AND u.active = true`,
      [username]
    );

    if (userResult.rows.length === 0) {
      recordLoginFailure(lockoutKey);
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const user = userResult.rows[0];

    // Verificar contraseña (soporta tanto bcrypt como SHA-256 para compatibilidad).
    // bcrypt.compare es timing-safe internamente. Para SHA-256 usamos
    // crypto.timingSafeEqual para evitar leak por comparacion `===`.
    let isValidPassword = false;

    const isBcryptHash = user.password_hash && (
      user.password_hash.startsWith('$2a$') ||
      user.password_hash.startsWith('$2b$') ||
      user.password_hash.startsWith('$2y$')
    );

    if (isBcryptHash) {
      try {
        isValidPassword = await bcrypt.compare(password, user.password_hash);
      } catch (bcryptError) {
        console.error('Error comparando con bcrypt:', bcryptError);
        isValidPassword = false;
      }
    } else {
      try {
        const sha256Hash = crypto.createHash('sha256').update(password).digest('hex');
        isValidPassword = timingSafeEqualStr(sha256Hash, user.password_hash);
      } catch (shaError) {
        console.error('Error comparando con SHA-256:', shaError);
        isValidPassword = false;
      }
    }

    if (!isValidPassword) {
      recordLoginFailure(lockoutKey);
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    // Login OK — limpiar contador de intentos fallidos
    clearLoginFailures(lockoutKey);

    // Actualizar último login
    await query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || typeof jwtSecret !== 'string') {
      console.error('JWT_SECRET no configurado. No se puede emitir token de login.');
      return res.status(500).json({ error: 'Configuración de autenticación incompleta' });
    }

    // Generar token JWT
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role || user.employee_role,
        employeeId: user.employee_id
      },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Registrar en audit log (no bloquear login si falla)
    try {
      await query(
        `INSERT INTO audit_logs (user_id, action, entity_type, details, ip_address)
         VALUES ($1, 'login', 'user', $2, $3)`,
        [
          user.id,
          JSON.stringify({ username: user.username }),
          req.ip || req.connection.remoteAddress
        ]
      );
    } catch (auditError) {
      console.error('No se pudo registrar audit log de login:', auditError?.message || auditError);
    }

    // Verificar si es master_admin (puede estar en user.role o employee_role)
    const userRole = user.role || user.employee_role;
    const isMasterAdmin = userRole === 'master_admin';
    const permissions = (user.permissions != null && Array.isArray(user.permissions))
      ? user.permissions
      : [];
    const permissionsByBranch = (user.permissions_by_branch != null && typeof user.permissions_by_branch === 'object')
      ? user.permissions_by_branch
      : {};

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
        employeeId: user.employee_id,
        permissions,
        permissions_by_branch: permissionsByBranch
      }
    });
  } catch (error) {
    const errorMessage = String(error?.message || '').toLowerCase();
    const isDbTimeout = errorMessage.includes('timeout exceeded when trying to connect');
    const isDbConnIssue = isDbTimeout || errorMessage.includes('econnrefused') || errorMessage.includes('connection');

    console.error('Error en login:', error);
    if (isDbConnIssue) {
      return res.status(503).json({ error: 'Base de datos no disponible temporalmente', code: 'DB_UNAVAILABLE' });
    }
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
    
    let user = getCachedVerifyUser(decoded.userId);
    if (!user) {
      const userResult = await query(
         `SELECT u.*, e.branch_id, e.branch_ids, e.role as employee_role, e.name as employee_name
         FROM users u
         LEFT JOIN employees e ON u.employee_id = e.id
         WHERE u.id = $1 AND u.active = true`,
        [decoded.userId],
        1,
        2000
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({ error: 'Usuario no encontrado' });
      }

      user = userResult.rows[0];
      setCachedVerifyUser(decoded.userId, user);
    }
    const userRole = user.role || user.employee_role;
    const isMasterAdmin = userRole === 'master_admin';
    const permissions = (user.permissions != null && Array.isArray(user.permissions))
      ? user.permissions
      : [];
    const permissionsByBranch = (user.permissions_by_branch != null && typeof user.permissions_by_branch === 'object')
      ? user.permissions_by_branch
      : {};

    // Renovar token automáticamente si expira en menos de 2 días (evita desconexiones en estaciones 24/7)
    let newToken = null;
    try {
      const tokenExpiresAt = decoded.exp * 1000;
      if (tokenExpiresAt - Date.now() < 2 * 24 * 60 * 60 * 1000) {
        const jwtSecret = process.env.JWT_SECRET;
        if (jwtSecret) {
          newToken = jwt.sign(
            { userId: user.id, username: user.username, role: userRole, employeeId: user.employee_id },
            jwtSecret,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
          );
        }
      }
    } catch (renewError) {
      console.warn('No se pudo renovar token:', renewError.message);
    }

    res.json({
      valid: true,
      newToken,
      user: {
        id: user.id,
        username: user.username,
        name: user.employee_name,
        role: userRole,
        branchId: user.branch_id,
        branchIds: user.branch_ids || (user.branch_id ? [user.branch_id] : []),
        isMasterAdmin: isMasterAdmin,
        is_master_admin: isMasterAdmin, // Compatibilidad con frontend
        employeeId: user.employee_id,
        permissions,
        permissions_by_branch: permissionsByBranch
      }
    });
  } catch (error) {
    const errorMessage = String(error?.message || '').toLowerCase();
    const isDbTimeout = errorMessage.includes('timeout exceeded when trying to connect');
    const isDbConnIssue = isDbTimeout || errorMessage.includes('econnrefused') || errorMessage.includes('connection');

    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    if (isDbConnIssue) {
      return res.status(503).json({ error: 'Base de datos no disponible temporalmente', code: 'DB_UNAVAILABLE' });
    }

    console.error('Error verificando token:', error);
    res.status(500).json({ error: 'Error al verificar token' });
  }
});

// =====================================================================
// Validacion del codigo de acceso de empresa (gate previo al login).
// El codigo vive en env var COMPANY_ACCESS_CODE (defaults a 'OPAL2024')
// para no exponerlo en el bundle del frontend. El frontend pega aqui con
// el codigo escrito; si es correcto recibe un remember_token con HMAC
// firmado con COMPANY_TOKEN_SECRET, que puede guardar en localStorage
// para no volver a pedir el codigo en proximas visitas.
// (crypto ya esta importado al inicio del archivo)
// =====================================================================

const getCompanyCodeSecret = () =>
  process.env.COMPANY_TOKEN_SECRET ||
  process.env.JWT_SECRET ||
  'opal-co-default-secret-change-me';

const computeCompanyToken = (code) => {
  const secret = getCompanyCodeSecret();
  return crypto.createHmac('sha256', secret).update(String(code)).digest('hex');
};

const getExpectedCompanyCode = () =>
  (process.env.COMPANY_ACCESS_CODE || 'OPAL2024').trim();

router.post('/verify-company-code', [
  body('code').optional().isString(),
  body('token').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ valid: false, error: 'Datos invalidos' });
    }

    const expectedCode = getExpectedCompanyCode();
    const expectedToken = computeCompanyToken(expectedCode);

    const { code, token } = req.body || {};

    // Validar via remember_token (constant-time compare evita timing attacks)
    if (token && typeof token === 'string') {
      const safe = (a, b) => {
        try {
          const bufA = Buffer.from(String(a), 'hex');
          const bufB = Buffer.from(String(b), 'hex');
          if (bufA.length !== bufB.length) return false;
          return crypto.timingSafeEqual(bufA, bufB);
        } catch { return false; }
      };
      if (safe(token, expectedToken)) {
        return res.json({ valid: true, remember_token: expectedToken });
      }
      return res.status(401).json({ valid: false, error: 'Token invalido' });
    }

    // Validar via codigo escrito
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ valid: false, error: 'Codigo requerido' });
    }
    if (code.trim() === expectedCode) {
      return res.json({ valid: true, remember_token: expectedToken });
    }
    return res.status(401).json({ valid: false, error: 'Codigo de acceso incorrecto' });
  } catch (err) {
    console.error('Error verificando company code:', err);
    return res.status(500).json({ valid: false, error: 'Error verificando codigo' });
  }
});

// Maintenance endpoints removidos:
//   - POST /ensure-admin: creaba master_admin con password hardcoded "1234".
//     Reemplazado por bootstrap automatico en server.js (con
//     MASTER_ADMIN_INITIAL_PASSWORD random/env).
//   - POST /cleanup-users: borraba TODOS los usuarios y reseteaba master_admin
//     a "1234". Demasiado peligroso aun gateado por env var.
// Para recuperar acceso: usar MASTER_ADMIN_RESET_PASSWORD env var en Railway
// (resetea solo el password, no borra usuarios). Ver server.js bootstrap.

export default router;
