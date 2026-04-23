# ÁRBOL DEL SISTEMA — Mapa completo de módulos, datos y flujos

> Generado por auditoría 2026-04-23. Mantener actualizado al refactorizar.
> Este documento describe **qué hace cada módulo, qué toca, y cómo se conectan**.

---

## 1. INVENTARIO DE MÓDULOS (39 módulos JS)

Agrupados por capa funcional:

### 🔧 Capa infraestructura
| Módulo | Archivo | Responsabilidad |
|---|---|---|
| `App` | app.js | Bootstrap, enrutador de módulos, login de empresa, carga inicial |
| `API` | api.js | Cliente REST + WebSocket, auth token, ~120 métodos CRUD |
| `DB` | db.js | Wrapper IndexedDB, **48 stores**, versión 13 |
| `UI` | ui.js | Modales, notificaciones, overlays |
| `Utils` | utils.js | Helpers: formato, hashing, confirm, fechas, validaciones |
| `UserManager` | users.js | Sesión, permisos, login interno |
| `BranchManager` | branch_manager.js | Sucursal activa, switch de sucursal |
| `BranchValidator` | branch_validator.js | Validación de acceso por sucursal |
| `PermissionManager` | permission_manager.js | Check de permisos por rol/usuario |
| `SyncManager` | sync_manager.js | Cola de sync offline ↔ backend, 187 llamadas API |
| `SyncUI` | sync_ui.js | Panel visual de estado de sincronización |
| `BackupManager` | backup.js | Export/import de backups locales |
| `SystemAuditor` | system_auditor.js | Autodiagnóstico del sistema |
| `DataLoader` | data_loader.js | Carga diferida de datos |

### 🛍️ Capa ventas
| Módulo | Archivo | Responsabilidad |
|---|---|---|
| `Dashboard` | dashboard.js | KPIs del día, ventas por sucursal, métricas |
| `POS` | pos.js | Punto de venta — carrito, cobro, impresión |
| `Cash` | cash.js | Apertura/cierre de caja, movimientos, corte |
| `Printer` | printer.js | Impresión de tickets, formato, copias |
| `ExchangeRates` | exchange_rates.js | USD/MXN/EUR diario |
| `ProfitCalculator` | profit.js | Cálculo de utilidad por día/venta |

### 💎 Capa inventario
| Módulo | Archivo | Responsabilidad |
|---|---|---|
| `Inventory` | inventory.js | Piezas, SKU, stock, precio, certificados, fotos |
| `BarcodesModule` | barcodes_module.js | Gestión de códigos de barras (módulo) |
| `barcodes.js` | barcodes.js | Generación/impresión de etiquetas |
| `JewelryLabelEditor` | jewelry_label_editor.js | Editor visual de etiquetas |
| `Transfers` | transfers.js | Transferencias entre sucursales |

### 👥 Capa clientes
| Módulo | Archivo | Responsabilidad |
|---|---|---|
| `Customers` | customers.js | Clientes, historial de compras |
| `Repairs` | repairs.js | Reparaciones (alta, seguimiento, entrega) |
| `TouristReport` | tourist_report.js | Reporte de llegadas turísticas |
| `ArrivalRules` | arrival_rules.js | Reglas de tarifa por agencia/unidad |

### 🏢 Capa empresa
| Módulo | Archivo | Responsabilidad |
|---|---|---|
| `Employees` | employees.js | Empleados, roles, comisiones |
| `Branches` | branches.js | Sucursales — CRUD |
| `Suppliers` | suppliers.js | Proveedores |
| `SuppliersAdvanced` | suppliers-advanced.js | Pagos, facturas, contactos |
| `SuppliersIntegration` | suppliers-integration.js | Integración proveedor ↔ inventario |

### 📊 Capa análisis
| Módulo | Archivo | Responsabilidad |
|---|---|---|
| `Reports` | reports.js | Reportes estándar |
| `ReportsQuickCapture` | reports-quick-capture.js | **MONSTRUO 11K LÍNEAS**: captura rápida, archivado, histórico |
| `Costs` | costs.js | Gastos operativos, variables, fijos |

