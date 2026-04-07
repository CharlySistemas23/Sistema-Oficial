import pg from 'pg';
const { Pool } = pg;

const isRailway = Boolean(
  process.env.RAILWAY_ENVIRONMENT_ID ||
  process.env.RAILWAY_PROJECT_ID ||
  process.env.RAILWAY_SERVICE_ID ||
  process.env.RAILWAY_PUBLIC_DOMAIN
);

const useSSL = process.env.DB_SSL === 'false'
  ? false
  : (process.env.NODE_ENV === 'production' || isRailway)
    ? { rejectUnauthorized: false }
    : false;

// Configuración de la conexión a PostgreSQL optimizada para Railway
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL,
  max: parseInt(process.env.DB_POOL_MAX || '5', 10),
  min: parseInt(process.env.DB_POOL_MIN || '1', 10),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT_MS || '20000', 10),
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT_MS || '60000', 10),
  query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT_MS || '60000', 10),
  maxUses: parseInt(process.env.DB_MAX_USES || '2000', 10),
});

const RETRY_BASE_MS = parseInt(process.env.DB_RETRY_BASE_MS || '600', 10);
const RETRY_MAX_MS = parseInt(process.env.DB_RETRY_MAX_MS || '3000', 10);
const DEFAULT_RETRIES = parseInt(process.env.DB_QUERY_RETRIES || '1', 10);
const APP_QUERY_TIMEOUT_MS = parseInt(process.env.DB_APP_QUERY_TIMEOUT_MS || '60000', 10);
const SLOW_QUERY_MS = parseInt(process.env.DB_SLOW_QUERY_MS || '1500', 10);

const CB_QUEUE_LIMIT = parseInt(process.env.DB_POOL_QUEUE_LIMIT || '6', 10);
const CB_FAILURE_THRESHOLD = parseInt(process.env.DB_CB_FAILURE_THRESHOLD || '10', 10);
const CB_RECOVERY_MS = parseInt(process.env.DB_CB_RECOVERY_MS || '5000', 10);

let consecutiveConnectionFailures = 0;
let globalBackoffUntil = 0;

const cb = {
  state: 'CLOSED',
  openedAt: 0,

  check() {
    if (this.state === 'CLOSED' && pool.waitingCount >= CB_QUEUE_LIMIT) {
      this.trip(`pool queue saturation (${pool.waitingCount})`);
    }

    if (this.state === 'OPEN') {
      if (Date.now() - this.openedAt >= CB_RECOVERY_MS) {
        this.state = 'HALF_OPEN';
        console.warn('[DB] circuit breaker -> HALF_OPEN');
        return;
      }

      const err = new Error('Database temporarily unavailable. Please retry shortly.');
      err.code = 'CIRCUIT_OPEN';
      err.status = 503;
      throw err;
    }
  },

  trip(reason) {
    if (this.state !== 'OPEN') {
      this.state = 'OPEN';
      this.openedAt = Date.now();
      console.error(`[DB] circuit breaker -> OPEN (${reason})`);
    }
  },

  success() {
    if (this.state !== 'CLOSED') {
      console.log('[DB] circuit breaker -> CLOSED');
    }
    this.state = 'CLOSED';
    consecutiveConnectionFailures = 0;
    globalBackoffUntil = 0;
  },

  failure() {
    consecutiveConnectionFailures += 1;
    if (this.state === 'HALF_OPEN' || consecutiveConnectionFailures >= CB_FAILURE_THRESHOLD) {
      this.trip(`${consecutiveConnectionFailures} consecutive connection failures`);
    }
  }
};

const summarizeQuery = (text) => {
  const oneLine = String(text || '').replace(/\s+/g, ' ').trim();
  return oneLine.length > 180 ? `${oneLine.slice(0, 180)}...` : oneLine;
};

const isConnectionError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return (
    error?.code === 'ECONNREFUSED' ||
    error?.code === 'ETIMEDOUT' ||
    error?.code === '57P01' || // admin_shutdown
    error?.code === '57P03' || // cannot_connect_now
    error?.code === '53300' || // too_many_connections
    message.includes('timeout exceeded when trying to connect') ||
    message.includes('client has encountered a connection error') ||
    message.includes('connection terminated unexpectedly') ||
    message.includes('could not connect to server') ||
    message.includes('terminated') ||
    message.includes('connection')
  );
};

const calculateBackoff = (attempt, failures = 0) => {
  const failureFactor = Math.max(1, failures);
  const raw = RETRY_BASE_MS * Math.pow(2, Math.max(0, attempt - 1)) * Math.min(failureFactor, 6);
  return Math.min(RETRY_MAX_MS, raw);
};

const getPoolStats = () => ({
  totalCount: pool.totalCount,
  idleCount: pool.idleCount,
  waitingCount: pool.waitingCount
});

const isDbBusy = () => pool.waitingCount >= CB_QUEUE_LIMIT;

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

