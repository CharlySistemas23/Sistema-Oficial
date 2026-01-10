# 🚀 Funcionamiento del Sistema con Railway - Guía Completa

## 📋 Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (HTML/JS)                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Sistema HTML (Vercel/Netlify/Local)                 │  │
│  │  - index.html                                         │  │
│  │  - Módulos JS (POS, Inventory, Sales, etc.)          │  │
│  │  - IndexedDB (Caché Local + Modo Offline)           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↕ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────┐
│              BACKEND (Railway)                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Node.js/Express Server                              │  │
│  │  - API REST (RESTful endpoints)                      │  │
│  │  - WebSockets (Socket.IO - Tiempo Real)             │  │
│  │  - Autenticación JWT                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↕                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PostgreSQL Database (Railway)                        │  │
│  │  - Base de datos centralizada                        │  │
│  │  - Datos por sucursal (branch_id)                    │  │
│  │  - Master admin ve todo                              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↕ API
┌─────────────────────────────────────────────────────────────┐
│              Cloudinary (Opcional)                         │
│  - Almacenamiento de imágenes                               │
│  - Optimización automática                                  │
│  - URLs públicas para acceso rápido                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flujo de Funcionamiento Completo

### 1. Inicio del Sistema

#### Paso 1: Usuario Abre el Frontend
```
Usuario → Abre index.html en navegador
         ↓
Sistema carga módulos JS
         ↓
Inicializa IndexedDB (base de datos local)
         ↓
Carga configuración guardada localmente
```

#### Paso 2: Verificación de Conexión al Backend
```
Sistema verifica si hay URL del servidor configurada
         ↓
Si hay URL → Intenta conectar con Railway
         ↓
Si conecta → Modo ONLINE (sincronizado)
Si falla → Modo OFFLINE (solo local)
```

#### Paso 3: Autenticación
```
Usuario ingresa código de empresa
         ↓
Usuario ingresa username y PIN
         ↓
Frontend → POST /api/auth/login → Railway Backend
         ↓
Backend valida credenciales en PostgreSQL
         ↓
Backend genera JWT token
         ↓
Frontend guarda token y configuración de usuario
         ↓
Sistema inicializa según permisos del usuario
```

---

### 2. Operación Normal (Modo Online)

#### Ejemplo: Crear una Venta

```
Usuario completa venta en POS
         ↓
Frontend valida datos localmente
         ↓
Frontend → POST /api/sales → Railway Backend
         ↓
Backend valida:
  - Token JWT válido
  - Permisos del usuario
  - Stock disponible
  - Datos correctos
         ↓
Backend → PostgreSQL:
  - Inicia transacción
  - Crea registro en tabla 'sales'
  - Crea registros en 'sale_items'
  - Actualiza stock en 'inventory_items'
  - Crea registros en 'payments'
  - Confirma transacción
         ↓
Backend → WebSocket:
  - Emite evento 'sale:created' a todos los clientes conectados
         ↓
Backend → Respuesta HTTP 201 con datos de la venta
         ↓
Frontend recibe respuesta:
  - Guarda venta en IndexedDB (como caché)
  - Actualiza UI inmediatamente
  - Muestra notificación de éxito
         ↓
Otros usuarios conectados:
  - Reciben evento WebSocket
  - Actualizan su UI automáticamente
  - Sincronizan datos si es necesario
```

#### Ejemplo: Agregar Producto al Inventario

```
Usuario completa formulario de inventario
         ↓
Si hay fotos → Frontend sube a Cloudinary:
  - POST /api/upload/multiple → Railway Backend
  - Backend → Cloudinary API
  - Cloudinary optimiza y almacena imágenes
  - Backend recibe URLs de Cloudinary
         ↓
Frontend → POST /api/inventory → Railway Backend
  - Incluye URLs de Cloudinary en campo 'photos'
         ↓
Backend valida y guarda en PostgreSQL:
  - Crea registro en 'inventory_items'
  - Guarda URLs de fotos (no blobs)
         ↓
Backend → WebSocket:
  - Emite 'inventory:updated' a todos los clientes
         ↓
Frontend:
  - Guarda en IndexedDB como caché
  - Actualiza lista de productos
  - Otros usuarios ven el nuevo producto en tiempo real
```

---

### 3. Modo Offline

#### Cuando NO hay conexión a Railway:

