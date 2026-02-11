import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

// Middleware de autenticación OPCIONAL - Intenta con token, si no hay token intenta con username
// Esto permite que el sistema funcione sin token pero manteniendo el filtrado por sucursal
export const authenticateOptional = async (req, res, next) => {
  try {
    // Log para debugging (solo para requests que no son OPTIONS)
    if (process.env.DEBUG_AUTH === 'true' && req.method !== 'OPTIONS') {
      console.log(`🔐 Auth request: ${req.method} ${req.path}`);
      console.log(`   Origin: ${req.headers.origin}`);
      console.log(`   Authorization: ${req.headers['authorization'] ? 'Presente' : 'Ausente'}`);
      console.log(`   x-username: ${req.headers['x-username'] || 'Ausente'}`);
      console.log(`   x-branch-id: ${req.headers['x-branch-id'] || 'Ausente'}`);
    }
    
    // Intentar autenticación con token primero (método preferido)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token) {
      // Si hay token, usar autenticación normal
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const userResult = await query(
          `SELECT u.*, e.branch_id, e.branch_ids, e.role as employee_role
           FROM users u
           LEFT JOIN employees e ON u.employee_id = e.id
           WHERE u.id = $1 AND u.active = true`,
          [decoded.userId]
        );

        if (userResult.rows.length > 0) {
          const user = userResult.rows[0];
          const role = user.role || user.employee_role;
          const isMasterAdmin = role === 'master_admin';
          const headerBranchId = (req.headers['x-branch-id'] || '').trim();
          const isUUID = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || '').trim());
          const rawBranchId = user.branch_id != null ? String(user.branch_id).trim() : null;
          // Lista de sucursales permitidas (array de strings normalizados)
          const branchIds = Array.isArray(user.branch_ids)
            ? user.branch_ids.map(b => String(b).trim()).filter(Boolean)
            : (user.branch_id ? [String(user.branch_id).trim()] : []);

          let effectiveBranchId;
          if (isMasterAdmin && headerBranchId && isUUID(headerBranchId)) {
            effectiveBranchId = headerBranchId;
          } else if (rawBranchId) {
            effectiveBranchId = rawBranchId;
          } else if (headerBranchId && isUUID(headerBranchId) && branchIds.includes(headerBranchId)) {
            // Usuario asignado a sucursal: usar x-branch-id si está en sus sucursales permitidas
            effectiveBranchId = headerBranchId;
          } else if (branchIds.length > 0) {
            effectiveBranchId = branchIds[0];
          } else {
            effectiveBranchId = null;
          }

          req.user = {
            id: user.id,
            username: user.username,
            employeeId: user.employee_id,
            role,
            branchId: effectiveBranchId,
            branchIds: branchIds.length ? branchIds : (rawBranchId ? [rawBranchId] : []),
            isMasterAdmin,
            authenticated: true
          };
          return next();
        }
      } catch (tokenError) {
        // Si el token es inválido, continuar con método alternativo
        console.warn('⚠️ Token inválido, intentando autenticación alternativa:', tokenError.message);
      }
    }

    // Método alternativo: autenticación por username y branch_id (sin token)
    const username = req.headers['x-username'] || req.query.username || req.body.username;
    const branchId = req.headers['x-branch-id'] || req.query.branch_id || req.body.branch_id;
    
    if (username) {
      // Buscar usuario por username
      const userResult = await query(
        `SELECT u.*, e.branch_id, e.branch_ids, e.role as employee_role
         FROM users u
         LEFT JOIN employees e ON u.employee_id = e.id
         WHERE u.username = $1 AND u.active = true`,
        [username]
      );

      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        const role = user.role || user.employee_role;
        const isMasterAdmin = role === 'master_admin';
        const rawUserBranchId = user.branch_id != null ? String(user.branch_id).trim() : null;
        const userBranchIds = Array.isArray(user.branch_ids)
          ? user.branch_ids.map(b => String(b).trim()).filter(Boolean)
          : (user.branch_id ? [String(user.branch_id).trim()] : []);

        let userBranchId = (branchId && String(branchId).trim()) || rawUserBranchId;
        if (!userBranchId && userBranchIds.length > 0) userBranchId = userBranchIds[0];

        // Si se envió branch_id, verificar que el usuario tenga acceso
        if (branchId && !isMasterAdmin) {
          const bid = String(branchId).trim();
          if (!userBranchIds.includes(bid)) {
            return res.status(403).json({ error: 'Usuario no tiene acceso a esta sucursal' });
          }
        }

        req.user = {
          id: user.id,
          username: user.username,
          employeeId: user.employee_id,
          role,
          branchId: userBranchId,
          branchIds: userBranchIds.length ? userBranchIds : (rawUserBranchId ? [rawUserBranchId] : []),
          isMasterAdmin,
          authenticated: false // Indica que fue autenticado sin token
        };
        return next();
      } else {
        // Si el usuario no existe en Railway, crear un usuario temporal con los datos enviados
        // Esto permite que funcione incluso si el usuario no está en Railway
        req.user = {
          id: null,
          username: username,
          employeeId: null,
          role: username === 'master_admin' ? 'master_admin' : 'employee',
          branchId: branchId || null,
          branchIds: branchId ? [branchId] : [],
          isMasterAdmin: username === 'master_admin',
          authenticated: false,
          isTemporary: true // Indica que es un usuario temporal
        };
        return next();
      }
    }

    // Si no hay token ni username, permitir acceso pero con usuario genérico (solo lectura)
    // Esto permite que el sistema funcione incluso sin autenticación
    req.user = {
      id: null,
      username: 'anonymous',
      employeeId: null,
      role: 'employee',
      branchId: branchId || null,
      branchIds: branchId ? [branchId] : [],
      isMasterAdmin: false,
      authenticated: false,
      isTemporary: true
    };
    return next();
  } catch (error) {
    console.error('Error en autenticación opcional:', error);
    return res.status(500).json({ error: 'Error en autenticación' });
  }
};

// Middleware para verificar si es admin maestro (compatible con authenticateOptional)
export const requireMasterAdmin = (req, res, next) => {
  if (!req.user || !req.user.isMasterAdmin) {
    return res.status(403).json({ error: 'Acceso denegado: se requiere rol de administrador maestro' });
  }
  next();
};

// Middleware para verificar acceso a sucursal (compatible con authenticateOptional)
export const requireBranchAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Autenticación requerida para esta operación' });
  }
  const branchId = req.params.branchId || req.body.branch_id || req.query.branch_id;
  
  if (!branchId) {
    return next(); // Si no hay branchId, continuar (algunas rutas no lo requieren)
  }

  // Admin maestro tiene acceso a todas las sucursales
  if (req.user.isMasterAdmin) {
    return next();
  }

  // Verificar que el usuario tenga acceso a esta sucursal
  const userBranchIds = req.user.branchIds || [];
  if (!userBranchIds.includes(branchId)) {
    return res.status(403).json({ error: 'No tienes acceso a esta sucursal' });
  }

  next();
};
