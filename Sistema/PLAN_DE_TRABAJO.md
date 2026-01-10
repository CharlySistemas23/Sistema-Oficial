# 📋 Plan de Trabajo - Migración a Backend en Tiempo Real

## 🎯 Objetivo
Completar la migración del sistema POS de IndexedDB local a backend centralizado en Railway con sincronización en tiempo real.

---

## 📊 Fase 1: Completar Backend API (Prioridad ALTA)

### 1.1 Rutas de Catálogos ⚠️ CRÍTICO
**Tiempo estimado:** 2 horas

**Archivo:** `backend/routes/catalogs.js`

**Endpoints a crear:**
- `GET /api/catalogs/agencies` - Listar agencias
- `GET /api/catalogs/agencies/:id` - Obtener agencia
- `POST /api/catalogs/agencies` - Crear agencia
- `PUT /api/catalogs/agencies/:id` - Actualizar agencia
- `DELETE /api/catalogs/agencies/:id` - Eliminar agencia

- `GET /api/catalogs/guides` - Listar guías (con filtro por agency_id)
- `GET /api/catalogs/guides/:id` - Obtener guía
- `POST /api/catalogs/guides` - Crear guía
- `PUT /api/catalogs/guides/:id` - Actualizar guía
- `DELETE /api/catalogs/guides/:id` - Eliminar guía

- `GET /api/catalogs/sellers` - Listar vendedores
- `GET /api/catalogs/sellers/:id` - Obtener vendedor
- `POST /api/catalogs/sellers` - Crear vendedor
- `PUT /api/catalogs/sellers/:id` - Actualizar vendedor
- `DELETE /api/catalogs/sellers/:id` - Eliminar vendedor

**Checklist:**
- [ ] Crear archivo `backend/routes/catalogs.js`
- [ ] Implementar CRUD para agencies
- [ ] Implementar CRUD para guides
- [ ] Implementar CRUD para sellers
- [ ] Agregar búsqueda por barcode
- [ ] Agregar ruta en `server.js`: `app.use('/api/catalogs', authenticateToken, catalogsRoutes)`
- [ ] Probar endpoints con Postman/curl

---

### 1.2 Rutas de Reparaciones
**Tiempo estimado:** 1.5 horas

**Archivo:** `backend/routes/repairs.js`

**Endpoints:**
- `GET /api/repairs` - Listar reparaciones (con filtros: status, branch_id, fecha)
- `GET /api/repairs/:id` - Obtener reparación completa (con fotos)
- `POST /api/repairs` - Crear reparación
- `PUT /api/repairs/:id` - Actualizar reparación
- `DELETE /api/repairs/:id` - Eliminar reparación
- `POST /api/repairs/:id/complete` - Completar reparación
- `POST /api/repairs/:id/photos` - Agregar foto a reparación

**Checklist:**
- [ ] Crear archivo `backend/routes/repairs.js`
- [ ] Implementar CRUD básico
- [ ] Implementar gestión de fotos (almacenar URLs o base64)
- [ ] Agregar filtros por status y fecha
- [ ] Agregar ruta en `server.js`
- [ ] Emitir eventos Socket.IO al crear/actualizar

---

### 1.3 Rutas de Caja (Cash Sessions)
**Tiempo estimado:** 2 horas

**Archivo:** `backend/routes/cash.js`

**Endpoints:**
- `GET /api/cash/sessions` - Listar sesiones de caja
- `GET /api/cash/sessions/:id` - Obtener sesión completa
- `GET /api/cash/sessions/current` - Obtener sesión actual abierta
- `POST /api/cash/sessions` - Abrir sesión de caja
- `PUT /api/cash/sessions/:id/close` - Cerrar sesión
- `GET /api/cash/sessions/:id/movements` - Obtener movimientos de una sesión
- `POST /api/cash/sessions/:id/movements` - Agregar movimiento (entrada/salida)

**Checklist:**
- [ ] Crear archivo `backend/routes/cash.js`
- [ ] Implementar apertura de sesión
- [ ] Implementar cierre de sesión con cálculo de diferencias
- [ ] Implementar movimientos de efectivo
- [ ] Validar que solo haya una sesión abierta por sucursal
- [ ] Agregar ruta en `server.js`

---

### 1.4 Rutas de Transferencias
**Tiempo estimado:** 2 horas

**Archivo:** `backend/routes/transfers.js`

