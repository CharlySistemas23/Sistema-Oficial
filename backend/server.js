import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Importar rutas
import authRoutes from './routes/auth.js';
import branchesRoutes from './routes/branches.js';
import employeesRoutes from './routes/employees.js';
import inventoryRoutes from './routes/inventory.js';
import salesRoutes from './routes/sales.js';
import customersRoutes from './routes/customers.js';
import reportsRoutes from './routes/reports.js';
import dashboardRoutes from './routes/dashboard.js';
import catalogsRoutes from './routes/catalogs.js';
import repairsRoutes from './routes/repairs.js';
import cashRoutes from './routes/cash.js';
import transfersRoutes from './routes/transfers.js';
import costsRoutes from './routes/costs.js';
import suppliersRoutes from './routes/suppliers.js';
import purchaseOrdersRoutes from './routes/purchase-orders.js';
import supplierPaymentsRoutes from './routes/supplier-payments.js';
import touristRoutes from './routes/tourist.js';
import exchangeRatesRoutes from './routes/exchange_rates.js';
import uploadRoutes from './routes/upload.js';

// Importar middleware
import { authenticateOptional } from './middleware/authOptional.js';
import { errorHandler } from './middleware/errorHandler.js';
import { query as dbQuery } from './config/database.js';

// Configurar dotenv
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Configurar trust proxy para Railway (confiar solo en el primer proxy, más seguro)
// Railway usa un solo proxy, así que 1 es suficiente y más seguro que true
app.set('trust proxy', 1);

// Función helper para determinar orígenes permitidos (debe estar antes de Socket.IO)
const getAllowedOrigins = () => {
  const raw = (process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN || '').split(',').map(o => o.trim()).filter(Boolean);
  return raw.length === 0 ? true : raw; // true = permitir todos, array = lista específica
};

// Configurar Socket.IO con la misma configuración CORS
const socketIOOrigins = getAllowedOrigins();
const io = new Server(httpServer, {
  cors: {
    origin: socketIOOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-username', 'x-branch-id']
  },
  transports: ['websocket', 'polling']
});

// Importar Socket.IO handlers (después de crear io)
import { setupSocketIO } from './socket/socketHandler.js';

// Hacer io disponible globalmente para las rutas
app.set('io', io);

