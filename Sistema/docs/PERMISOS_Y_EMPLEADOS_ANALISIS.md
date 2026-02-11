# Análisis: Permisos, master_admin y módulo Empleados (Vendedores, Guías, Agencias)

## Principio: No eliminar usuarios actuales

**Regla de negocio:** No se deben borrar los usuarios existentes. Cualquier cambio o mejora (permisos, multisucursal, backend) será **solo aditivo**:

- No se ejecutará `DELETE FROM users` masivo ni migraciones que borren usuarios.
- Al eliminar un **empleado** que tiene usuario asociado, el sistema **solo desvincula** el usuario (pone `employee_id = null`); el usuario sigue existiendo y puede volver a asignarse a otro empleado.
- La opción de "eliminar también el usuario" al borrar un empleado está desactivada: no se ofrece ni se elimina el usuario.

Así se preservan siempre los usuarios actuales.

---

## 1. Análisis de datos: ¿Qué son Empleados vs Vendedores/Guías/Agencias?

### Son cosas distintas

| Concepto | Tabla / Store | Uso en el sistema |
|----------|----------------|--------------------|
| **Empleados** | `employees` (backend + IndexedDB) | Personal de la empresa: tienen sucursal(es), rol (seller, admin, manager, cashier, master_admin) y pueden tener **usuario (login)**. |
| **Usuarios** | `users` (backend + IndexedDB) | Cuentas para iniciar sesión. Vinculados a un **empleado** (`employee_id`). Tienen `role`; en frontend también tienen array `permissions`. |
| **Vendedores** | `catalog_sellers` (backend + IndexedDB) | **Catálogo** usado en ventas (POS): “quién vendió” / vendedor externo. No son empleados ni usuarios. |
| **Guías** | `catalog_guides` (backend + IndexedDB) | **Catálogo** para ventas: guía turístico. Relacionado con agencia (`agency_id`). No son empleados. |
| **Agencias** | `catalog_agencies` (backend + IndexedDB) | **Catálogo** de agencias (ej. Tropical Adventure). Las guías pertenecen a una agencia. No son empleados. |

En el **módulo de Empleados** hay 5 pestañas:

1. **Empleados** → CRUD de `employees` (personal con sucursal y rol).
2. **Usuarios** → CRUD de `users` (login asociado a empleado; aquí se puede asignar rol y permisos en el formulario).
3. **Vendedores** → CRUD de `catalog_sellers` (catálogo para POS).
4. **Guías** → CRUD de `catalog_guides` (catálogo para POS).
5. **Agencias** → CRUD de `catalog_agencies` (catálogo para POS).

Conclusión: **Vendedores, Guías y Agencias en ese módulo son catálogos para ventas, no son “empleados” ni “usuarios”**. Tiene sentido que estén en el mismo módulo como sección de administración de catálogos, pero conceptualmente son distintos de “quién puede hacer qué en cada sucursal”.

---

## 2. Cómo funcionan hoy los permisos (“qué puede y no puede hacer” cada usuario)

### Dónde están definidos

- **Frontend:** `permission_manager.js`  
  - Lista de permisos por categoría (POS, inventario, clientes, empleados, reportes, costos, configuración, etc.).  
  - Perfiles por rol: `admin` (all), `manager`, `seller`, `cashier` con listas fijas de permisos.

### Dónde se guardan

- **IndexedDB (store `users`):** cada objeto `user` puede tener `user.permissions` (array de strings, ej. `['pos.view','inventory.edit']`).  
- **Backend (tabla `users`):** solo tiene `id, username, password_hash, employee_id, role, active, timestamps`. **No hay columna `permissions`**.  
- Por tanto: **los permisos detallados solo existen en el frontend (IndexedDB)**. El backend solo conoce el **rol** del usuario.

### Quién asigna permisos

- **Configuración → Gestionar permisos** (`settings.manage_permissions`): pantalla que lista usuarios y permite “Ver y editar permisos” por usuario (`Settings.editUserPermissions(userId)`). Se edita el array `permissions` y se guarda con `DB.put('users', user)`. Solo IndexedDB.  
- **Empleados → pestaña Usuarios:** al crear/editar usuario hay checkboxes de permisos; al guardar también se hace `DB.put('users', user)` con ese array. Solo IndexedDB.  
- En ambos casos se puede meter a la cola de sincronización (`SyncManager.addToQueue('user', ...)`), pero el backend **no tiene endpoint para actualizar permisos** (solo crea usuario con `role` y elimina usuario). Por tanto **no hay persistencia bidireccional de permisos con el servidor**.

### Relación con sucursales