### ⚙️ Capa sistema
| Módulo | Archivo | Responsabilidad |
|---|---|---|
| `Settings` | settings.js | **7,510 líneas — toca 25 stores** |
| `SettingsAPI` | settings_api.js | Settings sincronizadas vía API |
| `QA` | qa.js | Pruebas internas (**NO debería estar en producción**) |

---

## 2. STORES DE INDEXEDDB (48 stores — quién escribe, quién lee)

Leyenda: **W** = escribe, **R** = lee

### Auth / sesión
| Store | Escritores | Lectores |
|---|---|---|
| `settings` | App, API, Backup, Settings, Sync, Utils | casi todos |
| `users` | App, Employees, UserManager, Settings, Sync | muchos |
| `employees` | App, Employees, Sync, Settings | Cash, Barcodes, Branches |
| `audit_log` | UserManager | Settings |
| `device` | — | — |

### Inventario
| Store | Escritores | Lectores |
|---|---|---|
| `inventory_items` | Inventory, Sync, POS | Barcodes, POS, Transfers, Reports, Customers, Printer, Profit, Suppliers |
| `inventory_photos` | Inventory, POS | QA, Utils |
| `inventory_logs` | Inventory, POS, Transfers | — |
| `inventory_certificates` | Inventory | — |
| `inventory_price_history` | Inventory | — |
| `inventory_transfers` | Transfers, Sync | BranchManager |
| `inventory_transfer_items` | Transfers, Sync | — |

### Ventas
| Store | Escritores | Lectores |
|---|---|---|
| `sales` | POS, Sync | Cash, Dashboard, Profit, Customers, Reports, Tourist, Settings, QA |
| `sale_items` | POS, Sync | Dashboard, Profit, Reports, Customers, Printer, Settings, QA |
| `payments` | POS, Sync | Cash, Dashboard, Profit, Printer, Settings, Tourist, QA |
| `payment_methods` | App | POS, Cash |
| `cash_sessions` | Cash, Sync | ReportsQuickCapture, Settings |
| `cash_movements` | Cash | ReportsQuickCapture, Settings |
| `commission_rules` | App, Employees, Sync | ReportsQuickCapture, Tourist, Utils |

### Clientes / reparaciones
| Store | Escritores | Lectores |
|---|---|---|
| `customers` | App, Customers, Sync | POS, Repairs, Reports, Costs, Settings |
| `repairs` | Repairs, Sync | Customers, Settings, QA |
| `repair_photos` | Repairs | QA |

### Llegadas turísticas
| Store | Escritores | Lectores |
|---|---|---|
| `tourist_reports` | TouristReport | Settings, QA |
| `tourist_report_lines` | TouristReport | Settings, QA |
| `agency_arrivals` | ArrivalRules, TouristReport, Sync | Cash, Costs, Reports, Profit, Dashboard, Settings, QA |
| `arrival_rate_rules` | App, ArrivalRules, Sync | Settings, QA |

### Catálogos
| Store | Escritores | Lectores |
|---|---|---|
| `catalog_agencies` | App, BarcodesModule, Sync | POS, Cash, Costs, Reports, Tourist, Arrival, QA, Barcodes, Printer |
| `catalog_guides` | App, Sync | POS, Costs, Barcodes, Reports, Tourist, Arrival, Printer, Settings |
| `catalog_sellers` | App, Sync | POS, Dashboard, Barcodes, Reports, Tourist, Printer, Settings |
| `catalog_branches` | API, Branches, BranchManager, Sync | **TODOS** |

### Costos / reportes
| Store | Escritores | Lectores |
|---|---|---|
| `cost_entries` | App, Costs, Sync | Inventory, Dashboard, Profit, Reports, Tourist, Suppliers, ReportsQuickCapture, Settings, QA |
| `budget_entries` | Costs | — |
| `daily_profit_reports` | Profit | Dashboard, Settings, QA |
| `exchange_rates_daily` | ExchangeRates | ReportsQuickCapture |
| `temp_quick_captures` | ReportsQuickCapture | — |
| `archived_quick_captures` | ReportsQuickCapture | Reports |
| `historical_reports` | ReportsQuickCapture | Reports |