**Endpoints:**
- `GET /api/transfers` - Listar transferencias (con filtros: from_branch, to_branch, status)
- `GET /api/transfers/:id` - Obtener transferencia completa (con items)
- `POST /api/transfers` - Crear transferencia
- `PUT /api/transfers/:id/approve` - Aprobar transferencia
- `PUT /api/transfers/:id/complete` - Completar transferencia (actualizar stock)
- `PUT /api/transfers/:id/cancel` - Cancelar transferencia
- `POST /api/transfers/:id/items` - Agregar item a transferencia

**Checklist:**
- [ ] Crear archivo `backend/routes/transfers.js`
- [ ] Implementar creación de transferencia
- [ ] Implementar aprobación (validar permisos)
- [ ] Implementar completado (actualizar stock en ambas sucursales)
- [ ] Validar que los items existan y tengan stock suficiente
- [ ] Agregar ruta en `server.js`
- [ ] Emitir eventos Socket.IO al completar transferencia

---

### 1.5 Rutas de Costos
**Tiempo estimado:** 1 hora

**Archivo:** `backend/routes/costs.js`

**Endpoints:**
- `GET /api/costs` - Listar costos (con filtros: branch_id, fecha, tipo)
- `GET /api/costs/:id` - Obtener costo
- `POST /api/costs` - Crear costo
- `PUT /api/costs/:id` - Actualizar costo
- `DELETE /api/costs/:id` - Eliminar costo
- `GET /api/costs/summary` - Resumen de costos por período

**Checklist:**
- [ ] Crear archivo `backend/routes/costs.js`
- [ ] Implementar CRUD básico
- [ ] Agregar filtros por fecha y tipo
- [ ] Implementar resumen de costos
- [ ] Agregar ruta en `server.js`

---

### 1.6 Rutas de Reportes Turísticos
**Tiempo estimado:** 1.5 horas

**Archivo:** `backend/routes/tourist.js`

**Endpoints:**
- `GET /api/tourist/reports` - Listar reportes diarios
- `GET /api/tourist/reports/:id` - Obtener reporte completo
- `POST /api/tourist/reports` - Crear reporte diario
- `GET /api/tourist/arrivals` - Listar llegadas
- `POST /api/tourist/arrivals` - Registrar llegada
- `GET /api/tourist/rules` - Obtener reglas de tarifas
- `POST /api/tourist/rules` - Crear regla de tarifa

**Checklist:**
- [ ] Crear archivo `backend/routes/tourist.js`
- [ ] Implementar reportes diarios
- [ ] Implementar registro de llegadas
- [ ] Implementar cálculo automático de tarifas
- [ ] Agregar ruta en `server.js`

---

### 1.7 Rutas de Tipos de Cambio
**Tiempo estimado:** 30 minutos

**Archivo:** `backend/routes/exchange_rates.js`

**Endpoints:**
- `GET /api/exchange-rates` - Listar tipos de cambio
- `GET /api/exchange-rates/today` - Obtener tipo de cambio de hoy
- `GET /api/exchange-rates/:date` - Obtener tipo de cambio de una fecha
- `POST /api/exchange-rates` - Crear/actualizar tipo de cambio

**Checklist:**
- [ ] Crear archivo `backend/routes/exchange_rates.js`
- [ ] Implementar CRUD básico
- [ ] Validar que solo haya un tipo de cambio por fecha
- [ ] Agregar ruta en `server.js`

---

### 1.8 Corregir Errores en Rutas Existentes
**Tiempo estimado:** 1 hora

**Archivos a corregir:**
- `backend/routes/dashboard.js` - Corregir query de métricas del día
- `backend/routes/sales.js` - Mejorar validación de stock y manejo de errores
- `backend/routes/inventory.js` - Validar que no se pueda eliminar item con ventas asociadas

**Checklist:**
- [ ] Corregir query de fecha en dashboard.js
- [ ] Agregar validación de stock antes de crear venta
- [ ] Mejorar manejo de errores en transacciones
- [ ] Agregar validaciones de integridad referencial

---

## 📱 Fase 2: Modificar Frontend - Integración con API (Prioridad ALTA)

### 2.1 Configurar HTML y Cargar Librerías
**Tiempo estimado:** 30 minutos

**Archivo:** `Sistema HTML/index.html`

**Cambios:**
- Agregar Socket.IO antes de `api.js`
- Agregar `api.js` después de `db.js`
- Mantener `db.js` para fallback offline

**Checklist:**
- [ ] Agregar `<script src="https://cdn.socket.io/4.6.1/socket.io.min.js"></script>`
- [ ] Agregar `<script src="js/api.js"></script>` después de `db.js`
- [ ] Verificar orden de carga de scripts

---

