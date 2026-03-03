import pg from 'pg';
const { Pool } = pg;

// Configuración de la conexión a PostgreSQL optimizada para Railway
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10, // Reducir máximo de conexiones para Railway (evitar agotamiento)
  idleTimeoutMillis: 20000, // Cerrar conexiones inactivas después de 20 segundos
  connectionTimeoutMillis: 10000, // Aumentar timeout de conexión a 10 segundos
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000, // Mantener conexiones vivas
  // Configuraciones adicionales para Railway
  statement_timeout: 30000, // Timeout de 30 segundos para queries
  query_timeout: 30000,
});

// Manejo de errores de conexión mejorado
pool.on('error', (err, client) => {
  // Solo loguear errores críticos, no todos los errores de conexión
  if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.message.includes('terminated')) {
    console.error('⚠️ Error de conexión PostgreSQL (se reintentará automáticamente):', err.message);
  } else {
    console.error('Error inesperado en el cliente PostgreSQL:', err.message);
  }
  // El pool manejará la reconexión automáticamente
  // No terminar el proceso
});

// Manejo de eventos del pool (solo en desarrollo o para errores críticos)
if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_DB === 'true') {
  pool.on('connect', (client) => {
    console.log('✅ Nueva conexión PostgreSQL establecida');
  });

  pool.on('remove', (client) => {
    // Solo loguear si es un error, no en remociones normales
    if (client._connectionError) {
      console.warn('⚠️ Cliente PostgreSQL removido del pool por error');
    }
  });
}

// Función para ejecutar queries con reintentos automáticos
export const query = async (text, params, retries = 3) => {
  const start = Date.now();
  let lastError;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      
      // Solo loguear queries lentas o en modo debug
      if (duration > 1000 || process.env.DEBUG_DB === 'true') {
        console.log('Query ejecutada', { 
          duration: `${duration}ms`, 
          rows: res.rowCount,
          attempt 
        });
      }
      
      return res;
    } catch (error) {
      lastError = error;
      
      // Si es un error de conexión, reintentar
      if (
        (error.code === 'ECONNREFUSED' || 
         error.code === 'ETIMEDOUT' || 
         error.message.includes('terminated') ||
         error.message.includes('Connection')) &&
        attempt < retries
      ) {
        const waitTime = attempt * 500; // Backoff exponencial: 500ms, 1000ms, 1500ms
        console.warn(`⚠️ Error de conexión en query (intento ${attempt}/${retries}), reintentando en ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // Si no es un error de conexión o se agotaron los reintentos, lanzar error
      if (attempt === retries) {
        console.error('Error ejecutando query después de reintentos:', { 
          error: error.message,
          code: error.code,
          attempts: attempt
        });
      }
      
      throw error;
    }
  }
  
  throw lastError;
};

// Función para obtener un cliente del pool (para transacciones) con reintentos
export const getClient = async (retries = 3) => {
  let lastError;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      const originalQuery = client.query.bind(client);
      const originalRelease = client.release.bind(client);
      
      // Wrapper para query con manejo de errores
      client.query = async (text, params) => {
        try {
          return await originalQuery(text, params);
        } catch (error) {
          // Si es error de conexión, el cliente puede estar muerto
          if (error.message.includes('terminated') || error.message.includes('Connection')) {
            console.warn('⚠️ Cliente PostgreSQL desconectado durante query, liberando...');
            try {
              originalRelease();
            } catch (e) {
              // Ignorar errores al liberar cliente muerto
            }
            throw error;
          }
          throw error;
        }
      };
      
      // Timeout para evitar que el cliente quede colgado
      const timeout = setTimeout(() => {
        console.warn('⚠️ Cliente PostgreSQL sin liberar después de 30 segundos');
      }, 30000);
      
      client.release = () => {
        clearTimeout(timeout);
        originalRelease();
      };
      
      return client;
    } catch (error) {
      lastError = error;
      
      // Si es un error de conexión, reintentar
      if (
        (error.code === 'ECONNREFUSED' || 
         error.code === 'ETIMEDOUT' || 
         error.message.includes('terminated') ||
         error.message.includes('Connection')) &&
        attempt < retries
      ) {
        const waitTime = attempt * 500;
        console.warn(`⚠️ Error obteniendo cliente (intento ${attempt}/${retries}), reintentando en ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      if (attempt === retries) {
        console.error('Error obteniendo cliente después de reintentos:', {
          error: error.message,
          code: error.code,
          attempts: attempt
        });
      }
      
      throw error;
    }
  }
  
  throw lastError;
};

export default pool;