### Proveedores
| Store | Escritores | Lectores |
|---|---|---|
| `suppliers` | App, Suppliers, Sync | Inventory, BarcodesModule, Dashboard, Costs, SuppliersAdvanced, SuppliersIntegration |
| `supplier_payments` | SuppliersAdvanced | — |
| `payment_invoices` | SuppliersAdvanced | — |

### Sincronización
| Store | Escritores | Lectores |
|---|---|---|
| `sync_queue` | Inventory, App, Arrival | Sync, QA, SystemAuditor |
| `sync_deleted_items` | Costs, Customers, Employees, Inventory, ReportsQuickCapture, Suppliers | Sync, SystemAuditor |
| `sync_logs` | — | SyncUI |

### Código de barras
| Store | Escritores | Lectores |
|---|---|---|
| `barcode_scan_history` | BarcodesModule | Settings |
| `barcode_print_templates` | BarcodesModule | — |

### QA (no debería existir en prod)
- `qa_test_runs`, `qa_coverage`, `qa_errors`, `qa_fixes`

**⚠️ Store duplicado:** `temp_quick_captures` se crea 2 veces en db.js (línea 320 y 380).
**⚠️ Store inexistente referenciado:** `employees.js` usa `branches` (store no existe; debería ser `catalog_branches`).
**⚠️ Store inexistente:** `qa.js` usa `arrival_rules` (store real es `arrival_rate_rules`).

---

## 3. GRAFO DE LLAMADAS ENTRE MÓDULOS

### Top 5 módulos más llamados (alto acoplamiento)
1. `Utils` — llamado por 38 archivos (OK, es utilidad)
2. `DB` — llamado por 39 archivos (OK, es datos)
3. `UserManager` — llamado por **28 archivos** (❌ demasiado acoplado, cada módulo verifica permisos a mano)
4. `API` — llamado por 30+ archivos
5. `BranchManager` — llamado por 22 archivos

### Dependencias por módulo (quién llama a quién)

```
pos.js  ─────────────────┐
  usa: POS(self) 53, Costs 5, UserManager 39, Printer 11,
       SyncManager 6, BranchManager 14, ExchangeRates 6,
       PermissionManager 3, UI 30, Utils 207, API 28, DB 163
  ─► muy acoplado con Utils (207) y DB (163)

reports-quick-capture.js ─┐
  usa: Reports 43, UserManager 58, SyncManager 7,
       BranchManager 14, ArrivalRules 8, ExchangeRates 1,
       ProfitCalculator 2, PermissionManager 4, Utils 140,
       API 89, DB 190
  ─► 11,136 líneas, 6 WebSocket listeners, 190 DB calls

settings.js ──────────────┐
  usa: Inventory, POS, Cash, Dashboard, Customers, Employees,
       Suppliers, Repairs, Costs, Printer, SyncManager,
       BranchManager, BackupManager, BranchValidator,
       ArrivalRules, ExchangeRates, PermissionManager,
       JewelryLabelEditor, SystemAuditor
  ─► Dios-objeto: tiene acceso a TODO

inventory.js
  usa: Inventory(self) 52, Costs 1, BarcodesModule 2,
       UserManager 15, SyncManager 8, BranchManager 5,
       PermissionManager 11, JewelryLabelEditor 6,
       UI 28, Utils 107, API 29, DB 96

cash.js
  usa: UserManager 7, SyncManager 3, BranchManager 6,
       ExchangeRates 2, ProfitCalculator 1, UI 14,
       Utils 119, API 11, DB 36

employees.js
  usa: Employees(self) 50, Costs 1, UserManager 32,
       SyncManager 13, BranchManager 7, PermissionManager 16,
       UI 22, Utils 141, API 63, DB 121

customers.js
  usa: Customers(self) 32, UserManager 19, SyncManager 3,
       BranchManager 5, PermissionManager 6, UI 24,
       Utils 43, API 15, DB 38

reports.js
  usa: Reports(self) 24, Costs 6, UserManager 119,
       BranchManager 30, PermissionManager 3, UI 5,
       Utils 277, API 24, DB 85

tourist_report.js
  usa: TouristReport(self) 15, UserManager 40,
       SyncManager 3, BranchManager 14, ArrivalRules 9,
       ProfitCalculator 2, UI 7, Utils 123, API 11, DB 87
```