### 2.2 Modificar App.js - Inicialización
**Tiempo estimado:** 1 hora

**Archivo:** `Sistema HTML/js/app.js`

**Cambios:**
1. Inicializar API al inicio de `App.init()`
2. Modificar flujo de login para usar API
3. Mantener IndexedDB como fallback

**Checklist:**
- [ ] Agregar `await API.init()` después de `DB.init()`
- [ ] Modificar `initCompanyCodeAccess()` para verificar si hay API configurada
- [ ] Modificar login para usar `API.login()` en lugar de `UserManager.login()`
- [ ] Guardar token y usuario después de login exitoso
- [ ] Manejar errores de conexión (fallback a modo offline)

---

### 2.3 Modificar UserManager para usar API
**Tiempo estimado:** 1 hora

**Archivo:** `Sistema HTML/js/users.js`

**Cambios:**
- Modificar `login()` para usar API si está disponible
- Mantener login local como fallback
- Sincronizar datos de usuario después de login

**Checklist:**
- [ ] Verificar si API está configurada antes de login
- [ ] Usar `API.login()` si está disponible
- [ ] Guardar usuario y token en localStorage
- [ ] Mantener login local como fallback

---

### 2.4 Modificar POS.js - CRÍTICO
**Tiempo estimado:** 3 horas

**Archivo:** `Sistema HTML/js/pos.js`

**Cambios principales:**
1. `loadProducts()` - Usar `API.getInventoryItems()` en lugar de `DB.getAll()`
2. `loadCatalogs()` - Usar `API.get()` para agencies, guides, sellers
3. `completeSale()` - Usar `API.createSale()` en lugar de `DB.put()`
4. Escuchar eventos Socket.IO para actualizaciones en tiempo real

**Checklist:**
- [ ] Modificar `loadProducts()` para usar API
- [ ] Modificar `loadCatalogs()` para usar API
- [ ] Modificar `completeSale()` para usar API
- [ ] Agregar listener para `inventory-updated` (recargar productos)
- [ ] Agregar listener para `sale-updated` (mostrar notificación)
- [ ] Manejar errores de conexión (modo offline)
- [ ] Mantener funcionalidad de ventas pendientes (guardar en IndexedDB si falla API)

---

### 2.5 Modificar Inventory.js
**Tiempo estimado:** 2 horas

**Archivo:** `Sistema HTML/js/inventory.js`

**Cambios:**
- Reemplazar todas las operaciones `DB.*` por `API.*`
- Escuchar eventos Socket.IO para actualizaciones

**Checklist:**
- [ ] Modificar `loadInventory()` para usar `API.getInventoryItems()`
- [ ] Modificar `saveItem()` para usar `API.createInventoryItem()` o `API.updateInventoryItem()`
- [ ] Modificar `deleteItem()` para usar `API.deleteInventoryItem()`
- [ ] Agregar listener para `inventory-updated` (actualizar item en lista)
- [ ] Manejar errores y modo offline

---

### 2.6 Modificar Dashboard.js
**Tiempo estimado:** 1.5 horas

**Archivo:** `Sistema HTML/js/dashboard.js`

**Cambios:**
- Usar `API.getDashboardMetrics()` en lugar de consultas locales
- Agregar selector de sucursal para admin maestro
- Mostrar analíticas con filtros

**Checklist:**
- [ ] Modificar `loadDashboard()` para usar `API.getDashboardMetrics()`
- [ ] Agregar selector de sucursal si es admin maestro
- [ ] Implementar filtros por fecha y sucursal
- [ ] Mostrar analíticas avanzadas si es admin maestro (`API.getAnalytics()`)

---

### 2.7 Modificar Customers.js
**Tiempo estimado:** 1 hora

**Archivo:** `Sistema HTML/js/customers.js`

**Checklist:**
- [ ] Modificar `loadCustomers()` para usar `API.getCustomers()`
- [ ] Modificar `saveCustomer()` para usar `API.createCustomer()`
- [ ] Manejar errores

---

### 2.8 Modificar Repairs.js
**Tiempo estimado:** 1.5 horas

**Archivo:** `Sistema HTML/js/repairs.js`

**Checklist:**
- [ ] Modificar para usar API de reparaciones
- [ ] Implementar carga de fotos
- [ ] Escuchar eventos Socket.IO

---

### 2.9 Modificar Cash.js
**Tiempo estimado:** 1.5 horas

**Archivo:** `Sistema HTML/js/cash.js`

**Checklist:**
- [ ] Modificar para usar API de caja
- [ ] Implementar apertura/cierre de sesión con API
- [ ] Sincronizar movimientos

