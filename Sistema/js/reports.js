// Reports Module - Gestión Avanzada de Reportes

const Reports = {
    initialized: false,
    currentTab: 'reports',
    pendingCaptures: [], // Lista de capturas pendientes antes de guardar
    editingPendingCaptureId: null, // ID de la captura pendiente que se está editando
    isExporting: false, // Flag para prevenir múltiples exportaciones simultáneas

    // Mapa guía (nombre normalizado) -> agencia (nombre) para comisiones cuando catalog_guides.agency_id no está
    GUIDE_TO_AGENCY: {
        'CARLOS SIS': 'VERANOS', 'MARIO RENDON': 'VERANOS', 'CHAVA': 'VERANOS', 'FREDY': 'VERANOS', 'NETO': 'VERANOS', 'EMMANUEL': 'VERANOS',
        'MARINA': 'TANITOURS', 'GLORIA': 'TANITOURS', 'DANIELA': 'TANITOURS',
        'RAMON': 'DISCOVERY', 'GUSTAVO SIS': 'DISCOVERY', 'GUSTAVO LEPE': 'DISCOVERY', 'NOVOA': 'DISCOVERY', 'ERIK': 'DISCOVERY', 'CHILO': 'DISCOVERY', 'FERMIN': 'DISCOVERY', 'EMMA': 'DISCOVERY', 'HERASMO': 'DISCOVERY',
        'MIGUEL SUAREZ': 'TRAVELEX', 'SANTA': 'TRAVELEX', 'MIGUEL DELGADILLO': 'TRAVELEX', 'ANDRES CHAVEZ': 'TRAVELEX', 'SAREM': 'TRAVELEX', 'ZAVALA': 'TRAVELEX', 'TEMO': 'TRAVELEX', 'ROCIO': 'TRAVELEX', 'SEBASTIAN S': 'TRAVELEX',
        'MIGUEL IBARRA': 'TB', 'ADAN': 'TB', 'MIGUEL RAGA': 'TB', 'GABINO': 'TB', 'HECTOR SUAREZ': 'TB', 'OSCAR': 'TB', 'JOSE AVILES': 'TB',
        'HUGO': 'TTF', 'HILBERTO': 'TTF', 'JOSE MASIAS': 'TTF', 'DAVID BUSTOS': 'TTF', 'ALFONSO': 'TTF', 'DANIEL RIVERA': 'TTF', 'EDUARDO LEAL': 'TTF'
    },

    /**
     * Calcular comisiones basadas en reglas reales de negocio (agencias/guías y vendedores).
     * Guías: -18% * 10% por agencia (VERANOS, TANITOURS, DISCOVERY, TRAVELEX, TB, TTF); excepción TANITOURS+MARINA = 10% directo.
     * Vendedores: SEBASTIAN 10% directo; OMAR/JUAN CARLOS -20%*7%; resto de la lista -5%*9%.
     * @param {number} totalMXN - Total en MXN
     * @param {string} agencyName - Nombre de la agencia (opcional)
     * @param {string} sellerName - Nombre del vendedor (opcional)
     * @param {string} guideName - Nombre del guía (opcional)
     * @returns {Object} Objeto con {sellerCommission, guideCommission}
     */
    calculateCommissionByRules(totalMXN, agencyName = null, sellerName = null, guideName = null) {
        if (!totalMXN || totalMXN <= 0) return { sellerCommission: 0, guideCommission: 0 };

        const normalizeName = (name) => name ? name.trim().toUpperCase() : '';
        const agency = normalizeName(agencyName);
        const seller = normalizeName(sellerName);
        const guide = normalizeName(guideName);

        const AGENCIES_GUIDE = new Set(['VERANOS', 'TANITOURS', 'DISCOVERY', 'TRAVELEX', 'TB', 'TTF', 'TROPICAL ADVENTURE']);
        const SELLERS_OMAR_JUANCARLOS = new Set(['OMAR', 'JUAN CARLOS']);
        const SELLERS_RESTO = new Set([
            'CALI', 'SAULA', 'ANDRES', 'ANGEL', 'SR ANGEL', 'RAMSES', 'ISAURA', 'CARLOS', 'PACO', 'FRANCISCO',
            'PANDA', 'KARLA', 'NADIA', 'JASON', 'ROBERTO', 'PEDRO', 'ANA', 'JOVA', 'EDITH', 'VERO', 'POCHIS',
            'RAMON', 'ALDAIR', 'CLAUDIA', 'SERGIO', 'MANUEL'
        ]);

        let sellerCommission = 0;
        let guideCommission = 0;

        // Guía: solo si la agencia está en la lista; fórmula -18% * 10%. Excepción TANITOURS + MARINA = 10% directo
        const agencyNorm = agency === 'TANI TOURS' ? 'TANITOURS' : agency;
        if (agencyNorm && AGENCIES_GUIDE.has(agencyNorm)) {
            if (agencyNorm === 'TANITOURS' && guide === 'MARINA') {
                guideCommission = totalMXN * 0.10;
            } else {
                guideCommission = (totalMXN * 0.82) * 0.10;
            }
        }

        // Vendedor: SEBASTIAN 10% directo; OMAR/JUAN CARLOS -20%*7%; resto de lista -5%*9%; otro = 0
        if (seller === 'SEBASTIAN') {
            sellerCommission = totalMXN * 0.10;
        } else if (SELLERS_OMAR_JUANCARLOS.has(seller)) {
            sellerCommission = (totalMXN * 0.80) * 0.07;
        } else if (SELLERS_RESTO.has(seller)) {
            sellerCommission = (totalMXN * 0.95) * 0.09;
        }

        return { sellerCommission, guideCommission };
    },
    
    async init() {
        try {
            // Verificar permiso
            if (typeof PermissionManager !== 'undefined' && !PermissionManager.hasPermission('reports.view')) {
                const content = document.getElementById('module-content');
                if (content) {
                    content.innerHTML = '<div style="padding: var(--spacing-lg); text-align: center; color: var(--color-text-secondary);">No tienes permiso para ver reportes</div>';
                }
                return;
            }

            if (this.initialized) {
                const activeTab = document.querySelector('#reports-tabs .tab-btn.active')?.dataset.tab || 'reports';
                await this.loadTab(activeTab);
                return;
            }
            this.setupUI();
            await this.loadTab('reports');
            this.initialized = true;
        } catch (error) {
            console.error('Error inicializando módulo Reports:', error);
            const content = document.getElementById('module-content');
            if (content) {
                content.innerHTML = `<div style="padding: var(--spacing-lg); text-align: center; color: var(--color-danger);">
                    <h3>Error al cargar el módulo de Reportes</h3>
                    <p>${error.message}</p>
                    <p style="font-size: 12px; color: var(--color-text-secondary);">Por favor, recarga la página o contacta al administrador.</p>
                </div>`;
            }
            // No lanzar el error para evitar que rompa otros módulos
        }
        
            // Escuchar cambios de sucursal para recargar reportes
            window.addEventListener('branch-changed', async () => {
                try {
                    if (this.initialized) {
                        const activeTab = document.querySelector('#reports-tabs .tab-btn.active')?.dataset.tab || 'reports';
                        await this.loadTab(activeTab);
                    }
                } catch (error) {
                    console.error('Error recargando reportes por cambio de sucursal:', error);
                }
            });
        
        // Escuchar eventos para actualización en tiempo real
        if (typeof Utils !== 'undefined' && Utils.EventBus) {
            Utils.EventBus.on('sale-completed', async () => {
                if (this.initialized) {
                    const reportsModule = document.getElementById('module-reports');
                    if (reportsModule && reportsModule.style.display !== 'none') {
                        const activeTab = document.querySelector('#reports-tabs .tab-btn.active')?.dataset.tab || 'reports';
                        await this.loadTab(activeTab);
                    }
                }
            });
            
            Utils.EventBus.on('inventory-updated', async () => {
                if (this.initialized) {
                    const reportsModule = document.getElementById('module-reports');
                    if (reportsModule && reportsModule.style.display !== 'none') {
                        const activeTab = document.querySelector('#reports-tabs .tab-btn.active')?.dataset.tab || 'reports';
                        await this.loadTab(activeTab);
                    }
                }
            });
            
            Utils.EventBus.on('cost-updated', async () => {
                if (this.initialized) {
                    const reportsModule = document.getElementById('module-reports');
                    if (reportsModule && reportsModule.style.display !== 'none') {
                        const activeTab = document.querySelector('#reports-tabs .tab-btn.active')?.dataset.tab || 'reports';
                        await this.loadTab(activeTab);
                    }
                }
            });
            
            Utils.EventBus.on('repair-completed', async () => {
                if (this.initialized) {
                    const reportsModule = document.getElementById('module-reports');
                    if (reportsModule && reportsModule.style.display !== 'none') {
                        const activeTab = document.querySelector('#reports-tabs .tab-btn.active')?.dataset.tab || 'reports';
                        await this.loadTab(activeTab);
                    }
                }
            });
            
            Utils.EventBus.on('transfer-completed', async () => {
                if (this.initialized) {
                    const reportsModule = document.getElementById('module-reports');
                    if (reportsModule && reportsModule.style.display !== 'none') {
                        const activeTab = document.querySelector('#reports-tabs .tab-btn.active')?.dataset.tab || 'reports';
                        await this.loadTab(activeTab);
                    }
                }
            });
        }
    },

    setupUI() {
        const content = document.getElementById('module-content');
        if (!content) return;

        // Crear estructura de tabs
        content.innerHTML = `
            <div id="reports-tabs" class="tabs-container" style="margin-bottom: var(--spacing-lg);">
                <button class="tab-btn active" data-tab="reports"><i class="fas fa-chart-bar"></i> Reportes</button>
                <button class="tab-btn" data-tab="commissions"><i class="fas fa-percent"></i> Comisiones</button>
                <button class="tab-btn" data-tab="overview"><i class="fas fa-chart-line"></i> Resumen</button>
                <button class="tab-btn" data-tab="analysis"><i class="fas fa-brain"></i> Análisis</button>
                <button class="tab-btn" data-tab="compare"><i class="fas fa-balance-scale"></i> Comparativas</button>
                <button class="tab-btn" data-tab="saved"><i class="fas fa-bookmark"></i> Guardados</button>
                <button class="tab-btn" data-tab="history"><i class="fas fa-history"></i> Historial</button>
                <button class="tab-btn" data-tab="historical"><i class="fas fa-chart-area"></i> Históricos</button>
                <button class="tab-btn" data-tab="quick-capture" style="background: #fff3cd; color: #856404; border-color: #ffc107;">
                    <i class="fas fa-bolt"></i> Captura Rápida (Temporal)
                </button>
            </div>
            <div id="reports-content"></div>
        `;

        // Event listeners para tabs
        document.querySelectorAll('#reports-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const clickedBtn = e.target.closest('.tab-btn');
                if (!clickedBtn) return;
                
                document.querySelectorAll('#reports-tabs .tab-btn').forEach(b => b.classList.remove('active'));
                clickedBtn.classList.add('active');
                const tab = clickedBtn.dataset.tab;
                this.loadTab(tab);
            });
        });
    },

    async loadTab(tab) {
        const content = document.getElementById('reports-content');
        if (!content) {
            console.error('Reports: reports-content no encontrado');
            return;
        }

        this.currentTab = tab;

        try {
            content.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';

            switch(tab) {
                case 'reports':
                    try {
                        const reportsTabHTML = await this.getReportsTab();
                        content.innerHTML = reportsTabHTML;
                    this.setupPresetRanges();
                    await this.loadCatalogs();
                        // setupBranchFilter ya se llama dentro de loadCatalogs, pero lo llamamos de nuevo para asegurar que esté sincronizado
                        await this.setupBranchFilter('report-branch');
                        // Agregar listener para el cambio de sucursal en reportes
                        const reportBranchFilter = document.getElementById('report-branch');
                        if (reportBranchFilter) {
                            reportBranchFilter.addEventListener('change', () => {
                                // El filtro se aplicará cuando se genere el reporte
                                this.updateExportComparativeButton();
                            });
                        }
                        // Inicializar visibilidad del botón de exportación comparativa
                        this.updateExportComparativeButton();
                    } catch (tabError) {
                        console.error('Error cargando tab de reports:', tabError);
                        throw tabError;
                    }
                    break;
                case 'commissions':
                    content.innerHTML = await this.getCommissionsTab();
                    this.setupCommissionsPresetRanges();
                    await this.loadCommissionsCatalogs();
                    await this.setupBranchFilter('commissions-branch');
                    break;
                case 'overview':
                    content.innerHTML = await this.getOverviewTab();
                    await this.loadOverview();
                    break;
                case 'analysis':
                    content.innerHTML = await this.getAnalysisTab();
                    await this.loadAnalysis();
                    break;
                case 'compare':
                    content.innerHTML = await this.getCompareTab();
                    break;
                case 'saved':
                    content.innerHTML = await this.getSavedReportsTab();
                    await this.loadSavedReports();
                    break;
                case 'history':
                    content.innerHTML = await this.getHistoryTab();
                    await this.loadHistory();
                    break;
                case 'historical':
                    content.innerHTML = await this.getHistoricalTab();
                    this.setupHistoricalForm();
                    await this.loadHistoricalReports();
                    break;
                case 'quick-capture':
                    content.innerHTML = await this.getQuickCaptureTab();
                    await this.loadQuickCaptureData();
                    this.setupQuickCaptureListeners();
                    break;
                default:
                    content.innerHTML = '<p>Pestaña no encontrada</p>';
            }
        } catch (e) {
            console.error(`Error loading tab ${tab}:`, e);
            content.innerHTML = `
                <div style="padding: var(--spacing-md); background: var(--color-danger); color: white; border-radius: var(--radius-md);">
                    <strong>Error al cargar:</strong> ${e.message}
                </div>
            `;
        }
    },

    async getReportsTab() {
        try {
            // Calcular fechas por defecto
            const today = new Date();
            const thirtyDaysAgo = new Date(Date.now() - 30*24*60*60*1000);
            const dateFrom = typeof Utils !== 'undefined' && Utils.formatDate 
                ? Utils.formatDate(thirtyDaysAgo, 'YYYY-MM-DD') 
                : thirtyDaysAgo.toISOString().split('T')[0];
            const dateTo = typeof Utils !== 'undefined' && Utils.formatDate 
                ? Utils.formatDate(today, 'YYYY-MM-DD') 
                : today.toISOString().split('T')[0];
            
        return `
            <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border-light); margin-bottom: var(--spacing-lg);">
                <h3 style="margin-bottom: var(--spacing-md); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                    <i class="fas fa-filter"></i> Filtros Avanzados
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--spacing-md); width: 100%; box-sizing: border-box;">
                    <div class="form-group" style="min-width: 0;">
                        <label>Fecha Desde</label>
                        <input type="date" id="report-date-from" class="form-input" value="${dateFrom}" style="width: 100%;">
                    </div>
                    <div class="form-group" style="min-width: 0;">
                        <label>Fecha Hasta</label>
                        <input type="date" id="report-date-to" class="form-input" value="${dateTo}" style="width: 100%;">
                    </div>
                    <div class="form-group" style="min-width: 0;">
                        <label>Rango Predefinido</label>
                        <select id="report-preset-range" class="form-select" style="width: 100%;">
                            <option value="">Personalizado</option>
                            <option value="today">Hoy</option>
                            <option value="yesterday">Ayer</option>
                            <option value="week">Esta Semana</option>
                            <option value="lastweek">Semana Pasada</option>
                            <option value="month">Este Mes</option>
                            <option value="lastmonth">Mes Pasado</option>
                            <option value="quarter">Este Trimestre</option>
                            <option value="year">Este Año</option>
                        </select>
                    </div>
                    <div class="form-group" style="min-width: 0;">
                        <label>Sucursal</label>
                        <select id="report-branch" class="form-select" style="width: 100%;">
                            <option value="all">Todas las sucursales</option>
                        </select>
                    </div>
                    <div class="form-group" style="min-width: 0;">
                        <label>Vendedor</label>
                        <select id="report-seller" class="form-select" style="width: 100%;">
                            <option value="">Todos</option>
                        </select>
                    </div>
                    <div class="form-group" style="min-width: 0;">
                        <label>Agencia</label>
                        <select id="report-agency" class="form-select" style="width: 100%;">
                            <option value="">Todas</option>
                        </select>
                    </div>
                    <div class="form-group" style="min-width: 0;">
                        <label>Guía</label>
                        <select id="report-guide" class="form-select" style="width: 100%;">
                            <option value="">Todos</option>
                        </select>
                    </div>
                    <div class="form-group" style="min-width: 0;">
                        <label>Estado</label>
                        <select id="report-status" class="form-select" style="width: 100%;">
                            <option value="">Todos</option>
                            <option value="completada">Completada</option>
                            <option value="apartada">Apartada</option>
                            <option value="cancelada">Cancelada</option>
                        </select>
                    </div>
                    <div class="form-group" style="min-width: 0;">
                        <label>Monto Mínimo</label>
                        <input type="number" id="report-min-amount" class="form-input" step="0.01" placeholder="0" style="width: 100%;">
                    </div>
                    <div class="form-group" style="min-width: 0;">
                        <label>Monto Máximo</label>
                        <input type="number" id="report-max-amount" class="form-input" step="0.01" placeholder="Sin límite" style="width: 100%;">
                    </div>
                    <div class="form-group" style="min-width: 0;">
                        <label>Tipo de Análisis</label>
                        <select id="report-analysis-type" class="form-select" style="width: 100%;">
                            <option value="summary">Resumen General</option>
                            <option value="daily">Por Día</option>
                            <option value="seller">Por Vendedor</option>
                            <option value="agency">Por Agencia</option>
                            <option value="product">Por Producto</option>
                        </select>
                    </div>
                </div>
                <div style="margin-top: var(--spacing-md); display: flex; gap: var(--spacing-sm); flex-wrap: wrap; width: 100%;">
                    <button class="btn-primary btn-sm" onclick="window.Reports.generateReport()">
                        <i class="fas fa-chart-bar"></i> Generar Reporte
                    </button>
                    <button class="btn-secondary btn-sm" onclick="window.Reports.generateAdvancedAnalytics()">
                        <i class="fas fa-brain"></i> Análisis Avanzado
                    </button>
                    <button class="btn-secondary btn-sm" onclick="window.Reports.exportReport()">
                        <i class="fas fa-download"></i> Exportar
                    </button>
                    <button class="btn-secondary btn-sm" id="export-comparative-btn" onclick="window.Reports.exportComparativeReport()" style="display: none;">
                        <i class="fas fa-balance-scale"></i> Exportar Comparativo
                    </button>
                    <button class="btn-secondary btn-sm" id="save-report-btn" onclick="window.Reports.saveCurrentReport()" style="display: none;">
                        <i class="fas fa-save"></i> Guardar Reporte
                    </button>
                </div>
            </div>
            <div id="report-results" style="width: 100%; max-width: 100%; box-sizing: border-box;"></div>
        `;
        } catch (error) {
            console.error('Error en getReportsTab:', error);
            return `
                <div style="padding: var(--spacing-md); background: var(--color-danger); color: white; border-radius: var(--radius-md);">
                    <strong>Error al cargar formulario de reportes:</strong> ${error.message}
                </div>
            `;
        }
    },

    async getOverviewTab() {
        return `
            <div id="overview-banner" style="margin-bottom: var(--spacing-lg); width: 100%; max-width: 100%; box-sizing: border-box;"></div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--spacing-md); margin-bottom: var(--spacing-lg); width: 100%; max-width: 100%; box-sizing: border-box;">
                <div class="kpi-card" style="min-width: 0; width: 100%; box-sizing: border-box; position: relative;">
                    <div class="kpi-label">
                        Ventas Totales
                        <span id="overview-sales-branch-indicator" style="font-size: 10px; opacity: 0.7; margin-left: var(--spacing-xs);"></span>
                    </div>
                    <div class="kpi-value" id="overview-total-sales">$0.00</div>
                    <button id="overview-sales-breakdown-btn" class="btn-link" style="position: absolute; top: var(--spacing-xs); right: var(--spacing-xs); font-size: 10px; padding: 2px 6px; display: none;" onclick="window.Reports.showOverviewBreakdown('sales')">
                        <i class="fas fa-chart-pie"></i> Desglose
                    </button>
                </div>
                <div class="kpi-card" style="min-width: 0; width: 100%; box-sizing: border-box;">
                    <div class="kpi-label">Número de Ventas</div>
                    <div class="kpi-value" id="overview-sales-count">0</div>
                </div>
                <div class="kpi-card" style="min-width: 0; width: 100%; box-sizing: border-box;">
                    <div class="kpi-label">Ticket Promedio</div>
                    <div class="kpi-value" id="overview-avg-ticket">$0.00</div>
                </div>
                <div class="kpi-card" style="min-width: 0; width: 100%; box-sizing: border-box;">
                    <div class="kpi-label">Total Pasajeros</div>
                    <div class="kpi-value" id="overview-passengers">0</div>
                </div>
            </div>
            <div id="overview-breakdown-modal" style="display: none;"></div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: var(--spacing-md); width: 100%; max-width: 100%; box-sizing: border-box;">
                <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border-light); min-width: 0; width: 100%; box-sizing: border-box;">
                    <h3 style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: var(--spacing-sm);">
                        <i class="fas fa-chart-line"></i> Tendencia de Ventas
                    </h3>
                    <div id="sales-trend-chart" style="min-height: 300px; width: 100%; overflow: hidden;">
                        Cargando gráfico...
                    </div>
                </div>

                <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border-light); min-width: 0; width: 100%; box-sizing: border-box;">
                    <h3 style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: var(--spacing-sm);">
                        <i class="fas fa-user-tag"></i> Top Vendedores
                    </h3>
                    <div id="top-sellers-chart" style="min-height: 300px; width: 100%; overflow: hidden;">
                        Cargando gráfico...
                    </div>
                </div>

                <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border-light); min-width: 0; width: 100%; box-sizing: border-box;">
                    <h3 style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: var(--spacing-sm);">
                        <i class="fas fa-building"></i> Top Agencias
                    </h3>
                    <div id="top-agencies-chart" style="min-height: 200px; width: 100%; overflow: hidden;">
                        Cargando gráfico...
                    </div>
                </div>

                <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border-light); min-width: 0; width: 100%; box-sizing: border-box;">
                    <h3 style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: var(--spacing-sm);">
                        <i class="fas fa-box"></i> Top Productos
                    </h3>
                    <div id="top-products-chart" style="min-height: 200px; width: 100%; overflow: hidden;">
                        Cargando gráfico...
                    </div>
                </div>
            </div>
        `;
    },

    async getAnalysisTab() {
        return `
            <div class="filters-bar-compact" style="margin-bottom: var(--spacing-md); width: 100%; max-width: 100%; box-sizing: border-box; flex-wrap: wrap;">
                <div class="form-group" style="flex: 1; min-width: 200px;">
                    <label>Período de Análisis</label>
                    <select id="analysis-period" class="form-select" style="width: 100%;">
                        <option value="last3months">Últimos 3 meses</option>
                        <option value="last6months" selected>Últimos 6 meses</option>
                        <option value="last12months">Últimos 12 meses</option>
                        <option value="thisyear">Este año</option>
                    </select>
                </div>
                <div class="form-group" style="flex-shrink: 0;">
                    <label>&nbsp;</label>
                    <button class="btn-primary" onclick="window.Reports.runAdvancedAnalysis()" style="white-space: nowrap;">
                        <i class="fas fa-brain"></i> Ejecutar Análisis
                    </button>
                </div>
            </div>
            <div id="analysis-results" style="min-height: 400px; width: 100%; max-width: 100%; box-sizing: border-box; overflow-x: auto;">
                <div class="empty-state">Selecciona un período y ejecuta el análisis</div>
            </div>
        `;
    },

    async getCompareTab() {
        return `
            <div class="filters-bar-compact" style="margin-bottom: var(--spacing-md); width: 100%; max-width: 100%; box-sizing: border-box; flex-wrap: wrap;">
                <div class="form-group" style="flex: 1; min-width: 200px;">
                    <label>Período 1 - Desde</label>
                    <input type="date" id="compare-period1-from" class="form-input" style="width: 100%;">
                </div>
                <div class="form-group" style="flex: 1; min-width: 200px;">
                    <label>Período 1 - Hasta</label>
                    <input type="date" id="compare-period1-to" class="form-input" style="width: 100%;">
                </div>
                <div class="form-group" style="flex: 1; min-width: 200px;">
                    <label>Período 2 - Desde</label>
                    <input type="date" id="compare-period2-from" class="form-input" style="width: 100%;">
                </div>
                <div class="form-group" style="flex: 1; min-width: 200px;">
                    <label>Período 2 - Hasta</label>
                    <input type="date" id="compare-period2-to" class="form-input" style="width: 100%;">
                </div>
                <div class="form-group" style="flex-shrink: 0;">
                    <label>&nbsp;</label>
                    <button class="btn-primary" onclick="window.Reports.comparePeriods()" style="white-space: nowrap;">
                        <i class="fas fa-balance-scale"></i> Comparar
                    </button>
                </div>
            </div>
            <div id="compare-results" style="min-height: 400px; width: 100%; max-width: 100%; box-sizing: border-box;">
                <div class="empty-state">Selecciona los períodos y ejecuta la comparación</div>
            </div>
        `;
    },

    async getSavedReportsTab() {
        return `
            <div class="filters-bar-compact" style="margin-bottom: var(--spacing-md); width: 100%; max-width: 100%; box-sizing: border-box; flex-wrap: wrap;">
                <div class="form-group" style="flex: 1; min-width: 200px;">
                    <input type="text" id="saved-reports-search" class="form-input" placeholder="Buscar reporte guardado..." style="width: 100%;">
                </div>
                <div class="form-group" style="width: 150px; min-width: 120px;">
                    <select id="saved-reports-type-filter" class="form-select" style="width: 100%;">
                        <option value="">Todos los tipos</option>
                        <option value="summary">Resumen General</option>
                        <option value="daily">Por Día</option>
                        <option value="seller">Por Vendedor</option>
                        <option value="agency">Por Agencia</option>
                        <option value="product">Por Producto</option>
                        <option value="comparative">Comparativo</option>
                    </select>
                </div>
                <button class="btn-secondary btn-sm" onclick="window.Reports.loadSavedReports()" style="white-space: nowrap; flex-shrink: 0;">
                    <i class="fas fa-sync"></i> Actualizar
                </button>
            </div>
            <div id="saved-reports-list" style="width: 100%; max-width: 100%; box-sizing: border-box;">
                <div class="empty-state">Cargando reportes guardados...</div>
            </div>
        `;
    },

    async getHistoryTab() {
        return `
            <div class="filters-bar-compact" style="margin-bottom: var(--spacing-md); width: 100%; max-width: 100%; box-sizing: border-box; flex-wrap: wrap;">
                <div class="form-group" style="flex: 1; min-width: 200px;">
                    <input type="text" id="history-search" class="form-input" placeholder="Buscar por folio, vendedor..." style="width: 100%;">
                </div>
                <div class="form-group" style="width: 150px; min-width: 120px;">
                    <select id="history-status-filter" class="form-select" style="width: 100%;">
                        <option value="">Todos</option>
                        <option value="completada">Completada</option>
                        <option value="apartada">Apartada</option>
                        <option value="cancelada">Cancelada</option>
                    </select>
                </div>
                <div class="form-group" style="width: 150px; min-width: 120px;">
                    <input type="date" id="history-date-from" class="form-input" placeholder="Desde" style="width: 100%;">
                </div>
                <div class="form-group" style="width: 150px; min-width: 120px;">
                    <input type="date" id="history-date-to" class="form-input" placeholder="Hasta" style="width: 100%;">
                </div>
                <button class="btn-secondary btn-sm" id="history-export" style="white-space: nowrap; flex-shrink: 0;"><i class="fas fa-download"></i> Exportar</button>
            </div>
            <div id="history-list" style="max-height: 600px; overflow-y: auto; width: 100%; overflow-x: auto;">
                <div class="empty-state">Cargando historial...</div>
            </div>
        `;
    },

    async getCommissionsTab() {
        return `
            <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border-light); margin-bottom: var(--spacing-lg);">
                <h3 style="margin-bottom: var(--spacing-md); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                    <i class="fas fa-filter"></i> Filtros de Comisiones
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--spacing-md); width: 100%; box-sizing: border-box;">
                    <div class="form-group" style="min-width: 0;">
                        <label>Fecha Desde</label>
                        <input type="date" id="commissions-date-from" class="form-input" value="${Utils.formatDate(new Date(Date.now() - 30*24*60*60*1000), 'YYYY-MM-DD')}" style="width: 100%;">
                    </div>
                    <div class="form-group" style="min-width: 0;">
                        <label>Fecha Hasta</label>
                        <input type="date" id="commissions-date-to" class="form-input" value="${Utils.formatDate(new Date(), 'YYYY-MM-DD')}" style="width: 100%;">
                    </div>
                    <div class="form-group" style="min-width: 0;">
                        <label>Rango Predefinido</label>
                        <select id="commissions-preset-range" class="form-select" style="width: 100%;">
                            <option value="">Personalizado</option>
                            <option value="today">Hoy</option>
                            <option value="yesterday">Ayer</option>
                            <option value="week">Esta Semana</option>
                            <option value="lastweek">Semana Pasada</option>
                            <option value="month">Este Mes</option>
                            <option value="lastmonth">Mes Pasado</option>
                            <option value="quarter">Este Trimestre</option>
                            <option value="year">Este Año</option>
                        </select>
                    </div>
                    <div class="form-group" style="min-width: 0;">
                        <label>Sucursal</label>
                        <select id="commissions-branch" class="form-select" style="width: 100%;">
                            <option value="all">Todas las sucursales</option>
                        </select>
                    </div>
                    <div class="form-group" style="min-width: 0;">
                        <label>Vendedor</label>
                        <select id="commissions-seller" class="form-select" style="width: 100%;">
                            <option value="">Todos</option>
                        </select>
                    </div>
                    <div class="form-group" style="min-width: 0;">
                        <label>Guía</label>
                        <select id="commissions-guide" class="form-select" style="width: 100%;">
                            <option value="">Todos</option>
                        </select>
                    </div>
                </div>
                <div style="margin-top: var(--spacing-md); display: flex; gap: var(--spacing-sm); flex-wrap: wrap;">
                    <button class="btn-primary btn-sm" onclick="window.Reports.generateCommissionsReport()">
                        <i class="fas fa-chart-bar"></i> Generar Reporte de Comisiones
                    </button>
                    <button class="btn-secondary btn-sm" onclick="window.Reports.exportCommissionsReport()">
                        <i class="fas fa-file-excel"></i> Exportar Excel
                    </button>
                    <button class="btn-secondary btn-sm" onclick="window.Reports.exportCommissionsPDF()">
                        <i class="fas fa-file-pdf"></i> Exportar PDF
                    </button>
                </div>
            </div>
            <div id="commissions-results" style="width: 100%; max-width: 100%; box-sizing: border-box;"></div>
        `;
    },

    async loadOverview() {
        await this.renderOverviewStats();
        await this.renderSalesTrend();
        await this.renderTopSellers();
        await this.renderTopAgencies();
        await this.renderTopProducts();
    },

    // Helper para generar banner de contexto multisucursal
    async getBranchContextBanner(branchId = null, dateFrom = null, dateTo = null) {
        const isMasterAdmin = typeof UserManager !== 'undefined' && (
            UserManager.currentUser?.role === 'master_admin' ||
            UserManager.currentUser?.is_master_admin ||
            UserManager.currentUser?.isMasterAdmin ||
            UserManager.currentEmployee?.role === 'master_admin'
        );
        
        // Obtener sucursales desde DB
        const branches = await DB.getAll('catalog_branches') || [];
        const currentBranchId = typeof BranchManager !== 'undefined' 
            ? BranchManager.getCurrentBranchId() 
            : null;
        
        // Determinar qué sucursal(es) se están analizando
        let selectedBranch = null;
        let branchName = '';
        
        if (branchId && branchId !== 'all' && branchId !== '') {
            selectedBranch = branches.find(b => b.id === branchId);
            branchName = selectedBranch?.name || 'Sucursal Desconocida';
        } else if (!branchId && isMasterAdmin) {
            branchName = 'Todas las Sucursales';
        } else {
            selectedBranch = branches.find(b => b.id === currentBranchId);
            branchName = selectedBranch?.name || 'Sucursal Actual';
        }
        
        const dateStr = dateFrom && dateTo 
            ? `${Utils.formatDate(dateFrom, 'DD/MM/YYYY')} - ${Utils.formatDate(dateTo, 'DD/MM/YYYY')}`
            : dateFrom 
                ? `Desde ${Utils.formatDate(dateFrom, 'DD/MM/YYYY')}`
                : 'Período completo';
        
        return `
            <div style="background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%); 
                color: white; padding: var(--spacing-md); border-radius: var(--radius-md); 
                margin-bottom: var(--spacing-lg); display: flex; align-items: center; gap: var(--spacing-md);
                flex-wrap: wrap; width: 100%; box-sizing: border-box;">
                <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 12px; opacity: 0.9; margin-bottom: var(--spacing-xs); 
                        text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500;">
                        <i class="fas fa-building"></i> Contexto del Reporte
                    </div>
                    <div style="font-size: 16px; font-weight: 700; margin-bottom: var(--spacing-xs);">
                        ${branchName}
                    </div>
                    <div style="font-size: 11px; opacity: 0.85;">
                        <i class="fas fa-calendar-alt"></i> ${dateStr}
                    </div>
                </div>
                ${isMasterAdmin && (!branchId || branchId === 'all') ? `
                    <div style="background: rgba(255, 255, 255, 0.2); padding: var(--spacing-xs) var(--spacing-sm); 
                        border-radius: var(--radius-sm); font-size: 11px; white-space: nowrap;">
                        <i class="fas fa-eye"></i> Vista Consolidada
                    </div>
                ` : ''}
            </div>
        `;
    },

    // Helper para obtener ventas filtradas por sucursal
    async getFilteredSales(options = {}) {
        const {
            branchId = null,
            dateFrom = null,
            dateTo = null,
            status = null
        } = options;

        // Verificar si es master_admin
        const isMasterAdmin = typeof UserManager !== 'undefined' && (
            UserManager.currentUser?.role === 'master_admin' ||
            UserManager.currentUser?.is_master_admin ||
            UserManager.currentUser?.isMasterAdmin ||
            UserManager.currentEmployee?.role === 'master_admin'
        );
        
        // Si es master_admin y NO hay branchId seleccionado, puede ver todas las sucursales
        // Si hay branchId seleccionado, siempre filtrar por esa sucursal específica
        const viewAllBranches = !branchId && isMasterAdmin;
        
        console.log(`[Reports] Vista consolidada: ${viewAllBranches} (Admin: ${isMasterAdmin}, BranchId: ${branchId || 'Todas'})`);
        
        const normalizeStatus = (value) => {
            const statusValue = String(value || '').toLowerCase();
            if (!statusValue) return null;
            if (statusValue === 'completada' || statusValue === 'completado') return 'completed';
            return statusValue;
        };

        let sales = [];

        // Fuente primaria: API para evitar datos incompletos por desincronización local.
        const hasApi = typeof API !== 'undefined' && API.baseURL && API.token && API.getSales;
        if (hasApi) {
            try {
                const apiFilters = {
                    branch_id: branchId || null,
                    start_date: dateFrom || null,
                    end_date: dateTo ? `${dateTo}T23:59:59` : null,
                    status: normalizeStatus(status)
                };
                const apiSales = await API.getSales(apiFilters);
                if (Array.isArray(apiSales)) {
                    sales = apiSales;
                    for (const sale of apiSales) {
                        try { await DB.put('sales', sale); } catch (e) {}
                    }
                }
            } catch (apiError) {
                console.warn('[Reports] API sales fallback a IndexedDB:', apiError?.message || apiError);
            }
        }

        // Fallback a IndexedDB.
        if (!Array.isArray(sales) || sales.length === 0) {
            if (branchId || (!branchId && !isMasterAdmin)) {
                sales = await DB.getAll('sales', null, null, {
                    filterByBranch: false,
                    branchIdField: 'branch_id'
                }) || [];

                const normalizedBranchId = branchId ? String(branchId) : null;
                if (normalizedBranchId) {
                    const beforeFilter = sales.length;
                    sales = sales.filter(s => s.branch_id && String(s.branch_id) === normalizedBranchId);
                    console.log(`📍 [Reports] Filtrado de ventas por sucursal: ${beforeFilter} → ${sales.length} (sucursal: ${normalizedBranchId})`);
                } else if (!isMasterAdmin) {
                    const currentBranchId = typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : null;
                    if (currentBranchId) {
                        const normalizedCurrent = String(currentBranchId);
                        const beforeFilter = sales.length;
                        sales = sales.filter(s => s.branch_id && String(s.branch_id) === normalizedCurrent);
                        console.log(`📍 [Reports] Filtrado de ventas por sucursal (usuario normal): ${beforeFilter} → ${sales.length} (sucursal: ${normalizedCurrent})`);
                    } else {
                        sales = [];
                    }
                }
            } else {
                sales = await DB.getAll('sales', null, null, {
                    filterByBranch: false,
                    branchIdField: 'branch_id'
                }) || [];
            }
        }

        const parseDateMs = (value) => {
            if (!value) return NaN;
            const parsed = new Date(value).getTime();
            return Number.isFinite(parsed) ? parsed : NaN;
        };
        const fromMs = dateFrom ? parseDateMs(`${dateFrom}T00:00:00`) : null;
        const toMs = dateTo ? parseDateMs(`${dateTo}T23:59:59`) : null;

        if (fromMs) {
            sales = sales.filter(s => {
                const saleMs = parseDateMs(s.created_at);
                return Number.isFinite(saleMs) && saleMs >= fromMs;
            });
        }
        if (toMs) {
            sales = sales.filter(s => {
                const saleMs = parseDateMs(s.created_at);
                return Number.isFinite(saleMs) && saleMs <= toMs;
            });
        }
        if (status) {
            const normalizedStatus = normalizeStatus(status);
            sales = sales.filter(s => String(s.status || '').toLowerCase() === normalizedStatus);
        }

        return sales;
    },

    async renderOverviewStats() {
        // Verificar si es master_admin
        const isMasterAdmin = typeof UserManager !== 'undefined' && (
            UserManager.currentUser?.role === 'master_admin' ||
            UserManager.currentUser?.is_master_admin ||
            UserManager.currentUser?.isMasterAdmin ||
            UserManager.currentEmployee?.role === 'master_admin'
        );
        
        // Obtener sucursal actual
        const currentBranchId = typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : null;
        
        // Obtener filtro de sucursal del dropdown (puede no existir en la vista Overview)
        const branchFilterEl = document.getElementById('report-branch');
        const branchFilterValue = branchFilterEl?.value;
        
        // Determinar qué branch_id usar para el filtro
        let filterBranchId = null;
        if (branchFilterValue && branchFilterValue !== 'all' && branchFilterValue !== '') {
            // Hay un filtro específico seleccionado en el dropdown
            filterBranchId = branchFilterValue;
        } else if (isMasterAdmin && (!branchFilterValue || branchFilterValue === 'all')) {
            // Master admin sin filtro específico = mostrar todas las sucursales
            filterBranchId = null;
        } else {
            // Usuario normal o master_admin con sucursal actual = filtrar por currentBranchId
            filterBranchId = currentBranchId;
        }
        
        const sales = await this.getFilteredSales({ 
            branchId: filterBranchId 
        });
        const completedSales = sales.filter(s => (typeof Utils !== 'undefined' && Utils.isSaleCompleted ? Utils.isSaleCompleted(s) : (s.status === 'completada' || s.status === 'completed')));
        
        const totalSales = completedSales.reduce((sum, s) => sum + (s.total || 0), 0);
        const totalPassengers = completedSales.reduce((sum, s) => sum + (parseInt(s.passengers) || 0), 0);
        const avgTicket = totalPassengers > 0 ? totalSales / totalPassengers : 0;

        // Obtener costos del mes actual
        let totalCosts = 0;
        if (typeof Costs !== 'undefined') {
            const today = new Date();
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            
            const monthCosts = await Costs.getFilteredCosts({
                branchId: filterBranchId,
                dateFrom: Utils.formatDate(monthStart, 'YYYY-MM-DD'),
                dateTo: Utils.formatDate(monthEnd, 'YYYY-MM-DD')
            });
            
            totalCosts = monthCosts.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
        }

        const branches = await DB.getAll('catalog_branches') || [];
        const branchesInSales = new Set(completedSales.map(s => s.branch_id).filter(Boolean));
        const showBreakdown = isMasterAdmin && branchesInSales.size > 1 && (!filterBranchId || filterBranchId === 'all');
        
        // Actualizar banner de contexto
        const overviewBanner = document.getElementById('overview-banner');
        if (overviewBanner) {
            const branchFilterEl = document.getElementById('report-branch');
            const dateFrom = null; // Overview no tiene filtro de fecha específico
            const dateTo = null;
            const branchFilterValue = branchFilterEl?.value || '';
            let branchIdForBanner = null;
            if (branchFilterValue && branchFilterValue !== 'all' && branchFilterValue !== '') {
                branchIdForBanner = branchFilterValue;
            } else if (isMasterAdmin && (!branchFilterValue || branchFilterValue === 'all')) {
                branchIdForBanner = null;
            } else {
                branchIdForBanner = currentBranchId;
            }
            overviewBanner.innerHTML = await this.getBranchContextBanner(branchIdForBanner, dateFrom, dateTo);
        }
        
        // Actualizar indicador de sucursal en KPI
        const branchIndicator = document.getElementById('overview-sales-branch-indicator');
        if (branchIndicator) {
            if (showBreakdown) {
                branchIndicator.textContent = `(${branchesInSales.size} sucursales)`;
                branchIndicator.style.color = 'var(--color-primary)';
                const breakdownBtn = document.getElementById('overview-sales-breakdown-btn');
                if (breakdownBtn) breakdownBtn.style.display = 'block';
            } else {
                const branch = branches.find(b => b.id === filterBranchId);
                branchIndicator.textContent = branch ? `(${branch.name})` : '';
                const breakdownBtn = document.getElementById('overview-sales-breakdown-btn');
                if (breakdownBtn) breakdownBtn.style.display = 'none';
            }
        }
        
        // Guardar datos de desglose
        if (showBreakdown) {
            const branchBreakdown = {};
            completedSales.forEach(sale => {
                const branchId = sale.branch_id || 'sin_sucursal';
                if (!branchBreakdown[branchId]) {
                    branchBreakdown[branchId] = {
                        sales: 0,
                        total: 0,
                        passengers: 0
                    };
                }
                branchBreakdown[branchId].sales += 1;
                branchBreakdown[branchId].total += sale.total || 0;
                branchBreakdown[branchId].passengers += sale.passengers || 1;
            });
            window._overviewBranchBreakdown = branchBreakdown;
        }

        document.getElementById('overview-total-sales').textContent = Utils.formatCurrency(totalSales);
        document.getElementById('overview-sales-count').textContent = completedSales.length;
        document.getElementById('overview-avg-ticket').textContent = Utils.formatCurrency(avgTicket);
        document.getElementById('overview-passengers').textContent = totalPassengers;
        
        // Agregar KPIs de costos si existen
        const overviewContainer = document.querySelector('#reports-content');
        if (overviewContainer && typeof Costs !== 'undefined') {
            let costsKPI = document.getElementById('overview-total-costs');
            if (!costsKPI) {
                const kpiContainer = overviewContainer.querySelector('.kpi-card:last-of-type')?.parentElement;
                if (kpiContainer) {
                    kpiContainer.innerHTML += `
                        <div class="kpi-card" style="min-width: 0; width: 100%; box-sizing: border-box;" id="overview-costs-kpi">
                            <div class="kpi-label">Costos del Mes</div>
                            <div class="kpi-value" style="color: var(--color-danger);" id="overview-total-costs">${Utils.formatCurrency(totalCosts)}</div>
                        </div>
                    `;
                }
            } else {
                costsKPI.textContent = Utils.formatCurrency(totalCosts);
            }
        }
    },
    
    showOverviewBreakdown(type) {
        if (!window._overviewBranchBreakdown) {
            Utils.showNotification('No hay datos de desglose disponibles', 'warning');
            return;
        }
        
        const branches = typeof BranchManager !== 'undefined' 
            ? BranchManager.getAllBranches() 
            : [];
        
        const breakdown = Object.entries(window._overviewBranchBreakdown)
            .map(([branchId, stats]) => {
                const branch = branches.find(b => b.id === branchId);
                return {
                    branchId,
                    branchName: branch?.name || 'Sin Sucursal',
                    ...stats,
                    avgTicket: stats.passengers > 0 ? stats.total / stats.passengers : 0
                };
            })
            .sort((a, b) => b.total - a.total);
        
        const total = breakdown.reduce((sum, b) => sum + b.total, 0);
        
        const modalContent = `
            <div style="padding: var(--spacing-md); width: 100%; max-width: 600px; box-sizing: border-box;">
                <h3 style="margin-bottom: var(--spacing-md); font-size: 14px; font-weight: 600;">
                    <i class="fas fa-chart-pie"></i> Desglose por Sucursal
                </h3>
                <div style="overflow-x: auto;">
                    <table class="cart-table" style="width: 100%; font-size: 12px;">
                        <thead>
                            <tr>
                                <th>Sucursal</th>
                                <th style="text-align: right;">Ventas</th>
                                <th style="text-align: right;">Total</th>
                                <th style="text-align: right;">%</th>
                                <th style="text-align: right;">Ticket Promedio</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${breakdown.map(branch => {
                                const percentage = total > 0 ? (branch.total / total * 100) : 0;
                                return `
                                    <tr>
                                        <td><strong>${branch.branchName}</strong></td>
                                        <td style="text-align: right;">${branch.sales}</td>
                                        <td style="text-align: right; font-weight: 600;">${Utils.formatCurrency(branch.total)}</td>
                                        <td style="text-align: right;">${percentage.toFixed(1)}%</td>
                                        <td style="text-align: right;">${Utils.formatCurrency(branch.avgTicket)}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                        <tfoot>
                            <tr style="border-top: 2px solid var(--color-border); font-weight: 700;">
                                <td>TOTAL</td>
                                <td style="text-align: right;">${breakdown.reduce((sum, b) => sum + b.sales, 0)}</td>
                                <td style="text-align: right;">${Utils.formatCurrency(total)}</td>
                                <td style="text-align: right;">100%</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        `;
        
        if (typeof UI !== 'undefined' && UI.showModal) {
            UI.showModal('Desglose por Sucursal', modalContent, [
                { text: 'Cerrar', class: 'btn-primary', onclick: () => UI.closeModal() }
            ]);
        } else {
            alert('Desglose por Sucursal\n\n' + breakdown.map(b => 
                `${b.branchName}: ${Utils.formatCurrency(b.total)} (${b.sales} ventas)`
            ).join('\n'));
        }
    },

    async renderSalesTrend() {
        const container = document.getElementById('sales-trend-chart');
        if (!container) return;

        // Obtener sucursal actual
        const currentBranchId = typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : null;
        
        // Obtener filtro de sucursal del dropdown (puede no existir en la vista Overview)
        const branchFilterEl = document.getElementById('report-branch');
        const branchFilterValue = branchFilterEl?.value;
        
        // Verificar si es master_admin
        const isMasterAdmin = typeof UserManager !== 'undefined' && (
            UserManager.currentUser?.role === 'master_admin' ||
            UserManager.currentUser?.is_master_admin ||
            UserManager.currentUser?.isMasterAdmin ||
            UserManager.currentEmployee?.role === 'master_admin'
        );
        
        // Determinar qué branch_id usar para el filtro
        let filterBranchId = null;
        if (branchFilterValue && branchFilterValue !== 'all' && branchFilterValue !== '') {
            // Hay un filtro específico seleccionado en el dropdown
            filterBranchId = branchFilterValue;
        } else if (isMasterAdmin && (!branchFilterValue || branchFilterValue === 'all')) {
            // Master admin sin filtro específico = mostrar todas las sucursales
            filterBranchId = null;
        } else {
            // Usuario normal o master_admin con sucursal actual = filtrar por currentBranchId
            filterBranchId = currentBranchId;
        }
        
        const sales = await this.getFilteredSales({ 
            branchId: filterBranchId 
        });
        const completedSales = sales.filter(s => (typeof Utils !== 'undefined' && Utils.isSaleCompleted ? Utils.isSaleCompleted(s) : (s.status === 'completada' || s.status === 'completed')));
        
        const last30Days = completedSales
            .filter(s => {
                const saleDate = new Date(s.created_at);
                const daysAgo = (Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24);
                return daysAgo <= 30;
            })
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        const dailyTotals = {};
        last30Days.forEach(sale => {
            const date = sale.created_at.split('T')[0];
            if (!dailyTotals[date]) {
                dailyTotals[date] = 0;
            }
            dailyTotals[date] += sale.total || 0;
        });

        const dates = Object.keys(dailyTotals).sort();
        const maxValue = Math.max(...Object.values(dailyTotals), 1);
        
        // Obtener sucursales para agrupación
        const branches = await DB.getAll('catalog_branches') || [];
        const branchesInSales = new Set(completedSales.map(s => s.branch_id).filter(Boolean));
        const showBranchSeries = isMasterAdmin && branchesInSales.size > 1 && (!filterBranchId || filterBranchId === 'all');
        
        // Agrupar por sucursal y fecha
        const branchDailyTotals = {};
        if (showBranchSeries) {
            last30Days.forEach(sale => {
                const branchId = sale.branch_id || 'sin_sucursal';
                const date = sale.created_at.split('T')[0];
                
                if (!branchDailyTotals[branchId]) {
                    branchDailyTotals[branchId] = {};
                }
                if (!branchDailyTotals[branchId][date]) {
                    branchDailyTotals[branchId][date] = 0;
                }
                branchDailyTotals[branchId][date] += sale.total || 0;
            });
        }
        
        // Colores para diferentes sucursales
        const branchColors = [
            'var(--color-primary)',
            'var(--color-success)',
            'var(--color-warning)',
            'var(--color-danger)',
            '#9b59b6',
            '#3498db',
            '#e74c3c',
            '#f39c12'
        ];
        
        const branchColorMap = {};
        if (showBranchSeries) {
            let colorIndex = 0;
            Object.keys(branchDailyTotals).forEach(branchId => {
                branchColorMap[branchId] = branchColors[colorIndex % branchColors.length];
                colorIndex++;
            });
        }

        if (dates.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary);">No hay datos</p>';
            return;
        }

        // Generar leyenda si hay múltiples sucursales
        let legendHTML = '';
        if (showBranchSeries && Object.keys(branchDailyTotals).length > 1) {
            legendHTML = `
                <div style="display: flex; flex-wrap: wrap; gap: var(--spacing-sm); margin-bottom: var(--spacing-md); padding: var(--spacing-sm); 
                    background: var(--color-bg-secondary); border-radius: var(--radius-sm); font-size: 11px;">
                    ${Object.entries(branchDailyTotals).map(([branchId, _]) => {
                        const branch = branches.find(b => b.id === branchId);
                        const color = branchColorMap[branchId] || 'var(--color-text-secondary)';
                        return `
                            <div style="display: flex; align-items: center; gap: var(--spacing-xs);">
                                <div style="width: 12px; height: 12px; background: ${color}; border-radius: 2px;"></div>
                                <span>${branch?.name || 'Sin Sucursal'}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        container.innerHTML = legendHTML + `
            <div style="display: flex; align-items: flex-end; gap: 4px; height: 250px; width: 100%; min-width: 0; overflow-x: auto; position: relative;">
                ${dates.map(date => {
                    if (showBranchSeries && Object.keys(branchDailyTotals).length > 1) {
                        // Gráfico apilado por sucursal
                        const branchValues = Object.entries(branchDailyTotals).map(([branchId, totals]) => ({
                            branchId,
                            value: totals[date] || 0
                        })).filter(b => b.value > 0);
                        
                        const totalValue = branchValues.reduce((sum, b) => sum + b.value, 0);
                        const totalHeight = maxValue > 0 ? (totalValue / maxValue) * 100 : 0;
                        
                        let accumulatedHeight = 0;
                        
                        return `
                            <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 0; flex-shrink: 0;">
                                <div style="flex: 1; display: flex; flex-direction: column-reverse; align-items: stretch; justify-content: flex-end; width: 100%; min-width: 0; position: relative;">
                                    ${branchValues.map(b => {
                                        const height = maxValue > 0 ? (b.value / maxValue) * 100 : 0;
                                        const color = branchColorMap[b.branchId] || 'var(--color-primary)';
                                        const marginBottom = accumulatedHeight;
                                        accumulatedHeight += height;
                                        
                                        return `
                                            <div style="width: 100%; background: ${color}; 
                                                border-radius: ${marginBottom === 0 ? 'var(--radius-xs) var(--radius-xs)' : '0'} ${accumulatedHeight === totalHeight ? '0 0' : 'var(--radius-xs) var(--radius-xs)'} ${accumulatedHeight === totalHeight ? 'var(--radius-xs) var(--radius-xs)' : '0 0'}; 
                                                height: ${height}%; 
                                                min-height: ${b.value > 0 ? '2px' : '0'};"
                                                title="${branches.find(br => br.id === b.branchId)?.name || 'Sin Sucursal'}: ${Utils.formatCurrency(b.value)}">
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                                <div style="font-size: 9px; color: var(--color-text-secondary); text-align: center; white-space: nowrap;">
                                    <div>${Utils.formatDate(date, 'DD/MM')}</div>
                                    <div style="font-weight: 600; color: var(--color-text); margin-top: 2px; font-size: 10px;">${Utils.formatCurrency(totalValue)}</div>
                                </div>
                            </div>
                        `;
                    } else {
                        // Gráfico simple (una sola línea)
                    const value = dailyTotals[date];
                        const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
                    return `
                        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 0; flex-shrink: 0;">
                            <div style="flex: 1; display: flex; align-items: flex-end; width: 100%; min-width: 0;">
                                <div style="width: 100%; background: var(--gradient-accent); 
                                    border-radius: var(--radius-xs) var(--radius-xs) 0 0; 
                                    height: ${height}%; 
                                    min-height: ${value > 0 ? '3px' : '0'};"></div>
                            </div>
                            <div style="font-size: 9px; color: var(--color-text-secondary); text-align: center; white-space: nowrap;">
                                <div>${Utils.formatDate(date, 'DD/MM')}</div>
                                <div style="font-weight: 600; color: var(--color-text); margin-top: 2px; font-size: 10px;">${Utils.formatCurrency(value)}</div>
                            </div>
                        </div>
                    `;
                    }
                }).join('')}
            </div>
        `;
    },

    async renderTopSellers() {
        const container = document.getElementById('top-sellers-chart');
        if (!container) return;

        // Verificar si es master_admin
        const isMasterAdmin = typeof UserManager !== 'undefined' && (
            UserManager.currentUser?.role === 'master_admin' ||
            UserManager.currentUser?.is_master_admin ||
            UserManager.currentUser?.isMasterAdmin ||
            UserManager.currentEmployee?.role === 'master_admin'
        );
        
        // Obtener sucursal actual
        const currentBranchId = typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : null;
        
        // Para master_admin sin filtro, mostrar todas las sucursales
        const filterBranchId = isMasterAdmin ? null : currentBranchId;
        
        const sales = await this.getFilteredSales({ 
            branchId: filterBranchId 
        });
        const completedSales = sales.filter(s => (typeof Utils !== 'undefined' && Utils.isSaleCompleted ? Utils.isSaleCompleted(s) : (s.status === 'completada' || s.status === 'completed')));
        const sellers = await DB.getAll('catalog_sellers') || [];
        
        const sellerStats = {};
        completedSales.forEach(sale => {
            if (sale.seller_id) {
                if (!sellerStats[sale.seller_id]) {
                    sellerStats[sale.seller_id] = { total: 0, count: 0 };
                }
                sellerStats[sale.seller_id].total += sale.total || 0;
                sellerStats[sale.seller_id].count += 1;
            }
        });

        const sellerData = Object.entries(sellerStats)
            .map(([id, stats]) => ({
                name: sellers.find(s => s.id === id)?.name || 'N/A',
                ...stats
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        const maxTotal = Math.max(...sellerData.map(s => s.total), 1);

        if (sellerData.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary);">No hay datos</p>';
            return;
        }

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: var(--spacing-sm); width: 100%; min-width: 0;">
                ${sellerData.map(seller => {
                    const percentage = (seller.total / maxTotal) * 100;
                    return `
                        <div style="min-width: 0; width: 100%;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: var(--spacing-xs); font-size: 11px; min-width: 0;">
                                <span style="min-width: 0; overflow: hidden; text-overflow: ellipsis;"><strong>${seller.name}</strong></span>
                                <span style="font-weight: 600; white-space: nowrap; margin-left: var(--spacing-xs);">${Utils.formatCurrency(seller.total)}</span>
                            </div>
                            <div style="height: 8px; background: var(--color-bg-secondary); border-radius: 4px; overflow: hidden; width: 100%;">
                                <div style="height: 100%; width: ${percentage}%; background: var(--gradient-accent); transition: width 0.3s;"></div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    },

    async renderTopAgencies() {
        const container = document.getElementById('top-agencies-chart');
        if (!container) return;

        // Verificar si es master_admin
        const isMasterAdmin = typeof UserManager !== 'undefined' && (
            UserManager.currentUser?.role === 'master_admin' ||
            UserManager.currentUser?.is_master_admin ||
            UserManager.currentUser?.isMasterAdmin ||
            UserManager.currentEmployee?.role === 'master_admin'
        );
        
        // Obtener sucursal actual
        const currentBranchId = typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : null;
        
        // Obtener filtro de sucursal del dropdown (puede no existir en la vista Overview)
        const branchFilterEl = document.getElementById('report-branch');
        const branchFilterValue = branchFilterEl?.value;
        
        // Determinar qué branch_id usar para el filtro
        let filterBranchId = null;
        if (branchFilterValue && branchFilterValue !== 'all' && branchFilterValue !== '') {
            // Hay un filtro específico seleccionado en el dropdown
            filterBranchId = branchFilterValue;
        } else if (isMasterAdmin && (!branchFilterValue || branchFilterValue === 'all')) {
            // Master admin sin filtro específico = mostrar todas las sucursales
            filterBranchId = null;
        } else {
            // Usuario normal o master_admin con sucursal actual = filtrar por currentBranchId
            filterBranchId = currentBranchId;
        }
        
        const sales = await this.getFilteredSales({ 
            branchId: filterBranchId 
        });
        const completedSales = sales.filter(s => (typeof Utils !== 'undefined' && Utils.isSaleCompleted ? Utils.isSaleCompleted(s) : (s.status === 'completada' || s.status === 'completed')));
        const agencies = await DB.getAll('catalog_agencies') || [];
        
        const agencyStats = {};
        completedSales.forEach(sale => {
            if (sale.agency_id) {
                if (!agencyStats[sale.agency_id]) {
                    agencyStats[sale.agency_id] = { total: 0, count: 0 };
                }
                agencyStats[sale.agency_id].total += sale.total || 0;
                agencyStats[sale.agency_id].count += 1;
            }
        });

        const agencyData = Object.entries(agencyStats)
            .map(([id, stats]) => ({
                name: agencies.find(a => a.id === id)?.name || 'N/A',
                ...stats
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        const maxTotal = Math.max(...agencyData.map(a => a.total), 1);

        if (agencyData.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary);">No hay datos</p>';
            return;
        }

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: var(--spacing-xs); width: 100%; min-width: 0;">
                ${agencyData.map(agency => {
                    const percentage = (agency.total / maxTotal) * 100;
                    return `
                        <div style="min-width: 0; width: 100%;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 11px; min-width: 0;">
                                <span style="min-width: 0; overflow: hidden; text-overflow: ellipsis;">${agency.name}</span>
                                <span style="font-weight: 600; white-space: nowrap; margin-left: var(--spacing-xs);">${Utils.formatCurrency(agency.total)}</span>
                            </div>
                            <div style="height: 6px; background: var(--color-bg-secondary); border-radius: 3px; overflow: hidden; width: 100%;">
                                <div style="height: 100%; width: ${percentage}%; background: var(--gradient-accent); transition: width 0.3s;"></div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    },

    async renderTopProducts() {
        const container = document.getElementById('top-products-chart');
        if (!container) return;

        // Verificar si es master_admin
        const isMasterAdmin = typeof UserManager !== 'undefined' && (
            UserManager.currentUser?.role === 'master_admin' ||
            UserManager.currentUser?.is_master_admin ||
            UserManager.currentUser?.isMasterAdmin ||
            UserManager.currentEmployee?.role === 'master_admin'
        );
        
        // Obtener sucursal actual
        const currentBranchId = typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : null;
        
        // Para master_admin sin filtro, mostrar todas las sucursales
        const filterBranchId = isMasterAdmin ? null : currentBranchId;
        
        const sales = await this.getFilteredSales({ 
            branchId: filterBranchId 
        });
        const completedSales = sales.filter(s => (typeof Utils !== 'undefined' && Utils.isSaleCompleted ? Utils.isSaleCompleted(s) : (s.status === 'completada' || s.status === 'completed')));
        const saleItems = await DB.getAll('sale_items') || [];
        
        // Filtrar items por sucursal si es necesario
        const viewAllBranches = !filterBranchId && isMasterAdmin;
        
        let items = await DB.getAll('inventory_items', null, null, { 
            filterByBranch: !viewAllBranches, 
            branchIdField: 'branch_id' 
        }) || [];
        
        // Si hay sucursal específica, filtrar también los items manualmente
        if (filterBranchId && !viewAllBranches) {
            const normalizedBranchId = String(filterBranchId);
            items = items.filter(i => {
                const itemBranchId = i.branch_id != null ? String(i.branch_id) : null;
                return itemBranchId === normalizedBranchId;
            });
        }
        
        const productStats = {};
        completedSales.forEach(sale => {
            const itemsForSale = saleItems.filter(si => si.sale_id === sale.id);
            itemsForSale.forEach(si => {
                const item = items.find(i => i.id === si.item_id);
                if (item) {
                    if (!productStats[item.id]) {
                        productStats[item.id] = { 
                            name: item.name || item.sku, 
                            revenue: 0, 
                            count: 0,
                            stock_actual: item.stock_actual ?? 1,
                            stock_min: item.stock_min ?? 1,
                            stock_max: item.stock_max ?? 10
                        };
                    }
                    productStats[item.id].revenue += (si.price || 0) * (si.quantity || 1);
                    productStats[item.id].count += si.quantity || 1;
                }
            });
        });

        const productData = Object.values(productStats)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        const maxRevenue = Math.max(...productData.map(p => p.revenue), 1);

        if (productData.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary);">No hay datos</p>';
            return;
        }

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: var(--spacing-xs); width: 100%; min-width: 0;">
                ${productData.map(product => {
                    const percentage = (product.revenue / maxRevenue) * 100;
                    const stockStatus = product.stock_actual <= 0 ? 'out' : (product.stock_actual < product.stock_min ? 'low' : 'ok');
                    const stockBadgeClass = stockStatus === 'out' ? 'stock-badge-out' : (stockStatus === 'low' ? 'stock-badge-low' : 'stock-badge-ok');
                    const stockText = product.stock_actual <= 0 ? 'Agotado' : `${product.stock_actual}`;
                    return `
                        <div style="min-width: 0; width: 100%;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 11px; min-width: 0;">
                                <div style="flex: 1; min-width: 0;">
                                    <span style="min-width: 0; overflow: hidden; text-overflow: ellipsis; display: block;">${product.name}</span>
                                    <span class="stock-badge ${stockBadgeClass}" style="font-size: 9px; padding: 1px 4px; margin-top: 2px; display: inline-block;">Stock: ${stockText}</span>
                                </div>
                                <span style="font-weight: 600; white-space: nowrap; margin-left: var(--spacing-xs);">${Utils.formatCurrency(product.revenue)}</span>
                            </div>
                            <div style="height: 6px; background: var(--color-bg-secondary); border-radius: 3px; overflow: hidden; width: 100%;">
                                <div style="height: 100%; width: ${percentage}%; background: var(--gradient-accent); transition: width 0.3s;"></div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    },

    async loadAnalysis() {
        // Esta función se ejecuta cuando el usuario hace clic en "Ejecutar Análisis"
    },

    async runAdvancedAnalysis() {
        await this.generateAdvancedAnalytics();
    },

    async loadHistory() {
        const container = document.getElementById('history-list');
        if (!container) return;

        const search = document.getElementById('history-search')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('history-status-filter')?.value || '';
        const dateFrom = document.getElementById('history-date-from')?.value || '';
        const dateTo = document.getElementById('history-date-to')?.value || '';

        // Verificar si es master_admin
        const isMasterAdmin = typeof UserManager !== 'undefined' && (
            UserManager.currentUser?.role === 'master_admin' ||
            UserManager.currentUser?.is_master_admin ||
            UserManager.currentUser?.isMasterAdmin ||
            UserManager.currentEmployee?.role === 'master_admin'
        );
        
        // Obtener sucursal actual
        const currentBranchId = typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : null;
        
        // Para master_admin sin filtro, mostrar todas las sucursales
        const filterBranchId = isMasterAdmin ? null : currentBranchId;
        
        // Usar el helper para obtener ventas filtradas por sucursal
        let sales = await this.getFilteredSales({
            branchId: filterBranchId,
            dateFrom: dateFrom || null,
            dateTo: dateTo || null,
            status: statusFilter || null
        });
        
        const branches = await DB.getAll('catalog_branches') || [];
        const sellers = await DB.getAll('catalog_sellers') || [];
        const agencies = await DB.getAll('catalog_agencies') || [];
        const guides = await DB.getAll('catalog_guides') || [];

        // Aplicar filtro de búsqueda adicional
        if (search) {
            sales = sales.filter(s => 
                (s.folio || '').toLowerCase().includes(search) ||
                sellers.find(sel => sel.id === s.seller_id)?.name?.toLowerCase().includes(search)
            );
        }

        sales.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        if (sales.length === 0) {
            container.innerHTML = '<div class="empty-state">No se encontraron ventas</div>';
            return;
        }

        container.innerHTML = `
            <table class="cart-table" style="width: 100%; max-width: 100%; table-layout: auto; min-width: 800px;">
                <thead>
                    <tr>
                        <th>Folio</th>
                        <th>Fecha</th>
                        <th>Sucursal</th>
                        <th>Vendedor</th>
                        <th>Agencia</th>
                        <th>Guía</th>
                        <th>Total</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${sales.map(sale => {
                        const branch = branches.find(b => b.id === sale.branch_id);
                        const seller = sellers.find(s => s.id === sale.seller_id);
                        const agency = agencies.find(a => a.id === sale.agency_id);
                        const guide = guides.find(g => g.id === sale.guide_id);
                        return `
                            <tr>
                                <td>${sale.folio || 'N/A'}</td>
                                <td>${Utils.formatDate(sale.created_at, 'DD/MM/YYYY')}</td>
                                <td>${branch?.name || 'N/A'}</td>
                                <td>${seller?.name || 'N/A'}</td>
                                <td>${agency?.name || 'N/A'}</td>
                                <td>${guide?.name || 'N/A'}</td>
                                <td style="font-weight: 600;">${Utils.formatCurrency(sale.total)}</td>
                                <td><span class="status-badge status-${(typeof Utils !== 'undefined' && Utils.isSaleCompleted && Utils.isSaleCompleted(sale)) || sale.status === 'completada' || sale.status === 'completed' ? 'disponible' : sale.status === 'apartada' ? 'reservado' : 'cancelado'}">${sale.status === 'completed' ? 'Completada' : sale.status}</span></td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;

        // Event listeners
        document.getElementById('history-search')?.addEventListener('input', Utils.debounce(() => this.loadHistory(), 300));
        document.getElementById('history-status-filter')?.addEventListener('change', () => this.loadHistory());
        document.getElementById('history-date-from')?.addEventListener('change', () => this.loadHistory());
        document.getElementById('history-date-to')?.addEventListener('change', () => this.loadHistory());
        document.getElementById('history-export')?.addEventListener('click', () => this.exportHistory());
    },

    async exportHistory() {
        const search = document.getElementById('history-search')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('history-status-filter')?.value || '';
        const dateFrom = document.getElementById('history-date-from')?.value || '';
        const dateTo = document.getElementById('history-date-to')?.value || '';

        // Verificar si es master_admin
        const isMasterAdmin = typeof UserManager !== 'undefined' && (
            UserManager.currentUser?.role === 'master_admin' ||
            UserManager.currentUser?.is_master_admin ||
            UserManager.currentUser?.isMasterAdmin ||
            UserManager.currentEmployee?.role === 'master_admin'
        );
        
        // Obtener sucursal actual
        const currentBranchId = typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : null;
        
        // Para master_admin sin filtro, mostrar todas las sucursales
        const filterBranchId = isMasterAdmin ? null : currentBranchId;
        
        // Usar el helper para obtener ventas filtradas por sucursal
        let sales = await this.getFilteredSales({
            branchId: filterBranchId,
            dateFrom: dateFrom || null,
            dateTo: dateTo || null,
            status: statusFilter || null
        });
        const branches = await DB.getAll('catalog_branches') || [];
        const sellers = await DB.getAll('catalog_sellers') || [];
        const agencies = await DB.getAll('catalog_agencies') || [];
        const guides = await DB.getAll('catalog_guides') || [];

        // Aplicar mismos filtros que en loadHistory
        if (statusFilter) {
            sales = sales.filter(s => s.status === statusFilter);
        }
        if (search) {
            sales = sales.filter(s => 
                (s.folio || '').toLowerCase().includes(search) ||
                sellers.find(sel => sel.id === s.seller_id)?.name?.toLowerCase().includes(search)
            );
        }
        if (dateFrom) {
            sales = sales.filter(s => s.created_at >= dateFrom);
        }
        if (dateTo) {
            sales = sales.filter(s => s.created_at <= dateTo + 'T23:59:59');
        }

        const exportData = sales.map(sale => {
            const branch = branches.find(b => b.id === sale.branch_id);
            const seller = sellers.find(s => s.id === sale.seller_id);
            const agency = agencies.find(a => a.id === sale.agency_id);
            const guide = guides.find(g => g.id === sale.guide_id);
            return {
                'Folio': sale.folio || '',
                'Fecha': Utils.formatDate(sale.created_at, 'DD/MM/YYYY'),
                'Sucursal': branch?.name || '',
                'Vendedor': seller?.name || '',
                'Agencia': agency?.name || '',
                'Guía': guide?.name || '',
                'Total': sale.total || 0,
                'Estado': sale.status || ''
            };
        });

        const date = Utils.formatDate(new Date(), 'YYYYMMDD');
        Utils.exportToExcel(exportData, `historial_ventas_${date}.xlsx`, 'Historial Ventas');
        Utils.showNotification(`Exportadas ${exportData.length} ventas`, 'success');
    },

    async loadCatalogs() {
        let branches = await DB.getAll('catalog_branches');
        const sellers = await DB.getAll('catalog_sellers');
        const agencies = await DB.getAll('catalog_agencies');
        const guides = await DB.getAll('catalog_guides');

        const branchSelect = document.getElementById('report-branch');
        const sellerSelect = document.getElementById('report-seller');
        const agencySelect = document.getElementById('report-agency');
        const guideSelect = document.getElementById('report-guide');

        if (branchSelect) {
            // Eliminar duplicados: si hay múltiples sucursales con el mismo nombre "Sucursal Principal", 
            // mantener solo la primera y eliminar las demás
            const seenNames = new Set();
            const seenIds = new Set();
            branches = (branches || []).filter(b => {
                if (!b || !b.id || !b.name) return false;
                if (b.name === 'Sucursal Principal' && seenNames.has('Sucursal Principal')) {
                    return false; // Excluir duplicados de "Sucursal Principal"
                }
                if (seenIds.has(b.id)) {
                    return false; // Excluir duplicados por ID
                }
                seenNames.add(b.name);
                seenIds.add(b.id);
                return true;
            });
            branchSelect.innerHTML = '<option value="all">Todas las sucursales</option>' + branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
            // Configurar filtro de sucursal para master_admin
            await this.setupBranchFilter('report-branch');
        }
        if (sellerSelect) {
            sellerSelect.innerHTML = '<option value="">Todos</option>' + sellers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        }
        if (agencySelect) {
            agencySelect.innerHTML = '<option value="">Todas</option>' + agencies.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
        }
        if (guideSelect) {
            guideSelect.innerHTML = '<option value="">Todos</option>' + guides.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
        }
    },

    setupPresetRanges() {
        const presetSelect = document.getElementById('report-preset-range');
        const dateFrom = document.getElementById('report-date-from');
        const dateTo = document.getElementById('report-date-to');
        
        presetSelect?.addEventListener('change', () => {
            const today = new Date();
            const preset = presetSelect.value;
            
            let fromDate = new Date();
            let toDate = new Date();
            
            switch(preset) {
                case 'today':
                    fromDate = new Date(today);
                    toDate = new Date(today);
                    break;
                case 'yesterday':
                    fromDate = new Date(today);
                    fromDate.setDate(fromDate.getDate() - 1);
                    toDate = new Date(fromDate);
                    break;
                case 'week': {
                    // Semana empieza el LUNES (convención México/LatAm)
                    fromDate = new Date(today);
                    const daysToMon = today.getDay() === 0 ? 6 : today.getDay() - 1;
                    fromDate.setDate(fromDate.getDate() - daysToMon);
                    break;
                }
                case 'lastweek': {
                    // Lunes al domingo de la semana anterior
                    fromDate = new Date(today);
                    const daysToMon2 = today.getDay() === 0 ? 6 : today.getDay() - 1;
                    fromDate.setDate(fromDate.getDate() - daysToMon2 - 7);
                    toDate = new Date(fromDate);
                    toDate.setDate(toDate.getDate() + 6);
                    break;
                }
                case 'month':
                    fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
                    break;
                case 'lastmonth':
                    fromDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                    toDate = new Date(today.getFullYear(), today.getMonth(), 0);
                    break;
                case 'quarter': {
                    const quarter = Math.floor(today.getMonth() / 3);
                    fromDate = new Date(today.getFullYear(), quarter * 3, 1);
                    break;
                }
                case 'year':
                    fromDate = new Date(today.getFullYear(), 0, 1);
                    break;
            }
            
            if (dateFrom) dateFrom.value = Utils.formatDate(fromDate, 'YYYY-MM-DD');
            if (dateTo) dateTo.value = Utils.formatDate(toDate, 'YYYY-MM-DD');
        });
    },

    async generateReport() {
        const dateFrom = document.getElementById('report-date-from')?.value;
        const dateTo = document.getElementById('report-date-to')?.value;
        
        // Obtener filtro de sucursal del dropdown
        const branchFilterEl = document.getElementById('report-branch');
        const branchFilterValue = branchFilterEl?.value || '';
        
        // Verificar si es master_admin
        const isMasterAdmin = typeof UserManager !== 'undefined' && (
            UserManager.currentUser?.role === 'master_admin' ||
            UserManager.currentUser?.is_master_admin ||
            UserManager.currentUser?.isMasterAdmin ||
            UserManager.currentEmployee?.role === 'master_admin'
        );
        
        // Obtener sucursal actual
        const currentBranchId = typeof BranchManager !== 'undefined' 
            ? BranchManager.getCurrentBranchId() 
            : localStorage.getItem('current_branch_id') || null;
        
        // Determinar qué branch_id usar para el filtro
        let branchId = null;
        if (branchFilterValue && branchFilterValue !== '' && branchFilterValue !== 'all') {
            branchId = branchFilterValue;
        } else if (isMasterAdmin && (!branchFilterValue || branchFilterValue === '' || branchFilterValue === 'all')) {
            branchId = null; // Todas las sucursales
        } else {
            branchId = currentBranchId;
        }
        
        // Configurar dropdown de sucursal para master_admin
        await this.setupBranchFilter('report-branch');
        
        const sellerId = document.getElementById('report-seller')?.value;
        const agencyId = document.getElementById('report-agency')?.value;
        const guideId = document.getElementById('report-guide')?.value;
        const status = document.getElementById('report-status')?.value;
        const minAmount = parseFloat(document.getElementById('report-min-amount')?.value || '0');
        const maxAmount = parseFloat(document.getElementById('report-max-amount')?.value || '999999999');
        const analysisType = document.getElementById('report-analysis-type')?.value || 'summary';

        try {
            // Intentar obtener reporte de utilidad desde API si está disponible y es un reporte de utilidad
            if (analysisType === 'profit' && typeof API !== 'undefined' && API.baseURL && API.token && API.getProfitReport) {
                try {
                    console.log('📊 Obteniendo reporte de utilidad desde API...');
                    const profitData = await API.getProfitReport({
                        branch_id: branchId || null,
                        start_date: dateFrom || null,
                        end_date: dateTo || null
                    });
                    
                    // Procesar datos del servidor y mostrar reporte
                    if (profitData && profitData.length > 0) {
                        // Mostrar reporte de utilidad desde API
                        // Mostrar reporte de utilidad desde API
                        await this.displayProfitReportFromAPI(profitData);
                        return;
                    }
                } catch (apiError) {
                    console.warn('Error obteniendo reporte de utilidad desde API, usando modo local:', apiError);
                    // Continuar con lógica local como fallback
                }
            }
            
            // Obtener ventas filtradas por sucursal y fechas usando el helper
            let sales = await this.getFilteredSales({
                branchId: branchId || null,
                dateFrom: dateFrom || null,
                dateTo: dateTo || null,
                status: status || null
            });

            // Obtener items relacionados
            const saleItems = await DB.getAll('sale_items') || [];
            
            // Verificar si es master_admin para filtrar items
            const isMasterAdminItems = typeof UserManager !== 'undefined' && (
                UserManager.currentUser?.role === 'master_admin' ||
                UserManager.currentUser?.is_master_admin ||
                UserManager.currentUser?.isMasterAdmin ||
                UserManager.currentEmployee?.role === 'master_admin'
            );
            const viewAllBranches = !branchId && isMasterAdminItems;
            
            const items = await DB.getAll('inventory_items', null, null, { 
                filterByBranch: !viewAllBranches, 
                branchIdField: 'branch_id' 
            }) || [];

            // Aplicar filtros adicionales
            if (sellerId) {
                sales = sales.filter(s => {
                    const saleSellerId = s.seller_id != null ? String(s.seller_id) : null;
                    return saleSellerId === String(sellerId);
                });
            }
            if (agencyId) {
                sales = sales.filter(s => {
                    const saleAgencyId = s.agency_id != null ? String(s.agency_id) : null;
                    return saleAgencyId === String(agencyId);
                });
            }
            if (guideId) {
                sales = sales.filter(s => {
                    const saleGuideId = s.guide_id != null ? String(s.guide_id) : null;
                    return saleGuideId === String(guideId);
                });
            }
            sales = sales.filter(s => (s.total || 0) >= minAmount && (s.total || 0) <= maxAmount);

            // Generate report based on analysis type
            switch(analysisType) {
                case 'daily':
                    await this.displayDailyReport(sales);
                    break;
                case 'seller':
                    await this.displaySellerReport(sales);
                    break;
                case 'agency':
                    await this.displayAgencyReport(sales);
                    break;
                case 'product':
                    await this.displayProductReport(sales, saleItems, items);
                    break;
                default:
                    await this.displayReport(sales, saleItems, items);
            }
            
            window.currentReportData = sales;
        } catch (e) {
            console.error('Error generating report:', e);
            Utils.showNotification('Error al generar reporte', 'error');
        }
    },

    async displayReport(sales, saleItems = [], items = []) {
        const container = document.getElementById('report-results');
        if (!container) return;

        // Obtener información de contexto
        const dateFrom = document.getElementById('report-date-from')?.value;
        const dateTo = document.getElementById('report-date-to')?.value;
        const branchFilterEl = document.getElementById('report-branch');
        const branchFilterValue = branchFilterEl?.value || '';
        const isMasterAdmin = typeof UserManager !== 'undefined' && (
            UserManager.currentUser?.role === 'master_admin' ||
            UserManager.currentUser?.is_master_admin ||
            UserManager.currentUser?.isMasterAdmin ||
            UserManager.currentEmployee?.role === 'master_admin'
        );
        
        // Determinar branchId para el banner
        const currentBranchId = typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : null;
        let branchIdForBanner = null;
        if (branchFilterValue && branchFilterValue !== 'all' && branchFilterValue !== '') {
            branchIdForBanner = branchFilterValue;
        } else if (isMasterAdmin && (!branchFilterValue || branchFilterValue === 'all')) {
            branchIdForBanner = null; // Todas las sucursales
        } else {
            branchIdForBanner = currentBranchId;
        }

        const branches = await DB.getAll('catalog_branches');
        const sellers = await DB.getAll('catalog_sellers');
        const agencies = await DB.getAll('catalog_agencies');
        const guides = await DB.getAll('catalog_guides');

        const toNumber = (value) => {
            const n = Number(value);
            return Number.isFinite(n) ? n : 0;
        };

        const completedSales = sales.filter(s =>
            (typeof Utils !== 'undefined' && Utils.isSaleCompleted
                ? Utils.isSaleCompleted(s)
                : ['completed', 'completada', 'completado'].includes(String(s.status || '').toLowerCase()))
        );

        const totalSales = completedSales.reduce((sum, s) => sum + toNumber(s.total), 0);
        const passengerValues = completedSales.map(s => toNumber(s.passengers)).filter(v => v > 0);
        const hasPassengerData = passengerValues.length > 0;
        let totalPassengers = hasPassengerData
            ? passengerValues.reduce((sum, v) => sum + v, 0)
            : 0; // Sin datos de pasajeros en ventas — se actualiza con llegadas del período más abajo
        const avgTicket = completedSales.length > 0
            ? (hasPassengerData ? totalSales / totalPassengers : totalSales / completedSales.length)
            : 0;
        let closeRate = hasPassengerData && totalPassengers > 0
            ? (completedSales.length / totalPassengers) * 100
            : 0;

        // Agrupar por sucursal si es master_admin y hay múltiples sucursales
        const branchesInReport = new Set(completedSales.map(s => s.branch_id).filter(Boolean));
        const showBranchBreakdown = isMasterAdmin && branchesInReport.size > 1 && (!branchIdForBanner || branchIdForBanner === 'all');
        
        let branchBreakdown = {};
        if (showBranchBreakdown) {
            completedSales.forEach(sale => {
                const branchId = sale.branch_id || 'sin_sucursal';
                if (!branchBreakdown[branchId]) {
                    branchBreakdown[branchId] = {
                        sales: 0,
                        total: 0,
                        passengers: 0
                    };
                }
                branchBreakdown[branchId].sales += 1;
                branchBreakdown[branchId].total += toNumber(sale.total);
                branchBreakdown[branchId].passengers += toNumber(sale.passengers);
            });
        }

        // Calcular COGS desde los items de venta (preferir cost en sale_item, fallback a inventario)
        let totalCOGS = 0;
        for (const sale of completedSales) {
            const saleItemsForSale = saleItems.filter(si => si.sale_id === sale.id);
            for (const item of saleItemsForSale) {
                const unitCost = (item.cost != null && item.cost !== '')
                    ? Number(item.cost)
                    : (items.find(i => i.id === item.item_id)?.cost ?? 0);
                totalCOGS += unitCost * (item.quantity || 1);
            }
        }

        // Calcular comisiones: siempre separar sellers/guides desde los registros de venta
        const commissionsBreakdown = {
            sellers: 0,
            guides: 0,
            total: 0
        };
        completedSales.forEach(sale => {
            commissionsBreakdown.sellers += Number(sale.seller_commission) || 0;
            commissionsBreakdown.guides  += Number(sale.guide_commission)  || 0;
        });
        commissionsBreakdown.total = commissionsBreakdown.sellers + commissionsBreakdown.guides;

        // Si los registros de venta no tienen datos de comisión, buscar en sale_items (fallback)
        if (commissionsBreakdown.total === 0) {
            let itemsTotal = 0;
            for (const sale of completedSales) {
                const saleItemsForSale = saleItems.filter(si => si.sale_id === sale.id);
                for (const item of saleItemsForSale) {
                    itemsTotal += Number(item.commission_amount) || 0;
                }
            }
            commissionsBreakdown.total = itemsTotal;
        }

        // Obtener costos del período del reporte (llegadas y operativos)
        let totalCosts = 0;
        let costBreakdown = {
            fixed: 0,
            variable: 0,
            cogs: 0,
            commissions: 0,
            arrivals: 0,
            bankCommissions: 0
        };
        
        if (completedSales.length > 0) {
            // Obtener fechas del reporte
            // Usar el rango de fechas del formulario (fuente de verdad para costos del período)
            const costsDateFrom = dateFrom || (completedSales.map(s => String(s.created_at || '').split('T')[0]).filter(Boolean).sort()[0]);
            const costsDateTo = dateTo || (completedSales.map(s => String(s.created_at || '').split('T')[0]).filter(Boolean).sort().slice(-1)[0]);
            
            // branchId para costos: usar SOLO el filtro del formulario (branchIdForBanner ya maneja
            // null para "todas las sucursales" y un ID específico para sucursal concreta).
            // No usar sales[0].branch_id como fallback: si es vista consolidada debe ser null.
            const branchId = (branchFilterValue && branchFilterValue !== 'all')
                ? branchFilterValue
                : branchIdForBanner;
            
            // Obtener llegadas del período
            const allArrivals = await DB.getAll('agency_arrivals', null, null, { 
                filterByBranch: false, 
                branchIdField: 'branch_id' 
            }) || [];
            const periodArrivals = allArrivals.filter(a => {
                const arrivalDate = a.date || a.created_at?.split('T')[0];
                return arrivalDate >= costsDateFrom && arrivalDate <= costsDateTo &&
                       (branchId === null || !branchId || a.branch_id === branchId) &&
                       a.passengers > 0;
            });
            const periodPassengers = periodArrivals.reduce((sum, a) => sum + (parseInt(a.passengers) || 0), 0);
            if (periodPassengers > 0) {
                closeRate = (completedSales.length / periodPassengers) * 100;
                // Si las ventas no tienen campo pasajeros, usar total de llegadas para mostrar en reporte
                if (!hasPassengerData) totalPassengers = periodPassengers;
            }
            costBreakdown.arrivals = periodArrivals.reduce((sum, a) => sum + (parseFloat(a.arrival_fee || a.calculated_fee) || 0), 0);
            
            // Obtener costos operativos del período
            if (typeof Costs !== 'undefined') {
            const reportCosts = await Costs.getFilteredCosts({
                branchId: branchId || null,
                dateFrom: costsDateFrom,
                dateTo: costsDateTo
            });
            
                // Desglose de costos operativos
            costBreakdown.fixed = reportCosts
                    .filter(c => c.type === 'fijo' && c.category !== 'pago_llegadas' && c.category !== 'comisiones_bancarias')
                .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
            costBreakdown.variable = reportCosts
                .filter(c => c.type === 'variable' && c.category !== 'costo_ventas' && c.category !== 'comisiones' && c.category !== 'comisiones_bancarias' && c.category !== 'pago_llegadas')
                .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
            costBreakdown.bankCommissions = reportCosts
                .filter(c => c.category === 'comisiones_bancarias')
                .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
            // pago_llegadas registrado en Costos se suma al desglose de Llegadas (no va en Fijo ni Variable)
            costBreakdown.arrivals += reportCosts
                .filter(c => c.category === 'pago_llegadas')
                .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
            }
        }
        
        // Usar COGS calculado desde items en lugar de cost_entries
        costBreakdown.cogs = totalCOGS;
        costBreakdown.commissions = commissionsBreakdown.total;
        
        // Calcular utilidades
        const grossProfit = totalSales - totalCOGS - commissionsBreakdown.total;
        const grossMargin = totalSales > 0 ? (grossProfit / totalSales * 100) : 0;
        
        // Costos totales = COGS + Comisiones + Llegadas + Operativos + Comisiones Bancarias
        totalCosts = costBreakdown.cogs + costBreakdown.commissions + costBreakdown.arrivals + 
                     costBreakdown.fixed + costBreakdown.variable + costBreakdown.bankCommissions;
        
        const netProfit = grossProfit - costBreakdown.arrivals - costBreakdown.fixed - 
                         costBreakdown.variable - costBreakdown.bankCommissions;
        const netMargin = totalSales > 0 ? (netProfit / totalSales * 100) : 0;
        
        // Mantener compatibilidad con el código anterior
        const profit = netProfit;
        const profitMargin = netMargin;
        
        // Ventas por día
        const dailyStats = {};
        completedSales.forEach(sale => {
            const date = sale.created_at.split('T')[0];
            if (!dailyStats[date]) {
                dailyStats[date] = { total: 0, count: 0 };
            }
            dailyStats[date].total += toNumber(sale.total);
            dailyStats[date].count += 1;
        });
        
        const dailyData = Object.entries(dailyStats)
            .map(([date, stats]) => ({ date, ...stats }))
            .sort((a, b) => a.date.localeCompare(b.date));
        
        const maxDaily = Math.max(...dailyData.map(d => d.total), 1);

        let html = await this.getBranchContextBanner(branchIdForBanner, dateFrom, dateTo);

        // Banner: advertir si hay datos de Captura Rápida para el mismo período
        try {
            const allArchived = await DB.getAll('archived_quick_captures') || [];
            const hasQuickCaptureData = allArchived.some(r => {
                const d = r.date || r.report_date || r.created_at?.split('T')[0];
                return d && d >= dateFrom && d <= dateTo;
            });
            if (hasQuickCaptureData) {
                html += `<div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; display: flex; align-items: center; gap: 10px; font-size: 13px;">
                    <i class="fas fa-exclamation-triangle" style="color: #856404; flex-shrink: 0;"></i>
                    <span><strong>Este período tiene datos de Captura Rápida registrados.</strong>
                    Este reporte solo incluye ventas del sistema POS. Para ver los datos consolidados de capturas rápidas, abre la pestaña
                    <strong>Históricos</strong> en el módulo de reportes.</span>
                </div>`;
            }
        } catch (e) { /* sin datos de capturas, no mostrar banner */ }

        // Comparativa por sucursal (si aplica)
        if (showBranchBreakdown && Object.keys(branchBreakdown).length > 1) {
            const branchComparison = Object.entries(branchBreakdown)
                .map(([branchId, stats]) => {
                    const branch = branches.find(b => b.id === branchId);
                    return {
                        branchId,
                        branchName: branch?.name || 'Sin Sucursal',
                        ...stats,
                        avgTicket: stats.passengers > 0 ? stats.total / stats.passengers : 0,
                        closeRate: stats.passengers > 0 ? (stats.sales / stats.passengers) * 100 : 0
                    };
                })
                .sort((a, b) => b.total - a.total);
            
            html += `
                <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); 
                    border-radius: var(--radius-md); border: 1px solid var(--color-border-light); 
                    margin-bottom: var(--spacing-lg); width: 100%; box-sizing: border-box;">
                    <h3 style="margin-bottom: var(--spacing-md); font-size: 13px; font-weight: 600; 
                        text-transform: uppercase; letter-spacing: 0.5px;">
                        <i class="fas fa-balance-scale"></i> Comparativa por Sucursal
                    </h3>
                    <div style="overflow-x: auto; width: 100%;">
                        <table class="cart-table" style="width: 100%; max-width: 100%; table-layout: auto; min-width: 800px;">
                            <thead>
                                <tr>
                                    <th>Sucursal</th>
                                    <th style="text-align: right;">Ventas</th>
                                    <th style="text-align: right;">Total</th>
                                    <th style="text-align: right;">Pasajeros</th>
                                    <th style="text-align: right;">Ticket Promedio</th>
                                    <th style="text-align: right;">% Cierre</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${branchComparison.map(branch => `
                                    <tr>
                                        <td><strong>${branch.branchName}</strong></td>
                                        <td style="text-align: right;">${branch.sales}</td>
                                        <td style="text-align: right; font-weight: 600;">${Utils.formatCurrency(branch.total)}</td>
                                        <td style="text-align: right;">${branch.passengers}</td>
                                        <td style="text-align: right;">${Utils.formatCurrency(branch.avgTicket)}</td>
                                        <td style="text-align: right;">${branch.closeRate.toFixed(1)}%</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot>
                                <tr style="border-top: 2px solid var(--color-border); font-weight: 700;">
                                    <td>TOTAL</td>
                                    <td style="text-align: right;">${completedSales.length}</td>
                                    <td style="text-align: right;">${Utils.formatCurrency(totalSales)}</td>
                                    <td style="text-align: right;">${totalPassengers}</td>
                                    <td style="text-align: right;">${Utils.formatCurrency(avgTicket)}</td>
                                    <td style="text-align: right;">${closeRate.toFixed(1)}%</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            `;
        }

        html += `
            <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border-light); margin-bottom: var(--spacing-lg);">
                <h3 style="margin-bottom: var(--spacing-md); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                    <i class="fas fa-chart-bar"></i> Resumen del Reporte
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--spacing-md);">
                    <div class="kpi-card" style="min-width: 0; width: 100%; box-sizing: border-box;">
                        <div class="kpi-label">Total Ventas</div>
                        <div class="kpi-value">${Utils.formatCurrency(totalSales)}</div>
                    </div>
                    <div class="kpi-card" style="min-width: 0; width: 100%; box-sizing: border-box;">
                        <div class="kpi-label">Número de Ventas</div>
                        <div class="kpi-value">${completedSales.length}</div>
                    </div>
                    <div class="kpi-card" style="min-width: 0; width: 100%; box-sizing: border-box;">
                        <div class="kpi-label">Ticket Promedio</div>
                        <div class="kpi-value">${Utils.formatCurrency(avgTicket)}</div>
                    </div>
                <div class="kpi-card" style="min-width: 0; width: 100%; box-sizing: border-box;">
                    <div class="kpi-label">% Cierre</div>
                    <div class="kpi-value">${closeRate.toFixed(1)}%</div>
                </div>
                <div class="kpi-card" style="min-width: 0; width: 100%; box-sizing: border-box;">
                    <div class="kpi-label">Total Pasajeros</div>
                    <div class="kpi-value">${totalPassengers}</div>
                </div>
                <div class="kpi-card" style="min-width: 0; width: 100%; box-sizing: border-box;">
                    <div class="kpi-label">Promedio por Venta</div>
                    <div class="kpi-value">${completedSales.length > 0 ? Utils.formatCurrency(totalSales / completedSales.length) : '$0'}</div>
                </div>
                <div class="kpi-card" style="min-width: 0; width: 100%; box-sizing: border-box;">
                    <div class="kpi-label">Total Costos</div>
                    <div class="kpi-value" style="color: var(--color-danger);">${Utils.formatCurrency(totalCosts)}</div>
                </div>
                <div class="kpi-card" style="min-width: 0; width: 100%; box-sizing: border-box;">
                    <div class="kpi-label">Utilidad Bruta</div>
                    <div class="kpi-value" style="color: var(--color-success);">
                        ${Utils.formatCurrency(grossProfit)}
                    </div>
                    <div style="font-size: 12px; color: var(--color-text-secondary); margin-top: var(--spacing-xs);">
                        Margen Bruto: ${grossMargin.toFixed(1)}%
                    </div>
                </div>
                <div class="kpi-card" style="min-width: 0; width: 100%; box-sizing: border-box;">
                    <div class="kpi-label">Utilidad Neta</div>
                    <div class="kpi-value" style="color: ${netProfit >= 0 ? 'var(--color-primary)' : 'var(--color-danger)'}; font-weight: 700;">
                        ${Utils.formatCurrency(netProfit)}
                    </div>
                    <div style="font-size: 12px; color: var(--color-text-secondary); margin-top: var(--spacing-xs);">
                        Margen Neto: ${netMargin.toFixed(1)}%
                    </div>
                </div>
            </div>
            
            ${totalCosts > 0 ? `
                <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border-light); margin-top: var(--spacing-lg);">
                    <h3 style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: var(--spacing-sm);">
                        <i class="fas fa-dollar-sign"></i> Desglose de Costos
                    </h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--spacing-sm);">
                        <div style="padding: var(--spacing-sm); background: var(--color-bg-secondary); border-radius: var(--radius-sm);">
                            <div style="font-size: 11px; color: var(--color-text-secondary); margin-bottom: 4px;">Costos Fijos</div>
                            <div style="font-weight: 600; font-size: 14px;">${Utils.formatCurrency(costBreakdown.fixed)}</div>
                        </div>
                        <div style="padding: var(--spacing-sm); background: var(--color-bg-secondary); border-radius: var(--radius-sm);">
                            <div style="font-size: 11px; color: var(--color-text-secondary); margin-bottom: 4px;">Costos Variables</div>
                            <div style="font-weight: 600; font-size: 14px;">${Utils.formatCurrency(costBreakdown.variable)}</div>
                        </div>
                        <div style="padding: var(--spacing-sm); background: var(--color-bg-secondary); border-radius: var(--radius-sm);">
                            <div style="font-size: 11px; color: var(--color-text-secondary); margin-bottom: 4px;">COGS</div>
                            <div style="font-weight: 600; font-size: 14px;">${Utils.formatCurrency(costBreakdown.cogs)}</div>
                        </div>
                        <div style="padding: var(--spacing-sm); background: var(--color-bg-secondary); border-radius: var(--radius-sm);">
                            <div style="font-size: 11px; color: var(--color-text-secondary); margin-bottom: 4px;">Comisiones</div>
                            <div style="font-weight: 600; font-size: 14px;">${Utils.formatCurrency(costBreakdown.commissions)}</div>
                        </div>
                        <div style="padding: var(--spacing-sm); background: var(--color-bg-secondary); border-radius: var(--radius-sm);">
                            <div style="font-size: 11px; color: var(--color-text-secondary); margin-bottom: 4px;">Llegadas</div>
                            <div style="font-weight: 600; font-size: 14px;">${Utils.formatCurrency(costBreakdown.arrivals)}</div>
                        </div>
                        <div style="padding: var(--spacing-sm); background: var(--color-bg-secondary); border-radius: var(--radius-sm);">
                            <div style="font-size: 11px; color: var(--color-text-secondary); margin-bottom: 4px;">Com. Bancarias</div>
                            <div style="font-weight: 600; font-size: 14px;">${Utils.formatCurrency(costBreakdown.bankCommissions)}</div>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            ${commissionsBreakdown.total > 0 ? `
                <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border-light); margin-top: var(--spacing-lg);">
                    <h3 style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: var(--spacing-sm);">
                        <i class="fas fa-percent"></i> Desglose de Comisiones
                    </h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--spacing-md);">
                        <div style="padding: var(--spacing-md); background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%); border-radius: var(--radius-md); color: white;">
                            <div style="font-size: 12px; opacity: 0.9; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                                <i class="fas fa-user-tag"></i> Comisiones Vendedores
                            </div>
                            <div style="font-weight: 700; font-size: 24px; margin-bottom: 4px;">${Utils.formatCurrency(commissionsBreakdown.sellers)}</div>
                            <div style="font-size: 11px; opacity: 0.8;">
                                ${commissionsBreakdown.total > 0 ? ((commissionsBreakdown.sellers / commissionsBreakdown.total) * 100).toFixed(1) : 0}% del total
                            </div>
                        </div>
                        <div style="padding: var(--spacing-md); background: linear-gradient(135deg, var(--color-success) 0%, #4CAF50 100%); border-radius: var(--radius-md); color: white;">
                            <div style="font-size: 12px; opacity: 0.9; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                                <i class="fas fa-suitcase"></i> Comisiones Guías
                            </div>
                            <div style="font-weight: 700; font-size: 24px; margin-bottom: 4px;">${Utils.formatCurrency(commissionsBreakdown.guides)}</div>
                            <div style="font-size: 11px; opacity: 0.8;">
                                ${commissionsBreakdown.total > 0 ? ((commissionsBreakdown.guides / commissionsBreakdown.total) * 100).toFixed(1) : 0}% del total
                            </div>
                        </div>
                        <div style="padding: var(--spacing-md); background: var(--color-bg-secondary); border: 2px solid var(--color-border); border-radius: var(--radius-md);">
                            <div style="font-size: 12px; color: var(--color-text-secondary); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                                <i class="fas fa-calculator"></i> Total Comisiones
                            </div>
                            <div style="font-weight: 700; font-size: 24px; color: var(--color-text); margin-bottom: 4px;">${Utils.formatCurrency(commissionsBreakdown.total)}</div>
                            <div style="font-size: 11px; color: var(--color-text-secondary);">
                                ${sales.length} venta${sales.length !== 1 ? 's' : ''}
                            </div>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            ${dailyData.length > 0 ? `
                <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border-light); margin-top: var(--spacing-lg);">
                    <h3 style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: var(--spacing-sm);">
                        <i class="fas fa-chart-line"></i> Ventas por Día
                    </h3>
                    <div style="background: var(--color-bg-secondary); padding: var(--spacing-md); border-radius: var(--radius-md); margin-top: var(--spacing-sm); width: 100%; overflow-x: auto;">
                        <div style="display: flex; align-items: flex-end; gap: 4px; height: 200px; min-width: 0; width: 100%;">
                            ${dailyData.map(day => {
                                const height = maxDaily > 0 ? (day.total / maxDaily * 100) : 0;
                                return `
                                    <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 0; flex-shrink: 0;">
                                        <div style="flex: 1; display: flex; align-items: flex-end; width: 100%; min-width: 0;">
                                            <div style="width: 100%; background: var(--gradient-accent); 
                                                border-radius: var(--radius-xs) var(--radius-xs) 0 0; 
                                                height: ${height}%; 
                                                min-height: ${day.total > 0 ? '4px' : '0'};"></div>
                                        </div>
                                        <div style="font-size: 9px; color: var(--color-text-secondary); text-align: center; white-space: nowrap;">
                                            <div>${Utils.formatDate(day.date, 'DD/MM')}</div>
                                            <div style="font-weight: 600; color: var(--color-text); margin-top: 2px; font-size: 10px;">${Utils.formatCurrency(day.total)}</div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <div class="module" style="padding: 0; background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border-light); overflow: hidden; margin-top: var(--spacing-lg);">
                <div style="padding: var(--spacing-md); border-bottom: 1px solid var(--color-border-light);">
                    <h3 style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0;">
                        <i class="fas fa-list"></i> Detalle de Ventas
                    </h3>
                </div>
                <div style="overflow-x: auto; width: 100%;">
                    <table class="cart-table" style="width: 100%; max-width: 100%; table-layout: auto; min-width: 1000px;">
                        <thead>
                            <tr>
                                <th>Folio</th>
                                <th>Fecha</th>
                                <th>Sucursal</th>
                                <th>Vendedor</th>
                                <th>Agencia</th>
                                <th>Guía</th>
                                <th>Pasajeros</th>
                                <th>Total</th>
                                <th>Com. Vendedor</th>
                                <th>Com. Guía</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sales.map(sale => {
                                const branch = branches.find(b => b.id === sale.branch_id);
                                const seller = sellers.find(s => s.id === sale.seller_id);
                                const agency = agencies.find(a => a.id === sale.agency_id);
                                const guide = guides.find(g => g.id === sale.guide_id);
                                return `
                                    <tr>
                                        <td>${sale.folio || 'N/A'}</td>
                                        <td>${Utils.formatDate(sale.created_at, 'DD/MM/YYYY')}</td>
                                        <td>${branch?.name || 'N/A'}</td>
                                        <td>${seller?.name || 'N/A'}</td>
                                        <td>${agency?.name || 'N/A'}</td>
                                        <td>${guide?.name || 'N/A'}</td>
                                        <td>${sale.passengers > 0 ? sale.passengers : '—'}</td>
                                        <td style="font-weight: 600;">${Utils.formatCurrency(sale.total)}</td>
                                        <td style="color: var(--color-primary); font-weight: 500;">${Utils.formatCurrency(sale.seller_commission || 0)}</td>
                                        <td style="color: var(--color-success); font-weight: 500;">${Utils.formatCurrency(sale.guide_commission || 0)}</td>
                                        <td><span class="status-badge status-${(typeof Utils !== 'undefined' && Utils.isSaleCompleted && Utils.isSaleCompleted(sale)) || sale.status === 'completada' || sale.status === 'completed' ? 'disponible' : sale.status === 'apartada' ? 'reservado' : 'cancelado'}">${sale.status === 'completed' ? 'Completada' : sale.status}</span></td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                        ${showBranchBreakdown && Object.keys(branchBreakdown).length > 1 ? `
                            <tfoot>
                                ${Object.entries(branchBreakdown).map(([branchId, stats]) => {
                                    const branch = branches.find(b => b.id === branchId);
                                    const branchSales = sales.filter(s => s.branch_id === branchId);
                                    return `
                                        <tr style="border-top: 1px solid var(--color-border); background: var(--color-bg-secondary); font-weight: 600;">
                                            <td colspan="6" style="text-align: right; padding-right: var(--spacing-md);">
                                                <strong>SUBTOTAL ${branch?.name || 'Sin Sucursal'}</strong>
                                            </td>
                                            <td style="text-align: right; font-weight: 700;">${Utils.formatCurrency(stats.total)}</td>
                                            <td style="text-align: right;">${Utils.formatCurrency((stats.total / stats.sales) || 0)}</td>
                                            <td colspan="3"></td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tfoot>
                        ` : ''}
                    </table>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    },
    
    async displayDailyReport(sales) {
        const container = document.getElementById('report-results');
        if (!container) return;
        
        // Obtener información de contexto
        const dateFrom = document.getElementById('report-date-from')?.value;
        const dateTo = document.getElementById('report-date-to')?.value;
        const branchFilterEl = document.getElementById('report-branch');
        const branchFilterValue = branchFilterEl?.value || '';
        const isMasterAdmin = typeof UserManager !== 'undefined' && (
            UserManager.currentUser?.role === 'master_admin' ||
            UserManager.currentUser?.is_master_admin ||
            UserManager.currentUser?.isMasterAdmin ||
            UserManager.currentEmployee?.role === 'master_admin'
        );
        
        // Determinar branchId para el banner
        const currentBranchId = typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : null;
        let branchIdForBanner = null;
        if (branchFilterValue && branchFilterValue !== 'all' && branchFilterValue !== '') {
            branchIdForBanner = branchFilterValue;
        } else if (isMasterAdmin && (!branchFilterValue || branchFilterValue === 'all')) {
            branchIdForBanner = null; // Todas las sucursales
        } else {
            branchIdForBanner = currentBranchId;
        }
        
        // Obtener datos adicionales para cálculos de utilidad
        const saleItems = await DB.getAll('sale_items') || [];
        const inventoryItems = await DB.getAll('inventory_items', null, null, { 
            filterByBranch: false, 
            branchIdField: 'branch_id' 
        }) || [];
        const allArrivals = await DB.getAll('agency_arrivals', null, null, { 
            filterByBranch: false, 
            branchIdField: 'branch_id' 
        }) || [];
        const allCosts = await DB.getAll('cost_entries', null, null, { 
            filterByBranch: false, 
            branchIdField: 'branch_id' 
        }) || [];
        
        // Determinar qué branch_ids incluir en los cálculos
        const branchIdsToInclude = [];
        if (branchIdForBanner === null && isMasterAdmin) {
            // Todas las sucursales
            const allBranches = await DB.getAll('catalog_branches') || [];
            branchIdsToInclude.push(...allBranches.map(b => b.id));
        } else if (branchIdForBanner) {
            branchIdsToInclude.push(branchIdForBanner);
        } else if (currentBranchId) {
            branchIdsToInclude.push(currentBranchId);
        }
        
        // Función helper para calcular costos del día (similar a ProfitCalculator)
        const calculateDailyCosts = async (dateStr, branchId) => {
            let fixedCostsDaily = 0;
            let variableCostsDaily = 0;
            let arrivalCosts = 0;
            let bankCommissions = 0;
            
            // Calcular costos de llegadas desde cost_entries (fuente autorizada)
            const branchIdsForArrivals = branchId === null && branchIdsToInclude.length > 0 ? branchIdsToInclude : (branchId ? [branchId] : []);
            arrivalCosts = await this.calculateArrivalCosts(dateStr, branchId, branchIdsForArrivals);
            
            // Filtrar costos del día
            const targetDate = new Date(dateStr);
            const branchCosts = allCosts.filter(c => 
                branchId === null || c.branch_id === branchId || !c.branch_id
            );
            
            // Costos mensuales prorrateados
            const monthlyCosts = branchCosts.filter(c => {
                const costDate = new Date(c.date || c.created_at);
                return c.period_type === 'monthly' && 
                       c.recurring === true &&
                       costDate.getMonth() === targetDate.getMonth() &&
                       costDate.getFullYear() === targetDate.getFullYear();
            });
            for (const cost of monthlyCosts) {
                // Usar 30 días fijos para prorrateo mensual (convención contable: $94,500/30 = $3,150)
                const DAYS_PER_MONTH = 30;
                fixedCostsDaily += (cost.amount || 0) / DAYS_PER_MONTH;
            }
            
            // Costos semanales prorrateados
            const weeklyCosts = branchCosts.filter(c => {
                const costDate = new Date(c.date || c.created_at);
                const targetWeek = this.getWeekNumber(targetDate);
                const costWeek = this.getWeekNumber(costDate);
                return c.period_type === 'weekly' && 
                       c.recurring === true &&
                       targetWeek === costWeek &&
                       targetDate.getFullYear() === costDate.getFullYear();
            });
            for (const cost of weeklyCosts) {
                fixedCostsDaily += (cost.amount || 0) / 7;
            }
            
            // Costos anuales prorrateados
            const annualCosts = branchCosts.filter(c => {
                const costDate = new Date(c.date || c.created_at);
                return c.period_type === 'annual' && 
                       c.recurring === true &&
                       costDate.getFullYear() === targetDate.getFullYear();
            });
            for (const cost of annualCosts) {
                const daysInYear = ((targetDate.getFullYear() % 4 === 0 && targetDate.getFullYear() % 100 !== 0) || (targetDate.getFullYear() % 400 === 0)) ? 366 : 365;
                fixedCostsDaily += (cost.amount || 0) / daysInYear;
            }
            
            // Costos variables/diarios del día específico
            variableCostsDaily = branchCosts
                .filter(c => {
                    const costDate = c.date || c.created_at;
                    const costDateStr = costDate.split('T')[0];
                    return costDateStr === dateStr &&
                           (c.period_type === 'one_time' || c.period_type === 'daily' || !c.period_type);
                })
                .reduce((sum, c) => {
                    // Separar comisiones bancarias
                    if (c.category === 'comisiones_bancarias') {
                        bankCommissions += (c.amount || 0);
                    }
                    return sum + (c.amount || 0);
                }, 0);
            
            return { fixedCostsDaily, variableCostsDaily, arrivalCosts, bankCommissions };
        };
        
        // Calcular estadísticas por día con costos y utilidades
        const dailyStats = {};
        for (const sale of sales) {
            const date = sale.created_at.split('T')[0];
            if (!dailyStats[date]) {
                dailyStats[date] = { 
                    total: 0, 
                    count: 0, 
                    passengers: 0,
                    cogs: 0,
                    commissions: 0,
                    arrivalCosts: 0,
                    operatingCosts: 0,
                    bankCommissions: 0
                };
            }
            dailyStats[date].total += sale.total || 0;
            dailyStats[date].count += 1;
            dailyStats[date].passengers += sale.passengers || 1;
        }
        
        // Calcular COGS y comisiones por día (preferir cost en sale_item, fallback a inventario)
        for (const sale of sales) {
            const date = sale.created_at.split('T')[0];
            const items = saleItems.filter(si => si.sale_id === sale.id);
            
            // COGS
            for (const item of items) {
                const invItem = inventoryItems.find(i => i.id === item.item_id);
                const unitCost = (item.cost != null && item.cost !== '')
                    ? Number(item.cost)
                    : (invItem?.cost ?? 0);
                dailyStats[date].cogs += unitCost * (item.quantity || 1);
            }
            
            // Comisiones
            for (const item of items) {
                if (item.commission_amount) {
                    dailyStats[date].commissions += item.commission_amount;
                }
            }
        }
        
        // Calcular costos del día (llegadas, operativos, comisiones bancarias)
        const dailyData = await Promise.all(Object.entries(dailyStats).map(async ([date, stats]) => {
            // Calcular costos para cada sucursal y sumarlos si es master_admin sin filtro
            let totalArrivalCosts = 0;
            let totalOperatingCosts = 0;
            let totalBankCommissions = 0;
            
            if (branchIdsToInclude.length > 0) {
                for (const branchId of branchIdsToInclude) {
                    const costs = await calculateDailyCosts(date, branchId);
                    totalArrivalCosts += costs.arrivalCosts;
                    totalOperatingCosts += costs.fixedCostsDaily + costs.variableCostsDaily;
                    totalBankCommissions += costs.bankCommissions;
                }
            } else {
                // Si no hay branch_ids, calcular para todas
                const costs = await calculateDailyCosts(date, null);
                totalArrivalCosts = costs.arrivalCosts;
                totalOperatingCosts = costs.fixedCostsDaily + costs.variableCostsDaily;
                totalBankCommissions = costs.bankCommissions;
            }
            
            stats.arrivalCosts = totalArrivalCosts;
            stats.operatingCosts = totalOperatingCosts;
            stats.bankCommissions = totalBankCommissions;
            
            // Calcular utilidades
            const grossProfit = stats.total - stats.cogs - stats.commissions;
            const netProfit = grossProfit - stats.arrivalCosts - stats.operatingCosts - stats.bankCommissions;
            const grossMargin = stats.total > 0 ? (grossProfit / stats.total * 100) : 0;
            const netMargin = stats.total > 0 ? (netProfit / stats.total * 100) : 0;
            
            return {
                date,
                ...stats,
                avg: stats.passengers > 0 ? stats.total / stats.passengers : 0,
                grossProfit,
                netProfit,
                grossMargin,
                netMargin
            };
        }));
        
        dailyData.sort((a, b) => a.date.localeCompare(b.date));
        
        // Calcular totales
        const totals = dailyData.reduce((acc, day) => ({
            total: acc.total + day.total,
            count: acc.count + day.count,
            passengers: acc.passengers + day.passengers,
            cogs: acc.cogs + day.cogs,
            commissions: acc.commissions + day.commissions,
            arrivalCosts: acc.arrivalCosts + day.arrivalCosts,
            operatingCosts: acc.operatingCosts + day.operatingCosts,
            bankCommissions: acc.bankCommissions + day.bankCommissions,
            grossProfit: acc.grossProfit + day.grossProfit,
            netProfit: acc.netProfit + day.netProfit
        }), { total: 0, count: 0, passengers: 0, cogs: 0, commissions: 0, arrivalCosts: 0, operatingCosts: 0, bankCommissions: 0, grossProfit: 0, netProfit: 0 });
        
        const totalGrossMargin = totals.total > 0 ? (totals.grossProfit / totals.total * 100) : 0;
        const totalNetMargin = totals.total > 0 ? (totals.netProfit / totals.total * 100) : 0;
        
        let html = await this.getBranchContextBanner(branchIdForBanner, dateFrom, dateTo);
        html += `
            <div class="dashboard-section" style="width: 100%; max-width: 100%; box-sizing: border-box;">
                <h3 style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: var(--spacing-sm);">Análisis por Día con Utilidades</h3>
                <div style="overflow-x: auto; width: 100%;">
                    <table class="cart-table" style="width: 100%; max-width: 100%; table-layout: auto; min-width: 1400px;">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Ventas</th>
                                <th>Total Ventas</th>
                                <th>Pasajeros</th>
                                <th>Ticket Prom.</th>
                                <th>% Cierre</th>
                                <th>Costo Merc.</th>
                                <th>Comisiones</th>
                                <th>Costos Llegadas</th>
                                <th>Costos Operativos</th>
                                <th>Com. Bancarias</th>
                                <th style="color: var(--color-success);">Utilidad Bruta</th>
                                <th style="color: var(--color-success);">Margen Bruto %</th>
                                <th style="color: var(--color-primary); font-weight: 700;">Utilidad Neta</th>
                                <th style="color: var(--color-primary); font-weight: 700;">Margen Neto %</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${dailyData.map(day => `
                                <tr>
                                    <td>${Utils.formatDate(day.date, 'DD/MM/YYYY')}</td>
                                    <td>${day.count}</td>
                                    <td style="font-weight: 600;">${Utils.formatCurrency(day.total)}</td>
                                    <td>${day.passengers}</td>
                                    <td>${Utils.formatCurrency(day.avg)}</td>
                                    <td>${day.passengers > 0 ? ((day.count / day.passengers) * 100).toFixed(1) : 0}%</td>
                                    <td>${Utils.formatCurrency(day.cogs)}</td>
                                    <td>${Utils.formatCurrency(day.commissions)}</td>
                                    <td>${Utils.formatCurrency(day.arrivalCosts)}</td>
                                    <td>${Utils.formatCurrency(day.operatingCosts)}</td>
                                    <td>${Utils.formatCurrency(day.bankCommissions)}</td>
                                    <td style="color: var(--color-success); font-weight: 600;">${Utils.formatCurrency(day.grossProfit)}</td>
                                    <td style="color: var(--color-success);">${day.grossMargin.toFixed(2)}%</td>
                                    <td style="color: var(--color-primary); font-weight: 700;">${Utils.formatCurrency(day.netProfit)}</td>
                                    <td style="color: var(--color-primary); font-weight: 700;">${day.netMargin.toFixed(2)}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot style="background: var(--color-bg-secondary); font-weight: 600;">
                            <tr>
                                <td><strong>TOTALES</strong></td>
                                <td><strong>${totals.count}</strong></td>
                                <td><strong>${Utils.formatCurrency(totals.total)}</strong></td>
                                <td><strong>${totals.passengers}</strong></td>
                                <td><strong>${totals.passengers > 0 ? Utils.formatCurrency(totals.total / totals.passengers) : '$0.00'}</strong></td>
                                <td><strong>${totals.passengers > 0 ? ((totals.count / totals.passengers) * 100).toFixed(1) : 0}%</strong></td>
                                <td><strong>${Utils.formatCurrency(totals.cogs)}</strong></td>
                                <td><strong>${Utils.formatCurrency(totals.commissions)}</strong></td>
                                <td><strong>${Utils.formatCurrency(totals.arrivalCosts)}</strong></td>
                                <td><strong>${Utils.formatCurrency(totals.operatingCosts)}</strong></td>
                                <td><strong>${Utils.formatCurrency(totals.bankCommissions)}</strong></td>
                                <td style="color: var(--color-success);"><strong>${Utils.formatCurrency(totals.grossProfit)}</strong></td>
                                <td style="color: var(--color-success);"><strong>${totalGrossMargin.toFixed(2)}%</strong></td>
                                <td style="color: var(--color-primary);"><strong>${Utils.formatCurrency(totals.netProfit)}</strong></td>
                                <td style="color: var(--color-primary);"><strong>${totalNetMargin.toFixed(2)}%</strong></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    },
    
    // Helper function para obtener número de semana
    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    },

    /**
     * Deduplica costos por server_id o clave lógica para evitar sumar duplicados (bug de sincronización)
     * @param {Array} costs - Array de costos
     * @returns {Array} Costos únicos
     */
    deduplicateCosts(costs) {
        if (!Array.isArray(costs) || costs.length === 0) return costs;
        const seen = new Set();
        const result = [];
        const isUUID = (id) => id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id));
        for (const c of costs) {
            if (!c || !c.id) continue;
            const sid = c.server_id || (isUUID(c.id) ? c.id : null);
            const key = sid || `${c.branch_id || ''}_${c.category || ''}_${c.period_type || ''}_${(c.description || c.notes || '').slice(0, 80)}_${c.amount || 0}_${c.date || c.created_at || ''}`;
            if (seen.has(key)) continue;
            seen.add(key);
            result.push(c);
        }
        return result;
    },

    /**
     * Deduplica costos recurrentes (mensuales, semanales, anuales) por gasto lógico.
     * No incluye fecha en la clave: la misma nómina semanal $7500 es UNA expense aunque existan
     * múltiples registros (uno por semana). Evita inflar los gastos fijos prorrateados.
     * @param {Array} costs - Array de costos recurrentes (monthly, weekly, annual)
     * @returns {Array} Costos únicos por gasto lógico
     */
    deduplicateRecurringCosts(costs) {
        if (!Array.isArray(costs) || costs.length === 0) return costs;
        const seen = new Set();
        const result = [];
        for (const c of costs) {
            if (!c || !c.id) continue;
            const key = `${c.branch_id || ''}_${c.category || ''}_${c.period_type || ''}_${(c.description || c.notes || '').slice(0, 80)}_${parseFloat(c.amount) || 0}`;
            if (seen.has(key)) continue;
            seen.add(key);
            result.push(c);
        }
        return result;
    },

    /**
     * Calcula los costos de llegadas desde cost_entries (fuente autorizada)
     * Si no hay costos registrados, calcula desde agency_arrivals como fallback
     * @param {string} dateStr - Fecha en formato YYYY-MM-DD
     * @param {string|null} branchId - ID de sucursal (null para todas)
     * @param {Array} branchIds - Array de IDs de sucursales (opcional, si branchId es null)
     * @returns {Promise<number>} Total de costos de llegadas
     */
    async calculateArrivalCosts(dateStr, branchId = null, branchIds = []) {
        try {
            // Si branchIds está vacío pero hay sucursal actual, incluirla para no excluir costos válidos
            let effectiveBranchIds = Array.isArray(branchIds) ? [...branchIds] : [];
            if (effectiveBranchIds.length === 0 && typeof BranchManager !== 'undefined' && BranchManager.getCurrentBranchId) {
                const currentBranch = BranchManager.getCurrentBranchId();
                if (currentBranch) {
                    effectiveBranchIds = [currentBranch];
                }
            }
            // Normalizar branch IDs para comparación (evitar diferencias de formato)
            const norm = (id) => (id != null && id !== '') ? String(id).trim().toLowerCase() : '';
            const normBranchId = branchId != null && branchId !== '' ? norm(branchId) : null;
            const normBranchIds = effectiveBranchIds.map(norm).filter(Boolean);

            // 1. PRIMERO: Intentar obtener costos desde cost_entries (fuente autorizada)
            const allCosts = await DB.getAll('cost_entries', null, null, { 
                filterByBranch: false, 
                branchIdField: 'branch_id' 
            }) || [];
            
            // Filtrar costos de llegadas del día
            // CRÍTICO: Aplicar filtro por sucursal con comparación normalizada
            // TOLERANCIA: aceptar "pago_llegadas", "pago Llegadas" y variantes (bugs de entrada)
            const isArrivalCost = (cat) => (cat || '').toLowerCase().replace(/\s+/g, '_') === 'pago_llegadas';
            const arrivalCostEntries = allCosts.filter(c => {
                const costDate = c.date || c.created_at;
                const costDateStr = typeof costDate === 'string' ? costDate.split('T')[0] : new Date(costDate).toISOString().split('T')[0];
                
                if (!isArrivalCost(c.category)) return false;
                if (costDateStr !== dateStr) return false;
                
                // Si no hay filtro de sucursal, incluir todo
                if (normBranchId === null && normBranchIds.length === 0) return true;
                
                // Si el costo no tiene branch_id (fue saneado al enviarse al servidor), incluirlo como candidato
                if (!c.branch_id) return true;
                
                // Verificar sucursal con comparación normalizada
                if (normBranchId !== null) {
                    return norm(c.branch_id) === normBranchId;
                }
                if (normBranchIds.length > 0) {
                    return normBranchIds.includes(norm(c.branch_id));
                }
                return true;
            });
            
            // Calcular total desde cost_entries (asegurar que siempre sea un número)
            // IMPORTANTE: Agrupar por arrival_id para evitar sumar duplicados
            const uniqueCosts = new Map();
            arrivalCostEntries.forEach(c => {
                const amount = typeof c.amount === 'number' ? c.amount : parseFloat(c.amount || 0) || 0;
                
                // Si tiene arrival_id, usar como clave única (evitar duplicados)
                if (c.arrival_id) {
                    // Si ya existe, tomar el monto mayor (por si hay actualizaciones)
                    const existing = uniqueCosts.get(c.arrival_id) || 0;
                    if (amount > existing) {
                        uniqueCosts.set(c.arrival_id, amount);
                    }
                } else {
                    // Si no tiene arrival_id, usar combinación de fecha+agencia+sucursal+monto como clave
                    const key = `${c.date || ''}_${c.agency_id || ''}_${c.branch_id || ''}_${amount}`;
                    if (!uniqueCosts.has(key)) {
                        uniqueCosts.set(key, amount);
                    }
                }
            });
            
            const totalFromCosts = Array.from(uniqueCosts.values()).reduce((sum, amount) => sum + amount, 0);
            
            // Si hay costos registrados con monto > 0, retornar ese valor (fuente autorizada)
            if (uniqueCosts.size > 0 && totalFromCosts > 0) {
                const totalAsNumber = typeof totalFromCosts === 'number' ? totalFromCosts : parseFloat(totalFromCosts) || 0;
                console.log(`✅ Costos de llegadas encontrados en cost_entries: ${arrivalCostEntries.length} registros, ${uniqueCosts.size} únicos, total: $${totalAsNumber.toFixed(2)}`);
                return totalAsNumber;
            }
            
            console.warn(`⚠️ No se encontraron costos de llegadas en cost_entries para ${dateStr}, branchId: ${branchId || 'null'}, branchIds: [${effectiveBranchIds.join(', ')}]`);
            
            // 2. FALLBACK: Si no hay costos registrados, calcular desde agency_arrivals
            // (Por si acaso no se registraron automáticamente)
            console.warn(`No se encontraron costos de llegadas registrados en cost_entries para ${dateStr}, calculando desde agency_arrivals como fallback`);
            
            const allArrivals = await DB.getAll('agency_arrivals', null, null, { 
                filterByBranch: false, 
                branchIdField: 'branch_id' 
            }) || [];
            
            const dayArrivals = allArrivals.filter(a => {
                const arrivalDate = a.date || (a.created_at ? a.created_at.split('T')[0] : null);
                if (!arrivalDate || arrivalDate !== dateStr) return false;
                // Solo excluir si no hay fee calculado o asignado
                const hasFee = parseFloat(a.calculated_fee || a.arrival_fee || 0) > 0;
                if (!hasFee) return false;
                
                // Verificar sucursal (usar effectiveBranchIds y comparación normalizada)
                if (normBranchId !== null) {
                    return !a.branch_id || norm(a.branch_id) === normBranchId;
                }
                if (normBranchIds.length > 0) {
                    return !a.branch_id || normBranchIds.includes(norm(a.branch_id));
                }
                return true;
            });
            
            // Agrupar llegadas por ID para evitar duplicados al calcular desde agency_arrivals
            const uniqueArrivals = new Map();
            dayArrivals.forEach(a => {
                const fee = typeof (a.calculated_fee || a.arrival_fee) === 'number' 
                    ? (a.calculated_fee || a.arrival_fee) 
                    : parseFloat(a.calculated_fee || a.arrival_fee || 0) || 0;
                // Usar ID de llegada como clave única
                if (a.id) {
                    const existing = uniqueArrivals.get(a.id) || 0;
                    if (fee > existing) {
                        uniqueArrivals.set(a.id, fee);
                    }
                }
            });
            const totalFromArrivals = Array.from(uniqueArrivals.values()).reduce((sum, fee) => sum + fee, 0);
            
            // Registrar costos automáticamente si hay llegadas con fee pero sin cost_entry (corrige $0 en Utilidades del Día)
            if (totalFromArrivals > 0 && totalFromCosts === 0 && typeof Costs !== 'undefined' && Costs.registerArrivalPayment) {
                for (const a of dayArrivals) {
                    const fee = parseFloat(a.calculated_fee || a.arrival_fee || 0) || 0;
                    if (fee > 0) {
                        try {
                            await Costs.registerArrivalPayment(a.id, fee, a.branch_id, a.agency_id, a.passengers, a.date);
                            console.log(`📝 Costo de llegada registrado automáticamente: $${fee.toFixed(2)} para llegada ${a.id}`);
                        } catch (e) {
                            console.warn('Error registrando costo de llegada:', e);
                        }
                    }
                }
            }
            
            const totalFromArrivalsAsNumber = typeof totalFromArrivals === 'number' ? totalFromArrivals : parseFloat(totalFromArrivals) || 0;
            console.log(`📊 Total de costos de llegadas desde agency_arrivals: $${totalFromArrivalsAsNumber.toFixed(2)}`);
            return totalFromArrivalsAsNumber;
        } catch (error) {
            console.error('Error calculando costos de llegadas:', error);
            return 0;
        }
    },
    
    async displaySellerReport(sales) {
        const container = document.getElementById('report-results');
        if (!container) return;
        
        // Obtener información de contexto
        const dateFrom = document.getElementById('report-date-from')?.value;
        const dateTo = document.getElementById('report-date-to')?.value;
        const branchFilterEl = document.getElementById('report-branch');
        const branchFilterValue = branchFilterEl?.value || '';
        const isMasterAdmin = typeof UserManager !== 'undefined' && (
            UserManager.currentUser?.role === 'master_admin' ||
            UserManager.currentUser?.is_master_admin ||
            UserManager.currentUser?.isMasterAdmin ||
            UserManager.currentEmployee?.role === 'master_admin'
        );
        
        // Determinar branchId para el banner
        const currentBranchId = typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : null;
        let branchIdForBanner = null;
        if (branchFilterValue && branchFilterValue !== 'all' && branchFilterValue !== '') {
            branchIdForBanner = branchFilterValue;
        } else if (isMasterAdmin && (!branchFilterValue || branchFilterValue === 'all')) {
            branchIdForBanner = null; // Todas las sucursales
        } else {
            branchIdForBanner = currentBranchId;
        }
        
        const sellers = await DB.getAll('catalog_sellers') || [];
        const sellerStats = {};
        
        sales.forEach(sale => {
            if (sale.seller_id) {
                if (!sellerStats[sale.seller_id]) {
                    sellerStats[sale.seller_id] = { total: 0, count: 0, passengers: 0 };
                }
                sellerStats[sale.seller_id].total += sale.total || 0;
                sellerStats[sale.seller_id].count += 1;
                sellerStats[sale.seller_id].passengers += sale.passengers || 1;
            }
        });
        
        const sellerData = Object.entries(sellerStats)
            .map(([id, stats]) => {
                const seller = sellers.find(s => s.id === id);
                return {
                    id,
                    name: seller?.name || 'N/A',
                    ...stats,
                    avg: stats.passengers > 0 ? stats.total / stats.passengers : 0
                };
            })
            .sort((a, b) => b.total - a.total);
        
        const maxTotal = Math.max(...sellerData.map(s => s.total), 1);
        
        let html = await this.getBranchContextBanner(branchIdForBanner, dateFrom, dateTo);
        html += `
            <div class="dashboard-section" style="width: 100%; max-width: 100%; box-sizing: border-box;">
                <h3 style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: var(--spacing-sm);">Análisis por Vendedor</h3>
                <div style="background: var(--color-bg-secondary); padding: var(--spacing-md); border-radius: var(--radius-md); margin-top: var(--spacing-sm); width: 100%; box-sizing: border-box;">
                    ${sellerData.map(seller => {
                        const width = maxTotal > 0 ? (seller.total / maxTotal * 100) : 0;
                        return `
                            <div style="margin-bottom: var(--spacing-sm); min-width: 0; width: 100%; box-sizing: border-box;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 4px; min-width: 0;">
                                    <div style="min-width: 0; overflow: hidden; text-overflow: ellipsis;">
                                        <strong style="font-size: 11px;">${seller.name}</strong>
                                        <div style="font-size: 9px; color: var(--color-text-secondary);">
                                            ${seller.count} ventas • ${seller.passengers} pasajeros
                                        </div>
                                    </div>
                                    <div style="text-align: right; white-space: nowrap; margin-left: var(--spacing-xs);">
                                        <div style="font-size: 14px; font-weight: 600;">${Utils.formatCurrency(seller.total)}</div>
                                        <div style="font-size: 9px; color: var(--color-text-secondary);">
                                            ${Utils.formatCurrency(seller.avg)} prom
                                        </div>
                                    </div>
                                </div>
                                <div style="width: 100%; height: 18px; background: var(--color-border-light); border-radius: var(--radius-full); overflow: hidden; box-sizing: border-box;">
                                    <div style="width: ${width}%; height: 100%; background: var(--gradient-accent); transition: width 0.3s;"></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    },
    
    async displayAgencyReport(sales) {
        const container = document.getElementById('report-results');
        if (!container) return;
        
        // Obtener información de contexto
        const dateFrom = document.getElementById('report-date-from')?.value;
        const dateTo = document.getElementById('report-date-to')?.value;
        const branchFilterEl = document.getElementById('report-branch');
        const branchFilterValue = branchFilterEl?.value || '';
        const isMasterAdmin = typeof UserManager !== 'undefined' && (
            UserManager.currentUser?.role === 'master_admin' ||
            UserManager.currentUser?.is_master_admin ||
            UserManager.currentUser?.isMasterAdmin ||
            UserManager.currentEmployee?.role === 'master_admin'
        );
        
        // Determinar branchId para el banner
        const currentBranchId = typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : null;
        let branchIdForBanner = null;
        if (branchFilterValue && branchFilterValue !== 'all' && branchFilterValue !== '') {
            branchIdForBanner = branchFilterValue;
        } else if (isMasterAdmin && (!branchFilterValue || branchFilterValue === 'all')) {
            branchIdForBanner = null; // Todas las sucursales
        } else {
            branchIdForBanner = currentBranchId;
        }
        
        const agencies = await DB.getAll('catalog_agencies') || [];
        const agencyStats = {};
        
        sales.forEach(sale => {
            if (sale.agency_id) {
                if (!agencyStats[sale.agency_id]) {
                    agencyStats[sale.agency_id] = { total: 0, count: 0, passengers: 0 };
                }
                agencyStats[sale.agency_id].total += sale.total || 0;
                agencyStats[sale.agency_id].count += 1;
                agencyStats[sale.agency_id].passengers += sale.passengers || 1;
            }
        });
        
        const agencyData = Object.entries(agencyStats)
            .map(([id, stats]) => {
                const agency = agencies.find(a => a.id === id);
                return {
                    id,
                    name: agency?.name || 'N/A',
                    ...stats,
                    avg: stats.passengers > 0 ? stats.total / stats.passengers : 0
                };
            })
            .sort((a, b) => b.total - a.total);
        
        let html = await this.getBranchContextBanner(branchIdForBanner, dateFrom, dateTo);
        html += `
            <div class="dashboard-section" style="width: 100%; max-width: 100%; box-sizing: border-box;">
                <h3 style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: var(--spacing-sm);">Análisis por Agencia</h3>
                <div style="overflow-x: auto; width: 100%;">
                    <table class="cart-table" style="width: 100%; max-width: 100%; table-layout: auto; min-width: 700px;">
                        <thead>
                            <tr>
                                <th>Agencia</th>
                                <th>Ventas</th>
                                <th>Total</th>
                                <th>Pasajeros</th>
                                <th>Ticket Promedio</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${agencyData.map(agency => `
                                <tr>
                                    <td><strong>${agency.name}</strong></td>
                                    <td>${agency.count}</td>
                                    <td style="font-weight: 600;">${Utils.formatCurrency(agency.total)}</td>
                                    <td>${agency.passengers}</td>
                                    <td>${Utils.formatCurrency(agency.avg)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    },
    
    async displayProfitReportFromAPI(profitData) {
        const container = document.getElementById('report-results');
        if (!container) return;

        // profitData es un array de objetos con: date, sales_count, total_sales, total_cogs, total_commissions, gross_profit, net_profit
        const totalSales = profitData.reduce((sum, d) => sum + parseFloat(d.total_sales || 0), 0);
        const totalCogs = profitData.reduce((sum, d) => sum + parseFloat(d.total_cogs || 0), 0);
        const totalCommissions = profitData.reduce((sum, d) => sum + parseFloat(d.total_commissions || 0), 0);
        const totalGrossProfit = profitData.reduce((sum, d) => sum + parseFloat(d.gross_profit || 0), 0);
        const totalNetProfit = profitData.reduce((sum, d) => sum + parseFloat(d.net_profit || 0), 0);
        const totalSalesCount = profitData.reduce((sum, d) => sum + parseInt(d.sales_count || 0), 0);

        const profitMargin = totalSales > 0 ? (totalNetProfit / totalSales * 100) : 0;

        container.innerHTML = `
            <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border-light); margin-bottom: var(--spacing-lg);">
                <h3 style="margin-bottom: var(--spacing-md); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                    <i class="fas fa-chart-line"></i> Reporte de Utilidad desde Servidor
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--spacing-md);">
                    <div class="kpi-card">
                        <div class="kpi-label">Total Ventas</div>
                        <div class="kpi-value">${Utils.formatCurrency(totalSales)}</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-label">Número de Ventas</div>
                        <div class="kpi-value">${totalSalesCount}</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-label">COGS</div>
                        <div class="kpi-value" style="color: var(--color-danger);">${Utils.formatCurrency(totalCogs)}</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-label">Comisiones</div>
                        <div class="kpi-value" style="color: var(--color-danger);">${Utils.formatCurrency(totalCommissions)}</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-label">Utilidad Bruta</div>
                        <div class="kpi-value" style="color: ${totalGrossProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">
                            ${Utils.formatCurrency(totalGrossProfit)}
                        </div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-label">Utilidad Neta</div>
                        <div class="kpi-value" style="color: ${totalNetProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">
                            ${Utils.formatCurrency(totalNetProfit)}
                        </div>
                        <div style="font-size: 12px; color: var(--color-text-secondary); margin-top: var(--spacing-xs);">
                            Margen: ${profitMargin.toFixed(1)}%
                        </div>
                    </div>
                </div>
            </div>
            
            ${profitData.length > 0 ? `
                <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border-light); margin-top: var(--spacing-lg);">
                    <h3 style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: var(--spacing-sm);">
                        <i class="fas fa-calendar-alt"></i> Desglose por Día
                    </h3>
                    <div style="overflow-x: auto;">
                        <table class="data-table" style="width: 100%; font-size: 11px;">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th style="text-align: right;">Ventas</th>
                                    <th style="text-align: right;">Total</th>
                                    <th style="text-align: right;">COGS</th>
                                    <th style="text-align: right;">Comisiones</th>
                                    <th style="text-align: right;">Utilidad Bruta</th>
                                    <th style="text-align: right;">Utilidad Neta</th>
                                    <th style="text-align: right;">Margen</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${profitData.map(d => {
                                    const margin = parseFloat(d.total_sales || 0) > 0 
                                        ? ((parseFloat(d.net_profit || 0) / parseFloat(d.total_sales || 0)) * 100).toFixed(1)
                                        : '0.0';
                                    return `
                                        <tr>
                                            <td>${Utils.formatDate(d.date, 'DD/MM/YYYY')}</td>
                                            <td style="text-align: right;">${d.sales_count || 0}</td>
                                            <td style="text-align: right; font-weight: 600;">${Utils.formatCurrency(parseFloat(d.total_sales || 0))}</td>
                                            <td style="text-align: right;">${Utils.formatCurrency(parseFloat(d.total_cogs || 0))}</td>
                                            <td style="text-align: right;">${Utils.formatCurrency(parseFloat(d.total_commissions || 0))}</td>
                                            <td style="text-align: right; color: ${parseFloat(d.gross_profit || 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">
                                                ${Utils.formatCurrency(parseFloat(d.gross_profit || 0))}
                                            </td>
                                            <td style="text-align: right; font-weight: 600; color: ${parseFloat(d.net_profit || 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">
                                                ${Utils.formatCurrency(parseFloat(d.net_profit || 0))}
                                            </td>
                                            <td style="text-align: right;">${margin}%</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                            <tfoot>
                                <tr style="border-top: 2px solid var(--color-border); font-weight: 700;">
                                    <td>TOTAL</td>
                                    <td style="text-align: right;">${totalSalesCount}</td>
                                    <td style="text-align: right;">${Utils.formatCurrency(totalSales)}</td>
                                    <td style="text-align: right;">${Utils.formatCurrency(totalCogs)}</td>
                                    <td style="text-align: right;">${Utils.formatCurrency(totalCommissions)}</td>
                                    <td style="text-align: right; color: ${totalGrossProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">
                                        ${Utils.formatCurrency(totalGrossProfit)}
                                    </td>
                                    <td style="text-align: right; color: ${totalNetProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">
                                        ${Utils.formatCurrency(totalNetProfit)}
                                    </td>
                                    <td style="text-align: right;">${profitMargin.toFixed(1)}%</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            ` : ''}
        `;
    },

    async displayProductReport(sales, saleItems, items) {
        const container = document.getElementById('report-results');
        if (!container) return;
        
        // Obtener información de contexto
        const dateFrom = document.getElementById('report-date-from')?.value;
        const dateTo = document.getElementById('report-date-to')?.value;
        const branchFilterEl = document.getElementById('report-branch');
        const branchFilterValue = branchFilterEl?.value || '';
        const isMasterAdmin = typeof UserManager !== 'undefined' && (
            UserManager.currentUser?.role === 'master_admin' ||
            UserManager.currentUser?.is_master_admin ||
            UserManager.currentUser?.isMasterAdmin ||
            UserManager.currentEmployee?.role === 'master_admin'
        );
        
        // Determinar branchId para el banner
        const currentBranchId = typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : null;
        let branchIdForBanner = null;
        if (branchFilterValue && branchFilterValue !== 'all' && branchFilterValue !== '') {
            branchIdForBanner = branchFilterValue;
        } else if (isMasterAdmin && (!branchFilterValue || branchFilterValue === 'all')) {
            branchIdForBanner = null; // Todas las sucursales
        } else {
            branchIdForBanner = currentBranchId;
        }
        
        // Obtener sucursales para agrupación
        const branches = await DB.getAll('catalog_branches') || [];
        const saleIds = sales.map(s => s.id);
        
        // Agrupar por producto y sucursal
        const productStats = {}; // { itemId: { name, branchStats: { branchId: {...} } } }
        const branchStats = {}; // Para comparativa
        
        saleItems
            .filter(si => saleIds.includes(si.sale_id))
            .forEach(si => {
                const sale = sales.find(s => s.id === si.sale_id);
                if (!sale) return;
                
                const item = items.find(i => i.id === si.item_id);
                if (!item) return;
                
                const branchId = sale.branch_id || 'sin_sucursal';
                const quantity = si.quantity || 1;
                const unitPrice = si.unit_price || si.price || 0;
                const discount = si.discount_percent || 0;
                const revenue = (unitPrice * quantity) * (1 - discount / 100);
                const cost = (item.cost || 0) * quantity;
                const weight = (item.weight || 0) * quantity;
                const sellerCommission = si.seller_commission || 0;
                const guideCommission = si.guide_commission || 0;
                const totalCommissions = sellerCommission + guideCommission;
                const grossProfit = revenue - cost;
                const netProfit = revenue - cost - totalCommissions;
                
                // Estadísticas por producto (agregado de todas las sucursales)
                    if (!productStats[item.id]) {
                        productStats[item.id] = {
                            name: item.name || item.sku,
                        sku: item.sku,
                            qty: 0,
                        weight: 0,
                            revenue: 0,
                        cost: 0,
                        commissions: 0,
                        grossProfit: 0,
                        netProfit: 0,
                        branchStats: {}
                    };
                }
                
                productStats[item.id].qty += quantity;
                productStats[item.id].weight += weight;
                productStats[item.id].revenue += revenue;
                productStats[item.id].cost += cost;
                productStats[item.id].commissions += totalCommissions;
                productStats[item.id].grossProfit += grossProfit;
                productStats[item.id].netProfit += netProfit;
                
                // Estadísticas por sucursal y producto
                if (!productStats[item.id].branchStats[branchId]) {
                    productStats[item.id].branchStats[branchId] = {
                        qty: 0,
                        weight: 0,
                        revenue: 0,
                        cost: 0,
                        commissions: 0,
                        grossProfit: 0,
                        netProfit: 0
                    };
                }
                
                productStats[item.id].branchStats[branchId].qty += quantity;
                productStats[item.id].branchStats[branchId].weight += weight;
                productStats[item.id].branchStats[branchId].revenue += revenue;
                productStats[item.id].branchStats[branchId].cost += cost;
                productStats[item.id].branchStats[branchId].commissions += totalCommissions;
                productStats[item.id].branchStats[branchId].grossProfit += grossProfit;
                productStats[item.id].branchStats[branchId].netProfit += netProfit;
                
                // Estadísticas generales por sucursal (para comparativa)
                if (!branchStats[branchId]) {
                    branchStats[branchId] = {
                        qty: 0,
                        weight: 0,
                        revenue: 0,
                        cost: 0,
                        commissions: 0,
                        grossProfit: 0,
                        netProfit: 0,
                        itemCount: 0
                    };
                }
                
                branchStats[branchId].qty += quantity;
                branchStats[branchId].weight += weight;
                branchStats[branchId].revenue += revenue;
                branchStats[branchId].cost += cost;
                branchStats[branchId].commissions += totalCommissions;
                branchStats[branchId].grossProfit += grossProfit;
                branchStats[branchId].netProfit += netProfit;
            });
        
        // Calcular totales y márgenes
        const productData = Object.values(productStats)
            .map(p => ({
                ...p,
                grossMargin: p.revenue > 0 ? (p.grossProfit / p.revenue * 100) : 0,
                netMargin: p.revenue > 0 ? (p.netProfit / p.revenue * 100) : 0,
                avgPrice: p.qty > 0 ? p.revenue / p.qty : 0,
                avgCost: p.qty > 0 ? p.cost / p.qty : 0
            }))
            .sort((a, b) => b.revenue - a.revenue);
        
        // Totales generales
        const totals = productData.reduce((acc, p) => ({
            qty: acc.qty + p.qty,
            weight: acc.weight + p.weight,
            revenue: acc.revenue + p.revenue,
            cost: acc.cost + p.cost,
            commissions: acc.commissions + p.commissions,
            grossProfit: acc.grossProfit + p.grossProfit,
            netProfit: acc.netProfit + p.netProfit
        }), { qty: 0, weight: 0, revenue: 0, cost: 0, commissions: 0, grossProfit: 0, netProfit: 0 });
        
        const totalGrossMargin = totals.revenue > 0 ? (totals.grossProfit / totals.revenue * 100) : 0;
        const totalNetMargin = totals.revenue > 0 ? (totals.netProfit / totals.revenue * 100) : 0;
        
        // Determinar si mostrar agrupación por sucursal
        const branchesInReport = new Set(sales.map(s => s.branch_id).filter(Boolean));
        const showBranchBreakdown = isMasterAdmin && branchesInReport.size > 1 && (!branchIdForBanner || branchIdForBanner === 'all');
        
        // Generar HTML
        let html = await this.getBranchContextBanner(branchIdForBanner, dateFrom, dateTo);
        
        // KPIs principales
        html += `
            <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); 
                border-radius: var(--radius-md); border: 1px solid var(--color-border-light); 
                margin-bottom: var(--spacing-lg); width: 100%; box-sizing: border-box;">
                <h3 style="margin-bottom: var(--spacing-md); font-size: 13px; font-weight: 600; 
                    text-transform: uppercase; letter-spacing: 0.5px;">
                    <i class="fas fa-chart-bar"></i> Resumen de Piezas Vendidas
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
                    gap: var(--spacing-md); width: 100%; box-sizing: border-box;">
                    <div class="kpi-card" style="min-width: 0; width: 100%; box-sizing: border-box;">
                        <div class="kpi-label">Total Piezas</div>
                        <div class="kpi-value">${totals.qty}</div>
                    </div>
                    <div class="kpi-card" style="min-width: 0; width: 100%; box-sizing: border-box;">
                        <div class="kpi-label">Peso Total</div>
                        <div class="kpi-value">${totals.weight.toFixed(2)} g</div>
                    </div>
                    <div class="kpi-card" style="min-width: 0; width: 100%; box-sizing: border-box;">
                        <div class="kpi-label">Ventas Totales</div>
                        <div class="kpi-value">${Utils.formatCurrency(totals.revenue)}</div>
                    </div>
                    <div class="kpi-card" style="min-width: 0; width: 100%; box-sizing: border-box;">
                        <div class="kpi-label">Costo Total</div>
                        <div class="kpi-value" style="color: var(--color-danger);">${Utils.formatCurrency(totals.cost)}</div>
                    </div>
                    <div class="kpi-card" style="min-width: 0; width: 100%; box-sizing: border-box;">
                        <div class="kpi-label">Comisiones</div>
                        <div class="kpi-value" style="color: var(--color-danger);">${Utils.formatCurrency(totals.commissions)}</div>
                    </div>
                    <div class="kpi-card" style="min-width: 0; width: 100%; box-sizing: border-box;">
                        <div class="kpi-label">Utilidad Bruta</div>
                        <div class="kpi-value" style="color: ${totals.grossProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">
                            ${Utils.formatCurrency(totals.grossProfit)}
                        </div>
                        <div style="font-size: 12px; color: var(--color-text-secondary); margin-top: var(--spacing-xs);">
                            Margen: ${totalGrossMargin.toFixed(1)}%
                        </div>
                    </div>
                    <div class="kpi-card" style="min-width: 0; width: 100%; box-sizing: border-box;">
                        <div class="kpi-label">Utilidad Neta</div>
                        <div class="kpi-value" style="color: ${totals.netProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">
                            ${Utils.formatCurrency(totals.netProfit)}
                        </div>
                        <div style="font-size: 12px; color: var(--color-text-secondary); margin-top: var(--spacing-xs);">
                            Margen: ${totalNetMargin.toFixed(1)}%
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Comparativa entre sucursales (si aplica)
        if (showBranchBreakdown && Object.keys(branchStats).length > 1) {
            const branchData = Object.entries(branchStats)
                .map(([branchId, stats]) => {
                    const branch = branches.find(b => b.id === branchId);
                    return {
                        branchId,
                        branchName: branch?.name || 'Sin Sucursal',
                        ...stats,
                        grossMargin: stats.revenue > 0 ? (stats.grossProfit / stats.revenue * 100) : 0,
                        netMargin: stats.revenue > 0 ? (stats.netProfit / stats.revenue * 100) : 0
                    };
                })
                .sort((a, b) => b.revenue - a.revenue);
            
            html += `
                <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); 
                    border-radius: var(--radius-md); border: 1px solid var(--color-border-light); 
                    margin-bottom: var(--spacing-lg); width: 100%; box-sizing: border-box;">
                    <h3 style="margin-bottom: var(--spacing-md); font-size: 13px; font-weight: 600; 
                        text-transform: uppercase; letter-spacing: 0.5px;">
                        <i class="fas fa-balance-scale"></i> Comparativa por Sucursal
                    </h3>
                <div style="overflow-x: auto; width: 100%;">
                        <table class="cart-table" style="width: 100%; max-width: 100%; table-layout: auto; min-width: 1000px;">
                        <thead>
                            <tr>
                                    <th>Sucursal</th>
                                    <th style="text-align: right;">Piezas</th>
                                    <th style="text-align: right;">Peso (g)</th>
                                    <th style="text-align: right;">Ventas</th>
                                    <th style="text-align: right;">Costo</th>
                                    <th style="text-align: right;">Comisiones</th>
                                    <th style="text-align: right;">Util. Bruta</th>
                                    <th style="text-align: right;">Margen Bruto</th>
                                    <th style="text-align: right;">Util. Neta</th>
                                    <th style="text-align: right;">Margen Neto</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${branchData.map(branch => `
                                    <tr>
                                        <td><strong>${branch.branchName}</strong></td>
                                        <td style="text-align: right;">${branch.qty}</td>
                                        <td style="text-align: right;">${branch.weight.toFixed(2)}</td>
                                        <td style="text-align: right; font-weight: 600;">${Utils.formatCurrency(branch.revenue)}</td>
                                        <td style="text-align: right;">${Utils.formatCurrency(branch.cost)}</td>
                                        <td style="text-align: right;">${Utils.formatCurrency(branch.commissions)}</td>
                                        <td style="text-align: right; color: ${branch.grossProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}; font-weight: 600;">
                                            ${Utils.formatCurrency(branch.grossProfit)}
                                        </td>
                                        <td style="text-align: right; color: ${branch.grossMargin >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">
                                            ${branch.grossMargin.toFixed(1)}%
                                        </td>
                                        <td style="text-align: right; color: ${branch.netProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}; font-weight: 600;">
                                            ${Utils.formatCurrency(branch.netProfit)}
                                        </td>
                                        <td style="text-align: right; color: ${branch.netMargin >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">
                                            ${branch.netMargin.toFixed(1)}%
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot>
                                <tr style="border-top: 2px solid var(--color-border); font-weight: 700;">
                                    <td>TOTAL</td>
                                    <td style="text-align: right;">${totals.qty}</td>
                                    <td style="text-align: right;">${totals.weight.toFixed(2)}</td>
                                    <td style="text-align: right;">${Utils.formatCurrency(totals.revenue)}</td>
                                    <td style="text-align: right;">${Utils.formatCurrency(totals.cost)}</td>
                                    <td style="text-align: right;">${Utils.formatCurrency(totals.commissions)}</td>
                                    <td style="text-align: right; color: ${totals.grossProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">
                                        ${Utils.formatCurrency(totals.grossProfit)}
                                    </td>
                                    <td style="text-align: right;">${totalGrossMargin.toFixed(1)}%</td>
                                    <td style="text-align: right; color: ${totals.netProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">
                                        ${Utils.formatCurrency(totals.netProfit)}
                                    </td>
                                    <td style="text-align: right;">${totalNetMargin.toFixed(1)}%</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            `;
        }
        
        // Tabla detallada de productos
        html += `
            <div class="module" style="padding: 0; background: var(--color-bg-card); 
                border-radius: var(--radius-md); border: 1px solid var(--color-border-light); 
                overflow: hidden; width: 100%; box-sizing: border-box;">
                <div style="padding: var(--spacing-md); border-bottom: 1px solid var(--color-border-light);">
                    <h3 style="font-size: 13px; font-weight: 600; text-transform: uppercase; 
                        letter-spacing: 0.5px; margin: 0;">
                        <i class="fas fa-box"></i> Desglose Detallado por Pieza
                    </h3>
                </div>
                <div style="overflow-x: auto; width: 100%;">
                    <table class="cart-table" style="width: 100%; max-width: 100%; table-layout: auto; min-width: 1200px;">
                        <thead>
                            <tr>
                                <th>Producto / SKU</th>
                                <th style="text-align: right;">Cantidad</th>
                                <th style="text-align: right;">Peso Total (g)</th>
                                <th style="text-align: right;">Precio Venta</th>
                                <th style="text-align: right;">Precio Compra</th>
                                <th style="text-align: right;">Total Venta</th>
                                <th style="text-align: right;">Total Costo</th>
                                <th style="text-align: right;">Comisiones</th>
                                <th style="text-align: right;">Util. Bruta</th>
                                <th style="text-align: right;">Margen Bruto</th>
                                <th style="text-align: right;">Util. Neta</th>
                                <th style="text-align: right;">Margen Neto</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${productData.map(product => `
                                <tr>
                                    <td>
                                        <strong>${product.name}</strong>
                                        ${product.sku ? `<div style="font-size: 10px; color: var(--color-text-secondary);">${product.sku}</div>` : ''}
                                        ${showBranchBreakdown && Object.keys(product.branchStats).length > 1 ? `
                                            <details style="margin-top: var(--spacing-xs);">
                                                <summary style="cursor: pointer; font-size: 10px; color: var(--color-primary); 
                                                    font-weight: 500; list-style: none;">
                                                    <i class="fas fa-chevron-right" style="font-size: 8px; margin-right: 4px;"></i>
                                                    Ver por sucursal
                                                </summary>
                                                <div style="margin-top: var(--spacing-xs); padding-left: var(--spacing-sm);">
                                                    ${Object.entries(product.branchStats).map(([branchId, stats]) => {
                                                        const branch = branches.find(b => b.id === branchId);
                                                        const branchGrossMargin = stats.revenue > 0 ? (stats.grossProfit / stats.revenue * 100) : 0;
                                                        const branchNetMargin = stats.revenue > 0 ? (stats.netProfit / stats.revenue * 100) : 0;
                                                        return `
                                                            <div style="font-size: 10px; padding: var(--spacing-xs); 
                                                                background: var(--color-bg-secondary); border-radius: var(--radius-xs); 
                                                                margin-bottom: var(--spacing-xs);">
                                                                <strong>${branch?.name || 'Sin Sucursal'}</strong>
                                                                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--spacing-xs); margin-top: 4px;">
                                                                    <div>Qty: ${stats.qty}</div>
                                                                    <div>Venta: ${Utils.formatCurrency(stats.revenue)}</div>
                                                                    <div style="color: ${stats.grossProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">
                                                                        Util. Bruta: ${Utils.formatCurrency(stats.grossProfit)} (${branchGrossMargin.toFixed(1)}%)
                                                                    </div>
                                                                    <div style="color: ${stats.netProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">
                                                                        Util. Neta: ${Utils.formatCurrency(stats.netProfit)} (${branchNetMargin.toFixed(1)}%)
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        `;
                                                    }).join('')}
                                                </div>
                                            </details>
                                        ` : ''}
                                    </td>
                                    <td style="text-align: right;">${product.qty}</td>
                                    <td style="text-align: right;">${product.weight.toFixed(2)}</td>
                                    <td style="text-align: right;">${Utils.formatCurrency(product.avgPrice)}</td>
                                    <td style="text-align: right;">${Utils.formatCurrency(product.avgCost)}</td>
                                    <td style="text-align: right; font-weight: 600;">${Utils.formatCurrency(product.revenue)}</td>
                                    <td style="text-align: right;">${Utils.formatCurrency(product.cost)}</td>
                                    <td style="text-align: right;">${Utils.formatCurrency(product.commissions)}</td>
                                    <td style="text-align: right; color: ${product.grossProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}; font-weight: 600;">
                                        ${Utils.formatCurrency(product.grossProfit)}
                                    </td>
                                    <td style="text-align: right; color: ${product.grossMargin >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">
                                        ${product.grossMargin.toFixed(1)}%
                                    </td>
                                    <td style="text-align: right; color: ${product.netProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}; font-weight: 600;">
                                        ${Utils.formatCurrency(product.netProfit)}
                                    </td>
                                    <td style="text-align: right; color: ${product.netMargin >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">
                                        ${product.netMargin.toFixed(1)}%
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr style="border-top: 2px solid var(--color-border); font-weight: 700;">
                                <td>TOTAL</td>
                                <td style="text-align: right;">${totals.qty}</td>
                                <td style="text-align: right;">${totals.weight.toFixed(2)}</td>
                                <td style="text-align: right;">-</td>
                                <td style="text-align: right;">-</td>
                                <td style="text-align: right;">${Utils.formatCurrency(totals.revenue)}</td>
                                <td style="text-align: right;">${Utils.formatCurrency(totals.cost)}</td>
                                <td style="text-align: right;">${Utils.formatCurrency(totals.commissions)}</td>
                                <td style="text-align: right; color: ${totals.grossProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">
                                    ${Utils.formatCurrency(totals.grossProfit)}
                                </td>
                                <td style="text-align: right;">${totalGrossMargin.toFixed(1)}%</td>
                                <td style="text-align: right; color: ${totals.netProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">
                                    ${Utils.formatCurrency(totals.netProfit)}
                                </td>
                                <td style="text-align: right;">${totalNetMargin.toFixed(1)}%</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        // Guardar datos para exportación
        window.currentReportData = {
            type: 'product_report',
            products: productData,
            totals,
            branchStats: showBranchBreakdown ? branchStats : null
        };
    },
    
    async comparePeriods() {
        // Intentar obtener fechas de la pestaña de comparación primero
        let dateFrom = document.getElementById('compare-period1-from')?.value;
        let dateTo = document.getElementById('compare-period1-to')?.value;
        let dateFrom2 = document.getElementById('compare-period2-from')?.value;
        let dateTo2 = document.getElementById('compare-period2-to')?.value;
        
        // Si no están en la pestaña de comparación, usar las del reporte principal
        if (!dateFrom || !dateTo) {
            dateFrom = document.getElementById('report-date-from')?.value;
            dateTo = document.getElementById('report-date-to')?.value;
        }
        
        if (!dateFrom || !dateTo) {
            Utils.showNotification('Selecciona un rango de fechas primero', 'error');
            return;
        }
        
        const container = document.getElementById('compare-results');
        if (!container) {
            Utils.showNotification('Error: contenedor no encontrado', 'error');
            return;
        }

        container.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin"></i> Comparando períodos...</div>';
        
        try {
            const fromDate = new Date(dateFrom);
            const toDate = new Date(dateTo);
            
            let prevFromDate, prevToDate;
            
            // Si hay un segundo período definido, usarlo; si no, calcular automáticamente
            if (dateFrom2 && dateTo2) {
                prevFromDate = new Date(dateFrom2);
                prevToDate = new Date(dateTo2);
            } else {
                const daysDiff = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));
                prevFromDate = new Date(fromDate);
                prevFromDate.setDate(prevFromDate.getDate() - daysDiff - 1);
                prevToDate = new Date(fromDate);
                prevToDate.setDate(prevToDate.getDate() - 1);
            }
            
            const prevFromStr = Utils.formatDate(prevFromDate, 'YYYY-MM-DD');
            const prevToStr = Utils.formatDate(prevToDate, 'YYYY-MM-DD');
            
            // Verificar si es master_admin
            const isMasterAdmin = typeof UserManager !== 'undefined' && (
                UserManager.currentUser?.role === 'master_admin' ||
                UserManager.currentUser?.is_master_admin ||
                UserManager.currentUser?.isMasterAdmin ||
                UserManager.currentEmployee?.role === 'master_admin'
            );
            
            // Obtener sucursal actual
            const currentBranchId = typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : null;
            
            // Obtener filtro de sucursal del dropdown (puede no existir)
            const branchFilterEl = document.getElementById('report-branch');
            const branchFilterValue = branchFilterEl?.value;
            
            // Determinar qué branch_id usar para el filtro
            let filterBranchId = null;
            if (branchFilterValue && branchFilterValue !== 'all' && branchFilterValue !== '') {
                filterBranchId = branchFilterValue;
            } else if (isMasterAdmin && (!branchFilterValue || branchFilterValue === 'all')) {
                filterBranchId = null;
            } else {
                filterBranchId = currentBranchId;
            }
            
            // Obtener ventas filtradas usando getFilteredSales
            const allSales = await this.getFilteredSales({ branchId: filterBranchId });
            
            let currentSales = allSales.filter(s => s.created_at >= dateFrom && s.created_at <= dateTo + 'T23:59:59');
            let previousSales = allSales.filter(s => s.created_at >= prevFromStr && s.created_at <= prevToStr + 'T23:59:59');
            
            const currentTotal = currentSales.reduce((sum, s) => sum + (s.total || 0), 0);
            const previousTotal = previousSales.reduce((sum, s) => sum + (s.total || 0), 0);
            const currentCount = currentSales.length;
            const previousCount = previousSales.length;
            const change = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal * 100) : 0;
            const countChange = previousCount > 0 ? ((currentCount - previousCount) / previousCount * 100) : 0;
            
            container.innerHTML = `
                <div style="width: 100%; max-width: 100%; box-sizing: border-box;">
                    <h3 style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: var(--spacing-md);">Comparativa de Períodos</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: var(--spacing-md); margin-bottom: var(--spacing-md); width: 100%; box-sizing: border-box;">
                        <div style="background: var(--color-bg-secondary); padding: var(--spacing-md); border-radius: var(--radius-md); min-width: 0; width: 100%; box-sizing: border-box;">
                            <h4 style="font-size: 12px; margin-bottom: var(--spacing-xs); font-weight: 600;">Período Actual</h4>
                            <div style="font-size: 24px; font-weight: 700; margin: var(--spacing-xs) 0; color: var(--color-primary);">
                                ${Utils.formatCurrency(currentTotal)}
                            </div>
                            <div style="color: var(--color-text-secondary); font-size: 11px; margin-bottom: var(--spacing-xs);">
                                ${currentCount} ventas
                            </div>
                            <div style="margin-top: var(--spacing-xs); font-size: 10px; color: var(--color-text-secondary);">
                                ${Utils.formatDate(dateFrom, 'DD/MM/YYYY')} - ${Utils.formatDate(dateTo, 'DD/MM/YYYY')}
                            </div>
                        </div>
                        <div style="background: var(--color-bg-secondary); padding: var(--spacing-md); border-radius: var(--radius-md); min-width: 0; width: 100%; box-sizing: border-box;">
                            <h4 style="font-size: 12px; margin-bottom: var(--spacing-xs); font-weight: 600;">Período Anterior</h4>
                            <div style="font-size: 24px; font-weight: 700; margin: var(--spacing-xs) 0; color: var(--color-text-secondary);">
                                ${Utils.formatCurrency(previousTotal)}
                            </div>
                            <div style="color: var(--color-text-secondary); font-size: 11px; margin-bottom: var(--spacing-xs);">
                                ${previousCount} ventas
                            </div>
                            <div style="margin-top: var(--spacing-xs); font-size: 10px; color: var(--color-text-secondary);">
                                ${Utils.formatDate(prevFromStr, 'DD/MM/YYYY')} - ${Utils.formatDate(prevToStr, 'DD/MM/YYYY')}
                            </div>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--spacing-md); width: 100%; box-sizing: border-box;">
                        <div style="background: ${change >= 0 ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)'}; 
                            padding: var(--spacing-md); border-radius: var(--radius-md);
                            border-left: 3px solid ${change >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}; min-width: 0; width: 100%; box-sizing: border-box;">
                            <div style="font-size: 11px; color: var(--color-text-secondary); margin-bottom: var(--spacing-xs);">Cambio en Ventas</div>
                            <div style="font-size: 20px; font-weight: 700; color: ${change >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">
                                ${change >= 0 ? '+' : ''}${change.toFixed(1)}%
                            </div>
                            <div style="color: var(--color-text-secondary); margin-top: var(--spacing-xs); font-size: 10px;">
                                Diferencia: ${Utils.formatCurrency(Math.abs(currentTotal - previousTotal))}
                            </div>
                        </div>
                        <div style="background: ${countChange >= 0 ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)'}; 
                            padding: var(--spacing-md); border-radius: var(--radius-md);
                            border-left: 3px solid ${countChange >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}; min-width: 0; width: 100%; box-sizing: border-box;">
                            <div style="font-size: 11px; color: var(--color-text-secondary); margin-bottom: var(--spacing-xs);">Cambio en Cantidad</div>
                            <div style="font-size: 20px; font-weight: 700; color: ${countChange >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">
                                ${countChange >= 0 ? '+' : ''}${countChange.toFixed(1)}%
                            </div>
                            <div style="color: var(--color-text-secondary); margin-top: var(--spacing-xs); font-size: 10px;">
                                Diferencia: ${Math.abs(currentCount - previousCount)} ventas
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch (e) {
            console.error('Error comparing periods:', e);
            container.innerHTML = `
                <div style="padding: var(--spacing-md); background: var(--color-danger); color: white; border-radius: var(--radius-md);">
                    <strong>Error:</strong> ${e.message}
                </div>
            `;
        }
    },

    async exportReport() {
        // Prevenir múltiples ejecuciones simultáneas
        if (this.isExporting) {
            console.warn('Exportación ya en progreso, ignorando llamada duplicada');
            return;
        }
        
        if (!window.currentReportData || (Array.isArray(window.currentReportData) && window.currentReportData.length === 0)) {
            Utils.showNotification('Genera un reporte primero', 'error');
            return;
        }
        
        this.isExporting = true;

        // Obtener información de contexto
        const dateFrom = document.getElementById('report-date-from')?.value;
        const dateTo = document.getElementById('report-date-to')?.value;
        const branchFilterEl = document.getElementById('report-branch');
        const branchFilterValue = branchFilterEl?.value || '';
        const isMasterAdmin = typeof UserManager !== 'undefined' && (
            UserManager.currentUser?.role === 'master_admin' ||
            UserManager.currentUser?.is_master_admin ||
            UserManager.currentUser?.isMasterAdmin ||
            UserManager.currentEmployee?.role === 'master_admin'
        );

        const branches = await DB.getAll('catalog_branches');
        const currentBranchId = typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : null;
        
        // Determinar nombre de sucursal para el archivo
        let branchNameForFile = 'Todas';
        if (branchFilterValue && branchFilterValue !== 'all' && branchFilterValue !== '') {
            const selectedBranch = branches.find(b => b.id === branchFilterValue);
            branchNameForFile = selectedBranch?.name || 'Sucursal';
        } else if (!isMasterAdmin) {
            const currentBranch = branches.find(b => b.id === currentBranchId);
            branchNameForFile = currentBranch?.name || 'Sucursal';
        }
        
        // Normalizar nombre de sucursal para archivo (sin espacios ni caracteres especiales)
        const branchNameNormalized = branchNameForFile.replace(/[^a-zA-Z0-9]/g, '_');
        
        // Generar nombre de archivo con fecha
        const dateStr = dateFrom && dateTo 
            ? `${Utils.formatDate(dateFrom, 'YYYYMMDD')}_${Utils.formatDate(dateTo, 'YYYYMMDD')}`
            : Utils.formatDate(new Date(), 'YYYYMMDD');
        
        // Si es reporte de productos, exportar datos de productos
        if (window.currentReportData.type === 'product_report') {
            const productData = window.currentReportData.products || [];
            const exportData = productData.map(product => ({
                Producto: product.name,
                SKU: product.sku || '',
                Cantidad: product.qty,
                'Peso Total (g)': product.weight.toFixed(2),
                'Precio Venta Promedio': product.avgPrice,
                'Precio Compra Promedio': product.avgCost,
                'Total Venta': product.revenue,
                'Total Costo': product.cost,
                'Comisiones': product.commissions,
                'Utilidad Bruta': product.grossProfit,
                'Margen Bruto (%)': product.grossMargin.toFixed(2),
                'Utilidad Neta': product.netProfit,
                'Margen Neto (%)': product.netMargin.toFixed(2)
            }));
            
            const formatOptions = [
                { value: '1', label: 'CSV' },
                { value: '2', label: 'Excel' },
                { value: '3', label: 'PDF' }
            ];
            const format = await Utils.select('Formato de exportación:', formatOptions, 'Exportar Reporte de Piezas');
            if (!format) return;
            
            const fileName = `Reporte_Piezas_Vendidas_${branchNameNormalized}_${dateStr}`;
            
            if (format === '1') {
                Utils.exportToCSV(exportData, `${fileName}.csv`);
            } else if (format === '2') {
                Utils.exportToExcel(exportData, `${fileName}.xlsx`, 'Piezas Vendidas');
            } else if (format === '3') {
                Utils.exportToPDF(exportData, `${fileName}.pdf`, 'Reporte de Piezas Vendidas');
            }
            
            Utils.showNotification('Reporte de piezas exportado', 'success');
            return;
        }

        // Reporte estándar de ventas
        const sellers = await DB.getAll('catalog_sellers');
        const agencies = await DB.getAll('catalog_agencies');
        const guides = await DB.getAll('catalog_guides');

        const exportData = window.currentReportData.map(sale => {
            const branch = branches.find(b => b.id === sale.branch_id);
            const seller = sellers.find(s => s.id === sale.seller_id);
            const agency = agencies.find(a => a.id === sale.agency_id);
            const guide = guides.find(g => g.id === sale.guide_id);
            return {
                Folio: sale.folio,
                Fecha: Utils.formatDate(sale.created_at, 'DD/MM/YYYY'),
                Sucursal: branch?.name || '',
                Vendedor: seller?.name || '',
                Agencia: agency?.name || '',
                Guía: guide?.name || '',
                Pasajeros: sale.passengers || 1,
                Total: sale.total,
                Estado: sale.status
            };
        });

        const formatOptions = [
            { value: '1', label: 'CSV' },
            { value: '2', label: 'Excel' },
            { value: '3', label: 'PDF' }
        ];
        const format = await Utils.select('Formato de exportación:', formatOptions, 'Exportar Reporte');
        if (!format) return;
        
        const fileName = `Reporte_Ventas_${branchNameNormalized}_${dateStr}`;
        
        if (format === '1') {
            Utils.exportToCSV(exportData, `${fileName}.csv`);
        } else if (format === '2') {
            Utils.exportToExcel(exportData, `${fileName}.xlsx`, 'Reporte Ventas');
        } else if (format === '3') {
            Utils.exportToPDF(exportData, `${fileName}.pdf`, 'Reporte de Ventas');
        }
        
        Utils.showNotification('Reporte exportado', 'success');
    },
    
    updateExportComparativeButton() {
        const isMasterAdmin = typeof UserManager !== 'undefined' && (
            UserManager.currentUser?.role === 'master_admin' ||
            UserManager.currentUser?.is_master_admin ||
            UserManager.currentUser?.isMasterAdmin ||
            UserManager.currentEmployee?.role === 'master_admin'
        );
        
        const exportComparativeBtn = document.getElementById('export-comparative-btn');
        const branchFilterEl = document.getElementById('report-branch');
        
        if (exportComparativeBtn && branchFilterEl) {
            const branchFilterValue = branchFilterEl.value || '';
            const showButton = isMasterAdmin && (branchFilterValue === 'all' || !branchFilterValue);
            exportComparativeBtn.style.display = showButton ? 'inline-flex' : 'none';
        }
    },
    
    async exportComparativeReport() {
        // Verificar si es master_admin
        const isMasterAdmin = typeof UserManager !== 'undefined' && (
            UserManager.currentUser?.role === 'master_admin' ||
            UserManager.currentUser?.is_master_admin ||
            UserManager.currentUser?.isMasterAdmin ||
            UserManager.currentEmployee?.role === 'master_admin'
        );
        
        if (!isMasterAdmin) {
            Utils.showNotification('Solo los administradores pueden exportar reportes comparativos', 'error');
            return;
        }
        
        const dateFrom = document.getElementById('report-date-from')?.value;
        const dateTo = document.getElementById('report-date-to')?.value;
        const branchFilterEl = document.getElementById('report-branch');
        const branchFilterValue = branchFilterEl?.value || '';
        
        // Obtener todas las sucursales para comparación
        const branches = await DB.getAll('catalog_branches') || [];
        
        if (branchFilterValue && branchFilterValue !== 'all') {
            Utils.showNotification('Selecciona "Todas las sucursales" para exportar reporte comparativo', 'warning');
            return;
        }
        
        if (!dateFrom || !dateTo) {
            Utils.showNotification('Selecciona un rango de fechas', 'error');
            return;
        }
        
        try {
            // Obtener ventas de todas las sucursales
            const allSales = await this.getFilteredSales({ 
                branchId: null // Todas las sucursales
            });
            
            const filteredSales = allSales.filter(sale => {
                const saleDate = sale.created_at?.split('T')[0];
                return saleDate >= dateFrom && saleDate <= dateTo && (typeof Utils !== 'undefined' && Utils.isSaleCompleted ? Utils.isSaleCompleted(sale) : (sale.status === 'completada' || sale.status === 'completed'));
            });
            
            // Agrupar por sucursal
            const branchStats = {};
            filteredSales.forEach(sale => {
                const branchId = sale.branch_id || 'sin_sucursal';
                if (!branchStats[branchId]) {
                    branchStats[branchId] = {
                        sales: [],
                        total: 0,
                        count: 0,
                        passengers: 0
                    };
                }
                branchStats[branchId].sales.push(sale);
                branchStats[branchId].total += sale.total || 0;
                branchStats[branchId].count += 1;
                branchStats[branchId].passengers += sale.passengers || 1;
            });
            
            // Preparar datos para exportación
            const comparativeData = [];
            const sellers = await DB.getAll('catalog_sellers') || [];
            const agencies = await DB.getAll('catalog_agencies') || [];
            const guides = await DB.getAll('catalog_guides') || [];
            
            // Hoja 1: Resumen por Sucursal
            const summarySheet = Object.entries(branchStats).map(([branchId, stats]) => {
                const branch = branches.find(b => b.id === branchId);
                const avgTicket = stats.passengers > 0 ? stats.total / stats.passengers : 0;
                const closeRate = stats.passengers > 0 ? (stats.count / stats.passengers) * 100 : 0;
                
                return {
                    Sucursal: branch?.name || 'Sin Sucursal',
                    'Total Ventas': stats.total,
                    'Número de Ventas': stats.count,
                    'Total Pasajeros': stats.passengers,
                    'Ticket Promedio': avgTicket,
                    '% Cierre': closeRate.toFixed(2)
                };
            }).sort((a, b) => b['Total Ventas'] - a['Total Ventas']);
            
            // Hoja 2: Detalle de Ventas por Sucursal
            const detailSheet = [];
            Object.entries(branchStats).forEach(([branchId, stats]) => {
                const branch = branches.find(b => b.id === branchId);
                stats.sales.forEach(sale => {
                    const seller = sellers.find(s => s.id === sale.seller_id);
                    const agency = agencies.find(a => a.id === sale.agency_id);
                    const guide = guides.find(g => g.id === sale.guide_id);
                    
                    detailSheet.push({
                        Sucursal: branch?.name || 'Sin Sucursal',
                        Folio: sale.folio,
                        Fecha: Utils.formatDate(sale.created_at, 'DD/MM/YYYY'),
                        Vendedor: seller?.name || '',
                        Agencia: agency?.name || '',
                        Guía: guide?.name || '',
                        Pasajeros: sale.passengers || 1,
                        Total: sale.total,
                        Estado: sale.status
                    });
                });
            });
            
            // Ordenar por sucursal y fecha
            detailSheet.sort((a, b) => {
                const branchCompare = a.Sucursal.localeCompare(b.Sucursal);
                if (branchCompare !== 0) return branchCompare;
                return a.Fecha.localeCompare(b.Fecha);
            });
            
            const formatOptions = [
                { value: '1', label: 'Excel (Múltiples Hojas)' },
                { value: '2', label: 'CSV (Resumen)' },
                { value: '3', label: 'CSV (Detalle)' }
            ];
            const format = await Utils.select('Formato de exportación:', formatOptions, 'Exportar Reporte Comparativo');
            if (!format) return;
            
            const dateStr = `${Utils.formatDate(dateFrom, 'YYYYMMDD')}_${Utils.formatDate(dateTo, 'YYYYMMDD')}`;
            
            if (format === '1') {
                // Excel con múltiples hojas
                if (typeof Utils !== 'undefined' && Utils.exportToExcelMultiSheet) {
                    Utils.exportToExcelMultiSheet([
                        { name: 'Resumen por Sucursal', data: summarySheet },
                        { name: 'Detalle de Ventas', data: detailSheet }
                    ], `Reporte_Comparativo_Sucursales_${dateStr}.xlsx`);
                } else {
                    // Fallback: exportar resumen y detalle por separado
                    Utils.exportToExcel(summarySheet, `Reporte_Comparativo_Resumen_${dateStr}.xlsx`, 'Resumen por Sucursal');
                    setTimeout(() => {
                        Utils.exportToExcel(detailSheet, `Reporte_Comparativo_Detalle_${dateStr}.xlsx`, 'Detalle de Ventas');
                    }, 500);
                }
            } else if (format === '2') {
                Utils.exportToCSV(summarySheet, `Reporte_Comparativo_Resumen_${dateStr}.csv`);
            } else if (format === '3') {
                Utils.exportToCSV(detailSheet, `Reporte_Comparativo_Detalle_${dateStr}.csv`);
            }
            
            Utils.showNotification('Reporte comparativo exportado', 'success');
        } catch (error) {
            console.error('Error exportando reporte comparativo:', error);
            Utils.showNotification('Error al exportar reporte comparativo', 'error');
        }
    },

    // ========================================
    // FUNCIONALIDADES AVANZADAS REPORTES
    // ========================================

    async generateAdvancedAnalytics() {
        // Verificar si es master_admin
        const isMasterAdmin = typeof UserManager !== 'undefined' && (
            UserManager.currentUser?.role === 'master_admin' ||
            UserManager.currentUser?.is_master_admin ||
            UserManager.currentUser?.isMasterAdmin ||
            UserManager.currentEmployee?.role === 'master_admin'
        );
        
        // Obtener sucursal actual
        const currentBranchId = typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : null;
        
        // Obtener filtro de sucursal del dropdown (puede no existir)
        const branchFilterEl = document.getElementById('report-branch');
        const branchFilterValue = branchFilterEl?.value;
        
        // Determinar qué branch_id usar para el filtro
        let filterBranchId = null;
        if (branchFilterValue && branchFilterValue !== 'all' && branchFilterValue !== '') {
            filterBranchId = branchFilterValue;
        } else if (isMasterAdmin && (!branchFilterValue || branchFilterValue === 'all')) {
            filterBranchId = null;
        } else {
            filterBranchId = currentBranchId;
        }
        
        // Obtener ventas filtradas usando getFilteredSales
        const sales = await this.getFilteredSales({ branchId: filterBranchId });
        const completedSales = sales.filter(s => (typeof Utils !== 'undefined' && Utils.isSaleCompleted ? Utils.isSaleCompleted(s) : (s.status === 'completada' || s.status === 'completed')));
        
        // Análisis de tendencias
        const trends = this.analyzeTrends(completedSales);
        
        // Análisis de productos (pasar filterBranchId)
        const productAnalysis = await this.analyzeProducts(filterBranchId);
        
        // Análisis de clientes (pasar filterBranchId)
        const customerAnalysis = await this.analyzeCustomers(filterBranchId);
        
        // Análisis de rentabilidad (pasar filterBranchId)
        const profitability = await this.analyzeProfitability(filterBranchId);

        // Mostrar en la pestaña de análisis si está disponible
        const analysisContainer = document.getElementById('analysis-results');
        if (analysisContainer) {
            analysisContainer.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--spacing-md); width: 100%; max-width: 100%; box-sizing: border-box;">
                    <div style="min-width: 0; width: 100%; box-sizing: border-box;">
                        <h4 style="margin-bottom: var(--spacing-sm); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Análisis de Tendencias</h4>
                        <div style="background: var(--color-bg-secondary); padding: var(--spacing-md); border-radius: var(--radius-md); margin-bottom: var(--spacing-md); width: 100%; box-sizing: border-box;">
                            <div style="margin-bottom: var(--spacing-sm);">
                                <div style="font-size: 11px; color: var(--color-text-secondary);">Tendencia General</div>
                                <div style="font-size: 18px; font-weight: 700; color: ${trends.general === 'creciente' ? 'var(--color-success)' : trends.general === 'decreciente' ? 'var(--color-danger)' : 'var(--color-warning)'};">
                                    ${trends.general === 'creciente' ? '↗ Creciente' : trends.general === 'decreciente' ? '↘ Decreciente' : '→ Estable'}
                                </div>
                            </div>
                            <div style="margin-bottom: var(--spacing-sm);">
                                <div style="font-size: 11px; color: var(--color-text-secondary);">Crecimiento Mensual</div>
                                <div style="font-size: 16px; font-weight: 600;">${trends.monthlyGrowth.toFixed(1)}%</div>
                            </div>
                        </div>

                        <h4 style="margin-bottom: var(--spacing-sm); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Análisis de Rentabilidad</h4>
                        <div style="background: var(--color-bg-secondary); padding: var(--spacing-md); border-radius: var(--radius-md); width: 100%; box-sizing: border-box;">
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--spacing-sm);">
                                <div style="min-width: 0;">
                                    <div style="font-size: 11px; color: var(--color-text-secondary);">Margen Bruto</div>
                                    <div style="font-size: 18px; font-weight: 700;">${profitability.grossMargin.toFixed(1)}%</div>
                                </div>
                                <div style="min-width: 0;">
                                    <div style="font-size: 11px; color: var(--color-text-secondary);">ROI Estimado</div>
                                    <div style="font-size: 18px; font-weight: 700;">${profitability.roi.toFixed(1)}%</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style="min-width: 0; width: 100%; box-sizing: border-box;">
                        <h4 style="margin-bottom: var(--spacing-sm); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Top Productos</h4>
                        <div style="background: var(--color-bg-secondary); padding: var(--spacing-md); border-radius: var(--radius-md); margin-bottom: var(--spacing-md); width: 100%; box-sizing: border-box;">
                            ${productAnalysis.topProducts.slice(0, 5).map((product, idx) => `
                                <div style="display: flex; justify-content: space-between; padding: var(--spacing-xs) 0; border-bottom: 1px solid var(--color-border-light); min-width: 0;">
                                    <div style="min-width: 0; overflow: hidden; text-overflow: ellipsis;">
                                        <span style="font-weight: 600; color: var(--color-primary);">#${idx + 1}</span>
                                        <span style="margin-left: var(--spacing-xs);">${product.name}</span>
                                    </div>
                                    <div style="white-space: nowrap; margin-left: var(--spacing-xs);">
                                        <span style="font-weight: 600;">${Utils.formatCurrency(product.revenue)}</span>
                                        <span style="color: var(--color-text-secondary); margin-left: var(--spacing-xs); font-size: 11px;">${product.count}x</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>

                        <h4 style="margin-bottom: var(--spacing-sm); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Segmentación de Clientes</h4>
                        <div style="background: var(--color-bg-secondary); padding: var(--spacing-md); border-radius: var(--radius-md); width: 100%; box-sizing: border-box;">
                            ${Object.entries(customerAnalysis.segments).map(([segment, data]) => `
                                <div style="display: flex; justify-content: space-between; padding: var(--spacing-xs) 0; border-bottom: 1px solid var(--color-border-light); min-width: 0;">
                                    <div style="min-width: 0; overflow: hidden; text-overflow: ellipsis;">
                                        <strong>${segment}</strong>
                                        <div style="font-size: 10px; color: var(--color-text-secondary);">${data.count} clientes</div>
                                    </div>
                                    <div style="text-align: right; white-space: nowrap; margin-left: var(--spacing-xs);">
                                        <div style="font-weight: 600;">${Utils.formatCurrency(data.revenue)}</div>
                                        <div style="font-size: 10px; color: var(--color-text-secondary);">${data.percentage.toFixed(1)}%</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <div style="margin-top: var(--spacing-md); display: flex; gap: var(--spacing-sm); flex-wrap: wrap;">
                    <button class="btn-secondary" onclick="window.Reports.exportAdvancedAnalytics()" style="white-space: nowrap;">
                        <i class="fas fa-download"></i> Exportar Análisis
                    </button>
                </div>
            `;
            return;
        }

        // Si no hay pestaña de análisis, mostrar modal
        const body = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--spacing-md); width: 100%; max-width: 100%; box-sizing: border-box;">
                <div style="min-width: 0; width: 100%; box-sizing: border-box;">
                    <h4 style="margin-bottom: var(--spacing-sm); font-size: 13px; font-weight: 600;">Análisis de Tendencias</h4>
                    <div style="background: var(--color-bg-secondary); padding: var(--spacing-md); border-radius: var(--radius-md); margin-bottom: var(--spacing-md); width: 100%; box-sizing: border-box;">
                        <div style="margin-bottom: var(--spacing-sm);">
                            <div style="font-size: 11px; color: var(--color-text-secondary);">Tendencia General</div>
                            <div style="font-size: 18px; font-weight: 700; color: ${trends.general === 'creciente' ? 'var(--color-success)' : trends.general === 'decreciente' ? 'var(--color-danger)' : 'var(--color-warning)'};">
                                ${trends.general === 'creciente' ? '↗ Creciente' : trends.general === 'decreciente' ? '↘ Decreciente' : '→ Estable'}
                            </div>
                        </div>
                        <div style="margin-bottom: var(--spacing-sm);">
                            <div style="font-size: 11px; color: var(--color-text-secondary);">Crecimiento Mensual</div>
                            <div style="font-size: 16px; font-weight: 600;">${trends.monthlyGrowth.toFixed(1)}%</div>
                        </div>
                    </div>

                    <h4 style="margin-bottom: var(--spacing-sm); font-size: 13px; font-weight: 600;">Análisis de Rentabilidad</h4>
                    <div style="background: var(--color-bg-secondary); padding: var(--spacing-md); border-radius: var(--radius-md); width: 100%; box-sizing: border-box;">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--spacing-sm);">
                            <div style="min-width: 0;">
                                <div style="font-size: 11px; color: var(--color-text-secondary);">Margen Bruto</div>
                                <div style="font-size: 18px; font-weight: 700;">${profitability.grossMargin.toFixed(1)}%</div>
                            </div>
                            <div style="min-width: 0;">
                                <div style="font-size: 11px; color: var(--color-text-secondary);">ROI Estimado</div>
                                <div style="font-size: 18px; font-weight: 700;">${profitability.roi.toFixed(1)}%</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="min-width: 0; width: 100%; box-sizing: border-box;">
                    <h4 style="margin-bottom: var(--spacing-sm); font-size: 13px; font-weight: 600;">Top Productos</h4>
                    <div style="background: var(--color-bg-secondary); padding: var(--spacing-md); border-radius: var(--radius-md); margin-bottom: var(--spacing-md); width: 100%; box-sizing: border-box;">
                        ${productAnalysis.topProducts.slice(0, 5).map((product, idx) => `
                            <div style="display: flex; justify-content: space-between; padding: var(--spacing-xs) 0; border-bottom: 1px solid var(--color-border-light); min-width: 0;">
                                <div style="min-width: 0; overflow: hidden; text-overflow: ellipsis;">
                                    <span style="font-weight: 600; color: var(--color-primary);">#${idx + 1}</span>
                                    <span style="margin-left: var(--spacing-xs);">${product.name}</span>
                                </div>
                                <div style="white-space: nowrap; margin-left: var(--spacing-xs);">
                                    <span style="font-weight: 600;">${Utils.formatCurrency(product.revenue)}</span>
                                    <span style="color: var(--color-text-secondary); margin-left: var(--spacing-xs); font-size: 11px;">${product.count}x</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <h4 style="margin-bottom: var(--spacing-sm); font-size: 13px; font-weight: 600;">Segmentación de Clientes</h4>
                    <div style="background: var(--color-bg-secondary); padding: var(--spacing-md); border-radius: var(--radius-md); width: 100%; box-sizing: border-box;">
                        ${Object.entries(customerAnalysis.segments).map(([segment, data]) => `
                            <div style="display: flex; justify-content: space-between; padding: var(--spacing-xs) 0; border-bottom: 1px solid var(--color-border-light); min-width: 0;">
                                <div style="min-width: 0; overflow: hidden; text-overflow: ellipsis;">
                                    <strong>${segment}</strong>
                                    <div style="font-size: 10px; color: var(--color-text-secondary);">${data.count} clientes</div>
                                </div>
                                <div style="text-align: right; white-space: nowrap; margin-left: var(--spacing-xs);">
                                    <div style="font-weight: 600;">${Utils.formatCurrency(data.revenue)}</div>
                                    <div style="font-size: 10px; color: var(--color-text-secondary);">${data.percentage.toFixed(1)}%</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        UI.showModal('Análisis Avanzado', body, [
            { text: 'Exportar', class: 'btn-secondary', onclick: () => this.exportAdvancedAnalytics() },
            { text: 'Cerrar', class: 'btn-primary', onclick: () => UI.closeModal() }
        ]);
    },

    analyzeTrends(sales) {
        const monthlyData = {};
        sales.forEach(sale => {
            const date = new Date(sale.created_at);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { count: 0, total: 0 };
            }
            monthlyData[monthKey].count += 1;
            monthlyData[monthKey].total += sale.total || 0;
        });

        const sortedMonths = Object.entries(monthlyData)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-3);

        if (sortedMonths.length < 2) {
            return { general: 'estable', monthlyGrowth: 0 };
        }

        const lastMonth = sortedMonths[sortedMonths.length - 1][1].total;
        const prevMonth = sortedMonths[sortedMonths.length - 2][1].total;
        const growth = prevMonth > 0 ? ((lastMonth - prevMonth) / prevMonth) * 100 : 0;

        return {
            general: growth > 5 ? 'creciente' : growth < -5 ? 'decreciente' : 'estable',
            monthlyGrowth: growth
        };
    },

    async analyzeProducts(filterBranchId = null) {
        // Verificar si es master_admin
        const isMasterAdmin = typeof UserManager !== 'undefined' && (
            UserManager.currentUser?.role === 'master_admin' ||
            UserManager.currentUser?.is_master_admin ||
            UserManager.currentUser?.isMasterAdmin ||
            UserManager.currentEmployee?.role === 'master_admin'
        );
        
        // Obtener ventas filtradas usando getFilteredSales
        const sales = await this.getFilteredSales({ branchId: filterBranchId });
        const saleItems = await DB.getAll('sale_items');
        
        // Obtener items filtrados por sucursal
        const viewAllBranches = !filterBranchId && isMasterAdmin;
        const items = await DB.getAll('inventory_items', null, null, { 
            filterByBranch: !viewAllBranches, 
            branchIdField: 'branch_id' 
        }) || [];
        
        // Si hay filtro específico, filtrar manualmente también
        if (filterBranchId) {
            const normalizedBranchId = String(filterBranchId);
            const filteredItems = items.filter(i => {
                // CRÍTICO: Excluir items sin branch_id cuando se filtra por sucursal específica
                if (!i.branch_id) {
                    return false; // NO mostrar items sin branch_id
                }
                return String(i.branch_id) === normalizedBranchId;
            });
            // Usar items filtrados para el análisis
            items.splice(0, items.length, ...filteredItems);
        }
        
        const productStats = {};
        sales.filter(s => (typeof Utils !== 'undefined' && Utils.isSaleCompleted ? Utils.isSaleCompleted(s) : (s.status === 'completada' || s.status === 'completed'))).forEach(sale => {
            const itemsForSale = saleItems.filter(si => si.sale_id === sale.id);
            itemsForSale.forEach(si => {
                const item = items.find(i => i.id === si.item_id);
                if (item) {
                    if (!productStats[item.id]) {
                        productStats[item.id] = { name: item.name, count: 0, revenue: 0 };
                    }
                    productStats[item.id].count += si.quantity || 1;
                    productStats[item.id].revenue += (si.price || 0) * (si.quantity || 1);
                }
            });
        });

        return {
            topProducts: Object.values(productStats).sort((a, b) => b.revenue - a.revenue).slice(0, 10)
        };
    },

    async analyzeCustomers(filterBranchId = null) {
        // Verificar si es master_admin
        const isMasterAdmin = typeof UserManager !== 'undefined' && (
            UserManager.currentUser?.role === 'master_admin' ||
            UserManager.currentUser?.is_master_admin ||
            UserManager.currentUser?.isMasterAdmin ||
            UserManager.currentEmployee?.role === 'master_admin'
        );
        
        // Obtener clientes filtrados
        const viewAllBranches = !filterBranchId && isMasterAdmin;
        let customers = await DB.getAll('customers', null, null, { 
            filterByBranch: !viewAllBranches, 
            branchIdField: 'branch_id' 
        }) || [];
        
        // Si hay filtro específico, filtrar manualmente también
        if (filterBranchId) {
            const normalizedBranchId = String(filterBranchId);
            customers = customers.filter(c => {
                // CRÍTICO: Excluir clientes sin branch_id cuando se filtra por sucursal específica
                if (!c.branch_id) {
                    return false; // NO mostrar clientes sin branch_id
                }
                return String(c.branch_id) === normalizedBranchId;
            });
        }
        
        // Obtener ventas filtradas usando getFilteredSales
        const sales = await this.getFilteredSales({ branchId: filterBranchId });
        
        const segments = { VIP: { count: 0, revenue: 0 }, Premium: { count: 0, revenue: 0 }, Regular: { count: 0, revenue: 0 }, Ocasional: { count: 0, revenue: 0 } };
        
        customers.forEach(customer => {
            const customerSales = sales.filter(s => s.customer_id === customer.id && (typeof Utils !== 'undefined' && Utils.isSaleCompleted ? Utils.isSaleCompleted(s) : (s.status === 'completada' || s.status === 'completed')));
            const totalSpent = customerSales.reduce((sum, s) => sum + (s.total || 0), 0);
            const segment = this.calculateCustomerSegment(totalSpent, customerSales.length);
            
            if (segments[segment]) {
                segments[segment].count += 1;
                segments[segment].revenue += totalSpent;
            }
        });

        const totalRevenue = Object.values(segments).reduce((sum, s) => sum + s.revenue, 0);
        Object.keys(segments).forEach(segment => {
            segments[segment].percentage = totalRevenue > 0 ? (segments[segment].revenue / totalRevenue) * 100 : 0;
        });

        return { segments };
    },

    calculateCustomerSegment(totalSpent, purchaseCount) {
        if (purchaseCount === 0) return 'Ocasional';
        if (totalSpent >= 50000 && purchaseCount >= 5) return 'VIP';
        if (totalSpent >= 20000 && purchaseCount >= 3) return 'Premium';
        if (totalSpent >= 5000) return 'Regular';
        return 'Ocasional';
    },

    async analyzeProfitability(filterBranchId = null) {
        // Verificar si es master_admin
        const isMasterAdmin = typeof UserManager !== 'undefined' && (
            UserManager.currentUser?.role === 'master_admin' ||
            UserManager.currentUser?.is_master_admin ||
            UserManager.currentUser?.isMasterAdmin ||
            UserManager.currentEmployee?.role === 'master_admin'
        );
        
        // Obtener ventas filtradas usando getFilteredSales
        const sales = await this.getFilteredSales({ branchId: filterBranchId });
        const completedSales = sales.filter(s => (typeof Utils !== 'undefined' && Utils.isSaleCompleted ? Utils.isSaleCompleted(s) : (s.status === 'completada' || s.status === 'completed')));
        const totalRevenue = completedSales.reduce((sum, s) => sum + (s.total || 0), 0);
        
        // Obtener costos filtrados
        const viewAllBranches = !filterBranchId && isMasterAdmin;
        let costs = [];
        if (typeof Costs !== 'undefined' && Costs.getFilteredCosts) {
            costs = await Costs.getFilteredCosts({ branchId: filterBranchId });
        } else {
            costs = await DB.getAll('cost_entries', null, null, { 
                filterByBranch: !viewAllBranches, 
                branchIdField: 'branch_id' 
            }) || [];
            
            // Si hay filtro específico, filtrar manualmente también
            if (filterBranchId) {
                const normalizedBranchId = String(filterBranchId);
                costs = costs.filter(c => {
                    // CRÍTICO: Excluir costos sin branch_id cuando se filtra por sucursal específica
                    if (!c.branch_id) {
                        return false; // NO mostrar costos sin branch_id
                    }
                    return String(c.branch_id) === normalizedBranchId;
                });
            }
        }
        
        const totalCosts = costs.reduce((sum, c) => sum + (c.amount || 0), 0);
        
        const grossProfit = totalRevenue - totalCosts;
        const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
        const roi = totalCosts > 0 ? (grossProfit / totalCosts) * 100 : 0;

        return { grossMargin, roi, grossProfit, totalRevenue, totalCosts };
    },

    async exportAdvancedAnalytics() {
        // Verificar si es master_admin
        const isMasterAdmin = typeof UserManager !== 'undefined' && (
            UserManager.currentUser?.role === 'master_admin' ||
            UserManager.currentUser?.is_master_admin ||
            UserManager.currentUser?.isMasterAdmin ||
            UserManager.currentEmployee?.role === 'master_admin'
        );
        
        // Obtener sucursal actual
        const currentBranchId = typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : null;
        
        // Obtener filtro de sucursal del dropdown (puede no existir)
        const branchFilterEl = document.getElementById('report-branch');
        const branchFilterValue = branchFilterEl?.value;
        
        // Determinar qué branch_id usar para el filtro
        let filterBranchId = null;
        if (branchFilterValue && branchFilterValue !== 'all' && branchFilterValue !== '') {
            filterBranchId = branchFilterValue;
        } else if (isMasterAdmin && (!branchFilterValue || branchFilterValue === 'all')) {
            filterBranchId = null;
        } else {
            filterBranchId = currentBranchId;
        }
        
        // Obtener ventas filtradas usando getFilteredSales
        const sales = await this.getFilteredSales({ branchId: filterBranchId });
        const completedSales = sales.filter(s => (typeof Utils !== 'undefined' && Utils.isSaleCompleted ? Utils.isSaleCompleted(s) : (s.status === 'completada' || s.status === 'completed')));
        
        const analytics = {
            trends: this.analyzeTrends(completedSales),
            products: await this.analyzeProducts(filterBranchId),
            customers: await this.analyzeCustomers(filterBranchId),
            profitability: await this.analyzeProfitability(filterBranchId)
        };

        const exportData = [{
            'Análisis': 'Tendencias',
            'Tendencia General': analytics.trends.general,
            'Crecimiento Mensual': `${analytics.trends.monthlyGrowth.toFixed(1)}%`,
            'Margen Bruto': `${analytics.profitability.grossMargin.toFixed(1)}%`,
            'ROI': `${analytics.profitability.roi.toFixed(1)}%`
        }];

        Utils.exportToExcel(exportData, `analisis_avanzado_${Utils.formatDate(new Date(), 'YYYYMMDD')}.xlsx`, 'Análisis Avanzado');
        Utils.showNotification('Análisis exportado', 'success');
    },

    async getCommissionsTab() {
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - today.getDay());
        const dateFrom = Utils.formatDate(weekStart, 'YYYY-MM-DD');
        const dateTo = Utils.formatDate(today, 'YYYY-MM-DD');
        
        return `
            <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border-light); margin-bottom: var(--spacing-lg);">
                <h3 style="margin-bottom: var(--spacing-md); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                    <i class="fas fa-filter"></i> Filtros de Comisiones
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--spacing-md); width: 100%; box-sizing: border-box;">
                    <div class="form-group" style="min-width: 0;">
                        <label>Fecha Desde</label>
                        <input type="date" id="commissions-date-from" class="form-input" value="${dateFrom}" style="width: 100%;">
                    </div>
                    <div class="form-group" style="min-width: 0;">
                        <label>Fecha Hasta</label>
                        <input type="date" id="commissions-date-to" class="form-input" value="${dateTo}" style="width: 100%;">
                    </div>
                    <div class="form-group" style="min-width: 0;">
                        <label>Rango Predefinido</label>
                        <select id="commissions-preset-range" class="form-select" style="width: 100%;">
                            <option value="">Personalizado</option>
                            <option value="today">Hoy</option>
                            <option value="yesterday">Ayer</option>
                            <option value="week" selected>Esta Semana</option>
                            <option value="lastweek">Semana Pasada</option>
                            <option value="month">Este Mes</option>
                            <option value="lastmonth">Mes Pasado</option>
                            <option value="quarter">Este Trimestre</option>
                            <option value="year">Este Año</option>
                        </select>
                    </div>
                    <div class="form-group" style="min-width: 0;">
                        <label>Sucursal</label>
                        <select id="commissions-branch" class="form-select" style="width: 100%;">
                            <option value="all">Todas las sucursales</option>
                        </select>
                    </div>
                    <div class="form-group" style="min-width: 0;">
                        <label>Vendedor</label>
                        <select id="commissions-seller" class="form-select" style="width: 100%;">
                            <option value="">Todos</option>
                        </select>
                    </div>
                    <div class="form-group" style="min-width: 0;">
                        <label>Guía</label>
                        <select id="commissions-guide" class="form-select" style="width: 100%;">
                            <option value="">Todos</option>
                        </select>
                    </div>
                </div>
                <div style="margin-top: var(--spacing-md); display: flex; gap: var(--spacing-sm); flex-wrap: wrap; width: 100%;">
                    <button class="btn-primary btn-sm" onclick="window.Reports.generateCommissionsReport()">
                        <i class="fas fa-percent"></i> Generar Reporte de Comisiones
                    </button>
                    <button class="btn-secondary btn-sm" onclick="window.Reports.exportCommissionsReport()">
                        <i class="fas fa-file-excel"></i> Exportar Excel
                    </button>
                    <button class="btn-secondary btn-sm" onclick="window.Reports.exportCommissionsPDF()">
                        <i class="fas fa-file-pdf"></i> Exportar PDF
                    </button>
                </div>
            </div>
            <div id="commissions-results" style="width: 100%; max-width: 100%; box-sizing: border-box;"></div>
        `;
    },

    async getCompareTab() {
        const today = new Date();
        const thirtyDaysAgo = new Date(Date.now() - 30*24*60*60*1000);
        const dateFrom = Utils.formatDate(thirtyDaysAgo, 'YYYY-MM-DD');
        const dateTo = Utils.formatDate(today, 'YYYY-MM-DD');
        
        return `
            <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border-light); margin-bottom: var(--spacing-lg);">
                <h3 style="margin-bottom: var(--spacing-md); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                    <i class="fas fa-balance-scale"></i> Comparativa de Períodos
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--spacing-md); width: 100%; box-sizing: border-box;">
                    <div class="form-group" style="min-width: 0;">
                        <label>Período 1 - Desde</label>
                        <input type="date" id="compare-period1-from" class="form-input" value="${dateFrom}" style="width: 100%;">
                    </div>
                    <div class="form-group" style="min-width: 0;">
                        <label>Período 1 - Hasta</label>
                        <input type="date" id="compare-period1-to" class="form-input" value="${dateTo}" style="width: 100%;">
                    </div>
                    <div class="form-group" style="min-width: 0;">
                        <label>Período 2 - Desde (Opcional)</label>
                        <input type="date" id="compare-period2-from" class="form-input" style="width: 100%;">
                    </div>
                    <div class="form-group" style="min-width: 0;">
                        <label>Período 2 - Hasta (Opcional)</label>
                        <input type="date" id="compare-period2-to" class="form-input" style="width: 100%;">
                    </div>
                </div>
                <div style="margin-top: var(--spacing-md); display: flex; gap: var(--spacing-sm); flex-wrap: wrap; width: 100%;">
                    <button class="btn-primary btn-sm" onclick="window.Reports.comparePeriods()">
                        <i class="fas fa-balance-scale"></i> Comparar Períodos
                    </button>
                </div>
                <div style="margin-top: var(--spacing-md); padding: var(--spacing-sm); background: var(--color-bg-secondary); border-radius: var(--radius-sm); font-size: 12px; color: var(--color-text-secondary);">
                    <i class="fas fa-info-circle"></i> Si no especificas el Período 2, se comparará automáticamente con el período anterior de igual duración.
                </div>
            </div>
            <div id="compare-results" style="width: 100%; max-width: 100%; box-sizing: border-box;"></div>
        `;
    },

    async loadCommissionsCatalogs() {
        const branches = await DB.getAll('catalog_branches');
        const sellers = await DB.getAll('catalog_sellers');
        const guides = await DB.getAll('catalog_guides');

        const branchSelect = document.getElementById('commissions-branch');
        const sellerSelect = document.getElementById('commissions-seller');
        const guideSelect = document.getElementById('commissions-guide');

        if (branchSelect) {
            branchSelect.innerHTML = '<option value="all">Todas las sucursales</option>' + branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
            // Configurar filtro de sucursal para master_admin
            await this.setupBranchFilter('commissions-branch');
        }
        if (sellerSelect) {
            sellerSelect.innerHTML = '<option value="">Todos</option>' + sellers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        }
        if (guideSelect) {
            guideSelect.innerHTML = '<option value="">Todos</option>' + guides.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
        }
    },

    setupCommissionsPresetRanges() {
        const presetSelect = document.getElementById('commissions-preset-range');
        const dateFrom = document.getElementById('commissions-date-from');
        const dateTo = document.getElementById('commissions-date-to');
        
        presetSelect?.addEventListener('change', () => {
            const today = new Date();
            const preset = presetSelect.value;
            
            let fromDate = new Date();
            let toDate = new Date();
            
            switch(preset) {
                case 'today':
                    fromDate = new Date(today);
                    toDate = new Date(today);
                    break;
                case 'yesterday':
                    fromDate = new Date(today);
                    fromDate.setDate(fromDate.getDate() - 1);
                    toDate = new Date(fromDate);
                    break;
                case 'week': {
                    // Semana empieza el LUNES (convención México/LatAm)
                    fromDate = new Date(today);
                    const daysToMon = today.getDay() === 0 ? 6 : today.getDay() - 1;
                    fromDate.setDate(fromDate.getDate() - daysToMon);
                    toDate = new Date(today);
                    break;
                }
                case 'lastweek': {
                    // Lunes al domingo de la semana anterior
                    fromDate = new Date(today);
                    const daysToMon2 = today.getDay() === 0 ? 6 : today.getDay() - 1;
                    fromDate.setDate(fromDate.getDate() - daysToMon2 - 7);
                    toDate = new Date(fromDate);
                    toDate.setDate(toDate.getDate() + 6);
                    break;
                }
                case 'month':
                    fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
                    toDate = new Date(today);
                    break;
                case 'lastmonth':
                    fromDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                    toDate = new Date(today.getFullYear(), today.getMonth(), 0);
                    break;
                case 'quarter': {
                    const quarter = Math.floor(today.getMonth() / 3);
                    fromDate = new Date(today.getFullYear(), quarter * 3, 1);
                    toDate = new Date(today);
                    break;
                }
                case 'year':
                    fromDate = new Date(today.getFullYear(), 0, 1);
                    toDate = new Date(today);
                    break;
            }
            
            if (dateFrom) dateFrom.value = Utils.formatDate(fromDate, 'YYYY-MM-DD');
            if (dateTo) dateTo.value = Utils.formatDate(toDate, 'YYYY-MM-DD');
        });
    },

    async generateCommissionsReport() {
        const container = document.getElementById('commissions-results');
        if (!container) return;

        try {
            container.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin"></i> Generando reporte...</div>';

            const dateFrom = document.getElementById('commissions-date-from')?.value;
            const dateTo = document.getElementById('commissions-date-to')?.value;
            const branchId = document.getElementById('commissions-branch')?.value || '';
            const sellerId = document.getElementById('commissions-seller')?.value || '';
            const guideId = document.getElementById('commissions-guide')?.value || '';

            if (!dateFrom || !dateTo) {
                Utils.showNotification('Selecciona un rango de fechas', 'error');
                return;
            }

            // Obtener ventas filtradas
            const allSales = await this.getFilteredSales({ branchId: branchId === 'all' ? null : (branchId || null) });
            const sales = allSales.filter(sale => {
                // Aceptar múltiples formatos de status
                const status = (sale.status || '').toLowerCase();
                if (status !== 'completada' && status !== 'completed' && status !== 'completado') return false;
                const saleDate = sale.created_at?.split('T')[0];
                if (saleDate < dateFrom || saleDate > dateTo) return false;
                if (sellerId && sale.seller_id !== sellerId) return false;
                if (guideId && sale.guide_id !== guideId) return false;
                return true;
            });
            
            // Si no hay ventas, mostrar mensaje y salir
            if (sales.length === 0) {
                container.innerHTML = '<div class="empty-state">No hay ventas con comisiones en el período seleccionado</div>';
                return;
            }

            // Calcular comisiones
            const commissionsBreakdown = {
                sellers: 0,
                guides: 0,
                total: 0
            };

            const sellerCommissions = {};
            const guideCommissions = {};

            // Cargar catálogos antes del bucle para resolver nombres (agency, seller, guide) al calcular comisiones
            const sellers = await DB.getAll('catalog_sellers') || [];
            const guides = await DB.getAll('catalog_guides') || [];
            const agencies = await DB.getAll('catalog_agencies') || [];
            const branches = await DB.getAll('catalog_branches') || [];
            const allSaleItems = await DB.getAll('sale_items') || [];

            for (const sale of sales) {
                let sellerComm = sale.seller_commission != null && sale.seller_commission > 0 ? Number(sale.seller_commission) : 0;
                let guideComm = sale.guide_commission != null && sale.guide_commission > 0 ? Number(sale.guide_commission) : 0;

                const needsCalculation = (sellerComm === 0 && (sale.seller_id || sale.guide_id)) || (guideComm === 0 && (sale.seller_id || sale.guide_id));

                if (needsCalculation) {
                    const saleItems = allSaleItems.filter(si => si.sale_id === sale.id);

                    // Opción A: primero intentar suma desde sale_items si tienen comisiones guardadas
                    const sumFromItems = saleItems.reduce((acc, si) => {
                        acc.seller += Number(si.seller_commission) || 0;
                        acc.guide += Number(si.guide_commission) || 0;
                        return acc;
                    }, { seller: 0, guide: 0 });

                    if (sumFromItems.seller > 0 || sumFromItems.guide > 0) {
                        sellerComm = sumFromItems.seller;
                        guideComm = sumFromItems.guide;
                    } else {
                        // Usar reglas por nombre: calculateCommissionByRules(totalMXN, agencyName, sellerName, guideName)
                        let agencyName = sale.agency_id ? (agencies.find(a => this.compareIds(a.id, sale.agency_id))?.name || null) : null;
                        const guideRecord = sale.guide_id ? guides.find(g => this.compareIds(g.id, sale.guide_id)) : null;
                        if (!agencyName && guideRecord?.agency_id) {
                            agencyName = agencies.find(a => this.compareIds(a.id, guideRecord.agency_id))?.name || null;
                        }
                        const sellerName = sale.seller_id ? (sellers.find(s => this.compareIds(s.id, sale.seller_id))?.name || null) : null;
                        const guideName = guideRecord?.name || null;
                        if (!agencyName && guideName) {
                            const guideNorm = guideName.trim().toUpperCase();
                            agencyName = this.GUIDE_TO_AGENCY[guideNorm] || null;
                        }
                        const totalMXN = parseFloat(sale.total) || 0;
                        const { sellerCommission, guideCommission } = this.calculateCommissionByRules(totalMXN, agencyName, sellerName, guideName);
                        sellerComm = sellerCommission;
                        guideComm = guideCommission;
                    }

                    sale.seller_commission = sellerComm;
                    sale.guide_commission = guideComm;
                    if (sellerComm > 0 || guideComm > 0) {
                        await DB.put('sales', sale);
                    }
                }

                commissionsBreakdown.sellers += sellerComm;
                commissionsBreakdown.guides += guideComm;

                if (sellerComm > 0 && sale.seller_id) {
                    if (!sellerCommissions[sale.seller_id]) {
                        sellerCommissions[sale.seller_id] = { id: sale.seller_id, name: '', total: 0, count: 0 };
                    }
                    sellerCommissions[sale.seller_id].total += sellerComm;
                    sellerCommissions[sale.seller_id].count += 1;
                }

                if (guideComm > 0 && sale.guide_id) {
                    if (!guideCommissions[sale.guide_id]) {
                        guideCommissions[sale.guide_id] = { id: sale.guide_id, name: '', total: 0, count: 0 };
                    }
                    guideCommissions[sale.guide_id].total += guideComm;
                    guideCommissions[sale.guide_id].count += 1;
                }
            }

            commissionsBreakdown.total = commissionsBreakdown.sellers + commissionsBreakdown.guides;

            // Nombres ya cargados antes del bucle; asignar a comisiones por vendedor/guía
            Object.values(sellerCommissions).forEach(comm => {
                const seller = sellers.find(s => s.id === comm.id);
                comm.name = seller?.name || 'N/A';
            });

            Object.values(guideCommissions).forEach(comm => {
                const guide = guides.find(g => g.id === comm.id);
                comm.name = guide?.name || 'N/A';
                comm.pasajeros = 0;
                comm.cierrePercent = 0;
            });

            // Calcular pasajeros y % cierre por guía desde agency_arrivals
            try {
                const allArrivalsForComm = await DB.getAll('agency_arrivals') || [];
                const filteredArrivalsForComm = allArrivalsForComm.filter(a => {
                    const arrivalDate = a.date || a.created_at?.split('T')[0];
                    return arrivalDate >= dateFrom && arrivalDate <= dateTo;
                });
                filteredArrivalsForComm.forEach(a => {
                    if (a.guide_id && guideCommissions[a.guide_id]) {
                        guideCommissions[a.guide_id].pasajeros += parseInt(a.passengers) || 0;
                    }
                });
                Object.values(guideCommissions).forEach(comm => {
                    if (comm.pasajeros > 0) {
                        comm.cierrePercent = (comm.count / comm.pasajeros) * 100;
                    }
                });
            } catch (e) {
                console.warn('No se pudo calcular cierre% por guía:', e);
            }

            // Renderizar reporte
            const sellerCommissionsList = Object.values(sellerCommissions).sort((a, b) => b.total - a.total);
            const guideCommissionsList = Object.values(guideCommissions).sort((a, b) => b.total - a.total);

            container.innerHTML = `
                <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border-light); margin-bottom: var(--spacing-lg);">
                    <h3 style="margin-bottom: var(--spacing-md); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                        <i class="fas fa-percent"></i> Resumen de Comisiones
                    </h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: var(--spacing-md);">
                        <div style="padding: var(--spacing-md); background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%); border-radius: var(--radius-md); color: white;">
                            <div style="font-size: 12px; opacity: 0.9; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                                <i class="fas fa-user-tag"></i> Comisiones Vendedores
                            </div>
                            <div style="font-weight: 700; font-size: 28px; margin-bottom: 4px;">${Utils.formatCurrency(commissionsBreakdown.sellers)}</div>
                            <div style="font-size: 11px; opacity: 0.8;">
                                ${commissionsBreakdown.total > 0 ? ((commissionsBreakdown.sellers / commissionsBreakdown.total) * 100).toFixed(1) : 0}% del total
                            </div>
                        </div>
                        <div style="padding: var(--spacing-md); background: linear-gradient(135deg, var(--color-success) 0%, #4CAF50 100%); border-radius: var(--radius-md); color: white;">
                            <div style="font-size: 12px; opacity: 0.9; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                                <i class="fas fa-suitcase"></i> Comisiones Guías
                            </div>
                            <div style="font-weight: 700; font-size: 28px; margin-bottom: 4px;">${Utils.formatCurrency(commissionsBreakdown.guides)}</div>
                            <div style="font-size: 11px; opacity: 0.8;">
                                ${commissionsBreakdown.total > 0 ? ((commissionsBreakdown.guides / commissionsBreakdown.total) * 100).toFixed(1) : 0}% del total
                            </div>
                        </div>
                        <div style="padding: var(--spacing-md); background: var(--color-bg-secondary); border: 2px solid var(--color-border); border-radius: var(--radius-md);">
                            <div style="font-size: 12px; color: var(--color-text-secondary); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                                <i class="fas fa-calculator"></i> Total Comisiones
                            </div>
                            <div style="font-weight: 700; font-size: 28px; color: var(--color-text); margin-bottom: 4px;">${Utils.formatCurrency(commissionsBreakdown.total)}</div>
                            <div style="font-size: 11px; color: var(--color-text-secondary);">
                                ${sales.length} venta${sales.length !== 1 ? 's' : ''}
                            </div>
                        </div>
                    </div>
                </div>

                ${sellerCommissionsList.length > 0 ? `
                    <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border-light); margin-bottom: var(--spacing-lg);">
                        <h3 style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: var(--spacing-md);">
                            <i class="fas fa-user-tag"></i> Comisiones por Vendedor
                        </h3>
                        <div style="overflow-x: auto;">
                            <table class="cart-table" style="width: 100%; min-width: 500px;">
                                <thead>
                                    <tr>
                                        <th>Vendedor</th>
                                        <th>Ventas</th>
                                        <th>Total Comisiones</th>
                                        <th>Promedio por Venta</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${sellerCommissionsList.map(comm => `
                                        <tr>
                                            <td><strong>${comm.name}</strong></td>
                                            <td>${comm.count}</td>
                                            <td style="font-weight: 600; color: var(--color-primary);">${Utils.formatCurrency(comm.total)}</td>
                                            <td>${Utils.formatCurrency(comm.count > 0 ? comm.total / comm.count : 0)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ` : ''}

                ${guideCommissionsList.length > 0 ? `
                    <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border-light); margin-bottom: var(--spacing-lg);">
                        <h3 style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: var(--spacing-md);">
                            <i class="fas fa-suitcase"></i> Comisiones por Guía
                        </h3>
                        <div style="overflow-x: auto;">
                            <table class="cart-table" style="width: 100%; min-width: 500px;">
                                <thead>
                                    <tr>
                                        <th>Guía</th>
                                        <th>Ventas</th>
                                        <th>Pasajeros</th>
                                        <th>% Cierre</th>
                                        <th>Total Comisiones</th>
                                        <th>Promedio por Venta</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${guideCommissionsList.map(comm => `
                                        <tr>
                                            <td><strong>${comm.name}</strong></td>
                                            <td>${comm.count}</td>
                                            <td>${comm.pasajeros > 0 ? comm.pasajeros : '—'}</td>
                                            <td style="font-weight: 600; color: var(--color-primary);">${comm.pasajeros > 0 ? comm.cierrePercent.toFixed(1) + '%' : '—'}</td>
                                            <td style="font-weight: 600; color: var(--color-success);">${Utils.formatCurrency(comm.total)}</td>
                                            <td>${Utils.formatCurrency(comm.count > 0 ? comm.total / comm.count : 0)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ` : ''}

                <div class="module" style="padding: 0; background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border-light); overflow: hidden; margin-top: var(--spacing-lg);">
                    <div style="padding: var(--spacing-md); border-bottom: 1px solid var(--color-border-light);">
                        <h3 style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0;">
                            <i class="fas fa-list"></i> Detalle de Ventas con Comisiones
                        </h3>
                    </div>
                    <div style="overflow-x: auto; width: 100%;">
                        <table class="cart-table" style="width: 100%; max-width: 100%; table-layout: auto; min-width: 1000px;">
                            <thead>
                                <tr>
                                    <th>Folio</th>
                                    <th>Fecha</th>
                                    <th>Sucursal</th>
                                    <th>Vendedor</th>
                                    <th>Guía</th>
                                    <th>Total Venta</th>
                                    <th>Com. Vendedor</th>
                                    <th>Com. Guía</th>
                                    <th>Total Comisiones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sales.map(sale => {
                                    const branch = branches.find(b => b.id === sale.branch_id);
                                    const seller = sellers.find(s => s.id === sale.seller_id);
                                    const guide = guides.find(g => g.id === sale.guide_id);
                                    const sellerComm = sale.seller_commission || 0;
                                    const guideComm = sale.guide_commission || 0;
                                    return `
                                        <tr>
                                            <td>${sale.folio || 'N/A'}</td>
                                            <td>${Utils.formatDate(sale.created_at, 'DD/MM/YYYY')}</td>
                                            <td>${branch?.name || 'N/A'}</td>
                                            <td>${seller?.name || 'N/A'}</td>
                                            <td>${guide?.name || 'N/A'}</td>
                                            <td style="font-weight: 600;">${Utils.formatCurrency(sale.total)}</td>
                                            <td style="color: var(--color-primary); font-weight: 500;">${Utils.formatCurrency(sellerComm)}</td>
                                            <td style="color: var(--color-success); font-weight: 500;">${Utils.formatCurrency(guideComm)}</td>
                                            <td style="font-weight: 600;">${Utils.formatCurrency(sellerComm + guideComm)}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

        } catch (e) {
            console.error('Error generando reporte de comisiones:', e);
            container.innerHTML = `
                <div style="padding: var(--spacing-md); background: var(--color-danger); color: white; border-radius: var(--radius-md);">
                    <strong>Error:</strong> ${e.message}
                </div>
            `;
        }
    },

    async exportCommissionsReport() {
        const dateFrom = document.getElementById('commissions-date-from')?.value;
        const dateTo = document.getElementById('commissions-date-to')?.value;
        
        if (!dateFrom || !dateTo) {
            Utils.showNotification('Selecciona un rango de fechas', 'error');
            return;
        }

        // Obtener filtro de sucursal del dropdown
        const branchFilterEl = document.getElementById('commissions-branch');
        const branchFilterValue = branchFilterEl?.value || '';
        
        // Verificar si es master_admin
        const isMasterAdmin = typeof UserManager !== 'undefined' && (
            UserManager.currentUser?.role === 'master_admin' ||
            UserManager.currentUser?.is_master_admin ||
            UserManager.currentUser?.isMasterAdmin ||
            UserManager.currentEmployee?.role === 'master_admin'
        );
        
        // Obtener sucursal actual
        const currentBranchId = typeof BranchManager !== 'undefined' 
            ? BranchManager.getCurrentBranchId() 
            : localStorage.getItem('current_branch_id') || null;
        
        // Determinar qué branch_id usar para el filtro
        let branchId = null;
        if (branchFilterValue && branchFilterValue !== 'all' && branchFilterValue !== '' && branchFilterValue !== null) {
            branchId = branchFilterValue;
        } else if (isMasterAdmin && (!branchFilterValue || branchFilterValue === 'all' || branchFilterValue === '')) {
            branchId = null; // Todas las sucursales
        } else {
            branchId = currentBranchId;
        }
        
        const sellerId = document.getElementById('commissions-seller')?.value || '';
        const guideId = document.getElementById('commissions-guide')?.value || '';

        const allSales = await this.getFilteredSales({ branchId: branchId || null });
        const sales = allSales.filter(sale => {
            if (!(typeof Utils !== 'undefined' && Utils.isSaleCompleted ? Utils.isSaleCompleted(sale) : (sale.status === 'completada' || sale.status === 'completed'))) return false;
            const saleDate = sale.created_at?.split('T')[0];
            if (saleDate < dateFrom || saleDate > dateTo) return false;
            if (sellerId && sale.seller_id !== sellerId) return false;
            if (guideId && sale.guide_id !== guideId) return false;
            return true;
        });

        const sellers = await DB.getAll('catalog_sellers');
        const guides = await DB.getAll('catalog_guides');
        const branches = await DB.getAll('catalog_branches');

        const exportData = sales.map(sale => {
            const branch = branches.find(b => b.id === sale.branch_id);
            const seller = sellers.find(s => s.id === sale.seller_id);
            const guide = guides.find(g => g.id === sale.guide_id);
            return {
                'Folio': sale.folio || 'N/A',
                'Fecha': Utils.formatDate(sale.created_at, 'DD/MM/YYYY'),
                'Sucursal': branch?.name || 'N/A',
                'Vendedor': seller?.name || 'N/A',
                'Guía': guide?.name || 'N/A',
                'Total Venta': sale.total || 0,
                'Comisión Vendedor': sale.seller_commission || 0,
                'Comisión Guía': sale.guide_commission || 0,
                'Total Comisiones': (sale.seller_commission || 0) + (sale.guide_commission || 0)
            };
        });

        Utils.exportToExcel(exportData, `comisiones_${dateFrom}_${dateTo}.xlsx`, 'Comisiones');
        Utils.showNotification('Reporte de comisiones exportado', 'success');
    },

    async exportCommissionsPDF() {
        const dateFrom = document.getElementById('commissions-date-from')?.value;
        const dateTo = document.getElementById('commissions-date-to')?.value;
        if (!dateFrom || !dateTo) {
            Utils.showNotification('Selecciona un rango de fechas', 'error');
            return;
        }

        const jspdfLib = Utils.checkJsPDF ? Utils.checkJsPDF() : (window.jspdf || window.jsPDF ? { jsPDF: window.jspdf?.jsPDF || window.jsPDF } : null);
        if (!jspdfLib) {
            Utils.showNotification('jsPDF no está disponible', 'error');
            return;
        }
        const { jsPDF } = jspdfLib;

        try {
            const branchFilterEl = document.getElementById('commissions-branch');
            const branchFilterValue = branchFilterEl?.value || '';
            const isMasterAdmin = typeof UserManager !== 'undefined' && (
                UserManager.currentUser?.role === 'master_admin' || UserManager.currentUser?.is_master_admin ||
                UserManager.currentUser?.isMasterAdmin || UserManager.currentEmployee?.role === 'master_admin'
            );
            const currentBranchId = typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : localStorage.getItem('current_branch_id') || null;
            let branchId = null;
            if (branchFilterValue && branchFilterValue !== 'all' && branchFilterValue !== '') {
                branchId = branchFilterValue;
            } else if (!isMasterAdmin) {
                branchId = currentBranchId;
            }

            const sellerId = document.getElementById('commissions-seller')?.value || '';
            const guideId  = document.getElementById('commissions-guide')?.value  || '';

            const allSales = await this.getFilteredSales({ branchId: branchId || null });
            const sales = allSales.filter(sale => {
                const status = (sale.status || '').toLowerCase();
                if (!['completada', 'completed', 'completado'].includes(status)) return false;
                const saleDate = sale.created_at?.split('T')[0];
                if (saleDate < dateFrom || saleDate > dateTo) return false;
                if (sellerId && sale.seller_id !== sellerId) return false;
                if (guideId  && sale.guide_id  !== guideId)  return false;
                return true;
            });

            const sellers  = await DB.getAll('catalog_sellers') || [];
            const guides   = await DB.getAll('catalog_guides')  || [];
            const branches = await DB.getAll('catalog_branches') || [];

            // Agrupar comisiones por vendedor y guía
            const sellerMap = {};
            const guideMap  = {};
            sales.forEach(sale => {
                const sc = parseFloat(sale.seller_commission) || 0;
                const gc = parseFloat(sale.guide_commission)  || 0;
                if (sc > 0 && sale.seller_id) {
                    if (!sellerMap[sale.seller_id]) sellerMap[sale.seller_id] = { id: sale.seller_id, name: '', total: 0, count: 0 };
                    sellerMap[sale.seller_id].total += sc;
                    sellerMap[sale.seller_id].count += 1;
                }
                if (gc > 0 && sale.guide_id) {
                    if (!guideMap[sale.guide_id]) guideMap[sale.guide_id] = { id: sale.guide_id, name: '', total: 0, count: 0, pasajeros: 0, cierrePercent: 0 };
                    guideMap[sale.guide_id].total += gc;
                    guideMap[sale.guide_id].count += 1;
                }
            });
            Object.values(sellerMap).forEach(c => { c.name = sellers.find(s => s.id === c.id)?.name || 'N/A'; });
            Object.values(guideMap).forEach(c => { c.name = guides.find(g => g.id === c.id)?.name || 'N/A'; });

            // Pasajeros por guía
            try {
                const allArrivals = await DB.getAll('agency_arrivals') || [];
                allArrivals.filter(a => {
                    const d = a.date || a.created_at?.split('T')[0];
                    return d >= dateFrom && d <= dateTo;
                }).forEach(a => {
                    if (a.guide_id && guideMap[a.guide_id]) {
                        guideMap[a.guide_id].pasajeros += parseInt(a.passengers) || 0;
                    }
                });
                Object.values(guideMap).forEach(c => {
                    if (c.pasajeros > 0) c.cierrePercent = (c.count / c.pasajeros) * 100;
                });
            } catch (e) { /* sin datos de llegadas */ }

            const sellerList = Object.values(sellerMap).sort((a, b) => b.total - a.total);
            const guideList  = Object.values(guideMap).sort((a, b) => b.total - a.total);
            const totalSellers = sellerList.reduce((s, c) => s + c.total, 0);
            const totalGuides  = guideList.reduce((s, c) => s + c.total, 0);
            const fmt = (n) => `$${(parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            const generatedAtStr = new Date().toLocaleString('es-MX');

            const doc = new jsPDF('l', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 12;
            let y = margin;

            const drawSectionTitle = (text, yPos) => {
                doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.3);
                doc.line(margin, yPos, pageWidth - margin, yPos);
                doc.setFillColor(245, 247, 250); doc.rect(margin, yPos + 0.5, pageWidth - margin * 2, 10, 'F');
                doc.setDrawColor(212, 160, 23); doc.setLineWidth(0.6);
                doc.line(margin, yPos + 10.5, pageWidth - margin, yPos + 10.5);
                doc.setLineWidth(0.2); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
                doc.setTextColor(44, 62, 80);
                doc.text(text, pageWidth / 2, yPos + 7.5, { align: 'center' });
                doc.setTextColor(0, 0, 0); doc.setDrawColor(0, 0, 0);
                return yPos + 16;
            };
            const checkPage = (needed) => { if (y + needed > pageHeight - 20) { doc.addPage(); y = margin; } };

            // Header
            doc.setFillColor(44, 62, 80); doc.rect(0, 0, pageWidth, 40, 'F');
            doc.setFillColor(212, 160, 23); doc.rect(0, 40, pageWidth, 3, 'F');
            doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.setFont('helvetica', 'bold');
            doc.text('OPAL & CO', margin, 16);
            doc.setFontSize(12); doc.setFont('helvetica', 'normal'); doc.setTextColor(200, 215, 230);
            doc.text('Reporte de Comisiones', margin, 28);
            doc.setFontSize(9); doc.setTextColor(200, 215, 230);
            doc.text(generatedAtStr, pageWidth - margin, 16, { align: 'right' });
            const periodLabel = `Período: ${dateFrom} – ${dateTo}`;
            const pillW = doc.getStringUnitWidth(periodLabel) * 9 / doc.internal.scaleFactor + 8;
            doc.setFontSize(9); doc.setFont('helvetica', 'bold');
            doc.setFillColor(212, 160, 23); doc.rect(pageWidth - margin - pillW, 21, pillW, 9, 'F');
            doc.setTextColor(255, 255, 255); doc.text(periodLabel, pageWidth - margin - pillW + 4, 27);
            doc.setTextColor(0, 0, 0);
            y = 52;

            // KPIs resumen
            y = drawSectionTitle('RESUMEN DE COMISIONES', y);
            const kpiData = [
                ['COM. VENDEDORES', fmt(totalSellers)],
                ['COM. GUÍAS', fmt(totalGuides)],
                ['TOTAL COMISIONES', fmt(totalSellers + totalGuides)],
            ];
            const kpiW = (pageWidth - margin * 2 - 8) / 3;
            kpiData.forEach((k, i) => {
                const kx = margin + i * (kpiW + 4);
                doc.setFillColor(248, 250, 253); doc.rect(kx, y, kpiW, 24, 'F');
                doc.setDrawColor(210, 215, 220); doc.rect(kx, y, kpiW, 24);
                doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 130, 140);
                doc.text(k[0], kx + kpiW / 2, y + 8, { align: 'center' });
                doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(44, 62, 80);
                doc.text(k[1], kx + kpiW / 2, y + 18, { align: 'center', maxWidth: kpiW - 4 });
                doc.setTextColor(0, 0, 0);
            });
            y += 28;

            // Tabla vendedores
            if (sellerList.length > 0) {
                checkPage(30);
                y = drawSectionTitle('COMISIONES POR VENDEDOR', y);
                const sC = [margin + 2, margin + 100, margin + 160, margin + 210, pageWidth - margin - 2];
                const drawSH = (yh) => {
                    doc.setFillColor(44, 62, 80); doc.rect(margin, yh, pageWidth - margin * 2, 8, 'F');
                    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
                    doc.text('Vendedor', sC[0], yh + 5.5);
                    doc.text('Ventas', sC[1] + (sC[2] - sC[1]) / 2, yh + 5.5, { align: 'center' });
                    doc.text('Total Comisiones', sC[2] + (sC[3] - sC[2]) / 2, yh + 5.5, { align: 'center' });
                    doc.text('Promedio/Venta', sC[4], yh + 5.5, { align: 'right' });
                    doc.setTextColor(0, 0, 0); return yh + 8;
                };
                y = drawSH(y);
                sellerList.forEach((c, i) => {
                    checkPage(7);
                    if (i % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(margin, y, pageWidth - margin * 2, 7, 'F'); }
                    doc.setDrawColor(220, 225, 230); doc.rect(margin, y, pageWidth - margin * 2, 7);
                    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 70);
                    doc.text(String(c.name).substring(0, 40), sC[0], y + 5);
                    doc.text(String(c.count), sC[1] + (sC[2] - sC[1]) / 2, y + 5, { align: 'center' });
                    doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 90, 30);
                    doc.text(fmt(c.total), sC[2] + (sC[3] - sC[2]) / 2, y + 5, { align: 'center' });
                    doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 70);
                    doc.text(fmt(c.count > 0 ? c.total / c.count : 0), sC[4], y + 5, { align: 'right' });
                    doc.setTextColor(0, 0, 0); y += 7;
                });
                // Total row
                checkPage(8);
                doc.setFillColor(232, 245, 233); doc.rect(margin, y, pageWidth - margin * 2, 8, 'F');
                doc.setDrawColor(150, 200, 160); doc.rect(margin, y, pageWidth - margin * 2, 8);
                doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(27, 100, 50);
                doc.text('TOTAL VENDEDORES', sC[0], y + 5.5);
                doc.text(fmt(totalSellers), sC[4], y + 5.5, { align: 'right' });
                doc.setTextColor(0, 0, 0); y += 10;
            }

            // Tabla guías
            if (guideList.length > 0) {
                checkPage(30);
                y = drawSectionTitle('COMISIONES POR GUÍA', y);
                const gC = [margin + 2, margin + 80, margin + 115, margin + 155, margin + 190, margin + 230, pageWidth - margin - 2];
                const drawGH = (yh) => {
                    doc.setFillColor(44, 62, 80); doc.rect(margin, yh, pageWidth - margin * 2, 8, 'F');
                    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
                    doc.text('Guía', gC[0], yh + 5.5);
                    doc.text('Ventas', gC[1] + (gC[2] - gC[1]) / 2, yh + 5.5, { align: 'center' });
                    doc.text('Pasajeros', gC[2] + (gC[3] - gC[2]) / 2, yh + 5.5, { align: 'center' });
                    doc.text('% Cierre', gC[3] + (gC[4] - gC[3]) / 2, yh + 5.5, { align: 'center' });
                    doc.text('Total Comisiones', gC[4] + (gC[5] - gC[4]) / 2, yh + 5.5, { align: 'center' });
                    doc.text('Promedio/Venta', gC[6], yh + 5.5, { align: 'right' });
                    doc.setTextColor(0, 0, 0); return yh + 8;
                };
                y = drawGH(y);
                guideList.forEach((c, i) => {
                    checkPage(7);
                    if (i % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(margin, y, pageWidth - margin * 2, 7, 'F'); }
                    doc.setDrawColor(220, 225, 230); doc.rect(margin, y, pageWidth - margin * 2, 7);
                    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 70);
                    doc.text(String(c.name).substring(0, 34), gC[0], y + 5);
                    doc.text(String(c.count), gC[1] + (gC[2] - gC[1]) / 2, y + 5, { align: 'center' });
                    doc.text(c.pasajeros > 0 ? String(c.pasajeros) : '—', gC[2] + (gC[3] - gC[2]) / 2, y + 5, { align: 'center' });
                    doc.setFont('helvetica', 'bold'); doc.setTextColor(44, 62, 80);
                    doc.text(c.pasajeros > 0 ? `${c.cierrePercent.toFixed(1)}%` : '—', gC[3] + (gC[4] - gC[3]) / 2, y + 5, { align: 'center' });
                    doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 90, 30);
                    doc.text(fmt(c.total), gC[4] + (gC[5] - gC[4]) / 2, y + 5, { align: 'center' });
                    doc.setTextColor(60, 60, 70);
                    doc.text(fmt(c.count > 0 ? c.total / c.count : 0), gC[6], y + 5, { align: 'right' });
                    doc.setTextColor(0, 0, 0); y += 7;
                });
                checkPage(8);
                doc.setFillColor(232, 245, 233); doc.rect(margin, y, pageWidth - margin * 2, 8, 'F');
                doc.setDrawColor(150, 200, 160); doc.rect(margin, y, pageWidth - margin * 2, 8);
                doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(27, 100, 50);
                doc.text('TOTAL GUÍAS', gC[0], y + 5.5);
                doc.text(fmt(totalGuides), gC[6], y + 5.5, { align: 'right' });
                doc.setTextColor(0, 0, 0); y += 10;
            }

            // Footer
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.3);
                doc.line(margin, pageHeight - 16, pageWidth - margin, pageHeight - 16);
                doc.setLineWidth(0.2); doc.setFontSize(8); doc.setTextColor(150, 150, 150);
                doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
                doc.text(`Generado: ${generatedAtStr}`, margin, pageHeight - 10);
                doc.text(`OPAL & CO  |  Reporte de Comisiones`, pageWidth - margin, pageHeight - 10, { align: 'right' });
                doc.setTextColor(0, 0, 0);
            }

            doc.save(`Comisiones_${dateFrom}_${dateTo}_${Date.now()}.pdf`);
            Utils.showNotification('PDF de comisiones exportado correctamente', 'success');
        } catch (error) {
            console.error('Error exportando PDF de comisiones:', error);
            Utils.showNotification('Error al exportar PDF: ' + error.message, 'error');
        }
    },

    async setupBranchFilter(filterId = 'report-branch') {
        const branchFilter = document.getElementById(filterId);
        if (!branchFilter) return;

        // Verificar si el usuario es master_admin
        const isMasterAdmin = typeof UserManager !== 'undefined' && (
            UserManager.currentUser?.role === 'master_admin' ||
            UserManager.currentUser?.is_master_admin ||
            UserManager.currentUser?.isMasterAdmin ||
            UserManager.currentEmployee?.role === 'master_admin'
        );

        // Obtener sucursal actual del usuario
        const currentBranchId = typeof BranchManager !== 'undefined' 
            ? BranchManager.getCurrentBranchId() 
            : localStorage.getItem('current_branch_id');

        // Si NO es master_admin, el dropdown ya debe tener solo su sucursal
        if (!isMasterAdmin) {
            // Asegurar que solo ve su sucursal
            if (currentBranchId && branchFilter.value !== currentBranchId) {
                branchFilter.value = currentBranchId;
            }
        } else {
            // Master admin puede ver todas las sucursales
            // Solo actualizar las opciones si no están cargadas
            if (branchFilter.options.length <= 1) {
                const branches = await DB.getAll('catalog_branches') || [];
                branchFilter.innerHTML = '<option value="all">Todas las sucursales</option>' + 
                    branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
                // Establecer valor por defecto según sucursal actual
                if (currentBranchId) {
                    branchFilter.value = currentBranchId;
                } else {
                    branchFilter.value = 'all';
                }
            }
        }
        
        // Escuchar cambios de sucursal desde el header para sincronizar el dropdown
        window.addEventListener('branch-changed', async (e) => {
            const updatedFilter = document.getElementById(filterId);
            if (updatedFilter && e.detail && e.detail.branchId) {
                // Sincronizar dropdown con la sucursal seleccionada en el header
                updatedFilter.value = e.detail.branchId;
                // Recargar reportes con el nuevo filtro
                await this.generateReport();
            }
        });
    },
    
    async getSavedReportsTab() {
        return `
            <div style="padding: var(--spacing-md);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-md);">
                    <h2 style="margin: 0;">Reportes Guardados</h2>
                    <div style="display: flex; gap: var(--spacing-sm);">
                        <input type="text" id="saved-reports-search" class="form-input" 
                            placeholder="Buscar por nombre..." 
                            style="width: 300px;">
                        <select id="saved-reports-filter" class="form-input" style="width: 200px;">
                            <option value="">Todos los tipos</option>
                            <option value="summary">Resumen</option>
                            <option value="daily">Diario</option>
                            <option value="product">Productos</option>
                            <option value="seller">Vendedor</option>
                            <option value="agency">Agencia</option>
                            <option value="profit">Utilidad</option>
                        </select>
                    </div>
                </div>
                <div id="saved-reports-list" style="display: grid; gap: var(--spacing-md);">
                    <div style="padding: var(--spacing-lg); text-align: center; color: var(--color-text-secondary);">
                        Cargando reportes guardados...
                    </div>
                </div>
            </div>
        `;
    },
    
    async loadSavedReports() {
        const container = document.getElementById('saved-reports-list');
        if (!container) return;
        
        try {
            const searchInput = document.getElementById('saved-reports-search');
            const filterSelect = document.getElementById('saved-reports-filter');
            
            const filters = {};
            if (searchInput?.value) filters.search = searchInput.value;
            if (filterSelect?.value) filters.type = filterSelect.value;
            
            const savedReports = await API.getSavedReports(filters) || [];
            
            if (savedReports.length === 0) {
                container.innerHTML = `
                    <div style="padding: var(--spacing-lg); text-align: center; color: var(--color-text-secondary);">
                        No hay reportes guardados aún
                    </div>
                `;
                return;
            }
            
            container.innerHTML = savedReports.map(report => {
                const summary = report.summary || {};
                return `
                    <div style="background: var(--color-bg-card); border: 1px solid var(--color-border-light); 
                        border-radius: var(--radius-md); padding: var(--spacing-md);">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: var(--spacing-sm);">
                            <div>
                                <h3 style="margin: 0 0 var(--spacing-xs) 0; font-size: 16px;">${report.name || 'Sin nombre'}</h3>
                                <div style="font-size: 12px; color: var(--color-text-secondary);">
                                    ${Utils.formatDate(report.created_at, 'DD/MM/YYYY HH:mm')} • ${report.report_type || 'N/A'}
                                </div>
                            </div>
                            <button class="btn-danger btn-sm" onclick="Reports.deleteSavedReport('${report.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                        ${summary.totalSales ? `
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--spacing-sm); margin-top: var(--spacing-sm);">
                                ${summary.totalSales !== undefined ? `
                                    <div style="font-size: 12px;">
                                        <div style="color: var(--color-text-secondary);">Total Ventas</div>
                                        <div style="font-weight: 600;">${Utils.formatCurrency(summary.totalSales)}</div>
                                    </div>
                                ` : ''}
                                ${summary.grossProfit !== undefined ? `
                                    <div style="font-size: 12px;">
                                        <div style="color: var(--color-text-secondary);">Utilidad Bruta</div>
                                        <div style="font-weight: 600; color: var(--color-success);">${Utils.formatCurrency(summary.grossProfit)}</div>
                                    </div>
                                ` : ''}
                                ${summary.netProfit !== undefined ? `
                                    <div style="font-size: 12px;">
                                        <div style="color: var(--color-text-secondary);">Utilidad Neta</div>
                                        <div style="font-weight: 600; color: var(--color-success);">${Utils.formatCurrency(summary.netProfit)}</div>
                                    </div>
                                ` : ''}
                            </div>
                        ` : ''}
                        <div style="display: flex; gap: var(--spacing-sm); margin-top: var(--spacing-md);">
                            <button class="btn-primary btn-sm" onclick="Reports.viewSavedReport('${report.id}')">
                                <i class="fas fa-eye"></i> Ver
                            </button>
                            <button class="btn-secondary btn-sm" onclick="Reports.exportSavedReport('${report.id}')">
                                <i class="fas fa-download"></i> Exportar
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
            
            // Agregar event listeners para búsqueda y filtro
            if (searchInput) {
                searchInput.oninput = () => this.loadSavedReports();
            }
            if (filterSelect) {
                filterSelect.onchange = () => this.loadSavedReports();
            }
            
        } catch (error) {
            console.error('Error cargando reportes guardados:', error);
            container.innerHTML = `
                <div style="padding: var(--spacing-md); background: var(--color-danger); color: white; border-radius: var(--radius-md);">
                    <strong>Error:</strong> ${error.message}
                </div>
            `;
        }
    },
    
    async saveCurrentReport() {
        if (!window.currentReportData) {
            Utils.showNotification('No hay reporte para guardar. Genera un reporte primero.', 'warning');
            return;
        }
        
        const name = await Utils.prompt('Nombre del reporte:', 'Guardar Reporte');
        if (!name) return;
        
        try {
            const dateFrom = document.getElementById('report-date-from')?.value;
            const dateTo = document.getElementById('report-date-to')?.value;
            const branchFilterEl = document.getElementById('report-branch');
            const branchFilterValue = branchFilterEl?.value || '';
            
            const reportData = {
                name: name,
                report_type: window.currentReportData.type || 'summary',
                filters: {
                    dateFrom,
                    dateTo,
                    branchId: branchFilterValue === 'all' ? null : branchFilterValue
                },
                data: window.currentReportData,
                summary: window.currentReportData.summary || {}
            };
            
            await API.saveReport(reportData);
            Utils.showNotification('Reporte guardado exitosamente', 'success');
            
            // Si estamos en la pestaña de guardados, recargar
            if (this.currentTab === 'saved') {
                await this.loadSavedReports();
            }
        } catch (error) {
            console.error('Error guardando reporte:', error);
            Utils.showNotification('Error al guardar el reporte: ' + error.message, 'error');
        }
    },
    
    async viewSavedReport(reportId) {
        try {
            const report = await API.getSavedReport(reportId);
            if (!report) {
                Utils.showNotification('Reporte no encontrado', 'error');
                return;
            }
            
            // Restaurar filtros
            if (report.filters) {
                if (report.filters.dateFrom && document.getElementById('report-date-from')) {
                    document.getElementById('report-date-from').value = report.filters.dateFrom;
                }
                if (report.filters.dateTo && document.getElementById('report-date-to')) {
                    document.getElementById('report-date-to').value = report.filters.dateTo;
                }
                if (report.filters.branchId && document.getElementById('report-branch')) {
                    document.getElementById('report-branch').value = report.filters.branchId || 'all';
                }
            }
            
            // Cambiar a pestaña de reportes y regenerar
            this.currentTab = 'reports';
            await this.loadTab('reports');
            await this.generateReport();
            
            Utils.showNotification('Reporte restaurado', 'success');
        } catch (error) {
            console.error('Error cargando reporte guardado:', error);
            Utils.showNotification('Error al cargar el reporte: ' + error.message, 'error');
        }
    },
    
    async exportSavedReport(reportId) {
        try {
            const report = await API.getSavedReport(reportId);
            if (!report) {
                Utils.showNotification('Reporte no encontrado', 'error');
                return;
            }
            
            // Usar los datos guardados para exportar
            window.currentReportData = report.data;
            await this.exportReport();
        } catch (error) {
            console.error('Error exportando reporte guardado:', error);
            Utils.showNotification('Error al exportar el reporte: ' + error.message, 'error');
        }
    },
    
    async deleteSavedReport(reportId) {
        const confirm = await Utils.confirm('¿Eliminar este reporte guardado?', 'Eliminar Reporte');
        if (!confirm) return;
        
        try {
            await API.deleteSavedReport(reportId);
            Utils.showNotification('Reporte eliminado', 'success');
            await this.loadSavedReports();
        } catch (error) {
            console.error('Error eliminando reporte guardado:', error);
            Utils.showNotification('Error al eliminar el reporte: ' + error.message, 'error');
        }
    },


    // ==================== REPORTES HISTÓRICOS ====================

    /**
     * Obtener HTML de la pestaña de reportes históricos
     */
    async getHistoricalTab() {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        const dateFrom = typeof Utils !== 'undefined' && Utils.formatDate 
            ? Utils.formatDate(firstDayOfMonth, 'YYYY-MM-DD') 
            : firstDayOfMonth.toISOString().split('T')[0];
        const dateTo = typeof Utils !== 'undefined' && Utils.formatDate 
            ? Utils.formatDate(lastDayOfMonth, 'YYYY-MM-DD') 
            : lastDayOfMonth.toISOString().split('T')[0];

        return `
            <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border-light); margin-bottom: var(--spacing-lg);">
                <h3 style="margin-bottom: var(--spacing-md); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                    <i class="fas fa-chart-area"></i> Generar Reporte Histórico
                </h3>
                <form id="historical-report-form" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--spacing-md);">
                    <div class="form-group">
                        <label>Tipo de Período <span style="color: var(--color-danger);">*</span></label>
                        <select id="historical-period-type" class="form-input" required>
                            <option value="weekly">Semanal</option>
                            <option value="monthly" selected>Mensual</option>
                            <option value="quarterly">Trimestral</option>
                            <option value="yearly">Anual</option>
                            <option value="custom">Personalizado</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Fecha Desde <span style="color: var(--color-danger);">*</span></label>
                        <input type="date" id="historical-date-from" class="form-input" value="${dateFrom}" required>
                    </div>
                    <div class="form-group">
                        <label>Fecha Hasta <span style="color: var(--color-danger);">*</span></label>
                        <input type="date" id="historical-date-to" class="form-input" value="${dateTo}" required>
                    </div>
                    <div class="form-group" style="display: flex; align-items: flex-end;">
                        <button type="submit" class="btn-primary" style="width: 100%;">
                            <i class="fas fa-chart-line"></i> Generar Reporte
                        </button>
                    </div>
                </form>
                <div id="historical-report-status" style="margin-top: var(--spacing-md);"></div>
            </div>

            <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border-light);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-md);">
                    <h3 style="margin: 0; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                        <i class="fas fa-list"></i> Reportes Históricos Generados
                    </h3>
                    <button class="btn-secondary btn-sm" onclick="window.Reports.loadHistoricalReports()" title="Actualizar lista">
                        <i class="fas fa-sync-alt"></i> Actualizar
                    </button>
                </div>
                <div id="historical-reports-list">
                    <div style="text-align: center; padding: var(--spacing-lg); color: var(--color-text-secondary);">
                        <i class="fas fa-spinner fa-spin"></i> Cargando reportes históricos...
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Configurar formulario de reportes históricos
     */
    setupHistoricalForm() {
        const form = document.getElementById('historical-report-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const periodType = document.getElementById('historical-period-type').value;
            const dateFrom = document.getElementById('historical-date-from').value;
            const dateTo = document.getElementById('historical-date-to').value;
            const statusDiv = document.getElementById('historical-report-status');

            if (!dateFrom || !dateTo) {
                statusDiv.innerHTML = '<div style="padding: var(--spacing-sm); background: var(--color-danger); color: white; border-radius: var(--radius-sm);">Por favor completa todas las fechas</div>';
                return;
            }

            if (new Date(dateFrom) > new Date(dateTo)) {
                statusDiv.innerHTML = '<div style="padding: var(--spacing-sm); background: var(--color-danger); color: white; border-radius: var(--radius-sm);">La fecha inicial no puede ser mayor que la fecha final</div>';
                return;
            }

            statusDiv.innerHTML = '<div style="padding: var(--spacing-sm); background: var(--color-info); color: white; border-radius: var(--radius-sm);"><i class="fas fa-spinner fa-spin"></i> Generando reporte histórico...</div>';

            try {
                const branchId = typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : null;
                await this.generateHistoricalReport(periodType, dateFrom, dateTo, branchId);
                statusDiv.innerHTML = '<div style="padding: var(--spacing-sm); background: var(--color-success); color: white; border-radius: var(--radius-sm);"><i class="fas fa-check"></i> Reporte histórico generado exitosamente</div>';
                setTimeout(() => {
                    statusDiv.innerHTML = '';
                }, 3000);
            } catch (error) {
                statusDiv.innerHTML = `<div style="padding: var(--spacing-sm); background: var(--color-danger); color: white; border-radius: var(--radius-sm);">Error: ${error.message}</div>`;
            }
        });

        // Auto-ajustar fechas según tipo de período
        const periodTypeSelect = document.getElementById('historical-period-type');
        const dateFromInput = document.getElementById('historical-date-from');
        const dateToInput = document.getElementById('historical-date-to');

        periodTypeSelect.addEventListener('change', () => {
            const today = new Date();
            const periodType = periodTypeSelect.value;

            let fromDate, toDate;

            switch(periodType) {
                case 'weekly':
                    // Semana actual (lunes a domingo)
                    const dayOfWeek = today.getDay();
                    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Ajustar a lunes
                    fromDate = new Date(today.setDate(diff));
                    toDate = new Date(fromDate);
                    toDate.setDate(toDate.getDate() + 6);
                    break;
                case 'monthly':
                    fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
                    toDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                    break;
                case 'quarterly':
                    const quarter = Math.floor(today.getMonth() / 3);
                    fromDate = new Date(today.getFullYear(), quarter * 3, 1);
                    toDate = new Date(today.getFullYear(), (quarter + 1) * 3, 0);
                    break;
                case 'yearly':
                    fromDate = new Date(today.getFullYear(), 0, 1);
                    toDate = new Date(today.getFullYear(), 11, 31);
                    break;
                default:
                    return; // No cambiar fechas para 'custom'
            }

            if (fromDate && toDate) {
                dateFromInput.value = typeof Utils !== 'undefined' && Utils.formatDate 
                    ? Utils.formatDate(fromDate, 'YYYY-MM-DD') 
                    : fromDate.toISOString().split('T')[0];
                dateToInput.value = typeof Utils !== 'undefined' && Utils.formatDate 
                    ? Utils.formatDate(toDate, 'YYYY-MM-DD') 
                    : toDate.toISOString().split('T')[0];
            }
        });
    },

    /**
     * Generar reporte histórico agregando múltiples días
     * @param {string} periodType - 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'
     * @param {string} dateFrom - Fecha inicial (YYYY-MM-DD)
     * @param {string} dateTo - Fecha final (YYYY-MM-DD)
     * @param {string|null} branchId - ID de sucursal (opcional)
     */
    async generateHistoricalReport(periodType, dateFrom, dateTo, branchId = null) {
        try {
            // Validar parámetros
            if (!periodType || !dateFrom || !dateTo) {
                Utils.showNotification('Faltan parámetros requeridos: periodType, dateFrom, dateTo', 'error');
                return;
            }

            if (new Date(dateFrom) > new Date(dateTo)) {
                Utils.showNotification('La fecha inicial no puede ser mayor que la fecha final', 'error');
                return;
            }

            const currentBranchId = branchId || (typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : null);

            // Obtener reportes archivados del rango de fechas
            // IMPORTANTE: Usar IndexedDB local como fuente primaria porque puede contener
            // valores recalculados manualmente que son más precisos que los del servidor.
            let archivedReports = [];

            // PASO 1: Obtener reportes locales (fuente primaria — puede incluir recálculos)
            const localArchived = await DB.getAll('archived_quick_captures') || [];
            const localInRange = localArchived.filter(r => {
                const reportDate = (r.date || r.report_date || '').split('T')[0];
                const matchesBranch = !currentBranchId || r.branch_id === currentBranchId;
                return reportDate >= dateFrom && reportDate <= dateTo && matchesBranch;
            });

            // Construir mapa por fecha+sucursal de reportes locales
            const localByKey = new Map();
            for (const r of localInRange) {
                const key = `${(r.date || r.report_date || '').split('T')[0]}_${r.branch_id}`;
                const existing = localByKey.get(key);
                if (!existing) {
                    localByKey.set(key, r);
                } else {
                    // Si hay duplicados, preferir el que tiene recalculated_at más reciente
                    const existingTS = existing.recalculated_at ? new Date(existing.recalculated_at).getTime() : (existing.archived_at ? new Date(existing.archived_at).getTime() : 0);
                    const currentTS = r.recalculated_at ? new Date(r.recalculated_at).getTime() : (r.archived_at ? new Date(r.archived_at).getTime() : 0);
                    if (currentTS > existingTS) localByKey.set(key, r);
                }
            }

            // PASO 2: Complementar con datos del servidor para fechas que no estén localmente
            if (typeof API !== 'undefined' && API.getArchivedReports) {
                try {
                    const filters = { date_from: dateFrom, date_to: dateTo };
                    if (currentBranchId) filters.branch_id = currentBranchId;
                    const serverReports = await API.getArchivedReports(filters) || [];
                    console.log(`📥 ${serverReports.length} reportes archivados obtenidos del servidor`);

                    for (const sr of serverReports) {
                        const srDate = (sr.report_date || sr.date || '').split('T')[0];
                        const key = `${srDate}_${sr.branch_id}`;
                        if (!localByKey.has(key)) {
                            // No existe localmente: usar datos del servidor
                            localByKey.set(key, sr);
                            console.log(`📥 Reporte del servidor añadido (no existe localmente): ${srDate}`);
                        } else {
                            // Existe localmente: verificar si el local fue recalculado
                            const local = localByKey.get(key);
                            const localRecalcTS = local.recalculated_at ? new Date(local.recalculated_at).getTime() : 0;
                            const serverUpdatedTS = sr.updated_at ? new Date(sr.updated_at).getTime() : 0;
                            if (localRecalcTS > serverUpdatedTS) {
                                console.log(`🔒 Usando valores recalculados localmente para ${srDate} (recalculated_at=${local.recalculated_at})`);
                                // Conservar local (ya está en el mapa)
                            } else {
                                // El servidor tiene datos más recientes que el recálculo — usar servidor
                                localByKey.set(key, sr);
                            }
                        }
                    }
                } catch (error) {
                    console.warn('Error obteniendo reportes archivados del servidor, usando solo locales:', error);
                }
            }

            archivedReports = Array.from(localByKey.values());
            console.log(`📊 ${archivedReports.length} reportes archivados fusionados (local + servidor) para el histórico`);

            if (archivedReports.length === 0) {
                Utils.showNotification(`No hay reportes archivados en el rango ${dateFrom} a ${dateTo}`, 'warning');
                return;
            }

            // Agregar datos de todos los reportes
            let totalDays = 0;
            let totalCaptures = 0;
            let totalQuantity = 0;
            let totalSalesMXN = 0;
            let totalCOGS = 0;
            let totalCommissions = 0;
            let totalArrivalCosts = 0;
            let totalOperatingCosts = 0;
            let totalBankCommissions = 0;
            let grossProfit = 0;
            let netProfit = 0;
            const dailySummary = [];
            const archivedReportIds = [];

            // Agregar métricas por agencia, guía y vendedor
            const metricsByAgency = {};
            const metricsByGuide = {};
            const metricsBySeller = {};
            let totalPassengers = 0;

            archivedReports.forEach(report => {
                totalDays++;
                totalCaptures += parseInt(report.total_captures || report.captures?.length || 0);
                totalQuantity += parseInt(report.total_quantity || 0);
                totalSalesMXN += parseFloat(report.total_sales_mxn || 0);
                totalCOGS += parseFloat(report.total_cogs || 0);
                totalCommissions += parseFloat(report.total_commissions || 0);
                totalArrivalCosts += parseFloat(report.total_arrival_costs || 0);
                totalOperatingCosts += parseFloat(report.total_operating_costs || 0);
                totalBankCommissions += parseFloat(report.bank_commissions || 0);
                grossProfit += parseFloat(report.gross_profit || 0);
                netProfit += parseFloat(report.net_profit || 0);

                // Agregar a daily_summary
                const reportDate = this.getArchivedReportDate(report);
                dailySummary.push({
                    date: reportDate,
                    captures: parseInt(report.total_captures || report.captures?.length || 0),
                    sales_mxn: parseFloat(report.total_sales_mxn || 0),
                    gross_profit: parseFloat(report.gross_profit || 0),
                    net_profit: parseFloat(report.net_profit || 0)
                });

                // Guardar ID del reporte archivado
                if (report.id) {
                    archivedReportIds.push(report.id);
                }

                // Agregar métricas del reporte (si existen)
                if (report.metrics || report.captures) {
                    // Métricas generales: sumar pasajeros (las capturas individuales no tienen pax)
                    if (report.metrics?.general?.total_pasajeros) {
                        totalPassengers += parseInt(report.metrics.general.total_pasajeros || 0);
                    }

                    // Construir mapa de nombres y pasajeros desde metrics (la fuente correcta para esos datos)
                    const agencyNameMap = {};
                    const guideNameMap = {};
                    const guideAgencyMap = {};
                    const sellerNameMap = {};
                    const agencyPaxFromMetrics = {};
                    const guidePaxFromMetrics = {};

                    if (report.metrics) {
                        (report.metrics.por_agencia || []).forEach(a => {
                            if (a.agency_id) {
                                agencyNameMap[a.agency_id] = a.agency_name || 'Desconocida';
                                agencyPaxFromMetrics[a.agency_id] = (agencyPaxFromMetrics[a.agency_id] || 0) + parseInt(a.pasajeros || 0);
                            }
                        });
                        (report.metrics.por_guia || []).forEach(g => {
                            if (g.guide_id) {
                                guideNameMap[g.guide_id] = g.guide_name || 'Desconocido';
                                guideAgencyMap[g.guide_id] = { agency_id: g.agency_id, agency_name: g.agency_name || 'Desconocida' };
                                guidePaxFromMetrics[g.guide_id] = (guidePaxFromMetrics[g.guide_id] || 0) + parseInt(g.pasajeros || 0);
                            }
                        });
                        (report.metrics.por_vendedor || []).forEach(s => {
                            if (s.seller_id) sellerNameMap[s.seller_id] = s.seller_name || 'Desconocido';
                        });
                    }

                    const capturesToProcess = report.captures && Array.isArray(report.captures) && report.captures.length > 0
                        ? report.captures : null;

                    if (capturesToProcess) {
                        // Recomputar totales desde capturas individuales para evitar datos acumulados
                        // incorrectos que puedan estar almacenados en report.metrics.
                        // capture.total ya está en MXN (convertido al registrar la captura).
                        capturesToProcess.forEach(capture => {
                            const totalMXN = parseFloat(capture.total) || 0;

                            // Por agencia
                            const agencyId = capture.agency_id;
                            if (agencyId) {
                                if (!metricsByAgency[agencyId]) {
                                    metricsByAgency[agencyId] = {
                                        agency_id: agencyId,
                                        agency_name: agencyNameMap[agencyId] || 'Desconocida',
                                        ventas: 0, total_ventas_mxn: 0, pasajeros: 0
                                    };
                                }
                                metricsByAgency[agencyId].ventas++;
                                metricsByAgency[agencyId].total_ventas_mxn += totalMXN;
                            }

                            // Por guía
                            const guideId = capture.guide_id;
                            if (guideId) {
                                if (!metricsByGuide[guideId]) {
                                    const ga = guideAgencyMap[guideId] || { agency_id: capture.agency_id, agency_name: agencyNameMap[capture.agency_id] || 'Desconocida' };
                                    metricsByGuide[guideId] = {
                                        guide_id: guideId,
                                        guide_name: guideNameMap[guideId] || 'Desconocido',
                                        agency_id: ga.agency_id,
                                        agency_name: ga.agency_name,
                                        ventas: 0, total_ventas_mxn: 0, pasajeros: 0
                                    };
                                }
                                metricsByGuide[guideId].ventas++;
                                metricsByGuide[guideId].total_ventas_mxn += totalMXN;
                            }

                            // Por vendedor
                            const sellerId = capture.seller_id;
                            if (sellerId) {
                                if (!metricsBySeller[sellerId]) {
                                    metricsBySeller[sellerId] = {
                                        seller_id: sellerId,
                                        seller_name: sellerNameMap[sellerId] || 'Desconocido',
                                        ventas: 0, total_ventas_mxn: 0
                                    };
                                }
                                metricsBySeller[sellerId].ventas++;
                                metricsBySeller[sellerId].total_ventas_mxn += totalMXN;
                            }
                        });

                        // Añadir pasajeros desde metrics (no están en capturas individuales)
                        Object.entries(agencyPaxFromMetrics).forEach(([id, pax]) => {
                            if (metricsByAgency[id]) metricsByAgency[id].pasajeros += pax;
                        });
                        Object.entries(guidePaxFromMetrics).forEach(([id, pax]) => {
                            if (metricsByGuide[id]) metricsByGuide[id].pasajeros += pax;
                        });

                    } else if (report.metrics) {
                        // Fallback: usar metrics pre-computados si no hay captures disponibles
                        if (report.metrics.por_agencia && Array.isArray(report.metrics.por_agencia)) {
                            report.metrics.por_agencia.forEach(agencyMetric => {
                                const agencyId = agencyMetric.agency_id;
                                if (!metricsByAgency[agencyId]) {
                                    metricsByAgency[agencyId] = {
                                        agency_id: agencyId,
                                        agency_name: agencyMetric.agency_name || 'Desconocida',
                                        ventas: 0, total_ventas_mxn: 0, pasajeros: 0
                                    };
                                }
                                metricsByAgency[agencyId].ventas += parseInt(agencyMetric.ventas || 0);
                                metricsByAgency[agencyId].total_ventas_mxn += parseFloat(agencyMetric.total_ventas_mxn || 0);
                                metricsByAgency[agencyId].pasajeros += parseInt(agencyMetric.pasajeros || 0);
                            });
                        }
                        if (report.metrics.por_guia && Array.isArray(report.metrics.por_guia)) {
                            report.metrics.por_guia.forEach(guideMetric => {
                                const guideId = guideMetric.guide_id;
                                if (!metricsByGuide[guideId]) {
                                    metricsByGuide[guideId] = {
                                        guide_id: guideId,
                                        guide_name: guideMetric.guide_name || 'Desconocido',
                                        agency_id: guideMetric.agency_id,
                                        agency_name: guideMetric.agency_name || 'Desconocida',
                                        ventas: 0, total_ventas_mxn: 0, pasajeros: 0
                                    };
                                }
                                metricsByGuide[guideId].ventas += parseInt(guideMetric.ventas || 0);
                                metricsByGuide[guideId].total_ventas_mxn += parseFloat(guideMetric.total_ventas_mxn || 0);
                                metricsByGuide[guideId].pasajeros += parseInt(guideMetric.pasajeros || 0);
                            });
                        }
                        if (report.metrics.por_vendedor && Array.isArray(report.metrics.por_vendedor)) {
                            report.metrics.por_vendedor.forEach(sellerMetric => {
                                const sellerId = sellerMetric.seller_id;
                                if (!metricsBySeller[sellerId]) {
                                    metricsBySeller[sellerId] = {
                                        seller_id: sellerId,
                                        seller_name: sellerMetric.seller_name || 'Desconocido',
                                        ventas: 0, total_ventas_mxn: 0
                                    };
                                }
                                metricsBySeller[sellerId].ventas += parseInt(sellerMetric.ventas || 0);
                                metricsBySeller[sellerId].total_ventas_mxn += parseFloat(sellerMetric.total_ventas_mxn || 0);
                            });
                        }
                    }
                }
            });

            // Calcular métricas agregadas finales
            const aggregatedMetrics = {
                general: {
                    total_ventas: totalCaptures,
                    total_pasajeros: totalPassengers,
                    cierre_percent: totalPassengers > 0 ? parseFloat(((totalCaptures / totalPassengers) * 100).toFixed(2)) : 0
                },
                por_agencia: Object.values(metricsByAgency).map(agency => ({
                    agency_id: agency.agency_id,
                    agency_name: agency.agency_name,
                    ventas: agency.ventas,
                    pasajeros: agency.pasajeros,
                    cierre_percent: agency.pasajeros > 0 ? parseFloat(((agency.ventas / agency.pasajeros) * 100).toFixed(2)) : 0,
                    ticket_promedio: agency.ventas > 0 ? parseFloat((agency.total_ventas_mxn / agency.ventas).toFixed(2)) : 0,
                    total_ventas_mxn: parseFloat((parseFloat(agency.total_ventas_mxn) || 0).toFixed(2))
                })),
                por_guia: Object.values(metricsByGuide).map(guide => ({
                    guide_id: guide.guide_id,
                    guide_name: guide.guide_name,
                    agency_id: guide.agency_id,
                    agency_name: guide.agency_name,
                    ventas: guide.ventas,
                    pasajeros: guide.pasajeros,
                    cierre_percent: guide.pasajeros > 0 ? parseFloat(((guide.ventas / guide.pasajeros) * 100).toFixed(2)) : 0,
                    ticket_promedio: guide.ventas > 0 ? parseFloat((guide.total_ventas_mxn / guide.ventas).toFixed(2)) : 0,
                    total_ventas_mxn: parseFloat((parseFloat(guide.total_ventas_mxn) || 0).toFixed(2))
                })),
                por_vendedor: Object.values(metricsBySeller).map(seller => ({
                    seller_id: seller.seller_id,
                    seller_name: seller.seller_name,
                    ventas: seller.ventas,
                    ticket_promedio: seller.ventas > 0 ? parseFloat((seller.total_ventas_mxn / seller.ventas).toFixed(2)) : 0,
                    total_ventas_mxn: parseFloat((parseFloat(seller.total_ventas_mxn) || 0).toFixed(2))
                }))
            };

            // Generar nombre del período automáticamente
            let periodName = '';
            // Parsear en tiempo local para evitar error de zona horaria UTC
            const [pfY, pfM, pfD] = dateFrom.split('-').map(Number);
            const pfDate = new Date(pfY, pfM - 1, pfD);
            if (periodType === 'monthly') {
                const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                periodName = `${monthNames[pfDate.getMonth()]} ${pfDate.getFullYear()}`;
            } else if (periodType === 'yearly') {
                periodName = pfDate.getFullYear().toString();
            } else if (periodType === 'quarterly') {
                const quarter = Math.floor(pfDate.getMonth() / 3) + 1;
                periodName = `Q${quarter} ${pfDate.getFullYear()}`;
            } else if (periodType === 'weekly') {
                periodName = `Semana ${dateFrom} a ${dateTo}`;
            } else {
                periodName = `${dateFrom} a ${dateTo}`;
            }

            // Crear objeto de reporte histórico
            const historicalReport = {
                id: 'historical_' + periodType + '_' + dateFrom + '_' + Date.now(),
                period_type: periodType,
                period_name: periodName,
                date_from: dateFrom,
                date_to: dateTo,
                branch_id: currentBranchId,
                total_days: totalDays,
                total_captures: totalCaptures,
                total_quantity: totalQuantity,
                total_sales_mxn: parseFloat(totalSalesMXN.toFixed(2)),
                total_cogs: parseFloat(totalCOGS.toFixed(2)),
                total_commissions: parseFloat(totalCommissions.toFixed(2)),
                total_arrival_costs: parseFloat(totalArrivalCosts.toFixed(2)),
                total_operating_costs: parseFloat(totalOperatingCosts.toFixed(2)),
                total_bank_commissions: parseFloat(totalBankCommissions.toFixed(2)),
                gross_profit: parseFloat(grossProfit.toFixed(2)),
                net_profit: parseFloat(netProfit.toFixed(2)),
                daily_summary: dailySummary,
                archived_report_ids: archivedReportIds,
                metrics: aggregatedMetrics,
                created_at: new Date().toISOString(),
                created_by: typeof UserManager !== 'undefined' && UserManager.currentUser ? UserManager.currentUser.id : null
            };

            // Guardar localmente en IndexedDB
            try {
                // Verificar si el store existe
                if (!DB.db || !DB.db.objectStoreNames.contains('historical_reports')) {
                    console.warn('Store historical_reports no existe, creando...');
                    // El store se creará automáticamente al hacer put
                }
                await DB.put('historical_reports', historicalReport);
                console.log('✅ Reporte histórico guardado localmente:', historicalReport.id);
            } catch (dbError) {
                console.error('Error guardando reporte histórico localmente:', dbError);
                throw new Error(`No se pudo guardar el reporte histórico: ${dbError.message}`);
            }

            // Guardar en servidor
            if (typeof API !== 'undefined' && API.generateHistoricalReport) {
                try {
                    console.log('📤 Guardando reporte histórico en servidor...');
                    const serverReport = await API.generateHistoricalReport({
                        period_type: periodType,
                        period_name: periodName,
                        date_from: dateFrom,
                        date_to: dateTo,
                        branch_id: currentBranchId,
                        archived_report_ids: archivedReportIds,
                        metrics: aggregatedMetrics
                    });
                    console.log('✅ Reporte histórico guardado en servidor:', serverReport.id);
                    
                    // Actualizar ID local con el del servidor si es diferente
                    if (serverReport.id && serverReport.id !== historicalReport.id) {
                        historicalReport.id = serverReport.id;
                        await DB.put('historical_reports', historicalReport);
                    }
                } catch (apiError) {
                    console.warn('⚠️ No se pudo guardar reporte histórico en servidor:', apiError);
                    // Continuar aunque falle el servidor
                }
            }

            Utils.showNotification(`Reporte histórico generado: ${periodName}`, 'success');
            
            // Recargar lista de históricos si estamos en esa pestaña
            if (this.currentTab === 'historical') {
                await this.loadHistoricalReports();
            }

            return historicalReport;
        } catch (error) {
            console.error('Error generando reporte histórico:', error);
            Utils.showNotification('Error al generar reporte histórico: ' + error.message, 'error');
            throw error;
        }
    },

    /**
     * Cargar y mostrar lista de reportes históricos
     * @param {Object} filters - Filtros opcionales { branchId?, periodType?, dateFrom?, dateTo? }
     */
    async loadHistoricalReports(filters = {}) {
        try {
            const container = document.getElementById('historical-reports-list');
            if (!container) return;

            // PASO 1: Sincronizar reportes históricos locales que NO están en el servidor (subirlos)
            try {
                if (typeof API !== 'undefined' && API.baseURL && API.generateHistoricalReport) {
                    console.log('📤 [Paso 1 Históricos] Buscando reportes históricos locales que no están en el servidor...');
                    
                    // Obtener todos los reportes históricos locales
                    const allLocalHistorical = await DB.getAll('historical_reports') || [];
                    
                    // Filtrar reportes que NO tienen server_id (no están en el servidor)
                    const unsyncedHistorical = allLocalHistorical.filter(r => !r.server_id);
                    
                    console.log(`📊 [Paso 1 Históricos] Encontrados ${unsyncedHistorical.length} reportes históricos locales sin sincronizar`);
                    
                    if (unsyncedHistorical.length > 0) {
                        const currentBranchId = typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : null;
                        
                        // Agrupar reportes por period_type + date_from + date_to + branch_id para evitar duplicados
                        const historicalByKey = new Map();
                        for (const localReport of unsyncedHistorical) {
                            // Solo procesar reportes de la sucursal actual (o todos si no hay sucursal seleccionada)
                            if (currentBranchId && localReport.branch_id !== currentBranchId) {
                                continue;
                            }
                            
                            const key = `${localReport.period_type}_${localReport.date_from}_${localReport.date_to}_${localReport.branch_id}`;
                            
                            // Si ya hay un reporte con esta clave, usar el más reciente
                            if (!historicalByKey.has(key)) {
                                historicalByKey.set(key, localReport);
                            } else {
                                const existing = historicalByKey.get(key);
                                const existingCreated = existing.created_at ? new Date(existing.created_at) : new Date(0);
                                const currentCreated = localReport.created_at ? new Date(localReport.created_at) : new Date(0);
                                if (currentCreated > existingCreated) {
                                    historicalByKey.set(key, localReport);
                                }
                            }
                        }
                        
                        // Subir solo los reportes únicos
                        let uploadedCount = 0;
                        for (const [key, localReport] of historicalByKey) {
                            try {
                                console.log(`📤 [Paso 1 Históricos] Subiendo reporte histórico local al servidor: ${localReport.id} (${localReport.period_name || localReport.period_type})`);
                                
                                // El backend recalcula los totales desde los reportes archivados, así que solo enviamos los metadatos
                                const reportData = {
                                    period_type: localReport.period_type,
                                    period_name: localReport.period_name,
                                    date_from: localReport.date_from,
                                    date_to: localReport.date_to,
                                    branch_id: localReport.branch_id,
                                    archived_report_ids: localReport.archived_report_ids || [],
                                    metrics: localReport.metrics || {}
                                };
                                
                                const serverReport = await API.generateHistoricalReport(reportData);
                                
                                if (serverReport && serverReport.id) {
                                    // Actualizar TODOS los reportes históricos locales con la misma clave
                                    const allLocalHistorical = await DB.getAll('historical_reports') || [];
                                    const reportsToUpdate = allLocalHistorical.filter(r => {
                                        const rKey = `${r.period_type}_${r.date_from}_${r.date_to}_${r.branch_id}`;
                                        return rKey === key;
                                    });
                                    
                                    for (const reportToUpdate of reportsToUpdate) {
                                        reportToUpdate.server_id = serverReport.id;
                                        reportToUpdate.created_by = serverReport.created_by;
                                        reportToUpdate.sync_status = 'synced';
                                        // Actualizar con datos del servidor (más precisos)
                                        reportToUpdate.total_days = serverReport.total_days;
                                        reportToUpdate.total_captures = serverReport.total_captures;
                                        reportToUpdate.total_sales_mxn = serverReport.total_sales_mxn;
                                        reportToUpdate.gross_profit = serverReport.gross_profit;
                                        reportToUpdate.net_profit = serverReport.net_profit;
                                        reportToUpdate.daily_summary = serverReport.daily_summary;
                                        await DB.put('historical_reports', reportToUpdate);
                                    }
                                    
                                    uploadedCount++;
                                    console.log(`✅ [Paso 1 Históricos] Reporte histórico ${localReport.id} subido correctamente (server_id: ${serverReport.id})`);
                                } else {
                                    console.warn(`⚠️ [Paso 1 Históricos] El servidor no devolvió un ID para el reporte ${localReport.id}`);
                                }
                            } catch (uploadError) {
                                // Si el error es 409 (conflicto), significa que ya existe en el servidor
                                if (uploadError.status === 409 || (uploadError.message && uploadError.message.includes('Ya existe'))) {
                                    console.log(`ℹ️ [Paso 1 Históricos] Reporte histórico ${localReport.id} ya existe en el servidor, marcando como sincronizado`);
                                    // Intentar obtener el ID existente del servidor
                                    try {
                                        const serverFilters = {
                                            period_type: localReport.period_type,
                                            date_from: localReport.date_from,
                                            date_to: localReport.date_to,
                                            branch_id: localReport.branch_id
                                        };
                                        const existingReports = await API.getHistoricalReports(serverFilters);
                                        if (existingReports && existingReports.length > 0) {
                                            const existingReport = existingReports[0];
                                            localReport.server_id = existingReport.id;
                                            localReport.sync_status = 'synced';
                                            await DB.put('historical_reports', localReport);
                                            uploadedCount++;
                                        }
                                    } catch (getError) {
                                        console.warn(`⚠️ [Paso 1 Históricos] No se pudo obtener el reporte existente del servidor:`, getError);
                                    }
                                } else {
                                    console.error(`❌ [Paso 1 Históricos] Error subiendo reporte histórico ${localReport.id}:`, uploadError);
                                    console.error('   Mensaje:', uploadError.message);
                                }
                            }
                        }
                        
                        console.log(`✅ [Paso 1 Históricos] Sincronización local→servidor completada: ${uploadedCount} reportes subidos`);
                    }
                } else {
                    console.log('⚠️ [Paso 1 Históricos] API no disponible para subir reportes históricos locales');
                }
            } catch (error) {
                console.error('❌ [Paso 1 Históricos] Error sincronizando reportes históricos locales al servidor:', error);
                // Continuar aunque falle este paso
            }

            // PASO 2: Sincronizar reportes históricos desde el servidor (descargarlos)
            let historicalReports = [];
            try {
                if (typeof API !== 'undefined' && API.baseURL && API.token && API.getHistoricalReports) {
                    console.log('📥 [Paso 2 Históricos] Sincronizando reportes históricos desde el servidor...');
                    
                    const serverFilters = {};
                    const currentBranchId = typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : null;
                    const isMasterAdmin = typeof UserManager !== 'undefined' && (
                        UserManager.currentUser?.role === 'master_admin' ||
                        UserManager.currentUser?.is_master_admin ||
                        UserManager.currentUser?.isMasterAdmin ||
                        UserManager.currentEmployee?.role === 'master_admin' ||
                        (typeof PermissionManager !== 'undefined' && PermissionManager.hasPermission('admin.all'))
                    );
                    
                    // El backend filtra automáticamente por branch_id según el usuario
                    // Master admin puede ver todos, usuarios normales solo su sucursal
                    if (filters.branchId) serverFilters.branch_id = filters.branchId;
                    if (filters.periodType) serverFilters.period_type = filters.periodType;
                    if (filters.dateFrom) serverFilters.date_from = filters.dateFrom;
                    if (filters.dateTo) serverFilters.date_to = filters.dateTo;
                    
                    historicalReports = await API.getHistoricalReports(serverFilters);
                    console.log(`📥 [Paso 2 Históricos] ${historicalReports.length} reportes históricos recibidos del servidor`);
                    
                    // Guardar/actualizar cada reporte en IndexedDB local
                    let savedCount = 0;
                    let updatedCount = 0;
                    for (const serverReport of historicalReports) {
                        try {
                            const key = `${serverReport.period_type}_${serverReport.date_from}_${serverReport.date_to}_${serverReport.branch_id}`;
                            
                            // Verificar si ya existe un reporte local con la misma clave
                            const existingLocalHistorical = await DB.getAll('historical_reports') || [];
                            const existingReport = existingLocalHistorical.find(r => {
                                const rKey = `${r.period_type}_${r.date_from}_${r.date_to}_${r.branch_id}`;
                                return rKey === key;
                            });
                            
                            // Si existe, actualizar; si no, crear nuevo
                            const localReport = {
                                id: existingReport ? existingReport.id : serverReport.id || `historical_${key}`,
                                period_type: serverReport.period_type,
                                period_name: serverReport.period_name,
                                date_from: serverReport.date_from,
                                date_to: serverReport.date_to,
                                branch_id: serverReport.branch_id,
                                total_days: serverReport.total_days || 0,
                                total_captures: serverReport.total_captures || 0,
                                total_quantity: serverReport.total_quantity || 0,
                                total_sales_mxn: serverReport.total_sales_mxn || 0,
                                total_cogs: serverReport.total_cogs || 0,
                                total_commissions: serverReport.total_commissions || 0,
                                total_arrival_costs: serverReport.total_arrival_costs || 0,
                                total_operating_costs: serverReport.total_operating_costs || 0,
                                gross_profit: serverReport.gross_profit || 0,
                                net_profit: serverReport.net_profit || 0,
                                daily_summary: serverReport.daily_summary || [],
                                archived_report_ids: serverReport.archived_report_ids || [],
                                metrics: serverReport.metrics || {},
                                created_at: serverReport.created_at || new Date().toISOString(),
                                created_by: serverReport.created_by,
                                server_id: serverReport.id,
                                sync_status: 'synced'
                            };
                            
                            await DB.put('historical_reports', localReport);
                            
                            if (existingReport) {
                                updatedCount++;
                                console.log(`🔄 [Paso 2 Históricos] Reporte histórico actualizado: ${localReport.id} (${localReport.period_name})`);
                            } else {
                                savedCount++;
                                console.log(`💾 [Paso 2 Históricos] Reporte histórico guardado: ${localReport.id} (${localReport.period_name})`);
                            }
                } catch (error) {
                            console.warn(`⚠️ [Paso 2 Históricos] Error guardando reporte histórico ${serverReport.id}:`, error);
                        }
                    }
                    
                    console.log(`✅ [Paso 2 Históricos] Sincronización servidor→local completada: ${savedCount} nuevos, ${updatedCount} actualizados`);
                } else {
                    console.log('⚠️ [Paso 2 Históricos] API no disponible, usando solo reportes históricos locales');
                }
            } catch (error) {
                console.error('❌ [Paso 2 Históricos] Error sincronizando reportes históricos desde el servidor:', error);
                console.error('   Detalles:', error.message);
            }

            // Si no hay reportes del servidor, obtener de IndexedDB local
            if (historicalReports.length === 0) {
                const localHistorical = await DB.getAll('historical_reports') || [];
                historicalReports = localHistorical;
                console.log(`📥 [Históricos] ${historicalReports.length} reportes históricos obtenidos localmente`);
            }

            // Aplicar filtros locales si es necesario
            if (filters.periodType) {
                historicalReports = historicalReports.filter(r => r.period_type === filters.periodType);
            }
            if (filters.dateFrom) {
                historicalReports = historicalReports.filter(r => r.date_to >= filters.dateFrom);
            }
            if (filters.dateTo) {
                historicalReports = historicalReports.filter(r => r.date_from <= filters.dateTo);
            }
            
            // Filtrar por sucursal actual (si no es master admin)
            const currentBranchId = typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : null;
            const isMasterAdmin = typeof UserManager !== 'undefined' && (
                UserManager.currentUser?.role === 'master_admin' ||
                UserManager.currentUser?.is_master_admin ||
                UserManager.currentUser?.isMasterAdmin ||
                UserManager.currentEmployee?.role === 'master_admin' ||
                (typeof PermissionManager !== 'undefined' && PermissionManager.hasPermission('admin.all'))
            );
            
            if (!isMasterAdmin && currentBranchId) {
                historicalReports = historicalReports.filter(r => r.branch_id === currentBranchId);
                console.log(`🔍 [Históricos] Mostrando ${historicalReports.length} reportes históricos de la sucursal ${currentBranchId}`);
            } else if (isMasterAdmin) {
                console.log(`🔍 [Históricos] Master Admin: mostrando ${historicalReports.length} reportes históricos de todas las sucursales`);
            }
            
            // Eliminar duplicados: mantener solo el más reciente por period_type + date_from + date_to + branch_id
            const historicalByKey = new Map();
            for (const report of historicalReports) {
                const key = `${report.period_type}_${report.date_from}_${report.date_to}_${report.branch_id}`;
                
                if (!historicalByKey.has(key)) {
                    historicalByKey.set(key, report);
                } else {
                    const existing = historicalByKey.get(key);
                    // Preferir el que tiene server_id (está sincronizado)
                    if (report.server_id && !existing.server_id) {
                        historicalByKey.set(key, report);
                    } else if (existing.server_id && !report.server_id) {
                        // Mantener el existente
                    } else {
                        // Si ambos tienen o no tienen server_id, usar el más reciente por created_at
                        const existingCreated = existing.created_at ? new Date(existing.created_at) : new Date(0);
                        const currentCreated = report.created_at ? new Date(report.created_at) : new Date(0);
                        if (currentCreated > existingCreated) {
                            historicalByKey.set(key, report);
                        }
                    }
                }
            }
            
            historicalReports = Array.from(historicalByKey.values());
            console.log(`🔍 [Históricos Deduplicación] ${historicalReports.length} reportes históricos únicos después de eliminar duplicados`);

            // Ordenar por fecha (más recientes primero)
            historicalReports.sort((a, b) => {
                const dateA = new Date(a.date_from || a.created_at);
                const dateB = new Date(b.date_from || b.created_at);
                return dateB - dateA;
            });

            if (historicalReports.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: var(--spacing-lg); color: var(--color-text-secondary);">
                        <i class="fas fa-inbox" style="font-size: 32px; opacity: 0.3; margin-bottom: var(--spacing-sm);"></i>
                        <p>No hay reportes históricos</p>
                        <small style="font-size: 11px; color: var(--color-text-secondary);">
                            Genera un reporte histórico usando el formulario
                        </small>
                    </div>
                `;
                return;
            }

            // Renderizar tabla de reportes históricos
            let html = `
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                        <thead>
                            <tr style="background: var(--color-bg-secondary); border-bottom: 2px solid var(--color-border-light);">
                                <th style="padding: var(--spacing-sm); text-align: left; font-size: 11px; text-transform: uppercase; font-weight: 600;">Período</th>
                                <th style="padding: var(--spacing-sm); text-align: center; font-size: 11px; text-transform: uppercase; font-weight: 600;">Días</th>
                                <th style="padding: var(--spacing-sm); text-align: center; font-size: 11px; text-transform: uppercase; font-weight: 600;">Capturas</th>
                                <th style="padding: var(--spacing-sm); text-align: right; font-size: 11px; text-transform: uppercase; font-weight: 600;">Ventas (MXN)</th>
                                <th style="padding: var(--spacing-sm); text-align: right; font-size: 11px; text-transform: uppercase; font-weight: 600;">Utilidad Bruta</th>
                                <th style="padding: var(--spacing-sm); text-align: right; font-size: 11px; text-transform: uppercase; font-weight: 600;">Utilidad Neta</th>
                                <th style="padding: var(--spacing-sm); text-align: center; font-size: 11px; text-transform: uppercase; font-weight: 600;">% Cierre</th>
                                <th style="padding: var(--spacing-sm); text-align: center; font-size: 11px; text-transform: uppercase; font-weight: 600;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${historicalReports.map(report => {
                                const grossProfit = report.gross_profit || 0;
                                const netProfit = report.net_profit || 0;
                                const totalSales = report.total_sales_mxn || 0;
                                const captureCount = report.total_captures || 0;
                                const totalDays = report.total_days || 0;
                                
                                const grossMargin = totalSales > 0 ? ((grossProfit / totalSales) * 100).toFixed(2) : '0.00';
                                const netMargin = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(2) : '0.00';
                                
                                // Obtener % de cierre de métricas
                                const cierrePercent = report.metrics?.general?.cierre_percent || 0;
                                
                                return `
                                    <tr style="border-bottom: 1px solid var(--color-border-light);">
                                        <td style="padding: var(--spacing-sm);">
                                            <div style="font-weight: 600;">${report.period_name || `${report.date_from} a ${report.date_to}`}</div>
                                            <small style="color: var(--color-text-secondary); font-size: 10px;">${report.period_type || 'custom'}</small>
                                        </td>
                                        <td style="padding: var(--spacing-sm); text-align: center;">${totalDays}</td>
                                        <td style="padding: var(--spacing-sm); text-align: center;">${captureCount}</td>
                                        <td style="padding: var(--spacing-sm); text-align: right; font-weight: 600;">$${totalSales.toFixed(2)}</td>
                                        <td style="padding: var(--spacing-sm); text-align: right;">
                                            <div style="color: var(--color-success); font-weight: 600;">$${grossProfit.toFixed(2)}</div>
                                            <small style="color: var(--color-text-secondary); font-size: 10px;">${grossMargin}%</small>
                                        </td>
                                        <td style="padding: var(--spacing-sm); text-align: right;">
                                            <div style="color: ${netProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}; font-weight: 600;">$${netProfit.toFixed(2)}</div>
                                            <small style="color: var(--color-text-secondary); font-size: 10px;">${netMargin}%</small>
                                        </td>
                                        <td style="padding: var(--spacing-sm); text-align: center; font-weight: 600;">${cierrePercent.toFixed(2)}%</td>
                                        <td style="padding: var(--spacing-sm); text-align: center;">
                                            <div style="display: flex; gap: var(--spacing-xs); justify-content: center; flex-wrap: wrap;">
                                                <button class="btn-primary btn-xs" onclick="window.Reports.viewHistoricalReport('${report.id}')" title="Ver Detalles">
                                                    <i class="fas fa-eye"></i>
                                                </button>
                                                <button class="btn-secondary btn-xs" onclick="window.Reports.exportHistoricalReportPDF('${report.id}')" title="Exportar PDF">
                                                    <i class="fas fa-file-pdf"></i>
                                                </button>
                                                <button class="btn-danger btn-xs" onclick="window.Reports.deleteHistoricalReport('${report.id}')" title="Eliminar">
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

            container.innerHTML = html;
        } catch (error) {
            console.error('Error cargando reportes históricos:', error);
            const container = document.getElementById('historical-reports-list');
            if (container) {
                container.innerHTML = `
                    <div style="padding: var(--spacing-md); background: var(--color-danger); color: white; border-radius: var(--radius-md);">
                        Error al cargar reportes históricos: ${error.message}
                    </div>
                `;
            }
        }
    },

    /**
     * Ver detalles de un reporte histórico
     * @param {string} reportId - ID del reporte histórico
     */
    async viewHistoricalReport(reportId) {
        try {
            // Obtener reporte (servidor o local)
            let report = null;
            
            if (typeof API !== 'undefined' && API.getHistoricalReport) {
                try {
                    report = await API.getHistoricalReport(reportId);
                } catch (error) {
                    console.warn('Error obteniendo reporte histórico del servidor, usando local:', error);
                }
            }

            if (!report) {
                report = await DB.get('historical_reports', reportId);
            }

            if (!report) {
                Utils.showNotification('Reporte histórico no encontrado', 'error');
                return;
            }

            // Crear modal con detalles del reporte
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000; overflow-y: auto; padding: 20px;';
            
            const metrics = report.metrics || {};
            const generalMetrics = metrics.general || {};
            
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 1000px; width: 100%; background: white; border-radius: 8px; padding: 0; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin: auto; position: relative;">
                    <div class="modal-header" style="padding: 16px; border-bottom: 1px solid #e0e0e0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: white;">
                                <i class="fas fa-chart-line" style="margin-right: 8px;"></i>Reporte Histórico - ${report.period_name || `${report.date_from} a ${report.date_to}`}
                            </h3>
                            <button id="close-historical-modal-btn" style="background: transparent; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <div class="modal-body" style="padding: 20px; max-height: calc(100vh - 200px); overflow-y: auto;">
                        <!-- Resumen General -->
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--spacing-md); margin-bottom: var(--spacing-lg);">
                            <div style="padding: var(--spacing-md); background: var(--color-bg-secondary); border-radius: var(--radius-md);">
                                <div style="font-size: 11px; color: var(--color-text-secondary); margin-bottom: 4px;">TOTAL DÍAS</div>
                                <div style="font-size: 20px; font-weight: 700; color: var(--color-primary);">${report.total_days || 0}</div>
                            </div>
                            <div style="padding: var(--spacing-md); background: var(--color-bg-secondary); border-radius: var(--radius-md);">
                                <div style="font-size: 11px; color: var(--color-text-secondary); margin-bottom: 4px;">TOTAL CAPTURAS</div>
                                <div style="font-size: 20px; font-weight: 700; color: var(--color-primary);">${report.total_captures || 0}</div>
                            </div>
                            <div style="padding: var(--spacing-md); background: var(--color-bg-secondary); border-radius: var(--radius-md);">
                                <div style="font-size: 11px; color: var(--color-text-secondary); margin-bottom: 4px;">VENTAS (MXN)</div>
                                <div style="font-size: 20px; font-weight: 700; color: var(--color-primary);">${Utils.formatCurrency(report.total_sales_mxn || 0)}</div>
                            </div>
                            <div style="padding: var(--spacing-md); background: var(--color-bg-secondary); border-radius: var(--radius-md);">
                                <div style="font-size: 11px; color: var(--color-text-secondary); margin-bottom: 4px;">UTILIDAD BRUTA</div>
                                <div style="font-size: 20px; font-weight: 700; color: var(--color-success);">${Utils.formatCurrency(report.gross_profit || 0)}</div>
                            </div>
                            <div style="padding: var(--spacing-md); background: var(--color-bg-secondary); border-radius: var(--radius-md);">
                                <div style="font-size: 11px; color: var(--color-text-secondary); margin-bottom: 4px;">UTILIDAD NETA</div>
                                <div style="font-size: 20px; font-weight: 700; color: var(--color-primary);">${Utils.formatCurrency(report.net_profit || 0)}</div>
                            </div>
                            <div style="padding: var(--spacing-md); background: var(--color-bg-secondary); border-radius: var(--radius-md);">
                                <div style="font-size: 11px; color: var(--color-text-secondary); margin-bottom: 4px;">% DE CIERRE</div>
                                <div style="font-size: 20px; font-weight: 700; color: var(--color-primary);">${generalMetrics.cierre_percent || 0}%</div>
                                <small style="font-size: 10px; color: var(--color-text-secondary);">${generalMetrics.total_ventas || 0} ventas / ${generalMetrics.total_pasajeros || 0} pasajeros</small>
                            </div>
                        </div>

                        <!-- Métricas por Agencia -->
                        ${metrics.por_agencia && metrics.por_agencia.length > 0 ? `
                            <div style="margin-bottom: var(--spacing-lg);">
                                <h4 style="margin: 0 0 var(--spacing-sm) 0; font-size: 14px; font-weight: 600; text-transform: uppercase;">Métricas por Agencia</h4>
                                <div style="overflow-x: auto;">
                                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                                        <thead>
                                            <tr style="background: var(--color-bg-secondary); border-bottom: 2px solid var(--color-border-light);">
                                                <th style="padding: var(--spacing-xs); text-align: left;">Agencia</th>
                                                <th style="padding: var(--spacing-xs); text-align: center;">Ventas</th>
                                                <th style="padding: var(--spacing-xs); text-align: center;">Pasajeros</th>
                                                <th style="padding: var(--spacing-xs); text-align: center;">% Cierre</th>
                                                <th style="padding: var(--spacing-xs); text-align: right;">Ticket Promedio</th>
                                                <th style="padding: var(--spacing-xs); text-align: right;">Total Ventas</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${metrics.por_agencia.map(agency => `
                                                <tr style="border-bottom: 1px solid var(--color-border-light);">
                                                    <td style="padding: var(--spacing-xs);">${agency.agency_name}</td>
                                                    <td style="padding: var(--spacing-xs); text-align: center;">${agency.ventas}</td>
                                                    <td style="padding: var(--spacing-xs); text-align: center;">${agency.pasajeros}</td>
                                                    <td style="padding: var(--spacing-xs); text-align: center; font-weight: 600;">${agency.cierre_percent.toFixed(2)}%</td>
                                                    <td style="padding: var(--spacing-xs); text-align: right;">${Utils.formatCurrency(agency.ticket_promedio || 0)}</td>
                                                    <td style="padding: var(--spacing-xs); text-align: right; font-weight: 600;">${Utils.formatCurrency(agency.total_ventas_mxn || 0)}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ` : ''}

                        <!-- Métricas por Guía -->
                        ${metrics.por_guia && metrics.por_guia.length > 0 ? `
                            <div style="margin-bottom: var(--spacing-lg);">
                                <h4 style="margin: 0 0 var(--spacing-sm) 0; font-size: 14px; font-weight: 600; text-transform: uppercase;">Métricas por Guía</h4>
                                <div style="overflow-x: auto;">
                                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                                        <thead>
                                            <tr style="background: var(--color-bg-secondary); border-bottom: 2px solid var(--color-border-light);">
                                                <th style="padding: var(--spacing-xs); text-align: left;">Guía</th>
                                                <th style="padding: var(--spacing-xs); text-align: left;">Agencia</th>
                                                <th style="padding: var(--spacing-xs); text-align: center;">Ventas</th>
                                                <th style="padding: var(--spacing-xs); text-align: center;">Pasajeros</th>
                                                <th style="padding: var(--spacing-xs); text-align: center;">% Cierre</th>
                                                <th style="padding: var(--spacing-xs); text-align: right;">Ticket Promedio</th>
                                                <th style="padding: var(--spacing-xs); text-align: right;">Total Ventas</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${metrics.por_guia.map(guide => `
                                                <tr style="border-bottom: 1px solid var(--color-border-light);">
                                                    <td style="padding: var(--spacing-xs);">${guide.guide_name}</td>
                                                    <td style="padding: var(--spacing-xs);">${guide.agency_name}</td>
                                                    <td style="padding: var(--spacing-xs); text-align: center;">${guide.ventas}</td>
                                                    <td style="padding: var(--spacing-xs); text-align: center;">${guide.pasajeros}</td>
                                                    <td style="padding: var(--spacing-xs); text-align: center; font-weight: 600;">${guide.cierre_percent.toFixed(2)}%</td>
                                                    <td style="padding: var(--spacing-xs); text-align: right;">${Utils.formatCurrency(guide.ticket_promedio || 0)}</td>
                                                    <td style="padding: var(--spacing-xs); text-align: right; font-weight: 600;">${Utils.formatCurrency(guide.total_ventas_mxn || 0)}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ` : ''}

                        <!-- Métricas por Vendedor -->
                        ${metrics.por_vendedor && metrics.por_vendedor.length > 0 ? `
                            <div style="margin-bottom: var(--spacing-lg);">
                                <h4 style="margin: 0 0 var(--spacing-sm) 0; font-size: 14px; font-weight: 600; text-transform: uppercase;">Métricas por Vendedor</h4>
                                <div style="overflow-x: auto;">
                                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                                        <thead>
                                            <tr style="background: var(--color-bg-secondary); border-bottom: 2px solid var(--color-border-light);">
                                                <th style="padding: var(--spacing-xs); text-align: left;">Vendedor</th>
                                                <th style="padding: var(--spacing-xs); text-align: center;">Ventas</th>
                                                <th style="padding: var(--spacing-xs); text-align: right;">Ticket Promedio</th>
                                                <th style="padding: var(--spacing-xs); text-align: right;">Total Ventas</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${metrics.por_vendedor.map(seller => `
                                                <tr style="border-bottom: 1px solid var(--color-border-light);">
                                                    <td style="padding: var(--spacing-xs);">${seller.seller_name}</td>
                                                    <td style="padding: var(--spacing-xs); text-align: center;">${seller.ventas}</td>
                                                    <td style="padding: var(--spacing-xs); text-align: right;">${Utils.formatCurrency(seller.ticket_promedio || 0)}</td>
                                                    <td style="padding: var(--spacing-xs); text-align: right; font-weight: 600;">${Utils.formatCurrency(seller.total_ventas_mxn || 0)}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ` : ''}

                        <!-- Resumen Día por Día -->
                        ${report.daily_summary && report.daily_summary.length > 0 ? `
                            <div style="margin-bottom: var(--spacing-lg);">
                                <h4 style="margin: 0 0 var(--spacing-sm) 0; font-size: 14px; font-weight: 600; text-transform: uppercase;">Resumen Día por Día</h4>
                                <div style="overflow-x: auto; max-height: 400px;">
                                    <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                                        <thead style="position: sticky; top: 0; background: var(--color-bg-secondary); z-index: 10;">
                                            <tr style="border-bottom: 2px solid var(--color-border-light);">
                                                <th style="padding: var(--spacing-xs); text-align: left;">Fecha</th>
                                                <th style="padding: var(--spacing-xs); text-align: center;">Capturas</th>
                                                <th style="padding: var(--spacing-xs); text-align: right;">Ventas (MXN)</th>
                                                <th style="padding: var(--spacing-xs); text-align: right;">Utilidad Bruta</th>
                                                <th style="padding: var(--spacing-xs); text-align: right;">Utilidad Neta</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${report.daily_summary.map(day => `
                                                <tr style="border-bottom: 1px solid var(--color-border-light);">
                                                    <td style="padding: var(--spacing-xs);">${this.formatDateWithoutTimezone(day.date)}</td>
                                                    <td style="padding: var(--spacing-xs); text-align: center;">${day.captures || 0}</td>
                                                    <td style="padding: var(--spacing-xs); text-align: right;">${Utils.formatCurrency(day.sales_mxn || 0)}</td>
                                                    <td style="padding: var(--spacing-xs); text-align: right;">${Utils.formatCurrency(day.gross_profit || 0)}</td>
                                                    <td style="padding: var(--spacing-xs); text-align: right;">${Utils.formatCurrency(day.net_profit || 0)}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    <div class="modal-footer" style="padding: 16px; border-top: 1px solid #e0e0e0; display: flex; gap: 10px; justify-content: flex-end;">
                        <button class="btn-primary" id="close-historical-modal-footer-btn" style="min-width: 100px;">
                            <i class="fas fa-times"></i> Cerrar
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Event listeners para cerrar
            const closeModal = () => modal.remove();
            document.getElementById('close-historical-modal-btn').onclick = closeModal;
            document.getElementById('close-historical-modal-footer-btn').onclick = closeModal;

            // Cerrar con ESC
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    closeModal();
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        } catch (error) {
            console.error('Error mostrando reporte histórico:', error);
            Utils.showNotification('Error al mostrar reporte histórico: ' + error.message, 'error');
        }
    },

    /**
     * Exportar reporte histórico a PDF
     * @param {string} reportId - ID del reporte histórico
     */
    async exportHistoricalReportPDF(reportId) {
        try {
            // Obtener reporte
            let report = null;
            
            if (typeof API !== 'undefined' && API.getHistoricalReport) {
                try {
                    report = await API.getHistoricalReport(reportId);
                } catch (error) {
                    console.warn('Error obteniendo reporte histórico del servidor, usando local:', error);
                }
            }

            if (!report) {
                report = await DB.get('historical_reports', reportId);
            }

            if (!report) {
                Utils.showNotification('Reporte histórico no encontrado', 'error');
                return;
            }

            const jspdfLib = Utils.checkJsPDF ? Utils.checkJsPDF() : (window.jspdf || window.jsPDF ? { jsPDF: window.jspdf?.jsPDF || window.jsPDF } : null);
            if (!jspdfLib) {
                Utils.showNotification('jsPDF no está disponible', 'error');
                return;
            }
            const { jsPDF } = jspdfLib;

            const metrics = report.metrics || {};
            const generalMetrics = metrics.general || {};
            const porAgencia = metrics.por_agencia || [];
            const porGuia = metrics.por_guia || [];
            const porVendedor = metrics.por_vendedor || [];
            const dailySummary = report.daily_summary || [];

            const doc = new jsPDF('l', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 12;
            let y = margin;

            const generatedAtStr = new Date().toLocaleString('es-MX');

            // ========== HELPER: TÍTULO DE SECCIÓN ==========
            const drawSectionTitle = (text, yPos) => {
                doc.setDrawColor(180, 180, 180);
                doc.setLineWidth(0.3);
                doc.line(margin, yPos, pageWidth - margin, yPos);
                doc.setFillColor(245, 247, 250);
                doc.rect(margin, yPos + 0.5, pageWidth - margin * 2, 10, 'F');
                doc.setDrawColor(212, 160, 23);
                doc.setLineWidth(0.6);
                doc.line(margin, yPos + 10.5, pageWidth - margin, yPos + 10.5);
                doc.setLineWidth(0.2);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(44, 62, 80);
                doc.text(text, pageWidth / 2, yPos + 7.5, { align: 'center' });
                doc.setTextColor(0, 0, 0);
                doc.setDrawColor(0, 0, 0);
                return yPos + 16;
            };

            const checkPage = (needed) => {
                if (y + needed > pageHeight - 20) { doc.addPage(); y = margin; }
            };

            // ========== HEADER ==========
            doc.setFillColor(44, 62, 80);
            doc.rect(0, 0, pageWidth, 40, 'F');
            doc.setFillColor(212, 160, 23);
            doc.rect(0, 40, pageWidth, 3, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text('OPAL & CO', margin, 16);

            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(200, 215, 230);
            doc.text('Reporte Histórico de Período', margin, 28);

            doc.setFontSize(9);
            doc.setTextColor(200, 215, 230);
            doc.text(generatedAtStr, pageWidth - margin, 16, { align: 'right' });

            const periodLabel = `Período: ${report.period_name || `${report.date_from} – ${report.date_to}`}`;
            const pillW = doc.getStringUnitWidth(periodLabel) * 9 / doc.internal.scaleFactor + 8;
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setFillColor(212, 160, 23);
            doc.rect(pageWidth - margin - pillW, 21, pillW, 9, 'F');
            doc.setTextColor(255, 255, 255);
            doc.text(periodLabel, pageWidth - margin - pillW + 4, 27);

            doc.setTextColor(0, 0, 0);
            y = 52;

            // ========== SECCIÓN KPIs ==========
            y = drawSectionTitle('RESUMEN DEL PERÍODO', y);

            const kpiData = [
                ['DÍAS ANALIZADOS', String(report.total_days || 0)],
                ['CAPTURAS TOTALES', String(report.total_captures || 0)],
                ['VENTAS (MXN)', `$${(parseFloat(report.total_sales_mxn) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
                ['UTILIDAD BRUTA', `$${(parseFloat(report.gross_profit) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
                ['UTILIDAD NETA', `$${(parseFloat(report.net_profit) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
                ['% CIERRE', `${generalMetrics.cierre_percent || 0}%  (${generalMetrics.total_ventas || 0} ventas / ${generalMetrics.total_pasajeros || 0} pax)`],
            ];
            const kpiCols = 3;
            const kpiW = (pageWidth - margin * 2 - (kpiCols - 1) * 4) / kpiCols;
            const kpiH = 24;
            kpiData.forEach((kpi, idx) => {
                const col = idx % kpiCols;
                const row = Math.floor(idx / kpiCols);
                const kx = margin + col * (kpiW + 4);
                const ky = y + row * (kpiH + 3);
                doc.setFillColor(248, 250, 253);
                doc.rect(kx, ky, kpiW, kpiH, 'F');
                doc.setDrawColor(210, 215, 220);
                doc.rect(kx, ky, kpiW, kpiH);
                doc.setFontSize(7);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(120, 130, 140);
                doc.text(kpi[0], kx + kpiW / 2, ky + 8, { align: 'center' });
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(44, 62, 80);
                doc.text(kpi[1], kx + kpiW / 2, ky + 18, { align: 'center', maxWidth: kpiW - 4 });
            });
            const kpiRows = Math.ceil(kpiData.length / kpiCols);
            y += kpiRows * (kpiH + 3) + 4;
            doc.setTextColor(0, 0, 0);

            // ========== SECCIÓN P&L ==========
            checkPage(110);
            y = drawSectionTitle('ESTADO DE RESULTADOS', y);

            const totalSalesMXN = parseFloat(report.total_sales_mxn) || 0;
            const totalCOGS = parseFloat(report.total_cogs) || 0;
            const totalComm = parseFloat(report.total_commissions) || 0;
            const grossProfit = parseFloat(report.gross_profit) || 0;
            const totalArrival = parseFloat(report.total_arrival_costs) || 0;
            const totalOps = parseFloat(report.total_operating_costs) || 0;
            const netProfit = parseFloat(report.net_profit) || 0;
            // Comisiones bancarias: campo explícito o inferido del gap P&L
            const totalBankComm = parseFloat(report.total_bank_commissions || 0) ||
                Math.max(0, grossProfit - totalArrival - totalOps - netProfit);
            const grossMarginPct = totalSalesMXN > 0 ? (grossProfit / totalSalesMXN * 100) : 0;
            const netMarginPct = totalSalesMXN > 0 ? (netProfit / totalSalesMXN * 100) : 0;

            const fmt = (n) => `$${(parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            const plLineH = 9;
            const plLabelX = margin + 8;
            const plValX = pageWidth - margin - 8;
            const drawPLRow = (label, value, yh, opts = {}) => {
                const { bold = false, color = [60, 60, 70], bgColor = null, indent = 0 } = opts;
                if (bgColor) { doc.setFillColor(...bgColor); doc.rect(margin, yh, pageWidth - margin * 2, plLineH, 'F'); }
                doc.setDrawColor(225, 228, 232);
                doc.line(margin, yh + plLineH, pageWidth - margin, yh + plLineH);
                doc.setFont('helvetica', bold ? 'bold' : 'normal');
                doc.setFontSize(9);
                doc.setTextColor(...color);
                doc.text(label, plLabelX + indent, yh + 6.5);
                doc.setFont('helvetica', 'bold');
                doc.text(value, plValX, yh + 6.5, { align: 'right' });
                doc.setTextColor(0, 0, 0);
                return yh + plLineH;
            };

            const plBox = (totalBankComm > 0 ? 9 : 8) * plLineH + 4;
            doc.setFillColor(248, 255, 250);
            doc.rect(margin, y, pageWidth - margin * 2, plBox, 'F');
            doc.setDrawColor(180, 215, 185);
            doc.rect(margin, y, pageWidth - margin * 2, plBox);

            y = drawPLRow('Ingresos Totales del Período:', fmt(totalSalesMXN), y, { bold: true, color: [30, 30, 40], bgColor: [240, 250, 243] });
            y = drawPLRow('(-) Costo de Mercancía (COGS):', fmt(totalCOGS), y, { indent: 8 });
            y = drawPLRow('(-) Comisiones (Vendedores + Guías):', fmt(totalComm), y, { indent: 8 });
            doc.setFillColor(212, 160, 23); doc.rect(margin, y, pageWidth - margin * 2, 0.8, 'F'); y += 1;
            const gcol = grossProfit >= 0 ? [27, 110, 50] : [170, 30, 30];
            y = drawPLRow(`= Utilidad Bruta  (${grossMarginPct.toFixed(1)}%)`, fmt(grossProfit), y, { bold: true, color: gcol, bgColor: [236, 252, 243] });
            y = drawPLRow('(-) Costos de Llegadas:', fmt(totalArrival), y, { indent: 8 });
            y = drawPLRow('(-) Costos Operativos:', fmt(totalOps), y, { indent: 8 });
            if (totalBankComm > 0) {
                y = drawPLRow('(-) Comisiones Bancarias (TPV):', fmt(totalBankComm), y, { indent: 8 });
            }
            doc.setFillColor(212, 160, 23); doc.rect(margin, y, pageWidth - margin * 2, 0.8, 'F'); y += 1;
            const ncol = netProfit >= 0 ? [27, 80, 160] : [170, 30, 30];
            const nbg = netProfit >= 0 ? [232, 244, 255] : [255, 235, 235];
            y = drawPLRow(`= Utilidad Neta  (${netMarginPct.toFixed(1)}%)`, fmt(netProfit), y, { bold: true, color: ncol, bgColor: nbg });
            y += 6;

            // ========== TABLA POR AGENCIA ==========
            if (porAgencia.length > 0) {
                checkPage(30);
                y = drawSectionTitle('MÉTRICAS POR AGENCIA', y);
                const aC = [margin + 2, margin + 72, margin + 100, margin + 130, margin + 165, margin + 205, pageWidth - margin - 2];
                const drawAgHeader = (yh) => {
                    doc.setFillColor(44, 62, 80); doc.rect(margin, yh, pageWidth - margin * 2, 8, 'F');
                    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
                    doc.text('Agencia', aC[0], yh + 5.5);
                    doc.text('Ventas', aC[1] + (aC[2] - aC[1]) / 2, yh + 5.5, { align: 'center' });
                    doc.text('Pasajeros', aC[2] + (aC[3] - aC[2]) / 2, yh + 5.5, { align: 'center' });
                    doc.text('% Cierre', aC[3] + (aC[4] - aC[3]) / 2, yh + 5.5, { align: 'center' });
                    doc.text('Ticket Prom.', aC[4] + (aC[5] - aC[4]) / 2, yh + 5.5, { align: 'center' });
                    doc.text('Total Ventas', aC[6], yh + 5.5, { align: 'right' });
                    doc.setTextColor(0, 0, 0);
                    return yh + 8;
                };
                y = drawAgHeader(y);
                porAgencia.forEach((ag, i) => {
                    checkPage(7);
                    if (i % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(margin, y, pageWidth - margin * 2, 7, 'F'); }
                    doc.setDrawColor(220, 225, 230); doc.rect(margin, y, pageWidth - margin * 2, 7);
                    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 70);
                    doc.text(String(ag.agency_name || 'N/A').substring(0, 28), aC[0], y + 5);
                    doc.text(String(ag.ventas || 0), aC[1] + (aC[2] - aC[1]) / 2, y + 5, { align: 'center' });
                    doc.text(String(ag.pasajeros || 0), aC[2] + (aC[3] - aC[2]) / 2, y + 5, { align: 'center' });
                    doc.setFont('helvetica', 'bold'); doc.setTextColor(44, 62, 80);
                    doc.text(`${(parseFloat(ag.cierre_percent) || 0).toFixed(1)}%`, aC[3] + (aC[4] - aC[3]) / 2, y + 5, { align: 'center' });
                    doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 70);
                    doc.text(fmt(ag.ticket_promedio || 0), aC[4] + (aC[5] - aC[4]) / 2, y + 5, { align: 'center' });
                    doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 90, 30);
                    doc.text(fmt(ag.total_ventas_mxn || 0), aC[6], y + 5, { align: 'right' });
                    doc.setTextColor(0, 0, 0);
                    y += 7;
                });
                y += 4;
            }

            // ========== TABLA POR GUÍA ==========
            if (porGuia.length > 0) {
                checkPage(30);
                y = drawSectionTitle('MÉTRICAS POR GUÍA', y);
                const gC = [margin + 2, margin + 60, margin + 112, margin + 140, margin + 165, margin + 200, margin + 235, pageWidth - margin - 2];
                const drawGuHeader = (yh) => {
                    doc.setFillColor(44, 62, 80); doc.rect(margin, yh, pageWidth - margin * 2, 8, 'F');
                    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
                    doc.text('Guía', gC[0], yh + 5.5);
                    doc.text('Agencia', gC[1], yh + 5.5);
                    doc.text('Ventas', gC[2] + (gC[3] - gC[2]) / 2, yh + 5.5, { align: 'center' });
                    doc.text('Pasajeros', gC[3] + (gC[4] - gC[3]) / 2, yh + 5.5, { align: 'center' });
                    doc.text('% Cierre', gC[4] + (gC[5] - gC[4]) / 2, yh + 5.5, { align: 'center' });
                    doc.text('Ticket Prom.', gC[5] + (gC[6] - gC[5]) / 2, yh + 5.5, { align: 'center' });
                    doc.text('Total Ventas', gC[7], yh + 5.5, { align: 'right' });
                    doc.setTextColor(0, 0, 0);
                    return yh + 8;
                };
                y = drawGuHeader(y);
                porGuia.forEach((gu, i) => {
                    checkPage(7);
                    if (i % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(margin, y, pageWidth - margin * 2, 7, 'F'); }
                    doc.setDrawColor(220, 225, 230); doc.rect(margin, y, pageWidth - margin * 2, 7);
                    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 70);
                    doc.text(String(gu.guide_name || 'N/A').substring(0, 24), gC[0], y + 5);
                    doc.text(String(gu.agency_name || 'N/A').substring(0, 22), gC[1], y + 5);
                    doc.text(String(gu.ventas || 0), gC[2] + (gC[3] - gC[2]) / 2, y + 5, { align: 'center' });
                    doc.text(String(gu.pasajeros || 0), gC[3] + (gC[4] - gC[3]) / 2, y + 5, { align: 'center' });
                    doc.setFont('helvetica', 'bold'); doc.setTextColor(44, 62, 80);
                    doc.text(`${(parseFloat(gu.cierre_percent) || 0).toFixed(1)}%`, gC[4] + (gC[5] - gC[4]) / 2, y + 5, { align: 'center' });
                    doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 70);
                    doc.text(fmt(gu.ticket_promedio || 0), gC[5] + (gC[6] - gC[5]) / 2, y + 5, { align: 'center' });
                    doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 90, 30);
                    doc.text(fmt(gu.total_ventas_mxn || 0), gC[7], y + 5, { align: 'right' });
                    doc.setTextColor(0, 0, 0);
                    y += 7;
                });
                y += 4;
            }

            // ========== TABLA POR VENDEDOR ==========
            if (porVendedor.length > 0) {
                checkPage(30);
                y = drawSectionTitle('MÉTRICAS POR VENDEDOR', y);
                const vC = [margin + 2, margin + 100, margin + 160, pageWidth - margin - 2];
                const drawVeHeader = (yh) => {
                    doc.setFillColor(44, 62, 80); doc.rect(margin, yh, pageWidth - margin * 2, 8, 'F');
                    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
                    doc.text('Vendedor', vC[0], yh + 5.5);
                    doc.text('Ventas', vC[1] + (vC[2] - vC[1]) / 2, yh + 5.5, { align: 'center' });
                    doc.text('Ticket Promedio', vC[2] + (vC[3] - vC[2]) / 2, yh + 5.5, { align: 'center' });
                    doc.text('Total Ventas', vC[3], yh + 5.5, { align: 'right' });
                    doc.setTextColor(0, 0, 0);
                    return yh + 8;
                };
                y = drawVeHeader(y);
                porVendedor.forEach((ve, i) => {
                    checkPage(7);
                    if (i % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(margin, y, pageWidth - margin * 2, 7, 'F'); }
                    doc.setDrawColor(220, 225, 230); doc.rect(margin, y, pageWidth - margin * 2, 7);
                    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 70);
                    doc.text(String(ve.seller_name || 'N/A').substring(0, 40), vC[0], y + 5);
                    doc.text(String(ve.ventas || 0), vC[1] + (vC[2] - vC[1]) / 2, y + 5, { align: 'center' });
                    doc.text(fmt(ve.ticket_promedio || 0), vC[2] + (vC[3] - vC[2]) / 2, y + 5, { align: 'center' });
                    doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 90, 30);
                    doc.text(fmt(ve.total_ventas_mxn || 0), vC[3], y + 5, { align: 'right' });
                    doc.setTextColor(0, 0, 0);
                    y += 7;
                });
                y += 4;
            }

            // ========== TABLA DÍA POR DÍA ==========
            if (dailySummary.length > 0) {
                checkPage(30);
                y = drawSectionTitle('RESUMEN DÍA POR DÍA', y);
                const dC = [margin + 2, margin + 60, margin + 110, margin + 175, pageWidth - margin - 2];
                const drawDayHeader = (yh) => {
                    doc.setFillColor(44, 62, 80); doc.rect(margin, yh, pageWidth - margin * 2, 8, 'F');
                    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
                    doc.text('Fecha', dC[0], yh + 5.5);
                    doc.text('Capturas', dC[1] + (dC[2] - dC[1]) / 2, yh + 5.5, { align: 'center' });
                    doc.text('Ventas (MXN)', dC[2] + (dC[3] - dC[2]) / 2, yh + 5.5, { align: 'center' });
                    doc.text('U. Bruta', dC[3] + (dC[4] - dC[3]) / 2, yh + 5.5, { align: 'center' });
                    doc.text('U. Neta', dC[4], yh + 5.5, { align: 'right' });
                    doc.setTextColor(0, 0, 0);
                    return yh + 8;
                };
                y = drawDayHeader(y);
                dailySummary.forEach((day, i) => {
                    checkPage(7);
                    if (i % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(margin, y, pageWidth - margin * 2, 7, 'F'); }
                    doc.setDrawColor(220, 225, 230); doc.rect(margin, y, pageWidth - margin * 2, 7);
                    const dateStr = typeof day.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(day.date)
                        ? day.date.substring(0, 10).split('-').reverse().join('/')
                        : (day.date || '');
                    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 70);
                    doc.text(dateStr, dC[0], y + 5);
                    doc.text(String(day.captures || 0), dC[1] + (dC[2] - dC[1]) / 2, y + 5, { align: 'center' });
                    doc.text(fmt(day.sales_mxn || 0), dC[2] + (dC[3] - dC[2]) / 2, y + 5, { align: 'center' });
                    const gp = parseFloat(day.gross_profit) || 0;
                    const np = parseFloat(day.net_profit) || 0;
                    doc.setTextColor(gp >= 0 ? 39 : 180, gp >= 0 ? 120 : 30, gp >= 0 ? 50 : 30);
                    doc.text(fmt(gp), dC[3] + (dC[4] - dC[3]) / 2, y + 5, { align: 'center' });
                    doc.setTextColor(np >= 0 ? 27 : 180, np >= 0 ? 80 : 30, np >= 0 ? 160 : 30);
                    doc.text(fmt(np), dC[4], y + 5, { align: 'right' });
                    doc.setTextColor(0, 0, 0);
                    y += 7;
                });
                y += 4;
            }

            // ========== FOOTER ==========
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setDrawColor(180, 180, 180);
                doc.setLineWidth(0.3);
                doc.line(margin, pageHeight - 16, pageWidth - margin, pageHeight - 16);
                doc.setLineWidth(0.2);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
                doc.text(`Generado: ${generatedAtStr}`, margin, pageHeight - 10);
                doc.text(`OPAL & CO  |  Reporte Histórico`, pageWidth - margin, pageHeight - 10, { align: 'right' });
                doc.setTextColor(0, 0, 0);
            }

            const periodSlug = (report.period_name || `${report.date_from}_${report.date_to}`)
                .replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/__+/g, '_');
            doc.save(`Historico_${periodSlug}_${Date.now()}.pdf`);
            Utils.showNotification('PDF exportado correctamente', 'success');
        } catch (error) {
            console.error('Error exportando reporte histórico:', error);
            Utils.showNotification('Error al exportar reporte histórico: ' + error.message, 'error');
        }
    },

    /**
     * Eliminar reporte histórico
     * @param {string} reportId - ID del reporte histórico
     */
    async deleteHistoricalReport(reportId) {
        try {
            const confirm = await Utils.confirm(
                '¿Eliminar este reporte histórico? Esta acción no se puede deshacer.',
                'Eliminar Reporte Histórico'
            );
            if (!confirm) return;

            // Eliminar del servidor
            if (typeof API !== 'undefined' && API.deleteHistoricalReport) {
                try {
                    await API.deleteHistoricalReport(reportId);
                    console.log('✅ Reporte histórico eliminado del servidor');
                } catch (error) {
                    console.warn('Error eliminando reporte histórico del servidor:', error);
                }
            }

            // Eliminar localmente
            await DB.delete('historical_reports', reportId);
            console.log('✅ Reporte histórico eliminado localmente');

            Utils.showNotification('Reporte histórico eliminado', 'success');
            
            // Recargar lista
            await this.loadHistoricalReports();
        } catch (error) {
            console.error('Error eliminando reporte histórico:', error);
            Utils.showNotification('Error al eliminar reporte histórico: ' + error.message, 'error');
        }
    }
};

window.Reports = Reports;
