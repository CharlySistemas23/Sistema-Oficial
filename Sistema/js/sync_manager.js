// Sync Manager - Gestión de sincronización con el servidor

const SyncManager = {
    initialized: false,
    syncQueue: [],
    isSyncing: false,
    syncInterval: null,

    async init() {
        if (this.initialized) return;
        
        // Cargar cola de sincronización desde IndexedDB
        await this.loadQueue();
        
        // Intentar sincronizar al iniciar (verificar desde DB)
        try {
            if (typeof DB !== 'undefined') {
                const urlSetting = await DB.get('settings', 'api_url');
                const apiUrl = urlSetting?.value || null;
                let hasToken = (typeof API !== 'undefined' && API.token) || !!localStorage.getItem('api_token');
                
                // Sincronizar API.baseURL y API.token si es necesario
                if (apiUrl && typeof API !== 'undefined') {
                    if (!API.baseURL || API.baseURL !== apiUrl) {
                        API.baseURL = apiUrl;
                        console.log(`🔄 API.baseURL sincronizado desde DB: ${apiUrl}`);
                    }
                    if (!API.token && hasToken) {
                        API.token = localStorage.getItem('api_token');
                        console.log('🔄 API.token cargado desde localStorage');
                        hasToken = true;
                    }
                    
                    // Si no hay token, intentar login automático
                    if (!hasToken && typeof API !== 'undefined' && API.login) {
                        console.log('🔄 Sin token al iniciar. Intentando login automático con master_admin...');
                        try {
                            const loginResult = await API.login('master_admin', '1234');
                            if (loginResult && loginResult.token) {
                                console.log('✅ Login automático exitoso al iniciar');
                                API.token = loginResult.token;
                                localStorage.setItem('api_token', API.token);
                                hasToken = true;
                            }
                        } catch (autoLoginError) {
                            console.warn('⚠️ Login automático falló al iniciar:', autoLoginError.message);
                        }
                    }
                    
                    // Inicializar socket si hay URL y token pero no está conectado
                    if (API.baseURL && API.token && (!API.socket || !API.socket.connected)) {
                        try {
                            await API.initSocket();
                            console.log('✅ Socket inicializado desde SyncManager.init()');
                        } catch (socketError) {
                            console.warn('⚠️ Error inicializando socket:', socketError);
                        }
                    }
                    
                    // Intentar sincronizar si hay URL (con o sin token, el syncPending intentará login automático)
                    if (API.baseURL) {
                        await this.syncPending();
                    }
                }
            }
        } catch (error) {
            console.error('Error inicializando SyncManager:', error);
        }
        
        // Configurar intervalo de sincronización (cada 10 segundos - más agresivo)
        // Solo sincronizar si hay elementos pendientes
        this.syncInterval = setInterval(async () => {
            // Verificar disponibilidad del API antes de sincronizar
            try {
                if (typeof DB !== 'undefined') {
                    const urlSetting = await DB.get('settings', 'api_url');
                    const apiUrl = urlSetting?.value || null;
                    const hasToken = (typeof API !== 'undefined' && API.token) || !!localStorage.getItem('api_token');
                    
                    // Sincronizar API.baseURL si es necesario
                    if (apiUrl && typeof API !== 'undefined') {
                        if (!API.baseURL || API.baseURL !== apiUrl) {
                            API.baseURL = apiUrl;
                        }
                        if (!API.token && hasToken) {
                            API.token = localStorage.getItem('api_token');
                        }
                    }
                    
                    if (apiUrl && hasToken && typeof API !== 'undefined' && API.baseURL && API.token && !this.isSyncing && this.syncQueue.length > 0) {
                        this.syncPending();
                    }
                }
            } catch (error) {
                console.error('Error en intervalo de sincronización:', error);
            }
        }, 10000);
        
        // Escuchar eventos de conexión
        if (typeof API !== 'undefined' && API.socket) {
            API.socket.on('connect', () => {
                console.log('🔄 Reconectado, sincronizando pendientes...');
                this.syncPending();
            });
        }
        
        this.initialized = true;
    },

    async loadQueue() {
        try {
            const queue = await DB.getAll('sync_queue') || [];
            this.syncQueue = queue;
            console.log(`📋 Cola de sincronización cargada: ${queue.length} elementos`);
        } catch (error) {
            console.error('Error cargando cola de sincronización:', error);
            this.syncQueue = [];
        }
    },

    getQueueSize() {
        return this.syncQueue ? this.syncQueue.length : 0;
    },

    async addToQueue(type, entityId, data = null) {
        try {
            const queueItem = {
                id: Utils.generateId(),
                type: type,
                entity_id: entityId,
                data: data,
                created_at: new Date().toISOString(),
                retry_count: 0
            };
            
            await DB.add('sync_queue', queueItem);
            this.syncQueue.push(queueItem);
            
            console.log(`➕ Agregado a cola de sincronización: ${type} - ${entityId}`);
            
            // Intentar sincronizar inmediatamente si hay conexión (sin delay para mejor responsividad)
            if (typeof API !== 'undefined' && API.baseURL && API.token && !this.isSyncing) {
                // Usar requestIdleCallback si está disponible, sino setTimeout
                if (window.requestIdleCallback) {
                    requestIdleCallback(() => this.syncPending(), { timeout: 500 });
                } else {
                    setTimeout(() => this.syncPending(), 500);
                }
            }
        } catch (error) {
            console.error('Error agregando a cola de sincronización:', error);
        }
    },

    async syncPending() {
        if (this.isSyncing) {
            return; // Silenciar log si ya está sincronizando
        }

        // Verificar que API esté definido y configurado
        // Primero verificar desde la base de datos (fuente de verdad)
        let apiUrl = null;
        let hasToken = false;
        
        try {
            if (typeof DB !== 'undefined') {
                const urlSetting = await DB.get('settings', 'api_url');
                apiUrl = urlSetting?.value || null;
            }
            hasToken = (typeof API !== 'undefined' && API.token) || !!localStorage.getItem('api_token');
            
            // Sincronizar API.baseURL con la base de datos si es necesario
            if (apiUrl && typeof API !== 'undefined') {
                if (!API.baseURL || API.baseURL !== apiUrl) {
                    API.baseURL = apiUrl;
                    console.log(`🔄 API.baseURL sincronizado: ${apiUrl}`);
                }
                
                // Si hay URL pero no token, intentar cargar desde localStorage
                if (!API.token && hasToken) {
                    API.token = localStorage.getItem('api_token');
                    console.log('🔄 API.token cargado desde localStorage');
                    
                    // Inicializar socket si hay URL y token pero no está conectado
                    if (API.baseURL && API.token && (!API.socket || !API.socket.connected)) {
                        try {
                            await API.initSocket();
                            console.log('✅ Socket inicializado desde syncPending()');
                        } catch (socketError) {
                            console.warn('⚠️ Error inicializando socket:', socketError);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error verificando API desde DB:', error);
        }
        
        // Verificar disponibilidad final
        if (typeof API === 'undefined' || !apiUrl) {
            // Solo mostrar warning si no hay URL configurada (una vez, no repetidamente)
            if (!apiUrl && !this._urlWarningShown) {
                console.warn('⚠️ API no disponible: URL no configurada');
                this._urlWarningShown = true;
            }
            return;
        }
        
        // Si no hay token, intentar login automático con master_admin
        if (!hasToken) {
            // Solo intentar login automático una vez por sesión
            if (!this._autoLoginAttempted) {
                this._autoLoginAttempted = true;
                console.log('🔄 Sin token detectado. Intentando login automático con master_admin...');
                
                try {
                    // Asegurar que API.baseURL esté configurado
                    if (typeof API !== 'undefined' && !API.baseURL) {
                        API.baseURL = apiUrl;
                    }
                    
                    // Intentar login automático
                    if (typeof API !== 'undefined' && API.login) {
                        const loginResult = await API.login('master_admin', '1234');
                        
                        if (loginResult && loginResult.token) {
                            console.log('✅ Login automático exitoso. Token obtenido.');
                            API.token = loginResult.token;
                            localStorage.setItem('api_token', API.token);
                            hasToken = true; // Actualizar flag
                            
                            // Inicializar socket
                            try {
                                await API.initSocket();
                                console.log('✅ Socket.IO inicializado después de login automático');
                            } catch (socketError) {
                                console.warn('⚠️ Error inicializando socket:', socketError);
                            }
                            
                            // Continuar con la sincronización
                        } else {
                            console.warn('⚠️ Login automático falló: No se obtuvo token');
                            return; // No sincronizar si no hay token
                        }
                    }
                } catch (autoLoginError) {
                    console.warn('⚠️ Error en login automático:', autoLoginError.message);
                    console.log('ℹ️ El sistema funcionará en modo offline. Los datos se guardarán localmente.');
                    return; // No sincronizar si el login automático falla
                }
            } else {
                // Ya se intentó login automático, no sincronizar sin token
                return;
            }
        }
        
        // Verificar que API.baseURL y API.token estén configurados
        if (!API.baseURL || !API.token) {
            console.warn('⚠️ API no disponible: baseURL o token no configurados');
            return;
        }

        if (this.syncQueue.length === 0) {
            return;
        }

        this.isSyncing = true;
        const queueSize = this.syncQueue.length;
        console.log(`🔄 Sincronizando ${queueSize} elemento${queueSize > 1 ? 's' : ''} pendiente${queueSize > 1 ? 's' : ''}...`);

        const toSync = [...this.syncQueue];
        let successCount = 0;
        let errorCount = 0;

        for (const item of toSync) {
            try {
                // Verificar que API esté disponible antes de procesar cada item
                if (typeof API === 'undefined' || !API.baseURL || !API.token) {
                    console.warn('⚠️ API no disponible, deteniendo sincronización');
                    break; // Salir del loop si API no está disponible
                }
                
                // Log detallado para debugging
                console.log(`🔄 Procesando item de cola: tipo=${item.type}, entity_id=${item.entity_id}, data=`, item.data);
                
                // Obtener datos de la entidad
                let entityData;
                switch (item.type) {
                    case 'sale':
                        // Manejar eliminaciones
                        if (item.data === 'delete') {
                            try {
                                if (typeof API === 'undefined' || typeof API.deleteSale !== 'function') {
                                    throw new Error('API.deleteSale no disponible');
                                }
                                await API.deleteSale(item.entity_id);
                                await DB.delete('sync_queue', item.id);
                                // También eliminar de sync_deleted_items si existe
                                try {
                                    await DB.delete('sync_deleted_items', item.entity_id);
                                } catch (e) {
                                    // Ignorar si no existe
                                }
                                successCount++;
                            } catch (error) {
                                console.error('Error eliminando venta en servidor:', error);
                                throw error;
                            }
                        } else {
                            // Manejar creaciones (las ventas no se actualizan)
                            entityData = await DB.get('sales', item.entity_id);
                            if (entityData) {
                                if (typeof API === 'undefined' || typeof API.createSale !== 'function') {
                                    throw new Error('API.createSale no disponible');
                                }
                                await API.createSale(entityData);
                                await DB.delete('sync_queue', item.id);
                                successCount++;
                            }
                        }
                        break;

                    case 'inventory':
                    case 'inventory_item': // También manejar 'inventory_item' usado en inventory.js
                        // Manejar eliminaciones PRIMERO
                        if (item.data === 'delete') {
                            try {
                                if (typeof API === 'undefined' || typeof API.deleteInventoryItem !== 'function') {
                                    throw new Error('API.deleteInventoryItem no disponible');
                                }
                                await API.deleteInventoryItem(item.entity_id);
                                await DB.delete('sync_queue', item.id);
                                // También eliminar de sync_deleted_items si existe
                                try {
                                    await DB.delete('sync_deleted_items', item.entity_id);
                                } catch (e) {
                                    // Ignorar si no existe
                                }
                                successCount++;
                            } catch (error) {
                                console.error('Error eliminando item de inventario en servidor:', error);
                                throw error;
                            }
                        } else {
                            // Manejar creaciones/actualizaciones
                            entityData = await DB.get('inventory_items', item.entity_id);
                            if (entityData) {
                                if (typeof API === 'undefined') {
                                    throw new Error('API no disponible');
                                }
                                if (entityData.id && await this.entityExists('inventory_items', entityData.id)) {
                                    if (typeof API.updateInventoryItem !== 'function') {
                                        throw new Error('API.updateInventoryItem no disponible');
                                    }
                                    await API.updateInventoryItem(entityData.id, entityData);
                                } else {
                                    if (typeof API.createInventoryItem !== 'function') {
                                        throw new Error('API.createInventoryItem no disponible');
                                    }
                                    await API.createInventoryItem(entityData);
                                }
                                await DB.delete('sync_queue', item.id);
                                successCount++;
                            }
                        }
                        break;

                    case 'inventory_transfer':
                        entityData = await DB.get('inventory_transfers', item.entity_id);
                        if (entityData) {
                            try {
                                if (typeof API === 'undefined' || typeof API.createTransfer !== 'function') {
                                    throw new Error('API.createTransfer no disponible');
                                }
                                // Las transferencias siempre se crean (no se actualizan desde el frontend)
                                await API.createTransfer(entityData);
                                await DB.delete('sync_queue', item.id);
                                successCount++;
                            } catch (error) {
                                // Si falla porque ya existe, intentar actualizar
                                if (error.message && error.message.includes('ya existe')) {
                                    console.warn(`Transferencia ${item.entity_id} ya existe en servidor, saltando...`);
                                    await DB.delete('sync_queue', item.id);
                                    successCount++;
                                } else {
                                    throw error;
                                }
                            }
                        }
                        break;

                    case 'payment':
                        // Los pagos normalmente se sincronizan con las ventas
                        // Si hay un endpoint específico, se puede agregar aquí
                        // Por ahora, simplemente eliminarlos de la cola (se sincronizan con las ventas)
                        console.warn(`⚠️  Pagos se sincronizan automáticamente con las ventas, eliminando de cola: ${item.entity_id}`);
                        await DB.delete('sync_queue', item.id);
                        break;

                    case 'inventory_log':
                        // Los logs de inventario no se sincronizan al servidor (son solo locales)
                        console.warn(`⚠️  Los logs de inventario son solo locales, eliminando de cola: ${item.entity_id}`);
                        await DB.delete('sync_queue', item.id);
                        break;

                    case 'customer':
                        // Manejar eliminaciones PRIMERO
                        if (item.data === 'delete') {
                            try {
                                if (typeof API === 'undefined' || typeof API.deleteCustomer !== 'function') {
                                    throw new Error('API.deleteCustomer no disponible');
                                }
                                await API.deleteCustomer(item.entity_id);
                                await DB.delete('sync_queue', item.id);
                                // También eliminar de sync_deleted_items si existe
                                try {
                                    await DB.delete('sync_deleted_items', item.entity_id);
                                } catch (e) {
                                    // Ignorar si no existe
                                }
                                successCount++;
                            } catch (error) {
                                console.error('Error eliminando cliente en servidor:', error);
                                throw error;
                            }
                        } else {
                            // Manejar creaciones/actualizaciones
                            entityData = await DB.get('customers', item.entity_id);
                            if (entityData) {
                                try {
                                    if (typeof API === 'undefined') {
                                        throw new Error('API no disponible');
                                    }
                                    // Verificar si el cliente existe en el servidor
                                    const exists = await this.entityExists('customers', entityData.id);
                                    if (exists) {
                                        if (typeof API.updateCustomer !== 'function') {
                                            throw new Error('API.updateCustomer no disponible');
                                        }
                                        await API.updateCustomer(entityData.id, entityData);
                                    } else {
                                        if (typeof API.createCustomer !== 'function') {
                                            throw new Error('API.createCustomer no disponible');
                                        }
                                        await API.createCustomer(entityData);
                                    }
                                    await DB.delete('sync_queue', item.id);
                                    successCount++;
                                } catch (error) {
                                    console.error('Error sincronizando cliente:', error);
                                    throw error;
                                }
                            } else {
                                // Si el cliente no existe localmente y no es eliminación, eliminar de la cola
                                console.warn(`⚠️  Cliente ${item.entity_id} no encontrado localmente, eliminando de cola`);
                                await DB.delete('sync_queue', item.id);
                            }
                        }
                        break;

                    case 'repair':
                        // Manejar eliminaciones PRIMERO
                        if (item.data === 'delete') {
                            try {
                                if (typeof API === 'undefined' || typeof API.deleteRepair !== 'function') {
                                    throw new Error('API.deleteRepair no disponible');
                                }
                                await API.deleteRepair(item.entity_id);
                                await DB.delete('sync_queue', item.id);
                                // También eliminar de sync_deleted_items si existe
                                try {
                                    await DB.delete('sync_deleted_items', item.entity_id);
                                } catch (e) {
                                    // Ignorar si no existe
                                }
                                successCount++;
                            } catch (error) {
                                console.error('Error eliminando reparación en servidor:', error);
                                throw error;
                            }
                        } else {
                            // Manejar creaciones/actualizaciones
                            entityData = await DB.get('repairs', item.entity_id);
                            if (entityData) {
                                if (typeof API === 'undefined') {
                                    throw new Error('API no disponible');
                                }
                                if (entityData.id && await this.entityExists('repairs', entityData.id)) {
                                    if (!API.updateRepair) {
                                        throw new Error('API.updateRepair no disponible');
                                    }
                                    await API.updateRepair(entityData.id, entityData);
                                } else {
                                    if (!API.createRepair) {
                                        throw new Error('API.createRepair no disponible');
                                    }
                                    await API.createRepair(entityData);
                                }
                                await DB.delete('sync_queue', item.id);
                                successCount++;
                            }
                        }
                        break;

                    case 'cost':
                    case 'cost_entry': // Manejar también 'cost_entry' usado por frontend
                        // Manejar eliminaciones PRIMERO
                        if (item.data === 'delete') {
                            try {
                                if (typeof API === 'undefined' || typeof API.deleteCost !== 'function') {
                                    throw new Error('API.deleteCost no disponible');
                                }
                                await API.deleteCost(item.entity_id);
                                await DB.delete('sync_queue', item.id);
                                // También eliminar de sync_deleted_items si existe
                                try {
                                    await DB.delete('sync_deleted_items', item.entity_id);
                                } catch (e) {
                                    // Ignorar si no existe
                                }
                                successCount++;
                            } catch (error) {
                                console.error('Error eliminando costo en servidor:', error);
                                throw error;
                            }
                        } else {
                            // Manejar creaciones/actualizaciones
                            entityData = await DB.get('cost_entries', item.entity_id);
                            if (entityData) {
                                if (typeof API === 'undefined') {
                                    throw new Error('API no disponible');
                                }
                                if (entityData.id && await this.entityExists('cost_entries', entityData.id)) {
                                    if (typeof API.updateCost !== 'function') {
                                        throw new Error('API.updateCost no disponible');
                                    }
                                    await API.updateCost(entityData.id, entityData);
                                } else {
                                    if (typeof API.createCost !== 'function') {
                                        throw new Error('API.createCost no disponible');
                                    }
                                    await API.createCost(entityData);
                                }
                                await DB.delete('sync_queue', item.id);
                                successCount++;
                            }
                        }
                        break;

                    case 'employee':
                        // Manejar eliminaciones
                        if (item.data === 'delete') {
                            try {
                                if (typeof API === 'undefined' || typeof API.deleteEmployee !== 'function') {
                                    throw new Error('API.deleteEmployee no disponible');
                                }
                                await API.deleteEmployee(item.entity_id);
                                await DB.delete('sync_queue', item.id);
                                // También eliminar de sync_deleted_items si existe
                                try {
                                    await DB.delete('sync_deleted_items', item.entity_id);
                                } catch (e) {
                                    // Ignorar si no existe
                                }
                                successCount++;
                            } catch (error) {
                                console.error('Error eliminando empleado en servidor:', error);
                                throw error;
                            }
                        } else {
                            // Manejar creaciones/actualizaciones
                            entityData = await DB.get('employees', item.entity_id);
                            if (entityData) {
                                try {
                                    if (typeof API === 'undefined') {
                                        throw new Error('API no disponible');
                                    }
                                    // Verificar si el empleado existe en el servidor
                                    const exists = await this.entityExists('employees', entityData.id);
                                    if (exists) {
                                        if (typeof API.updateEmployee !== 'function') {
                                            throw new Error('API.updateEmployee no disponible');
                                        }
                                        await API.updateEmployee(entityData.id, entityData);
                                    } else {
                                        if (typeof API.createEmployee !== 'function') {
                                            throw new Error('API.createEmployee no disponible');
                                        }
                                        await API.createEmployee(entityData);
                                    }
                                    await DB.delete('sync_queue', item.id);
                                    successCount++;
                                } catch (error) {
                                    console.error('Error sincronizando empleado:', error);
                                    throw error; // Re-lanzar para que se maneje el error
                                }
                            } else {
                                // Si el empleado no existe localmente y no es eliminación, eliminar de la cola
                                console.warn(`⚠️  Empleado ${item.entity_id} no encontrado localmente, eliminando de cola`);
                                await DB.delete('sync_queue', item.id);
                            }
                        }
                        break;

                    case 'user':
                        // Manejar eliminaciones
                        if (item.data === 'delete') {
                            try {
                                if (typeof API === 'undefined' || typeof API.deleteUser !== 'function') {
                                    throw new Error('API.deleteUser no disponible');
                                }
                                await API.deleteUser(item.entity_id);
                                await DB.delete('sync_queue', item.id);
                                successCount++;
                            } catch (error) {
                                console.error('Error eliminando usuario en servidor:', error);
                                throw error;
                            }
                        } else {
                            // Manejar creaciones/actualizaciones
                            entityData = await DB.get('users', item.entity_id);
                            if (entityData) {
                                try {
                                    if (typeof API === 'undefined' || typeof API.post !== 'function') {
                                        throw new Error('API.post no disponible');
                                    }
                                    // Los usuarios se crean a través del endpoint de empleados
                                    // O se pueden crear directamente si existe el endpoint
                                    if (entityData.employee_id) {
                                        // Crear usuario para empleado
                                        await API.post(`/api/employees/${entityData.employee_id}/user`, {
                                            username: entityData.username,
                                            password: '1234', // PIN por defecto, debería cambiarse
                                            role: entityData.role
                                        });
                                    }
                                    await DB.delete('sync_queue', item.id);
                                    successCount++;
                                } catch (error) {
                                    console.error('Error sincronizando usuario:', error);
                                    throw error;
                                }
                            } else {
                                // Si el usuario no existe localmente y no es eliminación, eliminar de la cola
                                console.warn(`⚠️  Usuario ${item.entity_id} no encontrado localmente, eliminando de cola`);
                                await DB.delete('sync_queue', item.id);
                            }
                        }
                        break;

                    case 'branch':
                    case 'catalog_branch': // También manejar catalog_branch para compatibilidad
                        // Manejar eliminaciones
                        if (item.data === 'delete' || (item.data && item.data.action === 'delete')) {
                            try {
                                if (typeof API === 'undefined' || typeof API.deleteBranch !== 'function') {
                                    throw new Error('API.deleteBranch no disponible');
                                }
                                await API.deleteBranch(item.entity_id);
                                await DB.delete('sync_queue', item.id);
                                // También eliminar de IndexedDB si existe
                                try {
                                    await DB.delete('catalog_branches', item.entity_id);
                                } catch (e) {
                                    // Ignorar si no existe
                                }
                                successCount++;
                            } catch (error) {
                                console.error('Error eliminando sucursal en servidor:', error);
                                throw error;
                            }
                        } else {
                            // Manejar creaciones/actualizaciones
                            entityData = await DB.get('catalog_branches', item.entity_id);
                            if (entityData) {
                                try {
                                    if (typeof API === 'undefined') {
                                        throw new Error('API no disponible');
                                    }
                                    // Verificar si la sucursal existe en el servidor
                                    const exists = await this.entityExists('branches', entityData.id);
                                    if (exists) {
                                        if (typeof API.updateBranch !== 'function') {
                                            throw new Error('API.updateBranch no disponible');
                                        }
                                        await API.updateBranch(entityData.id, entityData);
                                    } else {
                                        if (typeof API.createBranch !== 'function') {
                                            throw new Error('API.createBranch no disponible');
                                        }
                                        await API.createBranch(entityData);
                                    }
                                    await DB.delete('sync_queue', item.id);
                                    successCount++;
                                } catch (error) {
                                    console.error('Error sincronizando sucursal:', error);
                                    throw error;
                                }
                            } else {
                                // Si la sucursal no existe localmente y no es eliminación, eliminar de la cola
                                console.warn(`⚠️  Sucursal ${item.entity_id} no encontrada localmente, eliminando de cola`);
                                await DB.delete('sync_queue', item.id);
                            }
                        }
                        break;

                    default:
                        console.warn(`⚠️  Tipo de sincronización no soportado: ${item.type}`, item);
                        // Eliminar de la cola si el tipo no está soportado
                        await DB.delete('sync_queue', item.id);
                        console.log(`🗑️  Item no soportado eliminado de la cola: ${item.type} - ${item.entity_id}`);
                        break;
                }
            } catch (error) {
                console.error(`❌ Error sincronizando ${item.type} - ${item.entity_id}:`, error);
                errorCount++;
                
                // Incrementar contador de reintentos
                item.retry_count = (item.retry_count || 0) + 1;
                await DB.put('sync_queue', item);
                
                // Si tiene muchos reintentos, eliminarlo de la cola
                if (item.retry_count >= 5) {
                    console.warn(`⚠️  Eliminando de cola después de 5 reintentos: ${item.type} - ${item.entity_id}`);
                    await DB.delete('sync_queue', item.id);
                    this.syncQueue = this.syncQueue.filter(q => q.id !== item.id);
                }
            }
        }

        // Recargar cola
        await this.loadQueue();

        // Siempre actualizar UI después de sincronizar (incluso si no hubo cambios)
        if (typeof window.SyncUI !== 'undefined' && window.SyncUI.loadStatus) {
            try {
                await window.SyncUI.loadStatus();
            } catch (uiError) {
                console.warn('Error actualizando UI de sincronización:', uiError);
            }
        }

        if (successCount > 0 || errorCount > 0) {
            console.log(`✅ Sincronización completada: ${successCount} exitosos, ${errorCount} errores`);
            
            if (successCount > 0) {
                Utils.showNotification(
                    `${successCount} elemento${successCount > 1 ? 's' : ''} sincronizado${successCount > 1 ? 's' : ''}`,
                    'success'
                );
            }
        } else if (queueSize > 0) {
            // Si había elementos pero no se sincronizaron (todos fallaron o no se procesaron)
            console.log(`⚠️ Sincronización completada pero quedan ${this.syncQueue.length} elementos en cola`);
        }

        this.isSyncing = false;
    },

    async entityExists(type, id) {
        try {
            if (!id) return false;
            
            // Verificar que API esté disponible
            if (typeof API === 'undefined' || !API.baseURL || !API.token) {
                return false;
            }
            
            switch (type) {
                case 'inventory_items':
                    if (typeof API.getInventoryItem === 'function') {
                        await API.getInventoryItem(id);
                        return true;
                    }
                    return false;
                case 'customers':
                    if (typeof API.getCustomer === 'function') {
                        await API.getCustomer(id);
                        return true;
                    }
                    return false;
                case 'repairs':
                    if (typeof API.getRepair === 'function') {
                        await API.getRepair(id);
                        return true;
                    }
                    return false;
                case 'cost_entries':
                    if (typeof API.getCost === 'function') {
                        await API.getCost(id);
                        return true;
                    }
                    return false;
                case 'employees':
                    // Verificar si el empleado existe obteniendo todos los empleados y buscando por ID
                    if (typeof API.getEmployees === 'function') {
                        const employees = await API.getEmployees();
                        return employees.some(emp => emp.id === id);
                    }
                    return false;
                case 'branches':
                    // Verificar si la sucursal existe obteniendo todas las sucursales y buscando por ID
                    if (typeof API.getBranches === 'function') {
                        const branches = await API.getBranches();
                        return branches.some(branch => branch.id === id);
                    }
                    return false;
                default:
                    return false;
            }
        } catch (error) {
            return false;
        }
    },

    getQueueSize() {
        return this.syncQueue.length;
    },

    async clearQueue() {
        try {
            const queue = await DB.getAll('sync_queue') || [];
            for (const item of queue) {
                await DB.delete('sync_queue', item.id);
            }
            this.syncQueue = [];
            console.log('🗑️  Cola de sincronización limpiada');
        } catch (error) {
            console.error('Error limpiando cola:', error);
        }
    }
};

// Exportar para uso global
window.SyncManager = SyncManager;