---

### 2.10 Modificar Transfers.js
**Tiempo estimado:** 1.5 horas

**Archivo:** `Sistema HTML/js/transfers.js`

**Checklist:**
- [ ] Modificar para usar API de transferencias
- [ ] Implementar aprobación de transferencias
- [ ] Escuchar eventos Socket.IO

---

### 2.11 Modificar Otros Módulos
**Tiempo estimado:** 2 horas

**Archivos:**
- `costs.js`
- `tourist_report.js`
- `exchange_rates.js`
- `reports.js`

**Checklist:**
- [ ] Modificar cada módulo para usar API correspondiente
- [ ] Mantener funcionalidad offline como fallback

---

## 🔧 Fase 3: Mejoras y Optimizaciones (Prioridad MEDIA)

### 3.1 Mejorar Cliente API
**Tiempo estimado:** 1 hora

**Archivo:** `Sistema HTML/js/api.js`

**Mejoras:**
- Mejor manejo de reconexión automática
- Cache de respuestas para reducir llamadas
- Retry automático en caso de error
- Queue de operaciones offline

**Checklist:**
- [ ] Implementar reconexión automática de Socket.IO
- [ ] Agregar cache simple para datos frecuentes
- [ ] Implementar retry con exponential backoff
- [ ] Crear queue para operaciones cuando está offline

---

### 3.2 Modo Offline/Híbrido
**Tiempo estimado:** 2 horas

**Estrategia:**
- Usar IndexedDB como caché local
- Sincronizar cuando vuelva la conexión
- Mostrar indicador de modo offline

**Checklist:**
- [ ] Detectar estado de conexión
- [ ] Guardar operaciones en cola cuando está offline
- [ ] Sincronizar cola cuando vuelve la conexión
- [ ] Mostrar indicador visual de modo offline
- [ ] Permitir trabajar offline con datos en caché

---

### 3.3 Optimizar Queries del Backend
**Tiempo estimado:** 1 hora

**Mejoras:**
- Agregar índices faltantes en PostgreSQL
- Optimizar queries lentas
- Agregar paginación donde sea necesario

**Checklist:**
- [ ] Revisar queries con EXPLAIN ANALYZE
- [ ] Agregar índices faltantes
- [ ] Implementar paginación en listados grandes
- [ ] Agregar límites en queries sin paginación

---

## 🧪 Fase 4: Testing y Validación (Prioridad ALTA)

### 4.1 Testing del Backend
**Tiempo estimado:** 3 horas

**Pruebas:**
- Probar todos los endpoints con Postman/curl
- Probar autenticación y autorización
- Probar filtros por sucursal
- Probar WebSockets

**Checklist:**
- [ ] Crear colección de Postman con todos los endpoints
- [ ] Probar login y verificación de token
- [ ] Probar CRUD de todas las entidades
- [ ] Probar filtros por sucursal (admin vs empleado)
- [ ] Probar WebSockets (conexión, eventos)
- [ ] Probar transacciones (ventas, transferencias)

---

### 4.2 Testing del Frontend
**Tiempo estimado:** 2 horas

**Pruebas:**
- Probar flujo completo de login
- Probar POS completo (crear venta)
- Probar inventario (CRUD)
- Probar dashboard con diferentes roles

**Checklist:**
- [ ] Probar login con diferentes usuarios
- [ ] Probar creación de venta en POS
- [ ] Probar CRUD de inventario
- [ ] Probar dashboard como admin maestro
- [ ] Probar dashboard como empleado
- [ ] Probar sincronización en tiempo real (2 navegadores)

---

### 4.3 Testing de Integración
**Tiempo estimado:** 2 horas

**Pruebas:**
- Probar flujo completo end-to-end
- Probar con múltiples sucursales
- Probar sincronización en tiempo real

**Checklist:**
- [ ] Crear sucursal, empleados, productos
- [ ] Crear venta en una sucursal
- [ ] Verificar que aparece en tiempo real en otra conexión
- [ ] Probar transferencia entre sucursales
- [ ] Probar que admin maestro ve todas las sucursales

---

## 🚀 Fase 5: Despliegue (Prioridad ALTA)

### 5.1 Preparar Backend para Railway
**Tiempo estimado:** 1 hora

**Checklist:**
- [ ] Verificar que todos los archivos estén en el repositorio
- [ ] Verificar `package.json` tiene script `start`
- [ ] Crear `.env.example` completo
- [ ] Verificar `railway.json` está configurado

---

