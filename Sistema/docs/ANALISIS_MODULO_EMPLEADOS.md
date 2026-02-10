# Análisis del Módulo de Empleados

## 1. Resumen general

El módulo de empleados es un **módulo multipestaña** que gestiona:

| Pestaña    | Entidad           | Store IndexedDB      | API Backend              |
|-----------|-------------------|-----------------------|--------------------------|
| Empleados | employees         | `employees`           | `GET/POST/PUT/DELETE /api/employees` |
| Usuarios  | users (login)     | `users`               | Creación usuario: `POST /api/employees/:id/user` |
| Vendedores| catalog_sellers   | `catalog_sellers`     | Catálogos (agencies/guides/sellers) |
| Guías     | catalog_guides    | `catalog_guides`      | Idem                     |
| Agencias  | catalog_agencies  | `catalog_agencies`    | Idem                     |

- **Frontend:** `Sistema/js/employees.js` (~3574 líneas). Objeto global `window.Employees`.
- **Backend:** `backend/routes/employees.js` (~226 líneas). Rutas montadas en `/api/employees` con `authenticateOptional`.
- **Carga:** En `app.js`, caso `'employees'` en `loadModule()`: se espera a `window.Employees`, se llama `Employees.init()` o se reconfigura UI y se llama `loadEmployees()` / `loadTab(currentTab)`.

---

## 2. Backend (`backend/routes/employees.js`)

### 2.1 Autenticación y autorización