```
Usuario realiza acción (ej: crear venta)
         ↓
Frontend detecta que API.baseURL no está disponible
         o
Frontend intenta llamar API pero falla
         ↓
Frontend guarda en IndexedDB con flag 'sync_status: pending'
         ↓
Frontend agrega a cola de sincronización (sync_queue)
         ↓
Sistema muestra notificación: "Guardado localmente, se sincronizará cuando haya conexión"
         ↓
Usuario puede seguir trabajando normalmente
         ↓
Cuando se restaura conexión:
  - SyncManager detecta conexión
  - Procesa cola de sincronización
  - Envía cada elemento pendiente al backend
  - Marca como sincronizado cuando tiene éxito
```

---

### 4. Sincronización Automática

#### Cómo Funciona SyncManager:

```javascript
// Cada 30 segundos (si hay elementos pendientes)
SyncManager verifica cola de sincronización
         ↓
Si hay elementos pendientes Y hay conexión:
  - Toma primer elemento de la cola
  - Identifica tipo de entidad (sale, inventory, cost, etc.)
  - Llama al endpoint correspondiente del backend
  - Si éxito → Marca como sincronizado
  - Si falla → Reintenta más tarde
         ↓
Cuando se completa sincronización:
  - Actualiza UI con estado de sincronización
  - Notifica al usuario si hay errores
```

#### Tipos de Sincronización:

1. **Sincronización Inmediata** (Modo Online):
   - Datos se guardan directamente en Railway
   - IndexedDB solo como caché
   - Actualización en tiempo real vía WebSockets

2. **Sincronización Diferida** (Modo Offline):
   - Datos se guardan en IndexedDB
   - Se agregan a cola de sincronización
   - Se sincronizan cuando hay conexión

3. **Sincronización Bidireccional**:
   - Cambios del servidor → Frontend (vía WebSockets)
   - Cambios del frontend → Servidor (vía API REST)

---

### 5. Multi-Sucursal

#### Cómo Funciona:

```
Usuario inicia sesión
         ↓
Backend valida usuario y obtiene:
  - branch_id asignado al usuario
  - isMasterAdmin (true/false)
         ↓
Si es Master Admin:
  - Puede ver TODOS los datos de TODAS las sucursales
  - Puede filtrar por sucursal en reportes
  - Puede cambiar de sucursal activa
         ↓
Si NO es Master Admin:
  - Solo ve datos de SU sucursal
  - Backend filtra automáticamente por branch_id
  - No puede cambiar de sucursal
         ↓
Todas las consultas al backend incluyen filtro automático:
  - SELECT * FROM sales WHERE branch_id = $1
  - (Solo Master Admin puede omitir este filtro)
```

#### Ejemplo de Filtrado Automático:

```sql
-- Usuario normal (branch_id = 'abc-123')
SELECT * FROM sales 
WHERE branch_id = 'abc-123'  -- Automático
AND status = 'completed';

-- Master Admin (puede ver todo)
SELECT * FROM sales 
WHERE status = 'completed';  -- Sin filtro de branch_id
```

---

### 6. Tiempo Real con WebSockets

#### Eventos que se Emiten en Tiempo Real:

```
1. Nueva Venta:
   Backend → 'sale:created' → Todos los clientes conectados
   Frontend recibe → Actualiza dashboard, reportes, etc.

2. Inventario Actualizado:
   Backend → 'inventory:updated' → Todos los clientes
   Frontend recibe → Actualiza lista de productos

3. Transferencia Creada:
   Backend → 'transfer:created' → Clientes de sucursales involucradas
   Frontend recibe → Notifica a usuarios relevantes

4. Reparación Completada:
   Backend → 'repair:completed' → Todos los clientes
   Frontend recibe → Actualiza estado de reparaciones

5. Caja Cerrada:
   Backend → 'cash:closed' → Clientes de la sucursal
   Frontend recibe → Actualiza estado de caja
```

#### Ventajas del Tiempo Real:

- ✅ Todos los usuarios ven cambios instantáneamente
- ✅ No necesitan refrescar la página
- ✅ Datos siempre actualizados
- ✅ Mejor experiencia de usuario

---

### 7. Gestión de Imágenes con Cloudinary

#### Flujo Completo:

