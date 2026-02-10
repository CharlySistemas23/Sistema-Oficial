# Plan: Permisos bidireccionales y asignación por master_admin

Objetivo: que **master_admin** pueda asignar correctamente qué puede y no puede hacer cada usuario, con cambios **bidireccionales** (frontend ↔ backend) y sin eliminar usuarios.

---

## Rol de master_admin y cómo funciona

- **master_admin** ve **todas las sucursales**, puede cambiar de sucursal en el selector, navegar y ver/operar en cualquiera. Es el único perfil que no está limitado por sucursal.
- **master_admin es quien asigna** qué puede y no puede hacer **cada usuario**: entra a **Empleados → Usuarios** (o Configuración → Gestionar permisos), elige un usuario y le asigna rol y lista de permisos (ver inventario, editar, ver costos, etc.). Esa asignación es **por usuario** (por cada cuenta de login).
- **Usuarios normales** (vendedor, gerente, etc.) solo ven **su sucursal** (la del empleado al que está ligado su usuario). Lo que pueden *hacer* en esa sucursal lo definen su **rol** y los **permisos** que master_admin les haya asignado.
- **Opcional (Fase 3):** más adelante se puede añadir permisos **por sucursal** para que el mismo usuario tenga permisos distintos según la sucursal en la que esté (ej. en Vallarta puede editar inventario y en Malecón solo ver). Eso también lo asignaría master_admin.

Resumen: master_admin = ve todo y filtra por sucursal; asigna qué puede/no puede hacer cada usuario (y opcionalmente por sucursal). El plan no cambia ese comportamiento; solo persiste esas asignaciones en el backend para que sean bidireccionales.

---

## ✅ Hecho

- [x] **No eliminar usuarios:** Al borrar un empleado, solo se desvincula el usuario (no se elimina). Documentado en `PERMISOS_Y_EMPLEADOS_ANALISIS.md`.
- [x] **Confirmación al eliminar usuario:** Mensaje que recomienda desactivar (Inactivo) en lugar de eliminar.

---

## Fase 1 — Backend: persistir permisos (sin borrar usuarios)

| # | Tarea | Detalle |
|---|--------|--------|
| 1.1 | Añadir columna `permissions` en tabla `users` | Tipo `JSONB` (o `TEXT` con JSON). Valores por defecto `NULL` o `[]`. Migración **solo ADD COLUMN**, sin DELETE ni TRUNCATE. |
| 1.2 | Endpoint GET usuario(s) con permisos | Que el login / “me” y la lista de usuarios devuelvan `role` y `permissions`. Ej.: ajustar respuesta de login y añadir GET `/api/users` o GET `/api/employees` que incluya datos de usuario con `permissions`. |
| 1.3 | Endpoint PUT actualizar usuario | Ej.: PUT `/api/users/:id` o PUT `/api/employees/user/:id` que permita actualizar `role` y `permissions`. Solo master_admin. No debe eliminar usuarios. |
| 1.4 | Respuesta de login con permisos | En la ruta de login, al devolver el usuario, incluir `permissions` desde la columna nueva (si es `NULL`, devolver array vacío o permisos por defecto según rol). |

**Criterio de éxito Fase 1:** El backend guarda y devuelve `permissions` por usuario; no se ejecuta ningún DELETE de usuarios.

---

## Fase 2 — Frontend: usar la API (bidireccional)

| # | Tarea | Detalle |
|---|--------|--------|
| 2.1 | Cargar permisos al iniciar sesión | Tras login, guardar en `UserManager.currentUser` el campo `permissions` que venga del backend. Si el backend no envía permisos aún, seguir usando lógica actual (IndexedDB / rol). |
| 2.2 | Sincronizar usuarios con backend | Al abrir **Empleados → Usuarios** (y opcionalmente Configuración → Gestionar permisos), cargar lista de usuarios desde la API si existe (o seguir con IndexedDB y enviar permisos al backend al editar). |
| 2.3 | Guardar permisos en el backend al editar | En **Empleados → Usuarios** (y en **Configuración → Gestionar permisos**), al guardar cambios de un usuario, llamar PUT usuario con `role` y `permissions`. Actualizar también IndexedDB con la respuesta. |
| 2.4 | Crear usuario con permisos en backend | Al crear usuario (desde Empleados o desde backend), enviar `permissions` en el payload. Backend debe aceptar y persistir `permissions` en la nueva columna. |
| 2.5 | PermissionManager usa permisos del usuario actual | Que `hasPermission()` siga usando `UserManager.currentUser.permissions` (y rol); la fuente de verdad tras login debe ser la respuesta del backend cuando Fase 1 esté lista. |