- **Qué datos ve un usuario** (multisucursal): se resuelve por **empleado** → `employee.branch_id` / `employee.branch_ids` y por backend con `req.user.branchId` / `req.user.branchIds`. Eso ya está implementado (ej. inventario, empleados, dashboard).  
- **Qué puede hacer un usuario** (permisos): hoy es **global** por usuario. No hay “este usuario puede hacer X en sucursal A pero no en sucursal B”. Es un solo bloque de permisos por usuario (o por rol si no tiene `permissions` personalizados).

Resumen: **master_admin puede asignar qué puede y no puede hacer cada usuario solo en el frontend (IndexedDB y/o Configuración / Empleados → Usuarios). Esos cambios no están respaldados en backend y no son bidireccionales. Tampoco hay permisos por sucursal.**

---

## 3. Bidireccional y multisucursal hoy

- **Empleados:** sí hay sincronización bidireccional con el backend (crear/actualizar/eliminar empleado y filtrar por sucursal).  
- **Usuarios:** el backend puede crear usuario (POST `/api/employees/:employeeId/user`) y eliminar usuario; **no hay PUT de usuario** para actualizar rol ni permisos. Los permisos editados en frontend no se envían al servidor.  
- **Vendedores / Guías / Agencias:** se sincronizan con sus APIs de catálogos; no tienen concepto de “permisos” ni “sucursal” en el modelo actual.  
- **Multisucursal:** el “qué datos ve” ya es por sucursal (empleado + backend). El “qué puede hacer” (permisos) es global y solo en frontend.

---

## 4. Respuesta directa a tu pregunta

### Cómo reforzar o actualizar para que master_admin asigne bien qué puede y no puede hacer cada usuario en sus sucursales

1. **Persistir permisos en backend (bidireccional)**  
   - Añadir en backend una forma de guardar permisos por usuario (por ejemplo columna `permissions JSONB` en `users` o tabla `user_permissions`).  
   - Endpoint(s) para leer y actualizar permisos (ej. GET/PUT `/api/users/:id` o `/api/users/:id/permissions`).  
   - Al cargar sesión (login o “me”), el backend debe devolver `role` y `permissions`; el frontend debe usar eso para `UserManager.currentUser` y para `PermissionManager.hasPermission()`.  
   - Al editar permisos desde Configuración o desde Empleados → Usuarios, el frontend debe llamar al backend para guardar; y al cargar usuarios, debe traer permisos del servidor. Así los cambios serán **bidireccionales**.

2. **Opcional: permisos por sucursal (multisucursal en permisos)**  
   - Si quieres que “lo que puede hacer” dependa de la sucursal (ej. “puede editar inventario solo en sucursal A”), hace falta un modelo tipo `user_permissions` con `user_id`, `branch_id`, `permission` (o un JSON por usuario con permisos por branch_id).  
   - Frontend y backend tendrían que evaluar permiso en contexto “sucursal actual” o “sucursal del recurso”.  
   - Esto es una ampliación sobre lo actual; no es obligatorio para “asignar correctamente qué puede y no puede hacer”, pero sí para “por sucursal”.

3. **Un solo lugar claro para asignar permisos (master_admin)**  
   - Tiene sentido que **master_admin** asigne permisos en un solo flujo principal: por ejemplo **Empleados → Usuarios** (editar usuario → pestaña o sección “Permisos”) y/o **Configuración → Gestionar permisos**.  
   - Que ese flujo use siempre la API anterior (cuando exista) para guardar y cargar permisos, de modo que lo que se asigne se vea igual en todos los dispositivos/sesiones (bidireccional).

4. **Vendedores, Guías y Agencias**  
   - No son usuarios ni empleados; no tienen “permisos” en el sistema. Se pueden dejar como están (catálogos en el mismo módulo) o mover a una sección “Catálogos” si quieres separar conceptualmente “Empleados y usuarios” de “Catálogos de ventas”.

### Resumen

- **Hoy:** master_admin puede asignar permisos solo en frontend (Configuración y/o Empleados → Usuarios); no son bidireccionales con el backend ni por sucursal.  
- **Para reforzar/actualizar:**  
  - Persistir permisos en backend y sincronizar en ambos sentidos (carga y guardado desde el mismo flujo de asignación).  
  - Opcionalmente añadir permisos por sucursal si quieres que “qué puede hacer” varíe por sucursal.  
- **Vendedores / Guías / Agencias:** son catálogos; no forman parte del modelo de “quién puede hacer qué”; pueden seguir en el módulo como están o reorganizarse en “Catálogos”.

Cuando quieras, el siguiente paso puede ser: (1) diseño de la columna/tabla y endpoints de permisos en backend, y (2) cambios en frontend (Empleados/Configuración + PermissionManager) para usar esa API y que todo sea bidireccional y, si eliges, multisucursal en permisos.