```
Usuario selecciona imágenes en formulario
         ↓
Frontend → POST /api/upload/multiple → Railway Backend
  - Envía archivos como FormData
         ↓
Backend recibe con Multer:
  - Valida tipo de archivo
  - Valida tamaño
         ↓
Backend → Cloudinary API:
  - Sube imagen
  - Optimiza automáticamente (WebP)
  - Genera URL pública
         ↓
Backend guarda URL en PostgreSQL:
  - Campo 'photos' como array de URLs
  - Ejemplo: ['https://res.cloudinary.com/.../image1.webp', ...]
         ↓
Frontend recibe URLs:
  - Guarda URLs en IndexedDB (no blobs)
  - Muestra imágenes desde Cloudinary
         ↓
Ventajas:
  - Imágenes optimizadas automáticamente
  - Carga rápida desde CDN de Cloudinary
  - No ocupa espacio en PostgreSQL
  - Fácil de compartir entre usuarios
```

---

### 8. Estructura de Datos

#### PostgreSQL (Railway) - Fuente de Verdad:

```
Tablas Principales:
- branches (sucursales)
- users (usuarios del sistema)
- employees (empleados)
- inventory_items (productos)
- sales (ventas)
- sale_items (items de venta)
- customers (clientes)
- repairs (reparaciones)
- cost_entries (costos)
- cash_sessions (sesiones de caja)
- inventory_transfers (transferencias)
- tourist_reports (reportes turísticos)
- exchange_rates_daily (tipos de cambio)
- audit_logs (registro de auditoría)
```

#### IndexedDB (Frontend) - Caché Local:

```
Mismas tablas que PostgreSQL pero:
- Solo para caché y modo offline
- Se sincroniza automáticamente con servidor
- Se limpia periódicamente si está sincronizado
- Mantiene datos offline para trabajar sin internet
```

---

### 9. Escenarios de Uso

#### Escenario 1: Usuario Normal con Internet

```
1. Abre sistema → Conecta a Railway
2. Inicia sesión → Obtiene token JWT
3. Trabaja normalmente:
   - Todas las operaciones van directo a Railway
   - IndexedDB solo como caché
   - Recibe actualizaciones en tiempo real
   - Datos siempre sincronizados
```

#### Escenario 2: Usuario Normal sin Internet

```
1. Abre sistema → No conecta a Railway
2. Inicia sesión → Usa credenciales locales (si existen)
3. Trabaja offline:
   - Todas las operaciones se guardan en IndexedDB
   - Se marca como 'sync_status: pending'
   - Se agrega a cola de sincronización
4. Cuando recupera internet:
   - SyncManager sincroniza automáticamente
   - Datos se envían al servidor
   - Sistema vuelve a modo online
```

#### Escenario 3: Master Admin

```
1. Inicia sesión → Backend identifica como Master Admin
2. Puede ver:
   - Dashboard consolidado de todas las sucursales
   - Reportes con filtro por sucursal
   - Todas las ventas, inventarios, costos, etc.
3. Puede filtrar:
   - Por sucursal específica
   - Por rango de fechas
   - Por cualquier criterio
4. Ve datos en tiempo real de todas las sucursales
```

#### Escenario 4: Múltiples Usuarios en la Misma Sucursal

```
Usuario A crea una venta:
  → Se guarda en Railway
  → WebSocket emite 'sale:created'
  → Usuario B ve la venta inmediatamente
  → Usuario C también la ve
  → Dashboard se actualiza para todos

Usuario B actualiza inventario:
  → Se guarda en Railway
  → WebSocket emite 'inventory:updated'
  → Usuario A ve el cambio en tiempo real
  → Usuario C también lo ve
```

---

### 10. Seguridad y Autenticación

#### Flujo de Seguridad:

```
1. Autenticación:
   - Usuario ingresa username y PIN
   - PIN se hashea con SHA-256
   - Backend compara con hash guardado en PostgreSQL
   - Si coincide → Genera JWT token
   - Token expira después de X horas

2. Autorización:
   - Cada request incluye token en header:
     Authorization: Bearer <token>
   - Backend valida token
   - Backend verifica permisos del usuario
   - Backend filtra datos por branch_id (si no es Master Admin)

3. Auditoría:
   - Todas las acciones se registran en 'audit_logs'
   - Incluye: usuario, acción, entidad, timestamp
   - Master Admin puede ver todos los logs
```

---

### 11. Ventajas del Sistema con Railway

#### ✅ Ventajas:

1. **Centralización**:
   - Una sola base de datos para todas las sucursales
   - Datos siempre sincronizados
   - Backup centralizado

2. **Tiempo Real**:
   - Cambios instantáneos para todos los usuarios
   - Mejor colaboración entre sucursales