**Criterio de éxito Fase 2:** Lo que master_admin asigna (rol/permisos) se guarda en el backend y se refleja al volver a cargar o en otra sesión/dispositivo.

---

## Fase 3 — (Opcional) Permisos por sucursal

| # | Tarea | Detalle |
|---|--------|--------|
| 3.1 | Modelo de permisos por sucursal | Decidir estructura: ej. tabla `user_branch_permissions (user_id, branch_id, permissions JSONB)` o campo en `users` tipo `permissions_by_branch JSONB`. Sin eliminar usuarios. |
| 3.2 | Backend: guardar y devolver permisos por sucursal | Endpoints que lean/escriban permisos por `user_id` y `branch_id`. Incluir en respuesta de login o “me” los permisos por sucursal (o solo de la sucursal actual). |
| 3.3 | Frontend: evaluar permiso en sucursal actual | En `PermissionManager.hasPermission(permiso)` (o helper) considerar la sucursal actual (`BranchManager.getCurrentBranchId()`) y que el permiso pueda ser distinto por sucursal. |
| 3.4 | UI para asignar permisos por sucursal | En la pantalla de edición de usuario, permitir elegir sucursal(es) y para cada una el conjunto de permisos (o reutilizar la misma lista de permisos por sucursal). |

**Criterio de éxito Fase 3:** Un usuario puede tener permisos distintos según la sucursal en la que esté trabajando.

---

## Fase 4 — (Opcional) Reorganización de la UI

| # | Tarea | Detalle |
|---|--------|--------|
| 4.1 | Unificar pantalla de asignación de permisos | Dejar un solo flujo claro para master_admin: ej. **Empleados → Usuarios → Editar usuario → Permisos**, y que **Configuración → Gestionar permisos** use el mismo flujo o redirija ahí. |
| 4.2 | Separar “Catálogos” de “Empleados y usuarios” (opcional) | Si se desea, mover pestañas Vendedores, Guías y Agencias a un módulo o sección “Catálogos” y dejar en Empleados solo Empleados y Usuarios. |

---

## Orden sugerido

1. **Fase 1** (backend): columna + endpoints + login con permisos.  
2. **Fase 2** (frontend): cargar y guardar permisos vía API en login y en Empleados/Configuración.  
3. Probar flujo completo: asignar permisos como master_admin, cerrar sesión, volver a entrar y en otro navegador; comprobar que no se eliminan usuarios.  
4. Si se desea, **Fase 3** (permisos por sucursal).  
5. Si se desea, **Fase 4** (reorganización UI).

---

## Reglas que no se tocan

- No ejecutar `DELETE FROM users` masivo ni migraciones que borren usuarios.
- Al eliminar un empleado, solo desvincular usuario (`employee_id = null`); no eliminar el usuario.
- Cualquier cambio en tabla `users` será aditivo (nuevas columnas, nuevos endpoints), sin eliminar datos de usuarios actuales.

---

## Compatibilidad con la estructura actual: ¿se romperá algo?

**Objetivo de esta sección:** dejar claro que el plan es **compatible con lo que ya tienes** y no rompe el sistema si se implementa como se indica.

### Cómo está hoy

