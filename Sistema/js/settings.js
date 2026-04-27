// Settings Module

const Settings = {
    initialized: false,
    
    async init() {
        try {
            if (this.initialized) return;
            this.setupUI();
            await this.loadSettings();
            
            // Escuchar eventos de sincronización para actualizar el estado
            window.addEventListener('sync-completed', async () => {
                // Si estamos en la pestaña de sincronización, recargar el estado
                const activeTab = document.querySelector('#settings-tabs .tab-btn.active')?.dataset.tab;
                if (activeTab === 'sync') {
                    await this.loadSyncStatus();
                }
            });
            this.initialized = true;
        } catch (error) {
            console.error('❌ Error inicializando módulo Settings:', error);
            this.initialized = true; // Marcar como inicializado para evitar loops infinitos
            const content = document.getElementById('module-content');
            if (content) {
                content.innerHTML = `
                    <div style="padding: var(--spacing-lg); text-align: center;">
                        <h3 style="color: var(--color-danger);">Error al cargar módulo Settings</h3>
                        <p style="color: var(--color-text-secondary); margin-top: var(--spacing-md);">
                            ${error.message || 'Error desconocido'}
                        </p>
                        <p style="color: var(--color-danger); font-size: 12px; margin-top: var(--spacing-sm);">
                            Por favor, abre la consola del navegador (F12) para ver más detalles.
                        </p>
                        <button class="btn-primary" onclick="location.reload()" style="margin-top: var(--spacing-md);">
                            Recargar página
                        </button>
                    </div>
                `;
            }
        }
    },

    setupUI() {
        const content = document.getElementById('module-content');
        if (!content) return;

        content.innerHTML = `
            <div class="settings-module-wrapper">
                <!-- Pestañas principales -->
                <div id="settings-main-tabs" class="settings-main-tabs">
                    <button class="settings-main-tab active" data-tab="general">
                        <i class="fas fa-cog"></i> General
                    </button>
                    <button class="settings-main-tab" data-tab="printing">
                        <i class="fas fa-print"></i> Impresión
                    </button>
                    <button class="settings-main-tab" data-tab="financial">
                        <i class="fas fa-dollar-sign"></i> Financiero
                    </button>
                    <button class="settings-main-tab" data-tab="branches">
                        <i class="fas fa-store"></i> Sucursales
                    </button>
                    <button class="settings-main-tab" data-tab="catalogs">
                        <i class="fas fa-book"></i> Catálogos
                    </button>
                    <button class="settings-main-tab" data-tab="security">
                        <i class="fas fa-shield-alt"></i> Seguridad
                    </button>
                    <button class="settings-main-tab" data-tab="system">
                        <i class="fas fa-server"></i> Sistema
                    </button>
                </div>

                <!-- Subcategorías (se actualizan dinámicamente) -->
                <div id="settings-sub-tabs" class="settings-sub-tabs"></div>

                <!-- Contenido de las pestañas -->
                <div id="settings-content" class="settings-content-wrapper"></div>
            </div>
        `;

        // Event listeners para pestañas principales
        document.querySelectorAll('#settings-main-tabs .settings-main-tab').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remover active de todos los botones
                document.querySelectorAll('#settings-main-tabs .settings-main-tab').forEach(b => b.classList.remove('active'));
                // Agregar active al botón clickeado
                btn.classList.add('active');
                const tab = btn.dataset.tab;
                this.loadTab(tab);
            });
        });

        // Cargar pestaña inicial
        this.loadTab('general');
    },

    // Definir subcategorías para cada pestaña
    getSubCategories(tab) {
        const subCategories = {
            'general': [
                { id: 'appearance', label: 'Apariencia', icon: 'fa-palette' },
                { id: 'notifications', label: 'Notificaciones', icon: 'fa-bell' }
            ],
            'printing': [
                { id: 'tickets', label: 'Tickets / Recibos', icon: 'fa-receipt' },
                { id: 'jewelry-labels', label: 'Etiquetas de Joyas', icon: 'fa-gem' }
            ],
            'financial': [
                { id: 'taxes', label: 'Impuestos', icon: 'fa-receipt' },
                { id: 'bank-commissions', label: 'Comisiones Bancarias', icon: 'fa-credit-card' },
                { id: 'exchange-rates', label: 'Tipos de Cambio', icon: 'fa-exchange-alt' }
            ],
            // Sucursales: una sola vista (lista + asignar empleados desde modales)
            'branches': [],
            'catalogs': [
                { id: 'agencies', label: 'Agencias', icon: 'fa-building' },
                { id: 'sellers', label: 'Vendedores', icon: 'fa-user-tag' },
                { id: 'guides', label: 'Guías', icon: 'fa-suitcase' },
                { id: 'arrival-rules', label: 'Reglas de Llegadas', icon: 'fa-table' }
            ],
            'security': [
                { id: 'pin', label: 'Mi PIN', icon: 'fa-key' },
                { id: 'permissions', label: 'Permisos', icon: 'fa-user-shield' },
                { id: 'company-code', label: 'Código de Empresa', icon: 'fa-building' }
            ],
            'system': [
                { id: 'server', label: 'Servidor', icon: 'fa-server' },
                { id: 'backups', label: 'Respaldos', icon: 'fa-database' },
                { id: 'info', label: 'Información', icon: 'fa-info-circle' }
            ]
        };
        return subCategories[tab] || [];
    },

    // Actualizar subcategorías
    updateSubCategories(tab) {
        const subTabsContainer = document.getElementById('settings-sub-tabs');
        if (!subTabsContainer) return;

        const subCategories = this.getSubCategories(tab);
        
        if (subCategories.length === 0) {
            subTabsContainer.innerHTML = '';
            subTabsContainer.style.display = 'none';
            return;
        }

        subTabsContainer.style.display = 'flex';
        subTabsContainer.innerHTML = subCategories.map((sub, index) => `
            <button class="settings-sub-tab ${index === 0 ? 'active' : ''}" data-sub-tab="${sub.id}">
                <i class="fas ${sub.icon}"></i> ${sub.label}
            </button>
        `).join('');

        // Event listeners para subcategorías
        document.querySelectorAll('#settings-sub-tabs .settings-sub-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#settings-sub-tabs .settings-sub-tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const subTab = btn.dataset.subTab;
                this.loadSubTab(tab, subTab);
            });
        });

        // Cargar primera subcategoría por defecto
        if (subCategories.length > 0) {
            this.loadSubTab(tab, subCategories[0].id);
        }
    },

    async loadTab(tab) {
        const content = document.getElementById('settings-content');
        if (!content) return;

        // Actualizar subcategorías
        this.updateSubCategories(tab);

        // Si no hay subcategorías, cargar contenido directamente
        const subCategories = this.getSubCategories(tab);
        if (subCategories.length === 0) {
            await this.loadTabContent(tab, null);
        }

        await this.loadSettings();
    },

    async loadSubTab(mainTab, subTab) {
        await this.loadTabContent(mainTab, subTab);
    },

    async loadTabContent(mainTab, subTab) {
        const content = document.getElementById('settings-content');
        if (!content) return;

        const wireServerEvents = () => setTimeout(() => {
            const saveBtn = document.getElementById('save-server-url-btn');
            const testBtn = document.getElementById('test-server-connection-btn');
            const urlInput = document.getElementById('server-url-input');
            if (saveBtn) saveBtn.addEventListener('click', () => this.saveServerURL());
            if (testBtn) testBtn.addEventListener('click', () => this.testServerConnection());
            if (urlInput) {
                urlInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.saveServerURL();
                });
            }
        }, 100);

        const wireBackupEvents = () => setTimeout(() => {
            const createBtn = document.getElementById('backup-create-btn');
            const importBtn = document.getElementById('backup-import-btn');
            const selectBtn = document.getElementById('backup-select-folder-btn');
            const clearBtn = document.getElementById('backup-clear-folder-btn');
            if (createBtn) createBtn.onclick = () => this.createBackupManually();
            if (importBtn) importBtn.onclick = () => this.importBackupManually();
            if (selectBtn) selectBtn.onclick = () => this.selectBackupFolder();
            if (clearBtn) clearBtn.onclick = () => this.clearBackupFolder();
        }, 100);

        switch(mainTab) {
            case 'general':
                if (subTab === 'notifications') {
                    content.innerHTML = this.getGeneralNotificationsTab();
                } else {
                    content.innerHTML = this.getGeneralAppearanceTab();
                }
                break;
            case 'printing':
                if (subTab === 'jewelry-labels') {
                    content.innerHTML = this.getPrintingJewelryLabelsTab();
                } else {
                    content.innerHTML = this.getPrintingTicketsTab();
                }
                await this.updateJewelryLabelStatus();
                break;
            case 'financial':
                if (subTab === 'bank-commissions') {
                    content.innerHTML = this.getFinancialBankCommissionsTab();
                } else if (subTab === 'exchange-rates') {
                    content.innerHTML = this.getFinancialExchangeRatesTab();
                } else {
                    content.innerHTML = this.getFinancialTaxesTab();
                }
                break;
            case 'branches':
                content.innerHTML = this.getBranchesTab();
                break;
            case 'catalogs':
                if (subTab === 'sellers') {
                    content.innerHTML = this.getCatalogSellersTab();
                } else if (subTab === 'guides') {
                    content.innerHTML = this.getCatalogGuidesTab();
                } else if (subTab === 'arrival-rules') {
                    content.innerHTML = this.getArrivalRatesTab();
                    await this.loadArrivalRates();
                } else {
                    content.innerHTML = this.getCatalogAgenciesTab();
                }
                break;
            case 'security':
                if (subTab === 'permissions') {
                    content.innerHTML = this.getSecurityPermissionsTab();
                } else if (subTab === 'company-code') {
                    content.innerHTML = this.getSecurityCompanyCodeTab();
                } else {
                    content.innerHTML = this.getSecurityPinTab();
                }
                break;
            case 'system':
                if (subTab === 'backups') {
                    content.innerHTML = this.getSystemBackupsTab();
                    await this.loadBackupsList();
                    this.loadBackupDirectoryInfo();
                    wireBackupEvents();
                } else if (subTab === 'info') {
                    content.innerHTML = this.getSystemInfoTab();
                    await this.loadSystemInfo();
                    await this.loadDatabaseStats();
                } else {
                    content.innerHTML = this.getSystemServerTab();
                    await this.loadSyncTab();
                    wireServerEvents();
                }
                break;
        }
    },

    getGeneralTab() {
        return this.getGeneralAppearanceTab();
    },

    getGeneralAppearanceTab() {
        return `
            <div class="settings-section">
                <h3 class="settings-section-title"><i class="fas fa-palette"></i> Apariencia</h3>
                <div class="settings-form-grid">
                    <div class="form-group">
                        <label>Tema</label>
                        <select id="setting-theme" class="form-select">
                            <option value="light">Claro</option>
                            <option value="dark">Oscuro</option>
                            <option value="auto">Automático</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Idioma</label>
                        <select id="setting-language" class="form-select">
                            <option value="es">Español</option>
                            <option value="en">English</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Formato de Fecha</label>
                        <select id="setting-date-format" class="form-select">
                            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        </select>
                    </div>
                </div>
                <div class="settings-section-footer">
                    <button class="btn-primary" onclick="window.Settings.saveAppearance()">
                        <i class="fas fa-save"></i> Guardar Apariencia
                    </button>
                </div>
            </div>
        `;
    },

    getGeneralNotificationsTab() {
        return `
            <div class="settings-section">
                <h3 class="settings-section-title"><i class="fas fa-bell"></i> Notificaciones</h3>
                <div class="settings-form-grid">
                    <div class="form-group">
                        <label style="display: flex; align-items: center; gap: var(--spacing-sm);">
                            <input type="checkbox" id="setting-notify-sales" checked>
                            <span>Notificar nuevas ventas</span>
                        </label>
                    </div>
                    <div class="form-group">
                        <label style="display: flex; align-items: center; gap: var(--spacing-sm);">
                            <input type="checkbox" id="setting-notify-low-stock" checked>
                            <span>Alertar inventario bajo</span>
                        </label>
                    </div>
                    <div class="form-group">
                        <label style="display: flex; align-items: center; gap: var(--spacing-sm);">
                            <input type="checkbox" id="setting-notify-sync" checked>
                            <span>Notificar sincronizaciones</span>
                        </label>
                    </div>
                    <div class="form-group">
                        <label>Umbral de Inventario Bajo</label>
                        <input type="number" id="setting-low-stock-threshold" class="form-input" value="10" step="1" min="1">
                    </div>
                </div>
                <div class="settings-section-footer">
                    <button class="btn-primary" onclick="window.Settings.saveNotifications()">
                        <i class="fas fa-save"></i> Guardar Notificaciones
                    </button>
                </div>
            </div>
        `;
    },

    getPrintingTab() {
        return this.getPrintingTicketsTab();
    },

    getPrintingTicketsTab() {
        return `
            <div class="settings-section">
                <h3 class="settings-section-title"><i class="fas fa-receipt"></i> Tickets / Recibos - GP-5838 SERIES</h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--spacing-md);">
                <!-- MÓDULO: TICKETS / RECIBOS -->
                <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border-light);">
                    <h3 style="margin-bottom: var(--spacing-md); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; justify-content: space-between;">
                        <span><i class="fas fa-receipt"></i> Tickets / Recibos - GP-5838 SERIES</span>
                        <span id="printer-status-badge" class="printer-status-badge disconnected">
                            <i class="fas fa-circle"></i> Desconectada
                        </span>
                    </h3>
                    
                    <!-- Información de la impresora -->
                    <div style="background: linear-gradient(135deg, rgba(26, 26, 26, 0.05) 0%, rgba(26, 26, 26, 0.02) 100%); border-left: 3px solid var(--color-primary); padding: var(--spacing-sm) var(--spacing-md); border-radius: var(--radius-sm); margin-bottom: var(--spacing-md);">
                        <div style="display: flex; align-items: start; gap: var(--spacing-sm); font-size: 11px; color: var(--color-text-secondary);">
                            <i class="fas fa-info-circle" style="color: var(--color-primary); margin-top: 2px;"></i>
                            <div>
                                <div style="font-weight: 600; margin-bottom: 4px;"><strong>GP-5838 SERIES</strong> - Impresora térmica 58mm</div>
                                <div style="font-size: 10px; line-height: 1.4;">
                                    <strong>Requisitos:</strong> Chrome o Edge (versión 89+), impresora encendida, cable USB conectado. 
                                    Al conectar, selecciona manualmente tu impresora en la lista de dispositivos.
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Estado de conexión -->
                    <div id="printer-connection-panel" style="background: var(--color-bg-secondary); border-radius: var(--radius-sm); padding: var(--spacing-md); margin-bottom: var(--spacing-md); border: 1px solid var(--color-border-light);">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--spacing-sm);">
                            <div>
                                <div style="font-weight: 600; font-size: 12px; margin-bottom: 2px;">Estado de la Impresora</div>
                                <div id="printer-connection-info" style="font-size: 11px; color: var(--color-text-secondary);">No conectada</div>
                            </div>
                            <div style="display: flex; gap: var(--spacing-xs);">
                                <button class="btn-primary btn-sm" id="btn-connect-printer" onclick="window.Settings.connectPrinter()">
                                    <i class="fas fa-plug"></i> Conectar
                                </button>
                                <button class="btn-secondary btn-sm" id="btn-disconnect-printer" onclick="window.Settings.disconnectPrinter()" style="display: none;">
                                    <i class="fas fa-unlink"></i> Desconectar
                                </button>
                            </div>
                        </div>
                        <div id="printer-last-activity" style="font-size: 10px; color: var(--color-text-tertiary);">
                            Última actividad: -
                        </div>
                    </div>

                    <!-- Configuración en dos columnas -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
                        <!-- Columna izquierda: Configuración de Hardware -->
                        <div>
                            <div style="font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-secondary); margin-bottom: var(--spacing-sm); padding-bottom: var(--spacing-xs); border-bottom: 1px solid var(--color-border-light);">
                                <i class="fas fa-cog"></i> Hardware
                            </div>
                            <div class="form-group">
                                <label>Modelo de Impresora</label>
                                <select id="setting-printer-model" class="form-select" onchange="window.Settings.onPrinterModelChange()">
                                    <option value="GP-5838">GP-5838 SERIES (Recomendado)</option>
                                    <option value="GP-5830">GP-5830 Series</option>
                                    <option value="EC-58110">EC Line 58110</option>
                                    <option value="GP-5830II">GP-5830II</option>
                                    <option value="custom">Personalizada</option>
                                </select>
                            </div>
                            <div class="form-group" id="printer-name-custom" style="display: none;">
                                <label>Nombre de Impresora (Personalizada)</label>
                                <input type="text" id="setting-printer-name" class="form-input" placeholder="Ej: EC Line 58110">
                            </div>
                            <div class="form-group" id="printer-port-info" style="padding: var(--spacing-sm); background: var(--color-bg-secondary); border-radius: var(--radius-xs); font-size: 10px; color: var(--color-text-secondary); border-left: 3px solid var(--color-border);">
                                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                                    <i class="fas fa-usb"></i> 
                                    <span id="printer-port-status" style="font-weight: 600;">Puerto USB: No conectado</span>
                                </div>
                                <div style="margin-top: 6px; padding: 6px; background: rgba(26, 26, 26, 0.05); border-radius: var(--radius-xs); font-size: 9px; color: var(--color-text-tertiary); line-height: 1.4;">
                                    <i class="fas fa-info-circle"></i> <strong>Consejo:</strong> Al hacer clic en "Conectar", se abrirá una ventana para seleccionar tu impresora. Busca "GP-5838" o cualquier puerto USB (como USB004). Si no aparece, verifica que la impresora esté encendida y el cable USB bien conectado.
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Velocidad de Comunicación (Baud Rate)</label>
                                <select id="setting-printer-baud" class="form-select">
                                    <option value="9600">9600 baud (Recomendado)</option>
                                    <option value="19200">19200 baud</option>
                                    <option value="38400">38400 baud</option>
                                    <option value="57600">57600 baud</option>
                                    <option value="115200">115200 baud</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Ancho de Papel</label>
                                <select id="setting-printer-width" class="form-select">
                                    <option value="58">58mm (32 caracteres)</option>
                                    <option value="80">80mm (48 caracteres)</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Densidad de Impresión</label>
                                <select id="setting-printer-density" class="form-select">
                                    <option value="low">Baja (Ahorra tinta)</option>
                                    <option value="medium" selected>Media</option>
                                    <option value="high">Alta (Mejor calidad)</option>
                                </select>
                            </div>
                        </div>
                        
                        <!-- Columna derecha: Configuración de Ticket -->
                        <div>
                            <div style="font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-secondary); margin-bottom: var(--spacing-sm); padding-bottom: var(--spacing-xs); border-bottom: 1px solid var(--color-border-light);">
                                <i class="fas fa-receipt"></i> Formato de Ticket
                            </div>
                            <div class="form-group">
                                <label>Estilo de Ticket</label>
                                <select id="setting-ticket-format" class="form-select">
                                    <option value="standard">Estándar - Completo</option>
                                    <option value="compact">Compacto - Resumido</option>
                                    <option value="detailed">Detallado - Con descripción</option>
                                    <option value="minimal">Mínimo - Solo totales</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Copias por Venta</label>
                                <select id="setting-ticket-copies" class="form-select">
                                    <option value="1">1 copia</option>
                                    <option value="2">2 copias</option>
                                    <option value="3">3 copias</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Corte de Papel</label>
                                <select id="setting-paper-cut" class="form-select">
                                    <option value="full">Corte completo</option>
                                    <option value="partial">Corte parcial</option>
                                    <option value="none">Sin corte</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Líneas de Avance Después del Corte</label>
                                <input type="number" id="setting-feed-lines" class="form-input" value="3" min="0" max="10">
                            </div>
                        </div>
                    </div>

                    <!-- Opciones adicionales -->
                    <div style="margin-top: var(--spacing-md); padding-top: var(--spacing-md); border-top: 1px solid var(--color-border-light);">
                        <div style="font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-secondary); margin-bottom: var(--spacing-sm);">
                            <i class="fas fa-sliders-h"></i> Opciones del Ticket
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing-sm);">
                            <label style="display: flex; align-items: center; gap: var(--spacing-xs); padding: var(--spacing-xs); background: var(--color-bg-secondary); border-radius: var(--radius-xs); cursor: pointer; font-size: 11px;">
                                <input type="checkbox" id="setting-print-logo" checked>
                                <span><i class="fas fa-image"></i> Imprimir Logo</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: var(--spacing-xs); padding: var(--spacing-xs); background: var(--color-bg-secondary); border-radius: var(--radius-xs); cursor: pointer; font-size: 11px;">
                                <input type="checkbox" id="setting-print-barcode">
                                <span><i class="fas fa-barcode"></i> Código de Barras</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: var(--spacing-xs); padding: var(--spacing-xs); background: var(--color-bg-secondary); border-radius: var(--radius-xs); cursor: pointer; font-size: 11px;">
                                <input type="checkbox" id="setting-print-qr">
                                <span><i class="fas fa-qrcode"></i> Código QR</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: var(--spacing-xs); padding: var(--spacing-xs); background: var(--color-bg-secondary); border-radius: var(--radius-xs); cursor: pointer; font-size: 11px;">
                                <input type="checkbox" id="setting-auto-print" checked>
                                <span><i class="fas fa-magic"></i> Auto-imprimir</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: var(--spacing-xs); padding: var(--spacing-xs); background: var(--color-bg-secondary); border-radius: var(--radius-xs); cursor: pointer; font-size: 11px;">
                                <input type="checkbox" id="setting-print-footer" checked>
                                <span><i class="fas fa-comment"></i> Pie de Página</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: var(--spacing-xs); padding: var(--spacing-xs); background: var(--color-bg-secondary); border-radius: var(--radius-xs); cursor: pointer; font-size: 11px;">
                                <input type="checkbox" id="setting-print-duplicate">
                                <span><i class="fas fa-copy"></i> Copia Cliente</span>
                            </label>
                        </div>
                    </div>

                    <!-- Personalización del encabezado -->
                    <div style="margin-top: var(--spacing-md); padding-top: var(--spacing-md); border-top: 1px solid var(--color-border-light);">
                        <div style="font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-secondary); margin-bottom: var(--spacing-sm);">
                            <i class="fas fa-heading"></i> Personalización del Ticket
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
                            <div class="form-group">
                                <label>Nombre del Negocio</label>
                                <input type="text" id="setting-business-name" class="form-input" value="OPAL & CO" placeholder="Nombre de tu negocio">
                            </div>
                            <div class="form-group">
                                <label>Teléfono</label>
                                <input type="text" id="setting-business-phone" class="form-input" placeholder="+52 123 456 7890">
                            </div>
                            <div class="form-group" style="grid-column: span 2;">
                                <label>Dirección</label>
                                <input type="text" id="setting-business-address" class="form-input" placeholder="Dirección del negocio">
                            </div>
                            <div class="form-group" style="grid-column: span 2;">
                                <label>Mensaje de Pie de Página</label>
                                <textarea id="setting-ticket-footer" class="form-textarea" rows="2" placeholder="Ej: ¡Gracias por su compra! Visítenos pronto.">Gracias por su compra</textarea>
                            </div>
                        </div>
                    </div>

                    <!-- Botones de acción -->
                    <div style="margin-top: var(--spacing-md); padding-top: var(--spacing-md); border-top: 1px solid var(--color-border-light); display: flex; gap: var(--spacing-sm); flex-wrap: wrap;">
                        <button class="btn-secondary btn-sm" onclick="window.Settings.testPrinter()" style="flex: 1;">
                            <i class="fas fa-print"></i> Imprimir Prueba
                        </button>
                        <button class="btn-secondary btn-sm" onclick="window.Settings.previewTicket()" style="flex: 1;">
                            <i class="fas fa-eye"></i> Vista Previa
                        </button>
                        <button class="btn-secondary btn-sm" onclick="window.Settings.resetPrinterSettings()" style="flex: 1;">
                            <i class="fas fa-undo"></i> Restablecer
                        </button>
                        <button class="btn-primary btn-sm" onclick="window.Settings.savePrinterSettings()" style="flex: 1;">
                            <i class="fas fa-save"></i> Guardar Configuración de Tickets
                        </button>
                    </div>
                </div>
                </div>
            </div>
        `;
    },

    // Sub-tab Etiquetas de Joyas. Antes este tab no existia (la funcion se
    // llamaba pero estaba undefined => tab vacio al cambiar). Ahora encapsula
    // SOLO la seccion de plantilla de joyas (la de tickets quedo separada arriba).
    getPrintingJewelryLabelsTab() {
        return `
            <div class="settings-section">
                <h3 class="settings-section-title"><i class="fas fa-gem" style="color: #ff6b9d;"></i> Etiquetas de Joyas - RIEBEC RT-320-PB</h3>

                <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border-light); border-left: 4px solid #ff6b9d; max-width: 800px;">
                    <div style="background: linear-gradient(135deg, rgba(255, 107, 157, 0.1) 0%, rgba(255, 107, 157, 0.05) 100%); border-left: 3px solid #ff6b9d; padding: var(--spacing-sm) var(--spacing-md); border-radius: var(--radius-sm); margin-bottom: var(--spacing-md);">
                        <div style="display: flex; align-items: start; gap: var(--spacing-sm); font-size: 11px; color: var(--color-text-secondary);">
                            <i class="fas fa-info-circle" style="color: #ff6b9d; margin-top: 2px;"></i>
                            <div>
                                <div style="font-weight: 600; margin-bottom: 4px; color: var(--color-text-primary);"><strong>RIEBEC RT-320-PB</strong> - Impresora de etiquetas 63x11mm</div>
                                <div style="font-size: 10px; line-height: 1.4;">
                                    Configura libremente la posicion del codigo de barras y nombre del producto en la etiqueta.
                                    <br><strong>Tamano de etiqueta:</strong> 63mm x 11mm.
                                    <br><strong>Uso:</strong> Configura una vez y usa desde Inventario con el boton "Etiqueta Joya".
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="jewelry-label-status" style="background: var(--color-bg-secondary); border-radius: var(--radius-sm); padding: var(--spacing-md); margin-bottom: var(--spacing-md); border: 1px solid var(--color-border-light);">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <div>
                                <div style="font-weight: 600; font-size: 12px; margin-bottom: 2px;">Estado de la Plantilla</div>
                                <div id="jewelry-template-status-text" style="font-size: 11px; color: var(--color-text-secondary);">No configurada</div>
                            </div>
                            <button class="btn-primary btn-sm" onclick="window.Settings.configureJewelryLabel()">
                                <i class="fas fa-cog"></i> Configurar Etiqueta
                            </button>
                        </div>
                    </div>

                    <div style="background: #fff3cd; padding: 12px; border-radius: var(--radius-md); margin-bottom: var(--spacing-md); border-left: 4px solid #ffc107;">
                        <p style="margin: 0; font-size: 12px; color: #856404;">
                            <i class="fas fa-lightbulb"></i>
                            <strong>Consejo:</strong> Configura la plantilla una vez y luego usa el boton <i class="fas fa-gem"></i> "Etiqueta Joya" en el modulo de Inventario para imprimir directamente.
                        </p>
                    </div>

                    <div style="display: flex; gap: var(--spacing-sm); flex-wrap: wrap; margin-top: var(--spacing-md); padding-top: var(--spacing-md); border-top: 1px solid var(--color-border-light);">
                        <button class="btn-secondary btn-sm" onclick="window.Settings.configureJewelryLabel()" style="flex: 1;">
                            <i class="fas fa-edit"></i> Editar Plantilla
                        </button>
                        <button class="btn-secondary btn-sm" onclick="window.Settings.testJewelryLabel()" style="flex: 1;">
                            <i class="fas fa-print"></i> Imprimir Prueba
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    getSyncTab() {
        return this.getSyncServerTab();
    },

    getSyncServerTab() {
        return `
            <div class="settings-section">
                <h3 class="settings-section-title"><i class="fas fa-server"></i> Servidor Centralizado</h3>
                <div class="settings-form-grid">
                    <div class="form-group" style="grid-column: 1 / -1;">
                        <label>URL del Servidor</label>
                        <input type="url" id="server-url-input" class="form-input" 
                               placeholder="https://tu-app.railway.app">
                        <small style="color: var(--color-text-secondary); font-size: 11px; display: block; margin-top: 6px;">
                            <i class="fas fa-info-circle"></i> Ejemplo: https://sistema-oficial-production.up.railway.app
                        </small>
                    </div>
                </div>
                <div style="display: flex; gap: var(--spacing-sm); margin-bottom: var(--spacing-md);">
                    <button class="btn-primary" id="save-server-url-btn">
                        <i class="fas fa-save"></i> Guardar
                    </button>
                    <button class="btn-secondary" id="test-server-connection-btn">
                        <i class="fas fa-plug"></i> Probar Conexión
                    </button>
                </div>
                <div id="server-config-status" class="settings-status-box">
                    <div style="display: flex; align-items: center; gap: var(--spacing-xs);">
                        <i class="fas fa-circle-notch fa-spin"></i>
                        <span>Cargando estado...</span>
                    </div>
                </div>
            </div>
        `;
    },

    getSyncStatusTab() {
        return `
            <div class="settings-section">
                <h3 class="settings-section-title"><i class="fas fa-sync-alt"></i> Estado de Sincronización</h3>
                <div id="sync-status-info" class="settings-status-box" style="margin-bottom: var(--spacing-md);">
                    <div style="display: flex; align-items: center; gap: var(--spacing-xs); color: var(--color-text-secondary);">
                        <i class="fas fa-circle-notch fa-spin"></i>
                        <span>Cargando...</span>
                    </div>
                </div>
                
                <div id="sync-queue-status" class="settings-queue-box" style="margin-bottom: var(--spacing-md);">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <span style="font-weight: 600; color: var(--color-text);">
                            <i class="fas fa-list"></i> Elementos Pendientes
                        </span>
                        <span id="sync-queue-count" style="font-size: 18px; font-weight: 700; color: var(--color-primary);">0</span>
                    </div>
                </div>
                
                <div class="settings-section-footer">
                    <button class="btn-primary" onclick="if(typeof window.SyncManager !== 'undefined') window.SyncManager.syncPending(); else alert('Sync Manager no disponible');">
                        <i class="fas fa-sync-alt"></i> Sincronizar Ahora
                    </button>
                </div>
            </div>
        `;
    },

    getFinancialTaxesTab() {
        return `
            <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border-light); max-width: 600px;">
                <h3 style="margin-bottom: var(--spacing-md); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                    <i class="fas fa-receipt"></i> Impuestos
                </h3>
                <p style="font-size: 11px; color: var(--color-text-secondary); margin-bottom: var(--spacing-md);">
                    IVA, IEPS e ISR aplicados a las ventas. El IVA se incluye automáticamente en los reportes financieros.
                </p>
                <div class="form-group">
                    <label>IVA (%)</label>
                    <input type="number" id="setting-tax-iva" class="form-input" step="0.01" value="16.00">
                </div>
                <div class="form-group">
                    <label>IEPS (%)</label>
                    <input type="number" id="setting-tax-ieps" class="form-input" step="0.01" value="0.00">
                </div>
                <div class="form-group">
                    <label>ISR (%)</label>
                    <input type="number" id="setting-tax-isr" class="form-input" step="0.01" value="0.00">
                </div>
                <button class="btn-primary btn-sm" onclick="window.Settings.saveTaxes()" style="width: 100%; margin-top: var(--spacing-xs);">
                    <i class="fas fa-save"></i> Guardar Impuestos
                </button>
            </div>
        `;
    },

    getFinancialBankCommissionsTab() {
        return `
            <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border-light); max-width: 600px;">
                <h3 style="margin-bottom: var(--spacing-md); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                    <i class="fas fa-credit-card"></i> Comisiones Bancarias
                </h3>
                <div style="margin-bottom: var(--spacing-sm); padding: var(--spacing-sm); background: var(--color-bg-secondary); border-radius: var(--radius-sm); font-size: 10px; color: var(--color-text-secondary);">
                    <i class="fas fa-info-circle"></i> Las comisiones se aplican automáticamente a los pagos con TPV (tarjeta). Los porcentajes incluyen IVA.
                </div>

                <div style="margin-bottom: var(--spacing-md);">
                    <h4 style="font-size: 11px; font-weight: 600; text-transform: uppercase; margin-bottom: var(--spacing-sm); color: var(--color-primary);">
                        <i class="fas fa-university"></i> Banamex
                    </h4>
                    <div class="form-group">
                        <label>Nacional (%)</label>
                        <input type="number" id="setting-bank-commission-banamex-national" class="form-input" step="0.01" value="2.32" min="0" max="100">
                    </div>
                    <div class="form-group">
                        <label>Internacional (%)</label>
                        <input type="number" id="setting-bank-commission-banamex-international" class="form-input" step="0.01" value="4.06" min="0" max="100">
                    </div>
                </div>

                <div style="margin-bottom: var(--spacing-md); padding-top: var(--spacing-md); border-top: 1px solid var(--color-border-light);">
                    <h4 style="font-size: 11px; font-weight: 600; text-transform: uppercase; margin-bottom: var(--spacing-sm); color: var(--color-primary);">
                        <i class="fas fa-university"></i> Santander
                    </h4>
                    <div class="form-group">
                        <label>Nacional (%)</label>
                        <input type="number" id="setting-bank-commission-santander-national" class="form-input" step="0.01" value="2.00" min="0" max="100">
                    </div>
                    <div class="form-group">
                        <label>Internacional (%)</label>
                        <input type="number" id="setting-bank-commission-santander-international" class="form-input" step="0.01" value="2.55" min="0" max="100">
                    </div>
                </div>

                <button class="btn-primary btn-sm" onclick="window.Settings.saveBankCommissions()" style="width: 100%; margin-top: var(--spacing-xs);">
                    <i class="fas fa-save"></i> Guardar Comisiones Bancarias
                </button>
            </div>
        `;
    },

    getFinancialExchangeRatesTab() {
        return `
            <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border-light); max-width: 600px;">
                <h3 style="margin-bottom: var(--spacing-md); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                    <i class="fas fa-exchange-alt"></i> Tipos de Cambio
                </h3>
                <div style="margin-bottom: var(--spacing-sm); padding: var(--spacing-sm); background: var(--color-bg-secondary); border-radius: var(--radius-sm); border-left: 2px solid var(--color-accent);">
                    <button class="btn-primary btn-sm" onclick="window.Settings.fetchExchangeRates()" style="width: 100%; margin-bottom: var(--spacing-xs);">
                        <i class="fas fa-sync-alt"></i> Obtener Tipos de Cambio Actuales
                    </button>
                    <small style="color: var(--color-text-secondary); font-size: 9px;">
                        Obtiene automáticamente USD y CAD desde internet
                    </small>
                </div>
                <div class="form-group">
                    <label>Tipo de Cambio USD (MXN por USD)</label>
                    <input type="number" id="setting-exchange-usd" class="form-input" step="0.0001" value="20.00">
                </div>
                <div class="form-group">
                    <label>Tipo de Cambio CAD (MXN por CAD)</label>
                    <input type="number" id="setting-exchange-cad" class="form-input" step="0.0001" value="15.00">
                </div>
                <div style="margin-top: var(--spacing-sm); padding: var(--spacing-xs); background: var(--color-bg-secondary); border-radius: var(--radius-sm); font-size: 9px; color: var(--color-text-secondary);">
                    <strong>Última actualización:</strong> <span id="exchange-rates-timestamp">-</span>
                </div>
                <button class="btn-primary btn-sm" onclick="window.Settings.saveExchangeRates()" style="width: 100%; margin-top: var(--spacing-sm);">
                    Guardar Tipos de Cambio
                </button>
            </div>
        `;
    },

    // Helper: tarjeta simple "Gestionar X" usada en cada sub-tab de Catalogos.
    _catalogCard(icon, title, description, action) {
        return `
            <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border-light); max-width: 600px; text-align: center;">
                <h3 style="margin-bottom: var(--spacing-sm); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                    <i class="fas ${icon}"></i> ${title}
                </h3>
                <p style="font-size: 11px; color: var(--color-text-secondary); margin-bottom: var(--spacing-md);">
                    ${description}
                </p>
                <button class="btn-primary btn-sm" onclick="window.Settings.${action}()" style="width: 100%;">
                    <i class="fas fa-cog"></i> Gestionar
                </button>
            </div>
        `;
    },

    getCatalogAgenciesTab() {
        return this._catalogCard('fa-building', 'Agencias',
            'Gestiona las agencias de turismo (alta, edicion, codigo de barras).', 'manageAgencies');
    },

    getCatalogSellersTab() {
        return `
            ${this._catalogCard('fa-user-tag', 'Vendedores',
                'Gestiona los vendedores del sistema (alta, edicion, codigo de barras).', 'manageSellers')}
            <div class="module" style="margin-top: var(--spacing-md); padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border-light); max-width: 600px;">
                <h3 style="margin-bottom: var(--spacing-sm); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                    <i class="fas fa-percent"></i> Reglas de Comision
                </h3>
                <p style="font-size: 11px; color: var(--color-text-secondary); margin-bottom: var(--spacing-sm);">
                    Configura las reglas de comision para vendedores, guias y agencias.
                </p>
                <button class="btn-secondary btn-sm" onclick="window.Settings.manageCommissionRules()" style="width: 100%;">
                    <i class="fas fa-cog"></i> Gestionar Reglas de Comision
                </button>
            </div>
        `;
    },

    getCatalogGuidesTab() {
        return this._catalogCard('fa-suitcase', 'Guias',
            'Gestiona los guias de turismo (alta, edicion, codigo de barras).', 'manageGuides');
    },

    getBranchesTab() {
        return `
            ${this._catalogCard('fa-store', 'Sucursales',
                'Gestiona las sucursales: alta, edicion, asignacion de empleados, datos empresariales.',
                'manageBranches')}
        `;
    },

    getSecurityPinTab() {
        return `
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--spacing-md); max-width: 1000px;">
                <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border-light);">
                    <h3 style="margin-bottom: var(--spacing-md); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                        <i class="fas fa-key"></i> Cambiar Mi PIN
                    </h3>
                    <p style="font-size: 11px; color: var(--color-text-secondary); margin-bottom: var(--spacing-sm);">
                        Cambia el PIN local que usa el sistema para reautenticarte en operaciones sensibles.
                    </p>
                    <div class="form-group">
                        <label>PIN Actual</label>
                        <input type="password" id="setting-current-pin" class="form-input" placeholder="Ingresa tu PIN actual">
                    </div>
                    <div class="form-group">
                        <label>Nuevo PIN</label>
                        <input type="password" id="setting-new-pin" class="form-input" placeholder="Nuevo PIN (minimo 4 digitos)">
                    </div>
                    <div class="form-group">
                        <label>Confirmar Nuevo PIN</label>
                        <input type="password" id="setting-confirm-pin" class="form-input" placeholder="Confirma el nuevo PIN">
                    </div>
                    <button class="btn-primary btn-sm" onclick="window.Settings.changeMasterPin()" style="width: 100%; margin-top: var(--spacing-xs);">
                        Cambiar PIN
                    </button>
                </div>

                <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border-light);">
                    <h3 style="margin-bottom: var(--spacing-md); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                        <i class="fas fa-lock"></i> Politica de PIN
                    </h3>
                    <p style="font-size: 11px; color: var(--color-text-secondary); margin-bottom: var(--spacing-sm);">
                        Reglas que aplican a TODOS los PINs locales del sistema.
                    </p>
                    <div class="form-group">
                        <label>Longitud Minima de PIN</label>
                        <input type="number" id="setting-pin-min-length" class="form-input" value="4" min="4" max="8">
                    </div>
                    <div class="form-group">
                        <label>Intentos Maximos de Login (local)</label>
                        <input type="number" id="setting-max-login-attempts" class="form-input" value="5" min="3" max="10">
                    </div>
                    <div class="form-group">
                        <label>Tiempo de Bloqueo (minutos)</label>
                        <input type="number" id="setting-lockout-time" class="form-input" value="15" min="5" max="60">
                    </div>
                    <button class="btn-primary btn-sm" onclick="window.Settings.saveSecuritySettings()" style="width: 100%; margin-top: var(--spacing-xs);">
                        Guardar Politica
                    </button>
                </div>
            </div>
        `;
    },

    getSecurityPermissionsTab() {
        const canManage = typeof PermissionManager !== 'undefined' && PermissionManager.hasPermission('settings.manage_permissions');
        const canAudit = typeof PermissionManager !== 'undefined' && PermissionManager.hasPermission('settings.view_audit');
        return `
            <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border-light); max-width: 600px;">
                <h3 style="margin-bottom: var(--spacing-md); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                    <i class="fas fa-user-shield"></i> Permisos y Auditoria
                </h3>
                <p style="font-size: 11px; color: var(--color-text-secondary); margin-bottom: var(--spacing-sm);">
                    Gestiona los permisos del sistema y revisa el log de cambios.
                </p>
                ${canManage ? `
                    <button class="btn-secondary btn-sm" onclick="window.Settings.managePermissions()" style="width: 100%; margin-bottom: var(--spacing-xs);">
                        <i class="fas fa-users-cog"></i> Gestionar Permisos
                    </button>
                ` : `
                    <div style="padding: var(--spacing-sm); background: var(--color-bg-secondary); border-radius: var(--radius-sm); font-size: 11px; color: var(--color-text-secondary); margin-bottom: var(--spacing-xs);">
                        No tienes permiso para gestionar permisos.
                    </div>
                `}
                ${canAudit ? `
                    <button class="btn-secondary btn-sm" onclick="window.Settings.viewAuditLog()" style="width: 100%;">
                        <i class="fas fa-history"></i> Ver Log de Auditoria
                    </button>
                ` : ''}
            </div>
        `;
    },

    getSecurityCompanyCodeTab() {
        return `
            <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border-light); max-width: 600px;">
                <h3 style="margin-bottom: var(--spacing-md); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                    <i class="fas fa-building"></i> Codigo de Acceso de Empresa
                </h3>
                <p style="font-size: 11px; color: var(--color-text-secondary); margin-bottom: var(--spacing-sm);">
                    Este codigo se solicita antes del login. Solo usuarios autorizados pueden acceder al sistema.
                </p>
                <div style="padding: var(--spacing-sm); background: var(--color-bg-secondary); border-radius: var(--radius-sm); border-left: 3px solid var(--color-warning, #f59e0b); font-size: 11px; line-height: 1.5; margin-bottom: var(--spacing-sm);">
                    <strong><i class="fas fa-info-circle"></i> El codigo se gestiona en el servidor</strong><br>
                    Por seguridad, el codigo de acceso vive en una variable de entorno del backend
                    (<code>COMPANY_ACCESS_CODE</code> en Railway) y no se puede cambiar desde aqui.
                    Para cambiarlo, actualiza la variable en Railway y haz redeploy.
                </div>
                <button class="btn-secondary btn-sm" onclick="window.Settings.clearCompanyCodeCache()" style="width: 100%;">
                    <i class="fas fa-trash"></i> Limpiar Codigos Guardados (forzar revalidacion)
                </button>
            </div>
        `;
    },

    // Sub-tab: Servidor (URL + estado de sincronizacion)
    getSystemServerTab() {
        return `
            <div style="display: grid; gap: var(--spacing-md); max-width: 800px;">
                <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border-light);">
                    <h3 style="margin-bottom: var(--spacing-md); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                        <i class="fas fa-server"></i> Configuracion del Servidor
                    </h3>
                    <div class="form-group">
                        <label>URL del Servidor Railway</label>
                        <div style="display: flex; gap: var(--spacing-xs);">
                            <input type="text" id="server-url-input" class="form-input" placeholder="https://backend-production-xxxx.up.railway.app" style="flex: 1;">
                            <button class="btn-primary" id="save-server-url-btn">
                                <i class="fas fa-save"></i> Guardar
                            </button>
                            <button class="btn-secondary" id="test-server-connection-btn">
                                <i class="fas fa-network-wired"></i> Probar
                            </button>
                        </div>
                    </div>
                    <div id="server-config-status" style="margin-top: var(--spacing-sm); padding: var(--spacing-sm); background: var(--color-bg-secondary); border-radius: var(--radius-sm); font-size: 11px;">
                        <div style="color: var(--color-text-secondary);">
                            <i class="fas fa-info-circle"></i> Estado del servidor
                        </div>
                    </div>
                </div>

                <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border-light);">
                    <h3 style="margin-bottom: var(--spacing-md); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                        <i class="fas fa-sync-alt"></i> Estado de Sincronizacion
                    </h3>
                    <div id="sync-status-info" style="padding: var(--spacing-sm); background: var(--color-bg-secondary); border-radius: var(--radius-sm); font-size: 11px; margin-bottom: var(--spacing-sm);">
                        <div style="color: var(--color-text-secondary);">
                            <i class="fas fa-circle-notch fa-spin"></i> Cargando...
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--spacing-sm); background: var(--color-bg-secondary); border-radius: var(--radius-sm); margin-bottom: var(--spacing-sm);">
                        <span style="font-weight: 600; font-size: 11px;">
                            <i class="fas fa-list"></i> Elementos pendientes
                        </span>
                        <span id="sync-queue-count" style="font-size: 16px; font-weight: 700; color: var(--color-primary);">0</span>
                    </div>
                    <button class="btn-primary btn-sm" onclick="if(typeof window.SyncManager !== 'undefined') window.SyncManager.syncPending(); else Utils.showNotification('SyncManager no disponible', 'error');" style="width: 100%;">
                        <i class="fas fa-sync-alt"></i> Sincronizar Ahora
                    </button>
                </div>
            </div>
        `;
    },

    // Sub-tab: Backups (gestion de respaldos)
    getSystemBackupsTab() {
        return `
            <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border-light); max-width: 900px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-md); flex-wrap: wrap; gap: var(--spacing-xs);">
                    <h3 style="margin: 0; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                        <i class="fas fa-database"></i> Gestion de Backups
                    </h3>
                    <div style="display: flex; gap: var(--spacing-xs);">
                        <button class="btn-primary btn-sm" id="backup-create-btn">
                            <i class="fas fa-plus"></i> Crear Backup
                        </button>
                        <button class="btn-secondary btn-sm" id="backup-import-btn">
                            <i class="fas fa-upload"></i> Importar Backup
                        </button>
                    </div>
                </div>
                <div style="margin-bottom: var(--spacing-md); padding: var(--spacing-sm); background: var(--color-bg-secondary); border-radius: var(--radius-sm); font-size: 11px; color: var(--color-text-secondary);">
                    <i class="fas fa-info-circle"></i> Los backups se crean automaticamente cada 5 minutos.
                    <div id="backup-directory-info" style="margin-top: var(--spacing-xs); padding-top: var(--spacing-xs); border-top: 1px solid var(--color-border-light);">
                        <i class="fas fa-folder"></i> <span id="backup-directory-path">No hay carpeta seleccionada (los backups se guardaran solo en localStorage)</span>
                    </div>
                </div>
                <div style="margin-bottom: var(--spacing-md); display: flex; gap: var(--spacing-xs);">
                    <button class="btn-secondary btn-sm" id="backup-select-folder-btn">
                        <i class="fas fa-folder-open"></i> Seleccionar Carpeta
                    </button>
                    <button class="btn-secondary btn-sm" id="backup-clear-folder-btn" style="display: none;">
                        <i class="fas fa-times"></i> Deseleccionar Carpeta
                    </button>
                </div>
                <div id="backups-list-container">
                    <div style="text-align: center; padding: var(--spacing-md); color: var(--color-text-secondary);">
                        <i class="fas fa-spinner fa-spin"></i> Cargando backups...
                    </div>
                </div>
                <div id="backup-storage-info" style="margin-top: var(--spacing-md); padding: var(--spacing-sm); background: var(--color-bg-secondary); border-radius: var(--radius-sm); font-size: 10px; color: var(--color-text-secondary);">
                    <i class="fas fa-hdd"></i> <span id="backup-storage-text">Cargando informacion...</span>
                </div>
            </div>
        `;
    },

    // Sub-tab: Informacion (estadisticas DB + datos del sistema + export/import seguro)
    getSystemInfoTab() {
        return `
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--spacing-md); max-width: 1000px;">
                <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border-light);">
                    <h3 style="margin-bottom: var(--spacing-md); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                        <i class="fas fa-database"></i> Base de Datos Local
                    </h3>
                    <div id="db-stats" style="padding: var(--spacing-sm); background: var(--color-bg-secondary); border-radius: var(--radius-sm); margin-bottom: var(--spacing-sm); font-size: 11px;">
                        <div>Cargando estadisticas...</div>
                    </div>
                    <button class="btn-secondary btn-sm" onclick="window.Settings.exportDatabase()" style="width: 100%; margin-bottom: var(--spacing-xs);">
                        <i class="fas fa-download"></i> Exportar BD (JSON)
                    </button>
                    <button class="btn-secondary btn-sm" onclick="window.Settings.importDatabase()" style="width: 100%;">
                        <i class="fas fa-upload"></i> Importar BD (JSON)
                    </button>
                </div>

                <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border-light);">
                    <h3 style="margin-bottom: var(--spacing-md); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                        <i class="fas fa-info-circle"></i> Informacion del Sistema
                    </h3>
                    <div id="system-info" style="padding: var(--spacing-sm); background: var(--color-bg-secondary); border-radius: var(--radius-sm); font-size: 11px;">
                        <div>Cargando informacion...</div>
                    </div>
                    <button class="btn-secondary btn-sm" onclick="window.Settings.loadSystemInfo()" style="width: 100%; margin-top: var(--spacing-xs);">
                        <i class="fas fa-sync"></i> Actualizar
                    </button>
                </div>
            </div>
        `;
    },

    // Wrapper para compat con codigo viejo: redirige al sub-tab por defecto.
    getSystemTab() {
        return this.getSystemServerTab();
    },

    async loadSettings() {
        try {
            // Cargar todas las configuraciones
            const settings = await DB.getAll('settings') || [];
            const settingsMap = {};
            settings.forEach(s => {
                settingsMap[s.key] = s.value;
            });

            // Sincronización (Railway) - Ya no se usa Google Sheets

            // Tipos de cambio
            const exchangeUsdEl = document.getElementById('setting-exchange-usd');
            const exchangeCadEl = document.getElementById('setting-exchange-cad');
            if (exchangeUsdEl && settingsMap.exchange_rate_usd) exchangeUsdEl.value = settingsMap.exchange_rate_usd;
            if (exchangeCadEl && settingsMap.exchange_rate_cad) exchangeCadEl.value = settingsMap.exchange_rate_cad;
            
            const timestampEl = document.getElementById('exchange-rates-timestamp');
            if (timestampEl && settingsMap.exchange_rates_timestamp) {
                const timestamp = new Date(settingsMap.exchange_rates_timestamp);
                timestampEl.textContent = Utils.formatDate(timestamp, 'DD/MM/YYYY HH:mm');
            }

            // Impresión - Configuración Avanzada
            const printerNameEl = document.getElementById('setting-printer-name');
            const printerBaudEl = document.getElementById('setting-printer-baud');
            const printerWidthEl = document.getElementById('setting-printer-width');
            const printerDensityEl = document.getElementById('setting-printer-density');
            const ticketFormatEl = document.getElementById('setting-ticket-format');
            const ticketCopiesEl = document.getElementById('setting-ticket-copies');
            const paperCutEl = document.getElementById('setting-paper-cut');
            const feedLinesEl = document.getElementById('setting-feed-lines');
            
            // Opciones del ticket
            const printLogoEl = document.getElementById('setting-print-logo');
            const printBarcodeEl = document.getElementById('setting-print-barcode');
            const printQREl = document.getElementById('setting-print-qr');
            const autoPrintEl = document.getElementById('setting-auto-print');
            const printFooterEl = document.getElementById('setting-print-footer');
            const printDuplicateEl = document.getElementById('setting-print-duplicate');
            
            // Personalización
            const businessNameEl = document.getElementById('setting-business-name');
            const businessPhoneEl = document.getElementById('setting-business-phone');
            const businessAddressEl = document.getElementById('setting-business-address');
            const ticketFooterEl = document.getElementById('setting-ticket-footer');

            // Cargar valores
            if (printerNameEl && settingsMap.printer_name) printerNameEl.value = settingsMap.printer_name;
            if (printerBaudEl && settingsMap.printer_baud) printerBaudEl.value = settingsMap.printer_baud;
            if (printerWidthEl && settingsMap.printer_width) printerWidthEl.value = settingsMap.printer_width;
            if (printerDensityEl && settingsMap.printer_density) printerDensityEl.value = settingsMap.printer_density;
            if (ticketFormatEl && settingsMap.ticket_format) ticketFormatEl.value = settingsMap.ticket_format;
            if (ticketCopiesEl && settingsMap.ticket_copies) ticketCopiesEl.value = settingsMap.ticket_copies;
            if (paperCutEl && settingsMap.paper_cut) paperCutEl.value = settingsMap.paper_cut;
            if (feedLinesEl && settingsMap.feed_lines !== undefined) feedLinesEl.value = settingsMap.feed_lines;
            
            // Checkboxes
            if (printLogoEl) printLogoEl.checked = settingsMap.print_logo !== false;
            if (printBarcodeEl) printBarcodeEl.checked = settingsMap.print_barcode === true;
            if (printQREl) printQREl.checked = settingsMap.print_qr === true;
            if (autoPrintEl) autoPrintEl.checked = settingsMap.auto_print !== false;
            if (printFooterEl) printFooterEl.checked = settingsMap.print_footer !== false;
            if (printDuplicateEl) printDuplicateEl.checked = settingsMap.print_duplicate === true;
            
            // Personalización
            if (businessNameEl && settingsMap.business_name) businessNameEl.value = settingsMap.business_name;
            if (businessPhoneEl && settingsMap.business_phone) businessPhoneEl.value = settingsMap.business_phone;
            if (businessAddressEl && settingsMap.business_address) businessAddressEl.value = settingsMap.business_address;
            if (ticketFooterEl && settingsMap.ticket_footer) ticketFooterEl.value = settingsMap.ticket_footer;

            // Actualizar estado de conexión de impresora
            if (typeof Printer !== 'undefined') {
                this.updatePrinterStatus(Printer.connected);
                this.updatePrinterPortInfo();
            }

            // Cargar modelo de impresora guardado
            const printerModelEl = document.getElementById('setting-printer-model');
            if (printerModelEl && settingsMap.printer_model) {
                printerModelEl.value = settingsMap.printer_model;
                this.onPrinterModelChange();
            }

            // Impuestos
            const taxIvaEl = document.getElementById('setting-tax-iva');
            const taxIepsEl = document.getElementById('setting-tax-ieps');
            const taxIsrEl = document.getElementById('setting-tax-isr');
            if (taxIvaEl && settingsMap.tax_iva) taxIvaEl.value = settingsMap.tax_iva;
            if (taxIepsEl && settingsMap.tax_ieps) taxIepsEl.value = settingsMap.tax_ieps;
            if (taxIsrEl && settingsMap.tax_isr) taxIsrEl.value = settingsMap.tax_isr;

            // Comisiones Bancarias
            const banamexNationalEl = document.getElementById('setting-bank-commission-banamex-national');
            const banamexInternationalEl = document.getElementById('setting-bank-commission-banamex-international');
            const santanderNationalEl = document.getElementById('setting-bank-commission-santander-national');
            const santanderInternationalEl = document.getElementById('setting-bank-commission-santander-international');
            if (banamexNationalEl) banamexNationalEl.value = settingsMap.bank_commission_banamex_national || 2.32;
            if (banamexInternationalEl) banamexInternationalEl.value = settingsMap.bank_commission_banamex_international || 4.06;
            if (santanderNationalEl) santanderNationalEl.value = settingsMap.bank_commission_santander_national || 2.00;
            if (santanderInternationalEl) santanderInternationalEl.value = settingsMap.bank_commission_santander_international || 2.55;

            // Notificaciones
            const notifySalesEl = document.getElementById('setting-notify-sales');
            const notifyLowStockEl = document.getElementById('setting-notify-low-stock');
            const notifySyncEl = document.getElementById('setting-notify-sync');
            const lowStockThresholdEl = document.getElementById('setting-low-stock-threshold');
            if (notifySalesEl) notifySalesEl.checked = settingsMap.notify_sales !== false;
            if (notifyLowStockEl) notifyLowStockEl.checked = settingsMap.notify_low_stock !== false;
            if (notifySyncEl) notifySyncEl.checked = settingsMap.notify_sync !== false;
            if (lowStockThresholdEl && settingsMap.low_stock_threshold) lowStockThresholdEl.value = settingsMap.low_stock_threshold;

            // Apariencia
            const themeEl = document.getElementById('setting-theme');
            const languageEl = document.getElementById('setting-language');
            const dateFormatEl = document.getElementById('setting-date-format');
            if (themeEl && settingsMap.theme) themeEl.value = settingsMap.theme;
            if (languageEl && settingsMap.language) languageEl.value = settingsMap.language;
            if (dateFormatEl && settingsMap.date_format) dateFormatEl.value = settingsMap.date_format;

            // Seguridad
            const pinMinLengthEl = document.getElementById('setting-pin-min-length');
            const maxLoginAttemptsEl = document.getElementById('setting-max-login-attempts');
            const lockoutTimeEl = document.getElementById('setting-lockout-time');
            if (pinMinLengthEl && settingsMap.pin_min_length) pinMinLengthEl.value = settingsMap.pin_min_length;
            if (maxLoginAttemptsEl && settingsMap.max_login_attempts) maxLoginAttemptsEl.value = settingsMap.max_login_attempts;
            if (lockoutTimeEl && settingsMap.lockout_time) lockoutTimeEl.value = settingsMap.lockout_time;

            // Auto-sync
            const autoSyncEl = document.getElementById('setting-auto-sync');
            if (autoSyncEl && settingsMap.auto_sync) autoSyncEl.value = settingsMap.auto_sync;

            // (Antes habia carga adicional segun pestana activa, pero esos
            // elementos del DOM ahora viven en sub-tabs especificos y se
            // cargan en loadTabContent. Aqui no hace falta hacer mas.)
        } catch (e) {
            console.error('Error loading settings:', e);
        }
    },

    async saveSyncSettings() {
        try {
            const googleClientIdInput = document.getElementById('setting-google-client-id');
            const spreadsheetIdInput = document.getElementById('setting-spreadsheet-id');
            const autoSyncSelect = document.getElementById('setting-auto-sync');

            if (!googleClientIdInput || !spreadsheetIdInput) {
                Utils.showNotification('Error: No se encontraron los campos de configuración', 'error');
                return;
            }

            const googleClientId = googleClientIdInput.value.trim();
            const spreadsheetId = spreadsheetIdInput.value.trim();
            const autoSync = autoSyncSelect?.value || 'disabled';

            if (!googleClientId || !spreadsheetId) {
                Utils.showNotification('El Google Client ID y Spreadsheet ID son requeridos', 'error');
                return;
            }

            await DB.put('settings', { key: 'google_client_id', value: googleClientId, updated_at: new Date().toISOString() });
            await DB.put('settings', { key: 'google_sheets_spreadsheet_id', value: spreadsheetId, updated_at: new Date().toISOString() });
            await DB.put('settings', { key: 'auto_sync', value: autoSync, updated_at: new Date().toISOString() });

            // Actualizar valores en SyncManager
            if (SyncManager) {
                SyncManager.googleClientId = googleClientId;
                SyncManager.spreadsheetId = spreadsheetId;
            }

            Utils.showNotification('Configuración de sincronización guardada correctamente', 'success');
        await this.loadSyncStatus();
        } catch (e) {
            console.error('Error guardando configuración de sincronización:', e);
            Utils.showNotification('Error al guardar: ' + e.message, 'error');
        }
    },

    async fetchExchangeRates() {
        Utils.showNotification('Obteniendo tipos de cambio desde internet...', 'info');
        
        const rates = await Utils.fetchExchangeRates();
        
        if (rates) {
            document.getElementById('setting-exchange-usd').value = rates.usd;
            document.getElementById('setting-exchange-cad').value = rates.cad;
            document.getElementById('exchange-rates-timestamp').textContent = 
                Utils.formatDate(new Date(), 'DD/MM/YYYY HH:mm');
            
            // Guardar automáticamente en settings y en exchange_rates_daily
            await this.saveExchangeRates(rates.timestamp);
            
            // También guardar en exchange_rates_daily para persistencia por fecha
            if (typeof ExchangeRates !== 'undefined') {
                const today = Utils.formatDate(new Date(), 'YYYY-MM-DD');
                await ExchangeRates.saveExchangeRate(today, rates.usd, rates.cad);
            }
            
            Utils.showNotification(`Tipos de cambio actualizados: USD ${rates.usd}, CAD ${rates.cad}`, 'success');
        } else {
            Utils.showNotification('No se pudieron obtener los tipos de cambio. Verifica tu conexión a internet.', 'error');
        }
    },

    async saveExchangeRates(timestamp = null) {
        try {
            const usdInput = document.getElementById('setting-exchange-usd');
            const cadInput = document.getElementById('setting-exchange-cad');

            if (!usdInput || !cadInput) {
                Utils.showNotification('Error: No se encontraron los campos de tipos de cambio', 'error');
                return;
            }

            const usd = parseFloat(usdInput.value);
            const cad = parseFloat(cadInput.value);

            // Validaciones
            if (isNaN(usd) || usd <= 0 || usd > 1000) {
                Utils.showNotification('El tipo de cambio USD debe ser un número positivo menor a 1000', 'error');
                return;
            }

            if (isNaN(cad) || cad <= 0 || cad > 1000) {
                Utils.showNotification('El tipo de cambio CAD debe ser un número positivo menor a 1000', 'error');
            return;
        }

        await DB.put('settings', { key: 'exchange_rate_usd', value: usd, updated_at: new Date().toISOString() });
        await DB.put('settings', { key: 'exchange_rate_cad', value: cad, updated_at: new Date().toISOString() });
        
        if (timestamp) {
            await DB.put('settings', { key: 'exchange_rates_timestamp', value: timestamp, updated_at: new Date().toISOString() });
        }

        // También guardar en exchange_rates_daily para persistencia por fecha
        if (typeof ExchangeRates !== 'undefined') {
            const today = Utils.formatDate(new Date(), 'YYYY-MM-DD');
            await ExchangeRates.saveExchangeRate(today, usd, cad);
        } else {
            // Fallback: guardar directamente si ExchangeRates no está disponible
            localStorage.setItem('daily_exchange_rate', usd.toString());
        }

            // Verificar que se guardó correctamente
            const savedUsd = await DB.get('settings', 'exchange_rate_usd');
            const savedCad = await DB.get('settings', 'exchange_rate_cad');
            
            if (!savedUsd || savedUsd.value !== usd) {
                throw new Error('Error al guardar el tipo de cambio USD');
            }
            if (!savedCad || savedCad.value !== cad) {
                throw new Error('Error al guardar el tipo de cambio CAD');
        }

            Utils.showNotification(`Tipos de cambio guardados: USD ${usd}, CAD ${cad}`, 'success');
        } catch (e) {
            console.error('Error guardando tipos de cambio:', e);
            Utils.showNotification('Error al guardar: ' + e.message, 'error');
        }
    },

    generateToken() {
        const token = Utils.generateId() + '-' + Date.now().toString(36);
        document.getElementById('setting-sync-token').value = token;
        Utils.showNotification('Token generado', 'success');
    },

    async testPrinter() {
        try {
            // Guardar configuración antes de probar
            await this.savePrinterSettings();
            
            // Verificar si Printer está disponible
            if (typeof Printer === 'undefined') {
                Utils.showNotification('Módulo de impresora no disponible', 'error');
                return;
            }
            
            // Si está conectada, usar método directo
            if (Printer.connected) {
                await Printer.testPrint();
            } else {
                // Si no está conectada, crear un ticket de prueba completo y usar método fallback
                Utils.showNotification('Impresora no conectada. Usando método de impresión del navegador...', 'info');
                
                // Crear una venta de prueba completa para el ticket
                const testSale = {
                    id: 'test-' + Date.now(),
                    folio: 'TEST-001',
                    branch_id: 'default',
                    seller_id: null,
                    agency_id: null,
                    guide_id: null,
                    customer_id: null,
                    subtotal: 18500,
                    discount: 1850,
                    total: 16650,
                    currency: 'MXN',
                    status: 'completada',
                    created_at: new Date().toISOString()
                };
                
                // Crear items de prueba simulados
                const testItems = [
                    { id: 'item1', sale_id: testSale.id, item_id: 'test1', quantity: 1, price: 15000, discount: 0, subtotal: 15000, name: 'ANILLO ORO 18K DIAMANTE' },
                    { id: 'item2', sale_id: testSale.id, item_id: 'test2', quantity: 1, price: 3500, discount: 0, subtotal: 3500, name: 'COLLAR PLATA 925' }
                ];
                
                // Crear pagos de prueba simulados
                const testPayments = [
                    { id: 'pay1', sale_id: testSale.id, method_id: 'CASH_USD', amount: 800, currency: 'USD' },
                    { id: 'pay2', sale_id: testSale.id, method_id: 'TPV_VISA', amount: 650, currency: 'MXN' }
                ];
                
                // Obtener configuración
                let settings = {};
                try {
                    settings = await Printer.getPrinterSettings();
                } catch (e) {
                    settings = Printer.getDefaultSettings();
                }
                
                // Construir HTML del ticket de prueba
                const ticketHTML = Printer.buildTicketHTML(testSale, testItems, testPayments, { name: 'Tienda de Prueba' }, { name: 'Sistema' }, null, null, settings);
                
                // Usar iframe oculto para imprimir
                let iframe = document.getElementById('print-frame');
                if (!iframe) {
                    iframe = document.createElement('iframe');
                    iframe.id = 'print-frame';
                    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
                    document.body.appendChild(iframe);
                }
                
                const doc = iframe.contentWindow.document;
                doc.open();
                doc.write(ticketHTML);
                doc.close();
                
                // Imprimir cuando esté listo
                const printWhenReady = () => {
                    try {
                        iframe.contentWindow.focus();
                        iframe.contentWindow.print();
                        Utils.showNotification('Ticket de prueba enviado a impresora', 'success');
                    } catch (e) {
                        console.error('Error al imprimir:', e);
                        Utils.showNotification('Error al abrir diálogo de impresión', 'error');
                    }
                };
                
                if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
                    printWhenReady();
                } else {
                    iframe.onload = printWhenReady;
                    setTimeout(printWhenReady, 500);
                }
            }
        } catch (e) {
            console.error('Error en prueba:', e);
            Utils.showNotification('Error al imprimir prueba: ' + e.message, 'error');
        }
    },

    async exportDatabase() {
        try {
            const stores = ['sales', 'inventory_items', 'customers', 'repairs', 'cost_entries', 'employees', 'users'];
            const exportData = {};

            for (const store of stores) {
                exportData[store] = await DB.getAll(store);
            }

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `backup_${Utils.formatDate(new Date(), 'YYYYMMDD_HHmmss')}.json`;
            link.click();

            Utils.showNotification('Base de datos exportada', 'success');
        } catch (e) {
            console.error('Error exporting database:', e);
            Utils.showNotification('Error al exportar', 'error');
        }
    },

    async importDatabase() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const data = JSON.parse(text);

                for (const [storeName, records] of Object.entries(data)) {
                    for (const record of records) {
                        await DB.put(storeName, record);
                    }
                }

                Utils.showNotification('Base de datos importada', 'success');
                location.reload();
            } catch (e) {
                console.error('Error importing database:', e);
                Utils.showNotification('Error al importar', 'error');
            }
        };
        input.click();
    },

    async saveTaxes() {
        try {
            const taxIvaInput = document.getElementById('setting-tax-iva');
            const taxIepsInput = document.getElementById('setting-tax-ieps');
            const taxIsrInput = document.getElementById('setting-tax-isr');

            if (!taxIvaInput || !taxIepsInput) {
                Utils.showNotification('Error: No se encontraron los campos de impuestos', 'error');
                return;
            }

            const taxIva = parseFloat(taxIvaInput.value);
            const taxIeps = parseFloat(taxIepsInput.value);
            const taxIsr = taxIsrInput ? parseFloat(taxIsrInput.value) || 0 : 0;

            // Validaciones
            if (isNaN(taxIva) || taxIva < 0 || taxIva > 100) {
                Utils.showNotification('El IVA debe ser un número entre 0 y 100', 'error');
                return;
            }

            if (isNaN(taxIeps) || taxIeps < 0 || taxIeps > 100) {
                Utils.showNotification('El IEPS debe ser un número entre 0 y 100', 'error');
                return;
            }

            if (taxIsrInput && (isNaN(taxIsr) || taxIsr < 0 || taxIsr > 100)) {
                Utils.showNotification('El ISR debe ser un número entre 0 y 100', 'error');
                return;
            }

            await DB.put('settings', { key: 'tax_iva', value: taxIva, updated_at: new Date().toISOString() });
            await DB.put('settings', { key: 'tax_ieps', value: taxIeps, updated_at: new Date().toISOString() });
            if (taxIsrInput) {
                await DB.put('settings', { key: 'tax_isr', value: taxIsr, updated_at: new Date().toISOString() });
            }

            // Verificar que se guardó correctamente
            const savedIva = await DB.get('settings', 'tax_iva');
            if (!savedIva || savedIva.value !== taxIva) {
                throw new Error('Error al guardar el IVA');
            }

            Utils.showNotification('Impuestos guardados correctamente', 'success');
        } catch (e) {
            console.error('Error guardando impuestos:', e);
            Utils.showNotification('Error al guardar: ' + e.message, 'error');
        }
    },

    async saveBankCommissions() {
        try {
            const banamexNational = parseFloat(document.getElementById('setting-bank-commission-banamex-national')?.value || 2.32);
            const banamexInternational = parseFloat(document.getElementById('setting-bank-commission-banamex-international')?.value || 4.06);
            const santanderNational = parseFloat(document.getElementById('setting-bank-commission-santander-national')?.value || 2.00);
            const santanderInternational = parseFloat(document.getElementById('setting-bank-commission-santander-international')?.value || 2.55);

            // Validaciones
            if (isNaN(banamexNational) || banamexNational < 0 || banamexNational > 100) {
                Utils.showNotification('La comisión Banamex Nacional debe ser un número entre 0 y 100', 'error');
                return;
            }
            if (isNaN(banamexInternational) || banamexInternational < 0 || banamexInternational > 100) {
                Utils.showNotification('La comisión Banamex Internacional debe ser un número entre 0 y 100', 'error');
                return;
            }
            if (isNaN(santanderNational) || santanderNational < 0 || santanderNational > 100) {
                Utils.showNotification('La comisión Santander Nacional debe ser un número entre 0 y 100', 'error');
                return;
            }
            if (isNaN(santanderInternational) || santanderInternational < 0 || santanderInternational > 100) {
                Utils.showNotification('La comisión Santander Internacional debe ser un número entre 0 y 100', 'error');
                return;
            }

            await DB.put('settings', { key: 'bank_commission_banamex_national', value: banamexNational, updated_at: new Date().toISOString() });
            await DB.put('settings', { key: 'bank_commission_banamex_international', value: banamexInternational, updated_at: new Date().toISOString() });
            await DB.put('settings', { key: 'bank_commission_santander_national', value: santanderNational, updated_at: new Date().toISOString() });
            await DB.put('settings', { key: 'bank_commission_santander_international', value: santanderInternational, updated_at: new Date().toISOString() });

            Utils.showNotification('Comisiones bancarias guardadas correctamente', 'success');
        } catch (e) {
            console.error('Error guardando comisiones bancarias:', e);
            Utils.showNotification('Error al guardar: ' + e.message, 'error');
        }
    },

    /** Devuelve agencias sin duplicados por nombre (prefiere id UUID sobre ag1..ag7) */
    async getAgenciesDeduplicated() {
        const all = await DB.getAll('catalog_agencies') || [];
        const isUUID = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ''));
        const byName = new Map();
        for (const a of all) {
            if (!a || !a.name) continue;
            const key = a.name.trim().toUpperCase();
            const prev = byName.get(key);
            if (!prev) {
                byName.set(key, a);
            } else {
                const keep = (isUUID(a.id) && !isUUID(prev.id)) ? a : (isUUID(prev.id) ? prev : (new Date(a.updated_at || 0) >= new Date(prev.updated_at || 0) ? a : prev));
                byName.set(key, keep);
            }
        }
        return Array.from(byName.values());
    },

    async manageAgencies() {
        const agencies = await this.getAgenciesDeduplicated();
        const body = `
            <div style="margin-bottom: var(--spacing-md);">
                <div style="display: flex; gap: var(--spacing-sm); margin-bottom: var(--spacing-sm); flex-wrap: wrap;">
                    <button class="btn-primary" onclick="window.Settings.addAgency()">
                        <i class="fas fa-plus"></i> Agregar Agencia
                    </button>
            </div>
                <div class="form-group" style="margin-bottom: var(--spacing-sm);">
                    <input type="text" id="agency-search-input" class="form-input" placeholder="Buscar por nombre..." 
                        onkeyup="window.Settings.filterAgencies(this.value)">
                </div>
                <div style="display: flex; gap: var(--spacing-xs); margin-bottom: var(--spacing-sm);">
                    <button class="btn-secondary btn-sm" onclick="window.Settings.filterAgencies('', 'all')" style="flex: 1;">
                        Todas (${agencies.length})
                    </button>
                    <button class="btn-secondary btn-sm" onclick="window.Settings.filterAgencies('', 'active')" style="flex: 1;">
                        Activas (${agencies.filter(a => a.active).length})
                    </button>
                    <button class="btn-secondary btn-sm" onclick="window.Settings.filterAgencies('', 'inactive')" style="flex: 1;">
                        Inactivas (${agencies.filter(a => !a.active).length})
                    </button>
                </div>
            </div>
            <div style="max-height: 500px; overflow-y: auto;">
                <table class="cart-table" id="agencies-table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>ID</th>
                            <th>Código Barras</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="agencies-tbody">
                        ${agencies.map(agency => `
                            <tr data-agency-id="${agency.id}" data-agency-active="${agency.active}">
                                <td><strong>${Utils.escapeHtml(agency.name || 'Sin nombre')}</strong></td>
                                <td><small style="color: var(--color-text-secondary); font-family: monospace;">${Utils.escapeHtml(agency.id)}</small></td>
                                <td><small style="color: var(--color-text-secondary); font-family: monospace;">${Utils.escapeHtml(agency.barcode || 'N/A')}</small></td>
                                <td><span class="status-badge status-${agency.active ? 'disponible' : 'vendida'}">${agency.active ? 'Activa' : 'Inactiva'}</span></td>
                                <td style="white-space: nowrap;">
                                    <button class="btn-secondary btn-sm" onclick="window.Settings.editAgency('${agency.id}')">
                                        <i class="fas fa-edit"></i> Editar
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                        ${agencies.length === 0 ? '<tr><td colspan="5" style="text-align: center; padding: var(--spacing-md); color: var(--color-text-secondary);">No hay agencias registradas</td></tr>' : ''}
                    </tbody>
                </table>
            </div>
        `;
        UI.showModal('Gestionar Agencias', body, '<button class="btn-primary" onclick="UI.closeModal()">Cerrar</button>');
        
        // Guardar referencia para filtros
        window.Settings.currentAgencies = agencies;
    },

    filterAgencies(searchTerm = '', statusFilter = 'all') {
        const tbody = document.getElementById('agencies-tbody');
        if (!tbody || !window.Settings.currentAgencies) return;

        const agencies = window.Settings.currentAgencies;
        const search = searchTerm.toLowerCase().trim();
        
        const filtered = agencies.filter(agency => {
            const matchesSearch = !search || 
                (agency.name && agency.name.toLowerCase().includes(search)) ||
                (agency.id && agency.id.toLowerCase().includes(search)) ||
                (agency.barcode && agency.barcode.toLowerCase().includes(search));
            
            const matchesStatus = statusFilter === 'all' || 
                (statusFilter === 'active' && agency.active) ||
                (statusFilter === 'inactive' && !agency.active);
            
            return matchesSearch && matchesStatus;
        });

        tbody.innerHTML = filtered.map(agency => `
            <tr data-agency-id="${agency.id}" data-agency-active="${agency.active}">
                <td><strong>${Utils.escapeHtml(agency.name || 'Sin nombre')}</strong></td>
                <td><small style="color: var(--color-text-secondary); font-family: monospace;">${Utils.escapeHtml(agency.id)}</small></td>
                <td><small style="color: var(--color-text-secondary); font-family: monospace;">${Utils.escapeHtml(agency.barcode || 'N/A')}</small></td>
                <td><span class="status-badge status-${agency.active ? 'disponible' : 'vendida'}">${agency.active ? 'Activa' : 'Inactiva'}</span></td>
                <td style="white-space: nowrap;">
                    <button class="btn-secondary btn-sm" onclick="window.Settings.editAgency('${agency.id}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="5" style="text-align: center; padding: var(--spacing-md); color: var(--color-text-secondary);">No se encontraron resultados</td></tr>';
    },

    async addAgency() {
        const body = `
            <form id="agency-form" style="max-width: 500px;">
                <div class="form-group">
                    <label>Nombre de la Agencia *</label>
                    <input type="text" id="agency-name-input" class="form-input" required 
                        placeholder="Ej: AGENCIA DE VIAJES SA" maxlength="100">
                    <small style="color: var(--color-text-secondary); font-size: 10px;">
                        El nombre será convertido a mayúsculas automáticamente
                    </small>
                </div>
                <div class="form-group">
                    <label style="display: flex; align-items: center; gap: var(--spacing-xs);">
                        <input type="checkbox" id="agency-active-input" checked>
                        <span>Agencia activa</span>
                    </label>
                </div>
            </form>
        `;
        
        UI.showModal('Nueva Agencia', body, [
            { text: 'Cancelar', class: 'btn-secondary', onclick: () => UI.closeModal() },
            { text: 'Guardar', class: 'btn-primary', onclick: () => this.saveAgency() }
        ]);
        
        // Focus en el input
        setTimeout(() => {
            document.getElementById('agency-name-input')?.focus();
        }, 100);
    },

    async saveAgency(agencyId = null) {
        const form = document.getElementById('agency-form');
        if (!form || !form.checkValidity()) {
            form?.reportValidity();
            return;
        }

        const nameInput = document.getElementById('agency-name-input');
        const activeInput = document.getElementById('agency-active-input');
        
        if (!nameInput || !nameInput.value.trim()) {
            Utils.showNotification('El nombre es requerido', 'error');
            return;
        }

        try {
            const name = nameInput.value.trim().toUpperCase();
            
            // Verificar duplicados (solo si no es edición)
            if (!agencyId) {
                const existing = await DB.getAll('catalog_agencies') || [];
                const duplicate = existing.find(a => a.name === name);
                if (duplicate) {
                    Utils.showNotification('Ya existe una agencia con ese nombre', 'error');
                    return;
                }
            }

            const agency = agencyId ? await DB.get('catalog_agencies', agencyId) : {
            id: Utils.generateId(),
                created_at: new Date().toISOString()
            };

            if (!agency) {
                Utils.showNotification('Agencia no encontrada', 'error');
                return;
            }

            agency.name = name;
            agency.active = activeInput ? activeInput.checked : true;
            agency.updated_at = new Date().toISOString();
            
            // Generar código de barras automáticamente si no existe
            if (!agency.barcode || Utils.isBarcodeEmpty?.(agency.barcode)) {
                agency.barcode = Utils.generateAgencyBarcode?.(agency) || `AG${agency.id.substring(0, 6)}`;
            }

        await DB.put('catalog_agencies', agency);
        await SyncManager.addToQueue('catalog_agency', agency.id);
            Utils.showNotification(agencyId ? 'Agencia actualizada' : 'Agencia agregada', 'success');
            UI.closeModal();
        this.manageAgencies();
        } catch (e) {
            console.error('Error guardando agencia:', e);
            Utils.showNotification('Error al guardar: ' + e.message, 'error');
        }
    },

    async editAgency(id) {
        const agency = await DB.get('catalog_agencies', id);
        if (!agency) {
            Utils.showNotification('Agencia no encontrada', 'error');
            return;
        }

        const body = `
            <form id="agency-form" style="max-width: 500px;">
                <div class="form-group">
                    <label>Nombre de la Agencia *</label>
                    <input type="text" id="agency-name-input" class="form-input" required 
                        value="${Utils.escapeHtml(agency.name || '')}" placeholder="Ej: AGENCIA DE VIAJES SA" maxlength="100">
                    <small style="color: var(--color-text-secondary); font-size: 10px;">
                        El nombre será convertido a mayúsculas automáticamente
                    </small>
                </div>
                <div class="form-group">
                    <label style="display: flex; align-items: center; gap: var(--spacing-xs);">
                        <input type="checkbox" id="agency-active-input" ${agency.active ? 'checked' : ''}>
                        <span>Agencia activa</span>
                    </label>
                </div>
                <div style="padding: var(--spacing-sm); background: var(--color-bg-secondary); border-radius: var(--radius-sm); font-size: 11px; color: var(--color-text-secondary);">
                    <strong>ID:</strong> ${agency.id}<br>
                    <strong>Código de Barras:</strong> ${agency.barcode || 'N/A'}
                </div>
            </form>
        `;
        
        UI.showModal('Editar Agencia', body, [
            { text: 'Cancelar', class: 'btn-secondary', onclick: () => UI.closeModal() },
            { text: 'Guardar', class: 'btn-primary', onclick: () => this.saveAgency(id) }
        ]);
        
        // Focus en el input
        setTimeout(() => {
            document.getElementById('agency-name-input')?.focus();
            document.getElementById('agency-name-input')?.select();
        }, 100);
    },

    async manageSellers() {
        const sellers = await DB.getAll('catalog_sellers') || [];
        const body = `
            <div style="margin-bottom: var(--spacing-md);">
                <div style="display: flex; gap: var(--spacing-sm); margin-bottom: var(--spacing-sm); flex-wrap: wrap;">
                    <button class="btn-primary" onclick="window.Settings.addSeller()">
                        <i class="fas fa-plus"></i> Agregar Vendedor
                    </button>
            </div>
                <div class="form-group" style="margin-bottom: var(--spacing-sm);">
                    <input type="text" id="seller-search-input" class="form-input" placeholder="Buscar por nombre..." 
                        onkeyup="window.Settings.filterSellers(this.value)">
                </div>
                <div style="display: flex; gap: var(--spacing-xs); margin-bottom: var(--spacing-sm);">
                    <button class="btn-secondary btn-sm" onclick="window.Settings.filterSellers('', 'all')" style="flex: 1;">
                        Todos (${sellers.length})
                    </button>
                    <button class="btn-secondary btn-sm" onclick="window.Settings.filterSellers('', 'active')" style="flex: 1;">
                        Activos (${sellers.filter(s => s.active).length})
                    </button>
                    <button class="btn-secondary btn-sm" onclick="window.Settings.filterSellers('', 'inactive')" style="flex: 1;">
                        Inactivos (${sellers.filter(s => !s.active).length})
                    </button>
                </div>
            </div>
            <div style="max-height: 500px; overflow-y: auto;">
                <table class="cart-table" id="sellers-table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>ID</th>
                            <th>Código Barras</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="sellers-tbody">
                        ${sellers.map(seller => `
                            <tr data-seller-id="${seller.id}" data-seller-active="${seller.active}">
                                <td><strong>${Utils.escapeHtml(seller.name || 'Sin nombre')}</strong></td>
                                <td><small style="color: var(--color-text-secondary); font-family: monospace;">${Utils.escapeHtml(seller.id)}</small></td>
                                <td><small style="color: var(--color-text-secondary); font-family: monospace;">${Utils.escapeHtml(seller.barcode || 'N/A')}</small></td>
                                <td><span class="status-badge status-${seller.active ? 'disponible' : 'vendida'}">${seller.active ? 'Activo' : 'Inactivo'}</span></td>
                                <td style="white-space: nowrap;">
                                    <button class="btn-secondary btn-sm" onclick="window.Settings.editSeller('${seller.id}')">
                                        <i class="fas fa-edit"></i> Editar
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                        ${sellers.length === 0 ? '<tr><td colspan="5" style="text-align: center; padding: var(--spacing-md); color: var(--color-text-secondary);">No hay vendedores registrados</td></tr>' : ''}
                    </tbody>
                </table>
            </div>
        `;
        UI.showModal('Gestionar Vendedores', body, '<button class="btn-primary" onclick="UI.closeModal()">Cerrar</button>');
        
        window.Settings.currentSellers = sellers;
    },

    filterSellers(searchTerm = '', statusFilter = 'all') {
        const tbody = document.getElementById('sellers-tbody');
        if (!tbody || !window.Settings.currentSellers) return;

        const sellers = window.Settings.currentSellers;
        const search = searchTerm.toLowerCase().trim();
        
        const filtered = sellers.filter(seller => {
            const matchesSearch = !search || 
                (seller.name && seller.name.toLowerCase().includes(search)) ||
                (seller.id && seller.id.toLowerCase().includes(search)) ||
                (seller.barcode && seller.barcode.toLowerCase().includes(search));
            
            const matchesStatus = statusFilter === 'all' || 
                (statusFilter === 'active' && seller.active) ||
                (statusFilter === 'inactive' && !seller.active);
            
            return matchesSearch && matchesStatus;
        });

        tbody.innerHTML = filtered.map(seller => `
            <tr data-seller-id="${seller.id}" data-seller-active="${seller.active}">
                <td><strong>${Utils.escapeHtml(seller.name || 'Sin nombre')}</strong></td>
                <td><small style="color: var(--color-text-secondary); font-family: monospace;">${Utils.escapeHtml(seller.id)}</small></td>
                <td><small style="color: var(--color-text-secondary); font-family: monospace;">${Utils.escapeHtml(seller.barcode || 'N/A')}</small></td>
                <td><span class="status-badge status-${seller.active ? 'disponible' : 'vendida'}">${seller.active ? 'Activo' : 'Inactivo'}</span></td>
                <td style="white-space: nowrap;">
                    <button class="btn-secondary btn-sm" onclick="window.Settings.editSeller('${seller.id}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="5" style="text-align: center; padding: var(--spacing-md); color: var(--color-text-secondary);">No se encontraron resultados</td></tr>';
    },

    async addSeller() {
        const body = `
            <form id="seller-form" style="max-width: 500px;">
                <div class="form-group">
                    <label>Nombre del Vendedor *</label>
                    <input type="text" id="seller-name-input" class="form-input" required 
                        placeholder="Ej: JUAN PÉREZ" maxlength="100">
                    <small style="color: var(--color-text-secondary); font-size: 10px;">
                        El nombre será convertido a mayúsculas automáticamente
                    </small>
                </div>
                <div class="form-group">
                    <label style="display: flex; align-items: center; gap: var(--spacing-xs);">
                        <input type="checkbox" id="seller-active-input" checked>
                        <span>Vendedor activo</span>
                    </label>
                </div>
            </form>
        `;
        
        UI.showModal('Nuevo Vendedor', body, [
            { text: 'Cancelar', class: 'btn-secondary', onclick: () => UI.closeModal() },
            { text: 'Guardar', class: 'btn-primary', onclick: () => this.saveSeller() }
        ]);
        
        setTimeout(() => {
            document.getElementById('seller-name-input')?.focus();
        }, 100);
    },

    async saveSeller(sellerId = null) {
        const form = document.getElementById('seller-form');
        if (!form || !form.checkValidity()) {
            form?.reportValidity();
            return;
        }

        const nameInput = document.getElementById('seller-name-input');
        const activeInput = document.getElementById('seller-active-input');
        
        if (!nameInput || !nameInput.value.trim()) {
            Utils.showNotification('El nombre es requerido', 'error');
            return;
        }

        try {
            const name = nameInput.value.trim().toUpperCase();
            
            if (!sellerId) {
                const existing = await DB.getAll('catalog_sellers') || [];
                const duplicate = existing.find(s => s.name === name);
                if (duplicate) {
                    Utils.showNotification('Ya existe un vendedor con ese nombre', 'error');
                    return;
                }
            }

            const seller = sellerId ? await DB.get('catalog_sellers', sellerId) : {
            id: Utils.generateId(),
                created_at: new Date().toISOString()
            };

            if (!seller) {
                Utils.showNotification('Vendedor no encontrado', 'error');
                return;
            }

            seller.name = name;
            seller.active = activeInput ? activeInput.checked : true;
            seller.updated_at = new Date().toISOString();
            
            if (!seller.barcode || Utils.isBarcodeEmpty?.(seller.barcode)) {
                seller.barcode = Utils.generateSellerBarcode?.(seller) || `SE${seller.id.substring(0, 6)}`;
            }

        await DB.put('catalog_sellers', seller);
        await SyncManager.addToQueue('catalog_seller', seller.id);
            Utils.showNotification(sellerId ? 'Vendedor actualizado' : 'Vendedor agregado', 'success');
            UI.closeModal();
        this.manageSellers();
        } catch (e) {
            console.error('Error guardando vendedor:', e);
            Utils.showNotification('Error al guardar: ' + e.message, 'error');
        }
    },

    async editSeller(id) {
        const seller = await DB.get('catalog_sellers', id);
        if (!seller) {
            Utils.showNotification('Vendedor no encontrado', 'error');
            return;
        }

        const body = `
            <form id="seller-form" style="max-width: 500px;">
                <div class="form-group">
                    <label>Nombre del Vendedor *</label>
                    <input type="text" id="seller-name-input" class="form-input" required 
                        value="${Utils.escapeHtml(seller.name || '')}" placeholder="Ej: JUAN PÉREZ" maxlength="100">
                    <small style="color: var(--color-text-secondary); font-size: 10px;">
                        El nombre será convertido a mayúsculas automáticamente
                    </small>
                </div>
                <div class="form-group">
                    <label style="display: flex; align-items: center; gap: var(--spacing-xs);">
                        <input type="checkbox" id="seller-active-input" ${seller.active ? 'checked' : ''}>
                        <span>Vendedor activo</span>
                    </label>
                </div>
                <div style="padding: var(--spacing-sm); background: var(--color-bg-secondary); border-radius: var(--radius-sm); font-size: 11px; color: var(--color-text-secondary);">
                    <strong>ID:</strong> ${seller.id}<br>
                    <strong>Código de Barras:</strong> ${seller.barcode || 'N/A'}
                </div>
            </form>
        `;
        
        UI.showModal('Editar Vendedor', body, [
            { text: 'Cancelar', class: 'btn-secondary', onclick: () => UI.closeModal() },
            { text: 'Guardar', class: 'btn-primary', onclick: () => this.saveSeller(id) }
        ]);
        
        setTimeout(() => {
            document.getElementById('seller-name-input')?.focus();
            document.getElementById('seller-name-input')?.select();
        }, 100);
    },

    async manageGuides() {
        const guides = await DB.getAll('catalog_guides') || [];
        const agencies = await this.getAgenciesDeduplicated();
        const body = `
            <div style="margin-bottom: var(--spacing-md);">
                <div style="display: flex; gap: var(--spacing-sm); margin-bottom: var(--spacing-sm); flex-wrap: wrap;">
                    <button class="btn-primary" onclick="window.Settings.addGuide()">
                        <i class="fas fa-plus"></i> Agregar Guía
                    </button>
            </div>
                <div class="form-group" style="margin-bottom: var(--spacing-sm);">
                    <input type="text" id="guide-search-input" class="form-input" placeholder="Buscar por nombre o agencia..." 
                        onkeyup="window.Settings.filterGuides(this.value)">
                </div>
                <div style="display: flex; gap: var(--spacing-xs); margin-bottom: var(--spacing-sm);">
                    <button class="btn-secondary btn-sm" onclick="window.Settings.filterGuides('', 'all')" style="flex: 1;">
                        Todos (${guides.length})
                    </button>
                    <button class="btn-secondary btn-sm" onclick="window.Settings.filterGuides('', 'active')" style="flex: 1;">
                        Activos (${guides.filter(g => g.active).length})
                    </button>
                    <button class="btn-secondary btn-sm" onclick="window.Settings.filterGuides('', 'inactive')" style="flex: 1;">
                        Inactivos (${guides.filter(g => !g.active).length})
                    </button>
                </div>
            </div>
            <div style="max-height: 500px; overflow-y: auto;">
                <table class="cart-table" id="guides-table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Agencia</th>
                            <th>ID</th>
                            <th>Código Barras</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="guides-tbody">
                        ${guides.map(guide => {
                            const agency = agencies.find(a => a.id === guide.agency_id);
                            return `
                                <tr data-guide-id="${guide.id}" data-guide-active="${guide.active}" data-agency-id="${guide.agency_id || ''}">
                                    <td><strong>${Utils.escapeHtml(guide.name || 'Sin nombre')}</strong></td>
                                    <td>${Utils.escapeHtml(agency?.name || 'Sin agencia')}</td>
                                    <td><small style="color: var(--color-text-secondary); font-family: monospace;">${Utils.escapeHtml(guide.id)}</small></td>
                                    <td><small style="color: var(--color-text-secondary); font-family: monospace;">${Utils.escapeHtml(guide.barcode || 'N/A')}</small></td>
                                    <td><span class="status-badge status-${guide.active ? 'disponible' : 'vendida'}">${guide.active ? 'Activo' : 'Inactivo'}</span></td>
                                    <td style="white-space: nowrap;">
                                        <button class="btn-secondary btn-sm" onclick="window.Settings.editGuide('${guide.id}')">
                                            <i class="fas fa-edit"></i> Editar
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                        ${guides.length === 0 ? '<tr><td colspan="6" style="text-align: center; padding: var(--spacing-md); color: var(--color-text-secondary);">No hay guías registrados</td></tr>' : ''}
                    </tbody>
                </table>
            </div>
        `;
        UI.showModal('Gestionar Guías', body, '<button class="btn-primary" onclick="UI.closeModal()">Cerrar</button>');
        
        window.Settings.currentGuides = guides;
        window.Settings.currentGuidesAgencies = agencies;
    },

    filterGuides(searchTerm = '', statusFilter = 'all') {
        const tbody = document.getElementById('guides-tbody');
        if (!tbody || !window.Settings.currentGuides || !window.Settings.currentGuidesAgencies) return;

        const guides = window.Settings.currentGuides;
        const agencies = window.Settings.currentGuidesAgencies;
        const search = searchTerm.toLowerCase().trim();
        
        const filtered = guides.filter(guide => {
            const agency = agencies.find(a => a.id === guide.agency_id);
            const agencyName = agency?.name || '';
            
            const matchesSearch = !search || 
                (guide.name && guide.name.toLowerCase().includes(search)) ||
                agencyName.toLowerCase().includes(search) ||
                (guide.id && guide.id.toLowerCase().includes(search)) ||
                (guide.barcode && guide.barcode.toLowerCase().includes(search));
            
            const matchesStatus = statusFilter === 'all' || 
                (statusFilter === 'active' && guide.active) ||
                (statusFilter === 'inactive' && !guide.active);
            
            return matchesSearch && matchesStatus;
        });

        tbody.innerHTML = filtered.map(guide => {
            const agency = agencies.find(a => a.id === guide.agency_id);
            return `
                <tr data-guide-id="${guide.id}" data-guide-active="${guide.active}" data-agency-id="${guide.agency_id || ''}">
                    <td><strong>${Utils.escapeHtml(guide.name || 'Sin nombre')}</strong></td>
                    <td>${Utils.escapeHtml(agency?.name || 'Sin agencia')}</td>
                    <td><small style="color: var(--color-text-secondary); font-family: monospace;">${Utils.escapeHtml(guide.id)}</small></td>
                    <td><small style="color: var(--color-text-secondary); font-family: monospace;">${Utils.escapeHtml(guide.barcode || 'N/A')}</small></td>
                    <td><span class="status-badge status-${guide.active ? 'disponible' : 'vendida'}">${guide.active ? 'Activo' : 'Inactivo'}</span></td>
                    <td style="white-space: nowrap;">
                        <button class="btn-secondary btn-sm" onclick="window.Settings.editGuide('${guide.id}')">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                    </td>
                </tr>
            `;
        }).join('') || '<tr><td colspan="6" style="text-align: center; padding: var(--spacing-md); color: var(--color-text-secondary);">No se encontraron resultados</td></tr>';
    },

    async addGuide() {
        const agencies = await this.getAgenciesDeduplicated();
        
        if (agencies.length === 0) {
            Utils.showNotification('Debes crear al menos una agencia primero', 'error');
            return;
        }

        const body = `
            <form id="guide-form" style="max-width: 500px;">
                <div class="form-group">
                    <label>Nombre del Guía *</label>
                    <input type="text" id="guide-name-input" class="form-input" required 
                        placeholder="Ej: CARLOS RAMÍREZ" maxlength="100">
                    <small style="color: var(--color-text-secondary); font-size: 10px;">
                        El nombre será convertido a mayúsculas automáticamente
                    </small>
                </div>
                <div class="form-group">
                    <label>Agencia *</label>
                    <select id="guide-agency-input" class="form-select" required>
                        <option value="">Seleccionar agencia...</option>
                        ${agencies.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label style="display: flex; align-items: center; gap: var(--spacing-xs);">
                        <input type="checkbox" id="guide-active-input" checked>
                        <span>Guía activo</span>
                    </label>
                </div>
            </form>
        `;
        
        UI.showModal('Nuevo Guía', body, [
            { text: 'Cancelar', class: 'btn-secondary', onclick: () => UI.closeModal() },
            { text: 'Guardar', class: 'btn-primary', onclick: () => this.saveGuide() }
        ]);
        
        setTimeout(() => {
            document.getElementById('guide-name-input')?.focus();
        }, 100);
    },

    async saveGuide(guideId = null) {
        const form = document.getElementById('guide-form');
        if (!form || !form.checkValidity()) {
            form?.reportValidity();
            return;
        }

        const nameInput = document.getElementById('guide-name-input');
        const agencyInput = document.getElementById('guide-agency-input');
        const activeInput = document.getElementById('guide-active-input');
        
        if (!nameInput || !nameInput.value.trim()) {
            Utils.showNotification('El nombre es requerido', 'error');
            return;
        }

        if (!agencyInput || !agencyInput.value) {
            Utils.showNotification('Debes seleccionar una agencia', 'error');
            return;
        }

        try {
            const name = nameInput.value.trim().toUpperCase();
            const agencyId = agencyInput.value;
            
            // Verificar que la agencia existe
            const agency = await DB.get('catalog_agencies', agencyId);
            if (!agency) {
                Utils.showNotification('La agencia seleccionada no existe', 'error');
                return;
            }

            if (!guideId) {
                const existing = await DB.getAll('catalog_guides') || [];
                const duplicate = existing.find(g => g.name === name && g.agency_id === agencyId);
                if (duplicate) {
                    Utils.showNotification('Ya existe un guía con ese nombre en esta agencia', 'error');
                    return;
                }
            }

            const guide = guideId ? await DB.get('catalog_guides', guideId) : {
            id: Utils.generateId(),
                created_at: new Date().toISOString()
            };

            if (!guide) {
                Utils.showNotification('Guía no encontrado', 'error');
                return;
            }

            guide.name = name;
            guide.agency_id = agencyId;
            guide.active = activeInput ? activeInput.checked : true;
            guide.updated_at = new Date().toISOString();
            
            if (!guide.barcode || Utils.isBarcodeEmpty?.(guide.barcode)) {
                guide.barcode = Utils.generateGuideBarcode?.(guide) || `GU${guide.id.substring(0, 6)}`;
            }

        await DB.put('catalog_guides', guide);
        await SyncManager.addToQueue('catalog_guide', guide.id);
            Utils.showNotification(guideId ? 'Guía actualizado' : 'Guía agregado', 'success');
            UI.closeModal();
        this.manageGuides();
        } catch (e) {
            console.error('Error guardando guía:', e);
            Utils.showNotification('Error al guardar: ' + e.message, 'error');
        }
    },

    async editGuide(id) {
        const guide = await DB.get('catalog_guides', id);
        if (!guide) {
            Utils.showNotification('Guía no encontrado', 'error');
            return;
        }

        const agencies = await this.getAgenciesDeduplicated();

        const body = `
            <form id="guide-form" style="max-width: 500px;">
                <div class="form-group">
                    <label>Nombre del Guía *</label>
                    <input type="text" id="guide-name-input" class="form-input" required 
                        value="${Utils.escapeHtml(guide.name || '')}" placeholder="Ej: CARLOS RAMÍREZ" maxlength="100">
                    <small style="color: var(--color-text-secondary); font-size: 10px;">
                        El nombre será convertido a mayúsculas automáticamente
                    </small>
                </div>
                <div class="form-group">
                    <label>Agencia *</label>
                    <select id="guide-agency-input" class="form-select" required>
                        <option value="">Seleccionar agencia...</option>
                        ${agencies.map(a => `<option value="${a.id}" ${guide.agency_id === a.id ? 'selected' : ''}>${a.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label style="display: flex; align-items: center; gap: var(--spacing-xs);">
                        <input type="checkbox" id="guide-active-input" ${guide.active ? 'checked' : ''}>
                        <span>Guía activo</span>
                    </label>
                </div>
                <div style="padding: var(--spacing-sm); background: var(--color-bg-secondary); border-radius: var(--radius-sm); font-size: 11px; color: var(--color-text-secondary);">
                    <strong>ID:</strong> ${guide.id}<br>
                    <strong>Código de Barras:</strong> ${guide.barcode || 'N/A'}
                </div>
            </form>
        `;
        
        UI.showModal('Editar Guía', body, [
            { text: 'Cancelar', class: 'btn-secondary', onclick: () => UI.closeModal() },
            { text: 'Guardar', class: 'btn-primary', onclick: () => this.saveGuide(id) }
        ]);
        
        setTimeout(() => {
            document.getElementById('guide-name-input')?.focus();
            document.getElementById('guide-name-input')?.select();
        }, 100);
    },

    async manageBranches() {
        const branches = await DB.getAll('catalog_branches') || [];
        const employees = await DB.getAll('employees') || [];
        
        // Contar empleados por sucursal
        const employeesByBranch = {};
        employees.forEach(emp => {
            if (emp.branch_id) {
                if (!employeesByBranch[emp.branch_id]) {
                    employeesByBranch[emp.branch_id] = [];
                }
                employeesByBranch[emp.branch_id].push(emp);
            }
        });
        
        const body = `
            <div style="margin-bottom: var(--spacing-md);">
                <div style="display: flex; gap: var(--spacing-sm); margin-bottom: var(--spacing-sm); flex-wrap: wrap;">
                    <button class="btn-primary" onclick="window.Settings.addBranch()">
                        <i class="fas fa-plus"></i> Agregar Sucursal
                    </button>
                </div>
                <div class="form-group" style="margin-bottom: var(--spacing-sm);">
                    <input type="text" id="branch-search-input" class="form-input" placeholder="Buscar por nombre, dirección..." 
                        onkeyup="window.Settings.filterBranches(this.value)">
                </div>
                <div style="display: flex; gap: var(--spacing-xs); margin-bottom: var(--spacing-sm);">
                    <button class="btn-secondary btn-sm active" data-filter="all" onclick="window.Settings.filterBranches('', 'all')" style="flex: 1;">
                        Todas (${branches.length})
                    </button>
                    <button class="btn-secondary btn-sm" data-filter="active" onclick="window.Settings.filterBranches('', 'active')" style="flex: 1;">
                        Activas (${branches.filter(b => b.active).length})
                    </button>
                    <button class="btn-secondary btn-sm" data-filter="inactive" onclick="window.Settings.filterBranches('', 'inactive')" style="flex: 1;">
                        Inactivas (${branches.filter(b => !b.active).length})
                    </button>
                </div>
            </div>
            <div style="max-height: 600px; overflow-y: auto;">
                <table class="cart-table" id="branches-table" style="width: 100%;">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Dirección</th>
                            <th>Empleados</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="branches-tbody">
                        ${branches.map(branch => {
                            const branchEmployees = employeesByBranch[branch.id] || [];
                            return `
                            <tr data-branch-id="${branch.id}" data-branch-active="${branch.active}">
                                <td>
                                    <strong>${Utils.escapeHtml(branch.name || 'Sin nombre')}</strong>
                                    <br><small style="color: var(--color-text-secondary); font-family: monospace; font-size: 9px;">ID: ${branch.id}</small>
                                </td>
                                <td>
                                    ${branch.address ? `<span>${Utils.escapeHtml(branch.address)}</span>` : '<span style="color: var(--color-text-secondary); font-style: italic;">Sin dirección</span>'}
                                </td>
                                <td>
                                    <div style="display: flex; align-items: center; gap: var(--spacing-xs);">
                                        <span class="status-badge status-info">${branchEmployees.length} empleado(s)</span>
                                        ${branchEmployees.length > 0 ? `
                                            <button class="btn-secondary btn-sm" onclick="(function(id) { if (window.Settings && window.Settings.viewBranchEmployees) { window.Settings.viewBranchEmployees(id); } else { console.error('Settings.viewBranchEmployees no disponible'); } })('${branch.id.replace(/'/g, "\\'")}')" title="Ver empleados">
                                                <i class="fas fa-users"></i>
                                            </button>
                                        ` : ''}
                                    </div>
                                </td>
                                <td>
                                    <span class="status-badge status-${branch.active ? 'disponible' : 'vendida'}">${branch.active ? 'Activa' : 'Inactiva'}</span>
                                </td>
                                <td style="white-space: nowrap;">
                                    <button class="btn-secondary btn-sm" onclick="(function(id) { if (window.Settings && window.Settings.editBranch) { window.Settings.editBranch(id); } else { console.error('Settings.editBranch no disponible'); } })('${branch.id.replace(/'/g, "\\'")}')" title="Editar">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn-primary btn-sm" onclick="(function(id) { if (window.Settings && window.Settings.assignEmployeesToBranch) { window.Settings.assignEmployeesToBranch(id); } else { console.error('Settings.assignEmployeesToBranch no disponible'); } })('${branch.id.replace(/'/g, "\\'")}')" title="Asignar Empleados">
                                        <i class="fas fa-user-plus"></i>
                                    </button>
                                    ${branch.active ? `
                                        <button class="btn-danger btn-sm" onclick="(function(id) { if (window.Settings && window.Settings.toggleBranchStatus) { window.Settings.toggleBranchStatus(id, false); } else { console.error('Settings.toggleBranchStatus no disponible'); } })('${branch.id.replace(/'/g, "\\'")}')" title="Desactivar">
                                            <i class="fas fa-ban"></i>
                                        </button>
                                    ` : `
                                        <button class="btn-success btn-sm" onclick="(function(id) { if (window.Settings && window.Settings.toggleBranchStatus) { window.Settings.toggleBranchStatus(id, true); } else { console.error('Settings.toggleBranchStatus no disponible'); } })('${branch.id.replace(/'/g, "\\'")}')" title="Activar">
                                            <i class="fas fa-check"></i>
                                        </button>
                                    `}
                                </td>
                            </tr>
                        `;
                        }).join('')}
                        ${branches.length === 0 ? '<tr><td colspan="5" style="text-align: center; padding: var(--spacing-md); color: var(--color-text-secondary);">No hay sucursales registradas. <button class="btn-primary btn-sm" onclick="window.Settings.addBranch()" style="margin-top: var(--spacing-sm);">Crear Primera Sucursal</button></td></tr>' : ''}
                    </tbody>
                </table>
            </div>
        `;
        UI.showModal('Gestionar Sucursales', body, '<button class="btn-primary" onclick="UI.closeModal()">Cerrar</button>');
        
        window.Settings.currentBranches = branches;
        window.Settings.currentEmployeesByBranch = employeesByBranch;
        
        // Configurar event listeners después de mostrar el modal para mayor robustez
        setTimeout(() => {
            // Event delegation para los botones de acciones
            const tbody = document.getElementById('branches-tbody');
            if (tbody) {
                tbody.addEventListener('click', async (e) => {
                    const button = e.target.closest('button');
                    if (!button) return;
                    
                    const row = button.closest('tr');
                    if (!row) return;
                    
                    const branchId = row.dataset.branchId;
                    if (!branchId) return;
                    
                    // Botón Editar
                    if (button.querySelector('.fa-edit')) {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Edit button clicked for branch:', branchId);
                        if (window.Settings && window.Settings.editBranch) {
                            await window.Settings.editBranch(branchId);
                        } else {
                            console.error('Settings.editBranch no disponible');
                            Utils.showNotification('Error: Función no disponible', 'error');
                        }
                        return;
                    }
                    
                    // Botón Asignar Empleados
                    if (button.querySelector('.fa-user-plus')) {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Assign employees button clicked for branch:', branchId);
                        if (window.Settings && window.Settings.assignEmployeesToBranch) {
                            await window.Settings.assignEmployeesToBranch(branchId);
                        } else {
                            console.error('Settings.assignEmployeesToBranch no disponible');
                            Utils.showNotification('Error: Función no disponible', 'error');
                        }
                        return;
                    }
                    
                    // Botón Ver Empleados
                    if (button.querySelector('.fa-users')) {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('View employees button clicked for branch:', branchId);
                        if (window.Settings && window.Settings.viewBranchEmployees) {
                            await window.Settings.viewBranchEmployees(branchId);
                        } else {
                            console.error('Settings.viewBranchEmployees no disponible');
                            Utils.showNotification('Error: Función no disponible', 'error');
                        }
                        return;
                    }
                    
                    // Botón Toggle Status (ban/check)
                    if (button.querySelector('.fa-ban') || button.querySelector('.fa-check')) {
                        e.preventDefault();
                        e.stopPropagation();
                        const isActive = button.querySelector('.fa-ban') ? false : true;
                        console.log('Toggle status button clicked for branch:', branchId, 'active:', isActive);
                        if (window.Settings && window.Settings.toggleBranchStatus) {
                            await window.Settings.toggleBranchStatus(branchId, isActive);
                        } else {
                            console.error('Settings.toggleBranchStatus no disponible');
                            Utils.showNotification('Error: Función no disponible', 'error');
                        }
                        return;
                    }
                });
            }
        }, 200);
    },

    filterBranches(searchTerm = '', statusFilter = 'all') {
        const tbody = document.getElementById('branches-tbody');
        if (!tbody || !window.Settings.currentBranches) return;

        const branches = window.Settings.currentBranches;
        const employeesByBranch = window.Settings.currentEmployeesByBranch || {};
        const search = searchTerm.toLowerCase().trim();
        
        // Actualizar botones de filtro activos
        document.querySelectorAll('[data-filter]').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === statusFilter) {
                btn.classList.add('active');
            }
        });
        
        const filtered = branches.filter(branch => {
            const matchesSearch = !search || 
                (branch.name && branch.name.toLowerCase().includes(search)) ||
                (branch.address && branch.address.toLowerCase().includes(search)) ||
                (branch.id && branch.id.toLowerCase().includes(search));
            
            const matchesStatus = statusFilter === 'all' || 
                (statusFilter === 'active' && branch.active) ||
                (statusFilter === 'inactive' && !branch.active);
            
            return matchesSearch && matchesStatus;
        });

        tbody.innerHTML = filtered.map(branch => {
            const branchEmployees = employeesByBranch[branch.id] || [];
            return `
            <tr data-branch-id="${branch.id}" data-branch-active="${branch.active}">
                <td>
                    <strong>${Utils.escapeHtml(branch.name || 'Sin nombre')}</strong>
                    <br><small style="color: var(--color-text-secondary); font-family: monospace; font-size: 9px;">ID: ${branch.id}</small>
                </td>
                <td>
                    ${branch.address ? `<span>${Utils.escapeHtml(branch.address)}</span>` : '<span style="color: var(--color-text-secondary); font-style: italic;">Sin dirección</span>'}
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: var(--spacing-xs);">
                        <span class="status-badge status-info">${branchEmployees.length} empleado(s)</span>
                        ${branchEmployees.length > 0 ? `
                            <button class="btn-secondary btn-sm" onclick="window.Settings.viewBranchEmployees('${branch.id}')" title="Ver empleados">
                                <i class="fas fa-users"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
                <td>
                    <span class="status-badge status-${branch.active ? 'disponible' : 'vendida'}">${branch.active ? 'Activa' : 'Inactiva'}</span>
                </td>
                <td style="white-space: nowrap;">
                    <button class="btn-secondary btn-sm" onclick="(function(id) { if (window.Settings && window.Settings.editBranch) { window.Settings.editBranch(id); } else { console.error('Settings.editBranch no disponible'); } })('${branch.id.replace(/'/g, "\\'")}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-primary btn-sm" onclick="(function(id) { if (window.Settings && window.Settings.assignEmployeesToBranch) { window.Settings.assignEmployeesToBranch(id); } else { console.error('Settings.assignEmployeesToBranch no disponible'); } })('${branch.id.replace(/'/g, "\\'")}')" title="Asignar Empleados">
                        <i class="fas fa-user-plus"></i>
                    </button>
                    ${branch.active ? `
                        <button class="btn-danger btn-sm" onclick="(function(id) { if (window.Settings && window.Settings.toggleBranchStatus) { window.Settings.toggleBranchStatus(id, false); } else { console.error('Settings.toggleBranchStatus no disponible'); } })('${branch.id.replace(/'/g, "\\'")}')" title="Desactivar">
                            <i class="fas fa-ban"></i>
                        </button>
                    ` : `
                        <button class="btn-success btn-sm" onclick="(function(id) { if (window.Settings && window.Settings.toggleBranchStatus) { window.Settings.toggleBranchStatus(id, true); } else { console.error('Settings.toggleBranchStatus no disponible'); } })('${branch.id.replace(/'/g, "\\'")}')" title="Activar">
                            <i class="fas fa-check"></i>
                        </button>
                    `}
                </td>
            </tr>
        `;
        }).join('') || '<tr><td colspan="5" style="text-align: center; padding: var(--spacing-md); color: var(--color-text-secondary);">No se encontraron resultados</td></tr>';
    },

    async addBranch() {
        const body = `
            <form id="branch-form" style="max-width: 600px;">
                <div class="form-group">
                    <label>Nombre de la Sucursal *</label>
                    <input type="text" id="branch-name-input" class="form-input" required 
                        placeholder="Ej: Sucursal Centro, Tienda Plaza, etc." maxlength="100">
                    <small style="color: var(--color-text-secondary); font-size: 10px;">Nombre que aparecerá en todo el sistema</small>
                </div>
                <div class="form-group">
                    <label>Dirección (opcional)</label>
                    <textarea id="branch-address-input" class="form-textarea" rows="2" 
                        placeholder="Ej: Av. Principal #123, Col. Centro, Ciudad"></textarea>
                    <small style="color: var(--color-text-secondary); font-size: 10px;">Dirección física de la sucursal</small>
                </div>
                <div class="form-group">
                    <label>Teléfono (opcional)</label>
                    <input type="text" id="branch-phone-input" class="form-input" 
                        placeholder="Ej: (999) 123-4567" maxlength="20">
                </div>
                
                <!-- Datos Empresariales -->
                <div style="margin-top: var(--spacing-md); padding-top: var(--spacing-md); border-top: 2px solid var(--color-border-light);">
                    <h4 style="font-size: 12px; font-weight: 600; margin-bottom: var(--spacing-sm); color: var(--color-primary);">
                        <i class="fas fa-building"></i> Datos Empresariales (Personalización)
                    </h4>
                    <small style="color: var(--color-text-secondary); font-size: 10px; display: block; margin-bottom: var(--spacing-sm);">
                        Estos datos se usarán en tickets, reportes y documentos generados para esta sucursal
                    </small>
                    
                    <div class="form-group">
                        <label>Nombre Comercial / Razón Social</label>
                        <input type="text" id="branch-business-name-input" class="form-input" 
                            placeholder="Ej: Opal & Co Sucursal Centro" maxlength="200">
                        <small style="color: var(--color-text-secondary); font-size: 9px;">Nombre que aparecerá en tickets y documentos</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Dirección Completa</label>
                        <textarea id="branch-business-address-input" class="form-textarea" rows="3" 
                            placeholder="Ej: Av. Principal #123, Col. Centro, CP 97000, Ciudad, Estado"></textarea>
                        <small style="color: var(--color-text-secondary); font-size: 9px;">Dirección completa para documentos fiscales</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Teléfono de Contacto</label>
                        <input type="text" id="branch-business-phone-input" class="form-input" 
                            placeholder="Ej: +52 999 123 4567" maxlength="30">
                    </div>
                    
                    <div class="form-group">
                        <label>Correo Electrónico</label>
                        <input type="email" id="branch-business-email-input" class="form-input" 
                            placeholder="Ej: ventas@sucursal-centro.opal.com" maxlength="100">
                    </div>
                    
                    <div class="form-group">
                        <label>RFC (Registro Federal de Contribuyentes)</label>
                        <input type="text" id="branch-business-rfc-input" class="form-input" 
                            placeholder="Ej: ABC123456789" maxlength="20">
                        <small style="color: var(--color-text-secondary); font-size: 9px;">Para facturación y documentos fiscales</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Pie de Página Personalizado</label>
                        <textarea id="branch-business-footer-input" class="form-textarea" rows="2" 
                            placeholder="Ej: ¡Gracias por su compra! Visítenos pronto."></textarea>
                        <small style="color: var(--color-text-secondary); font-size: 9px;">Mensaje que aparecerá al final de tickets</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Logo (URL o Base64)</label>
                        <input type="text" id="branch-business-logo-input" class="form-input" 
                            placeholder="Ej: https://ejemplo.com/logo.png o data:image/png;base64,...">
                        <small style="color: var(--color-text-secondary); font-size: 9px;">URL de imagen o datos en base64. Se usará en tickets y reportes.</small>
                        <button type="button" class="btn-secondary btn-sm" onclick="window.Settings.uploadBranchLogo()" style="width: 100%; margin-top: var(--spacing-xs);">
                            <i class="fas fa-upload"></i> Subir Logo
                        </button>
                    </div>
                </div>
                
                <div class="form-group">
                    <label style="display: flex; align-items: center; gap: var(--spacing-xs);">
                        <input type="checkbox" id="branch-active-input" checked>
                        <span>Sucursal activa</span>
                    </label>
                    <small style="color: var(--color-text-secondary); font-size: 10px;">Las sucursales inactivas no aparecerán en los selectores</small>
                </div>
            </form>
        `;
        
        UI.showModal('Nueva Sucursal', body, [
            { text: 'Cancelar', class: 'btn-secondary', onclick: () => UI.closeModal() },
            { text: 'Guardar', class: 'btn-primary', onclick: () => this.saveBranch() }
        ]);
        
        setTimeout(() => {
            document.getElementById('branch-name-input')?.focus();
        }, 100);
    },

    async saveBranch(branchId = null) {
        const form = document.getElementById('branch-form');
        if (!form || !form.checkValidity()) {
            form?.reportValidity();
            return;
        }

        const nameInput = document.getElementById('branch-name-input');
        const addressInput = document.getElementById('branch-address-input');
        const phoneInput = document.getElementById('branch-phone-input');
        const activeInput = document.getElementById('branch-active-input');
        
        // Datos empresariales
        const businessNameInput = document.getElementById('branch-business-name-input');
        const businessAddressInput = document.getElementById('branch-business-address-input');
        const businessPhoneInput = document.getElementById('branch-business-phone-input');
        const businessEmailInput = document.getElementById('branch-business-email-input');
        const businessRfcInput = document.getElementById('branch-business-rfc-input');
        const businessFooterInput = document.getElementById('branch-business-footer-input');
        const businessLogoInput = document.getElementById('branch-business-logo-input');
        
        if (!nameInput || !nameInput.value.trim()) {
            Utils.showNotification('El nombre es requerido', 'error');
            return;
        }

        try {
            const name = nameInput.value.trim();
            const address = addressInput?.value.trim() || '';
            const phone = phoneInput?.value.trim() || '';
            const active = activeInput ? activeInput.checked : true;
            
            // Datos empresariales
            const businessName = businessNameInput?.value.trim() || '';
            const businessAddress = businessAddressInput?.value.trim() || '';
            const businessPhone = businessPhoneInput?.value.trim() || '';
            const businessEmail = businessEmailInput?.value.trim() || '';
            const businessRfc = businessRfcInput?.value.trim() || '';
            const businessFooter = businessFooterInput?.value.trim() || '';
            const businessLogo = businessLogoInput?.value.trim() || '';
            
            // Validar email si se proporciona
            if (businessEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessEmail)) {
                Utils.showNotification('El formato del correo electrónico no es válido', 'error');
                return;
            }
            
            // Validaciones estrictas
            if (name.length < 2) {
                Utils.showNotification('El nombre debe tener al menos 2 caracteres', 'error');
                return;
            }
            
            if (name.length > 100) {
                Utils.showNotification('El nombre es demasiado largo (máximo 100 caracteres)', 'error');
                return;
            }
            
            // Validar formato de teléfono si se proporciona
            if (phone && phone.length > 0) {
                const phoneRegex = /^[\d\s()+-]+$/;
                if (!phoneRegex.test(phone) || phone.length > 20) {
                    Utils.showNotification('El formato del teléfono no es válido', 'error');
                    return;
                }
            }
            
            // Verificar duplicados (excluyendo el actual si es edición)
            const existing = await DB.getAll('catalog_branches') || [];
            const duplicate = existing.find(b => 
                b.name.toLowerCase() === name.toLowerCase() && 
                (!branchId || b.id !== branchId)
            );
            if (duplicate) {
                Utils.showNotification('Ya existe una sucursal con ese nombre. Por favor, usa un nombre diferente.', 'error');
                return;
            }

            const branch = branchId ? await DB.get('catalog_branches', branchId) : {
                id: Utils.generateId(),
                created_at: new Date().toISOString()
            };

            if (branchId && !branch) {
                Utils.showNotification('Sucursal no encontrada', 'error');
                return;
            }

            // Guardar valores anteriores para rollback si es necesario
            const previousValues = branchId ? {
                name: branch.name,
                active: branch.active
            } : null;

            branch.name = name;
            branch.address = address;
            branch.phone = phone;
            branch.active = active;
            
            // Datos empresariales
            branch.business_name = businessName;
            branch.business_address = businessAddress;
            branch.business_phone = businessPhone;
            branch.business_email = businessEmail;
            branch.business_rfc = businessRfc.toUpperCase();
            branch.business_footer = businessFooter;
            branch.business_logo = businessLogo;
            
            branch.updated_at = new Date().toISOString();

            // Si se está desactivando, verificar que no haya dependencias críticas
            if (branchId && previousValues && previousValues.active && !active) {
                const employees = await DB.getAll('employees') || [];
                const branchEmployees = employees.filter(emp => emp.branch_id === branchId && emp.active);
                
                if (branchEmployees.length > 0) {
                    const confirmMsg = `Esta sucursal tiene ${branchEmployees.length} empleado(s) activo(s). ` +
                                     `Si la desactivas, los empleados no podrán iniciar sesión. ` +
                                     `¿Deseas continuar?`;
                    if (!await Utils.confirm(confirmMsg)) {
                        return;
                    }
                }
            }

            // Validar que el ID sea válido
            if (!branch.id || branch.id.length === 0) {
                Utils.showNotification('Error: ID de sucursal inválido', 'error');
                return;
            }

            await DB.put('catalog_branches', branch);
            
            // Log de auditoría
            console.log(`Branch ${branchId ? 'updated' : 'created'}:`, {
                id: branch.id,
                name: branch.name,
                active: branch.active,
                previousValues
            });
            
            // Sincronizar si está disponible
            if (typeof SyncManager !== 'undefined') {
                await SyncManager.addToQueue('catalog_branch', branch.id);
            }
            
            Utils.showNotification(branchId ? 'Sucursal actualizada correctamente' : 'Sucursal agregada correctamente', 'success');
            UI.closeModal();
            await this.manageBranches();
        } catch (e) {
            console.error('Error guardando sucursal:', e);
            Utils.showNotification('Error al guardar: ' + e.message, 'error');
        }
    },

    async editBranch(id) {
        console.log('editBranch llamado con ID:', id);
        try {
            const branch = await DB.get('catalog_branches', id);
            if (!branch) {
                Utils.showNotification('Sucursal no encontrada', 'error');
                return;
            }

        const body = `
            <form id="branch-form" style="max-width: 600px;">
                <div class="form-group">
                    <label>Nombre de la Sucursal *</label>
                    <input type="text" id="branch-name-input" class="form-input" required 
                        value="${Utils.escapeHtml(branch.name || '')}" placeholder="Ej: Sucursal Centro" maxlength="100">
                </div>
                <div class="form-group">
                    <label>Dirección (opcional)</label>
                    <textarea id="branch-address-input" class="form-textarea" rows="2" 
                        placeholder="Ej: Av. Principal #123, Col. Centro, Ciudad">${Utils.escapeHtml(branch.address || '')}</textarea>
                </div>
                <div class="form-group">
                    <label>Teléfono (opcional)</label>
                    <input type="text" id="branch-phone-input" class="form-input" 
                        value="${Utils.escapeHtml(branch.phone || '')}" placeholder="Ej: (999) 123-4567" maxlength="20">
                </div>
                
                <!-- Datos Empresariales -->
                <div style="margin-top: var(--spacing-md); padding-top: var(--spacing-md); border-top: 2px solid var(--color-border-light);">
                    <h4 style="font-size: 12px; font-weight: 600; margin-bottom: var(--spacing-sm); color: var(--color-primary);">
                        <i class="fas fa-building"></i> Datos Empresariales (Personalización)
                    </h4>
                    <small style="color: var(--color-text-secondary); font-size: 10px; display: block; margin-bottom: var(--spacing-sm);">
                        Estos datos se usarán en tickets, reportes y documentos generados para esta sucursal
                    </small>
                    
                    <div class="form-group">
                        <label>Nombre Comercial / Razón Social</label>
                        <input type="text" id="branch-business-name-input" class="form-input" 
                            value="${Utils.escapeHtml(branch.business_name || '')}" placeholder="Ej: Opal & Co Sucursal Centro" maxlength="200">
                        <small style="color: var(--color-text-secondary); font-size: 9px;">Nombre que aparecerá en tickets y documentos</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Dirección Completa</label>
                        <textarea id="branch-business-address-input" class="form-textarea" rows="3" 
                            placeholder="Ej: Av. Principal #123, Col. Centro, CP 97000, Ciudad, Estado">${Utils.escapeHtml(branch.business_address || '')}</textarea>
                        <small style="color: var(--color-text-secondary); font-size: 9px;">Dirección completa para documentos fiscales</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Teléfono de Contacto</label>
                        <input type="text" id="branch-business-phone-input" class="form-input" 
                            value="${Utils.escapeHtml(branch.business_phone || '')}" placeholder="Ej: +52 999 123 4567" maxlength="30">
                    </div>
                    
                    <div class="form-group">
                        <label>Correo Electrónico</label>
                        <input type="email" id="branch-business-email-input" class="form-input" 
                            value="${Utils.escapeHtml(branch.business_email || '')}" placeholder="Ej: ventas@sucursal-centro.opal.com" maxlength="100">
                    </div>
                    
                    <div class="form-group">
                        <label>RFC (Registro Federal de Contribuyentes)</label>
                        <input type="text" id="branch-business-rfc-input" class="form-input" 
                            value="${Utils.escapeHtml(branch.business_rfc || '')}" placeholder="Ej: ABC123456789" maxlength="20">
                        <small style="color: var(--color-text-secondary); font-size: 9px;">Para facturación y documentos fiscales</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Pie de Página Personalizado</label>
                        <textarea id="branch-business-footer-input" class="form-textarea" rows="2" 
                            placeholder="Ej: ¡Gracias por su compra! Visítenos pronto.">${Utils.escapeHtml(branch.business_footer || '')}</textarea>
                        <small style="color: var(--color-text-secondary); font-size: 9px;">Mensaje que aparecerá al final de tickets</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Logo (URL o Base64)</label>
                        <input type="text" id="branch-business-logo-input" class="form-input" 
                            value="${Utils.escapeHtml(branch.business_logo || '')}" placeholder="Ej: https://ejemplo.com/logo.png o data:image/png;base64,...">
                        <small style="color: var(--color-text-secondary); font-size: 9px;">URL de imagen o datos en base64. Se usará en tickets y reportes.</small>
                        <button type="button" class="btn-secondary btn-sm" onclick="window.Settings.uploadBranchLogo()" style="width: 100%; margin-top: var(--spacing-xs);">
                            <i class="fas fa-upload"></i> Subir Logo
                        </button>
                        ${branch.business_logo ? `
                            <div style="margin-top: var(--spacing-xs); padding: var(--spacing-xs); background: var(--color-bg-secondary); border-radius: var(--radius-xs);">
                                <img src="${Utils.escapeHtml(branch.business_logo)}" alt="Logo" style="max-width: 100px; max-height: 50px; object-fit: contain;" onerror="this.style.display='none'">
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="form-group">
                    <label style="display: flex; align-items: center; gap: var(--spacing-xs);">
                        <input type="checkbox" id="branch-active-input" ${branch.active ? 'checked' : ''}>
                        <span>Sucursal activa</span>
                    </label>
                </div>
                <div style="padding: var(--spacing-sm); background: var(--color-bg-secondary); border-radius: var(--radius-sm); font-size: 11px; color: var(--color-text-secondary);">
                    <strong>ID:</strong> ${branch.id}
                    <br><strong>Creada:</strong> ${Utils.formatDate(new Date(branch.created_at), 'DD/MM/YYYY HH:mm')}
                </div>
            </form>
        `;
        
        UI.showModal('Editar Sucursal', body, [
            { text: 'Cancelar', class: 'btn-secondary', onclick: () => UI.closeModal() },
            { text: 'Guardar', class: 'btn-primary', onclick: () => this.saveBranch(id) }
        ]);
        
        setTimeout(() => {
            document.getElementById('branch-name-input')?.focus();
            document.getElementById('branch-name-input')?.select();
        }, 100);
        } catch (e) {
            console.error('Error en editBranch:', e);
            Utils.showNotification('Error: ' + e.message, 'error');
        }
    },

    async toggleBranchStatus(branchId, active) {
        console.log('toggleBranchStatus llamado con ID:', branchId, 'active:', active);
        try {
            if (!branchId) {
                Utils.showNotification('ID de sucursal inválido', 'error');
                return;
            }

            const branch = await DB.get('catalog_branches', branchId);
            if (!branch) {
                Utils.showNotification('Sucursal no encontrada', 'error');
                return;
            }

            // Si ya está en el estado deseado, no hacer nada
            if (branch.active === active) {
                return;
            }

            // Si se está desactivando, verificar dependencias
            if (!active) {
                const employees = await DB.getAll('employees') || [];
                const branchEmployees = employees.filter(emp => emp.branch_id === branchId && emp.active);
                
                if (branchEmployees.length > 0) {
                    const confirmMsg = `⚠️ ADVERTENCIA: Esta sucursal tiene ${branchEmployees.length} empleado(s) activo(s).\n\n` +
                                     `Si la desactivas:\n` +
                                     `• Los empleados no podrán iniciar sesión\n` +
                                     `• Sus datos seguirán asociados a esta sucursal\n` +
                                     `• Deberás reasignarlos manualmente a otra sucursal\n\n` +
                                     `¿Deseas continuar con la desactivación?`;
                    
                    if (!await Utils.confirm(confirmMsg)) {
                        return;
                    }
                }

                // Verificar si hay ventas recientes (últimos 30 días)
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                const sales = await DB.getAll('sales') || [];
                const recentSales = sales.filter(sale => 
                    sale.branch_id === branchId && 
                    new Date(sale.created_at) >= thirtyDaysAgo
                );
                
                if (recentSales.length > 0) {
                    const confirmMsg2 = `Esta sucursal tiene ${recentSales.length} venta(s) en los últimos 30 días.\n\n` +
                                      `¿Estás seguro de que deseas desactivarla?`;
                    if (!await Utils.confirm(confirmMsg2)) {
                        return;
                    }
                }
            }

            const previousActive = branch.active;
            branch.active = active;
            branch.updated_at = new Date().toISOString();
            
            await DB.put('catalog_branches', branch);
            
            // Log de auditoría
            console.log(`Branch status toggled:`, {
                id: branch.id,
                name: branch.name,
                previousActive,
                newActive: active
            });
            
            if (typeof SyncManager !== 'undefined') {
                await SyncManager.addToQueue('catalog_branch', branch.id);
            }
            
            Utils.showNotification(`Sucursal ${active ? 'activada' : 'desactivada'} correctamente`, 'success');
            await this.manageBranches();
        } catch (e) {
            console.error('Error cambiando estado de sucursal:', e);
            Utils.showNotification('Error: ' + e.message, 'error');
        }
    },

    async assignEmployeesToBranch(branchId) {
        console.log('assignEmployeesToBranch llamado con ID:', branchId);
        try {
            const branch = await DB.get('catalog_branches', branchId);
            if (!branch) {
                Utils.showNotification('Sucursal no encontrada', 'error');
                return;
            }

            const allEmployees = await DB.getAll('employees') || [];
            const allBranches = await DB.getAll('catalog_branches') || [];
            const branchesMap = {};
            allBranches.forEach(b => { branchesMap[b.id] = b.name; });
            
            // Filtrar empleados que tienen acceso a esta sucursal
            // Para admin y manager pueden tener múltiples (branch_ids), otros solo uno (branch_id)
            const currentEmployees = allEmployees.filter(emp => {
                if (emp.role === 'admin' || emp.role === 'manager') {
                    // Para admin/manager, usar branch_ids (array) si existe, o branch_id como fallback
                    const branchIds = emp.branch_ids || (emp.branch_id ? [emp.branch_id] : []);
                    return branchIds.includes(branchId);
                } else {
                    // Para otros roles, usar branch_id único
                    return emp.branch_id === branchId;
                }
            });
            
            // Empleados disponibles: los que NO están en esta sucursal
            const availableEmployees = allEmployees.filter(emp => {
                if (emp.role === 'admin' || emp.role === 'manager') {
                    const branchIds = emp.branch_ids || (emp.branch_id ? [emp.branch_id] : []);
                    return !branchIds.includes(branchId);
                } else {
                    return emp.branch_id !== branchId && (!emp.branch_id || emp.branch_id !== branchId);
                }
            });

            const body = `
                <div style="max-width: 700px;">
                    <div style="margin-bottom: var(--spacing-md); padding: var(--spacing-sm); background: var(--color-bg-secondary); border-radius: var(--radius-sm);">
                        <strong>Sucursal:</strong> ${Utils.escapeHtml(branch.name)}
                    </div>
                    
                    <div style="margin-bottom: var(--spacing-md);">
                        <h4 style="font-size: 12px; font-weight: 600; margin-bottom: var(--spacing-sm);">Empleados Actuales (${currentEmployees.length})</h4>
                        <div style="max-height: 200px; overflow-y: auto; border: 1px solid var(--color-border-light); border-radius: var(--radius-sm); padding: var(--spacing-sm);">
                            ${currentEmployees.length > 0 ? `
                                <div style="display: grid; gap: var(--spacing-xs);">
                                    ${currentEmployees.map(emp => `
                                        <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--spacing-xs); background: var(--color-bg-card); border-radius: var(--radius-xs);">
                                            <span>${Utils.escapeHtml(emp.name || 'Sin nombre')} <small style="color: var(--color-text-secondary);">(${emp.role || 'N/A'})</small></span>
                                            <button class="btn-danger btn-xs" onclick="window.Settings.removeEmployeeFromBranch('${emp.id}', '${branchId}')" title="Quitar">
                                                <i class="fas fa-times"></i>
                                            </button>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : '<p style="color: var(--color-text-secondary); text-align: center; padding: var(--spacing-md);">No hay empleados asignados</p>'}
                        </div>
                    </div>

                    <div>
                        <h4 style="font-size: 12px; font-weight: 600; margin-bottom: var(--spacing-sm);">Asignar Empleados</h4>
                        <div style="max-height: 300px; overflow-y: auto; border: 1px solid var(--color-border-light); border-radius: var(--radius-sm); padding: var(--spacing-sm);">
                            ${availableEmployees.length > 0 ? `
                                <div style="display: grid; gap: var(--spacing-xs);">
                                    ${availableEmployees.map(emp => {
                                        // Para admin/manager, mostrar todas sus sucursales
                                        let currentBranchesText = '';
                                        if (emp.role === 'admin' || emp.role === 'manager') {
                                            const branchIds = emp.branch_ids || (emp.branch_id ? [emp.branch_id] : []);
                                            if (branchIds.length > 0) {
                                                const branchNames = branchIds.map(id => branchesMap[id]).filter(Boolean);
                                                currentBranchesText = branchNames.length > 0 
                                                    ? ` • Actualmente en: ${branchNames.join(', ')}` 
                                                    : '';
                                            } else {
                                                currentBranchesText = ' • Sin asignar';
                                            }
                                        } else {
                                            const currentBranchId = emp.branch_id;
                                            const currentBranchName = currentBranchId ? branchesMap[currentBranchId] : null;
                                            currentBranchesText = currentBranchName ? ` • Actualmente en: ${currentBranchName}` : ' • Sin asignar';
                                        }
                                        
                                        const isMultiBranch = emp.role === 'admin' || emp.role === 'manager';
                                        return `
                                            <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--spacing-xs); background: var(--color-bg-card); border-radius: var(--radius-xs);">
                                                <div>
                                                    <span>${Utils.escapeHtml(emp.name || 'Sin nombre')} ${isMultiBranch ? '<span style="color: var(--color-primary); font-size: 9px;">(Puede múltiples)</span>' : ''}</span>
                                                    <small style="color: var(--color-text-secondary); display: block; font-size: 10px;">
                                                        ${emp.role || 'N/A'}${currentBranchesText}
                                                    </small>
                                                </div>
                                                <button class="btn-primary btn-xs" onclick="window.Settings.addEmployeeToBranch('${emp.id}', '${branchId}')" title="Asignar">
                                                    <i class="fas fa-plus"></i> ${isMultiBranch ? 'Agregar' : 'Asignar'}
                                                </button>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            ` : '<p style="color: var(--color-text-secondary); text-align: center; padding: var(--spacing-md);">Todos los empleados ya están asignados a esta u otra sucursal</p>'}
                        </div>
                    </div>
                </div>
            `;

            UI.showModal(`Asignar Empleados - ${Utils.escapeHtml(branch.name)}`, body, [
                { text: 'Cerrar', class: 'btn-primary', onclick: () => UI.closeModal() }
            ]);

            // Guardar referencia para las funciones internas
            window.Settings.currentAssignBranchId = branchId;
        } catch (e) {
            console.error('Error mostrando asignación de empleados:', e);
            Utils.showNotification('Error: ' + e.message, 'error');
        }
    },

    async addEmployeeToBranch(employeeId, branchId) {
        try {
            // Validaciones estrictas
            if (!employeeId || !branchId) {
                Utils.showNotification('Datos inválidos para asignación', 'error');
                return;
            }

            // Verificar que la sucursal exista y esté activa
            const branch = await DB.get('catalog_branches', branchId);
            if (!branch) {
                Utils.showNotification('Sucursal no encontrada. La operación no puede continuar.', 'error');
                return;
            }

            if (!branch.active) {
                const confirm = await Utils.confirm(
                    `La sucursal "${branch.name}" está desactivada.\n\n` +
                    `Si asignas el empleado, no podrá iniciar sesión hasta que se active la sucursal.\n\n` +
                    `¿Deseas continuar?`
                );
                if (!confirm) return;
            }

            // Verificar que el empleado exista
            const employee = await DB.get('employees', employeeId);
            if (!employee) {
                Utils.showNotification('Empleado no encontrado', 'error');
                return;
            }

            // Determinar si es admin o manager (pueden tener múltiples sucursales)
            const isMultiBranch = employee.role === 'admin' || employee.role === 'manager';
            
            // Validar que el empleado esté activo
            if (!employee.active) {
                const confirm = await Utils.confirm(
                    `El empleado "${employee.name}" está inactivo.\n\n` +
                    `¿Deseas asignarlo a la sucursal de todas formas?`
                );
                if (!confirm) return;
            }

            // Asignar sucursal según el rol
            if (isMultiBranch) {
                // Admin/Manager: agregar a branch_ids (múltiples sucursales)
                if (!employee.branch_ids) {
                    // Si no tiene branch_ids, crear array desde branch_id si existe
                    employee.branch_ids = employee.branch_id ? [employee.branch_id] : [];
                    // Mantener branch_id para compatibilidad, pero usar branch_ids como fuente principal
                }
                
                // Si ya está en esta sucursal, no hacer nada
                if (employee.branch_ids.includes(branchId)) {
                    Utils.showNotification(`El empleado ya está asignado a "${branch.name}"`, 'info');
                    return;
                }
                
                // Agregar la nueva sucursal
                employee.branch_ids.push(branchId);
                // También actualizar branch_id con la primera sucursal (para compatibilidad)
                if (!employee.branch_id) {
                    employee.branch_id = branchId;
                }
            } else {
                // Otros roles: solo una sucursal (branch_id)
                const previousBranchId = employee.branch_id;
                if (previousBranchId && previousBranchId !== branchId) {
                    const prevBranch = await DB.get('catalog_branches', previousBranchId);
                    const previousBranchName = prevBranch?.name || 'Sucursal desconocida';
                    
                    const confirm = await Utils.confirm(
                        `El empleado "${employee.name}" está asignado a "${previousBranchName}".\n\n` +
                        `¿Deseas moverlo a "${branch.name}"?\n\n` +
                        `NOTA: Los empleados de este rol solo pueden estar en una sucursal a la vez.`
                    );
                    if (!confirm) return;
                }
                
                employee.branch_id = branchId;
                // Limpiar branch_ids si existe (no debería para estos roles)
                if (employee.branch_ids) {
                    delete employee.branch_ids;
                }
            }
            
            employee.updated_at = new Date().toISOString();
            
            await DB.put('employees', employee);
            
            // Log de auditoría
            console.log(`Employee assigned to branch:`, {
                employeeId: employee.id,
                employeeName: employee.name,
                role: employee.role,
                isMultiBranch,
                branchIds: employee.branch_ids || [employee.branch_id],
                newBranchId: branchId,
                newBranchName: branch.name
            });
            
            if (typeof SyncManager !== 'undefined') {
                await SyncManager.addToQueue('employee', employee.id);
            }
            
            const branchIds = employee.branch_ids || [employee.branch_id];
            const message = isMultiBranch 
                ? `Empleado "${employee.name}" agregado a "${branch.name}". Total: ${branchIds.length} sucursal(es)`
                : `Empleado "${employee.name}" asignado a "${branch.name}"`;
            Utils.showNotification(message, 'success');
            await this.assignEmployeesToBranch(branchId);
        } catch (e) {
            console.error('Error asignando empleado:', e);
            Utils.showNotification('Error al asignar empleado: ' + e.message, 'error');
        }
    },

    async removeEmployeeFromBranch(employeeId, branchId) {
        try {
            // Validaciones
            if (!employeeId || !branchId) {
                Utils.showNotification('Datos inválidos', 'error');
                return;
            }

            const employee = await DB.get('employees', employeeId);
            if (!employee) {
                Utils.showNotification('Empleado no encontrado', 'error');
                return;
            }
            
            const targetBranch = await DB.get('catalog_branches', branchId);
            const branchName = targetBranch?.name || 'Sucursal desconocida';
            
            // Determinar si es admin o manager (pueden tener múltiples sucursales)
            const isMultiBranch = employee.role === 'admin' || employee.role === 'manager';
            
            if (isMultiBranch) {
                // Admin/Manager: remover de branch_ids
                if (employee.branch_ids && employee.branch_ids.length > 0) {
                    if (employee.branch_ids.length === 1 && employee.branch_ids[0] === branchId) {
                        // Si es la única sucursal, pedir confirmación
                        const confirm = await Utils.confirm(
                            `El empleado "${employee.name}" solo tiene asignada esta sucursal.\n\n` +
                            `¿Estás seguro de que deseas removerlo?\n\n` +
                            `El empleado quedará sin sucursales asignadas.`
                        );
                        if (!confirm) return;
                    }
                    
                    // Remover la sucursal del array
                    employee.branch_ids = employee.branch_ids.filter(id => id !== branchId);
                    
                    // Si quedan sucursales, actualizar branch_id a la primera (para compatibilidad)
                    if (employee.branch_ids.length > 0) {
                        employee.branch_id = employee.branch_ids[0];
                    } else {
                        employee.branch_id = null;
                    }
                } else {
                    // Si no tiene branch_ids pero tiene branch_id, removerlo
                    if (employee.branch_id === branchId) {
                        employee.branch_id = null;
                    }
                }
            } else {
                // Otros roles: solo pueden tener una sucursal, quitarla completamente
                if (employee.branch_id === branchId) {
                    const confirm = await Utils.confirm(
                        `¿Estás seguro de que deseas remover al empleado "${employee.name}" de "${branchName}"?\n\n` +
                        `El empleado quedará sin sucursal asignada.`
                    );
                    if (!confirm) return;
                    
                    employee.branch_id = null;
                } else {
                    Utils.showNotification('El empleado no está asignado a esta sucursal', 'warning');
                    return;
                }
            }
            
            employee.updated_at = new Date().toISOString();
            
            await DB.put('employees', employee);
            
            if (typeof SyncManager !== 'undefined') {
                await SyncManager.addToQueue('employee', employee.id);
            }
            
            Utils.showNotification(`Empleado removido de "${branchName}"`, 'success');
            await this.assignEmployeesToBranch(branchId);
        } catch (e) {
            console.error('Error removiendo empleado:', e);
            Utils.showNotification('Error al remover empleado: ' + e.message, 'error');
        }
    },

    async viewBranchEmployees(branchId) {
        console.log('viewBranchEmployees llamado con ID:', branchId);
        try {
            const branch = await DB.get('catalog_branches', branchId);
            if (!branch) {
                Utils.showNotification('Sucursal no encontrada', 'error');
                return;
            }

            const allEmployees = await DB.getAll('employees') || [];
            const branchEmployees = allEmployees.filter(emp => emp.branch_id === branchId);

            const body = `
                <div style="max-width: 700px;">
                    <div style="margin-bottom: var(--spacing-md); padding: var(--spacing-sm); background: var(--color-bg-secondary); border-radius: var(--radius-sm);">
                        <strong>Sucursal:</strong> ${Utils.escapeHtml(branch.name)}
                        <br><small style="color: var(--color-text-secondary);">Total: ${branchEmployees.length} empleado(s)</small>
                    </div>
                    
                    ${branchEmployees.length > 0 ? `
                        <div style="max-height: 400px; overflow-y: auto;">
                            <table class="cart-table">
                                <thead>
                                    <tr>
                                        <th>Nombre</th>
                                        <th>Rol</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${branchEmployees.map(emp => `
                                        <tr>
                                            <td><strong>${Utils.escapeHtml(emp.name || 'Sin nombre')}</strong></td>
                                            <td><span class="status-badge status-${emp.role === 'admin' ? 'disponible' : 'reservado'}">${emp.role || 'N/A'}</span></td>
                                            <td><span class="status-badge status-${emp.active ? 'disponible' : 'vendida'}">${emp.active ? 'Activo' : 'Inactivo'}</span></td>
                                            <td>
                                                <button class="btn-secondary btn-xs" onclick="window.Employees && window.Employees.editEmployee('${emp.id}'); UI.closeModal();" title="Editar">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button class="btn-danger btn-xs" onclick="window.Settings.removeEmployeeFromBranch('${emp.id}', '${branchId}'); UI.closeModal();" title="Quitar de sucursal">
                                                    <i class="fas fa-user-minus"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : '<p style="text-align: center; padding: var(--spacing-lg); color: var(--color-text-secondary);">No hay empleados asignados a esta sucursal</p>'}
                </div>
            `;

            UI.showModal(`Empleados de ${Utils.escapeHtml(branch.name)}`, body, [
                { text: 'Cerrar', class: 'btn-primary', onclick: () => UI.closeModal() },
                { text: 'Asignar Empleados', class: 'btn-secondary', onclick: () => { UI.closeModal(); this.assignEmployeesToBranch(branchId); } }
            ]);
        } catch (e) {
            console.error('Error mostrando empleados de sucursal:', e);
            Utils.showNotification('Error: ' + e.message, 'error');
        }
    },

    async manageCommissionRules() {
        const rules = await DB.getAll('commission_rules') || [];
        const body = `
            <div style="margin-bottom: 20px;">
                <button class="btn-primary" onclick="window.Settings.addCommissionRule()">+ Agregar Regla</button>
            </div>
            <div style="max-height: 400px; overflow-y: auto;">
                <table class="cart-table">
                    <thead>
                        <tr>
                            <th>Tipo</th>
                            <th>Entidad</th>
                            <th>Descuento %</th>
                            <th>Multiplicador</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rules.map(rule => `
                            <tr>
                                <td>${rule.entity_type}</td>
                                <td>${rule.entity_id}</td>
                                <td>${rule.discount_pct || 0}%</td>
                                <td>${rule.multiplier || 1}x</td>
                                <td>
                                    <button class="btn-secondary" onclick="window.Settings.editCommissionRule('${rule.id}')" style="padding: 4px 8px; font-size: 12px;">Editar</button>
                                    <button class="btn-danger" onclick="window.Settings.deleteCommissionRule('${rule.id}')" style="padding: 4px 8px; font-size: 12px;">Eliminar</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        UI.showModal('Gestionar Reglas de Comisión', body, '<button class="btn-primary" onclick="UI.closeModal()">Cerrar</button>');
    },

    async addCommissionRule() {
        const typeOptions = [
            { value: 'seller', label: 'Vendedor' },
            { value: 'guide', label: 'Guía' },
            { value: 'agency', label: 'Agencia' }
        ];
        const type = await Utils.select('Selecciona el tipo de entidad:', typeOptions, 'Nueva Regla de Comisión');
        if (!type) return;

        const entityId = await Utils.prompt('ID de la entidad:', '', 'Nueva Regla');
        if (!entityId) return;

        const discountStr = await Utils.prompt('Descuento %:', '0', 'Nueva Regla');
        const discount = parseFloat(discountStr || '0');
        
        const multiplierStr = await Utils.prompt('Multiplicador:', '1', 'Nueva Regla');
        const multiplier = parseFloat(multiplierStr || '1');

        const rule = {
            id: Utils.generateId(),
            entity_type: type,
            entity_id: entityId,
            discount_pct: discount,
            multiplier: multiplier,
            created_at: new Date().toISOString()
        };

        await DB.put('commission_rules', rule);
        Utils.showNotification('Regla agregada', 'success');
        this.manageCommissionRules();
    },

    async editCommissionRule(id) {
        const rule = await DB.get('commission_rules', id);
        if (!rule) return;

        const discountStr = await Utils.prompt('Descuento %:', String(rule.discount_pct || 0), 'Editar Regla');
        const discount = parseFloat(discountStr || '0');
        
        const multiplierStr = await Utils.prompt('Multiplicador:', String(rule.multiplier || 1), 'Editar Regla');
        const multiplier = parseFloat(multiplierStr || '1');

        rule.discount_pct = discount;
        rule.multiplier = multiplier;
        await DB.put('commission_rules', rule);
        Utils.showNotification('Regla actualizada', 'success');
        this.manageCommissionRules();
    },

    async deleteCommissionRule(id) {
        if (!await Utils.confirm('¿Eliminar esta regla?')) return;
        await DB.delete('commission_rules', id);
        Utils.showNotification('Regla eliminada', 'success');
        this.manageCommissionRules();
    },

    // ========================================
    // ========================================
    // FUNCIONALIDADES AVANZADAS DE IMPRESIÓN
    // ========================================

    async connectPrinter() {
        try {
            const baudRate = parseInt(document.getElementById('setting-printer-baud')?.value || '9600');
            const printerModel = document.getElementById('setting-printer-model')?.value || 'GP-5830';
            
            // Verificar que Web Serial API esté disponible
            if (!('serial' in navigator)) {
                Utils.showNotification('Tu navegador no soporta impresión directa. Usa Chrome o Edge (versión 89+).', 'error');
                return;
            }
            
            if (typeof Printer !== 'undefined') {
                // Para GP-5830, no usar filtros restrictivos - dejar que el usuario seleccione manualmente
                // Esto es más confiable ya que diferentes adaptadores USB pueden tener diferentes Vendor IDs
                Printer.preferredFilters = null; // Sin filtros para permitir selección manual
                
                // Mostrar instrucciones antes de conectar
                const shouldContinue = confirm(
                    'INSTRUCCIONES PARA CONECTAR GP-5830:\n\n' +
                    '1. Asegúrate de que la impresora esté encendida\n' +
                    '2. Verifica que esté conectada por USB\n' +
                    '3. En la ventana que aparecerá, busca "GP-5830" o "USB Serial Port"\n' +
                    '4. Si no aparece, busca cualquier puerto USB que no sea "Print to PDF"\n\n' +
                    '¿Continuar con la conexión?'
                );
                
                if (!shouldContinue) return;
                
                const connected = await Printer.connect(baudRate);
                if (connected) {
                    this.updatePrinterStatus(true);
                    localStorage.setItem('printer_baud_rate', baudRate.toString());
                    localStorage.setItem('printer_model', printerModel);
                    
                    // Actualizar información del puerto
                    setTimeout(() => this.updatePrinterPortInfo(), 500);
                    
                    Utils.showNotification('✅ GP-5830 conectada correctamente', 'success');
                } else {
                    Utils.showNotification('No se pudo conectar. Verifica que la impresora esté encendida y conectada.', 'warning');
                }
            } else {
                Utils.showNotification('Módulo de impresora no disponible', 'error');
            }
        } catch (e) {
            console.error('Error conectando impresora:', e);
            
            let errorMessage = 'Error al conectar: ' + e.message;
            
            // Mensajes de error más amigables
            if (e.message.includes('cancel')) {
                errorMessage = 'Conexión cancelada. Intenta de nuevo y selecciona tu impresora GP-5830 en la lista.';
            } else if (e.message.includes('No se pudo encontrar')) {
                errorMessage = 'No se encontró la impresora. Verifica:\n' +
                              '• Que la GP-5830 esté encendida\n' +
                              '• Que esté conectada por USB\n' +
                              '• Que no esté siendo usada por otro programa\n' +
                              '• Intenta desconectar y volver a conectar el cable USB';
            }
            
            Utils.showNotification(errorMessage, 'error');
        }
    },

    onPrinterModelChange() {
        const model = document.getElementById('setting-printer-model')?.value;
        const customNameDiv = document.getElementById('printer-name-custom');
        
        if (model === 'custom') {
            if (customNameDiv) customNameDiv.style.display = 'block';
        } else {
            if (customNameDiv) customNameDiv.style.display = 'none';
            
            // Configurar valores predeterminados según modelo
            const defaults = {
                'GP-5830': { baud: '9600', width: '58', density: 'medium' },
                'GP-5830II': { baud: '9600', width: '58', density: 'high' },
                'EC-58110': { baud: '9600', width: '58', density: 'medium' }
            };
            
            if (defaults[model]) {
                const config = defaults[model];
                const baudEl = document.getElementById('setting-printer-baud');
                const widthEl = document.getElementById('setting-printer-width');
                const densityEl = document.getElementById('setting-printer-density');
                
                if (baudEl) baudEl.value = config.baud;
                if (widthEl) widthEl.value = config.width;
                if (densityEl) densityEl.value = config.density;
            }
        }
    },

    async updatePrinterPortInfo() {
        const portInfo = document.getElementById('printer-port-status');
        if (!portInfo) return;

        try {
            if (typeof Printer !== 'undefined' && Printer.connected && Printer.port) {
                const portInfoObj = Printer.port.getInfo();
                let portText = 'Puerto USB: Conectado';
                
                if (portInfoObj.usbVendorId) {
                    const vendorId = portInfoObj.usbVendorId.toString(16).toUpperCase().padStart(4, '0');
                    portText = `Puerto USB: 0x${vendorId} (GP-5830 detectada)`;
                }
                
                portInfo.textContent = portText;
                portInfo.parentElement.style.background = 'rgba(45, 45, 45, 0.15)';
                portInfo.parentElement.style.color = 'var(--color-success)';
                portInfo.parentElement.style.borderLeft = '3px solid var(--color-success)';
            } else {
                portInfo.textContent = 'Puerto USB: No conectado';
                portInfo.parentElement.style.background = 'var(--color-bg-secondary)';
                portInfo.parentElement.style.color = 'var(--color-text-secondary)';
                portInfo.parentElement.style.borderLeft = '3px solid var(--color-border)';
            }
        } catch (e) {
            portInfo.textContent = 'Puerto: Información no disponible';
        }
    },

    async disconnectPrinter() {
        try {
            if (typeof Printer !== 'undefined' && Printer.connected) {
                await Printer.disconnect();
                this.updatePrinterStatus(false);
            }
        } catch (e) {
            console.error('Error desconectando:', e);
        }
    },

    updatePrinterStatus(connected) {
        const badge = document.getElementById('printer-status-badge');
        const info = document.getElementById('printer-connection-info');
        const btnConnect = document.getElementById('btn-connect-printer');
        const btnDisconnect = document.getElementById('btn-disconnect-printer');
        const lastActivity = document.getElementById('printer-last-activity');

        if (badge) {
            badge.className = `printer-status-badge ${connected ? 'connected' : 'disconnected'}`;
            badge.innerHTML = connected 
                ? '<i class="fas fa-circle"></i> Conectada' 
                : '<i class="fas fa-circle"></i> Desconectada';
        }

        if (info) {
            const baudRate = localStorage.getItem('printer_baud_rate') || '9600';
            const printerModel = localStorage.getItem('printer_model') || 'GP-5830';
            info.textContent = connected 
                ? `GP-5830 Series conectada a ${baudRate} baud` 
                : 'No conectada - Haz clic en Conectar';
        }

        if (btnConnect) btnConnect.style.display = connected ? 'none' : 'inline-flex';
        if (btnDisconnect) btnDisconnect.style.display = connected ? 'inline-flex' : 'none';

        if (lastActivity && connected) {
            lastActivity.textContent = `Última actividad: ${new Date().toLocaleTimeString()}`;
        }

        // Actualizar información del puerto
        this.updatePrinterPortInfo();
    },

    async previewTicket() {
        const businessName = document.getElementById('setting-business-name')?.value || 'OPAL & CO';
        const businessPhone = document.getElementById('setting-business-phone')?.value || '';
        const businessAddress = document.getElementById('setting-business-address')?.value || '';
        const footerMessage = document.getElementById('setting-ticket-footer')?.value || 'Gracias por su compra';
        const ticketFormat = document.getElementById('setting-ticket-format')?.value || 'standard';
        const printLogo = document.getElementById('setting-print-logo')?.checked;
        const printBarcode = document.getElementById('setting-print-barcode')?.checked;
        const printQR = document.getElementById('setting-print-qr')?.checked;

        const previewHTML = `
            <div style="background: white; color: black; font-family: 'Courier New', monospace; width: 220px; padding: 15px; margin: 0 auto; border: 1px solid #ccc; font-size: 11px; line-height: 1.4;">
                ${printLogo ? '<div style="text-align: center; margin-bottom: 10px;"><i class="fas fa-gem" style="font-size: 24px;"></i></div>' : ''}
                <div style="text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 5px;">${businessName}</div>
                ${businessAddress ? `<div style="text-align: center; font-size: 9px;">${businessAddress}</div>` : ''}
                ${businessPhone ? `<div style="text-align: center; font-size: 9px;">Tel: ${businessPhone}</div>` : ''}
                <div style="border-bottom: 1px dashed #000; margin: 8px 0;"></div>
                
                <div style="display: flex; justify-content: space-between;"><span>Folio:</span><span>V-001234</span></div>
                <div style="display: flex; justify-content: space-between;"><span>Fecha:</span><span>${new Date().toLocaleDateString()}</span></div>
                <div style="display: flex; justify-content: space-between;"><span>Hora:</span><span>${new Date().toLocaleTimeString()}</span></div>
                <div style="display: flex; justify-content: space-between;"><span>Vendedor:</span><span>Juan Pérez</span></div>
                
                <div style="border-bottom: 1px dashed #000; margin: 8px 0;"></div>
                
                ${ticketFormat !== 'minimal' ? `
                <div style="font-weight: bold;">Anillo Oro 18k Diamante</div>
                <div style="display: flex; justify-content: space-between;"><span>1 x $15,000.00</span><span>$15,000.00</span></div>
                
                <div style="font-weight: bold; margin-top: 5px;">Collar Plata 925</div>
                <div style="display: flex; justify-content: space-between;"><span>1 x $3,500.00</span><span>$3,500.00</span></div>
                ` : ''}
                
                <div style="border-bottom: 1px dashed #000; margin: 8px 0;"></div>
                
                <div style="display: flex; justify-content: space-between;"><span>Subtotal:</span><span>$18,500.00</span></div>
                <div style="display: flex; justify-content: space-between;"><span>Descuento (10%):</span><span>-$1,850.00</span></div>
                <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin-top: 5px; padding-top: 5px; border-top: 1px solid #000;">
                    <span>TOTAL:</span><span>$16,650.00</span>
                </div>
                
                <div style="border-bottom: 1px dashed #000; margin: 8px 0;"></div>
                
                <div style="font-weight: bold;">PAGOS:</div>
                <div style="display: flex; justify-content: space-between;"><span>Efectivo USD:</span><span>$800.00 USD</span></div>
                <div style="display: flex; justify-content: space-between;"><span>Visa/MC:</span><span>$650.00 MXN</span></div>
                
                <div style="border-bottom: 1px dashed #000; margin: 8px 0;"></div>
                
                ${printBarcode ? '<div style="text-align: center; margin: 10px 0;"><div style="font-family: monospace; letter-spacing: 3px;">|||||||||||||||</div><div style="font-size: 9px;">V-001234</div></div>' : ''}
                ${printQR ? '<div style="text-align: center; margin: 10px 0;"><div style="width: 50px; height: 50px; background: #000; margin: 0 auto;"></div><div style="font-size: 8px; margin-top: 3px;">Escanea para ver detalles</div></div>' : ''}
                
                <div style="text-align: center; margin-top: 10px;">${footerMessage}</div>
                <div style="text-align: center; font-size: 9px; color: #666; margin-top: 5px;">${new Date().toLocaleString()}</div>
            </div>
        `;

        const body = `
            <div style="display: flex; gap: var(--spacing-lg);">
                <div style="flex: 1;">
                    <h4 style="margin-bottom: var(--spacing-md);">Vista Previa del Ticket</h4>
                    ${previewHTML}
                </div>
                <div style="flex: 1; padding: var(--spacing-md); background: var(--color-bg-secondary); border-radius: var(--radius-md);">
                    <h4 style="margin-bottom: var(--spacing-md);">Información</h4>
                    <div style="font-size: 12px; color: var(--color-text-secondary);">
                        <p><strong>Formato:</strong> ${ticketFormat}</p>
                        <p><strong>Ancho:</strong> ${document.getElementById('setting-printer-width')?.value || '58'}mm</p>
                        <p><strong>Logo:</strong> ${printLogo ? 'Sí' : 'No'}</p>
                        <p><strong>Código de barras:</strong> ${printBarcode ? 'Sí' : 'No'}</p>
                        <p><strong>Código QR:</strong> ${printQR ? 'Sí' : 'No'}</p>
                        <p style="margin-top: var(--spacing-md); padding-top: var(--spacing-md); border-top: 1px solid var(--color-border-light);">
                            <i class="fas fa-info-circle"></i> Esta es una vista previa aproximada. 
                            El ticket real puede variar según la impresora.
                        </p>
                    </div>
                </div>
            </div>
        `;

        UI.showModal('Vista Previa del Ticket', body, '<button class="btn-primary" onclick="UI.closeModal()">Cerrar</button>');
    },

    async resetPrinterSettings() {
        const confirmReset = confirm('¿Restablecer toda la configuración de impresión a los valores predeterminados?');
        if (!confirmReset) return;

        // Valores predeterminados para GP-5838 SERIES
        const defaults = {
            printer_model: 'GP-5838',
            printer_name: 'GP-5838 SERIES',
            printer_baud: '9600',
            printer_width: '58',
            printer_density: 'medium',
            ticket_format: 'standard',
            ticket_copies: '1',
            paper_cut: 'full',
            feed_lines: '3',
            print_logo: true,
            print_barcode: false,
            print_qr: false,
            auto_print: true,
            print_footer: true,
            print_duplicate: false,
            business_name: 'OPAL & CO',
            business_phone: '',
            business_address: '',
            ticket_footer: 'Gracias por su compra'
        };

        // Actualizar campos en la UI
        if (document.getElementById('setting-printer-model')) {
            document.getElementById('setting-printer-model').value = defaults.printer_model;
            this.onPrinterModelChange();
        }
        if (document.getElementById('setting-printer-name')) document.getElementById('setting-printer-name').value = defaults.printer_name;
        if (document.getElementById('setting-printer-baud')) document.getElementById('setting-printer-baud').value = defaults.printer_baud;
        if (document.getElementById('setting-printer-width')) document.getElementById('setting-printer-width').value = defaults.printer_width;
        if (document.getElementById('setting-printer-density')) document.getElementById('setting-printer-density').value = defaults.printer_density;
        if (document.getElementById('setting-ticket-format')) document.getElementById('setting-ticket-format').value = defaults.ticket_format;
        if (document.getElementById('setting-ticket-copies')) document.getElementById('setting-ticket-copies').value = defaults.ticket_copies;
        if (document.getElementById('setting-paper-cut')) document.getElementById('setting-paper-cut').value = defaults.paper_cut;
        if (document.getElementById('setting-feed-lines')) document.getElementById('setting-feed-lines').value = defaults.feed_lines;
        if (document.getElementById('setting-print-logo')) document.getElementById('setting-print-logo').checked = defaults.print_logo;
        if (document.getElementById('setting-print-barcode')) document.getElementById('setting-print-barcode').checked = defaults.print_barcode;
        if (document.getElementById('setting-print-qr')) document.getElementById('setting-print-qr').checked = defaults.print_qr;
        if (document.getElementById('setting-auto-print')) document.getElementById('setting-auto-print').checked = defaults.auto_print;
        if (document.getElementById('setting-print-footer')) document.getElementById('setting-print-footer').checked = defaults.print_footer;
        if (document.getElementById('setting-print-duplicate')) document.getElementById('setting-print-duplicate').checked = defaults.print_duplicate;
        if (document.getElementById('setting-business-name')) document.getElementById('setting-business-name').value = defaults.business_name;
        if (document.getElementById('setting-business-phone')) document.getElementById('setting-business-phone').value = defaults.business_phone;
        if (document.getElementById('setting-business-address')) document.getElementById('setting-business-address').value = defaults.business_address;
        if (document.getElementById('setting-ticket-footer')) document.getElementById('setting-ticket-footer').value = defaults.ticket_footer;

        Utils.showNotification('Configuración restablecida', 'success');
    },

    async savePrinterSettings() {
        try {
            // Configuración de hardware
            const printerModel = document.getElementById('setting-printer-model')?.value || 'GP-5838';
            const printerName = printerModel === 'custom' 
                ? (document.getElementById('setting-printer-name')?.value || 'GP-5838 SERIES')
                : printerModel;
            const printerBaud = document.getElementById('setting-printer-baud')?.value || '9600';
            const printerWidth = document.getElementById('setting-printer-width')?.value || '58';
            const printerDensity = document.getElementById('setting-printer-density')?.value || 'medium';

            // Configuración de ticket
            const ticketFormat = document.getElementById('setting-ticket-format')?.value || 'standard';
            const ticketCopies = document.getElementById('setting-ticket-copies')?.value || '1';
            const paperCut = document.getElementById('setting-paper-cut')?.value || 'full';
            const feedLines = document.getElementById('setting-feed-lines')?.value || '3';

            // Opciones del ticket
            const printLogo = document.getElementById('setting-print-logo')?.checked || false;
            const printBarcode = document.getElementById('setting-print-barcode')?.checked || false;
            const printQR = document.getElementById('setting-print-qr')?.checked || false;
            const autoPrint = document.getElementById('setting-auto-print')?.checked || false;
            const printFooter = document.getElementById('setting-print-footer')?.checked || false;
            const printDuplicate = document.getElementById('setting-print-duplicate')?.checked || false;

            // Personalización
            const businessName = document.getElementById('setting-business-name')?.value || 'OPAL & CO';
            const businessPhone = document.getElementById('setting-business-phone')?.value || '';
            const businessAddress = document.getElementById('setting-business-address')?.value || '';
            const ticketFooterMsg = document.getElementById('setting-ticket-footer')?.value || 'Gracias por su compra';

            // Guardar en la base de datos
            const settingsToSave = {
                printer_model: printerModel,
                printer_name: printerName,
                printer_baud: printerBaud,
                printer_width: parseInt(printerWidth),
                printer_density: printerDensity,
                ticket_format: ticketFormat,
                ticket_copies: parseInt(ticketCopies),
                paper_cut: paperCut,
                feed_lines: parseInt(feedLines),
                print_logo: printLogo,
                print_barcode: printBarcode,
                print_qr: printQR,
                auto_print: autoPrint,
                print_footer: printFooter,
                print_duplicate: printDuplicate,
                business_name: businessName,
                business_phone: businessPhone,
                business_address: businessAddress,
                ticket_footer: ticketFooterMsg
            };

            // Guardar cada setting individualmente con verificación
            for (const [key, value] of Object.entries(settingsToSave)) {
                try {
                    // Verificar si existe antes de guardar
                    const existing = await DB.get('settings', key);
                    const settingData = { 
                        key: key, 
                        value: value, 
                        updated_at: new Date().toISOString() 
                    };
                    
                    // Si existe, agregar created_at del existente
                    if (existing && existing.created_at) {
                        settingData.created_at = existing.created_at;
                    } else {
                        settingData.created_at = new Date().toISOString();
                    }
                    
                    await DB.put('settings', settingData);
                    console.log(`✅ Setting guardado: ${key} = ${value}`);
                } catch (e) {
                    console.error(`❌ Error guardando setting ${key}:`, e);
                    // Intentar con add si put falla
                    try {
                        await DB.add('settings', { 
                            key: key, 
                            value: value, 
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString() 
                        });
                        console.log(`✅ Setting agregado (add): ${key} = ${value}`);
                    } catch (e2) {
                        console.error(`❌ Error también con add para ${key}:`, e2);
                    }
                }
            }

            // Verificar que se guardaron correctamente
            const verificationPromises = Object.keys(settingsToSave).map(async (key) => {
                const saved = await DB.get('settings', key);
                if (!saved || saved.value !== settingsToSave[key]) {
                    console.warn(`⚠️ Advertencia: Setting ${key} no se guardó correctamente`);
                    return false;
                }
                return true;
            });
            
            const verificationResults = await Promise.all(verificationPromises);
            const allSaved = verificationResults.every(r => r === true);
            
            if (!allSaved) {
                console.error('Algunos settings no se guardaron correctamente');
                Utils.showNotification('Configuración guardada con advertencias. Algunos valores pueden no haberse guardado.', 'warning');
            }

            // Actualizar configuración del módulo Printer
            if (typeof Printer !== 'undefined') {
                Printer.printerName = printerName;
                Printer.printerWidth = parseInt(printerWidth) === 80 ? 48 : 32;
                Printer.currentBaudRate = parseInt(printerBaud);
            }

            // Guardar en localStorage también para acceso rápido
            localStorage.setItem('printer_settings', JSON.stringify(settingsToSave));
            localStorage.setItem('printer_settings_timestamp', new Date().toISOString());

            Utils.showNotification('Configuración de impresión guardada correctamente', 'success');
        } catch (e) {
            console.error('Error guardando configuración de impresión:', e);
            Utils.showNotification('Error al guardar configuración', 'error');
        }
    },

    async saveNotifications() {
        const notifySales = document.getElementById('setting-notify-sales').checked;
        const notifyLowStock = document.getElementById('setting-notify-low-stock').checked;
        const notifySync = document.getElementById('setting-notify-sync').checked;
        const lowStockThreshold = parseInt(document.getElementById('setting-low-stock-threshold').value);

        await DB.put('settings', { key: 'notify_sales', value: notifySales, updated_at: new Date().toISOString() });
        await DB.put('settings', { key: 'notify_low_stock', value: notifyLowStock, updated_at: new Date().toISOString() });
        await DB.put('settings', { key: 'notify_sync', value: notifySync, updated_at: new Date().toISOString() });
        await DB.put('settings', { key: 'low_stock_threshold', value: lowStockThreshold, updated_at: new Date().toISOString() });

        Utils.showNotification('Configuración de notificaciones guardada', 'success');
    },

    async saveAppearance() {
        const theme = document.getElementById('setting-theme').value;
        const language = document.getElementById('setting-language').value;
        const dateFormat = document.getElementById('setting-date-format').value;

        await DB.put('settings', { key: 'theme', value: theme, updated_at: new Date().toISOString() });
        await DB.put('settings', { key: 'language', value: language, updated_at: new Date().toISOString() });
        await DB.put('settings', { key: 'date_format', value: dateFormat, updated_at: new Date().toISOString() });

        // Aplicar tema si es necesario
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }

        Utils.showNotification('Configuración de apariencia guardada', 'success');
    },

    async saveSecuritySettings() {
        const pinMinLength = parseInt(document.getElementById('setting-pin-min-length').value);
        const maxLoginAttempts = parseInt(document.getElementById('setting-max-login-attempts').value);
        const lockoutTime = parseInt(document.getElementById('setting-lockout-time').value);

        await DB.put('settings', { key: 'pin_min_length', value: pinMinLength, updated_at: new Date().toISOString() });
        await DB.put('settings', { key: 'max_login_attempts', value: maxLoginAttempts, updated_at: new Date().toISOString() });
        await DB.put('settings', { key: 'lockout_time', value: lockoutTime, updated_at: new Date().toISOString() });

        Utils.showNotification('Configuración de seguridad guardada', 'success');
    },

    async changeMasterPin() {
        try {
            const currentPinEl = document.getElementById('setting-current-pin');
            const newPinEl = document.getElementById('setting-new-pin');
            const confirmPinEl = document.getElementById('setting-confirm-pin');
            if (!newPinEl || !confirmPinEl) {
                Utils.showNotification('Formulario no disponible. Recarga la pagina.', 'error');
                return;
            }

            const currentPin = currentPinEl ? currentPinEl.value : '';
            const newPin = newPinEl.value;
            const confirmPin = confirmPinEl.value;

            if (!newPin || !confirmPin) {
                Utils.showNotification('Ingresa el nuevo PIN y la confirmacion', 'error');
                return;
            }

            if (newPin.length < 4) {
                Utils.showNotification('El PIN debe tener al menos 4 digitos', 'error');
                return;
            }

            if (Utils.isWeakPin) {
                const weak = Utils.isWeakPin(newPin);
                if (weak) {
                    Utils.showNotification(weak, 'error');
                    return;
                }
            }

            if (newPin !== confirmPin) {
                Utils.showNotification('Los PINs no coinciden', 'error');
                return;
            }

            const currentUser = UserManager?.currentUser;
            if (!currentUser) {
                Utils.showNotification('Debes estar autenticado', 'error');
                return;
            }

            // Validacion suave del PIN actual:
            // - Si el usuario tiene pin_hash, intentamos validar; si falla NO bloqueamos,
            //   solo advertimos y pedimos confirmacion. (Antes era hard-fail y muchos
            //   usuarios no recordaban su PIN local porque entraban con password web).
            // - Si no tiene pin_hash, simplemente seteamos el nuevo.
            if (currentUser.pin_hash && currentPin) {
                const valid = await Utils.validatePin(currentPin, currentUser.pin_hash);
                if (!valid) {
                    const proceed = await Utils.confirm(
                        'El PIN actual no coincide con el guardado. ¿Sobreescribir de todas formas? (recomendado solo si lo olvidaste)'
                    );
                    if (!proceed) return;
                }
            } else if (currentUser.pin_hash && !currentPin) {
                Utils.showNotification('Ingresa tu PIN actual o dejalo vacio para sobreescribir', 'info');
            }

            // Guardar nuevo PIN local
            const newPinHash = await Utils.hashPin(newPin);
            currentUser.pin_hash = newPinHash;
            await DB.put('users', currentUser);

            // Limpiar campos
            if (currentPinEl) currentPinEl.value = '';
            newPinEl.value = '';
            confirmPinEl.value = '';

            Utils.showNotification('PIN local cambiado correctamente.', 'success');
        } catch (e) {
            console.error('Error cambiando PIN:', e);
            Utils.showNotification('Error al cambiar PIN: ' + (e?.message || e), 'error');
        }
    },

    async loadCompanyCodeSettings() {
        // El codigo de acceso vive en el backend (env var). El cliente no lo
        // conoce; este modulo solo expone "limpiar codigos guardados" (cache local).
    },

    async clearCompanyCodeCache() {
        if (await Utils.confirm('¿Estás seguro de que deseas limpiar todos los códigos guardados? Esto forzará a todos los usuarios a ingresar el código nuevamente.')) {
            localStorage.removeItem('company_code_validated');
            Utils.showNotification('Códigos guardados eliminados. Todos los usuarios deberán ingresar el código nuevamente.', 'success');
        }
    },

    async managePermissions() {
        // Verificar permisos
        if (!PermissionManager || !PermissionManager.hasPermission('settings.manage_permissions')) {
            Utils.showNotification('No tienes permiso para gestionar permisos', 'error');
            return;
        }

        const users = await DB.getAll('users') || [];
        const employees = await DB.getAll('employees') || [];
        const employeesMap = {};
        employees.forEach(emp => { employeesMap[emp.id] = emp; });

        // Obtener permisos predefinidos de cada rol para comparar
        const getRoleDefaultPermissions = (role) => {
            if (role === 'admin') return ['all'];
            return PermissionManager.getRolePermissions(role) || [];
        };

        const body = `
            <div style="max-width: 1000px;">
                <div style="margin-bottom: var(--spacing-md); padding: var(--spacing-sm); background: var(--color-bg-secondary); border-radius: var(--radius-sm); font-size: 11px; color: var(--color-text-secondary);">
                    <strong>ℹ️ Un solo lugar para permisos:</strong> Para editar permisos y roles de cada usuario, usa <strong>Empleados → Usuarios</strong>. Al hacer clic en "Editar" serás redirigido allí con el formulario de ese usuario (rol, permisos generales y permisos por sucursal).
                </div>
                <div style="max-height: 500px; overflow-y: auto;">
                    <table class="cart-table" style="font-size: 12px;">
                        <thead>
                            <tr>
                                <th style="min-width: 150px;">Usuario</th>
                                <th style="min-width: 100px;">Rol</th>
                                <th style="min-width: 120px;">Tipo de Permisos</th>
                                <th style="min-width: 100px;">Cantidad</th>
                                <th style="min-width: 200px;">Razón/Origen</th>
                                <th style="min-width: 100px;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(user => {
                                const emp = employeesMap[user.employee_id];
                                const isAdmin = user.role === 'admin';
                                
                                let permCount = 0;
                                let permType = 'Sin permisos';
                                let permReason = 'No asignados';
                                let isCustomized = false;
                                
                                if (user.permissions) {
                                    if (Array.isArray(user.permissions)) {
                                        if (user.permissions.includes('all')) {
                                            permCount = 'TODOS';
                                            permType = 'Acceso Total';
                                            permReason = 'Administrador del sistema';
                                        } else {
                                            permCount = user.permissions.length;
                                            const defaultPerms = getRoleDefaultPermissions(user.role);
                                            isCustomized = JSON.stringify(user.permissions.sort()) !== JSON.stringify(defaultPerms.sort());
                                            
                                            if (isCustomized) {
                                                permType = 'Personalizados';
                                                permReason = `Personalizado desde perfil de ${user.role}`;
                                            } else {
                                                permType = 'Perfil Predefinido';
                                                permReason = `Asignado automáticamente según rol: ${user.role}`;
                                            }
                                        }
                                    } else {
                                        // Formato antiguo (objeto)
                                        permCount = Object.keys(user.permissions).filter(p => user.permissions[p]).length;
                                        permType = 'Formato Antiguo';
                                        permReason = 'Necesita migración a nuevo formato';
                                    }
                                } else {
                                    // Sin permisos definidos
                                    const defaultPerms = getRoleDefaultPermissions(user.role);
                                    permCount = defaultPerms.length;
                                    permType = 'Se asignarán automáticamente';
                                    permReason = `Se asignarán al hacer login según rol: ${user.role}`;
                                }
                                
                                return `
                                    <tr>
                                        <td>
                                            <strong>${user.username}</strong>
                                            ${emp ? `<br><small style="color: var(--color-text-secondary);">${emp.name}</small>` : ''}
                                        </td>
                                        <td>
                                            <span class="status-badge" style="background: ${user.role === 'admin' ? '#d32f2f' : user.role === 'manager' ? '#1976d2' : user.role === 'seller' ? '#388e3c' : '#ff9800'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; text-transform: uppercase;">
                                                ${user.role || 'N/A'}
                                            </span>
                                        </td>
                                        <td>
                                            <span style="font-weight: 600; color: ${isAdmin ? 'var(--color-primary)' : isCustomized ? 'var(--color-accent)' : 'var(--color-text)'};">
                                                ${permType}
                                            </span>
                                        </td>
                                        <td>
                                            ${permCount === 'TODOS' ? '<strong style="color: var(--color-primary);">Todos</strong>' : `${permCount} permiso(s)`}
                                        </td>
                                        <td>
                                            <small style="color: var(--color-text-secondary); font-size: 10px;">
                                                ${permReason}
                                            </small>
                                        </td>
                                        <td>
                                            ${!isAdmin ? `
                                                <button class="btn-secondary btn-sm" onclick="window.Settings.goToEditUser('${user.id}')" title="Ir a Empleados → Usuarios y editar">
                                                    <i class="fas fa-edit"></i> Editar
                                                </button>
                                            ` : '<span style="color: var(--color-text-secondary); font-size: 10px;">N/A (Admin)</span>'}
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                            ${users.length === 0 ? '<tr><td colspan="6" style="text-align: center; padding: var(--spacing-md);">No hay usuarios registrados</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
                <div style="margin-top: var(--spacing-md); padding: var(--spacing-sm); background: var(--color-bg-secondary); border-radius: var(--radius-sm); font-size: 11px;">
                    <strong>💡 Tipos de Permisos:</strong>
                    <ul style="margin: var(--spacing-xs) 0; padding-left: 20px;">
                        <li><strong>Acceso Total:</strong> Administrador con todos los permisos</li>
                        <li><strong>Perfil Predefinido:</strong> Permisos asignados automáticamente según el rol</li>
                        <li><strong>Personalizados:</strong> Permisos modificados manualmente desde el perfil del rol</li>
                    </ul>
                </div>
            </div>
        `;

        UI.showModal('Gestionar Permisos', body, [
            { text: 'Ir a Empleados → Usuarios', class: 'btn-secondary', onclick: () => window.Settings.goToEmployeesUsers() },
            { text: 'Cerrar', class: 'btn-primary', onclick: () => UI.closeModal() }
        ]);
    },

    goToCatalogsModule(catalogTab) {
        if (typeof UI !== 'undefined' && UI.showModule) UI.showModule('catalogs', catalogTab || 'sellers');
        if (typeof window.App !== 'undefined' && window.App.loadModule) window.App.loadModule('catalogs');
    },

    goToEmployeesUsers() {
        UI.closeModal();
        if (typeof UI !== 'undefined' && UI.showModule) UI.showModule('employees');
        if (window.Employees) {
            window.Employees.currentTab = 'users';
            const tabsContainer = document.querySelector('#employees-tabs');
            if (tabsContainer) {
                tabsContainer.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                const usersBtn = tabsContainer.querySelector('.tab-btn[data-tab="users"]');
                if (usersBtn) usersBtn.classList.add('active');
            }
            window.Employees.loadTab('users');
        }
    },

    goToEditUser(userId) {
        UI.closeModal();
        if (typeof UI !== 'undefined' && UI.showModule) UI.showModule('employees');
        if (window.Employees) {
            setTimeout(() => window.Employees.openUserEditor(userId), 100);
        }
    },

    async editUserPermissions(userId) {
        if (!PermissionManager || !PermissionManager.hasPermission('settings.manage_permissions')) {
            Utils.showNotification('No tienes permiso para gestionar permisos', 'error');
            return;
        }
        const user = await DB.get('users', userId);
        if (!user) {
            Utils.showNotification('Usuario no encontrado', 'error');
            return;
        }
        if (user.role === 'admin' || user.role === 'master_admin') {
            Utils.showNotification('Administradores tienen acceso total. Para cambiar rol o permisos, edita el usuario en Empleados → Usuarios.', 'info');
            return;
        }
        this.goToEditUser(userId);
    },

    async resetToRoleProfile(userId) {
        if (!await Utils.confirm('¿Restablecer los permisos a los predefinidos del rol?\n\nEsto eliminará cualquier personalización de permisos.')) {
            return;
        }

        const user = await DB.get('users', userId);
        if (!user || !user.role) return;

        if (user.role === 'admin' || user.role === 'master_admin') {
            user.permissions = ['all'];
        } else {
            user.permissions = PermissionManager.getRolePermissions(user.role) || [];
        }

        await DB.put('users', user);

        if (typeof SyncManager !== 'undefined') {
            await SyncManager.addToQueue('user', user.id);
        }

        Utils.showNotification('Permisos restablecidos al perfil del rol. Guarda en Empleados → Usuarios si usas el servidor.', 'success');
        this.goToEditUser(userId);
    },

    async saveUserPermissions(userId) {
        const user = await DB.get('users', userId);
        if (!user) return;

        // Recopilar permisos seleccionados
        const checkboxes = document.querySelectorAll('#permissions-form input[type="checkbox"]:checked');
        const selectedPermissions = Array.from(checkboxes).map(cb => cb.value);

        // Si es admin, mantener 'all'
        if (user.role === 'admin') {
            user.permissions = ['all'];
        } else {
            user.permissions = selectedPermissions;
        }

        user.updated_at = new Date().toISOString();
        
        await DB.put('users', user);
        
        if (typeof SyncManager !== 'undefined') {
            await SyncManager.addToQueue('user', user.id);
        }

        Utils.showNotification('Permisos actualizados correctamente', 'success');
        UI.closeModal();
        
        // Si el usuario actualizó sus propios permisos, recargar
        if (UserManager.currentUser && UserManager.currentUser.id === userId) {
            UserManager.currentUser = user;
            Utils.showNotification('Tus permisos han sido actualizados. Algunos cambios pueden requerir recargar la página.', 'info');
        }
        
        await this.managePermissions();
    },

    async viewAuditLog() {
        // Verificar permisos
        if (!PermissionManager || !PermissionManager.hasPermission('settings.view_audit')) {
            Utils.showNotification('No tienes permiso para ver el log de auditoría', 'error');
            return;
        }
        const audits = await DB.getAll('audit_log') || [];
        const sortedAudits = audits.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 100);

        const body = `
            <div style="max-height: 500px; overflow-y: auto;">
                <table class="cart-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Usuario</th>
                            <th>Acción</th>
                            <th>Detalles</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedAudits.length === 0 ? '<tr><td colspan="4" style="text-align: center; padding: var(--spacing-md);">No hay registros</td></tr>' : 
                        sortedAudits.map(audit => `
                            <tr>
                                <td>${Utils.formatDate(audit.created_at, 'DD/MM/YYYY HH:mm')}</td>
                                <td>${audit.user_id || 'Sistema'}</td>
                                <td>${audit.action}</td>
                                <td style="font-size: 10px;">${JSON.stringify(audit.details || {}).substring(0, 50)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        UI.showModal('Log de Auditoría', body, [
            { text: 'Cerrar', class: 'btn-primary', onclick: () => UI.closeModal() }
        ]);
    },

    async testSyncConnection() {
        // Redirigir a la función de prueba de autenticación de Google
        if (SyncManager && SyncManager.testGoogleAuth) {
            try {
                await SyncManager.testGoogleAuth();
                // Actualizar el estado después de autenticarse
                await this.loadSyncStatus();
            } catch (error) {
                // El error ya se muestra en testGoogleAuth
                await this.loadSyncStatus();
            }
        } else {
            Utils.showNotification('Configura el Google Client ID y Spreadsheet ID primero', 'error');
        }
    },

    async loadSystemInfo() {
        const infoContainer = document.getElementById('system-info');
        if (!infoContainer) return;

        try {
            const stores = ['sales', 'inventory_items', 'customers', 'repairs', 'cost_entries', 'employees', 'users'];
            const stats = {};

            for (const store of stores) {
                const items = await DB.getAll(store) || [];
                stats[store] = items.length;
            }

            const totalItems = Object.values(stats).reduce((sum, count) => sum + count, 0);

            infoContainer.innerHTML = `
                <div style="margin-bottom: var(--spacing-xs);">
                    <strong>Total de Registros:</strong> ${totalItems}
                </div>
                <div style="font-size: 10px; color: var(--color-text-secondary);">
                    <div>Ventas: ${stats.sales || 0}</div>
                    <div>Inventario: ${stats.inventory_items || 0}</div>
                    <div>Clientes: ${stats.customers || 0}</div>
                    <div>Reparaciones: ${stats.repairs || 0}</div>
                    <div>Costos: ${stats.cost_entries || 0}</div>
                    <div>Empleados: ${stats.employees || 0}</div>
                    <div>Usuarios: ${stats.users || 0}</div>
                </div>
                <div style="margin-top: var(--spacing-xs); font-size: 9px; color: var(--color-text-secondary);">
                    Versión: 1.0.0<br>
                    Última actualización: ${Utils.formatDate(new Date(), 'DD/MM/YYYY')}
                </div>
            `;
        } catch (e) {
            infoContainer.innerHTML = '<div style="color: var(--color-danger);">Error al cargar información</div>';
        }
    },

    async uploadBranchLogo() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                // Convertir a base64
                const base64 = await Utils.loadImageAsBlob(file);
                const logoInput = document.getElementById('branch-business-logo-input');
                if (logoInput) {
                    logoInput.value = base64;
                    Utils.showNotification('Logo cargado correctamente', 'success');
                }
            } catch (error) {
                console.error('Error cargando logo:', error);
                Utils.showNotification('Error al cargar el logo: ' + error.message, 'error');
            }
        };
        input.click();
    },


    async loadDatabaseStats() {
        const statsContainer = document.getElementById('db-stats');
        if (!statsContainer) return;

        try {
            const stores = ['sales', 'inventory_items', 'customers', 'repairs', 'cost_entries', 'employees', 'users', 'cash_sessions', 'cash_movements'];
            const stats = {};

            for (const store of stores) {
                try {
                    const items = await DB.getAll(store) || [];
                    stats[store] = items.length;
                } catch (e) {
                    stats[store] = 0;
                }
            }

            const totalItems = Object.values(stats).reduce((sum, count) => sum + count, 0);
            const dbSize = await this.estimateDatabaseSize();

            statsContainer.innerHTML = `
                <div style="margin-bottom: var(--spacing-xs);">
                    <strong>Total de Registros:</strong> ${totalItems.toLocaleString()}
                </div>
                <div style="font-size: 10px; color: var(--color-text-secondary); margin-bottom: var(--spacing-xs);">
                    <div>Ventas: ${stats.sales || 0}</div>
                    <div>Inventario: ${stats.inventory_items || 0}</div>
                    <div>Clientes: ${stats.customers || 0}</div>
                    <div>Reparaciones: ${stats.repairs || 0}</div>
                    <div>Costos: ${stats.cost_entries || 0}</div>
                    <div>Empleados: ${stats.employees || 0}</div>
                    <div>Usuarios: ${stats.users || 0}</div>
                    <div>Sesiones de Caja: ${stats.cash_sessions || 0}</div>
                    <div>Movimientos de Caja: ${stats.cash_movements || 0}</div>
                </div>
                <div style="font-size: 9px; color: var(--color-text-secondary); border-top: 1px solid var(--color-border-light); padding-top: var(--spacing-xs); margin-top: var(--spacing-xs);">
                    Tamaño estimado: ${dbSize}
                </div>
            `;
        } catch (e) {
            statsContainer.innerHTML = '<div style="color: var(--color-danger);">Error al cargar estadísticas</div>';
        }
    },

    async estimateDatabaseSize() {
        try {
            // Estimación simple basada en número de registros
            const stores = ['sales', 'inventory_items', 'customers', 'repairs', 'cost_entries', 'employees', 'users'];
            let totalRecords = 0;
            
            for (const store of stores) {
                try {
                    const items = await DB.getAll(store) || [];
                    totalRecords += items.length;
                } catch (e) {
                    // Ignorar errores
                }
            }

            // Estimación aproximada: ~2KB por registro promedio
            const estimatedSizeKB = Math.round((totalRecords * 2) / 1024);
            if (estimatedSizeKB < 1024) {
                return `${estimatedSizeKB} KB`;
            } else {
                return `${(estimatedSizeKB / 1024).toFixed(2)} MB`;
            }
        } catch (e) {
            return 'N/A';
        }
    },

    getArrivalRatesTab() {
        return `
            <div style="display: grid; grid-template-columns: 1fr; gap: var(--spacing-md);">
                <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border-light);">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-sm); margin-bottom: var(--spacing-md);">
                        <h3 style="margin: 0; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                            <i class="fas fa-table"></i> Reglas de Llegadas (Pago por Agencias)
                        </h3>
                        <div style="display: flex; gap: var(--spacing-sm);">
                            <button class="btn-secondary btn-sm" id="arrival-rate-reload-default-btn" title="Cargar reglas por defecto: TANITOURS, TRAVELEX, DISCOVERY, VERANOS, TB, TTF, TROPICAL ADVENTURE">
                                <i class="fas fa-sync-alt"></i> Recargar reglas por defecto
                            </button>
                            <button class="btn-primary btn-sm" id="arrival-rate-add-btn">
                                <i class="fas fa-plus"></i> Nueva Regla
                            </button>
                        </div>
                    </div>
                    <p style="margin: 0 0 var(--spacing-md) 0; font-size: 11px; color: var(--color-text-secondary);">Configura aquí las tarifas de pago por agencia según pasajeros y tipo de unidad. Estas reglas se usan para calcular automáticamente el costo al guardar una llegada.</p>
                    <div id="arrival-rates-list" style="max-height: 600px; overflow-y: auto; width: 100%; overflow-x: auto;"></div>
                </div>
            </div>
        `;
    },

    async loadArrivalRates() {
        document.getElementById('arrival-rate-add-btn')?.addEventListener('click', () => this.showArrivalRateForm());
        document.getElementById('arrival-rate-reload-default-btn')?.addEventListener('click', async () => {
            try {
                if (!await Utils.confirm('¿Recargar las reglas por defecto? Se crearán/actualizarán las reglas para TANITOURS, TRAVELEX, DISCOVERY, VERANOS, TB, TTF y TROPICAL ADVENTURE (según agencias existentes en el catálogo).')) return;
                if (typeof App !== 'undefined' && App.loadArrivalRateRules) {
                    await App.loadArrivalRateRules();
                    Utils.showNotification('Reglas por defecto recargadas', 'success');
                    await this.loadArrivalRates();
                } else {
                    Utils.showNotification('Función no disponible', 'error');
                }
            } catch (e) {
                console.error('Error recargando reglas:', e);
                Utils.showNotification('Error al recargar reglas: ' + (e.message || ''), 'error');
            }
        });

        try {
            // ========== SINCRONIZACIÓN CONTROLADA ==========
            // Encolar reglas pendientes para que las procese SyncManager, que sí mapea IDs legacy a UUID.
            try {
                const now = Date.now();
                const shouldQueuePendingSync = !this._arrivalRulesQueueSyncAt || (now - this._arrivalRulesQueueSyncAt) > 15000;
                if (shouldQueuePendingSync && typeof window.SyncManager !== 'undefined' && window.SyncManager.addToQueue) {
                    const isUUID = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
                    const allLocalRules = await DB.getAll('arrival_rate_rules') || [];
                    const pendingRules = allLocalRules.filter(r => r && r.id && (r.sync_status === 'pending' || !r.server_id || !isUUID(r.id)));

                    if (pendingRules.length > 0) {
                        console.log(`📋 [Arrival Rules] Encolando ${pendingRules.length} reglas pendientes para sincronización controlada`);
                        for (const rule of pendingRules) {
                            await window.SyncManager.addToQueue('arrival_rate_rule', rule.id);
                        }
                        this._arrivalRulesQueueSyncAt = now;

                        if (!window.SyncManager.isSyncing && typeof window.SyncManager.syncPending === 'function') {
                            Promise.resolve().then(() => window.SyncManager.syncPending()).catch(() => {});
                        }
                    }
                }
            } catch (error) {
                console.error('❌ [Arrival Rules] Error preparando sincronización controlada:', error);
            }

            // CACHE-FIRST: leer de IndexedDB primero
            let rules = await DB.getAll('arrival_rate_rules') || [];
            const hasCache = rules.length > 0;
            const hasApi = typeof API !== 'undefined' && API.baseURL && API.token && API.getArrivalRules;
            
            if (hasCache) {
                console.log(`⚡ [Cache-First] ${rules.length} reglas de llegada desde IndexedDB`);
            }
            if (hasApi) {
                if (hasCache) {
                    Promise.resolve().then(async () => {
                        try {
                            const fresh = await API.getArrivalRules();
                            for (const r of fresh) { try { await DB.put('arrival_rate_rules', { ...r, server_id: r.id, sync_status: 'synced' }); } catch (e) {} }
                        } catch (e) { /* ignore */ }
                    }).catch(() => {});
                } else {
                    try {
                        console.log('📥 [Paso 2 Arrival Rules] Sincronizando reglas desde el servidor...');
                        rules = await API.getArrivalRules();
                    console.log(`📥 [Paso 2 Arrival Rules] ${rules.length} reglas recibidas del servidor`);
                    
                    // Guardar/actualizar cada regla en IndexedDB local
                    let savedCount = 0;
                    let updatedCount = 0;
                    for (const serverRule of rules) {
                        try {
                            const key = `${serverRule.agency_id || 'no-agency'}_${serverRule.branch_id || 'no-branch'}_${serverRule.min_passengers || 0}_${serverRule.max_passengers || 999}_${serverRule.unit_type || 'any'}`;
                            const existingLocalRules = await DB.getAll('arrival_rate_rules') || [];
                            const existingRule = existingLocalRules.find(r => {
                                const rKey = `${r.agency_id || 'no-agency'}_${r.branch_id || 'no-branch'}_${r.min_passengers || 0}_${r.max_passengers || 999}_${r.unit_type || 'any'}`;
                                return rKey === key;
                            });
                            
                            const localRule = {
                                ...serverRule,
                                server_id: serverRule.id,
                                sync_status: 'synced'
                            };
                            
                            await DB.put('arrival_rate_rules', localRule);
                            
                            if (existingRule) {
                                updatedCount++;
                            } else {
                                savedCount++;
                            }
                        } catch (error) {
                            console.warn(`⚠️ [Paso 2 Arrival Rules] Error guardando regla ${serverRule.id}:`, error);
                        }
                    }
                    
                    console.log(`✅ [Paso 2 Arrival Rules] Sincronización servidor→local completada: ${savedCount} nuevas, ${updatedCount} actualizadas`);
                } catch (apiError) {
                    console.warn('Error cargando reglas desde API, usando modo local:', apiError);
                    rules = await DB.getAll('arrival_rate_rules') || [];
                }
                }
            } else {
                rules = await DB.getAll('arrival_rate_rules') || [];
            }
            
            // PASO 3: Eliminar duplicados antes de mostrar
            const rulesByKey = new Map();
            for (const rule of rules) {
                const key = `${rule.agency_id || 'no-agency'}_${rule.branch_id || 'no-branch'}_${rule.min_passengers || 0}_${rule.max_passengers || 999}_${rule.unit_type || 'any'}`;
                if (!rulesByKey.has(key)) {
                    rulesByKey.set(key, rule);
                } else {
                    const existing = rulesByKey.get(key);
                    if (rule.server_id && !existing.server_id) {
                        rulesByKey.set(key, rule);
                    } else if (existing.server_id && !rule.server_id) {
                        // Mantener el existente
                    } else {
                        const existingUpdated = existing.updated_at ? new Date(existing.updated_at) : new Date(0);
                        const currentUpdated = rule.updated_at ? new Date(rule.updated_at) : new Date(0);
                        if (currentUpdated > existingUpdated) {
                            rulesByKey.set(key, rule);
                        }
                    }
                }
            }
            rules = Array.from(rulesByKey.values());
            console.log(`🔍 [Paso 3 Arrival Rules] Deduplicación: ${rules.length} reglas únicas`);
            
            const agencies = await DB.getAll('catalog_agencies') || [];
            const branches = await DB.getAll('catalog_branches') || [];
            
            // Ordenar de manera organizada: Agencia > Sucursal > Pasajeros Mín > Tipo Unidad > Vigencia
            rules.sort((a, b) => {
                // 1. Por agencia (alfabético)
                const agencyA = agencies.find(ag => ag.id === a.agency_id);
                const agencyB = agencies.find(ag => ag.id === b.agency_id);
                const agencyNameA = agencyA?.name || a.agency_id || '';
                const agencyNameB = agencyB?.name || b.agency_id || '';
                if (agencyNameA !== agencyNameB) {
                    return agencyNameA.localeCompare(agencyNameB);
                }
                
                // 2. Por sucursal (alfabético, "Todas" al final)
                const branchA = branches.find(br => br.id === a.branch_id);
                const branchB = branches.find(br => br.id === b.branch_id);
                const branchNameA = branchA?.name || (a.branch_id ? a.branch_id : 'ZZZ_Todas');
                const branchNameB = branchB?.name || (b.branch_id ? b.branch_id : 'ZZZ_Todas');
                if (branchNameA !== branchNameB) {
                    return branchNameA.localeCompare(branchNameB);
                }
                
                // 3. Por pasajeros mínimos (ascendente)
                const minPaxA = a.min_passengers || 0;
                const minPaxB = b.min_passengers || 0;
                if (minPaxA !== minPaxB) {
                    return minPaxA - minPaxB;
                }
                
                // 4. Por tipo de unidad (alfabético, null al final)
                const unitTypeA = a.unit_type || 'zzz_cualquiera';
                const unitTypeB = b.unit_type || 'zzz_cualquiera';
                if (unitTypeA !== unitTypeB) {
                    return unitTypeA.localeCompare(unitTypeB);
                }
                
                // 5. Por vigencia desde (más reciente primero)
                const dateA = new Date(a.active_from || 0);
                const dateB = new Date(b.active_from || 0);
                return dateB - dateA;
            });

            this.displayArrivalRates(rules);
        } catch (e) {
            console.error('Error loading arrival rates:', e);
            Utils.showNotification('Error al cargar reglas de llegadas', 'error');
        }
    },

    async displayArrivalRates(rules) {
        const container = document.getElementById('arrival-rates-list');
        if (!container) return;

        if (rules.length === 0) {
            container.innerHTML = '<div class="empty-state">No hay reglas de llegadas registradas</div>';
            return;
        }

        const agencies = await DB.getAll('catalog_agencies') || [];
        const branches = await DB.getAll('catalog_branches') || [];

        // Agrupar por agencia para mejor visualización
        const groupedByAgency = {};
        rules.forEach(rule => {
            const agencyId = rule.agency_id || 'sin_agencia';
            if (!groupedByAgency[agencyId]) {
                groupedByAgency[agencyId] = [];
            }
            groupedByAgency[agencyId].push(rule);
        });

        container.innerHTML = `
            <table class="cart-table" style="width: 100%; max-width: 100%; table-layout: auto; min-width: 800px;">
                <thead>
                    <tr style="background: var(--color-bg-secondary);">
                        <th style="font-weight: 600;">Agencia</th>
                        <th style="font-weight: 600;">Sucursal</th>
                        <th style="font-weight: 600;">Pasajeros</th>
                        <th style="font-weight: 600;">Tipo Unidad</th>
                        <th style="font-weight: 600;">Tarifa por PAX</th>
                        <th style="font-weight: 600;">Vigencia Desde</th>
                        <th style="font-weight: 600;">Vigencia Hasta</th>
                        <th style="font-weight: 600;">Activa</th>
                        <th style="font-weight: 600;">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.keys(groupedByAgency).map(agencyId => {
                        const agencyRules = groupedByAgency[agencyId];
                        const agency = agencies.find(a => a.id === agencyId);
                        const agencyName = agency?.name || agencyId;
                        
                        return agencyRules.map((rule, index) => {
                        const agency = agencies.find(a => a.id === rule.agency_id);
                        const branch = branches.find(b => b.id === rule.branch_id);
                        const unitTypeLabels = {
                            'city_tour': 'City Tour',
                            'sprinter': 'Sprinter',
                            'van': 'Van',
                            'truck': 'Camiones',
                            null: 'Cualquiera'
                        };
                        const isActive = !rule.active_until || new Date(rule.active_until) >= new Date();
                        const isFirstInGroup = index === 0;
                        
                        // Determinar cómo mostrar la tarifa
                        let feeDisplay = '';
                        if (rule.fee_type === 'flat' || rule.flat_fee) {
                            feeDisplay = Utils.formatCurrency(rule.flat_fee || 0);
                            if (rule.extra_per_passenger && rule.extra_per_passenger > 0) {
                                feeDisplay += ` <small style="color: var(--color-accent);">+${Utils.formatCurrency(rule.extra_per_passenger)}/PAX extra</small>`;
                            }
                        } else {
                            feeDisplay = `${Utils.formatCurrency(rule.rate_per_passenger || 0)}/PAX`;
                        }

                        return `
                            <tr style="${isFirstInGroup ? 'border-top: 2px solid var(--color-primary);' : ''}">
                                <td style="${isFirstInGroup ? 'font-weight: 600; background: var(--color-bg-secondary);' : ''}">
                                    ${isFirstInGroup ? agencyName : ''}
                                </td>
                                <td>${branch?.name || rule.branch_id || 'Todas'}</td>
                                <td>${rule.min_passengers || 1} - ${rule.max_passengers || '∞'}</td>
                                <td>${unitTypeLabels[rule.unit_type] || 'Cualquiera'}</td>
                                <td style="font-weight: 600;">${feeDisplay}</td>
                                <td>${Utils.formatDate(rule.active_from, 'DD/MM/YYYY')}</td>
                                <td>${rule.active_until ? Utils.formatDate(rule.active_until, 'DD/MM/YYYY') : 'Sin límite'}</td>
                                <td>${isActive ? '<span class="status-badge status-disponible">Sí</span>' : '<span class="status-badge status-reservado">No</span>'}</td>
                                <td style="white-space: nowrap;">
                                    <button class="btn-secondary btn-xs" onclick="window.Settings.editArrivalRate('${rule.id}')">
                                        <i class="fas fa-edit"></i> Editar
                                    </button>
                                    <button class="btn-danger btn-xs" onclick="window.Settings.deleteArrivalRate('${rule.id}')">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `;
                        }).join('')}).join('')}
                </tbody>
            </table>
        `;
    },

    async showArrivalRateForm(ruleId = null) {
        const rule = ruleId ? await DB.get('arrival_rate_rules', ruleId) : null;
        const agencies = await DB.getAll('catalog_agencies') || [];
        const branches = await DB.getAll('catalog_branches') || [];

        const body = `
            <form id="arrival-rate-form" style="max-width: 600px;">
                <div class="form-group">
                    <label>Agencia *</label>
                    <select id="arrival-rate-agency" class="form-select" required>
                        <option value="">Seleccionar...</option>
                        ${agencies.map(a => `<option value="${a.id}" ${rule?.agency_id === a.id ? 'selected' : ''}>${a.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Sucursal</label>
                    <select id="arrival-rate-branch" class="form-select">
                        <option value="">Todas</option>
                        ${branches.map(b => `<option value="${b.id}" ${rule?.branch_id === b.id ? 'selected' : ''}>${b.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Pasajeros Mínimos</label>
                    <input type="number" id="arrival-rate-min-pax" class="form-input" value="${rule?.min_passengers || 1}" min="1" required>
                </div>
                <div class="form-group">
                    <label>Pasajeros Máximos</label>
                    <input type="number" id="arrival-rate-max-pax" class="form-input" value="${rule?.max_passengers || ''}" min="1" placeholder="Sin límite">
                </div>
                <div class="form-group">
                    <label>Tipo de Unidad</label>
                    <select id="arrival-rate-unit-type" class="form-select">
                        ${typeof ArrivalRules !== 'undefined' && ArrivalRules.UNIT_TYPE_OPTIONS 
                            ? ArrivalRules.UNIT_TYPE_OPTIONS.map(opt => 
                                `<option value="${opt.value}" ${rule?.unit_type === opt.value || (!rule?.unit_type && opt.value === '') ? 'selected' : ''}>${opt.label}</option>`
                            ).join('')
                            : `
                                <option value="">Cualquiera</option>
                                <option value="city_tour" ${rule?.unit_type === 'city_tour' ? 'selected' : ''}>City Tour</option>
                                <option value="sprinter" ${rule?.unit_type === 'sprinter' ? 'selected' : ''}>Sprinter</option>
                                <option value="van" ${rule?.unit_type === 'van' ? 'selected' : ''}>Van</option>
                                <option value="truck" ${rule?.unit_type === 'truck' ? 'selected' : ''}>Camiones</option>
                            `
                        }
                    </select>
                </div>
                <div class="form-group">
                    <label>Tipo de Tarifa *</label>
                    <select id="arrival-rate-fee-type" class="form-select" required>
                        <option value="flat" ${rule?.fee_type === 'flat' || rule?.flat_fee ? 'selected' : ''}>Tarifa Fija</option>
                        <option value="per_passenger" ${rule?.fee_type === 'per_passenger' || (!rule?.fee_type && !rule?.flat_fee) ? 'selected' : ''}>Por Pasajero</option>
                    </select>
                </div>
                <div class="form-group" id="arrival-rate-flat-fee-group" style="${rule?.fee_type === 'flat' || rule?.flat_fee ? '' : 'display: none;'}">
                    <label>Tarifa Fija (MXN) *</label>
                    <input type="number" id="arrival-rate-flat-fee" class="form-input" step="0.01" value="${rule?.flat_fee || 0}" min="0">
                </div>
                <div class="form-group" id="arrival-rate-per-pax-group" style="${rule?.fee_type === 'per_passenger' || (!rule?.fee_type && !rule?.flat_fee) ? '' : 'display: none;'}">
                    <label>Tarifa por Pasajero (MXN) *</label>
                    <input type="number" id="arrival-rate-amount" class="form-input" step="0.01" value="${rule?.rate_per_passenger || 0}" min="0">
                </div>
                <div class="form-group">
                    <label>Extra por Pasajero Adicional (MXN)</label>
                    <input type="number" id="arrival-rate-extra-per-pax" class="form-input" step="0.01" value="${rule?.extra_per_passenger || 0}" min="0" placeholder="0">
                    <small style="color: var(--color-text-secondary); font-size: 10px;">Se aplica cuando se excede el máximo de pasajeros del rango</small>
                </div>
                <div class="form-group">
                    <label>Vigencia Desde *</label>
                    <input type="date" id="arrival-rate-from" class="form-input" value="${rule?.active_from ? Utils.formatDate(rule.active_from, 'YYYY-MM-DD') : Utils.formatDate(new Date(), 'YYYY-MM-DD')}" required>
                </div>
                <div class="form-group">
                    <label>Vigencia Hasta</label>
                    <input type="date" id="arrival-rate-until" class="form-input" value="${rule?.active_until ? Utils.formatDate(rule.active_until, 'YYYY-MM-DD') : ''}" placeholder="Sin límite">
                </div>
                <div class="form-group">
                    <label>Notas</label>
                    <textarea id="arrival-rate-notes" class="form-input" rows="3" style="resize: vertical;">${rule?.notes || ''}</textarea>
                </div>
            </form>
        `;

        UI.showModal(ruleId ? 'Editar Regla de Llegadas' : 'Nueva Regla de Llegadas', body, [
            { text: 'Cancelar', class: 'btn-secondary', onclick: () => UI.closeModal() },
            { text: 'Guardar', class: 'btn-primary', onclick: () => this.saveArrivalRate(ruleId) }
        ]);
        
        // Event listener para mostrar/ocultar campos según tipo de tarifa
        const feeTypeSelect = document.getElementById('arrival-rate-fee-type');
        const flatFeeGroup = document.getElementById('arrival-rate-flat-fee-group');
        const perPaxGroup = document.getElementById('arrival-rate-per-pax-group');
        
        if (feeTypeSelect) {
            feeTypeSelect.addEventListener('change', () => {
                const feeType = feeTypeSelect.value;
                if (feeType === 'flat') {
                    flatFeeGroup.style.display = 'block';
                    perPaxGroup.style.display = 'none';
                    document.getElementById('arrival-rate-flat-fee')?.setAttribute('required', 'required');
                    document.getElementById('arrival-rate-amount')?.removeAttribute('required');
                } else {
                    flatFeeGroup.style.display = 'none';
                    perPaxGroup.style.display = 'block';
                    document.getElementById('arrival-rate-amount')?.setAttribute('required', 'required');
                    document.getElementById('arrival-rate-flat-fee')?.removeAttribute('required');
                }
            });
            // Trigger inicial
            feeTypeSelect.dispatchEvent(new Event('change'));
        }
    },

    async saveArrivalRate(ruleId = null) {
        try {
            const form = document.getElementById('arrival-rate-form');
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            const feeType = document.getElementById('arrival-rate-fee-type').value;
            const flatFee = feeType === 'flat' ? parseFloat(document.getElementById('arrival-rate-flat-fee').value) : 0;
            const ratePerPax = feeType === 'per_passenger' ? parseFloat(document.getElementById('arrival-rate-amount').value) : 0;
            const extraPerPax = parseFloat(document.getElementById('arrival-rate-extra-per-pax').value) || 0;

            const rule = {
                id: ruleId || Utils.generateId(),
                agency_id: document.getElementById('arrival-rate-agency').value,
                branch_id: document.getElementById('arrival-rate-branch').value || null,
                min_passengers: parseInt(document.getElementById('arrival-rate-min-pax').value) || 1,
                max_passengers: document.getElementById('arrival-rate-max-pax').value ? parseInt(document.getElementById('arrival-rate-max-pax').value) : null,
                unit_type: (() => {
                    const value = document.getElementById('arrival-rate-unit-type').value;
                    // Convertir string vacío a null para consistencia con el sistema
                    return value === '' ? null : value;
                })(),
                fee_type: feeType,
                rate_per_passenger: ratePerPax,
                flat_fee: flatFee,
                extra_per_passenger: extraPerPax > 0 ? extraPerPax : null,
                active_from: document.getElementById('arrival-rate-from').value,
                active_until: document.getElementById('arrival-rate-until').value || null,
                notes: document.getElementById('arrival-rate-notes').value || '',
                created_at: ruleId ? (await DB.get('arrival_rate_rules', ruleId))?.created_at : new Date().toISOString(),
                updated_at: new Date().toISOString(),
                sync_status: 'pending'
            };

            await DB.put('arrival_rate_rules', rule);
            await SyncManager.addToQueue('arrival_rate_rule', rule.id);
            
            Utils.showNotification('Regla de llegadas guardada', 'success');
            UI.closeModal();
            await this.loadArrivalRates();
        } catch (e) {
            console.error('Error saving arrival rate:', e);
            Utils.showNotification('Error al guardar regla de llegadas', 'error');
        }
    },

    async editArrivalRate(ruleId) {
        await this.showArrivalRateForm(ruleId);
    },

    async deleteArrivalRate(ruleId) {
        if (!await Utils.confirm('¿Estás seguro de eliminar esta regla de llegadas?')) return;

        try {
            await DB.delete('arrival_rate_rules', ruleId);
            await SyncManager.addToQueue('arrival_rate_rule', ruleId, 'delete');
            Utils.showNotification('Regla eliminada', 'success');
            await this.loadArrivalRates();
        } catch (e) {
            console.error('Error deleting arrival rate:', e);
            Utils.showNotification('Error al eliminar regla', 'error');
        }
    },

    /**
     * Carga 20 datos demo completos para validar todo el flujo del sistema
     */

    // Limpiar todos los datos mock/demo excepto usuarios y empleados

    // Funciones para Etiquetas de Joyas
    async configureJewelryLabel() {
        if (typeof JewelryLabelEditor === 'undefined') {
            Utils.showNotification('Módulo de etiquetas de joyas no disponible', 'error');
            return;
        }
        await JewelryLabelEditor.showEditor();
    },

    async updateJewelryLabelStatus() {
        try {
            const statusText = document.getElementById('jewelry-template-status-text');
            if (!statusText) return;

            if (typeof JewelryLabelEditor === 'undefined') {
                statusText.textContent = 'Módulo no disponible';
                statusText.style.color = 'var(--color-text-secondary)';
                return;
            }

            const hasTemplate = await JewelryLabelEditor.hasTemplate();
            if (hasTemplate) {
                statusText.textContent = '✅ Plantilla configurada y lista para usar';
                statusText.style.color = '#388e3c';
            } else {
                statusText.textContent = '⚠️ No configurada - Click en "Configurar Etiqueta" para comenzar';
                statusText.style.color = '#f57c00';
            }
        } catch (e) {
            console.error('Error actualizando estado de etiqueta de joya:', e);
        }
    },

    async testJewelryLabel() {
        try {
            if (typeof JewelryLabelEditor === 'undefined') {
                Utils.showNotification('Módulo de etiquetas de joyas no disponible', 'error');
                return;
            }

            const hasTemplate = await JewelryLabelEditor.hasTemplate();
            if (!hasTemplate) {
                Utils.showNotification('⚠️ Primero configura la plantilla antes de imprimir una prueba', 'warning');
                await this.configureJewelryLabel();
                return;
            }

            // Crear un item de prueba
            const testItem = {
                id: 'test',
                name: 'Anillo Oro 18K Diamante',
                sku: 'TEST-001',
                barcode: '123456789012',
                price: 15000
            };

            // Usar la función de impresión con item de prueba
            await JewelryLabelEditor.printJewelryLabel('test', testItem);
            Utils.showNotification('✅ Prueba de etiqueta enviada a impresión', 'success');
        } catch (e) {
            console.error('Error en prueba de etiqueta de joya:', e);
            Utils.showNotification('Error al imprimir prueba: ' + e.message, 'error');
        }
    },

    async restoreSystemConfiguration() {
        try {
            console.log('🔄 Restaurando configuración básica del sistema...');
            let restoredCount = 0;

            // 1. Restaurar Sucursales
            const branches = [
                { id: 'branch1', name: 'L Vallarta', address: '', active: true },
                { id: 'branch2', name: 'Malecón', address: '', active: true },
                { id: 'branch3', name: 'San Sebastián', address: '', active: true },
                { id: 'branch4', name: 'Sayulita', address: '', active: true }
            ];

            for (const branch of branches) {
                try {
                    const existing = await DB.get('catalog_branches', branch.id);
                    if (!existing) {
                        await DB.put('catalog_branches', branch);
                        restoredCount++;
                        console.log(`✅ Sucursal restaurada: ${branch.name}`);
                    }
                } catch (e) {
                    console.error(`Error restaurando sucursal ${branch.id}:`, e);
                }
            }

            // 2. Restaurar Comisiones (necesita sellers y guides)
            const allSellers = await DB.getAll('catalog_sellers') || [];
            const allGuides = await DB.getAll('catalog_guides') || [];
            
            const sebastianSeller = allSellers.find(s => s.name === 'SEBASTIAN');
            const omarSeller = allSellers.find(s => s.name === 'OMAR');
            const jcSeller = allSellers.find(s => s.name === 'JUAN CARLOS');
            const marinaGuide = allGuides.find(g => g.name === 'MARINA');

            const commissionRules = [];
            
            // SEBASTIAN: discount_pct=0, multiplier=10
            if (sebastianSeller) {
                commissionRules.push({
                    id: 'seller_sebastian',
                    entity_type: 'seller',
                    entity_id: sebastianSeller.id,
                    discount_pct: 0,
                    multiplier: 10,
                    created_at: new Date().toISOString()
                });
            }
            
            // OMAR y JUAN CARLOS: discount_pct=20, multiplier=7
            if (omarSeller) {
                commissionRules.push({
                    id: 'seller_omar',
                    entity_type: 'seller',
                    entity_id: omarSeller.id,
                    discount_pct: 20,
                    multiplier: 7,
                    created_at: new Date().toISOString()
                });
            }
            if (jcSeller) {
                commissionRules.push({
                    id: 'seller_jc',
                    entity_type: 'seller',
                    entity_id: jcSeller.id,
                    discount_pct: 20,
                    multiplier: 7,
                    created_at: new Date().toISOString()
                });
            }
            
            // Default vendedores: discount_pct=5, multiplier=9
            commissionRules.push({
                id: 'seller_default',
                entity_type: 'seller',
                entity_id: null,
                discount_pct: 5,
                multiplier: 9,
                created_at: new Date().toISOString()
            });
            
            // MARINA: discount_pct=0, multiplier=10
            if (marinaGuide) {
                commissionRules.push({
                    id: 'guide_marina',
                    entity_type: 'guide',
                    entity_id: marinaGuide.id,
                    discount_pct: 0,
                    multiplier: 10,
                    created_at: new Date().toISOString()
                });
            }
            
            // Default guías: discount_pct=18, multiplier=10
            commissionRules.push({
                id: 'guide_default',
                entity_type: 'guide',
                entity_id: null,
                discount_pct: 18,
                multiplier: 10,
                created_at: new Date().toISOString()
            });

            for (const rule of commissionRules) {
                try {
                    const existing = await DB.get('commission_rules', rule.id);
                    if (!existing) {
                        await DB.put('commission_rules', rule);
                        restoredCount++;
                        console.log(`✅ Regla de comisión restaurada: ${rule.id}`);
                    }
                } catch (e) {
                    console.error(`Error restaurando regla ${rule.id}:`, e);
                }
            }

            // 3. Verificar que cost_entries existe (no hay datos de ejemplo, solo verificar que el store esté disponible)
            // Los costos se crean manualmente por el usuario, así que solo verificamos que el store exista

            console.log(`✅ Configuración restaurada: ${restoredCount} elementos`);
            if (restoredCount > 0) {
                Utils.showNotification(`✅ Configuración básica restaurada: ${restoredCount} elementos`, 'success');
            }

            // Nota: Las reglas de llegadas (arrival_rate_rules) se restauran automáticamente
            // cuando se cargan los catálogos (agencies) mediante App.loadCatalogs()
            // Las llegadas (agency_arrivals) son datos que se crean manualmente por el usuario

        } catch (e) {
            console.error('Error restaurando configuración del sistema:', e);
            Utils.showNotification('Error al restaurar configuración: ' + e.message, 'error');
        }
    },

    async loadSyncTab() {
        // Cargar URL del servidor en el campo de texto
        try {
            const apiUrl = (await DB.get('settings', 'api_url'))?.value || null;
            const urlInput = document.getElementById('server-url-input');
            if (urlInput) {
                urlInput.value = apiUrl || '';
            }

            // CRÍTICO: Sincronizar API.baseURL con la DB para que NO “se desconfigure” al recargar
            if (apiUrl && typeof API !== 'undefined') {
                let cleanURL = apiUrl.trim();
                if (!cleanURL.startsWith('http://') && !cleanURL.startsWith('https://')) {
                    cleanURL = 'https://' + cleanURL;
                }
                if (cleanURL.includes('railway') && !cleanURL.endsWith('.app') && !cleanURL.endsWith('.app/')) {
                    cleanURL = cleanURL.replace(/\/+$/, '') + '.app';
                }
                cleanURL = cleanURL.replace(/\/+$/, '');

                if (!API.baseURL || API.baseURL !== cleanURL) {
                    API.baseURL = cleanURL;
                    console.log(`🔄 API.baseURL sincronizado desde DB (Settings): ${cleanURL}`);
                }

                // Si la URL guardada estaba sucia, normalizarla en DB
                if (cleanURL !== apiUrl) {
                    await DB.put('settings', { key: 'api_url', value: cleanURL });
                }
            }
        } catch (error) {
            console.error('Error cargando URL del servidor:', error);
        }

        // Cargar estado del servidor
        try {
            const apiUrl = (await DB.get('settings', 'api_url'))?.value || null;
            const statusDiv = document.getElementById('server-config-status');
            if (statusDiv) {
                // Mostrar “Conectado” si hay URL y baseURL. El token/socket es deseable pero no debe bloquear el estado.
                if (apiUrl && typeof API !== 'undefined' && API.baseURL) {
                    statusDiv.innerHTML = `
                        <div style="color: var(--color-success);">
                            <i class="fas fa-check-circle"></i> Conectado<br>
                            <small style="color: var(--color-text-secondary);">${Utils.escapeHtml(apiUrl)}</small>
                        </div>
                    `;
                } else if (apiUrl) {
                    statusDiv.innerHTML = `
                        <div style="color: var(--color-warning);">
                            <i class="fas fa-exclamation-triangle"></i> Configurado pero no conectado<br>
                            <small style="color: var(--color-text-secondary);">${Utils.escapeHtml(apiUrl)}</small>
                        </div>
                    `;
                } else {
                    statusDiv.innerHTML = `
                        <div style="color: var(--color-warning);">
                            <i class="fas fa-exclamation-triangle"></i> Servidor no configurado<br>
                            <small style="color: var(--color-text-secondary);">Ingresa la URL de Railway y haz clic en "Guardar"</small>
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error('Error cargando estado del servidor:', error);
        }

        // Cargar estado de sincronización
        try {
            const statusInfoDiv = document.getElementById('sync-status-info');
            if (statusInfoDiv) {
                const apiUrl = (await DB.get('settings', 'api_url'))?.value || null;
                // Verificar conexión real: URL, baseURL, token Y socket conectado
                const hasToken = (typeof API !== 'undefined' && API.token) || localStorage.getItem('api_token');
                const hasSocket = typeof API !== 'undefined' && API.socket && API.socket.connected;
                const isConnected = apiUrl && typeof API !== 'undefined' && API.baseURL && hasToken && hasSocket;
                
                if (isConnected) {
                    statusInfoDiv.innerHTML = `
                        <div style="margin-bottom: var(--spacing-xs);">
                            <strong>Estado:</strong> 
                            <span style="color: var(--color-success);">Conectado</span>
                        </div>
                        <div style="font-size: 10px; color: var(--color-text-secondary);">
                            Sincronización activa con Railway
                        </div>
                    `;
                } else {
                    statusInfoDiv.innerHTML = `
                        <div style="margin-bottom: var(--spacing-xs);">
                            <strong>Estado:</strong> 
                            <span style="color: var(--color-warning);">Desconectado</span>
                        </div>
                        <div style="font-size: 10px; color: var(--color-text-secondary);">
                            Configura el servidor para activar la sincronización
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error('Error cargando estado de sincronización:', error);
        }

        // Cargar estado de la cola de sincronización
        try {
            if (typeof window.SyncManager !== 'undefined') {
                const queueSize = window.SyncManager.getQueueSize();
                const queueCountEl = document.getElementById('sync-queue-count');
                if (queueCountEl) {
                    queueCountEl.textContent = queueSize;
                    queueCountEl.style.color = queueSize > 0 ? 'var(--color-warning)' : 'var(--color-text-secondary)';
                }
            }
        } catch (error) {
            console.error('Error cargando estado de sincronización:', error);
        }
    },

    async loadSystemTab() {
        // Cargar URL del servidor en el campo de texto (si existe en esta pestaña)
        try {
            const apiUrl = (await DB.get('settings', 'api_url'))?.value || null;
            const urlInput = document.getElementById('server-url-input');
            if (urlInput) {
                urlInput.value = apiUrl || '';
            }
        } catch (error) {
            console.error('Error cargando URL del servidor:', error);
        }

        // Cargar estado del servidor (si existe en esta pestaña)
        try {
            const apiUrl = (await DB.get('settings', 'api_url'))?.value || null;
            const statusDiv = document.getElementById('server-config-status');
            if (statusDiv) {
                if (apiUrl) {
                    statusDiv.innerHTML = `
                        <div style="color: var(--color-success);">
                            <i class="fas fa-check-circle"></i> Servidor configurado<br>
                            <small style="color: var(--color-text-secondary);">${Utils.escapeHtml(apiUrl)}</small>
                        </div>
                    `;
                } else {
                    statusDiv.innerHTML = `
                        <div style="color: var(--color-warning);">
                            <i class="fas fa-exclamation-triangle"></i> Servidor no configurado<br>
                            <small style="color: var(--color-text-secondary);">Ingresa la URL de Railway y haz clic en "Guardar"</small>
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error('Error cargando estado del servidor:', error);
        }

        // Cargar estado de la cola de sincronización (si existe en esta pestaña)
        try {
            if (typeof window.SyncManager !== 'undefined') {
                const queueSize = window.SyncManager.getQueueSize();
                const queueCountEl = document.getElementById('sync-queue-count');
                if (queueCountEl) {
                    queueCountEl.textContent = queueSize;
                    queueCountEl.style.color = queueSize > 0 ? 'var(--color-warning)' : 'var(--color-text-secondary)';
                }
            }
        } catch (error) {
            console.error('Error cargando estado de sincronización:', error);
        }

        // Configurar eventos de los botones de backup
        setTimeout(() => {
            const createBtn = document.getElementById('backup-create-btn');
            const importBtn = document.getElementById('backup-import-btn');
            const selectFolderBtn = document.getElementById('backup-select-folder-btn');
            const clearFolderBtn = document.getElementById('backup-clear-folder-btn');
            
            if (createBtn) {
                createBtn.addEventListener('click', () => this.createBackupManually());
            }
            
            if (importBtn) {
                importBtn.addEventListener('click', () => this.importBackupManually());
            }

            if (selectFolderBtn) {
                selectFolderBtn.addEventListener('click', () => this.selectBackupFolder());
            }

            if (clearFolderBtn) {
                clearFolderBtn.addEventListener('click', () => this.clearBackupFolder());
            }

            // Cargar información del directorio de backups
            this.loadBackupDirectoryInfo();

            // Cargar lista de backups
            this.loadBackupsList();
        }, 100);
    },

    async saveServerURL() {
        try {
            const urlInput = document.getElementById('server-url-input');
            if (!urlInput) {
                Utils.showNotification('Error: Campo de URL no encontrado', 'error');
                return;
            }

            let url = urlInput.value.trim();
            
            if (!url) {
                Utils.showNotification('Ingresa una URL válida', 'warning');
                return;
            }

            // Asegurar que la URL tenga el protocolo https://
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }

            // Asegurar que las URLs de Railway tengan .app al final si no lo tienen
            if (url.includes('railway') && !url.endsWith('.app') && !url.endsWith('.app/')) {
                url = url.replace(/\/+$/, '') + '.app';
            }

            // Limpiar barras finales para evitar dobles barras en las peticiones
            url = url.replace(/\/+$/, '');

            // Validar formato de URL
            try {
                new URL(url);
            } catch (error) {
                Utils.showNotification('URL inválida. Debe comenzar con http:// o https://', 'error');
                return;
            }

            // Guardar en settings
            await DB.put('settings', {
                key: 'api_url',
                value: url
            });

            // Configurar API (esto también guarda en DB, pero ya lo hicimos arriba)
            if (typeof API !== 'undefined') {
                API.baseURL = url; // Sincronizar inmediatamente
                
                // Cargar token si existe
                if (!API.token) {
                    API.token = localStorage.getItem('api_token');
                }
                
                await API.setBaseURL(url); // Esto también actualiza DB y reinicializa socket si hay token
                
                // Si hay token pero el socket no está conectado, inicializarlo
                if (API.token && (!API.socket || !API.socket.connected)) {
                    try {
                        await API.initSocket();
                        console.log('✅ Socket inicializado después de guardar URL');
                    } catch (socketError) {
                        console.warn('⚠️ Error inicializando socket:', socketError);
                    }
                }
            }

            Utils.showNotification('✅ URL guardada correctamente', 'success');
            
            // Pequeño delay para asegurar que DB esté actualizado
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Actualizar estado en el módulo de sincronización si está abierto
            if (typeof window.SyncUI !== 'undefined' && window.SyncUI.updateServerStatus) {
                await window.SyncUI.updateServerStatus();
            }
            
            // Actualizar estado del topbar (forzar actualización completa)
            if (typeof window.App !== 'undefined' && window.App.updateTopbarStatus) {
                await window.App.updateTopbarStatus();
            } else if (typeof UI !== 'undefined' && UI.updateSyncStatus) {
                // Fallback: actualizar directamente
                const hasToken = (typeof API !== 'undefined' && API.token) || !!localStorage.getItem('api_token');
                const isConnected = url && typeof API !== 'undefined' && API.baseURL && hasToken;
                await UI.updateSyncStatus(isConnected, false);
            }
            
            // Actualizar estado (verificar qué pestaña está activa)
            const activeTab = document.querySelector('#settings-tabs .tab-btn.active')?.dataset.tab;
            if (activeTab === 'sync') {
                await this.loadSyncTab();
            } else {
                await this.loadSystemTab();
            }
        } catch (error) {
            console.error('Error guardando URL:', error);
            Utils.showNotification('Error al guardar URL: ' + error.message, 'error');
        }
    },

    async testServerConnection() {
        try {
            const urlInput = document.getElementById('server-url-input');
            const url = urlInput ? urlInput.value.trim() : null;
            
            // Si no hay URL en el campo, intentar obtener de settings
            const apiUrl = url || ((await DB.get('settings', 'api_url'))?.value || null);
            
            if (!apiUrl) {
                Utils.showNotification('⚠️ Ingresa una URL primero', 'warning');
                return;
            }

            Utils.showNotification('🔄 Probando conexión...', 'info');
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            try {
                // Limpiar URL: eliminar barras finales y asegurar formato correcto
                const cleanUrl = apiUrl.replace(/\/+$/, ''); // Eliminar todas las barras finales
                const healthUrl = `${cleanUrl}/health`;
                
                console.log(`🔄 Probando conexión a: ${healthUrl}`);
                
                const response = await fetch(healthUrl, {
                    method: 'GET',
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    const data = await response.json();
                    Utils.showNotification(`✅ Conexión exitosa: ${data.status || 'OK'}`, 'success');
                    
                    // Guardar URL si no estaba guardada
                    if (url && url !== ((await DB.get('settings', 'api_url'))?.value || null)) {
                        await DB.put('settings', {
                            key: 'api_url',
                            value: url
                        });
                        
                        // Configurar API
                        if (typeof API !== 'undefined') {
                            await API.setBaseURL(url);
                        }
                    }
                    
                    // Actualizar estado en el módulo de sincronización
                    if (typeof window.SyncUI !== 'undefined') {
                        await window.SyncUI.updateServerStatus();
                        await window.SyncUI.updateSyncStatus();
                    }
                    
                    // Actualizar estado del topbar
                    if (typeof window.App !== 'undefined' && window.App.updateTopbarStatus) {
                        await window.App.updateTopbarStatus();
                    }
                    
                    // Actualizar estado en settings
                    const statusDiv = document.getElementById('server-config-status');
                    if (statusDiv) {
                        statusDiv.innerHTML = `
                            <div style="color: var(--color-success);">
                                <i class="fas fa-check-circle"></i> Conexión exitosa<br>
                                <small style="color: var(--color-text-secondary);">${Utils.escapeHtml(apiUrl)}</small>
                            </div>
                        `;
                    }
                } else {
                    throw new Error(`Servidor respondió con código ${response.status}`);
                }
            } catch (fetchError) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    throw new Error('Tiempo de espera agotado (5 segundos)');
                }
                throw fetchError;
            }
        } catch (error) {
            Utils.showNotification(`❌ Error de conexión: ${error.message}`, 'error');
            
            // Actualizar estado con error
            const statusDiv = document.getElementById('server-config-status');
            if (statusDiv) {
                statusDiv.innerHTML = `
                    <div style="color: var(--color-danger);">
                        <i class="fas fa-times-circle"></i> Error de conexión<br>
                        <small style="color: var(--color-text-secondary);">${Utils.escapeHtml(error.message || '')}</small>
                    </div>
                `;
            }
        }
    },

    async loadBackupsList() {
        const container = document.getElementById('backups-list-container');
        if (!container) return;

        try {
            if (typeof BackupManager === 'undefined') {
                container.innerHTML = '<div style="text-align: center; padding: var(--spacing-md); color: var(--color-danger);">BackupManager no está disponible</div>';
                return;
            }

            const backups = BackupManager.getBackupList();
            const storageUsage = BackupManager.getStorageUsage();

            if (backups.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: var(--spacing-md); color: var(--color-text-secondary);">
                        <i class="fas fa-database" style="font-size: 32px; margin-bottom: var(--spacing-sm); opacity: 0.5;"></i>
                        <p>No hay backups guardados aún</p>
                        <p style="font-size: 10px; margin-top: var(--spacing-xs);">Los backups automáticos aparecerán aquí</p>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div style="max-height: 400px; overflow-y: auto;">
                        <table class="cart-table" style="font-size: 11px;">
                            <thead>
                                <tr>
                                    <th>Fecha y Hora</th>
                                    <th>Tamaño</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${backups.map(backup => {
                                    const date = new Date(backup.date);
                                    const sizeKB = (backup.size / 1024).toFixed(2);
                                    const sizeMB = (backup.size / 1024 / 1024).toFixed(2);
                                    const sizeText = backup.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;
                                    return `
                                        <tr>
                                            <td>
                                                <div style="font-weight: 600;">${date.toLocaleString('es-MX')}</div>
                                                <div style="font-size: 9px; color: var(--color-text-secondary);">${backup.key}</div>
                                            </td>
                                            <td>${sizeText}</td>
                                            <td>
                                                <div style="display: flex; gap: var(--spacing-xs);">
                                                    <button class="btn-secondary btn-xs" onclick="window.Settings.restoreBackupFromList('${backup.key}')" title="Restaurar">
                                                        <i class="fas fa-undo"></i>
                                                    </button>
                                                    <button class="btn-secondary btn-xs" onclick="window.Settings.downloadBackupFromList('${backup.key}')" title="Descargar">
                                                        <i class="fas fa-download"></i>
                                                    </button>
                                                    <button class="btn-danger btn-xs" onclick="window.Settings.deleteBackupFromList('${backup.key}')" title="Eliminar">
                                                        <i class="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }

            // Actualizar información de almacenamiento
            const storageText = document.getElementById('backup-storage-text');
            if (storageText) {
                storageText.textContent = `${storageUsage.count} backup(s) - ${storageUsage.totalSizeMB} MB total`;
            }
        } catch (error) {
            console.error('Error cargando lista de backups:', error);
            container.innerHTML = `<div style="text-align: center; padding: var(--spacing-md); color: var(--color-danger);">Error al cargar backups: ${error.message}</div>`;
        }
    },

    async restoreBackupFromList(backupKey) {
        try {
            if (typeof BackupManager === 'undefined') {
                Utils.showNotification('BackupManager no está disponible', 'error');
                return;
            }

            const success = await BackupManager.restoreBackup(backupKey);
            if (success) {
                await this.loadBackupsList();
            }
        } catch (error) {
            console.error('Error restaurando backup:', error);
            Utils.showNotification('Error al restaurar backup: ' + error.message, 'error');
        }
    },

    async downloadBackupFromList(backupKey) {
        try {
            if (typeof BackupManager === 'undefined') {
                Utils.showNotification('BackupManager no está disponible', 'error');
                return;
            }

            await BackupManager.downloadBackup(backupKey);
        } catch (error) {
            console.error('Error descargando backup:', error);
            Utils.showNotification('Error al descargar backup: ' + error.message, 'error');
        }
    },

    async deleteBackupFromList(backupKey) {
        try {
            if (!await Utils.confirm('¿Estás seguro de eliminar este backup? Esta acción no se puede deshacer.')) {
                return;
            }

            if (typeof BackupManager === 'undefined') {
                Utils.showNotification('BackupManager no está disponible', 'error');
                return;
            }

            const success = BackupManager.deleteBackup(backupKey);
            if (success) {
                await this.loadBackupsList();
            }
        } catch (error) {
            console.error('Error eliminando backup:', error);
            Utils.showNotification('Error al eliminar backup: ' + error.message, 'error');
        }
    },

    async createBackupManually() {
        try {
            if (typeof BackupManager === 'undefined') {
                Utils.showNotification('BackupManager no está disponible', 'error');
                return;
            }

            Utils.showNotification('Creando backup...', 'info');
            await BackupManager.createBackup();
            Utils.showNotification('Backup creado y descargado correctamente', 'success');
            await this.loadBackupsList();
        } catch (error) {
            console.error('Error creando backup:', error);
            Utils.showNotification('Error al crear backup: ' + error.message, 'error');
        }
    },

    async importBackupManually() {
        try {
            if (typeof BackupManager === 'undefined') {
                Utils.showNotification('BackupManager no está disponible', 'error');
                return;
            }

            const success = await BackupManager.importBackupFromFile();
            if (success) {
                await this.loadBackupsList();
            }
        } catch (error) {
            console.error('Error importando backup:', error);
            Utils.showNotification('Error al importar backup: ' + error.message, 'error');
        }
    },

    async selectBackupFolder() {
        try {
            if (typeof BackupManager === 'undefined') {
                Utils.showNotification('BackupManager no está disponible', 'error');
                return;
            }

            const success = await BackupManager.selectBackupDirectory();
            if (success) {
                this.loadBackupDirectoryInfo();
            }
        } catch (error) {
            console.error('Error seleccionando carpeta:', error);
            Utils.showNotification('Error al seleccionar carpeta: ' + error.message, 'error');
        }
    },

    async clearBackupFolder() {
        try {
            if (typeof BackupManager === 'undefined') {
                Utils.showNotification('BackupManager no está disponible', 'error');
                return;
            }

            if (!await Utils.confirm('¿Deseas deseleccionar la carpeta de backups? Los backups se guardarán solo en localStorage.')) {
                return;
            }

            const success = await BackupManager.clearBackupDirectory();
            if (success) {
                this.loadBackupDirectoryInfo();
            }
        } catch (error) {
            console.error('Error deseleccionando carpeta:', error);
            Utils.showNotification('Error al deseleccionar carpeta: ' + error.message, 'error');
        }
    },

    loadBackupDirectoryInfo() {
        try {
            if (typeof BackupManager === 'undefined') {
                return;
            }

            const info = BackupManager.getBackupDirectoryInfo();
            const pathElement = document.getElementById('backup-directory-path');
            const clearBtn = document.getElementById('backup-clear-folder-btn');
            const selectBtn = document.getElementById('backup-select-folder-btn');

            if (!info.available) {
                if (pathElement) {
                    pathElement.innerHTML = '<span style="color: var(--color-warning);">File System Access API no disponible. Usa Chrome, Edge o Opera para esta función.</span>';
                }
                if (selectBtn) selectBtn.disabled = true;
                if (clearBtn) clearBtn.style.display = 'none';
                return;
            }

            if (info.selected && info.path) {
                if (pathElement) {
                    pathElement.innerHTML = `<span style="color: var(--color-success);"><i class="fas fa-check-circle"></i> Carpeta seleccionada: <strong>${Utils.escapeHtml(info.path)}</strong></span>`;
                }
                if (clearBtn) clearBtn.style.display = 'inline-flex';
            } else {
                    // Verificar si hay información guardada pero sin handle (después de recargar)
                    const savedInfo = BackupManager.backupDirectoryPath;
                    if (savedInfo) {
                        if (pathElement) {
                            pathElement.innerHTML = `<span style="color: var(--color-success);"><i class="fas fa-check-circle"></i> Carpeta guardada: <strong>${Utils.escapeHtml(savedInfo)}</strong> (se restaurará automáticamente cuando sea necesario)</span>`;
                        }
                    } else {
                        if (pathElement) {
                            pathElement.innerHTML = '<span style="color: var(--color-text-secondary);">No hay carpeta seleccionada (los backups se guardarán solo en localStorage)</span>';
                        }
                    }
                if (clearBtn) clearBtn.style.display = 'none';
            }

            if (selectBtn) selectBtn.disabled = false;
        } catch (error) {
            console.error('Error cargando información del directorio:', error);
        }
    },

    manageSuppliers() {
        if (typeof App !== 'undefined' && App.loadModule) {
            App.loadModule('suppliers');
        } else if (typeof Suppliers !== 'undefined' && Suppliers.init) {
            Suppliers.init();
        } else {
            Utils.showNotification('Módulo de proveedores no disponible', 'error');
        }
    },
};

window.Settings = Settings;

