import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// Configuracion compartida de la empresa (impuestos, comisiones bancarias,
// etc.). Una sola tabla key/value para evitar acoplar el schema con cada
// nueva configuracion. Lectura abierta a usuarios autenticados (los valores
// son necesarios para calcular ventas), escritura SOLO master_admin.

const requireMaster = (req, res, next) => {
  if (!req.user || !req.user.isMasterAdmin) {
    return res.status(403).json({ error: 'Solo master_admin puede modificar la configuracion compartida' });
  }
  next();
};

// Whitelist de keys permitidas. Evita que clientes guarden basura
// arbitraria en la tabla.
const ALLOWED_KEYS = new Set([
  'tax_iva',
  'tax_ieps',
  'tax_isr',
  'bank_commission_banamex_national',
  'bank_commission_banamex_international',
  'bank_commission_santander_national',
  'bank_commission_santander_international',
  'business_name',
  'business_address',
  'business_phone',
  'ticket_footer'
]);

// GET /api/settings/company — lee toda la configuracion compartida.
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT key, value, updated_at FROM company_settings'
    );
    const out = {};
    for (const row of result.rows) {
      out[row.key] = {
        value: row.value,
        updated_at: row.updated_at
      };
    }
    res.json(out);
  } catch (error) {
    console.error('Error obteniendo company_settings:', error);
    res.status(500).json({ error: 'Error al obtener configuracion' });
  }
});

// PUT /api/settings/company — upsert batch de keys.
// Body: { settings: { key1: value1, key2: value2, ... } }
router.put('/', requireMaster, async (req, res) => {
  try {
    const { settings } = req.body || {};
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Body debe incluir settings: { key: value, ... }' });
    }

    const entries = Object.entries(settings);
    const rejected = [];
    const accepted = [];
    const userId = req.user?.id || null;

    for (const [key, value] of entries) {
      if (!ALLOWED_KEYS.has(key)) {
        rejected.push({ key, reason: 'key no permitida' });
        continue;
      }
      try {
        await query(
          `INSERT INTO company_settings (key, value, updated_at, updated_by)
           VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP, $3)
           ON CONFLICT (key) DO UPDATE SET
             value = EXCLUDED.value,
             updated_at = CURRENT_TIMESTAMP,
             updated_by = EXCLUDED.updated_by`,
          [key, JSON.stringify(value), userId]
        );
        accepted.push(key);
      } catch (e) {
        rejected.push({ key, reason: e.message || 'error al guardar' });
      }
    }

    res.json({ accepted, rejected });
  } catch (error) {
    console.error('Error guardando company_settings:', error);
    res.status(500).json({ error: 'Error al guardar configuracion' });
  }
});

export default router;
