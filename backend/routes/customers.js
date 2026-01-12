import express from 'express';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { emitCustomerUpdate } from '../socket/socketHandler.js';

// Importar io desde el módulo principal
let io;
export const setIO = (socketIO) => {
  io = socketIO;
};

const router = express.Router();

// Obtener clientes
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, branch_id } = req.query;

    let sql = 'SELECT * FROM customers WHERE 1=1';
    const params = [];
    let paramCount = 0;

    // Filtrar por sucursal si no es master admin
    if (!req.user.isMasterAdmin) {
      const branchId = branch_id || req.user.branchId;
      if (branchId) {
        paramCount++;
        sql += ` AND (branch_id = $${paramCount} OR branch_id IS NULL)`;
        params.push(branchId);
      }
    } else if (branch_id) {
      // Master admin puede filtrar por sucursal específica
      paramCount++;
      sql += ` AND (branch_id = $${paramCount} OR branch_id IS NULL)`;
      params.push(branch_id);
    }

    if (search) {
      paramCount++;
      sql += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount} OR phone ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    sql += ' ORDER BY name LIMIT 100';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo clientes:', error);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

// Obtener cliente por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM customers WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const customer = result.rows[0];

    // Verificar acceso
    if (!req.user.isMasterAdmin && customer.branch_id && customer.branch_id !== req.user.branchId) {
      return res.status(403).json({ error: 'No tienes acceso a este cliente' });
    }

    res.json(customer);
  } catch (error) {
    console.error('Error obteniendo cliente:', error);
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
});

// Crear cliente
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, address, notes, branch_id } = req.body;
    const finalBranchId = branch_id || req.user.branchId;

    const result = await query(
      `INSERT INTO customers (name, email, phone, address, notes, branch_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, email, phone, address, notes, finalBranchId]
    );

    const customer = result.rows[0];

    // Emitir actualización en tiempo real
    if (io) {
      emitCustomerUpdate(io, finalBranchId, 'created', customer);
    }

    res.status(201).json(customer);
  } catch (error) {
    console.error('Error creando cliente:', error);
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

// Actualizar cliente
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, notes, branch_id } = req.body;

    // Verificar que existe
    const existingResult = await query(
      'SELECT * FROM customers WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const existingCustomer = existingResult.rows[0];

    // Verificar acceso (solo master admin puede cambiar sucursal)
    if (!req.user.isMasterAdmin && existingCustomer.branch_id !== req.user.branchId) {
      return res.status(403).json({ error: 'No tienes acceso a este cliente' });
    }

    const finalBranchId = req.user.isMasterAdmin ? (branch_id || existingCustomer.branch_id) : existingCustomer.branch_id;

    const result = await query(
      `UPDATE customers 
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           phone = COALESCE($3, phone),
           address = COALESCE($4, address),
           notes = COALESCE($5, notes),
           branch_id = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [name, email, phone, address, notes, finalBranchId, id]
    );

    const updatedCustomer = result.rows[0];

    // Emitir actualización en tiempo real
    if (io) {
      emitCustomerUpdate(io, finalBranchId, 'updated', updatedCustomer);
    }

    res.json(updatedCustomer);
  } catch (error) {
    console.error('Error actualizando cliente:', error);
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

// Eliminar cliente
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que existe
    const existingResult = await query(
      'SELECT * FROM customers WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const customer = existingResult.rows[0];

    // Verificar acceso (solo master admin o mismo usuario de la sucursal)
    if (!req.user.isMasterAdmin && customer.branch_id !== req.user.branchId) {
      return res.status(403).json({ error: 'No tienes acceso a este cliente' });
    }

    // Verificar dependencias (opcional: advertir o bloquear)
    const salesCount = await query(
      'SELECT COUNT(*) as count FROM sales WHERE customer_id = $1',
      [id]
    );

    if (parseInt(salesCount.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar el cliente porque tiene ventas asociadas' 
      });
    }

    await query('DELETE FROM customers WHERE id = $1', [id]);

    // Registrar en audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'delete', 'customer', $2, $3)`,
      [req.user.id, id, JSON.stringify({ name: customer.name, email: customer.email })]
    );

    // Emitir actualización en tiempo real
    if (io) {
      emitCustomerUpdate(io, customer.branch_id || req.user.branchId, 'deleted', { id });
    }

    res.json({ message: 'Cliente eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando cliente:', error);
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
});

export default router;