### Ciclos detectables
- `app.js ↔ users.js`: App llama UserManager, UserManager llama App (21 veces).
- `branch_manager.js ↔ app.js`: ambos se llaman.
- `api.js → UserManager → api.js`: auth + sync.

---

## 4. ENDPOINTS REST (backend/routes)

| Archivo backend | Métodos expuestos |
|---|---|
| `auth.js` | POST `/login`, GET `/verify`, POST `/ensure-admin`, POST `/cleanup-users` |
| `branches.js` | GET `/`, GET `/:id`, POST `/`, PUT `/:id`, DELETE `/:id` |
| `inventory.js` | GET/POST/PUT/DELETE `/items`, photos, certificates, price history |
| `sales.js` | GET/POST/PUT/DELETE `/sales`, `/items`, `/payments` |
| `customers.js` | CRUD completo |
| `employees.js` | CRUD + user assignment |
| `repairs.js` | CRUD + photos + complete |
| `arrival-rules.js` | CRUD de reglas |
| `tourist.js` | Reportes turísticos + arrivals |
| `cash.js` | Sessions, movements, open/close |
| `catalogs.js` | Agencies, guides, sellers |
| `costs.js` | CRUD + summary |
| `dashboard.js` | Métricas agregadas |
| `exchange_rates.js` | Tipos de cambio diarios |
| `reports.js` | Quick capture, archived, historical |
| `suppliers.js` | CRUD + items + stats |
| `supplier-payments.js` | Pagos + recibos |
| `purchase-orders.js` | Órdenes de compra |
| `transfers.js` | Transferencias |
| `upload.js` | `/file`, `/image`, `/images` |
| `debug.js` | Endpoints internos |

**⚠️ Endpoint huérfano:** el backend tiene `purchase-orders.js` pero no hay módulo frontend que lo consuma.

---

## 5. EVENTOS DE WEBSOCKET (tiempo real)

### Eventos que el frontend ESCUCHA (`socket.on`)
| Evento | Suscriptor principal | Propagación |
|---|---|---|
| `connect` | api.js, sync_manager | Dispara re-sync |
| `disconnect` | api.js | Ofline banner |
| `inventory_updated` | api.js → Inventory | Actualiza tabla de piezas |
| `sale_updated` | api.js → POS/Dashboard | Refresca ventas |
| `repair_updated` | api.js → Repairs | Refresca reparaciones |
| `customer_updated` | api.js → Customers | Refresca clientes |
| `transfer_updated` | api.js → Transfers | Refresca transferencias |
| `cost_updated` | api.js → Costs | Refresca gastos |
| `supplier_updated` | api.js + suppliers.js | **Listener duplicado** |
| `employee_updated` | api.js → Employees | Refresca empleados |
| `user_updated` | api.js → UserManager | Revalida permisos |
| `cash_session_updated` | api.js → Cash | |
| `cash_movement_updated` | api.js → Cash | |
| `branch_updated` | api.js → Branches | |
| `quick_capture_created` | reports-quick-capture | |
| `quick_capture_updated` | reports-quick-capture | |
| `quick_capture_deleted` | reports-quick-capture | |
| `archived_report_created` | reports-quick-capture | |
| `archived_report_updated` | reports-quick-capture | |
| `historical_report_created` | reports-quick-capture | |
| `historical_report_deleted` | reports-quick-capture | |

### Eventos que el frontend EMITE (`socket.emit`)
- `subscribe_inventory` / `unsubscribe_inventory` (por branchId)
- `subscribe_sales` / `unsubscribe_sales`
- `join` (rooms: `branch:<id>`, `master_admin`, `user:<id>`)

**⚠️ Problema:** los listeners se registran en `api.js` pero también en `suppliers.js` y `reports-quick-capture.js`. Al navegar entre módulos, **se duplican handlers** → múltiples ejecuciones del mismo callback.

