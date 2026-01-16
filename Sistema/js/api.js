// API Client - Cliente para comunicación con el backend en tiempo real

const API = {
    baseURL: null,
    token: null,
    socket: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,

    async init() {
        // Cargar configuración desde settings
        try {
            const urlSetting = await DB.get('settings', 'api_url');
            const savedURL = urlSetting?.value || null;
            
            // CRÍTICO: Asegurar que la URL esté correctamente formateada
            if (savedURL) {
                // Limpiar la URL: eliminar espacios, barras finales, etc.
                let cleanURL = savedURL.trim();
                // Asegurar que tenga protocolo
                if (!cleanURL.startsWith('http://') && !cleanURL.startsWith('https://')) {
                    cleanURL = 'https://' + cleanURL;
                }
                // Asegurar que las URLs de Railway tengan .app al final si no lo tienen
                if (cleanURL.includes('railway') && !cleanURL.endsWith('.app') && !cleanURL.endsWith('.app/')) {
                    cleanURL = cleanURL.replace(/\/+$/, '') + '.app';
                }
                // Eliminar barras finales
                cleanURL = cleanURL.replace(/\/+$/, '');
                
                // Solo actualizar si cambió (para evitar loops)
                if (this.baseURL !== cleanURL) {
                    this.baseURL = cleanURL;
                    // Si la URL cambió, actualizar en DB también
                    if (cleanURL !== savedURL) {
                        await DB.put('settings', {
                            key: 'api_url',
                            value: cleanURL
                        });
                        console.log(`🔄 URL corregida y guardada: ${cleanURL}`);
                    }
                }
            } else {
                this.baseURL = null;
            }
            
            // Cargar token guardado
            this.token = localStorage.getItem('api_token');
            
            // Log para debugging (solo una vez, no repetidamente)
            if (!this._initLogShown) {
                if (!this.baseURL) {
                    console.warn('⚠️ API no configurado: Ve a Configuración → Sincronización para configurar la URL del servidor Railway');
                } else {
                    console.log(`✅ API configurado: ${this.baseURL}`);
                    if (!this.token) {
                        console.log('🔄 Sin token detectado. Intentando login automático con master_admin...');
                        
                        // Intentar login automático si no hay token
                        try {
                            const loginResult = await this.login('master_admin', '1234');
                            if (loginResult && loginResult.token) {
                                console.log('✅ Login automático exitoso. Token obtenido.');
                                this.token = loginResult.token;
                                localStorage.setItem('api_token', this.token);
                            }
                        } catch (autoLoginError) {
                            console.warn('⚠️ Login automático falló:', autoLoginError.message);
                            console.log('ℹ️ El sistema funcionará con fallback de headers (x-username/x-branch-id)');
                        }
                    } else {
                        console.log('✅ Token de autenticación encontrado');
                    }
                }
                this._initLogShown = true;
            }
            
            // Inicializar socket si hay URL y token
            if (this.baseURL && this.token) {
                try {
                    await this.initSocket();
                    console.log('✅ Socket.IO inicializado desde API.init()');
                } catch (socketError) {
                    console.error('❌ Error inicializando socket en API.init():', socketError);
                }
            }
        } catch (error) {
            console.error('Error inicializando API:', error);
        }
    },

    // Configurar URL del API
    async setBaseURL(url) {
        this.baseURL = url;
        await DB.put('settings', {
            key: 'api_url',
            value: url
        });
        
        console.log(`✅ URL del API actualizada: ${url}`);
        // Limpiar cache de health al cambiar de servidor
        this._healthCache = null;
        
        // Reinicializar socket si hay token
        if (this.token) {
            console.log('🔄 Token encontrado, inicializando socket...');
            try {
                await this.initSocket();
                console.log('✅ Socket inicializado después de actualizar URL');
            } catch (socketError) {
                console.error('❌ Error inicializando socket después de actualizar URL:', socketError);
            }
        } else {
            console.warn('⚠️ No hay token disponible. Inicia sesión para conectar el socket.');
        }
    },

    // Verificar conectividad real con el backend (sin depender de token/socket)
    // Usa cache para no spamear /health en cada render/refresh de UI.
    async checkHealth({ timeoutMs = 3000, cacheMs = 10000 } = {}) {
        try {
            if (!this.baseURL) return false;

            const now = Date.now();
            if (this._healthCache && (now - this._healthCache.ts) < cacheMs) {
                return !!this._healthCache.ok;
            }

            const cleanBaseURL = this.baseURL.replace(/\/+$/, '');
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            const res = await fetch(`${cleanBaseURL}/health`, {
                method: 'GET',
                credentials: 'include',
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const ok = !!res.ok;
            this._healthCache = { ok, ts: now };
            return ok;
        } catch (e) {
            this._healthCache = { ok: false, ts: Date.now() };
            return false;
        }
    },

    // Autenticación
    async login(username, password) {
        // Asegurar que baseURL esté sincronizado con DB
        if (!this.baseURL && typeof DB !== 'undefined') {
            try {
                const urlSetting = await DB.get('settings', 'api_url');
                this.baseURL = urlSetting?.value || null;
            } catch (error) {
                console.error('Error obteniendo URL desde DB:', error);
            }
        }
        
        if (!this.baseURL) {
            throw new Error('URL del API no configurada');
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // Timeout de 10 segundos

            // Asegurar que la URL no tenga trailing slash
            const cleanBaseURL = this.baseURL.replace(/\/$/, '');
            
            const response = await fetch(`${cleanBaseURL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                let errorMessage = 'Error al iniciar sesión';
                try {
                    const error = await response.json();
                    errorMessage = error.error || error.message || `Error ${response.status}: ${response.statusText}`;
                } catch (e) {
                    errorMessage = `Error ${response.status}: ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            this.token = data.token;
            localStorage.setItem('api_token', this.token);
            
            // Asegurar que baseURL esté configurado
            if (!this.baseURL) {
                const urlSetting = await DB.get('settings', 'api_url');
                this.baseURL = urlSetting?.value || null;
            }

            // Inicializar socket
            if (this.baseURL && this.token) {
                await this.initSocket();
            }

            return data;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Tiempo de espera agotado. El servidor no responde.');
            }
            throw error;
        }
    },

    async logout() {
        this.token = null;
        localStorage.removeItem('api_token');
        
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    },

    // Verificar token
    async verifyToken() {
        if (!this.token) {
            return false;
        }

        if (!this.baseURL) {
            return false;
        }

        try {
            const response = await fetch(`${this.baseURL}/api/auth/verify`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                // Solo borrar token si es realmente inválido (401/403).
                // En 500/timeout/red, mantener token para evitar loops de auto-login.
                if (response.status === 401 || response.status === 403) {
                    this.token = null;
                    localStorage.removeItem('api_token');
                    return false;
                }
                return null; // estado desconocido/transitorio
            }

            const data = await response.json();
            // Devolver el objeto completo si tiene user, sino solo valid
            if (data.valid && data.user) {
                return data;
            }
            return data.valid;
        } catch (error) {
            console.error('Error verificando token:', error);
            // Error de red/transitorio: no borrar token
            return null;
        }
    },

    // Inicializar Socket.IO
    async initSocket() {
        if (!this.baseURL) {
            console.warn('⚠️ No se puede inicializar socket: baseURL no configurado');
            return;
        }
        
        // Ya no requerimos token obligatorio - intentar conectar con o sin token
        console.log(`🔄 Inicializando socket con URL: ${this.baseURL}`);

        // Si ya existe una conexión activa, no crear otra
        if (this.socket && this.socket.connected) {
            console.log('ℹ️ Socket ya está conectado, reutilizando conexión');
            return;
        }

        // Desconectar socket anterior si existe pero no está conectado
        if (this.socket && !this.socket.connected) {
            console.log('ℹ️ Desconectando socket anterior antes de crear uno nuevo');
            this.socket.disconnect();
            this.socket = null;
        }

        try {
            // Importar Socket.IO dinámicamente
            if (typeof io === 'undefined') {
                // Cargar Socket.IO desde CDN si no está disponible
                await this.loadSocketIO();
            }

            // Asegurar que la URL no tenga barra final
            const cleanURL = this.baseURL.replace(/\/$/, '');
            
            console.log(`🔌 Conectando socket a: ${cleanURL}`);
            console.log(`   Token presente: ${!!this.token}`);
            
            // Preparar autenticación para Socket.IO
            const socketAuth = {};
            
            if (this.token) {
                // Si hay token, usar autenticación con token (método preferido)
                socketAuth.token = this.token;
                console.log(`   Usando autenticación con token`);
            } else {
                // Si no hay token, enviar username y branch_id
                const currentUser = typeof UserManager !== 'undefined' && UserManager.currentUser;
                const currentEmployee = typeof UserManager !== 'undefined' && UserManager.currentEmployee;
                const username = currentUser?.username || currentEmployee?.code || 'master_admin';
                
                // Obtener branch_id actual
                let branchId = null;
                if (typeof BranchManager !== 'undefined' && BranchManager.getCurrentBranchId) {
                    branchId = BranchManager.getCurrentBranchId();
                } else if (currentEmployee?.branch_id) {
                    branchId = currentEmployee.branch_id;
                } else {
                    branchId = localStorage.getItem('current_branch_id');
                }
                
                socketAuth.username = username;
                if (branchId) {
                    socketAuth.branchId = branchId;
                }
                console.log(`   Usando autenticación alternativa: username=${username}, branchId=${branchId || 'N/A'}`);
            }
            
            this.socket = io(cleanURL, {
                auth: socketAuth,
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: Infinity,
                reconnectionDelay: 2000,
                reconnectionDelayMax: 10000,
                timeout: 20000,
                forceNew: true, // Forzar nueva conexión para evitar problemas
                autoConnect: true,
                upgrade: true,
                rememberUpgrade: false, // Desactivar para evitar problemas de reconexión
                withCredentials: true
            });

            this.socket.on('connect', () => {
                console.log('✅ Conectado al servidor en tiempo real');
                this.reconnectAttempts = 0;
                
                // Actualizar estado de sincronización en todos los lugares
                if (typeof UI !== 'undefined' && UI.updateSyncStatus) {
                    UI.updateSyncStatus(true, false);
                }
                // También actualizar vía App si está disponible
                if (typeof window.App !== 'undefined' && window.App.updateTopbarStatus) {
                    window.App.updateTopbarStatus();
                }
                // Actualizar SyncUI si está disponible
                if (typeof window.SyncUI !== 'undefined' && window.SyncUI.updateSyncStatus) {
                    window.SyncUI.updateSyncStatus();
                }
                if (typeof window.SyncUI !== 'undefined' && window.SyncUI.updateServerStatus) {
                    window.SyncUI.updateServerStatus();
                }
            });

            this.socket.on('disconnect', (reason) => {
                // No loggear desconexiones esperadas (transport close, etc.)
                if (reason === 'io server disconnect' || reason === 'transport close') {
                    // Reconexión automática manejada por Socket.IO
                    return;
                }
                
                console.log(`❌ Desconectado del servidor. Razón: ${reason}`);
                
                // Actualizar estado de sincronización en todos los lugares
                if (typeof UI !== 'undefined' && UI.updateSyncStatus) {
                    UI.updateSyncStatus(false, false);
                }
                // También actualizar vía App si está disponible
                if (typeof window.App !== 'undefined' && window.App.updateTopbarStatus) {
                    window.App.updateTopbarStatus();
                }
                // Actualizar SyncUI si está disponible
                if (typeof window.SyncUI !== 'undefined' && window.SyncUI.updateSyncStatus) {
                    window.SyncUI.updateSyncStatus();
                }
                if (typeof window.SyncUI !== 'undefined' && window.SyncUI.updateServerStatus) {
                    window.SyncUI.updateServerStatus();
                }
            });

            // Manejar errores de conexión
            this.socket.on('connect_error', (error) => {
                console.error('❌ Error de conexión Socket.IO:', error.message);
                console.error('   URL intentada:', this.baseURL);
                console.error('   Token presente:', !!this.token);
                console.error('   Detalles del error:', error);
                
                // Actualizar estado de sincronización
                if (typeof UI !== 'undefined' && UI.updateSyncStatus) {
                    UI.updateSyncStatus(false, false);
                }
                if (typeof window.App !== 'undefined' && window.App.updateTopbarStatus) {
                    window.App.updateTopbarStatus();
                }
                if (typeof window.SyncUI !== 'undefined' && window.SyncUI.updateServerStatus) {
                    window.SyncUI.updateServerStatus();
                }
            });
            
            this.socket.on('reconnect', (attemptNumber) => {
                console.log(`🔄 Reconectado al servidor después de ${attemptNumber} intentos`);
            });
            
            this.socket.on('reconnect_attempt', (attemptNumber) => {
                console.log(`🔄 Intento de reconexión ${attemptNumber}...`);
            });
            
            this.socket.on('reconnect_error', (error) => {
                console.error('❌ Error al reconectar:', error.message);
            });
            
            this.socket.on('reconnect_failed', () => {
                console.error('❌ Falló la reconexión después de múltiples intentos');
                
                // Actualizar estado de sincronización
                if (typeof UI !== 'undefined' && UI.updateSyncStatus) {
                    UI.updateSyncStatus(false, false);
                }
                if (typeof window.App !== 'undefined' && window.App.updateTopbarStatus) {
                    window.App.updateTopbarStatus();
                }
                if (typeof window.SyncUI !== 'undefined' && window.SyncUI.updateServerStatus) {
                    window.SyncUI.updateServerStatus();
                }
            });

            // Escuchar actualizaciones de inventario
            this.socket.on('inventory_updated', (data) => {
                const branchId = data.branchId || data.item?.branch_id;
                console.log(`📦 Inventario actualizado en sucursal ${branchId}:`, data);
                
                // Si es master admin, emitir evento especial para todas las sucursales
                if (UserManager.currentUser?.is_master_admin) {
                    window.dispatchEvent(new CustomEvent('inventory-updated-all-branches', { detail: data }));
                }
                
                // También emitir evento normal (para usuarios normales o master admin viendo su sucursal)
                const currentBranchId = BranchManager?.getCurrentBranchId();
                if (!currentBranchId || branchId === currentBranchId || UserManager.currentUser?.is_master_admin) {
                    window.dispatchEvent(new CustomEvent('inventory-updated', { detail: data }));
                }
            });

            // Escuchar actualizaciones de ventas
            this.socket.on('sale_updated', (data) => {
                const branchId = data.branchId || data.sale?.branch_id;
                console.log(`💰 Venta actualizada en sucursal ${branchId}:`, data);
                
                // Si es master admin, emitir evento especial para todas las sucursales
                if (UserManager.currentUser?.is_master_admin) {
                    window.dispatchEvent(new CustomEvent('sale-updated-all-branches', { detail: data }));
                }
                
                // También emitir evento normal
                const currentBranchId = BranchManager?.getCurrentBranchId();
                if (!currentBranchId || branchId === currentBranchId || UserManager.currentUser?.is_master_admin) {
                    window.dispatchEvent(new CustomEvent('sale-updated', { detail: data }));
                }
            });

            // Escuchar actualizaciones de reparaciones
            this.socket.on('repair_updated', (data) => {
                const branchId = data.branchId || data.repair?.branch_id;
                console.log(`🔧 Reparación actualizada en sucursal ${branchId}:`, data);
                
                if (UserManager.currentUser?.is_master_admin) {
                    window.dispatchEvent(new CustomEvent('repair-updated-all-branches', { detail: data }));
                }
                
                const currentBranchId = BranchManager?.getCurrentBranchId();
                if (!currentBranchId || branchId === currentBranchId || UserManager.currentUser?.is_master_admin) {
                    window.dispatchEvent(new CustomEvent('repair-updated', { detail: data }));
                }
            });

            // Escuchar actualizaciones de clientes
            this.socket.on('customer_updated', (data) => {
                const branchId = data.branchId || data.customer?.branch_id;
                console.log(`👤 Cliente actualizado en sucursal ${branchId}:`, data);
                
                if (UserManager.currentUser?.is_master_admin) {
                    window.dispatchEvent(new CustomEvent('customer-updated-all-branches', { detail: data }));
                }
                
                const currentBranchId = BranchManager?.getCurrentBranchId();
                if (!currentBranchId || branchId === currentBranchId || UserManager.currentUser?.is_master_admin) {
                    window.dispatchEvent(new CustomEvent('customer-updated', { detail: data }));
                }
            });

            // Escuchar actualizaciones de transferencias
            this.socket.on('transfer_updated', (data) => {
                const branchId = data.branchId || data.transfer?.from_branch_id || data.transfer?.to_branch_id;
                console.log(`📦 Transferencia actualizada en sucursal ${branchId}:`, data);
                
                if (UserManager.currentUser?.is_master_admin) {
                    window.dispatchEvent(new CustomEvent('transfer-updated-all-branches', { detail: data }));
                }
                
                const currentBranchId = BranchManager?.getCurrentBranchId();
                const transfer = data.transfer || data;
                const isFromBranch = transfer.from_branch_id === currentBranchId;
                const isToBranch = transfer.to_branch_id === currentBranchId;
                
                if (!currentBranchId || isFromBranch || isToBranch || UserManager.currentUser?.is_master_admin) {
                    window.dispatchEvent(new CustomEvent('transfer-updated', { detail: data }));
                }
            });

            // Escuchar actualizaciones de costos
            this.socket.on('cost_updated', (data) => {
                const branchId = data.branchId || data.cost?.branch_id;
                console.log(`💵 Costo actualizado en sucursal ${branchId}:`, data);
                
                if (UserManager.currentUser?.is_master_admin) {
                    window.dispatchEvent(new CustomEvent('cost-updated-all-branches', { detail: data }));
                }
                
                const currentBranchId = BranchManager?.getCurrentBranchId();
                if (!currentBranchId || branchId === currentBranchId || UserManager.currentUser?.is_master_admin) {
                    window.dispatchEvent(new CustomEvent('cost-updated', { detail: data }));
                }
            });

            // Escuchar confirmación de suscripción a salas
            this.socket.on('joined_room', async (data) => {
                if (data.allBranches) {
                    if (data.branches && Array.isArray(data.branches)) {
                        if (data.branches.length > 0) {
                            console.log(`✅ Master admin suscrito a ${data.branches.length} sucursales:`, data.branches.map(b => b.name).join(', '));
                            
                            // Guardar sucursales en IndexedDB (secuencialmente para evitar errores)
                            if (typeof DB !== 'undefined') {
                                for (const branch of data.branches) {
                                    try {
                                        await DB.put('catalog_branches', branch);
                                    } catch (error) {
                                        console.warn(`⚠️ Error guardando sucursal ${branch.name} en IndexedDB:`, error);
                                    }
                                }
                            }
                            
                            // Notificar al módulo de branches si está cargado
                            if (typeof Branches !== 'undefined' && Branches.loadBranches) {
                                // Pequeño delay para asegurar que IndexedDB se actualizó
                                setTimeout(() => {
                                    Branches.loadBranches();
                                }, 100);
                            }
                            
                            // Actualizar selector de sucursales
                            if (typeof BranchManager !== 'undefined' && BranchManager.updateBranchSelector) {
                                setTimeout(() => {
                                    BranchManager.updateBranchSelector();
                                }, 100);
                            }
                        } else {
                            console.warn('⚠️ Master admin conectado pero no hay sucursales activas en el servidor');
                            // Aún así, intentar cargar desde API o IndexedDB
                            if (typeof Branches !== 'undefined' && Branches.loadBranches) {
                                Branches.loadBranches();
                            }
                        }
                    } else {
                        console.warn('⚠️ Master admin conectado pero datos de sucursales inválidos');
                        if (data.error) {
                            console.error('Error del servidor:', data.error);
                        }
                        // Intentar cargar desde API o IndexedDB
                        if (typeof Branches !== 'undefined' && Branches.loadBranches) {
                            Branches.loadBranches();
                        }
                    }
                }
            });
            
            // Escuchar actualizaciones de sucursales en tiempo real
            // NOTA: este handler debe ser sintácticamente válido; si falla, rompe todo `api.js`.
            this.socket.on('branch_updated', async (data) => {
                try {
                    const { action, branch } = data || {};
                    console.log(`🔄 Actualización de sucursal recibida: ${action}`, branch);

                    if (!branch || !branch.id) return;

                    // Persistir en IndexedDB
                    if (typeof DB !== 'undefined') {
                        if (action === 'deleted') {
                            try {
                                await DB.delete('catalog_branches', branch.id);
                                console.log(`✅ Sucursal ${branch.name || branch.id} eliminada de IndexedDB`);
                            } catch (error) {
                                console.warn('Error eliminando sucursal de IndexedDB:', error);
                            }
                        } else if (action === 'created' || action === 'updated') {
                            try {
                                await DB.put('catalog_branches', branch);
                                console.log(`✅ Sucursal ${branch.name || branch.id} ${action === 'created' ? 'agregada' : 'actualizada'} en IndexedDB`);
                            } catch (error) {
                                console.warn('Error guardando sucursal en IndexedDB:', error);
                            }
                        }
                    }

                    // Si la sucursal eliminada era la actual, cambiar a la principal
                    if (action === 'deleted' && typeof BranchManager !== 'undefined' && BranchManager.getCurrentBranchId) {
                        const currentBranchId = BranchManager.getCurrentBranchId();
                        if (currentBranchId === branch.id && typeof DB !== 'undefined') {
                            try {
                                const all = await DB.getAll('catalog_branches');
                                const main = all.find(b => b.code === 'MAIN') || all[0];
                                if (main && BranchManager.setCurrentBranch) {
                                    BranchManager.setCurrentBranch(main.id);
                                }
                            } catch (e) {
                                console.warn('Error re-seleccionando sucursal tras eliminación:', e);
                            }
                        }
                    }

                    // Recargar módulo de branches si está activo
                    if (typeof Branches !== 'undefined' && Branches.loadBranches && typeof UI !== 'undefined' && UI.currentModule === 'branches') {
                        console.log('🔄 Recargando módulo de sucursales...');
                        setTimeout(() => Branches.loadBranches(), 100);
                    }

                    // Actualizar selector de sucursales (siempre)
                    if (typeof BranchManager !== 'undefined' && BranchManager.updateBranchSelector) {
                        setTimeout(() => BranchManager.updateBranchSelector(), 100);
                    }
                } catch (e) {
                    console.error('Error procesando branch_updated:', e);
                }
            });

            // Para master admin: NO suscribirse manualmente, ya está suscrito a todas automáticamente
            // Para usuarios normales: suscribirse a su sucursal
            if (!UserManager.currentUser?.is_master_admin) {
                const branchId = BranchManager?.getCurrentBranchId();
                if (branchId) {
                    this.socket.emit('subscribe_inventory', { branchId });
                    this.socket.emit('subscribe_sales', { branchId });
                }
            }

        } catch (error) {
            console.error('Error inicializando Socket.IO:', error);
        }
    },

    // Cargar Socket.IO desde CDN
    async loadSocketIO() {
        return new Promise((resolve, reject) => {
            if (typeof io !== 'undefined') {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.socket.io/4.6.1/socket.io.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },

    // Helper para hacer requests autenticados
    async request(endpoint, options = {}) {
        if (!this.baseURL) {
            throw new Error('URL del API no configurada');
        }

        const url = `${this.baseURL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Resolver username + branch actual para headers auxiliares (ayuda a multisucursal, especialmente master_admin)
        const currentUser = typeof UserManager !== 'undefined' && UserManager.currentUser;
        const currentEmployee = typeof UserManager !== 'undefined' && UserManager.currentEmployee;
        const username = currentUser?.username || currentEmployee?.code || null;

        // Obtener branch_id actual (solo enviar UUID)
        const isUUID = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
        let branchId = null;
        if (typeof BranchManager !== 'undefined' && BranchManager.getCurrentBranchId) {
            branchId = BranchManager.getCurrentBranchId();
        } else if (currentEmployee?.branch_id) {
            branchId = currentEmployee.branch_id;
        } else {
            branchId = localStorage.getItem('current_branch_id');
        }
        if (branchId && !isUUID(branchId)) branchId = null;

        // Si hay token, usar autenticación con token (método preferido)
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
            // Además enviar contexto de sucursal para que master_admin filtre por sucursal seleccionada
            if (username && !headers['x-username']) headers['x-username'] = username;
            if (branchId && !headers['x-branch-id']) headers['x-branch-id'] = branchId;
        } else {
            // Si no hay token, enviar username y branch_id del usuario local
            // Esto permite que el backend identifique al usuario y filtre por sucursal
            const fallbackUsername = username || 'master_admin';
            
            // Enviar información del usuario y sucursal
            if (fallbackUsername) {
                headers['x-username'] = fallbackUsername;
            }
            if (branchId) {
                headers['x-branch-id'] = branchId;
            }
        }

        // Crear AbortController para timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos

        // Log detallado para debugging (solo para requests importantes)
        const isImportantRequest = endpoint.includes('/api/') && !endpoint.includes('/health');
        if (isImportantRequest) {
            console.log(`📤 Enviando request: ${options.method || 'GET'} ${endpoint}`);
            console.log(`   URL completa: ${url}`);
            console.log(`   Headers:`, {
                'Content-Type': headers['Content-Type'],
                'Authorization': headers['Authorization'] ? 'Presente' : 'Ausente',
                'x-username': headers['x-username'] || 'Ausente',
                'x-branch-id': headers['x-branch-id'] || 'Ausente'
            });
            console.log(`   Credentials: include`);
        }
        
        try {
            const response = await fetch(url, {
                ...options,
                headers,
                credentials: 'include', // CRÍTICO: Necesario para CORS con credenciales y headers personalizados
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            
            if (isImportantRequest) {
                console.log(`📥 Respuesta recibida: ${response.status} ${response.statusText}`);
                console.log(`   Headers CORS:`, {
                    'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
                    'Access-Control-Allow-Credentials': response.headers.get('Access-Control-Allow-Credentials')
                });
            }

            if (!response.ok) {
                if (response.status === 401) {
                    // Token expirado, pero no cerrar sesión si estamos usando fallback
                    if (this.token) {
                        console.warn('⚠️ Token expirado (401). Limpiando token...');
                        await this.logout();
                        window.location.reload();
                        return;
                    } else {
                        // Si no hay token, el 401 puede ser por otro motivo, continuar
                        console.warn('⚠️ 401 recibido sin token. Continuando...');
                    }
                }

                // Intentar leer JSON, pero si no es JSON, leer texto (rate-limit suele devolver texto).
                let errorPayload = null;
                let errorText = null;
                const contentType = response.headers.get('content-type') || '';
                if (contentType.includes('application/json')) {
                    errorPayload = await response.json().catch(() => null);
                } else {
                    errorText = await response.text().catch(() => null);
                }

                const retryAfter =
                    response.headers.get('Retry-After') ||
                    response.headers.get('Ratelimit-Reset') ||
                    response.headers.get('RateLimit-Reset');

                // Formatear mensaje de error más detallado
                let errorMsg = `Error ${response.status}`;
                if (errorPayload) {
                    if (errorPayload.error) {
                        errorMsg = errorPayload.error;
                    } else if (errorPayload.message) {
                        errorMsg = errorPayload.message;
                    } else if (errorPayload.errors && Array.isArray(errorPayload.errors)) {
                        // Si viene un array de errores de validación (express-validator)
                        errorMsg = errorPayload.errors.map(e => e.msg || e.message || JSON.stringify(e)).join(', ');
                    }
                } else if (errorText) {
                    errorMsg = errorText;
                }

                if (isImportantRequest) {
                    console.error(`❌ Error en request: ${errorMsg}`);
                    if (errorPayload && errorPayload.errors) {
                        console.error('   Detalles de validación:', errorPayload.errors);
                    }
                }

                const err = new Error(errorMsg);
                err.status = response.status;
                err.retryAfter = retryAfter; // puede venir en segundos (RateLimit-Reset) o texto
                err.url = url;
                err.endpoint = endpoint;
                err.details = errorPayload; // Incluir detalles completos del error
                throw err;
            }

            const result = await response.json();
            if (isImportantRequest) {
                console.log(`✅ Request exitoso: ${options.method || 'GET'} ${endpoint}`);
            }
            return result;
        } catch (error) {
            clearTimeout(timeoutId);
            
            // Log detallado de errores
            if (isImportantRequest) {
                console.error(`❌ Error en request ${options.method || 'GET'} ${endpoint}:`, error);
                if (error.message && error.message.includes('CORS')) {
                    console.error('   ⚠️ ERROR CORS: Verifica que ALLOWED_ORIGINS esté configurada en Railway');
                }
                if (error.message && error.message.includes('Failed to fetch')) {
                    console.error('   ⚠️ ERROR DE RED: Verifica que el backend esté funcionando y accesible');
                }
            }
            
            // Manejar errores de timeout
            if (error.name === 'AbortError') {
                throw new Error('La solicitud tardó demasiado. Verifica tu conexión a internet.');
            }
            
            throw error;
        }
    },

    // ============================================
    // MÉTODOS CRUD GENÉRICOS
    // ============================================

    // GET
    async get(endpoint, params = {}) {
        // Filtrar valores null/undefined para evitar enviarlos como string "null"
        const cleanParams = {};
        for (const [key, value] of Object.entries(params)) {
            if (value !== null && value !== undefined) {
                cleanParams[key] = value;
            }
        }
        const queryString = new URLSearchParams(cleanParams).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return await this.request(url, { method: 'GET' });
    },

    // POST
    async post(endpoint, data) {
        return await this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    // PUT
    async put(endpoint, data) {
        return await this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    // DELETE
    async delete(endpoint) {
        return await this.request(endpoint, { method: 'DELETE' });
    },

    // ============================================
    // MÉTODOS ESPECÍFICOS POR ENTIDAD
    // ============================================

    // Inventario
    async getInventoryItems(filters = {}) {
        return await this.get('/api/inventory', filters);
    },

    async getInventoryItem(id) {
        return await this.get(`/api/inventory/${id}`);
    },

    async createInventoryItem(item) {
        // Sanitizar: el backend espera UUID en branch_id; y no aceptará ids locales tipo "mke..."
        const isUUID = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
        const payload = { ...(item || {}) };
        // No mandar id local no-UUID
        if (payload.id && !isUUID(payload.id)) delete payload.id;
        // No mandar branch_id si no es UUID
        if (payload.branch_id && !isUUID(payload.branch_id)) delete payload.branch_id;
        return await this.post('/api/inventory', payload);
    },

    async updateInventoryItem(id, item) {
        return await this.put(`/api/inventory/${id}`, item);
    },

    async deleteInventoryItem(id) {
        return await this.delete(`/api/inventory/${id}`);
    },

    // Ventas
    async getSales(filters = {}) {
        return await this.get('/api/sales', filters);
    },

    async getSale(id) {
        return await this.get(`/api/sales/${id}`);
    },

    async createSale(sale) {
        return await this.post('/api/sales', sale);
    },

    async deleteSale(id) {
        return await this.delete(`/api/sales/${id}`);
    },

    // Clientes
    async getCustomers(search = '') {
        return await this.get('/api/customers', { search });
    },

    async getCustomer(id) {
        return await this.get(`/api/customers/${id}`);
    },

    async createCustomer(customer) {
        return await this.post('/api/customers', customer);
    },

    async updateCustomer(id, customer) {
        return await this.put(`/api/customers/${id}`, customer);
    },

    async deleteCustomer(id) {
        return await this.delete(`/api/customers/${id}`);
    },

    // Sucursales
    async getBranches() {
        return await this.get('/api/branches');
    },

    async getBranch(id) {
        return await this.get(`/api/branches/${id}`);
    },

    async createBranch(branch) {
        return await this.post('/api/branches', branch);
    },

    async updateBranch(id, branch) {
        return await this.put(`/api/branches/${id}`, branch);
    },

    async deleteBranch(id) {
        return await this.delete(`/api/branches/${id}`);
    },

    // Empleados
    async getEmployees() {
        return await this.get('/api/employees');
    },

    async createEmployee(employee) {
        return await this.post('/api/employees', employee);
    },

    async updateEmployee(id, employee) {
        return await this.put(`/api/employees/${id}`, employee);
    },

    async deleteEmployee(id) {
        return await this.delete(`/api/employees/${id}`);
    },

    async deleteUser(id) {
        return await this.delete(`/api/employees/user/${id}`);
    },

    // Dashboard
    async getDashboardMetrics(filters = {}) {
        return await this.get('/api/dashboard/metrics', filters);
    },

    async getAnalytics(filters = {}) {
        return await this.get('/api/dashboard/analytics', filters);
    },

    // Reportes
    async getProfitReport(filters = {}) {
        return await this.get('/api/reports/profit', filters);
    },

    // Catálogos
    async getAgencies(search = '', active = null) {
        const params = {};
        if (search) params.search = search;
        if (active !== null) params.active = active;
        return await this.get('/api/catalogs/agencies', params);
    },

    async getAgencyByBarcode(barcode) {
        return await this.get(`/api/catalogs/agencies/barcode/${barcode}`);
    },

    async createAgency(agency) {
        return await this.post('/api/catalogs/agencies', agency);
    },

    async updateAgency(id, agency) {
        return await this.put(`/api/catalogs/agencies/${id}`, agency);
    },

    async deleteAgency(id) {
        return await this.delete(`/api/catalogs/agencies/${id}`);
    },

    async getGuides(search = '', agencyId = null, active = null) {
        const params = {};
        if (search) params.search = search;
        if (agencyId) params.agency_id = agencyId;
        if (active !== null) params.active = active;
        return await this.get('/api/catalogs/guides', params);
    },

    async getGuideByBarcode(barcode) {
        return await this.get(`/api/catalogs/guides/barcode/${barcode}`);
    },

    async createGuide(guide) {
        return await this.post('/api/catalogs/guides', guide);
    },

    async updateGuide(id, guide) {
        return await this.put(`/api/catalogs/guides/${id}`, guide);
    },

    async deleteGuide(id) {
        return await this.delete(`/api/catalogs/guides/${id}`);
    },

    async getSellers(search = '', active = null) {
        const params = {};
        if (search) params.search = search;
        if (active !== null) params.active = active;
        return await this.get('/api/catalogs/sellers', params);
    },

    async getSellerByBarcode(barcode) {
        return await this.get(`/api/catalogs/sellers/barcode/${barcode}`);
    },

    async createSeller(seller) {
        return await this.post('/api/catalogs/sellers', seller);
    },

    async updateSeller(id, seller) {
        return await this.put(`/api/catalogs/sellers/${id}`, seller);
    },

    async deleteSeller(id) {
        return await this.delete(`/api/catalogs/sellers/${id}`);
    },

    // Reparaciones
    async getRepairs(filters = {}) {
        return await this.get('/api/repairs', filters);
    },

    async getRepair(id) {
        return await this.get(`/api/repairs/${id}`);
    },

    async createRepair(repair) {
        const isUUID = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
        const payload = { ...(repair || {}) };
        // no mandar ids locales no-UUID
        if (payload.id && !isUUID(payload.id)) delete payload.id;
        if (payload.branch_id && !isUUID(payload.branch_id)) delete payload.branch_id;
        if (payload.customer_id && !isUUID(payload.customer_id)) delete payload.customer_id;
        return await this.post('/api/repairs', payload);
    },

    async updateRepair(id, repair) {
        const isUUID = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
        const payload = { ...(repair || {}) };
        if (payload.id && !isUUID(payload.id)) delete payload.id;
        if (payload.branch_id && !isUUID(payload.branch_id)) delete payload.branch_id;
        if (payload.customer_id && !isUUID(payload.customer_id)) delete payload.customer_id;
        return await this.put(`/api/repairs/${id}`, payload);
    },

    async deleteRepair(id) {
        return await this.delete(`/api/repairs/${id}`);
    },

    async completeRepair(id, data) {
        return await this.post(`/api/repairs/${id}/complete`, data);
    },

    async addRepairPhoto(id, photo) {
        return await this.post(`/api/repairs/${id}/photos`, photo);
    },

    // Alias para compatibilidad
    async createRepairPhoto(id, photo) {
        return await this.addRepairPhoto(id, photo);
    },

    // Caja
    async getCashSessions(filters = {}) {
        return await this.get('/api/cash/sessions', filters);
    },

    async getCurrentCashSession() {
        return await this.get('/api/cash/sessions/current');
    },

    async getCashSession(id) {
        return await this.get(`/api/cash/sessions/${id}`);
    },

    async openCashSession(session) {
        return await this.post('/api/cash/sessions', session);
    },

    async closeCashSession(id, data) {
        return await this.put(`/api/cash/sessions/${id}/close`, data);
    },

    async addCashMovement(sessionId, movement) {
        return await this.post(`/api/cash/sessions/${sessionId}/movements`, movement);
    },

    // Transferencias
    async getTransfers(filters = {}) {
        return await this.get('/api/transfers', filters);
    },

    async getTransfer(id) {
        return await this.get(`/api/transfers/${id}`);
    },

    async completeTransfer(id) {
        return await this.put(`/api/transfers/${id}/complete`);
    },

    async cancelTransfer(id) {
        return await this.put(`/api/transfers/${id}/cancel`);
    },

    async approveTransfer(id) {
        return await this.put(`/api/transfers/${id}/approve`);
    },

    async createTransfer(transfer) {
        return await this.post('/api/transfers', transfer);
    },

    async approveTransfer(id) {
        return await this.put(`/api/transfers/${id}/approve`);
    },

    async completeTransfer(id) {
        return await this.put(`/api/transfers/${id}/complete`);
    },

    async cancelTransfer(id) {
        return await this.put(`/api/transfers/${id}/cancel`);
    },

    // Costos
    async getCosts(filters = {}) {
        return await this.get('/api/costs', filters);
    },

    async getCost(id) {
        return await this.get(`/api/costs/${id}`);
    },

    async createCost(cost) {
        const isUUID = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
        const payload = { ...(cost || {}) };
        // No mandar id local no-UUID
        if (payload.id && !isUUID(payload.id)) delete payload.id;
        // No mandar branch_id si no es UUID (evita 500 en Postgres)
        if (payload.branch_id && !isUUID(payload.branch_id)) delete payload.branch_id;
        return await this.post('/api/costs', payload);
    },

    async updateCost(id, cost) {
        const isUUID = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
        const payload = { ...(cost || {}) };
        if (payload.id && !isUUID(payload.id)) delete payload.id;
        if (payload.branch_id && !isUUID(payload.branch_id)) delete payload.branch_id;
        return await this.put(`/api/costs/${id}`, payload);
    },

    async deleteCost(id) {
        return await this.delete(`/api/costs/${id}`);
    },

    async getCostsSummary(filters = {}) {
        return await this.get('/api/costs/summary', filters);
    },

    // Reportes Turísticos
    async getTouristReports(filters = {}) {
        return await this.get('/api/tourist/reports', filters);
    },

    async getTouristReport(id) {
        return await this.get(`/api/tourist/reports/${id}`);
    },

    async createTouristReport(report) {
        return await this.post('/api/tourist/reports', report);
    },

    async updateTouristReport(id, report) {
        return await this.put(`/api/tourist/reports/${id}`, report);
    },

    async getArrivals(filters = {}) {
        return await this.get('/api/tourist/arrivals', filters);
    },

    async getArrival(id) {
        return await this.get(`/api/tourist/arrivals/${id}`);
    },

    async createArrival(arrival) {
        return await this.post('/api/tourist/arrivals', arrival);
    },

    async updateArrival(id, arrival) {
        return await this.put(`/api/tourist/arrivals/${id}`, arrival);
    },

    async getArrivalRules(filters = {}) {
        return await this.get('/api/tourist/rules', filters);
    },

    async createArrivalRule(rule) {
        return await this.post('/api/tourist/rules', rule);
    },

    // Tipos de Cambio
    async getExchangeRates(filters = {}) {
        return await this.get('/api/exchange-rates', filters);
    },

    async getExchangeRateToday() {
        return await this.get('/api/exchange-rates/today');
    },

    async getExchangeRateByDate(date) {
        return await this.get(`/api/exchange-rates/${date}`);
    },

    async setExchangeRate(data) {
        return await this.post('/api/exchange-rates', data);
    },

    // Dashboard
    async getDashboardMetrics(filters = {}) {
        return await this.get('/api/dashboard/metrics', filters);
    },

    async getAnalytics(filters = {}) {
        return await this.get('/api/dashboard/analytics', filters);
    },

    // Upload de imágenes
    async uploadImage(file, folder = 'opal-pos') {
        if (!this.baseURL || !this.token) {
            throw new Error('API no configurada');
        }

        const formData = new FormData();
        formData.append('image', file);
        formData.append('folder', folder);

        const response = await fetch(`${this.baseURL}/api/upload/image`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Error al subir imagen' }));
            throw new Error(error.error || 'Error al subir imagen');
        }

        return await response.json();
    },

    async uploadImages(files, folder = 'opal-pos') {
        if (!this.baseURL || !this.token) {
            throw new Error('API no configurada');
        }

        const formData = new FormData();
        for (const file of files) {
            formData.append('images', file);
        }
        formData.append('folder', folder);

        const response = await fetch(`${this.baseURL}/api/upload/images`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Error al subir imágenes' }));
            throw new Error(error.error || 'Error al subir imágenes');
        }

        return await response.json();
    },

    async deleteImage(publicId) {
        return await this.delete(`/api/upload/image/${publicId}`);
    }
};

// Exponer globalmente
window.API = API;
