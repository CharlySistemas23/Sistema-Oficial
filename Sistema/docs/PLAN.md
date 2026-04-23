# PLAN DE ESTABILIZACIÓN Y MEJORA — Sistema Opal POS

> **Contexto:** el sistema está en producción con data real de la joyería.
> Cada cambio debe ser reversible. Cero downtime planeado.
> Autor del plan: auditoría técnica 2026-04-23.

---

## PRINCIPIOS DUROS (no se negocian)

1. **La data es sagrada.** Antes de cualquier cambio → backup verificado.
2. **Nada se toca en producción primero.** Todo pasa por staging.
3. **Un cambio = un commit = un deploy.** Si algo rompe, revertimos en segundos.
4. **Deploy pequeño, deploy frecuente.** Nunca un mega-deploy de "todo junto".
5. **No refactor sin test antes.** Si no hay test que valide el comportamiento viejo, primero escribimos el test.
6. **No se borran features sin confirmación del dueño.** El código viejo comenta por qué existe.
7. **Ventana de riesgo = horas de bajo tráfico.** Cambios críticos fuera del horario de ventas.

---

## FASE 0 — SALVAVIDAS (DÍA 1, HOY)

Objetivo: **garantizar que no perdemos data pase lo que pase**.

### 0.1 Backup completo de PostgreSQL producción
- [ ] `pg_dump` de la base `SISTEMA OFICIAL POSRGRES NO TOCAR` → archivo `.sql` + `.sql.gz`
- [ ] Copiar a 2 ubicaciones: disco local + servicio externo (Google Drive / Dropbox)
- [ ] Validar el backup: restaurarlo en una DB local de prueba y verificar que se puede consultar
- [ ] Documentar el comando de restore en este mismo archivo
- [ ] Agendar backup automático diario (cron / Railway cronjob)

### 0.2 Snapshot del código actual
- [ ] Tag de Git: `v-pre-refactor-2026-04-23` sobre el commit actual de `main`
- [ ] Push de ese tag al remoto
- [ ] Branch de respaldo: `backup/pre-refactor-2026-04-23`
- [ ] Crear rama de trabajo: `estabilizacion`