---

## 6. FLUJOS DE NEGOCIO COMPLETOS

Cada flujo describe un ciclo completo usuario→UI→frontend→backend→DB→sync.

### Flujo A — VENTA (el más crítico)

```
Login (users.js + api.js)
  ↓
Dashboard (dashboard.js) — muestra KPIs del día
  ↓
Usuario abre POS (pos.js)
  ├─ Lee: inventory_items, customers, catalog_sellers, payment_methods
  ├─ Busca producto (por SKU / barcode / nombre)
  ├─ Agrega al carrito (memoria local, no DB aún)
  ├─ Elige cliente (opcional — customers.js)
  ├─ Captura descuentos, comisión de vendedor
  ├─ Selecciona método de pago (payments, payment_methods)
  ├─ Aplica tipo de cambio (exchange_rates.js)
  ├─ Ejecuta cobro:
  │    1. POST /api/sales → backend genera folio ❌ BUG: duplicados
  │    2. Backend inserta en: sales, sale_items, payments
  │    3. Backend decrementa stock en inventory_items
  │    4. Backend emite WebSocket: sale_updated + inventory_updated
  ├─ Guarda local (sales, sale_items, payments, inventory_items)
  ├─ Imprime ticket (printer.js lee sales + sale_items + catalogs)
  └─ Actualiza caja (cash.js registra movement)

POST-venta:
  ├─ Dashboard recibe socket → refresca KPI
  ├─ Inventory recibe socket → actualiza stock visible
  ├─ Profit recalcula utilidad del día
  └─ ReportsQuickCapture puede tomar snapshot
```

**Puntos de falla:**
- Folio duplicado si backend genera colisión
- Stock negativo si decremento falla
- Socket duplicado → doble refresh → parpadeo
- Carrito se pierde si F5 antes de cobrar (memoria local)

### Flujo B — APERTURA/CIERRE DE CAJA

```
Llega empleado → abre Cash
  ├─ Lee: última cash_session (misma sucursal, mismo día)
  ├─ Si no hay sesión abierta:
  │    POST /api/cash/sessions → crea sesión con fondo inicial
  ├─ Durante el día, POS agrega automáticamente movimientos
  │    a cash_movements (venta, devolución, retiro)
  └─ Al cerrar:
       1. Calcula total esperado vs real (conteo físico)
       2. POST /api/cash/sessions/:id/close → cierra con diferencia
       3. Emite cash_session_updated
       4. Profit.js recalcula utilidad del día
```

### Flujo C — INGRESO DE PIEZA AL INVENTARIO

```
Usuario en Inventory → "Nueva pieza"
  ├─ Selecciona proveedor (suppliers.js)
  ├─ Llena: nombre, categoría, material, peso, precio, costo
  ├─ Adjunta foto (inventory_photos) + certificado (inventory_certificates)
  ├─ Genera SKU/barcode (barcodes.js + BarcodesModule)
  ├─ POST /api/inventory
  ├─ Guarda: inventory_items, inventory_photos, inventory_price_history
  ├─ Registra costo en cost_entries (si aplica)
  └─ Emite inventory_updated

Imprime etiqueta:
  ├─ JewelryLabelEditor diseña
  ├─ barcodes.js genera PNG
  └─ Printer imprime
```

### Flujo D — TRANSFERENCIA ENTRE SUCURSALES

```
Origen solicita transferencia (transfers.js)
  ├─ Selecciona piezas de inventory_items (filtrado por branch)
  ├─ POST /api/transfers → crea inventory_transfers + items
  ├─ Emite transfer_updated
  ├─ Estado: PENDIENTE
Destino recibe notificación (socket)
  ├─ Aprueba → estado APROBADO
  ├─ Al llegar físicamente → completa
  │    1. Backend: mueve branch_id de cada inventory_item
  │    2. Estado: COMPLETADO
  │    3. Log en inventory_logs (ambas sucursales)
  └─ Emite inventory_updated para ambas sucursales
```

### Flujo E — REPARACIONES