// Middleware de seguridad
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Configurar CORS con manejo mejorado
const corsOptions = {
  origin: (origin, callback) => {
    const raw = (process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN || '').split(',').map(o => o.trim()).filter(Boolean);
    const allowAll = raw.length === 0 || raw.includes('*');
    
    // Permitir solicitudes sin origen (ej: Postman, curl, mobile apps)
    if (!origin) {
      return callback(null, true);
    }
    
    // Permitir todo si no hay configuración o si está explícitamente permitido con *
    if (allowAll) {
      return callback(null, true);
    }
    
    // Verificar si el origen está en la lista permitida
    if (raw.includes(origin)) {
      return callback(null, true);
    }
    
    // Rechazar si hay configuración explícita y el origen no está permitido
    console.warn(`⚠️ CORS: Origen rechazado: ${origin}. Permitidos: ${raw.join(', ')}`);
    callback(new Error(`CORS: Origen no permitido: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-username', 'x-branch-id'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
  preflightContinue: false
};

// Aplicar CORS middleware
app.use(cors(corsOptions));

// El middleware CORS ya maneja OPTIONS automáticamente, pero podemos agregar un handler explícito si es necesario
// Este handler solo se ejecutará si el middleware CORS no lo maneja
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting (después de trust proxy)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  // Aumentamos el límite para operaciones de sincronización masivas
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 5000,
  message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.',
  standardHeaders: true,
  legacyHeaders: false
});
// No aplicar rate limit a preflight OPTIONS para evitar bloquear CORS
// Excluir /api/auth/verify del rate limit (se usa frecuentemente para verificar tokens)
app.use('/api/', (req, res, next) => {
  if (req.method === 'OPTIONS') return next();
  if (req.path === '/auth/verify') return next(); // Sin rate limit para verify
  return limiter(req, res, next);
});

// Health check endpoint
app.get('/health', (req, res) => {
  // No exponer credenciales; solo mostrar host para debugging.
  let dbHost = null;
  try {
    if (process.env.DATABASE_URL) {
      dbHost = new URL(process.env.DATABASE_URL).host;
    }
  } catch (e) {
    dbHost = 'invalid_database_url';
  }
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    dbConfigured: !!process.env.DATABASE_URL,
    dbHost
  });
});

// Health check de BD: valida que Postgres responda (sin exponer datos).
// Usa 1 intento para responder rápido en diagnósticos.
app.get('/health/db', async (req, res) => {
  try {
    const result = await dbQuery('SELECT 1 as ok', [], 1);
    res.json({
      status: 'OK',
      db: 'OK',
      result: result?.rows?.[0] || { ok: 1 },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Health DB falló:', error?.message || error);
    res.status(503).json({
      status: 'OK',
      db: 'ERROR',
      error: error?.message || 'db_error',
      code: error?.code,
      timestamp: new Date().toISOString()
    });
  }
});

// Rutas públicas
app.use('/api/auth', authRoutes);

// Rutas protegidas (autenticación opcional - funciona con o sin token)
// Usa authenticateOptional que acepta token O username+branch_id
app.use('/api/branches', authenticateOptional, branchesRoutes);
app.use('/api/employees', authenticateOptional, employeesRoutes);
app.use('/api/inventory', authenticateOptional, inventoryRoutes);
app.use('/api/sales', authenticateOptional, salesRoutes);
app.use('/api/customers', authenticateOptional, customersRoutes);
app.use('/api/reports', authenticateOptional, reportsRoutes);
app.use('/api/dashboard', authenticateOptional, dashboardRoutes);
app.use('/api/catalogs', authenticateOptional, catalogsRoutes);
app.use('/api/repairs', authenticateOptional, repairsRoutes);
app.use('/api/cash', authenticateOptional, cashRoutes);
app.use('/api/transfers', authenticateOptional, transfersRoutes);
app.use('/api/costs', authenticateOptional, costsRoutes);
app.use('/api/suppliers', authenticateOptional, suppliersRoutes);
app.use('/api/purchase-orders', authenticateOptional, purchaseOrdersRoutes);
app.use('/api/supplier-payments', authenticateOptional, supplierPaymentsRoutes);
app.use('/api/tourist', authenticateOptional, touristRoutes);
app.use('/api/exchange-rates', exchangeRatesRoutes); // Público, no requiere auth
app.use('/api/upload', authenticateOptional, uploadRoutes); // Autenticación opcional

// Configurar Socket.IO
setupSocketIO(io);

// Pasar io a las rutas que lo necesitan
import { setIO as setInventoryIO } from './routes/inventory.js';
import { setIO as setSalesIO } from './routes/sales.js';
import { setIO as setBranchesIO } from './routes/branches.js';
import { setIO as setRepairsIO } from './routes/repairs.js';
import { setIO as setCustomersIO } from './routes/customers.js';
import { setIO as setTransfersIO } from './routes/transfers.js';
import { setIO as setCostsIO } from './routes/costs.js';
import { setIO as setSuppliersIO } from './routes/suppliers.js';
setInventoryIO(io);
setSalesIO(io);
setBranchesIO(io);
setRepairsIO(io);
setCustomersIO(io);
setTransfersIO(io);
setCostsIO(io);
setSuppliersIO(io);

// Manejo de errores
app.use(errorHandler);

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

const PORT = process.env.PORT || 3000;

// Función para verificar si la base de datos necesita migración
async function checkAndMigrate() {
  if (process.env.SKIP_AUTO_MIGRATE === 'true') {
    console.log('⏭️  Auto-migración deshabilitada por SKIP_AUTO_MIGRATE');
    return;
  }

  try {
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // Verificar si existen las tablas principales (branches, quick_captures, suppliers)
    const checkTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('branches', 'quick_captures', 'archived_quick_capture_reports', 'historical_quick_capture_reports', 'suppliers')
      ORDER BY table_name;
    `);
    
    const existingTables = checkTables.rows.map(r => r.table_name);
    const requiredTables = ['branches', 'quick_captures', 'archived_quick_capture_reports', 'historical_quick_capture_reports', 'suppliers'];
    const missingTables = requiredTables.filter(t => !existingTables.includes(t));
    
    // Si falta alguna tabla importante, crear directamente primero (más confiable)
    if (missingTables.length > 0) {
      console.log(`🔄 Faltan tablas en la base de datos: ${missingTables.join(', ')}`);
      console.log('🔄 Creando tablas faltantes directamente...');
      
      try {
        // Crear tablas faltantes directamente (más confiable que ejecutar todo el schema)
        for (const tableName of missingTables) {
          try {
          if (tableName === 'quick_captures') {
            console.log('🔨 Creando tabla quick_captures...');
            
            // Verificar si la tabla ya existe (por si acaso)
            const tableExists = await pool.query(`
              SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'quick_captures'
              );
            `);
            
            if (tableExists.rows[0].exists) {
              console.log('ℹ️  Tabla quick_captures ya existe, saltando creación');
              continue;
            }
            
            // Crear tabla primero
            await pool.query(`
              CREATE TABLE quick_captures (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
                seller_id UUID REFERENCES catalog_sellers(id) ON DELETE SET NULL,
                guide_id UUID REFERENCES catalog_guides(id) ON DELETE SET NULL,
                agency_id UUID REFERENCES catalog_agencies(id) ON DELETE SET NULL,
                product VARCHAR(255) NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 1,
                currency VARCHAR(3) NOT NULL DEFAULT 'MXN',
                total DECIMAL(12, 2) NOT NULL DEFAULT 0,
                merchandise_cost DECIMAL(12, 2) DEFAULT 0,
                notes TEXT,
                is_street BOOLEAN DEFAULT false,
                payment_method VARCHAR(50),
                payments JSONB,
                date DATE NOT NULL,
                original_report_date DATE,
                created_by UUID REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                sync_status VARCHAR(50) DEFAULT 'synced'
              );
            `);
            console.log('✅ Tabla quick_captures creada');
            
            // Crear índices por separado para mejor manejo de errores
            const indexes = [
              'CREATE INDEX idx_quick_captures_date ON quick_captures(date)',
              'CREATE INDEX idx_quick_captures_branch_id ON quick_captures(branch_id)',
              'CREATE INDEX idx_quick_captures_seller_id ON quick_captures(seller_id)',
              'CREATE INDEX idx_quick_captures_guide_id ON quick_captures(guide_id)',
              'CREATE INDEX idx_quick_captures_agency_id ON quick_captures(agency_id)',
              'CREATE INDEX idx_quick_captures_created_at ON quick_captures(created_at)',
              'CREATE INDEX idx_quick_captures_original_report_date ON quick_captures(original_report_date)'
            ];
            
            for (const indexSQL of indexes) {
              try {
                await pool.query(indexSQL);
              } catch (idxError) {
                // Si el índice ya existe, no es un error crítico
                if (idxError.code === '42P07' || idxError.message.includes('already exists')) {
                  console.log(`ℹ️  Índice ya existe, saltando: ${indexSQL.substring(0, 50)}...`);
                } else {
                  console.warn(`⚠️  Error creando índice: ${idxError.message}`);
                }
              }
            }
            
            // Crear trigger para updated_at
            try {
              // Verificar si la función existe
              const functionExists = await pool.query(`
                SELECT EXISTS (
                  SELECT FROM pg_proc 
                  WHERE proname = 'update_updated_at_column'
                );
              `);
              
              if (!functionExists.rows[0].exists) {
                await pool.query(`
                  CREATE OR REPLACE FUNCTION update_updated_at_column()
                  RETURNS TRIGGER AS $$
                  BEGIN
                      NEW.updated_at = CURRENT_TIMESTAMP;
                      RETURN NEW;
                  END;
                  $$ language 'plpgsql';
                `);
                console.log('✅ Función update_updated_at_column creada');
              }
              
              await pool.query(`
                DROP TRIGGER IF EXISTS update_quick_captures_updated_at ON quick_captures;
                CREATE TRIGGER update_quick_captures_updated_at BEFORE UPDATE ON quick_captures
                    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
              `);
              console.log('✅ Trigger update_quick_captures_updated_at creado');
            } catch (triggerError) {
              console.warn(`⚠️  Error creando trigger (no crítico): ${triggerError.message}`);
            }
            
            console.log('✅ Tabla quick_captures, índices y trigger creados correctamente');
          } else if (tableName === 'archived_quick_capture_reports') {
                await pool.query(`
                  CREATE TABLE IF NOT EXISTS archived_quick_capture_reports (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    report_date DATE NOT NULL,
                    period_type VARCHAR(50) DEFAULT 'daily',
                    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
                    branch_ids UUID[],
                    total_days INTEGER DEFAULT 1,
                    total_captures INTEGER DEFAULT 0,
                    total_quantity INTEGER DEFAULT 0,
                    total_sales_mxn DECIMAL(12, 2) DEFAULT 0,
                    total_cogs DECIMAL(12, 2) DEFAULT 0,
                    total_commissions DECIMAL(12, 2) DEFAULT 0,
                    total_arrival_costs DECIMAL(12, 2) DEFAULT 0,
                    total_operating_costs DECIMAL(12, 2) DEFAULT 0,
                    variable_costs_daily DECIMAL(12, 2) DEFAULT 0,
                    fixed_costs_prorated DECIMAL(12, 2) DEFAULT 0,
                    bank_commissions DECIMAL(12, 2) DEFAULT 0,
                    gross_profit DECIMAL(12, 2) DEFAULT 0,
                    net_profit DECIMAL(12, 2) DEFAULT 0,
                    exchange_rates JSONB,
                    metrics JSONB,
                    captures JSONB,
                    arrivals JSONB,
                    seller_commissions JSONB,
                    guide_commissions JSONB,
                    archived_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    archived_by UUID REFERENCES users(id) ON DELETE SET NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                  );
                  CREATE INDEX IF NOT EXISTS idx_archived_qc_reports_date ON archived_quick_capture_reports(report_date);
                  CREATE INDEX IF NOT EXISTS idx_archived_qc_reports_branch_id ON archived_quick_capture_reports(branch_id);
                `);
                console.log('✅ Tabla archived_quick_capture_reports creada directamente');
              } else if (tableName === 'historical_quick_capture_reports') {
                await pool.query(`
                  CREATE TABLE IF NOT EXISTS historical_quick_capture_reports (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    period_type VARCHAR(50) NOT NULL,
                    period_name VARCHAR(255) NOT NULL,
                    date_from DATE NOT NULL,
                    date_to DATE NOT NULL,
                    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
                    branch_ids UUID[],
                    total_days INTEGER DEFAULT 0,
                    total_captures INTEGER DEFAULT 0,
                    total_quantity INTEGER DEFAULT 0,
                    total_sales_mxn DECIMAL(12, 2) DEFAULT 0,
                    total_cogs DECIMAL(12, 2) DEFAULT 0,
                    total_commissions DECIMAL(12, 2) DEFAULT 0,
                    total_arrival_costs DECIMAL(12, 2) DEFAULT 0,
                    total_operating_costs DECIMAL(12, 2) DEFAULT 0,
                    variable_costs_daily DECIMAL(12, 2) DEFAULT 0,
                    fixed_costs_prorated DECIMAL(12, 2) DEFAULT 0,
                    bank_commissions DECIMAL(12, 2) DEFAULT 0,
                    gross_profit DECIMAL(12, 2) DEFAULT 0,
                    net_profit DECIMAL(12, 2) DEFAULT 0,
                    exchange_rates JSONB,
                    metrics JSONB,
                    daily_summary JSONB,
                    archived_report_ids UUID[],
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(period_type, date_from, date_to, branch_id)
                  );
                  CREATE INDEX IF NOT EXISTS idx_historical_qc_reports_period ON historical_quick_capture_reports(period_type, date_from, date_to);
                  CREATE INDEX IF NOT EXISTS idx_historical_qc_reports_branch_id ON historical_quick_capture_reports(branch_id);
                `);
                console.log('✅ Tabla historical_quick_capture_reports creada directamente');
              }
            } catch (tableError) {
              console.error(`❌ Error creando tabla ${tableName}:`, tableError.message);
              console.error('   Detalles:', tableError);
            }
          }
          
          // Verificar nuevamente que las tablas se crearon
          const finalCheck = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ANY($1::text[])
          `, [missingTables]);
          
          const finalExisting = finalCheck.rows.map(r => r.table_name);
          const finalMissing = missingTables.filter(t => !finalExisting.includes(t));
          
          // Si aún faltan tablas (como suppliers), ejecutar schema.sql completo
          if (finalMissing.length > 0) {
            console.log(`⚠️  Aún faltan tablas: ${finalMissing.join(', ')}`);
            console.log('🔄 Ejecutando schema.sql completo para crear tablas faltantes...');
            
            try {
              const { readFileSync } = await import('fs');
              const { join } = await import('path');
              const schemaPath = join(__dirname, 'database', 'schema.sql');
              const schemaSQL = readFileSync(schemaPath, 'utf8');
              
              // Ejecutar schema completo (usa IF NOT EXISTS, así que es seguro)
              await pool.query(schemaSQL);
              console.log(`✅ Schema ejecutado. Tablas faltantes deberían estar creadas: ${finalMissing.join(', ')}`);
              
              // Verificar una vez más
              const verifyCheck = await pool.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = ANY($1::text[])
              `, [finalMissing]);
              
              const verifyExisting = verifyCheck.rows.map(r => r.table_name);
              const stillMissing = finalMissing.filter(t => !verifyExisting.includes(t));
              
              if (stillMissing.length > 0) {
                console.error(`❌ Aún faltan tablas después de ejecutar schema: ${stillMissing.join(', ')}`);
                console.log('💡 Revisa los logs anteriores para ver los errores específicos');
              } else {
                console.log(`✅ Todas las tablas requeridas están presentes: ${requiredTables.join(', ')}`);
              }
            } catch (schemaError) {
              console.error('❌ Error ejecutando schema.sql:', schemaError.message);
              if (schemaError.code === '42P07' || schemaError.code === '42710' || 
                  schemaError.message.includes('already exists')) {
                console.log('⚠️  Algunos objetos ya existen, continuando...');
              } else {
                console.error('   Detalles:', schemaError);
              }
            }
          } else {
            console.log(`✅ Todas las tablas requeridas están presentes: ${requiredTables.join(', ')}`);
          }
      } catch (error) {
        console.error('❌ Error crítico en migración:', error.message);
        console.error('   Stack:', error.stack);
        // No lanzar error, permitir que el servidor inicie
        console.log('💡 El servidor continuará, pero algunas tablas pueden no estar disponibles');
      }
      
      // Crear usuario admin manualmente (solo si no existe)
      try {
        const adminCheck = await pool.query(`SELECT id FROM users WHERE username = 'master_admin' LIMIT 1`);
        
        if (adminCheck.rows.length === 0) {
          console.log('👤 Creando usuario admin maestro...');
          
          // Crear sucursal principal si no existe
          await pool.query(`
            INSERT INTO branches (id, name, code, address, phone, email, active)
            VALUES (
              '00000000-0000-0000-0000-000000000001',
              'Sucursal Principal',
              'MAIN',
              'Dirección principal',
              '1234567890',
              'admin@opalco.com',
              true
            )
            ON CONFLICT (id) DO NOTHING
          `);
          
          const branchResult = await pool.query(`SELECT id FROM branches WHERE code = 'MAIN' LIMIT 1`);
          if (!branchResult.rows || branchResult.rows.length === 0) {
            console.warn('⚠️  No se pudo encontrar la sucursal MAIN, continuando sin crear usuario admin');
            console.log('💡 Puedes crear el usuario admin manualmente con: npm run create-admin');
          } else {
            const branchId = branchResult.rows[0].id;
            
            // Crear empleado admin (master_admin NO debe tener branch_id para acceder a todas las sucursales)
            await pool.query(`
              INSERT INTO employees (id, code, name, role, branch_id, active)
              VALUES (
                '00000000-0000-0000-0000-000000000002',
                'ADMIN',
                'Administrador Maestro',
                'master_admin',
                NULL,
                true
              )
              ON CONFLICT (id) DO UPDATE SET
                role = 'master_admin',
                branch_id = NULL
            `);
            
            const employeeResult = await pool.query(`SELECT id FROM employees WHERE code = 'ADMIN' LIMIT 1`);
            if (!employeeResult.rows || employeeResult.rows.length === 0) {
              console.warn('⚠️  No se pudo encontrar el empleado ADMIN, continuando sin crear usuario admin');
              console.log('💡 Puedes crear el usuario admin manualmente con: npm run create-admin');
            } else {
              const employeeId = employeeResult.rows[0].id;
              
              // Crear usuario admin
              const bcrypt = await import('bcryptjs');
              const passwordHash = await bcrypt.default.hash('1234', 10);
              
              await pool.query(`
                INSERT INTO users (id, username, password_hash, employee_id, role, active)
                VALUES (
                  '00000000-0000-0000-0000-000000000001',
                  'master_admin',
                  $1,
                  $2,
                  'master_admin',
                  true
                )
                ON CONFLICT (id) DO NOTHING
              `, [passwordHash, employeeId]);
              
              console.log('✅ Usuario master_admin creado');
              console.log('📋 Credenciales: username=master_admin, PIN=1234');
            }
          }
        } else {
          console.log('✅ Usuario master_admin ya existe');
        }
      } catch (adminError) {
        console.warn('⚠️  Error creando usuario admin (no crítico):', adminError.message);
        console.log('💡 Puedes crear el usuario admin manualmente con: npm run create-admin');
        // No lanzar error, continuar con el servidor
      }
    } else {
      console.log('✅ Tablas principales presentes en la base de datos');
      
      // Verificar si faltan tablas específicas (como quick_captures) y crearlas
      if (missingTables.length > 0) {
        console.log(`⚠️  Faltan algunas tablas: ${missingTables.join(', ')}`);
        console.log('🔄 Ejecutando migración parcial para crear tablas faltantes...');
        
        const { readFileSync } = await import('fs');
        const { join } = await import('path');
        const schemaPath = join(__dirname, 'database', 'schema.sql');
        const schemaSQL = readFileSync(schemaPath, 'utf8');
        
        try {
          // Ejecutar schema completo (usa IF NOT EXISTS, así que es seguro)
          await pool.query(schemaSQL);
          console.log(`✅ Tablas faltantes creadas: ${missingTables.join(', ')}`);
        } catch (error) {
          if (error.code === '42P07' || error.code === '42710' || 
              error.message.includes('already exists')) {
            console.log('⚠️  Algunos objetos ya existen, continuando...');
          } else {
            console.error('❌ Error creando tablas faltantes:', error.message);
            // No lanzar error, continuar con el servidor
          }
        }
      }
      
      // Verificar si el usuario master_admin existe, si no, crearlo
      const adminCheck = await pool.query(`
        SELECT id FROM users WHERE username = 'master_admin' LIMIT 1
      `);
      
      if (adminCheck.rows.length === 0) {
        console.log('👤 Usuario master_admin no encontrado, creando...');
        
        // Verificar si existe la sucursal MAIN
        let branchResult = await pool.query(`SELECT id FROM branches WHERE code = 'MAIN' LIMIT 1`);
        let branchId;
        
        if (branchResult.rows.length === 0) {
          // Crear sucursal principal
          await pool.query(`
            INSERT INTO branches (id, name, code, address, phone, email, active)
            VALUES (
              '00000000-0000-0000-0000-000000000001',
              'Sucursal Principal',
              'MAIN',
              'Dirección principal',
              '1234567890',
              'admin@opalco.com',
              true
            )
            ON CONFLICT (id) DO NOTHING
          `);
          branchResult = await pool.query(`SELECT id FROM branches WHERE code = 'MAIN' LIMIT 1`);
        }
        
        branchId = branchResult.rows[0]?.id;
        if (!branchId) {
          // Si no hay sucursal MAIN, obtener la primera disponible
          const firstBranch = await pool.query(`SELECT id FROM branches WHERE active = true LIMIT 1`);
          branchId = firstBranch.rows[0]?.id;
        }
        
        // Verificar si existe el empleado ADMIN
        let employeeResult = await pool.query(`SELECT id FROM employees WHERE code = 'ADMIN' LIMIT 1`);
        let employeeId;
        
        if (employeeResult.rows.length === 0) {
          // Crear empleado admin (master_admin NO debe tener branch_id para acceder a todas las sucursales)
          await pool.query(`
            INSERT INTO employees (id, code, name, role, branch_id, active)
            VALUES (
              '00000000-0000-0000-0000-000000000002',
              'ADMIN',
              'Administrador Maestro',
              'master_admin',
              NULL,
              true
            )
            ON CONFLICT (id) DO UPDATE SET
              role = 'master_admin',
              branch_id = NULL
          `);
          employeeResult = await pool.query(`SELECT id FROM employees WHERE code = 'ADMIN' LIMIT 1`);
        } else {
          // Asegurar que el empleado master_admin tenga branch_id NULL
          await pool.query(`
            UPDATE employees 
            SET role = 'master_admin', branch_id = NULL 
            WHERE code = 'ADMIN' AND role = 'master_admin'
          `);
        }
        
        employeeId = employeeResult.rows[0]?.id || '00000000-0000-0000-0000-000000000002';
        
        // Crear usuario admin
        const bcrypt = await import('bcryptjs');
        const passwordHash = await bcrypt.default.hash('1234', 10);
        
        try {
          await pool.query(`
            INSERT INTO users (id, username, password_hash, employee_id, role, active)
            VALUES (
              '00000000-0000-0000-0000-000000000001',
              'master_admin',
              $1,
              $2,
              'master_admin',
              true
            )
            ON CONFLICT (id) DO UPDATE SET
              username = 'master_admin',
              password_hash = EXCLUDED.password_hash,
              employee_id = EXCLUDED.employee_id,
              role = 'master_admin',
              active = EXCLUDED.active
          `, [passwordHash, employeeId]);
          
          console.log('✅ Usuario master_admin creado/actualizado');
          console.log('📋 Credenciales: username=master_admin, PIN=1234');
        } catch (userError) {
          if (userError.code === '23505') {
            // Usuario ya existe (conflicto de username)
            console.log('⚠️  Usuario master_admin ya existe con otro ID');
            // Intentar actualizar el existente
            await pool.query(`
              UPDATE users 
              SET password_hash = $1, 
                  employee_id = $2, 
                  role = 'master_admin',
                  active = true,
                  username = 'master_admin'
              WHERE username = 'master_admin' OR id = '00000000-0000-0000-0000-000000000001'
            `, [passwordHash, employeeId]);
            console.log('✅ Usuario master_admin actualizado');
          } else {
            throw userError;
          }
        }
      } else {
        console.log('✅ Usuario master_admin ya existe');
      }
      
      // Verificar y agregar branch_id a customers si no existe
      const customersBranchCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'customers' 
          AND column_name = 'branch_id'
        );
      `);
      
      if (!customersBranchCheck.rows[0].exists) {
        console.log('🔄 Agregando branch_id a tabla customers...');
        try {
          await pool.query(`
            ALTER TABLE customers 
            ADD COLUMN branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
          `);
          await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_customers_branch_id ON customers(branch_id);
          `);
          console.log('✅ Columna branch_id agregada a customers');
        } catch (migrationError) {
          if (migrationError.code === '42701') {
            console.log('ℹ️  branch_id ya existe en customers');
          } else {
            console.error('⚠️  Error agregando branch_id a customers:', migrationError.message);
          }
        }
      }
      
      // Verificar y agregar columna daily_summary a archived_quick_capture_reports si no existe
      try {
        // Primero verificar que la tabla existe
        const tableExistsCheck = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'archived_quick_capture_reports'
          );
        `);
        
        if (tableExistsCheck.rows[0].exists) {
          const dailySummaryCheck = await pool.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'archived_quick_capture_reports' 
              AND column_name = 'daily_summary'
            );
          `);
          
          if (!dailySummaryCheck.rows[0].exists) {
            console.log('🔄 Agregando daily_summary a tabla archived_quick_capture_reports...');
            try {
              await pool.query(`
                ALTER TABLE archived_quick_capture_reports 
                ADD COLUMN daily_summary JSONB;
              `);
              console.log('✅ Columna daily_summary agregada a archived_quick_capture_reports');
            } catch (migrationError) {
              if (migrationError.code === '42701') {
                console.log('ℹ️  daily_summary ya existe en archived_quick_capture_reports');
              } else {
                console.error('⚠️  Error agregando daily_summary a archived_quick_capture_reports:', migrationError.message);
              }
            }
          }
        } else {
          console.log('ℹ️  Tabla archived_quick_capture_reports no existe aún, se creará con el schema completo');
        }
      } catch (dailySummaryError) {
        console.error('⚠️  Error verificando/agregando daily_summary:', dailySummaryError.message);
        // No bloquear el inicio del servidor si falla esta migración
      }
      
      // ========== MIGRACIÓN: Nuevas columnas para inventory_items ==========
      // Agregar columnas nuevas de forma segura (sin afectar datos existentes)
      const newInventoryColumns = [
        { name: 'subcategory', type: 'VARCHAR(100)' },
        { name: 'collection', type: 'VARCHAR(100)' },
        { name: 'material', type: 'VARCHAR(100)' },
        { name: 'purity', type: 'VARCHAR(50)' },
        { name: 'plating', type: 'VARCHAR(100)' },
        { name: 'stones', type: 'JSONB' },
        { name: 'measurements', type: 'JSONB' },
        { name: 'sale_price', type: 'DECIMAL(12, 2)' },
        { name: 'discount', type: 'DECIMAL(5, 2)' },
        { name: 'discount_amount', type: 'DECIMAL(12, 2)' },
        { name: 'currency', type: 'VARCHAR(3) DEFAULT \'MXN\'' },
        { name: 'margin_percent', type: 'DECIMAL(5, 2)' },
        { name: 'condition', type: 'VARCHAR(50)' },
        { name: 'location_detail', type: 'VARCHAR(100)' },
        { name: 'style', type: 'VARCHAR(100)' },
        { name: 'finish_type', type: 'VARCHAR(100)' },
        { name: 'theme', type: 'VARCHAR(100)' },
        { name: 'certificate_details', type: 'JSONB' },
        { name: 'supplier', type: 'VARCHAR(255)' },
        { name: 'supplier_code', type: 'VARCHAR(100)' },
        { name: 'notes', type: 'TEXT' }
      ];
      
      for (const column of newInventoryColumns) {
        try {
          const columnCheck = await pool.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'inventory_items' 
              AND column_name = $1
            );
          `, [column.name]);
          
          if (!columnCheck.rows[0].exists) {
            console.log(`🔄 Agregando columna ${column.name} a inventory_items...`);
            try {
              await pool.query(`
                ALTER TABLE inventory_items 
                ADD COLUMN ${column.name} ${column.type};
              `);
              console.log(`✅ Columna ${column.name} agregada a inventory_items`);
            } catch (migrationError) {
              if (migrationError.code === '42701') {
                console.log(`ℹ️  ${column.name} ya existe en inventory_items`);
              } else {
                console.error(`⚠️  Error agregando ${column.name} a inventory_items:`, migrationError.message);
              }
            }
          }
        } catch (error) {
          console.error(`⚠️  Error verificando columna ${column.name}:`, error.message);
          // Continuar con las demás columnas
        }
      }
      
      // Modificar columna price para permitir NULL (precio sugerido puede estar vacío)
      try {
        const priceNullCheck = await pool.query(`
          SELECT is_nullable 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'inventory_items' 
          AND column_name = 'price';
        `);
        
        if (priceNullCheck.rows.length > 0 && priceNullCheck.rows[0].is_nullable === 'NO') {
          console.log('🔄 Modificando columna price para permitir NULL...');
          try {
            await pool.query(`
              ALTER TABLE inventory_items 
              ALTER COLUMN price DROP NOT NULL;
            `);
            console.log('✅ Columna price ahora permite NULL');
          } catch (error) {
            console.error('⚠️  Error modificando columna price:', error.message);
          }
        }
      } catch (error) {
        console.error('⚠️  Error verificando columna price:', error.message);
      }
    }

    await pool.end();
  } catch (error) {
    console.error('⚠️  Error en auto-migración:', error.message);
    console.log('💡 Puedes ejecutar manualmente: npm run migrate && npm run create-admin');
  }
}

// Iniciar servidor después de verificar migración
async function startServer() {
  await checkAndMigrate();
  
  // Mostrar configuración CORS al iniciar
  const rawOrigins = (process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN || '').split(',').map(o => o.trim()).filter(Boolean);
  const corsInfo = rawOrigins.length === 0 
    ? '(vacío - permitir todo)' 
    : rawOrigins.join(', ');
  console.log(`🌍 CORS configurado - ALLOWED_ORIGINS: ${corsInfo}`);
  
  httpServer.listen(PORT, () => {
    console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
    console.log(`📡 Socket.IO habilitado para tiempo real`);
    console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer();

export { io };