### 0.3 Mover el proyecto fuera de OneDrive
- **Problema:** OneDrive sincroniza mientras Git escribe → corrupción de `.git/`, conflictos de archivos, lock files fantasma.
- [ ] Nuevo hogar: `C:\dev\opal-pos\` (o equivalente local sin sync)
- [ ] Clonar desde GitHub (no copiar archivos): `git clone <repo> C:\dev\opal-pos`
- [ ] Excluir esa carpeta de OneDrive y de antivirus
- [ ] Verificar que `git status` está limpio tras el move

### 0.4 .gitignore correcto
- [ ] `.gitignore` que excluya: `node_modules/`, `.env*`, `*.log`, `.DS_Store`, `tests/e2e/report/`, `playwright-report/`, `dist/`, `build/`

---

## FASE 1 — PARAR EL SANGRADO (SEMANA 1)

Objetivo: arreglar bugs críticos actualmente activos en producción.

### 1.1 Bug crítico: folios de venta duplicados
- **Síntoma en logs:** `duplicate key value violates unique constraint "sales_folio_key"`
- **Impacto:** ventas que fallan al guardar.
- [ ] Leer cómo se generan los folios hoy (probablemente frontend: timestamp + random)
- [ ] Migrar a `SEQUENCE` de PostgreSQL por sucursal:
  ```sql
  CREATE SEQUENCE IF NOT EXISTS sales_folio_branch_<id>_seq;
  ```
  O una función atómica `next_folio(branch_id)` que combine `branch_id + nextval(seq)`.
- [ ] Migración para renumerar folios existentes si hay colisiones históricas
- [ ] Test: crear 1000 ventas en paralelo → 0 duplicados
- [ ] Deploy en staging → validar con tráfico sintético → deploy a prod

### 1.2 Pool de conexiones PostgreSQL
- **Síntoma en logs:** `timeout exceeded when trying to connect` × 934, `circuit breaker OPEN`
- **Impacto:** sistema cae periódicamente, usuarios no pueden loguear.
- [ ] Agregar en Railway → backend → variables:
  ```
  DB_POOL_MAX=10
  DB_POOL_MIN=2
  DB_CONNECT_TIMEOUT_MS=5000
  DB_IDLE_TIMEOUT_MS=30000
  DEBUG_DB=true      (temporal, para diagnosticar)
  ```
- [ ] Auditar `backend/config/database.js` y `backend/routes/*.js` buscando `pool.connect()` sin `client.release()` en `finally` → leaks
- [ ] Agregar métrica: log periódico de `{ total, idle, waiting }` cada 30s
- [ ] Verificar `max_connections` del Postgres en Railway (por plan)
- [ ] Consolidar: eliminar `Postgres Copy` si no se usa (libera conexiones)

### 1.3 Índices rotos en migraciones
- **Síntoma:** `column "guide_id" does not exist`, `column "receipt_number" does not exist`
- [ ] Decidir: ¿esas columnas deberían existir? Si sí, migración que las añade.
- [ ] Si no, eliminar los `CREATE INDEX` obsoletos
- [ ] Añadir `IF NOT EXISTS` a todos los `CREATE TRIGGER` para limpiar logs

### 1.4 Seguridad frontend (hardening mínimo)
- [ ] Eliminar `window.bypassLogin` completamente (`js/app.js`, `index.html`)
- [ ] Mover `COMPANY_ACCESS_CODE` al backend: endpoint `POST /api/auth/company-code` con rate limiting
- [ ] Bloquear PIN `1234` en creación: validación de PIN mínimo 4 dígitos ≠ patrones obvios
- [ ] Forzar cambio de PIN en primer login (campo `must_change_pin` en tabla `users`)
- [ ] Eliminar archivos de prueba del bundle de producción: `test-branches.js`, `test-global-system.js`

### 1.5 Limpieza de logs

- [ ] Integrar `remove-debug-logs.js` al proceso de build (o eliminar manualmente los 2,521 console.log)
- [ ] Reemplazar con un wrapper `Log.info/error` que en producción solo emite errores reales

### 1.6 Bugs descubiertos al mapear el árbol

> Todos estos los detecté al armar `docs/ARBOL.md`. Son bugs latentes que hoy no rompen pero romperán eventualmente.

**Stores de IndexedDB referenciados con nombre incorrecto:**

- [ ] `employees.js` usa `DB.get('branches', ...)` → store real es `catalog_branches`. Hoy devuelve `undefined`, código "funciona" por casualidad.
- [ ] `qa.js` usa `DB.get('arrival_rules', ...)` → store real es `arrival_rate_rules`.
- [ ] `settings.js` usa `DB.get('audit_logs', ...)` → store real es `audit_log`.
- [ ] `db.js` crea `temp_quick_captures` **dos veces** (líneas 320 y 380). El segundo no hace nada porque existe, pero el upgrade path futuro se puede romper.

**Listeners de WebSocket duplicados:**

- [ ] `supplier_updated` registrado en `api.js` Y en `suppliers.js` → callback se ejecuta 2× en cada evento.
- [ ] Listeners de `reports-quick-capture.js` se registran dentro de funciones de inicialización; cada navegación al módulo **suma un listener más** (memory leak).

**Ciclos de dependencia:**

- [ ] `app.js ↔ users.js` (21 referencias bidireccionales). Documentar en cuál dirección fluye el control real.
- [ ] `api.js ↔ sync_manager.js` (187 llamadas de sync a api). Al menos extraer la interfaz clara.

**Archivos de test en el bundle de producción:**

- [ ] `test-branches.js` y `test-global-system.js` se cargan en `index.html` junto al resto. Envían requests al API con datos de prueba.
- [ ] `qa.js` — módulo entero de pruebas (6,717 líneas) que corre en producción. Crea stores `qa_*` en la IndexedDB de clientes reales.

**Endpoint huérfano en backend:**

- [ ] `backend/routes/purchase-orders.js` existe pero ningún módulo frontend lo consume. Decidir: implementar o eliminar.

---

## FASE 2 — FUNDACIÓN (SEMANAS 2-4)

Objetivo: herramientas que cualquier sistema de este tamaño necesita.
Antes de refactorizar, instalar la red de seguridad.

### 2.1 Ambiente de staging
- [ ] Nuevo service en Railway: `Backend STAGING` (misma imagen, DB separada)
- [ ] Copia de la data de producción → staging (anonimizada si hay PII)
- [ ] Frontend staging en Vercel preview o subdominio: `staging.opal-co.com`
- [ ] Workflow: `main` → staging automático, prod requiere tag `v*.*.*`

### 2.2 Monitoreo de errores
- [ ] Cuenta gratis de Sentry (free tier: 5k errores/mes, suficiente)
- [ ] Integración en frontend (1 script) y backend (1 middleware)
- [ ] Alertas por email/Slack a errores nuevos
- [ ] Dashboard básico de tasa de errores

### 2.3 Bundler moderno
- [ ] Instalar Vite
- [ ] Migrar los 41 archivos JS a ES modules (`import`/`export`)
  - Paso 1: exportar cada módulo (`export const Inventory = {...}`)
  - Paso 2: un `main.js` que importa todo y hace `window.Inventory = Inventory` (compat)
  - Paso 3: cambiar `index.html` de 41 `<script>` a un solo `<script type="module" src="/src/main.js">`
- [ ] Hash en nombres de archivo para cache-busting automático (adiós `?v=20260303`)
- [ ] CSS también pasa por Vite

### 2.4 Tests de los 8 FLUJOS COMPLETOS

> Ver `docs/ARBOL.md` sección 6 para el detalle de cada flujo.
> El sistema es interconectado — no alcanza con tests aislados.

**Tests unitarios (backend + helpers) — bloqueantes en CI:**

- [ ] Generador de folios único bajo concurrencia (200 requests paralelas → 0 duplicados)
- [ ] Cálculo de `ProfitCalculator` con todos los casos (descuento, comisión, devolución, tipo de cambio)
- [ ] Hash de PIN consistente entre `utils.js` y `app.js` (son dos implementaciones hoy)
- [ ] `ArrivalRules.calculateArrivalFee` por unidad/pasajeros/fecha
- [ ] `PermissionManager` retorna permisos correctos por rol

**Tests E2E de los 8 flujos completos:**

- [ ] **Flujo A — Venta**: login → POS → escanear producto → cliente → cobrar mixto (efectivo + tarjeta) → imprimir ticket → verificar:
  - `sales`, `sale_items`, `payments` guardados
  - Stock decrementado en `inventory_items`
  - `cash_movements` registra ingreso
  - Socket `sale_updated` → Dashboard refresca KPI
- [ ] **Flujo B — Caja**: apertura → 3 ventas + 1 devolución + 1 retiro → cierre → diferencia = 0
- [ ] **Flujo C — Inventario**: alta pieza → foto → certificado → SKU → imprimir etiqueta → aparece en POS
- [ ] **Flujo D — Transferencia**: sucursal A solicita → B aprueba → B recibe → stock cambia de sucursal → log en `inventory_logs` × 2
- [ ] **Flujo E — Reparación**: alta cliente + pieza → cambiar estados (RECIBIDO → EN_TALLER → LISTO → ENTREGADO) → entregar con cobro
- [ ] **Flujo F — Llegada + reporte**: registrar arrival → aplica tarifa correcta → aparece en captura del día → archivado → histórico
- [ ] **Flujo G — Offline → online**: desconectar red → hacer venta + alta cliente → reconectar → `sync_manager` procesa cola → backend coincide con local
- [ ] **Flujo H — Multi-sucursal**: usuario con permiso sólo a sucursal X no ve datos de sucursal Y en ningún módulo

**Tests de carga (contra staging):**

- [ ] 50 logins concurrentes → 0 timeouts, pool estable
- [ ] 100 ventas en 10s desde múltiples sucursales → 0 folios duplicados
- [ ] `checkHealth` responde < 200ms p95

**CI:**

- [ ] GitHub Actions corre unitarios + flujos A, B, C en cada PR (bloqueantes)
- [ ] Flujos D-H corren en merge a `main` (reportan, no bloquean)
- [ ] Tests de carga semanales contra staging

### 2.5 Observabilidad del pool de DB
- [ ] Endpoint `/health` que reporta stats del pool
- [ ] Panel simple (HTML estático) que consulta ese endpoint cada 10s
- [ ] Así vemos en vivo si el pool se está agotando antes de que caiga el sistema

---

## FASE 3 — REFACTOR INCREMENTAL (MES 2+)

Objetivo: limpiar la deuda sin romper nada. Un módulo por sprint (1-2 semanas c/u).

### Orden sugerido (más dolor primero)

#### Sprint 1: `reports-quick-capture.js` (11,136 líneas)
- Partir en sub-módulos por funcionalidad:
  - `reports-quick-capture/capture.js` (captura)
  - `reports-quick-capture/archive.js` (archivado)
  - `reports-quick-capture/recalculation.js` (recálculos)
  - `reports-quick-capture/ui.js` (renderizado)
  - `reports-quick-capture/validation.js`
- Cada función extraída → test unitario antes de mover

#### Sprint 2: `inventory.js` (5,942 líneas)
- Separar capas:
  - `inventory/data.js` (queries IndexedDB + API)
  - `inventory/ui.js` (render)
  - `inventory/barcode-sync.js` (lógica de SKU/códigos)
  - `inventory/stock-operations.js` (movimientos)

#### Sprint 3: `settings.js` (7,510 líneas)
- Dividir por sección del panel de settings

#### Sprint 4: `pos.js` (4,704 líneas)
- `pos/cart.js`, `pos/payment.js`, `pos/receipt.js`, `pos/ui.js`

#### Sprint 5: barrido de seguridad XSS
- Helper `Utils.safeHTML(template, data)` que escapa automáticamente
- Reemplazar los 516 `innerHTML =` uno por uno, empezando por los que renderizan datos de cliente/producto

#### Sprint 6: unificar estilos
- Partir `styles.css` (10,050 líneas) por área funcional
- O adoptar sistema de tokens ya iniciado (`tokens.css`)

---

## FASE 4 — ARQUITECTURA (MESES 3-6)

Solo si lo anterior está estable.

### 4.1 Service Worker bien hecho
- Offline real para POS (vender sin conexión, sincronizar al volver)
- Cache de assets con estrategia `stale-while-revalidate`

### 4.2 Optimización de base de datos
- Auditoría de queries lentas (log de queries > 500ms)
- Índices donde falten
- Archivado de tablas históricas (reportes > 1 año → tabla fría)

### 4.3 Backup automático robusto
- Backup diario → S3 o equivalente
- Retención 30 días + backup mensual indefinido
- Test de restore mensual (scripted)

### 4.4 (Opcional) Framework de UI
- Evaluar Preact (más ligero, API tipo React)
- Sólo si el refactor manual se vuelve insostenible
- Migración pantalla por pantalla, nunca big-bang

---

## REGLAS DE DEPLOY

Cada cambio sigue este flujo:

```
1. branch desde main: git checkout -b fix/<descripcion>
2. implementar + tests
3. PR a main → CI corre tests → review
4. merge a main → deploy automático a staging
5. validación manual en staging (5 min)
6. crear tag v.X.Y.Z → dispara deploy a producción
7. monitorear Sentry + pool stats 30 min post-deploy
8. si algo sale mal: revertir tag, deploy del tag anterior
```

---

## COMANDOS CRÍTICOS DE REFERENCIA

### Backup DB producción
```bash
pg_dump "postgresql://postgres:<pass>@<host>:<port>/railway" \
  --no-owner --no-acl -Fc \
  > backup-$(date +%Y%m%d-%H%M%S).dump
```

### Restore DB
```bash
pg_restore -d "postgresql://..." \
  --clean --if-exists --no-owner \
  backup-YYYYMMDD-HHMMSS.dump
```

### Restart backend Railway
```bash
export RAILWAY_TOKEN="<token>"
railway restart --service "Backend NO TOCAR"
```

### Ver logs en vivo
```bash
railway logs --service "Backend NO TOCAR" --follow
```

### Rollback de deploy
```bash
git tag -l                              # listar tags
git push origin :refs/tags/v-bad         # borrar tag malo (opcional)
git checkout v-previa && git tag -f v-prod-actual && git push --force
```

---

## BITÁCORA (actualizar al cerrar cada paso)

| Fecha | Fase | Acción | Resultado | Quien |
|-------|------|--------|-----------|-------|
| 2026-04-23 | 0 | Plan creado | ✅ | Claude + Carlos |
|  |  |  |  |  |

---

## CRITERIOS DE ÉXITO POR FASE

- **Fase 0 lista cuando:** backup verificado funciona + proyecto fuera de OneDrive + tag de rollback.
- **Fase 1 lista cuando:** 0 errores de folio duplicado en 7 días + pool estable en logs + `bypassLogin` eliminado.
- **Fase 2 lista cuando:** staging funcionando + Sentry reportando + 5 tests corriendo en CI.
- **Fase 3 lista cuando:** ningún archivo JS > 2000 líneas + cobertura de tests > 30%.
- **Fase 4 lista cuando:** backup automático + POS funciona offline + query p95 < 200ms.

---

## QUÉ HACER SI ALGO ROMPE EN PRODUCCIÓN

1. **Respirar.** Tenemos backup. Tenemos tags.
2. `railway restart --service "Backend NO TOCAR"` (arregla 80% de caídas transitorias)
3. Si persiste: `git checkout v-pre-refactor-<fecha>` + redeploy a Railway
4. Revisar logs: `railway logs --service "Backend NO TOCAR" | tail -200`
5. Abrir incidente en bitácora de arriba con timestamp + síntoma + fix