- **Middleware:** `app.use('/api/employees', authenticateOptional, employeesRoutes)` en `server.js`.
- **GET /** (listar empleados): No usa `requireMasterAdmin`. Usa `req.user`:
  - **Master admin:** ve todos los empleados (`SELECT e.*, b.name as branch_name, u.id as user_id, u.username` sin filtro por sucursal).
  - **Resto:** solo empleados de sus sucursales: `WHERE e.branch_id = ANY($1) OR e.branch_id IS NULL`, con `$1 = req.user.branchIds`. Si `branchIds.length === 0` devuelve `[]`.

### 2.2 Endpoints

| Método | Ruta | Middleware | Descripción |
|--------|------|------------|-------------|
| GET | `/` | - | Lista empleados (filtro por sucursal según rol). |
| POST | `/` | requireMasterAdmin | Crear empleado. |
| PUT | `/:id` | requireMasterAdmin | Actualizar empleado; si cambia `role`, actualiza `users.role` del usuario asociado. |
| DELETE | `/:id` | requireMasterAdmin | Eliminar empleado. |
| POST | `/:employeeId/user` | requireMasterAdmin | Crear usuario (username, password, role) para un empleado. |
| DELETE | `/user/:userId` | requireMasterAdmin | Eliminar usuario (y opcional audit_log). |

### 2.3 Modelo de datos (empleados)

- Tabla `employees`: `id`, `code`, `barcode`, `name`, `email`, `phone`, `role`, `branch_id`, `branch_ids` (UUID[]), `active`, `created_at`, `updated_at`.
- `branch_id`: UUID FK a `branches(id)`.
- `branch_ids`: para roles con varias sucursales (manager/admin).

### 2.4 Posibles mejoras backend

- **Normalización de `branchIds`:** Si `req.user.branchIds` viene con strings con espacios, podría fallar `ANY($1)`. Conviene normalizar (trim) o castear a UUID en la query.
- **GET con `branch_id` en query:** Para master_admin se podría aceptar `?branch_id=...` y filtrar por esa sucursal (como en inventario), opcional.
- **Validación de body:** POST/PUT no validan campos requeridos (`name`, `code`, etc.) con express-validator; solo se confía en el frontend y en constraints de BD.

---

## 3. Frontend (`Sistema/js/employees.js`)

### 3.1 Inicialización y UI

- **init():** Llama `setupUI()`, `loadEmployees()`, y si existe `setupSocketListeners()` lo ejecuta. Marca `initialized = true` incluso si hay error para evitar bucles.
- **setupUI():**
  - Muestra `module-placeholder` y rellena `module-content` con:
    - Pestañas: Empleados, Usuarios, Vendedores, Guías, Agencias.
    - Contenedor `#employees-content`.
  - Asigna listeners a botones “Nuevo” y “Exportar” y a cada `.tab-btn` para cambiar `currentTab` y llamar `loadTab(tab)`.
  - La pestaña por defecto es `employees`; se llama `loadTab('employees')`.

### 3.2 Flujo de datos (pestaña Empleados)

1. **loadEmployees()**
   - Comprueba permiso `employees.view` (PermissionManager).
   - Obtiene `currentBranchId` (BranchManager) e `isMasterAdmin` (UserManager).
   - **Paso 1 (sync local → servidor):** Si hay API, busca empleados locales sin `server_id` o con id no UUID, filtra por sucursal si aplica, y los sube con `createEmployee`/`updateEmployee`; actualiza IndexedDB con los IDs del servidor.
   - **Paso 2 (servidor → local):** Llama `API.getEmployees({ branch_id: viewAllBranches ? null : currentBranchId })`. Guarda cada empleado en `employees` (IndexedDB). Si la API falla, usa solo IndexedDB con `filterByBranch` y `branchIdField: 'branch_id'`.
   - **Paso 3:** Deduplicación por clave `(employee_number|id)_(branch_id|'no-branch')`.
   - Filtro extra para no master: solo empleados con `branch_id === currentBranchId` o en `branch_ids`, o sin sucursal (compatibilidad).
   - Carga ventas (IndexedDB) y calcula por empleado: `salesCount`, `totalSales`, `avgSale`.
   - Llama `displayEmployeeStats(employeesWithStats)` y pinta la tabla en `#employees-content` (lista + búsqueda, filtros por estado/rol/sucursal, botones Nuevo/Exportar/Verificar).

2. **Filtros y tabla**
   - Búsqueda por nombre, rol, código de barras, nombre de sucursal.
   - Filtros: Todos / Activos / Inactivos, rol (seller, admin, manager), sucursal.
   - `filterEmployees(searchTerm, statusFilter, roleFilter, branchFilter)` actualiza las filas de la tabla sin recargar desde API/DB.

3. **Formulario de empleado (showAddEmployeeForm / saveEmployee)**
   - Campos: nombre, rol (seller, admin, manager, cashier, master_admin), sucursal (una o varias según rol), código de barras, activo.
   - Para master_admin/admin/manager se muestran checkboxes de sucursales; para el resto un select de una sucursal.
   - Al guardar: valida nombre y rol; determina `branch_id` y `branch_ids`; genera `code`/`barcode` si no existen; guarda en API (create/update) o en IndexedDB + SyncManager si no hay API.
   - Si es nuevo empleado, pregunta si se crea usuario (login); si acepta, llama `createUserForEmployee(savedEmployee)` (username desde nombre, PIN 1234, permisos según rol).

### 3.3 Usuarios (pestaña Usuarios)

- **loadUsers():** Carga `users` de IndexedDB y empleados (filtrados por sucursal si no es admin). Pinta tabla con username, empleado, rol, permisos, estado, acciones (editar, reset PIN, eliminar).
- **showAddUserForm / saveUser:** Formulario con username, empleado (select), rol, PIN, permisos (checkboxes), activo. Guarda en IndexedDB y en cola de sincronización. No hay llamada explícita a `POST /api/employees/:id/user` en este flujo; la creación de usuario desde empleado nuevo sí usa lógica local (DB + cola).
- **resetPin:** Actualiza `pin_hash` en el objeto user en IndexedDB (no hay endpoint de “reset PIN” en el backend mostrado; el backend tiene creación de usuario con password).

### 3.4 Vendedores, Guías, Agencias

- **loadSellers / loadGuides / loadAgencies:** Sincronización bidireccional con API de catálogos (get/create/update); datos en `catalog_sellers`, `catalog_guides`, `catalog_agencies`. Deduplicación por clave (p. ej. nombre o id). Luego se rellenan tablas con búsqueda/filtros y formularios de alta/edición.
- **Exportación:** Exportar a CSV/Excel/PDF según la pestaña activa (handleExportClick → exportEmployees, exportUsers, exportSellers, exportGuides, exportAgencies).

### 3.5 Permisos (PermissionManager)

Se usan, entre otros:

- `employees.view`, `employees.add`, `employees.edit`, `employees.delete`
- `employees.edit_users`, `employees.create_users`, `employees.reset_pin`

Los botones de editar/eliminar y la opción “Nuevo” se muestran u ocultan según estos permisos.

### 3.6 Sincronización y API

- **API (api.js):** Hay dos definiciones de empleados:
  - Una primera (aprox. línea 1174): `getEmployees()` sin parámetros.
  - Una segunda (aprox. línea 1927): `getEmployees(filters)`, `getEmployee(id)`, `createEmployee`, `updateEmployee`, `deleteEmployee` (con sanitización de UUID para id y branch_id). La segunda sobrescribe la primera, por lo que en la práctica el módulo usa `getEmployees(filters)`.
- El backend GET `/api/employees` **no usa** el query `branch_id`; usa solo `req.user.branchIds` e `isMasterAdmin`. Enviar `branch_id` en `filters` no cambia el resultado en el servidor; el filtrado por sucursal en backend es solo vía usuario autenticado.

### 3.7 Eventos en tiempo real

- **setupSocketListeners():** Escucha `employee-updated` y `user-updated`; si aplica (p. ej. empleado de la sucursal actual), llama a `loadEmployees()` de nuevo.

### 3.8 Eliminación de empleado

- **deleteEmployee(employeeId):** Comprueba ventas asociadas y usuario asociado. Puede eliminar también el usuario si el usuario confirma. Elimina de IndexedDB y añade a cola de sincronización (delete). No se ve llamada a `API.deleteEmployee` en el flujo leído; si existe, debería usarse cuando hay API para mantener consistencia con el backend.

---

## 4. Esquema de datos (resumen)

- **employees:** id (UUID), code, barcode, name, email, phone, role, branch_id, branch_ids, active, timestamps.
- **users:** id, username, password_hash, employee_id (FK employees), role, active (y en frontend: pin_hash, permissions para lógica local).
- **branches:** id (UUID), name, code, etc.
- Catálogos: `catalog_sellers`, `catalog_guides`, `catalog_agencies` (en IndexedDB y API de catálogos).

---

## 5. Coherencia multisucursal

- **Backend:** Master admin ve todos los empleados; el resto solo donde `e.branch_id = ANY(req.user.branchIds)` o `e.branch_id IS NULL`. Depende de que `authenticateOptional` rellene bien `req.user.branchIds` (y que isMasterAdmin use rol de empleado si aplica, ya corregido en auth).
- **Frontend:** Mismo criterio: `viewAllBranches = isMasterAdmin`, filtro por `currentBranchId` y por `branch_id`/`branch_ids` en listas y al cargar desde IndexedDB.
- **Riesgo:** Si en backend `branchIds` tiene strings con espacios o formato distinto, `ANY($1)` podría no emparejar. Recomendación: normalizar o castear a UUID en la query.

---

## 6. Puntos fuertes

- Módulo único para empleados, usuarios y catálogos (vendedores, guías, agencias).
- Sincronización bidireccional (local → servidor y servidor → local) para empleados y catálogos.
- Permisos integrados en botones y flujos.
- Filtros por sucursal y rol alineados con multisucursal.
- Exportación a CSV/Excel/PDF y estadísticas de ventas por empleado.
- Creación de usuario desde empleado nuevo con PIN por defecto y permisos por rol.

---

## 7. Recomendaciones

1. **Backend:** Normalizar `req.user.branchIds` (trim/UUID) antes de usarlos en `WHERE e.branch_id = ANY($1)`.
2. **Backend:** Opcionalmente aceptar `branch_id` en query para GET cuando el usuario es master_admin (filtrar por esa sucursal).
3. **Frontend:** Asegurar que al eliminar empleado se llame a `API.deleteEmployee(id)` cuando haya API disponible, además de IndexedDB y cola.
4. **Frontend:** Unificar en api.js una sola definición de `getEmployees` (con filtros) para evitar confusión; la segunda definición ya es la que se usa.
5. **Usuarios:** Si el “reset PIN” debe persistir en backend, añadir endpoint tipo `PUT /api/employees/user/:userId/pin` o similar y llamarlo desde el frontend; hoy el reset parece solo local (IndexedDB).
6. **Validación:** Añadir validación de body en POST/PUT de empleados en el backend (p. ej. express-validator) para `name`, `code`, `role`, etc.

---

*Documento generado a partir del análisis del código del módulo de empleados (frontend y backend).*