### 5.2 Desplegar en Railway
**Tiempo estimado:** 1 hora

**Pasos:**
1. Crear proyecto en Railway
2. Agregar servicio PostgreSQL
3. Configurar variables de entorno
4. Ejecutar migraciones
5. Obtener URL pública

**Checklist:**
- [ ] Crear proyecto en Railway
- [ ] Agregar PostgreSQL
- [ ] Configurar todas las variables de entorno
- [ ] Ejecutar `npm run migrate`
- [ ] Verificar que `/health` funciona
- [ ] Obtener URL pública

---

### 5.3 Configurar Frontend
**Tiempo estimado:** 30 minutos

**Checklist:**
- [ ] Configurar URL del API en el sistema
- [ ] Probar login
- [ ] Verificar que funciona correctamente

---

## 📝 Fase 6: Documentación (Prioridad BAJA)

### 6.1 Documentar API
**Tiempo estimado:** 2 horas

**Checklist:**
- [ ] Documentar todos los endpoints
- [ ] Crear ejemplos de requests/responses
- [ ] Documentar autenticación
- [ ] Documentar WebSockets

---

### 6.2 Actualizar Guías de Usuario
**Tiempo estimado:** 1 hora

**Checklist:**
- [ ] Actualizar README principal
- [ ] Actualizar guía de migración
- [ ] Crear guía de troubleshooting

---

## 📊 Resumen de Tiempos

| Fase | Tiempo Estimado |
|------|----------------|
| Fase 1: Backend API | 12 horas |
| Fase 2: Frontend | 15 horas |
| Fase 3: Optimizaciones | 4 horas |
| Fase 4: Testing | 7 horas |
| Fase 5: Despliegue | 2.5 horas |
| Fase 6: Documentación | 3 horas |
| **TOTAL** | **~43.5 horas** |

---

## 🎯 Prioridades por Orden de Ejecución

### Semana 1: Backend Crítico
1. ✅ Rutas de Catálogos (CRÍTICO - necesario para POS)
2. ✅ Corregir errores en rutas existentes
3. ✅ Rutas de Reparaciones
4. ✅ Rutas de Caja

### Semana 2: Backend Completo + Frontend Crítico
5. ✅ Rutas de Transferencias
6. ✅ Rutas de Costos y Reportes Turísticos
7. ✅ Configurar HTML y cargar librerías
8. ✅ Modificar App.js y UserManager
9. ✅ Modificar POS.js (CRÍTICO)

### Semana 3: Frontend Completo
10. ✅ Modificar Inventory.js
11. ✅ Modificar Dashboard.js
12. ✅ Modificar Customers, Repairs, Cash, Transfers
13. ✅ Modificar otros módulos

### Semana 4: Testing y Despliegue
14. ✅ Testing completo
15. ✅ Desplegar en Railway
16. ✅ Configurar frontend

---

## ✅ Checklist General de Completitud

### Backend
- [ ] Todas las rutas creadas y funcionando
- [ ] Autenticación JWT funcionando
- [ ] WebSockets funcionando
- [ ] Filtros por sucursal funcionando
- [ ] Admin maestro puede ver todas las sucursales
- [ ] Base de datos migrada

### Frontend
- [ ] API cliente funcionando
- [ ] Socket.IO conectado
- [ ] Login usando API
- [ ] POS usando API
- [ ] Inventario usando API
- [ ] Dashboard usando API
- [ ] Todos los módulos migrados
- [ ] Modo offline funcionando

### Despliegue
- [ ] Backend desplegado en Railway
- [ ] Base de datos configurada
- [ ] Variables de entorno configuradas
- [ ] Frontend configurado con URL de Railway
- [ ] Sistema funcionando en producción

---

## 🚨 Puntos Críticos a Verificar

1. **Autenticación**: Token JWT debe funcionar correctamente
2. **WebSockets**: Conexión debe ser estable y reconectar automáticamente
3. **Filtros por Sucursal**: Admin maestro ve todo, empleados solo su sucursal
4. **Tiempo Real**: Cambios deben propagarse instantáneamente
5. **Modo Offline**: Sistema debe funcionar aunque el servidor esté caído

---

## 📞 Notas Importantes

- Mantener IndexedDB como fallback para modo offline
- Todos los cambios deben ser compatibles hacia atrás
- Probar cada módulo después de migrarlo
- Documentar cualquier cambio importante
- Hacer commits frecuentes con mensajes descriptivos

---

**Última actualización:** [Fecha]
**Estado:** En progreso
**Próximo paso:** Completar Fase 1.1 - Rutas de Catálogos
