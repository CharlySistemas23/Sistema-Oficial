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
import touristRoutes from './routes/tourist.js';
import exchangeRatesRoutes from './routes/exchange_rates.js';
import uploadRoutes from './routes/upload.js';

// Importar middleware
import { authenticateToken } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';

// Configurar dotenv
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Configurar trust proxy para Railway (confiar solo en el primer proxy, más seguro)
// Railway usa un solo proxy, así que 1 es suficiente y más seguro que true
app.set('trust proxy', 1);

// Configurar Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.SOCKET_IO_CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Importar Socket.IO handlers (después de crear io)
import { setupSocketIO } from './socket/socketHandler.js';

// Middleware de seguridad
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting (después de trust proxy)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.',
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Rutas públicas
app.use('/api/auth', authRoutes);

// Rutas protegidas (requieren autenticación)
app.use('/api/branches', authenticateToken, branchesRoutes);
app.use('/api/employees', authenticateToken, employeesRoutes);
app.use('/api/inventory', authenticateToken, inventoryRoutes);
app.use('/api/sales', authenticateToken, salesRoutes);
app.use('/api/customers', authenticateToken, customersRoutes);
app.use('/api/reports', authenticateToken, reportsRoutes);
app.use('/api/dashboard', authenticateToken, dashboardRoutes);
app.use('/api/catalogs', authenticateToken, catalogsRoutes);
app.use('/api/repairs', authenticateToken, repairsRoutes);
app.use('/api/cash', authenticateToken, cashRoutes);
app.use('/api/transfers', authenticateToken, transfersRoutes);
app.use('/api/costs', authenticateToken, costsRoutes);
app.use('/api/tourist', authenticateToken, touristRoutes);
app.use('/api/exchange-rates', exchangeRatesRoutes); // Público, no requiere auth
app.use('/api/upload', authenticateToken, uploadRoutes); // Requiere auth

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
setInventoryIO(io);
setSalesIO(io);
setBranchesIO(io);
setRepairsIO(io);
setCustomersIO(io);
setTransfersIO(io);
setCostsIO(io);

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

    // Verificar si existe la tabla branches (primera tabla que se crea)
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'branches'
      );
    `);

    if (!result.rows[0].exists) {
      console.log('🔄 Base de datos vacía, ejecutando migración automática...');
      
      // Ejecutar migración: PostgreSQL puede ejecutar múltiples statements en una sola query
      const { readFileSync } = await import('fs');
      const { join } = await import('path');
      const schemaPath = join(__dirname, 'database', 'schema.sql');
      const schemaSQL = readFileSync(schemaPath, 'utf8');
      
      try {
        // Ejecutar todo el SQL de una vez (PostgreSQL lo maneja correctamente)
        await pool.query(schemaSQL);
        console.log('✅ Migración completada');
      } catch (error) {
        // Si hay errores de objetos existentes, no es crítico
        if (error.code === '42P07' || error.code === '42710' || 
            error.message.includes('already exists')) {
          console.log('⚠️  Algunos objetos ya existen, continuando...');
        } else {
          console.error('❌ Error en migración:', error.message);
          throw error;
        }
      }
      
      // Crear usuario admin manualmente
      console.log('👤 Creando usuario admin maestro...');
      
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
      
      const branchResult = await pool.query(`SELECT id FROM branches WHERE code = 'MAIN' LIMIT 1`);
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
    } else {
      console.log('✅ Base de datos ya migrada');
      
      // Verificar si el usuario admin existe, si no, crearlo
      const adminCheck = await pool.query(`
        SELECT id FROM users WHERE username = 'admin' LIMIT 1
      `);
      
      if (adminCheck.rows.length === 0) {
        console.log('👤 Usuario admin no encontrado, creando...');
        
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
              'admin',
              $1,
              $2,
              'master_admin',
              true
            )
            ON CONFLICT (id) DO UPDATE SET
              username = EXCLUDED.username,
              password_hash = EXCLUDED.password_hash,
              employee_id = EXCLUDED.employee_id,
              role = EXCLUDED.role,
              active = EXCLUDED.active
          `, [passwordHash, employeeId]);
          
          console.log('✅ Usuario admin creado/actualizado');
          console.log('📋 Credenciales: username=admin, PIN=1234');
        } catch (userError) {
          if (userError.code === '23505') {
            // Usuario ya existe (conflicto de username)
            console.log('⚠️  Usuario admin ya existe con otro ID');
            // Intentar actualizar el existente
            await pool.query(`
              UPDATE users 
              SET password_hash = $1, 
                  employee_id = $2, 
                  role = 'master_admin',
                  active = true
              WHERE username = 'admin'
            `, [passwordHash, employeeId]);
            console.log('✅ Usuario admin actualizado');
          } else {
            throw userError;
          }
        }
      } else {
        console.log('✅ Usuario admin ya existe');
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
  
  httpServer.listen(PORT, () => {
    console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
    console.log(`📡 Socket.IO habilitado para tiempo real`);
    console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer();

export { io };