// Manejo de eventos del pool solo en modo debug explícito.
if (process.env.DEBUG_DB === 'true') {
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

// Función para ejecutar queries con reintentos automáticos y logs detallados
export const query = async (text, params, retries = DEFAULT_RETRIES, timeoutMs = null) => {
  const start = Date.now();
  let lastError;
  const maxAttempts = Math.max(1, Number(retries ?? DEFAULT_RETRIES) || 0);
  const effectiveTimeout = Number.isFinite(Number(timeoutMs)) && Number(timeoutMs) > 0
    ? Number(timeoutMs)
    : APP_QUERY_TIMEOUT_MS;
  const queryPreview = summarizeQuery(text);
  const now = Date.now();

  cb.check();

  if (globalBackoffUntil > now) {
    const waitLeft = globalBackoffUntil - now;
    const backoffError = new Error(`DB connection backoff active for ${waitLeft}ms`);
    backoffError.code = 'DB_BACKOFF_ACTIVE';
    throw backoffError;
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let timeoutId = null;
    const abortController = new AbortController();
    try {
      if (effectiveTimeout > 0) {
        timeoutId = setTimeout(() => {
          abortController.abort();
        }, effectiveTimeout);
      }

      if (process.env.DEBUG_DB === 'true') {
        console.log('[DB] Antes de query', {
          text: queryPreview,
          pool: getPoolStats(),
          attempt
        });
      }

      const res = await pool.query({
        text,
        values: params,
        signal: abortController.signal
      });

      if (timeoutId) clearTimeout(timeoutId);
      const duration = Date.now() - start;
      cb.success();

      if (duration > SLOW_QUERY_MS || process.env.DEBUG_DB === 'true') {
        console.log('[DB] Query ejecutada', {
          text: queryPreview,
          duration: `${duration}ms`,
          rows: res.rowCount,
          attempt,
          pool: getPoolStats()
        });
      }

      return res;
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);

      if (error?.name === 'AbortError') {
        const timeoutError = new Error(`Query timeout after ${effectiveTimeout}ms`);
        timeoutError.code = 'QUERY_TIMEOUT';
        lastError = timeoutError;
      } else {
        lastError = error;
      }

      if (isConnectionError(lastError)) {
        cb.failure();
      }

      if (isConnectionError(lastError) && attempt < maxAttempts) {
        const waitTime = calculateBackoff(attempt, consecutiveConnectionFailures);
        globalBackoffUntil = Date.now() + waitTime;
        console.warn(`[DB] Error de conexión en query (intento ${attempt}/${maxAttempts}), reintentando en ${waitTime}ms...`, {
          pool: getPoolStats(),
          text: queryPreview
        });
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      if (isConnectionError(lastError)) {
        const coolDown = Math.min(4000, calculateBackoff(maxAttempts, consecutiveConnectionFailures));
        globalBackoffUntil = Date.now() + coolDown;
      }

      if (attempt === maxAttempts) {
        console.error('[DB] Error ejecutando query después de reintentos:', {
          error: lastError.message,
          code: lastError.code || null,
          attempts: attempt,
          pool: getPoolStats(),
          connectionFailures: consecutiveConnectionFailures,
          queueSaturated: isDbBusy(),
          text: queryPreview
        });
      }

      throw lastError;
    }
  }

  throw lastError;
};

// Función para obtener un cliente del pool (para transacciones) con reintentos
export const getClient = async (retries = DEFAULT_RETRIES) => {
  cb.check();
  let lastError;
  const maxAttempts = Math.max(1, Number(retries ?? DEFAULT_RETRIES) || 0);
  const now = Date.now();

  if (globalBackoffUntil > now) {
    const waitLeft = globalBackoffUntil - now;
    const backoffError = new Error(`DB connection backoff active for ${waitLeft}ms`);
    backoffError.code = 'DB_BACKOFF_ACTIVE';
    throw backoffError;
  }
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const client = await pool.connect();
      cb.success();
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
      if (isConnectionError(error) && attempt < maxAttempts) {
        cb.failure();
        const waitTime = calculateBackoff(attempt, consecutiveConnectionFailures);
        console.warn(`⚠️ Error obteniendo cliente (intento ${attempt}/${maxAttempts}), reintentando en ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      if (attempt === maxAttempts) {
        console.error('Error obteniendo cliente después de reintentos:', {
          error: error.message,
          code: error.code || null,
          attempts: attempt,
          pool: getPoolStats(),
          connectionFailures: consecutiveConnectionFailures
        });
      }
      
      throw error;
    }
  }
  
  throw lastError;
};

export const getDatabaseDiagnostics = () => ({
  pool: getPoolStats(),
  breaker: {
    state: cb.state,
    openedAt: cb.openedAt || null,
    queueLimit: CB_QUEUE_LIMIT,
    failureThreshold: CB_FAILURE_THRESHOLD,
    recoveryMs: CB_RECOVERY_MS
  },
  connectionFailures: consecutiveConnectionFailures,
  backoffUntil: globalBackoffUntil || null,
  now: Date.now()
});

export default pool;