```
Cliente llega con pieza → Repairs
  ├─ Busca/crea cliente (customers.js)
  ├─ Describe problema, cotiza, toma fotos (repair_photos)
  ├─ POST /api/repairs → estado RECIBIDO
  ├─ Ciclos: EN_TALLER → LISTO → ENTREGADO
  └─ Al entregar: opcionalmente cobra (POS) o registra pago
```

### Flujo F — LLEGADAS TURÍSTICAS + REPORTE DIARIO

```
Guía llega con turistas (tourist_report.js)
  ├─ Registra arrival: agencia, guía, sucursal, unidad, pasajeros
  ├─ ArrivalRules calcula tarifa aplicable
  ├─ POST /api/tourist/arrivals → agency_arrivals
  └─ Línea de reporte: tourist_report_lines

Al cierre del día (reports-quick-capture.js — el monstruo):
  ├─ Captura rápida: ventas del día + llegadas + costos + caja
  ├─ Calcula utilidad (profit.js)
  ├─ Guarda temp_quick_captures
  ├─ Al archivar: archived_quick_captures
  ├─ Al cerrar mes: historical_reports
  └─ Sockets: quick_capture_created/updated/deleted + archived_* + historical_*
```

### Flujo G — SINCRONIZACIÓN OFFLINE → BACKEND

```
Sistema operando offline:
  ├─ Todas las escrituras locales → también se encolan en sync_queue
  ├─ Eliminaciones → sync_deleted_items
  └─ UI muestra badge "Sin conexión" (sync_ui.js)

Al volver la conexión (sync_manager.js):
  ├─ Procesa sync_queue en orden por prioridad:
  │    1. settings
  │    2. catálogos
  │    3. empleados/usuarios
  │    4. inventario
  │    5. ventas/pagos
  │    6. reportes
  ├─ Reconcilia conflictos (timestamps)
  └─ Limpia cola al éxito
```

### Flujo H — GASTOS/COSTOS

```
Settings / Costs → nuevo gasto
  ├─ Tipo: operativo, fijo, variable, bancario, mercadería
  ├─ POST /api/costs → cost_entries
  ├─ Asocia a: sucursal, empleado (opcional), agencia, proveedor
  ├─ Profit usa cost_entries para calcular utilidad neta
  └─ ReportsQuickCapture integra en captura diaria
```

---

## 7. MAPA DE DEPENDENCIAS (orden de carga obligatorio)

index.html carga scripts en este orden. Si cambia el orden, **rompe todo**.

```
NIVEL 0 (base, sin dependencias):
  utils.js  ─► define Utils
  db.js     ─► define DB

NIVEL 1 (dependen de nivel 0):
  api.js            (usa DB)
  permission_manager.js  (usa DB)

NIVEL 2 (dependen de 0-1):
  users.js          (API, DB, Utils)
  branch_manager.js (API, DB, UserManager)
  branch_validator.js
  ui.js

NIVEL 3 (dependen de 0-2):
  sync_manager.js   (API, DB, UserManager, BranchManager)
  backup.js
  printer.js
  exchange_rates.js

NIVEL 4 (módulos de negocio):
  inventory.js, customers.js, employees.js, branches.js,
  suppliers.js, suppliers-advanced.js, suppliers-integration.js,
  pos.js, cash.js, repairs.js, transfers.js, costs.js,
  arrival_rules.js, tourist_report.js,
  barcodes.js, barcodes_module.js, jewelry_label_editor.js,
  profit.js, dashboard.js,
  reports.js, reports-quick-capture.js

NIVEL 5 (integradores/paneles):
  settings.js, settings_api.js, system_auditor.js,
  sync_ui.js, qa.js

NIVEL 6 (bootstrap):
  app.js            (coordina todo)
```

---

## 8. ACOPLAMIENTOS PROBLEMÁTICOS (a romper en refactor)

### 🚨 Dios-objetos
1. **`settings.js` (7,510 líneas)** — accede a 25 stores y 14 módulos. Es un panel de administración que debería ser 20 sub-módulos.
2. **`reports-quick-capture.js` (11,136 líneas)** — captura + archivo + histórico + sockets, todo junto.

