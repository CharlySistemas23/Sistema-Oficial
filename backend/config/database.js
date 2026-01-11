import pg from 'pg';
const { Pool } = pg;

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Máximo de conexiones en el pool
  idleTimeoutMillis: 30000, // Cerrar conexiones inactivas después de 30 segundos
  connectionTimeoutMillis: 5000, // Aumentar timeout de conexión a 5 segundos
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000, // Mantener conexiones vivas
});

// Manejo de errores de conexión (no terminar el proceso, solo loguear)
pool.on('error', (err, client) => {
  console.error('Error inesperado en el cliente PostgreSQL:', err);
  // No terminar el proceso, solo loguear el error
  // El pool manejará la reconexión automáticamente
});

// Manejo de eventos del pool para debugging
pool.on('connect', (client) => {
  console.log('✅ Nueva conexión PostgreSQL establecida');
});

pool.on('remove', (client) => {
  console.log('⚠️ Cliente PostgreSQL removido del pool');
});

// Función para ejecutar queries
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Query ejecutada', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Error ejecutando query:', { text, error: error.message });
    throw error;
  }
};

// Función para obtener un cliente del pool (para transacciones)
export const getClient = async () => {
  const client = await pool.connect();
  const query = client.query.bind(client);
  const release = client.release.bind(client);
  
  // Timeout para evitar que el cliente quede colgado
  const timeout = setTimeout(() => {
    console.error('Cliente PostgreSQL sin liberar después de 10 segundos');
  }, 10000);
  
  client.release = () => {
    clearTimeout(timeout);
    release();
  };
  
  return client;
};

export default pool;