| Parte | Comportamiento actual |
|-------|------------------------|
| **Backend tabla `users`** | Columnas: `id`, `username`, `password_hash`, `employee_id`, `role`, `active`, `last_login`, `created_at`, `updated_at`. **No existe columna `permissions`**. |
| **Backend login** | Devuelve `user`: `id`, `username`, `name`, `role`, `branchId`, `branchIds`, `isMasterAdmin`, `employeeId`. **No envía `permissions`**. |
| **Frontend `UserManager.currentUser`** | Se rellena con lo que devuelve el login (API) o con el usuario de IndexedDB (login local). Puede tener o no `permissions` (array). |
| **Frontend `PermissionManager.hasPermission()`** | 1) Si no hay usuario → `false`. 2) Si `role` es admin/master_admin o `permissions` incluye `'all'` → `true`. 3) Si `user.permissions` es un array y contiene el permiso → `true`. 4) **Si no hay permisos definidos, usa el perfil del rol:** `hasPermissionFromRole(user.role, permission)`. |
| **IndexedDB store `users`** | Los objetos pueden tener `permissions` (array). Se usa en login local y al editar en Empleados/Configuración. |

Conclusión: **hoy el sistema ya funciona cuando `user.permissions` no existe o está vacío**, porque `hasPermission()` tiene un fallback por rol. No depende de que el backend envíe permisos.

### Por qué el plan no rompe nada

1. **Backend: solo se añade**
   - **Migración:** solo `ALTER TABLE users ADD COLUMN permissions JSONB DEFAULT NULL` (o similar). No se borra ninguna fila ni columna. Usuarios actuales quedan con `permissions = NULL`.
   - **Login / verify:** se añade al JSON de respuesta el campo `permissions`. Si la columna es `NULL`, el backend puede devolver `permissions: []` o derivar permisos por defecto del rol. Las apps que no esperan ese campo lo ignoran; las que sí lo usan lo aprovechan.
   - **Nuevos endpoints (GET/PUT usuario):** son adicionales. Las rutas actuales (login, employees, etc.) siguen igual salvo por incluir `permissions` donde se decida.

2. **Frontend: compatible con “con y sin” permisos en backend**
   - Tras login por API: si la respuesta trae `permissions`, se guarda en `currentUser.permissions`; si no trae o viene vacío, `hasPermission()` sigue usando **solo el rol** (comportamiento actual). No hace falta cambiar la lógica de `hasPermission()` para que siga funcionando.
   - Al cargar/guardar usuarios en Empleados o Configuración: se puede hacer que “si hay API de usuarios, usar API; si no, solo IndexedDB”. Así el sistema sigue funcionando antes de tener backend de permisos y después también.

3. **IndexedDB**
   - No se cambia el esquema de stores. Se puede seguir guardando `permissions` en el objeto `user` en IndexedDB y usarlo como caché o en modo offline cuando el backend no esté disponible.

### Riesgos y cómo evitarlos

| Riesgo | Mitigación |
|--------|------------|
| Usuarios antiguos con `permissions = NULL` en BD | En backend, al leer usuario (login/verify/GET), si `permissions` es `NULL`, devolver `[]` o un array según el rol (ej. mismo que `ROLE_PROFILES`). Así el frontend siempre recibe un array y no hay errores. |
| Frontend espera `permissions` y el backend aún no lo envía | En el frontend, al asignar `currentUser` desde la respuesta del login, usar `permissions: result.user.permissions ?? []` o seguir con la lógica actual que ya usa el rol cuando no hay permisos. No asumir que `permissions` existe. |
| Migración en producción | Ejecutar la migración en ventana de mantenimiento si se quiere; al ser solo ADD COLUMN sin NOT NULL sin default obligatorio, es rápida y no bloquea lecturas. Opcional: default `'[]'::jsonb` para que ningún usuario quede con NULL. |
| Despliegue backend antes que frontend (o al revés) | Backend nuevo con columna y respuesta `permissions` sigue siendo válido para frontend viejo (ignora el campo). Frontend nuevo que use `permissions` si el backend no lo envía ya tiene fallback por rol; no rompe. |

### Resumen

- **No se elimina ni se cambia** la estructura actual de usuarios; solo se **añade** columna y campos en respuestas.
- **PermissionManager** ya está preparado para cuando no hay `permissions` (usa el rol). Con permisos en backend, se usan; sin ellos, se sigue usando el rol.
- Implementando el plan de forma **aditiva** (solo ADD, respetar NULL/vacío y fallback por rol), **el sistema no se rompe** y se puede desplegar por fases (primero backend, luego frontend, o al revés).

---

*Documento de plan para hacer realidad los permisos bidireccionales y la asignación por master_admin.*
