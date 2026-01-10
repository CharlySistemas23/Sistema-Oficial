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
        
        // Intentar sincronizar al iniciar
        if (typeof API !== 'undefined' && API.baseURL && API.token) {
            await this.syncPending();
        }
        
        // Configurar intervalo de sincronización (cada 30 segundos)
        // Solo sincronizar si hay elementos pendientes
        this.syncInterval = setInterval(() => {
            if (typeof API !== 'undefined' && API.baseURL && API.token && !this.isSyncing && this.syncQueue.length > 0) {
                this.syncPending();
            }
        }, 30000);
        
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
            
            // Intentar sincronizar inmediatamente si hay conexión
            if (typeof API !== 'undefined' && API.baseURL && API.token) {
                setTimeout(() => this.syncPending(), 1000);
            }
        } catch (error) {
            console.error('Error agregando a cola de sincronización:', error);
        }
    },

    async syncPending() {
        if (this.isSyncing) {
            console.log('⏳ Sincronización ya en progreso...');
            return;
        }

        if (!API.baseURL || !API.token) {
            console.log('⚠️  API no configurada, no se puede sincronizar');
            return;
        }

        if (this.syncQueue.length === 0) {
            return;
        }

        this.isSyncing = true;
        console.log(`🔄 Sincronizando ${this.syncQueue.length} elementos pendientes...`);

        const toSync = [...this.syncQueue];
        let successCount = 0;
        let errorCount = 0;

        for (const item of toSync) {
            try {
                // Obtener datos de la entidad
                let entityData;
                switch (item.type) {
                    case 'sale':
                        entityData = await DB.get('sales', item.entity_id);
                        if (entityData) {
                            await API.createSale(entityData);
                            await DB.delete('sync_queue', item.id);
                            successCount++;
                        }
                        break;

                    case 'inventory':
                        entityData = await DB.get('inventory_items', item.entity_id);
                        if (entityData) {
                            if (entityData.id && await this.entityExists('inventory_items', entityData.id)) {
                                await API.updateInventoryItem(entityData.id, entityData);
                            } else {
                                await API.createInventoryItem(entityData);
                            }
                            await DB.delete('sync_queue', item.id);
                            successCount++;
                        }
                        break;

                    case 'customer':
                        entityData = await DB.get('customers', item.entity_id);
                        if (entityData) {
                            if (entityData.id && await this.entityExists('customers', entityData.id)) {
                                await API.updateCustomer(entityData.id, entityData);
                            } else {
                                await API.createCustomer(entityData);
                            }
                            await DB.delete('sync_queue', item.id);
                            successCount++;
                        }
                        break;

                    case 'repair':
                        entityData = await DB.get('repairs', item.entity_id);
                        if (entityData) {
                            if (entityData.id && await this.entityExists('repairs', entityData.id)) {
                                await API.updateRepair(entityData.id, entityData);
                            } else {
                                await API.createRepair(entityData);
                            }
                            await DB.delete('sync_queue', item.id);
                            successCount++;
                        }
                        break;

                    case 'cost':
                        entityData = await DB.get('cost_entries', item.entity_id);
                        if (entityData) {
                            if (entityData.id && await this.entityExists('cost_entries', entityData.id)) {
                                await API.updateCost(entityData.id, entityData);
                            } else {
                                await API.createCost(entityData);
                            }
                            await DB.delete('sync_queue', item.id);
                            successCount++;
                        }
                        break;

                    default:
                        console.warn(`⚠️  Tipo de sincronización no soportado: ${item.type}`);
                        await DB.delete('sync_queue', item.id);
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

        if (successCount > 0 || errorCount > 0) {
            console.log(`✅ Sincronización completada: ${successCount} exitosos, ${errorCount} errores`);
            
            if (successCount > 0) {
                Utils.showNotification(
                    `${successCount} elemento${successCount > 1 ? 's' : ''} sincronizado${successCount > 1 ? 's' : ''}`,
                    'success'
                );
            }
        }

        this.isSyncing = false;
    },

    async entityExists(type, id) {
        try {
            switch (type) {
                case 'inventory_items':
                    await API.getInventoryItem(id);
                    return true;
                case 'customers':
                    await API.getCustomer(id);
                    return true;
                case 'repairs':
                    await API.getRepair(id);
                    return true;
                case 'cost_entries':
                    await API.getCost(id);
                    return true;
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
