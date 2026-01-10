# Guía de Migración del Frontend a Backend en Tiempo Real

Esta guía explica cómo migrar el frontend del sistema POS para que funcione con el backend en tiempo real en lugar de IndexedDB.

## 📋 Cambios Principales

### 1. Reemplazar llamadas a IndexedDB por API

El archivo `js/api.js` contiene el cliente API que reemplaza las llamadas a `DB.*`.

**Antes (IndexedDB):**
```javascript
const items = await DB.getAll('inventory_items');
await DB.put('inventory_items', item);
```

**Después (API):**
```javascript
const items = await API.getInventoryItems();
await API.updateInventoryItem(item.id, item);
```

### 2. Modificar módulos principales

#### `js/app.js`
- Agregar inicialización de API al inicio
- Reemplazar verificación de login con API
- Modificar carga de datos inicial

#### `js/pos.js`
- Reemplazar `DB.getAll('inventory_items')` por `API.getInventoryItems()`
- Reemplazar `DB.put('sales', sale)` por `API.createSale(sale)`
- Escuchar eventos de Socket.IO para actualizaciones en tiempo real

#### `js/inventory.js`
- Reemplazar todas las operaciones CRUD con API
- Escuchar eventos `inventory-updated` de Socket.IO

#### `js/dashboard.js`
- Reemplazar consultas locales por `API.getDashboardMetrics()`
- Agregar filtros por sucursal para admin maestro

### 3. Configuración del API

En el módulo de Configuración, agregar:

```javascript
// Configurar URL del API
const apiUrl = prompt('Ingresa la URL del servidor API:');
await API.setBaseURL(apiUrl);
```

## 🔄 Pasos de Migración

### Paso 1: Configurar URL del API

1. Abre el sistema POS
2. Ve a **Configuración → Sistema → API**
3. Ingresa la URL de tu servidor Railway (ej: `https://tu-app.railway.app`)
4. Guarda la configuración

### Paso 2: Modificar Login

En `js/app.js`, modificar el flujo de login:

```javascript
// Reemplazar login local por API
async function handleLogin(username, password) {
    try {
        const result = await API.login(username, password);
        // Guardar usuario y token
        UserManager.currentUser = result.user;
        // Continuar con el flujo normal
    } catch (error) {
        // Mostrar error
    }
}
```

### Paso 3: Actualizar Módulo POS

En `js/pos.js`, buscar y reemplazar:

```javascript
// ANTES
async loadProducts() {
    const items = await DB.getAll('inventory_items', null, null, {
        filterByBranch: true,
        branchIdField: 'branch_id'
    });
    // ...
}

// DESPUÉS
async loadProducts() {
    const branchId = BranchManager.getCurrentBranchId();
    const items = await API.getInventoryItems({
        branch_id: branchId,
        status: 'disponible'
    });
    // ...
}
```

### Paso 4: Actualizar Módulo de Inventario

En `js/inventory.js`, reemplazar operaciones CRUD:

```javascript
// ANTES
async saveItem(itemId) {
    await DB.put('inventory_items', item);
}

// DESPUÉS
async saveItem(itemId) {
    if (itemId) {
        await API.updateInventoryItem(itemId, item);
    } else {
        await API.createInventoryItem(item);
    }
}
```

### Paso 5: Actualizar Dashboard

En `js/dashboard.js`:

```javascript
// ANTES
const sales = await DB.getAll('sales');

// DESPUÉS
const metrics = await API.getDashboardMetrics({
    branch_id: BranchManager.getCurrentBranchId(),
    start_date: startDate,
    end_date: endDate
});
```

### Paso 6: Escuchar Eventos en Tiempo Real

Agregar listeners para actualizaciones en tiempo real:

```javascript
// En js/pos.js
window.addEventListener('inventory-updated', (event) => {
    const { action, item } = event.detail;
    if (action === 'updated' || action === 'created') {
        // Recargar productos
        POS.loadProducts();
    }
});

// En js/inventory.js
window.addEventListener('inventory-updated', (event) => {
    const { action, item } = event.detail;
    if (action === 'updated') {
        // Actualizar item en la lista
        Inventory.updateItemInList(item);
    }
});
```

## 🔌 Configuración de Socket.IO

El cliente API (`js/api.js`) ya maneja Socket.IO automáticamente. Solo necesitas:

1. Configurar la URL del API
2. Iniciar sesión con usuario válido
3. El socket se conectará automáticamente

## 📊 Dashboard de Admin Maestro

Para el admin maestro, modificar `js/dashboard.js`:

```javascript
async loadDashboard() {
    if (UserManager.currentUser.isMasterAdmin) {
        // Mostrar selector de sucursal
        const branches = await API.getBranches();
        // Cargar métricas con filtro de sucursal
        const metrics = await API.getDashboardMetrics({
            branch_id: selectedBranchId || null
        });
    } else {
        // Usuario normal - solo su sucursal
        const metrics = await API.getDashboardMetrics();
    }
}
```

## ⚠️ Consideraciones Importantes

1. **Mantener IndexedDB como fallback**: El sistema puede funcionar offline usando IndexedDB como caché
2. **Manejo de errores**: Agregar manejo de errores para cuando el servidor no esté disponible
3. **Sincronización**: Implementar cola de sincronización para operaciones offline
4. **Tokens**: Los tokens JWT expiran después de 7 días por defecto

## 🧪 Pruebas

1. **Probar conexión**: Verificar que el API responde en `/health`
2. **Probar login**: Iniciar sesión con usuario válido
3. **Probar operaciones**: Crear/editar/eliminar items
4. **Probar tiempo real**: Abrir dos navegadores y verificar que los cambios se propagan

## 📝 Checklist de Migración

- [ ] Configurar URL del API
- [ ] Modificar login para usar API
- [ ] Actualizar módulo POS
- [ ] Actualizar módulo de Inventario
- [ ] Actualizar Dashboard
- [ ] Agregar listeners de Socket.IO
- [ ] Probar todas las funcionalidades
- [ ] Verificar que el admin maestro puede ver todas las sucursales
- [ ] Verificar que los usuarios normales solo ven su sucursal

## 🚀 Siguiente Paso

Una vez completada la migración, el sistema funcionará completamente en tiempo real con el servidor centralizado en Railway.
