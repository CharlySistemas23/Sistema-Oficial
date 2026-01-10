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
            this.baseURL = urlSetting?.value || null;
            
            // Cargar token guardado
            this.token = localStorage.getItem('api_token');
            
            if (this.baseURL && this.token) {
                await this.initSocket();
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
        
        // Reinicializar socket si hay token
        if (this.token) {
            await this.initSocket();
        }
    },

    // Autenticación
    async login(username, password) {
        if (!this.baseURL) {
            throw new Error('URL del API no configurada');
        }

        const response = await fetch(`${this.baseURL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al iniciar sesión');
        }

        const data = await response.json();
        this.token = data.token;
        localStorage.setItem('api_token', this.token);

        // Inicializar socket
        await this.initSocket();

        return data;
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

        try {
            const response = await fetch(`${this.baseURL}/api/auth/verify`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                this.token = null;
                localStorage.removeItem('api_token');
                return false;
            }

            const data = await response.json();
            return data.valid;
        } catch (error) {
            console.error('Error verificando token:', error);
            return false;
        }
    },

    // Inicializar Socket.IO
    async initSocket() {
        if (!this.baseURL || !this.token) {
            return;
        }

        try {
            // Importar Socket.IO dinámicamente
            if (typeof io === 'undefined') {
                // Cargar Socket.IO desde CDN si no está disponible
                await this.loadSocketIO();
            }

            const socketURL = this.baseURL.replace(/^http/, 'ws');
            this.socket = io(this.baseURL, {
                auth: {
                    token: this.token
                },
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: this.maxReconnectAttempts,
                reconnectionDelay: 1000
            });

            this.socket.on('connect', () => {
                console.log('✅ Conectado al servidor en tiempo real');
                this.reconnectAttempts = 0;
                UI.updateSyncStatus(true, false);
            });

            this.socket.on('disconnect', () => {
                console.log('❌ Desconectado del servidor');
                UI.updateSyncStatus(false, false);
            });

            this.socket.on('connect_error', (error) => {
                console.error('Error de conexión:', error);
                this.reconnectAttempts++;
                
                if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    UI.updateSyncStatus(false, false);
                }
            });

            // Escuchar actualizaciones de inventario
            this.socket.on('inventory_updated', (data) => {
                console.log('📦 Inventario actualizado:', data);
                window.dispatchEvent(new CustomEvent('inventory-updated', { detail: data }));
            });

            // Escuchar actualizaciones de ventas
            this.socket.on('sale_updated', (data) => {
                console.log('💰 Venta actualizada:', data);
                window.dispatchEvent(new CustomEvent('sale-updated', { detail: data }));
            });

            // Suscribirse a eventos según la sucursal actual
            const branchId = BranchManager?.getCurrentBranchId();
            if (branchId) {
                this.socket.emit('subscribe_inventory', { branchId });
                this.socket.emit('subscribe_sales', { branchId });
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

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        // Crear AbortController para timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos

        try {
            const response = await fetch(url, {
                ...options,
                headers,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                if (response.status === 401) {
                    // Token expirado, cerrar sesión
                    await this.logout();
                    window.location.reload();
                    return;
                }

                const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
                throw new Error(error.error || `Error ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            
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
        const queryString = new URLSearchParams(params).toString();
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

    // Sucursales
    async getBranches() {
        return await this.get('/api/branches');
    },

    async getBranch(id) {
        return await this.get(`/api/branches/${id}`);
    },

    // Inventario
    async getInventoryItems(filters = {}) {
        return await this.get('/api/inventory', filters);
    },

    async getInventoryItem(id) {
        return await this.get(`/api/inventory/${id}`);
    },

    async createInventoryItem(item) {
        return await this.post('/api/inventory', item);
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

    // Clientes
    async getCustomers(search = '') {
        return await this.get('/api/customers', { search });
    },

    async createCustomer(customer) {
        return await this.post('/api/customers', customer);
    },

    // Empleados
    async getEmployees() {
        return await this.get('/api/employees');
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
        return await this.post('/api/repairs', repair);
    },

    async updateRepair(id, repair) {
        return await this.put(`/api/repairs/${id}`, repair);
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
        return await this.post('/api/costs', cost);
    },

    async updateCost(id, cost) {
        return await this.put(`/api/costs/${id}`, cost);
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
