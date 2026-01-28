# 🚀 Backend API - Sistema POS Opal & Co

Backend centralizado en tiempo real para sistema POS multisucursal con PostgreSQL y WebSockets.

## 📋 Características

- ✅ API RESTful completa
- ✅ WebSockets para tiempo real (Socket.IO)
- ✅ Autenticación JWT
- ✅ Multi-sucursal con filtrado automático
- ✅ Integración con Cloudinary para imágenes
- ✅ Base de datos PostgreSQL
- ✅ Validación de datos
- ✅ Logging y auditoría
- ✅ Rate limiting
- ✅ CORS configurado

## 🛠️ Tecnologías

- **Node.js** 18+
- **Express.js** - Framework web
- **PostgreSQL** - Base de datos
- **Socket.IO** - WebSockets
- **JWT** - Autenticación
- **Cloudinary** - Gestión de imágenes
- **Multer** - Upload de archivos
- **Bcrypt** - Hash de contraseñas

## 📦 Instalación

### Requisitos Previos
- Node.js 18+
- PostgreSQL 12+
- Cuenta de Cloudinary (opcional)

### Instalación Local

```bash
# Clonar repositorio
git clone <repo-url>
cd backend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# Ejecutar migraciones
npm run migrate

# Iniciar servidor
npm run dev  # Desarrollo
npm start    # Producción
```

## 🔧 Configuración

### Variables de Entorno

Crea un archivo `.env` basado en `.env.example`:

```env
# Base de datos
DATABASE_URL=postgresql://user:password@localhost:5432/opal_pos_db

# Servidor
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=tu-secreto-super-seguro-aqui

# CORS
CORS_ORIGIN=*
SOCKET_IO_CORS_ORIGIN=*

# Cloudinary (opcional)
CLOUDINARY_CLOUD_NAME=tu-cloud-name
CLOUDINARY_API_KEY=tu-api-key
CLOUDINARY_API_SECRET=tu-api-secret
```

## 📚 Endpoints Principales

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrar usuario
- `GET /api/auth/verify` - Verificar token

### Inventario
- `GET /api/inventory` - Listar productos
- `GET /api/inventory/:id` - Obtener producto
- `POST /api/inventory` - Crear producto
- `PUT /api/inventory/:id` - Actualizar producto
- `DELETE /api/inventory/:id` - Eliminar producto

### Ventas
- `GET /api/sales` - Listar ventas
- `GET /api/sales/:id` - Obtener venta
- `POST /api/sales` - Crear venta
- `PUT /api/sales/:id` - Actualizar venta

### Upload
- `POST /api/upload/image` - Subir una imagen
- `POST /api/upload/images` - Subir múltiples imágenes
- `DELETE /api/upload/image/:publicId` - Eliminar imagen

### Dashboard
- `GET /api/dashboard/metrics` - Métricas del dashboard
- `GET /api/dashboard/analytics` - Análisis avanzados

Ver documentación completa en `GUIA_DESPLIEGUE_RAILWAY.md`

## 🔌 WebSockets

El servidor emite eventos en tiempo real:

- `inventory:updated` - Inventario actualizado
- `sale:created` - Nueva venta
- `sale:updated` - Venta actualizada
- `repair:created` - Nueva reparación
- `transfer:created` - Nueva transferencia

## 🗄️ Base de Datos

### Migración

```bash
npm run migrate
```

Esto ejecutará `database/schema.sql` y creará todas las tablas necesarias.

### Estructura Principal

- `branches` - Sucursales
- `users` - Usuarios del sistema
- `employees` - Empleados
- `inventory_items` - Productos
- `sales` - Ventas
- `sale_items` - Items de venta
- `customers` - Clientes
- `repairs` - Reparaciones
- `cash_sessions` - Sesiones de caja
- `inventory_transfers` - Transferencias

Ver `database/schema.sql` para la estructura completa.

## 🧪 Testing

### Prueba de Conexión

```bash
npm run test:connection
```

Esto verificará:
- Conexión a PostgreSQL
- Conexión a Cloudinary
- Estructura de base de datos
- Variables de entorno

### Health Check

```bash
curl http://localhost:3000/health
```

Deberías ver:
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T...",
  "uptime": 123.45
}
```

## 🚀 Despliegue en Railway

Ver `GUIA_DESPLIEGUE_RAILWAY.md` para instrucciones detalladas.

### Pasos Rápidos:

1. Conectar repositorio Git a Railway
2. Crear servicio PostgreSQL
3. Configurar variables de entorno
4. Conectar servicios
5. Ejecutar migraciones
6. Verificar despliegue

## 📝 Scripts Disponibles

- `npm start` - Iniciar servidor en producción
- `npm run dev` - Iniciar servidor en desarrollo (con nodemon)
- `npm run migrate` - Ejecutar migraciones de base de datos
- `npm run test:connection` - Probar conexiones

## 🔒 Seguridad

- Autenticación JWT requerida para todas las rutas protegidas
- Rate limiting configurado
- Validación de entrada en todos los endpoints
- CORS configurado
- Helmet para headers de seguridad
- Bcrypt para hash de contraseñas

## 📊 Monitoreo

### Logs

Los logs se muestran en la consola y en Railway (si está desplegado).

### Métricas

- Endpoint `/health` para verificación de estado
- Logs de auditoría en tabla `audit_logs`
- Logs de inventario en tabla `inventory_logs`

## 🐛 Solución de Problemas

Ver `GUIA_SOLUCION_PROBLEMAS.md` para problemas comunes y soluciones.

### Problemas Comunes

1. **Error de conexión a base de datos**
   - Verifica `DATABASE_URL`
   - Verifica que PostgreSQL esté corriendo

2. **Error de autenticación**
   - Verifica `JWT_SECRET`
   - Verifica que el token sea válido

3. **Error al subir imágenes**
   - Verifica configuración de Cloudinary
   - Verifica tamaño de archivo (máx 5MB)

## 📚 Documentación Adicional

- `GUIA_CONFIGURACION_INICIAL.md` - Guía de configuración completa
- `GUIA_DESPLIEGUE_RAILWAY.md` - Guía de despliegue
- `GUIA_SOLUCION_PROBLEMAS.md` - Solución de problemas
- `MIGRACION_FRONTEND.md` - Migración del frontend

## 👥 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📄 Licencia

ISC

## 🆘 Soporte

Para soporte, consulta la documentación o abre un issue en el repositorio.

---

**Última actualización**: 2024-01-15