### 🚨 Acoplamiento directo (deberían usar eventos)
- `POS → Printer` (11 llamadas): `Printer.print(sale)` debería ser un evento `sale:completed` que Printer escucha.
- `App → cada módulo` (28 referencias): App.js sabe de todos. Debería ser un bus de eventos.

### 🚨 Lógica duplicada
- Hashing de PIN en `utils.js` y `app.js` (dos implementaciones SHA-256).
- `supplier_updated` listener en `api.js` Y `suppliers.js`.
- `catalog_branches` leído por 20+ módulos (falta un cache central).

### 🚨 Stores mal referenciados
- `employees.js` usa store `branches` (no existe).
- `qa.js` usa store `arrival_rules` (nombre real: `arrival_rate_rules`).
- `settings.js` usa store `audit_logs` (nombre real: `audit_log`).
- `db.js` crea `temp_quick_captures` dos veces.

### 🚨 Ciclos
- `app.js ↔ users.js` (21 llamadas bidireccionales)
- `sync_manager ↔ api.js` (187 llamadas)

---

## 9. CONSECUENCIAS PARA EL PLAN DE TESTING

Antes pensaba en 5 tests E2E. **NO ALCANZA.** El sistema es un conjunto de flujos interconectados. Testing real necesita:

### Tests por capa

**Unitarios (backend + helpers):**
- Generador de folios único (concurrencia)
- Cálculo de profit (todos los casos: con descuento, con comisión, con devolución)
- Hash de PIN consistente
- Tarifa de arrivalRules por unidad/pasajeros
- Cálculo de tipo de cambio en pago multi-moneda

**Integración (módulo individual + DB real):**
- Por cada uno de los 32 módulos frontend: smoke test de sus 3-5 métodos principales.

**E2E (flujos completos, los 8 de arriba):**
- **A — Venta completa**: login → POS → agregar producto → cobrar → imprimir → caja registra → stock baja → socket actualiza Dashboard
- **B — Caja apertura/cierre**: sesión → varias ventas → cierre con diferencia cero
- **C — Inventario**: alta de pieza → etiqueta → aparece en POS
- **D — Transferencia**: solicitar → aprobar → recibir → stock cambia de sucursal
- **E — Reparación**: alta → cambio de estado → entrega con cobro
- **F — Llegada turística + reporte**: registrar llegada → aparece en reporte diario → archivado
- **G — Offline→online**: desconectar red → hacer venta → reconectar → verificar sync
- **H — Multi-sucursal**: usuario sin permisos en sucursal X no ve sus datos

### Tests de regresión (para no romper al refactor)
- Snapshot de respuesta de cada endpoint con dataset fijo
- Diff contra snapshot anterior en cada PR

### Tests de carga (para el bug del pool)
- 50 logins concurrentes
- 100 ventas en 10 segundos
- Pool no debe saturarse, folios no deben duplicarse

---

## 10. RECOMENDACIONES ESTRUCTURALES

Basado en lo anterior, para el refactor incremental:

1. **Extraer un `EventBus` central** para desacoplar módulos. POS emite `sale:completed`, Printer/Cash/Dashboard/Inventory escuchan.
2. **Un solo `CatalogCache`** para `catalog_*` y `settings` (leídos por casi todos).
3. **Separar `Settings.js` en sub-paneles**: `settings/printer.js`, `settings/users.js`, etc.
4. **Separar `reports-quick-capture.js` en 4**: captura, archivo, histórico, socket-bridge.
5. **Unificar los listeners de socket en un solo `SocketRouter`** que dispatch-ea al módulo correspondiente.
6. **Mover `QA` y archivos `test-*.js` fuera del bundle de producción.**
7. **Consolidar hashing, permisos y branch-check en helpers únicos** para eliminar duplicación.

---

## 11. PRÓXIMA ACTUALIZACIÓN

Este árbol debe actualizarse cada vez que:
- Se agregue/elimine un módulo
- Cambie un store de IndexedDB
- Se agregue/cambie un endpoint REST
- Se agregue/cambie un evento WebSocket
- Se refactorice un flujo completo

Mantenerlo es parte del ciclo de desarrollo.
