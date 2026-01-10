import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

// Almacenar conexiones activas por usuario y sucursal
const activeConnections = new Map(); // userId -> Set of socketIds
const branchRooms = new Map(); // branchId -> Set of socketIds

// Exportar funciones para emitir eventos
export const emitInventoryUpdate = (io, branchId, action, item) => {
  if (!io) return;
  io.to(`branch:${branchId}`).emit('inventory_updated', {
    action,
    item,
    branchId,
    timestamp: new Date().toISOString()
  });
  // También emitir a admin maestro
  io.to('master_admin').emit('inventory_updated', {
    action,
    item,
    branchId,
    timestamp: new Date().toISOString()
  });
};

export const emitSaleUpdate = (io, branchId, action, sale) => {
  if (!io) return;
  io.to(`branch:${branchId}`).emit('sale_updated', {
    action,
    sale,
    branchId,
    timestamp: new Date().toISOString()
  });
  // También emitir a admin maestro
  io.to('master_admin').emit('sale_updated', {
    action,
    sale,
    branchId,
    timestamp: new Date().toISOString()
  });
};

export const setupSocketIO = (io) => {
  // Middleware de autenticación para Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Token de autenticación requerido'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Verificar usuario
      const userResult = await query(
        `SELECT u.*, e.branch_id, e.branch_ids, e.role as employee_role
         FROM users u
         LEFT JOIN employees e ON u.employee_id = e.id
         WHERE u.id = $1 AND u.active = true`,
        [decoded.userId]
      );

      if (userResult.rows.length === 0) {
        return next(new Error('Usuario no encontrado o inactivo'));
      }

      const user = userResult.rows[0];
      socket.userId = user.id;
      socket.user = {
        id: user.id,
        username: user.username,
        role: user.role || user.employee_role,
        branchId: user.branch_id,
        branchIds: user.branch_ids || (user.branch_id ? [user.branch_id] : []),
        isMasterAdmin: user.role === 'master_admin'
      };

      next();
    } catch (error) {
      console.error('Error en autenticación Socket.IO:', error);
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ Cliente conectado: ${socket.userId} (${socket.user.username})`);

    // Registrar conexión
    if (!activeConnections.has(socket.userId)) {
      activeConnections.set(socket.userId, new Set());
    }
    activeConnections.get(socket.userId).add(socket.id);

    // Unirse a salas de sucursales
    if (socket.user.isMasterAdmin) {
      // Admin maestro se une a todas las sucursales
      socket.join('master_admin');
      socket.emit('joined_room', { room: 'master_admin' });
    } else {
      // Usuarios normales se unen solo a sus sucursales
      const branchIds = socket.user.branchIds || [];
      branchIds.forEach(branchId => {
        const roomName = `branch:${branchId}`;
        socket.join(roomName);
        
        if (!branchRooms.has(branchId)) {
          branchRooms.set(branchId, new Set());
        }
        branchRooms.get(branchId).add(socket.id);
        
        socket.emit('joined_room', { room: roomName });
      });
    }

    // Suscribirse a eventos de inventario
    socket.on('subscribe_inventory', (data) => {
      const { branchId } = data;
      
      if (socket.user.isMasterAdmin || socket.user.branchIds?.includes(branchId)) {
        socket.join(`inventory:${branchId}`);
        socket.emit('subscribed', { channel: `inventory:${branchId}` });
      }
    });

    // Suscribirse a eventos de ventas
    socket.on('subscribe_sales', (data) => {
      const { branchId } = data;
      
      if (socket.user.isMasterAdmin || socket.user.branchIds?.includes(branchId)) {
        socket.join(`sales:${branchId}`);
        socket.emit('subscribed', { channel: `sales:${branchId}` });
      }
    });

    // Manejar desconexión
    socket.on('disconnect', () => {
      console.log(`❌ Cliente desconectado: ${socket.userId}`);

      // Remover de conexiones activas
      if (activeConnections.has(socket.userId)) {
        activeConnections.get(socket.userId).delete(socket.id);
        if (activeConnections.get(socket.userId).size === 0) {
          activeConnections.delete(socket.userId);
        }
      }

      // Remover de salas de sucursales
      const branchIds = socket.user.branchIds || [];
      branchIds.forEach(branchId => {
        if (branchRooms.has(branchId)) {
          branchRooms.get(branchId).delete(socket.id);
          if (branchRooms.get(branchId).size === 0) {
            branchRooms.delete(branchId);
          }
        }
      });
    });
  });
};

// Función para emitir eventos a una sucursal específica
export const emitToBranch = (io, branchId, event, data) => {
  io.to(`branch:${branchId}`).emit(event, data);
  // También emitir a admin maestro
  io.to('master_admin').emit(event, { ...data, branchId });
};

// Función para emitir eventos de inventario
export const emitInventoryUpdate = (io, branchId, action, item) => {
  emitToBranch(io, branchId, 'inventory_updated', {
    action, // created, updated, deleted, stock_changed
    item,
    branchId,
    timestamp: new Date().toISOString()
  });
};

// Función para emitir eventos de ventas
export const emitSaleUpdate = (io, branchId, action, sale) => {
  emitToBranch(io, branchId, 'sale_updated', {
    action, // created, updated, cancelled, completed
    sale,
    branchId,
    timestamp: new Date().toISOString()
  });
};

// Función para emitir eventos a todos (admin maestro)
export const emitToAll = (io, event, data) => {
  io.emit(event, data);
};
