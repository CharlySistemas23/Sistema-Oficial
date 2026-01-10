import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// Obtener clientes
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;

    let sql = 'SELECT * FROM customers WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND (name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1)';
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

// Crear cliente
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, address, notes } = req.body;

    const result = await query(
      `INSERT INTO customers (name, email, phone, address, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, email, phone, address, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creando cliente:', error);
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

export default router;
