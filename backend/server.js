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

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.'
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
setInventoryIO(io);
setSalesIO(io);

// Manejo de errores
app.use(errorHandler);

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
  console.log(`📡 Socket.IO habilitado para tiempo real`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
});

export { io };