3. **Escalabilidad**:
   - Railway escala automáticamente
   - PostgreSQL maneja grandes volúmenes de datos
   - Cloudinary optimiza imágenes automáticamente

4. **Confiabilidad**:
   - Railway tiene alta disponibilidad
   - PostgreSQL con backups automáticos
   - Modo offline como respaldo

5. **Multi-Sucursal**:
   - Datos independientes por sucursal
   - Master Admin puede ver todo
   - Fácil agregar nuevas sucursales

6. **Mantenimiento**:
   - Un solo backend para mantener
   - Actualizaciones centralizadas
   - Logs centralizados

---

### 12. Despliegue y Configuración

#### Backend en Railway:

```
1. Crear proyecto en Railway
2. Conectar repositorio Git
3. Railway detecta automáticamente:
   - package.json
   - railway.json
   - Ejecuta migraciones automáticamente
4. Configurar variables de entorno:
   - DATABASE_URL (PostgreSQL de Railway)
   - JWT_SECRET
   - CLOUDINARY_* (si se usa Cloudinary)
   - CORS_ORIGIN
5. Railway despliega automáticamente
6. Obtener URL del backend (ej: https://tu-app.railway.app)
```

#### Frontend:

```
Opción A: Vercel/Netlify
  - Conectar repositorio Git
  - Configurar build (no necesario, es HTML estático)
  - Desplegar
  - Configurar URL del backend en settings del sistema

Opción B: Local
  - Abrir index.html directamente
  - Configurar URL del backend en settings
  - Funciona igual que versión desplegada

Opción C: Railway (Static Site)
  - Subir carpeta "Sistema HTML" a Railway
  - Configurar como sitio estático
  - Railway sirve los archivos HTML/JS/CSS
```

---

### 13. Migración de Datos Existentes

#### Si ya tienes datos en IndexedDB:

```
1. Ejecutar script de migración:
   node backend/scripts/migrate-from-indexeddb.js
         ↓
2. Script:
   - Lee datos de IndexedDB
   - Valida datos
   - Envía a Railway backend
   - Backend guarda en PostgreSQL
         ↓
3. Verificar migración:
   - Revisar logs del script
   - Verificar datos en PostgreSQL
   - Probar sistema con datos migrados
```

---

## 📊 Resumen del Flujo Completo

```
┌─────────────────────────────────────────────────────────┐
│ 1. INICIO                                              │
│    Usuario abre sistema → Verifica conexión           │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ 2. AUTENTICACIÓN                                       │
│    Login → Railway valida → Token JWT                 │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ 3. OPERACIÓN                                           │
│    Usuario realiza acción (venta, inventario, etc.)   │
└─────────────────────────────────────────────────────────┘
                    ↓
        ┌───────────┴───────────┐
        ↓                       ↓
┌───────────────┐      ┌───────────────┐
│  MODO ONLINE  │      │ MODO OFFLINE  │
│               │      │               │
│ API → Railway │      │ IndexedDB     │
│ PostgreSQL    │      │ sync_queue    │
│ WebSocket     │      │               │
└───────────────┘      └───────────────┘
        │                       │
        └───────────┬───────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ 4. SINCRONIZACIÓN                                      │
│    Datos en PostgreSQL (fuente de verdad)             │
│    IndexedDB como caché                                │
│    WebSockets para tiempo real                         │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ 5. RESULTADO                                           │
│    Todos los usuarios ven cambios en tiempo real       │
│    Datos siempre sincronizados                         │
│    Sistema funciona offline si es necesario             │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Puntos Clave

1. **Railway Backend** = Fuente de verdad (PostgreSQL)
2. **IndexedDB** = Caché local + Modo offline
3. **WebSockets** = Tiempo real entre usuarios
4. **Cloudinary** = Almacenamiento optimizado de imágenes
5. **Multi-Sucursal** = Datos independientes, Master Admin ve todo
6. **Sincronización** = Automática cuando hay conexión
7. **Modo Offline** = Funciona completamente sin internet

---

## ✅ El Sistema Está Listo

Con todas las integraciones completadas, el sistema funciona completamente con Railway:
- ✅ Backend centralizado en Railway
- ✅ Frontend puede estar en cualquier lugar
- ✅ Sincronización automática
- ✅ Tiempo real con WebSockets
- ✅ Modo offline funcional
- ✅ Multi-sucursal completo
- ✅ Cloudinary para imágenes
- ✅ Seguridad y autenticación

**¡Todo está listo para producción!** 🚀
