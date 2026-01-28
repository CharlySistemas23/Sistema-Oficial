// Reports Module - Gestión Avanzada de Reportes

const Reports = {
    initialized: false,
    currentTab: 'reports',
    pendingCaptures: [], // Lista de capturas pendientes antes de guardar
    editingPendingCaptureId: null, // ID de la captura pendiente que se está editando
    isExporting: false, // Flag para prevenir múltiples exportaciones simultáneas
    
    /**
     * Calcular comisiones basadas en reglas de agencia, vendedor (Sebastian) o guía (Gloria)
     * @param {number} totalMXN - Total en MXN
     * @param {string} agencyName - Nombre de la agencia (opcional)
     * @param {string} sellerName - Nombre del vendedor (opcional)
     * @param {string} guideName - Nombre del guía (opcional)
     * @returns {Object} Objeto con {sellerCommission, guideCommission}
     */
    calculateCommissionByRules(totalMXN, agencyName = null, sellerName = null, guideName = null) {
        if (!totalMXN || totalMXN <= 0) return { sellerCommission: 0, guideCommission: 0 };
        
        // Normalizar nombres para comparación
        const normalizeName = (name) => name ? name.trim().toUpperCase() : '';
        const agency = normalizeName(agencyName);
        const seller = normalizeName(sellerName);
        const guide = normalizeName(guideName);
        
        let sellerCommission = 0;
        let guideCommission = 0;
        
        // REGLAS PARA GUÍA:
        // PRIORIDAD 1: Reglas por AGENCIA (aplican al guía)
        if (agency) {
            if (agency === 'TROPICAL ADVENTURE') {
                // (total - 18%) * 9% = (total * 0.82) * 0.09
                guideCommission = (totalMXN * 0.82) * 0.09;
            } else if (agency === 'TRAVELEX') {
                // (total - 18%) * 10% = (total * 0.82) * 0.10
                guideCommission = (totalMXN * 0.82) * 0.10;
            } else if (agency === 'TANI TOURS' || agency === 'TANITOURS') {
                // (total - 18%) * 9% = (total * 0.82) * 0.09
                guideCommission = (totalMXN * 0.82) * 0.09;
            } else if (agency === 'VERANOS') {
                // (total - 18%) * 9% = (total * 0.82) * 0.09
                guideCommission = (totalMXN * 0.82) * 0.09;
            } else if (agency === 'DISCOVERY') {
                // (total - 18%) * 10% = (total * 0.82) * 0.10
                guideCommission = (totalMXN * 0.82) * 0.10;
            }
        } else if (guide === 'GLORIA') {
            // PRIORIDAD 2: Regla especial para guía Gloria (solo si NO hay agencia)
            // total * 10% directo
            guideCommission = totalMXN * 0.10;
        }
        // Si no hay regla de agencia ni Gloria, se calculará con reglas normales más abajo
        
        // REGLAS PARA VENDEDOR:
        // PRIORIDAD 1: Regla especial para vendedor Sebastian
        if (seller === 'SEBASTIAN') {
            // total * 10% directo
            sellerCommission = totalMXN * 0.10;
        }
        // Si no es Sebastian, se calculará con reglas normales más abajo
        
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
                        <i class="fas fa-download"></i> Exportar
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
        
        // Si hay branchId específico, obtener todas las ventas y filtrar manualmente
        // Si no hay branchId y es master_admin, obtener todas las ventas sin filtro
        // Si no hay branchId y no es master_admin, usar el filtro automático de BranchManager
        let sales;
        if (branchId || (!branchId && !isMasterAdmin)) {
            // Si hay branchId específico o no es master_admin, obtener todas y filtrar manualmente
            sales = await DB.getAll('sales', null, null, { 
                filterByBranch: false, // Desactivar filtro automático para usar el manual
            branchIdField: 'branch_id' 
        }) || [];

        // Normalizar branch_id para comparación flexible
        const normalizedBranchId = branchId ? String(branchId) : null;

        if (normalizedBranchId) {
                // Filtrar por branch_id específico - ESTRICTO
                const beforeFilter = sales.length;
            sales = sales.filter(s => {
                    // CRÍTICO: Excluir ventas sin branch_id cuando se filtra por sucursal específica
                    if (!s.branch_id) {
                        return false; // NO mostrar ventas sin branch_id
                    }
                    const saleBranchId = String(s.branch_id);
                return saleBranchId === normalizedBranchId;
            });
                console.log(`📍 [Reports] Filtrado de ventas por sucursal: ${beforeFilter} → ${sales.length} (sucursal: ${normalizedBranchId})`);
            } else if (!isMasterAdmin) {
                // Si no es master_admin y no hay branchId específico, usar el actual de BranchManager
                const currentBranchId = typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : null;
                if (currentBranchId) {
                    const normalizedCurrent = String(currentBranchId);
                    const beforeFilter = sales.length;
                    sales = sales.filter(s => {
                        // CRÍTICO: Excluir ventas sin branch_id para usuarios normales
                        if (!s.branch_id) {
                            return false; // NO mostrar ventas sin branch_id
                        }
                        const saleBranchId = String(s.branch_id);
                        return saleBranchId === normalizedCurrent;
                    });
                    console.log(`📍 [Reports] Filtrado de ventas por sucursal (usuario normal): ${beforeFilter} → ${sales.length} (sucursal: ${normalizedCurrent})`);
                } else {
                    // Sin branch_id, no mostrar ventas (aislamiento estricto)
                    sales = [];
                }
            }
        } else {
            // Master_admin sin branchId específico: obtener todas las ventas
            sales = await DB.getAll('sales', null, null, { 
                filterByBranch: false, 
                branchIdField: 'branch_id' 
            }) || [];
        }

        if (dateFrom) {
            sales = sales.filter(s => s.created_at >= dateFrom);
        }
        if (dateTo) {
            sales = sales.filter(s => s.created_at <= dateTo + 'T23:59:59');
        }
        if (status) {
            sales = sales.filter(s => s.status === status);
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
        const completedSales = sales.filter(s => s.status === 'completada');
        
        const totalSales = completedSales.reduce((sum, s) => sum + (s.total || 0), 0);
        const totalPassengers = completedSales.reduce((sum, s) => sum + (s.passengers || 1), 0);
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
            
            totalCosts = monthCosts.reduce((sum, c) => sum + (c.amount || 0), 0);
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
        const completedSales = sales.filter(s => s.status === 'completada');
        
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
        const completedSales = sales.filter(s => s.status === 'completada');
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
        const completedSales = sales.filter(s => s.status === 'completada');
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
        const completedSales = sales.filter(s => s.status === 'completada');
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
                                <td><span class="status-badge status-${sale.status === 'completada' ? 'disponible' : sale.status === 'apartada' ? 'reservado' : 'cancelado'}">${sale.status}</span></td>
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
                case 'week':
                    fromDate = new Date(today);
                    fromDate.setDate(fromDate.getDate() - today.getDay());
                    break;
                case 'lastweek':
                    fromDate = new Date(today);
                    fromDate.setDate(fromDate.getDate() - today.getDay() - 7);
                    toDate = new Date(fromDate);
                    toDate.setDate(toDate.getDate() + 6);
                    break;
                case 'month':
                    fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
                    break;
                case 'lastmonth':
                    fromDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                    toDate = new Date(today.getFullYear(), today.getMonth(), 0);
                    break;
                case 'quarter':
                    const quarter = Math.floor(today.getMonth() / 3);
                    fromDate = new Date(today.getFullYear(), quarter * 3, 1);
                    break;
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

        const totalSales = sales.reduce((sum, s) => sum + (s.total || 0), 0);
        const totalPassengers = sales.reduce((sum, s) => sum + (s.passengers || 1), 0);
        const avgTicket = totalPassengers > 0 ? totalSales / totalPassengers : 0;
        const closeRate = totalPassengers > 0 ? (sales.length / totalPassengers) * 100 : 0;

        // Agrupar por sucursal si es master_admin y hay múltiples sucursales
        const branchesInReport = new Set(sales.map(s => s.branch_id).filter(Boolean));
        const showBranchBreakdown = isMasterAdmin && branchesInReport.size > 1 && (!branchIdForBanner || branchIdForBanner === 'all');
        
        let branchBreakdown = {};
        if (showBranchBreakdown) {
            sales.forEach(sale => {
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
        }

        // Calcular COGS desde los items de venta (más preciso que desde cost_entries)
        let totalCOGS = 0;
        for (const sale of sales) {
            const items = saleItems.filter(si => si.sale_id === sale.id);
            for (const item of items) {
                const invItem = items.find(i => i.id === item.item_id);
                if (invItem && invItem.cost) {
                    totalCOGS += (invItem.cost || 0) * (item.quantity || 1);
                }
            }
        }

        // Calcular comisiones desde sale_items (más preciso)
        const commissionsBreakdown = {
            sellers: 0,
            guides: 0,
            total: 0
        };
        for (const sale of sales) {
            const items = saleItems.filter(si => si.sale_id === sale.id);
            for (const item of items) {
                if (item.commission_amount) {
                    commissionsBreakdown.total += item.commission_amount;
                }
            }
        }
        // Si no hay comisiones en sale_items, usar los valores de las ventas (fallback)
        if (commissionsBreakdown.total === 0) {
        sales.forEach(sale => {
            commissionsBreakdown.sellers += sale.seller_commission || 0;
            commissionsBreakdown.guides += sale.guide_commission || 0;
        });
        commissionsBreakdown.total = commissionsBreakdown.sellers + commissionsBreakdown.guides;
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
        
        if (sales.length > 0) {
            // Obtener fechas del reporte
            const dates = sales.map(s => s.created_at.split('T')[0]).sort();
            const dateFrom = dates[0];
            const dateTo = dates[dates.length - 1];
            
            // Obtener branchId del filtro o de las ventas
            const branchId = branchFilterValue && branchFilterValue !== 'all' ? branchFilterValue : 
                           (branchIdForBanner || (sales.length > 0 ? sales[0].branch_id : null));
            
            // Obtener llegadas del período
            const allArrivals = await DB.getAll('agency_arrivals', null, null, { 
                filterByBranch: false, 
                branchIdField: 'branch_id' 
            }) || [];
            const periodArrivals = allArrivals.filter(a => {
                const arrivalDate = a.date || a.created_at?.split('T')[0];
                return arrivalDate >= dateFrom && arrivalDate <= dateTo &&
                       (branchId === null || !branchId || a.branch_id === branchId || !a.branch_id) &&
                       a.passengers > 0 && a.units > 0;
            });
            costBreakdown.arrivals = periodArrivals.reduce((sum, a) => sum + (a.arrival_fee || a.calculated_fee || 0), 0);
            
            // Obtener costos operativos del período
            if (typeof Costs !== 'undefined') {
            const reportCosts = await Costs.getFilteredCosts({
                branchId: branchId || null,
                dateFrom: dateFrom,
                dateTo: dateTo
            });
            
                // Desglose de costos operativos
            costBreakdown.fixed = reportCosts
                    .filter(c => c.type === 'fijo' && c.category !== 'pago_llegadas' && c.category !== 'comisiones_bancarias')
                .reduce((sum, c) => sum + (c.amount || 0), 0);
            costBreakdown.variable = reportCosts
                .filter(c => c.type === 'variable' && c.category !== 'costo_ventas' && c.category !== 'comisiones' && c.category !== 'comisiones_bancarias' && c.category !== 'pago_llegadas')
                .reduce((sum, c) => sum + (c.amount || 0), 0);
            costBreakdown.bankCommissions = reportCosts
                .filter(c => c.category === 'comisiones_bancarias')
                .reduce((sum, c) => sum + (c.amount || 0), 0);
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
        sales.forEach(sale => {
            const date = sale.created_at.split('T')[0];
            if (!dailyStats[date]) {
                dailyStats[date] = { total: 0, count: 0 };
            }
            dailyStats[date].total += sale.total || 0;
            dailyStats[date].count += 1;
        });
        
        const dailyData = Object.entries(dailyStats)
            .map(([date, stats]) => ({ date, ...stats }))
            .sort((a, b) => a.date.localeCompare(b.date));
        
        const maxDaily = Math.max(...dailyData.map(d => d.total), 1);

        let html = await this.getBranchContextBanner(branchIdForBanner, dateFrom, dateTo);
        
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
                                    <td style="text-align: right;">${sales.length}</td>
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
                        <div class="kpi-value">${sales.length}</div>
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
                    <div class="kpi-value">${sales.length > 0 ? Utils.formatCurrency(totalSales / sales.length) : '$0'}</div>
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
                                        <td>${sale.passengers || 1}</td>
                                        <td style="font-weight: 600;">${Utils.formatCurrency(sale.total)}</td>
                                        <td style="color: var(--color-primary); font-weight: 500;">${Utils.formatCurrency(sale.seller_commission || 0)}</td>
                                        <td style="color: var(--color-success); font-weight: 500;">${Utils.formatCurrency(sale.guide_commission || 0)}</td>
                                        <td><span class="status-badge status-${sale.status === 'completada' ? 'disponible' : sale.status === 'apartada' ? 'reservado' : 'cancelado'}">${sale.status}</span></td>
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
                const costDate = new Date(cost.date || cost.created_at);
                const daysInMonth = new Date(costDate.getFullYear(), costDate.getMonth() + 1, 0).getDate();
                fixedCostsDaily += (cost.amount || 0) / daysInMonth;
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
        
        // Calcular COGS y comisiones por día
        for (const sale of sales) {
            const date = sale.created_at.split('T')[0];
            const items = saleItems.filter(si => si.sale_id === sale.id);
            
            // COGS
            for (const item of items) {
                const invItem = inventoryItems.find(i => i.id === item.item_id);
                if (invItem && invItem.cost) {
                    dailyStats[date].cogs += (invItem.cost || 0) * (item.quantity || 1);
                }
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
     * Calcula los costos de llegadas desde cost_entries (fuente autorizada)
     * Si no hay costos registrados, calcula desde agency_arrivals como fallback
     * @param {string} dateStr - Fecha en formato YYYY-MM-DD
     * @param {string|null} branchId - ID de sucursal (null para todas)
     * @param {Array} branchIds - Array de IDs de sucursales (opcional, si branchId es null)
     * @returns {Promise<number>} Total de costos de llegadas
     */
    async calculateArrivalCosts(dateStr, branchId = null, branchIds = []) {
        try {
            // 1. PRIMERO: Intentar obtener costos desde cost_entries (fuente autorizada)
            const allCosts = await DB.getAll('cost_entries', null, null, { 
                filterByBranch: false, 
                branchIdField: 'branch_id' 
            }) || [];
            
            // Filtrar costos de llegadas del día
            // CRÍTICO: Aplicar filtro estricto por sucursal - NO incluir costos sin branch_id cuando se filtra por sucursal específica
            const arrivalCostEntries = allCosts.filter(c => {
                const costDate = c.date || c.created_at;
                const costDateStr = typeof costDate === 'string' ? costDate.split('T')[0] : new Date(costDate).toISOString().split('T')[0];
                
                // Verificar que sea de la categoría de llegadas
                if (c.category !== 'pago_llegadas') return false;
                
                // Verificar fecha
                if (costDateStr !== dateStr) return false;
                
                // CRÍTICO: Verificar sucursal con filtro estricto
                if (branchId !== null) {
                    // Sucursal específica: SOLO incluir costos de esta sucursal (excluir sin branch_id)
                    if (!c.branch_id) {
                        return false; // EXCLUIR costos sin branch_id cuando se filtra por sucursal específica
                    }
                    return String(c.branch_id) === String(branchId);
                } else if (branchIds.length > 0) {
                    // Múltiples sucursales específicas: SOLO incluir costos de esas sucursales (excluir sin branch_id)
                    if (!c.branch_id) {
                        return false; // EXCLUIR costos sin branch_id
                    }
                    return branchIds.includes(c.branch_id);
                } else {
                    // Todas las sucursales (master_admin): incluir todos los costos
                    return true;
                }
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
            
            // Si hay costos registrados (incluso si el total es 0 pero hay registros), retornar ese valor (fuente autorizada)
            if (uniqueCosts.size > 0) {
                const totalAsNumber = typeof totalFromCosts === 'number' ? totalFromCosts : parseFloat(totalFromCosts) || 0;
                console.log(`✅ Costos de llegadas encontrados en cost_entries: ${arrivalCostEntries.length} registros, ${uniqueCosts.size} únicos, total: $${totalAsNumber.toFixed(2)}`);
                return totalAsNumber;
            }
            
            console.warn(`⚠️ No se encontraron costos de llegadas en cost_entries para ${dateStr}, branchId: ${branchId || 'null'}, branchIds: [${branchIds.join(', ')}]`);
            
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
                if (a.passengers <= 0 && (a.units <= 0 && (a.arrival_fee <= 0 && a.calculated_fee <= 0))) return false;
                
                // Verificar sucursal
                if (branchId !== null) {
                    return a.branch_id === branchId || !a.branch_id;
                } else if (branchIds.length > 0) {
                    return !a.branch_id || branchIds.includes(a.branch_id);
                } else {
                    return true;
                }
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
            
            // Si encontramos llegadas sin costo registrado, registrar automáticamente
            if (totalFromArrivals > 0 && totalFromCosts === 0 && typeof Costs !== 'undefined') {
                console.log(`📝 Registrando automáticamente ${dayArrivals.length} costos de llegadas desde agency_arrivals...`);
                for (const arrival of dayArrivals) {
                    if (arrival.arrival_fee > 0 || arrival.calculated_fee > 0) {
                        const fee = arrival.calculated_fee || arrival.arrival_fee || 0;
                        if (fee > 0) {
                            try {
                                await Costs.registerArrivalPayment(
                                    arrival.id,
                                    fee,
                                    arrival.branch_id,
                                    arrival.agency_id,
                                    arrival.passengers,
                                    arrival.date // Pasar la fecha de la llegada
                                );
                                console.log(`✅ Costo de llegada registrado: $${fee.toFixed(2)} para llegada ${arrival.id}`);
                            } catch (e) {
                                console.warn('Error registrando costo de llegada automáticamente:', e);
                            }
                        }
                    }
                }
                // Después de registrar, recalcular desde cost_entries
                const updatedCosts = await DB.getAll('cost_entries') || [];
                const updatedArrivalCosts = updatedCosts.filter(c => {
                    const costDate = c.date || c.created_at;
                    const costDateStr = typeof costDate === 'string' ? costDate.split('T')[0] : new Date(costDate).toISOString().split('T')[0];
                    if (c.category !== 'pago_llegadas' || costDateStr !== dateStr) return false;
                    if (branchId !== null) {
                        return c.branch_id === branchId || !c.branch_id;
                    } else if (branchIds.length > 0) {
                        return !c.branch_id || branchIds.includes(c.branch_id);
                    } else {
                        return true;
                    }
                });
                // Agrupar por arrival_id para evitar duplicados también en el recálculo
                const updatedUniqueCosts = new Map();
                updatedArrivalCosts.forEach(c => {
                    const amount = typeof c.amount === 'number' ? c.amount : parseFloat(c.amount || 0) || 0;
                    if (c.arrival_id) {
                        const existing = updatedUniqueCosts.get(c.arrival_id) || 0;
                        if (amount > existing) {
                            updatedUniqueCosts.set(c.arrival_id, amount);
                        }
                    } else {
                        const key = `${c.date || ''}_${c.agency_id || ''}_${c.branch_id || ''}_${amount}`;
                        if (!updatedUniqueCosts.has(key)) {
                            updatedUniqueCosts.set(key, amount);
                        }
                    }
                });
                const updatedTotal = Array.from(updatedUniqueCosts.values()).reduce((sum, amount) => sum + amount, 0);
                const updatedTotalAsNumber = typeof updatedTotal === 'number' ? updatedTotal : parseFloat(updatedTotal) || 0;
                console.log(`✅ Total de costos de llegadas después de registro automático: $${updatedTotalAsNumber.toFixed(2)}`);
                return updatedTotalAsNumber;
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
                return saleDate >= dateFrom && saleDate <= dateTo && sale.status === 'completada';
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
        const completedSales = sales.filter(s => s.status === 'completada');
        
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
        sales.filter(s => s.status === 'completada').forEach(sale => {
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
            const customerSales = sales.filter(s => s.customer_id === customer.id && s.status === 'completada');
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
        const completedSales = sales.filter(s => s.status === 'completada');
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
        const completedSales = sales.filter(s => s.status === 'completada');
        
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
                        <i class="fas fa-download"></i> Exportar
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
                case 'week':
                    fromDate = new Date(today);
                    fromDate.setDate(fromDate.getDate() - today.getDay());
                    toDate = new Date(today);
                    break;
                case 'lastweek':
                    fromDate = new Date(today);
                    fromDate.setDate(fromDate.getDate() - today.getDay() - 7);
                    toDate = new Date(fromDate);
                    toDate.setDate(toDate.getDate() + 6);
                    break;
                case 'month':
                    fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
                    toDate = new Date(today);
                    break;
                case 'lastmonth':
                    fromDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                    toDate = new Date(today.getFullYear(), today.getMonth(), 0);
                    break;
                case 'quarter':
                    const quarter = Math.floor(today.getMonth() / 3);
                    fromDate = new Date(today.getFullYear(), quarter * 3, 1);
                    toDate = new Date(today);
                    break;
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

            // Obtener todos los sale_items para calcular comisiones si no están en la venta
            const allSaleItems = await DB.getAll('sale_items') || [];

            for (const sale of sales) {
                let sellerComm = sale.seller_commission || 0;
                let guideComm = sale.guide_commission || 0;

                // Si las comisiones no están en la venta o son 0, calcularlas desde los items
                const needsCalculation = (!sale.seller_commission && sale.seller_id) || (!sale.guide_commission && sale.guide_id);
                
                if (needsCalculation) {
                    const saleItems = allSaleItems.filter(si => si.sale_id === sale.id);
                    
                    // Calcular comisiones desde los items si no están guardadas
                    if (!sale.seller_commission && sale.seller_id) {
                        sellerComm = 0;
                        for (const item of saleItems) {
                            if (item.subtotal > 0) {
                                const itemSellerComm = await Utils.calculateCommission(item.subtotal, sale.seller_id, null);
                                sellerComm += itemSellerComm;
                            }
                        }
                    }
                    
                    if (!sale.guide_commission && sale.guide_id) {
                        guideComm = 0;
                        for (const item of saleItems) {
                            if (item.subtotal > 0) {
                                const itemGuideComm = await Utils.calculateCommission(item.subtotal, null, sale.guide_id);
                                guideComm += itemGuideComm;
                            }
                        }
                    }

                    // Actualizar la venta con las comisiones calculadas si no las tenía
                    if ((sellerComm > 0 || guideComm > 0) && (!sale.seller_commission && !sale.guide_commission)) {
                        sale.seller_commission = sellerComm;
                        sale.guide_commission = guideComm;
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

            // Obtener nombres
            const sellers = await DB.getAll('catalog_sellers');
            const guides = await DB.getAll('catalog_guides');
            const branches = await DB.getAll('catalog_branches');

            Object.values(sellerCommissions).forEach(comm => {
                const seller = sellers.find(s => s.id === comm.id);
                comm.name = seller?.name || 'N/A';
            });

            Object.values(guideCommissions).forEach(comm => {
                const guide = guides.find(g => g.id === comm.id);
                comm.name = guide?.name || 'N/A';
            });

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
                                        <th>Total Comisiones</th>
                                        <th>Promedio por Venta</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${guideCommissionsList.map(comm => `
                                        <tr>
                                            <td><strong>${comm.name}</strong></td>
                                            <td>${comm.count}</td>
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
            if (sale.status !== 'completada') return false;
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

    // ==================== CAPTURA RÁPIDA TEMPORAL ====================
    
    async getQuickCaptureTab() {
        const today = new Date().toISOString().split('T')[0];
        const isMasterAdmin = typeof UserManager !== 'undefined' && (
            UserManager.currentUser?.role === 'master_admin' ||
            UserManager.currentUser?.is_master_admin ||
            UserManager.currentUser?.isMasterAdmin
        );
        const currentBranchId = typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : null;
        
        return `
            <div style="padding: 8px 12px; background: linear-gradient(135deg, #fff3cd 0%, #ffe69c 100%); border-radius: 6px; border-left: 3px solid #ffc107; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-exclamation-triangle" style="color: #856404; font-size: 14px;"></i>
                    <div style="flex: 1;">
                        <h3 style="margin: 0 0 2px 0; color: #856404; font-size: 11px; font-weight: 600;">MÓDULO TEMPORAL - Captura Rápida</h3>
                        <p style="margin: 0; color: #856404; font-size: 10px; line-height: 1.3;">
                            Los datos se guardan localmente y NO afectan el sistema principal. Exporta y elimina cuando termines.
                        </p>
                    </div>
                </div>
            </div>

            <!-- Formulario de Captura -->
            <div class="module" style="padding: 12px; background: white; border-radius: 6px; border: 1px solid #e0e0e0; margin-bottom: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06);">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0;">
                    <div style="width: 3px; height: 18px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 2px;"></div>
                    <h3 style="margin: 0; font-size: 12px; font-weight: 600; color: #333; text-transform: uppercase; letter-spacing: 0.3px;">
                        <i class="fas fa-plus-circle" style="color: #667eea; margin-right: 4px; font-size: 11px;"></i> Nueva Captura
                    </h3>
                </div>
                <form id="quick-capture-form" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                    ${isMasterAdmin ? `
                    <div class="form-group">
                        <label>Sucursal <span style="color: var(--color-danger);">*</span></label>
                        <select id="qc-branch" class="form-select" required>
                            <option value="">Seleccionar...</option>
                        </select>
                    </div>
                    ` : ''}
                    <div class="form-group">
                        <label>Vendedor <span style="color: var(--color-danger);">*</span></label>
                        <select id="qc-seller" class="form-select" required>
                            <option value="">Seleccionar...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Guía</label>
                        <select id="qc-guide" class="form-select">
                            <option value="">Ninguno</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Agencia</label>
                        <select id="qc-agency" class="form-select">
                            <option value="">Ninguna</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Producto <span style="color: var(--color-danger);">*</span></label>
                        <input type="text" id="qc-product" class="form-input" placeholder="Nombre del producto" required>
                    </div>
                    <div class="form-group">
                        <label>Cantidad <span style="color: var(--color-danger);">*</span></label>
                        <input type="number" id="qc-quantity" class="form-input" min="1" step="1" value="1" required>
                    </div>
                    <div class="form-group">
                        <label>Fecha <span style="color: var(--color-danger);">*</span></label>
                        <input type="date" id="qc-date" class="form-input" value="${today}" required>
                        <small style="color: var(--color-text-secondary); font-size: 9px;">Fecha de la captura (por defecto: hoy)</small>
                    </div>
                    <div class="form-group">
                        <label>Tipo de Moneda <span style="color: var(--color-danger);">*</span></label>
                        <select id="qc-currency" class="form-select" required>
                            <option value="USD">USD</option>
                            <option value="MXN">MXN</option>
                            <option value="CAD">CAD</option>
                        </select>
                    </div>
                    <div class="form-group" style="grid-column: 1 / -1; padding: 8px; background: #f8f9fa; border-radius: 4px; border: 1px solid #dee2e6;">
                        <label style="font-weight: 600; margin-bottom: 6px; display: block; font-size: 11px;">Pagos <span style="color: var(--color-danger);">*</span></label>
                        <div id="qc-payments-container" style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 6px;">
                            <div class="payment-row" style="display: grid; grid-template-columns: 1fr 140px 70px; gap: 6px; align-items: center; padding: 4px; background: white; border-radius: 4px; border: 1px solid #dee2e6;">
                                <select class="form-select payment-method" required style="border: 1px solid #ced4da; font-size: 11px; padding: 6px;">
                                    <option value="">Método...</option>
                                    <option value="cash">Efectivo</option>
                                    <option value="card">Tarjeta</option>
                                    <option value="transfer">Transferencia</option>
                                    <option value="other">Otro</option>
                                </select>
                                <input type="number" class="form-input payment-amount" min="0" step="0.01" placeholder="0.00" required style="border: 1px solid #ced4da; font-size: 11px; padding: 6px;">
                                <button type="button" class="btn-danger btn-xs remove-payment" style="display: none; padding: 4px 6px; font-size: 10px;" onclick="this.closest('.payment-row').remove(); window.Reports.updatePaymentsTotal();">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 6px; border-top: 1px solid #dee2e6;">
                            <button type="button" class="btn-secondary btn-xs" onclick="window.Reports.addPaymentRow()" style="font-weight: 600; padding: 6px 10px; font-size: 11px;">
                                <i class="fas fa-plus"></i> Agregar Pago
                            </button>
                            <div style="font-weight: 700; font-size: 12px; color: #495057; padding: 4px 8px; background: white; border-radius: 4px; border: 2px solid #28a745;">
                                Total: <span id="qc-payments-total" style="color: #28a745;">$0.00</span>
                            </div>
                        </div>
                        <input type="hidden" id="qc-total" value="0">
                        <small style="color: #6c757d; font-size: 9px; margin-top: 4px; display: block;">💡 Puedes agregar múltiples pagos (ej: $1000 efectivo + $500 tarjeta)</small>
                    </div>
                    <div class="form-group">
                        <label>Costo de Mercancía (MXN)</label>
                        <input type="number" id="qc-cost" class="form-input" min="0" step="0.01" placeholder="0.00">
                        <small style="color: var(--color-text-secondary); font-size: 9px;">Opcional: Si no se ingresa, se buscará en inventario</small>
                    </div>
                    <div class="form-group">
                        <label>Notas</label>
                        <input type="text" id="qc-notes" class="form-input" placeholder="Notas adicionales (opcional)">
                        <small style="color: var(--color-text-secondary); font-size: 9px;">Información adicional sobre la captura</small>
                    </div>
                    <div class="form-group">
                        <label style="display: flex; align-items: center; gap: var(--spacing-xs);">
                            <input type="checkbox" id="qc-is-street" style="width: auto; margin: 0;">
                            <span>Es venta de calle</span>
                        </label>
                        <small style="color: var(--color-text-secondary); font-size: 9px;">Marcar si es venta directa en calle (sin guía ni agencia)</small>
                    </div>
                    <div class="form-group" id="qc-payment-method-group" style="display: none;">
                        <label>Método de Pago (Calle) <span style="color: var(--color-danger);">*</span></label>
                        <select id="qc-payment-method" class="form-select">
                            <option value="">Seleccionar...</option>
                            <option value="card">Tarjeta</option>
                            <option value="cash">Efectivo</option>
                        </select>
                        <small style="color: var(--color-text-secondary); font-size: 9px;">Tarjeta: (monto - 4.5%) * 12% | Efectivo: monto * 14%</small>
                    </div>
                    <div class="form-group" style="grid-column: 1 / -1;">
                        <div style="display: flex; gap: 8px; align-items: stretch; margin-bottom: 10px;">
                            <div style="flex: 1; padding: 8px 10px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 4px; border: 1px solid #dee2e6;">
                                <div style="font-size: 9px; color: #6c757d; margin-bottom: 4px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px;">Tipo de Cambio Actual</div>
                                <div id="qc-exchange-rates-display" style="font-size: 11px; font-weight: 500; color: #495057;">
                                    <i class="fas fa-spinner fa-spin"></i> Obteniendo...
                                </div>
                            </div>
                            <button type="button" class="btn-secondary" onclick="window.Reports.refreshExchangeRates()" title="Actualizar Tipo de Cambio" style="padding: 8px 12px; align-self: center; font-size: 11px;">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding-top: 10px; border-top: 1px solid #f0f0f0;">
                            <button type="submit" class="btn-primary" style="padding: 10px; font-weight: 600; font-size: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                                <i class="fas fa-plus-circle"></i> Agregar a Lista
                            </button>
                            <button type="button" class="btn-success" onclick="window.Reports.saveAllPendingCaptures()" style="padding: 10px; font-weight: 600; font-size: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" id="save-all-pending-btn" disabled>
                                <i class="fas fa-save"></i> Guardar Todo (<span id="pending-count-header">0</span>)
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            <!-- Lista de Capturas Pendientes (Antes de Guardar) -->
            <div class="module" id="pending-captures-container" style="padding: 10px; background: linear-gradient(135deg, #fff9e6 0%, #fff3cd 100%); border-radius: 6px; border: 1px solid #ffc107; margin-bottom: 12px; display: none; box-shadow: 0 1px 4px rgba(255,193,7,0.15);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,193,7,0.3);">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <div style="width: 3px; height: 18px; background: #ffc107; border-radius: 2px;"></div>
                        <h3 style="margin: 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; color: #856404;">
                            <i class="fas fa-clock" style="color: #ffc107; font-size: 11px; margin-right: 4px;"></i> Capturas Pendientes (<span id="pending-count">0</span>)
                        </h3>
                    </div>
                    <div style="display: flex; gap: 6px;">
                        <button class="btn-success btn-sm" onclick="window.Reports.saveAllPendingCaptures()" id="save-all-pending-btn-header" style="font-weight: 600; padding: 6px 10px; font-size: 11px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                            <i class="fas fa-save"></i> Guardar Todo
                        </button>
                        <button class="btn-danger btn-sm" onclick="window.Reports.clearPendingCaptures()" style="font-weight: 600; padding: 6px 10px; font-size: 11px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                            <i class="fas fa-times"></i> Limpiar
                        </button>
                    </div>
                </div>
                <div id="pending-captures-list">
                    <div style="text-align: center; padding: var(--spacing-lg); color: var(--color-text-secondary);">
                        <i class="fas fa-inbox" style="font-size: 32px; opacity: 0.3; margin-bottom: var(--spacing-sm);"></i>
                        <p>No hay capturas pendientes</p>
                    </div>
                </div>
            </div>

            <!-- Lista de Capturas del Día -->
            <div class="module" style="padding: 10px; background: white; border-radius: 6px; border: 1px solid #e0e0e0; margin-bottom: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <div style="width: 3px; height: 18px; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); border-radius: 2px;"></div>
                        <h3 style="margin: 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; color: #333;">
                            <i class="fas fa-list" style="color: #11998e; margin-right: 4px; font-size: 11px;"></i> Capturas del Día
                            <span style="color: #6c757d; font-size: 10px; font-weight: 400; margin-left: 4px;">(${today})</span>
                        </h3>
                    </div>
                    <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                        <button class="btn-success btn-sm" onclick="window.Reports.archiveQuickCaptureReport()" title="Guardar reporte permanentemente en historial" style="font-weight: 600; padding: 6px 10px; font-size: 11px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                            <i class="fas fa-archive"></i> Archivar
                        </button>
                        <button class="btn-primary btn-sm" onclick="window.Reports.exportQuickCapturePDF()" style="font-weight: 600; padding: 6px 10px; font-size: 11px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                            <i class="fas fa-file-pdf"></i> PDF
                        </button>
                        <button class="btn-secondary btn-sm" onclick="window.Reports.exportQuickCapture()" style="font-weight: 600; padding: 6px 10px; font-size: 11px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                            <i class="fas fa-download"></i> CSV
                        </button>
                        <button class="btn-danger btn-sm" onclick="window.Reports.clearQuickCapture()" style="font-weight: 600; padding: 6px 10px; font-size: 11px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                            <i class="fas fa-trash"></i> Limpiar
                        </button>
                    </div>
                </div>
                <div id="quick-capture-list">
                    <div style="text-align: center; padding: var(--spacing-lg); color: var(--color-text-secondary);">
                        <i class="fas fa-spinner fa-spin"></i> Cargando...
                    </div>
                </div>
            </div>

            <!-- Sección de Llegadas del Día (Desplegable) -->
            <div class="module" style="padding: 10px; background: white; border-radius: 6px; border: 1px solid #e0e0e0; margin-bottom: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0; cursor: pointer;" onclick="window.Reports.toggleArrivalsForm()">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <div style="width: 3px; height: 18px; background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); border-radius: 2px;"></div>
                        <h3 style="margin: 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; color: #333;">
                            <i class="fas fa-plane-arrival" style="color: #fa709a; margin-right: 4px; font-size: 11px;"></i> Llegadas del Día
                        </h3>
                    </div>
                    <i id="arrivals-form-toggle-icon" class="fas fa-chevron-down" style="transition: transform 0.3s; color: #6c757d; font-size: 11px;"></i>
                </div>
                <div id="quick-capture-arrivals-form-container" style="display: none; margin-bottom: 10px; padding: 10px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 4px; border: 1px solid #dee2e6; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <form id="quick-arrivals-form" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--spacing-md);">
                        ${isMasterAdmin ? `
                        <div class="form-group">
                            <label>Sucursal <span style="color: var(--color-danger);">*</span></label>
                            <select id="qc-arrival-branch" class="form-select" required>
                                <option value="">Seleccionar...</option>
                            </select>
                        </div>
                        ` : ''}
                        <div class="form-group">
                            <label>Agencia <span style="color: var(--color-danger);">*</span></label>
                            <select id="qc-arrival-agency" class="form-select" required>
                                <option value="">Seleccionar...</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Pasajeros (PAX) <span style="color: var(--color-danger);">*</span></label>
                            <input type="number" id="qc-arrival-pax" class="form-input" min="1" step="1" placeholder="0" required>
                        </div>
                        <div class="form-group">
                            <label>Unidades <span style="color: var(--color-danger);">*</span></label>
                            <input type="number" id="qc-arrival-units" class="form-input" min="1" step="1" placeholder="0" required>
                        </div>
                        <div class="form-group">
                            <label>Tipo Unidad</label>
                            <select id="qc-arrival-unit-type" class="form-select">
                                <option value="">Cualquiera</option>
                                <option value="city_tour">City Tour</option>
                                <option value="sprinter">Sprinter</option>
                                <option value="van">Van</option>
                                <option value="truck">Camiones</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Costo de Llegada (MXN)</label>
                            <input type="number" id="qc-arrival-cost" class="form-input" min="0" step="0.01" placeholder="0.00" readonly style="background: var(--color-bg-secondary);">
                            <small id="qc-arrival-cost-help" style="color: var(--color-text-secondary); font-size: 9px;">Se calcula automáticamente</small>
                        </div>
                        <div id="qc-arrival-override-container" style="display: none; grid-column: 1 / -1; padding: var(--spacing-md); background: var(--color-warning-bg, #fff3cd); border: 1px solid var(--color-warning, #ffc107); border-radius: var(--radius-sm);">
                            <div style="margin-bottom: var(--spacing-sm); color: var(--color-warning-text, #856404); font-weight: 600; font-size: 11px;">
                                <i class="fas fa-exclamation-triangle"></i> Se requiere override manual
                            </div>
                            <div class="form-group">
                                <label>Monto Manual (MXN) <span style="color: var(--color-danger);">*</span></label>
                                <input type="number" id="qc-arrival-override-amount" class="form-input" min="0" step="0.01" placeholder="0.00">
                            </div>
                            <div class="form-group">
                                <label>Motivo del Override <span style="color: var(--color-danger);">*</span></label>
                                <textarea id="qc-arrival-override-reason" class="form-textarea" rows="2" placeholder="Explica por qué se requiere override manual..."></textarea>
                            </div>
                        </div>
                        <div class="form-group" style="grid-column: 1 / -1;">
                            <label>Notas</label>
                            <input type="text" id="qc-arrival-notes" class="form-input" placeholder="Notas opcionales...">
                        </div>
                        <div class="form-group" style="grid-column: 1 / -1;">
                            <button type="submit" class="btn-primary" style="width: 100%;">
                                <i class="fas fa-save"></i> Guardar Llegada
                            </button>
                        </div>
                    </form>
                </div>
                <div id="quick-capture-arrivals">
                    <div style="text-align: center; padding: var(--spacing-lg); color: var(--color-text-secondary);">
                        <i class="fas fa-spinner fa-spin"></i> Cargando llegadas...
                    </div>
                </div>
            </div>

            <!-- Sección de Comisiones -->
            <div class="module" style="padding: 10px; background: white; border-radius: 6px; border: 1px solid #e0e0e0; margin-bottom: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06);">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0;">
                    <div style="width: 3px; height: 18px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 2px;"></div>
                    <h3 style="margin: 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; color: #333;">
                        <i class="fas fa-percent" style="color: #667eea; margin-right: 4px; font-size: 11px;"></i> Comisiones Calculadas
                    </h3>
                </div>
                <div id="quick-capture-commissions">
                    <div style="text-align: center; padding: var(--spacing-lg); color: var(--color-text-secondary);">
                        <i class="fas fa-spinner fa-spin"></i> Calculando comisiones...
                    </div>
                </div>
            </div>

            <!-- Sección de Utilidades del Día -->
            <div class="module" style="padding: 10px; background: white; border-radius: 6px; border: 1px solid #e0e0e0; margin-bottom: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06);">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0;">
                    <div style="width: 3px; height: 18px; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); border-radius: 2px;"></div>
                    <h3 style="margin: 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; color: #333;">
                        <i class="fas fa-chart-line" style="color: #11998e; margin-right: 4px; font-size: 11px;"></i> Utilidades del Día
                    </h3>
                </div>
                <div id="quick-capture-profits">
                    <div style="text-align: center; padding: var(--spacing-lg); color: var(--color-text-secondary);">
                        <i class="fas fa-spinner fa-spin"></i> Calculando utilidades...
                    </div>
                </div>
            </div>

            <!-- Sección de Historial de Reportes Archivados -->
            <div class="module" style="padding: 10px; background: white; border-radius: 6px; border: 1px solid #e0e0e0; margin-bottom: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <div style="width: 3px; height: 18px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 2px;"></div>
                        <h3 style="margin: 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; color: #333;">
                            <i class="fas fa-history" style="color: #f093fb; margin-right: 4px; font-size: 11px;"></i> Historial de Reportes Archivados
                        </h3>
                    </div>
                    <button class="btn-secondary btn-sm" onclick="window.Reports.loadArchivedReports()" title="Actualizar historial" style="font-weight: 600; padding: 6px 10px; font-size: 11px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <i class="fas fa-sync-alt"></i> Actualizar
                    </button>
                </div>
                <div id="archived-reports-list">
                    <div style="text-align: center; padding: var(--spacing-lg); color: var(--color-text-secondary);">
                        <i class="fas fa-spinner fa-spin"></i> Cargando historial...
                    </div>
                </div>
            </div>
        `;
    },

    async setupQuickCaptureListeners() {
        try {
            // Cargar catálogos
            await this.loadQuickCaptureCatalogs();
            
            // Cargar catálogos para formulario de llegadas
            await this.loadQuickArrivalsCatalogs();
            
            // Cargar tipo de cambio en tiempo real
            await this.loadExchangeRates();
            
            // Cargar historial de reportes archivados
            await this.loadArchivedReports();
            
            // Event listener del formulario de capturas
            const form = document.getElementById('quick-capture-form');
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await this.addToPendingList();
                });
            }

            // Event listener del formulario de llegadas
            const arrivalsForm = document.getElementById('quick-arrivals-form');
            if (arrivalsForm) {
                arrivalsForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await this.saveQuickArrival();
                });
                
                // Calcular costo cuando cambian los campos
                const paxInput = document.getElementById('qc-arrival-pax');
                const unitsInput = document.getElementById('qc-arrival-units');
                const agencySelect = document.getElementById('qc-arrival-agency');
                const unitTypeSelect = document.getElementById('qc-arrival-unit-type');
                const branchSelect = document.getElementById('qc-arrival-branch');
                
                const calculateArrivalCost = async () => {
                    try {
                        const pax = parseInt(paxInput?.value || 0);
                        const units = parseInt(unitsInput?.value || 0);
                        const agencyId = agencySelect?.value;
                        const unitType = unitTypeSelect?.value || null;
                        
                        if (pax > 0 && units > 0 && agencyId) {
                            const isMasterAdmin = typeof UserManager !== 'undefined' && (
                                UserManager.currentUser?.role === 'master_admin' ||
                                UserManager.currentUser?.is_master_admin ||
                                UserManager.currentUser?.isMasterAdmin
                            );
                            const currentBranchId = typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : null;
                            const branchId = isMasterAdmin && branchSelect?.value 
                                ? branchSelect.value 
                                : currentBranchId;
                            
                            if (branchId) {
                                const today = new Date().toISOString().split('T')[0];
                                if (typeof ArrivalRules !== 'undefined' && ArrivalRules.calculateArrivalFee) {
                                    const calculation = await ArrivalRules.calculateArrivalFee(agencyId, branchId, pax, unitType, today);
                                    const costInput = document.getElementById('qc-arrival-cost');
                                    const costHelp = document.getElementById('qc-arrival-cost-help');
                                    const overrideContainer = document.getElementById('qc-arrival-override-container');
                                    const overrideAmountInput = document.getElementById('qc-arrival-override-amount');
                                    const overrideReasonInput = document.getElementById('qc-arrival-override-reason');
                                    
                                    if (costInput) {
                                        if (calculation.overrideRequired && !calculation.calculatedFee) {
                                            costInput.value = 'Requiere Override';
                                            costInput.style.color = 'var(--color-warning, #ffc107)';
                                            if (costHelp) {
                                                costHelp.textContent = 'No hay regla configurada, ingresa el monto manualmente';
                                                costHelp.style.color = 'var(--color-warning, #ffc107)';
                                            }
                                            // Mostrar campos de override
                                            if (overrideContainer) {
                                                overrideContainer.style.display = 'block';
                                            }
                                            // Hacer los campos requeridos
                                            if (overrideAmountInput) {
                                                overrideAmountInput.required = true;
                                                overrideAmountInput.value = '';
                                            }
                                            if (overrideReasonInput) {
                                                overrideReasonInput.required = true;
                                                overrideReasonInput.value = '';
                                            }
                                        } else {
                                            costInput.value = (calculation.calculatedFee || 0).toFixed(2);
                                            costInput.style.color = '';
                                            if (costHelp) {
                                                costHelp.textContent = 'Se calcula automáticamente según las reglas configuradas';
                                                costHelp.style.color = 'var(--color-text-secondary)';
                                            }
                                            // Ocultar campos de override
                                            if (overrideContainer) {
                                                overrideContainer.style.display = 'none';
                                            }
                                            // Hacer los campos opcionales
                                            if (overrideAmountInput) {
                                                overrideAmountInput.required = false;
                                                overrideAmountInput.value = '';
                                            }
                                            if (overrideReasonInput) {
                                                overrideReasonInput.required = false;
                                                overrideReasonInput.value = '';
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } catch (error) {
                        console.error('Error calculando costo de llegada:', error);
                    }
                };
                
                if (paxInput) paxInput.addEventListener('input', calculateArrivalCost);
                if (unitsInput) unitsInput.addEventListener('input', calculateArrivalCost);
                if (agencySelect) agencySelect.addEventListener('change', calculateArrivalCost);
                if (unitTypeSelect) unitTypeSelect.addEventListener('change', calculateArrivalCost);
                if (branchSelect) branchSelect.addEventListener('change', calculateArrivalCost);
            }

            // Cuando cambia la agencia, actualizar guías
            const agencySelect = document.getElementById('qc-agency');
            if (agencySelect) {
                agencySelect.addEventListener('change', async () => {
                    try {
                        await this.loadGuidesForAgency(agencySelect.value);
                    } catch (error) {
                        console.error('Error cargando guías:', error);
                    }
                });
            }

            // Inicializar sistema de pagos múltiples (solo si el contenedor existe)
            const container = document.getElementById('qc-payments-container');
            if (container) {
                // Esperar un momento para asegurar que el DOM esté completamente renderizado
                setTimeout(() => {
                    try {
                        if (this.initializePaymentsSystem) {
                            this.initializePaymentsSystem();
                        }
                    } catch (error) {
                        console.error('Error inicializando sistema de pagos:', error);
                    }
                }, 100);
            }

            // Inicializar lista de capturas pendientes
            await this.loadPendingCaptures();
            
            // Cargar datos guardados del día
            await this.loadQuickCaptureData();
        } catch (error) {
            console.error('Error en setupQuickCaptureListeners:', error);
            // No lanzar el error para evitar que rompa otros módulos
        }
    },

    async loadExchangeRates() {
        try {
            // Obtener tipo de cambio en tiempo real
            if (typeof ExchangeRates !== 'undefined') {
                const rates = await ExchangeRates.updateTodayExchangeRate(true); // Forzar actualización
                const display = document.getElementById('qc-exchange-rates-display');
                if (display) {
                    display.innerHTML = `
                        <div><strong>USD:</strong> $${rates.usd.toFixed(2)} MXN</div>
                        <div><strong>CAD:</strong> $${rates.cad.toFixed(2)} MXN</div>
                    `;
                }
            } else {
                // Fallback: obtener desde configuración
                const today = new Date().toISOString().split('T')[0];
                const exchangeRates = await DB.query('exchange_rates_daily', 'date', today) || [];
                const todayRate = exchangeRates[0] || { usd_to_mxn: 20.0, cad_to_mxn: 15.0 };
                const display = document.getElementById('qc-exchange-rates-display');
                if (display) {
                    display.innerHTML = `
                        <div><strong>USD:</strong> $${(todayRate.usd_to_mxn || 20.0).toFixed(2)} MXN</div>
                        <div><strong>CAD:</strong> $${(todayRate.cad_to_mxn || 15.0).toFixed(2)} MXN</div>
                    `;
                }
            }
        } catch (error) {
            console.error('Error cargando tipo de cambio:', error);
            const display = document.getElementById('qc-exchange-rates-display');
            if (display) {
                display.innerHTML = '<span style="color: var(--color-danger);">Error al cargar</span>';
            }
        }
    },

    async refreshExchangeRates() {
        Utils.showNotification('Actualizando tipo de cambio...', 'info');
        await this.loadExchangeRates();
        Utils.showNotification('Tipo de cambio actualizado', 'success');
    },

    async loadQuickCaptureCatalogs() {
        try {
            // Cargar sucursales (si es master admin)
            const isMasterAdmin = typeof UserManager !== 'undefined' && (
                UserManager.currentUser?.role === 'master_admin' ||
                UserManager.currentUser?.is_master_admin
            );
            if (isMasterAdmin) {
                const branches = await DB.getAll('catalog_branches') || [];
                const branchSelect = document.getElementById('qc-branch');
                if (branchSelect) {
                    branchSelect.innerHTML = '<option value="">Seleccionar...</option>' +
                        branches.filter(b => b.active).map(b => 
                            `<option value="${b.id}">${b.name}</option>`
                        ).join('');
                }
            }

            // Cargar vendedores
            const sellers = await DB.getAll('catalog_sellers') || [];
            const sellerSelect = document.getElementById('qc-seller');
            if (sellerSelect) {
                sellerSelect.innerHTML = '<option value="">Seleccionar...</option>' +
                    sellers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
            }

            // Cargar agencias (solo las 7 agencias permitidas, eliminar duplicados)
            const allAgencies = await DB.getAll('catalog_agencies') || [];
            const agencies = this.filterAllowedAgencies(allAgencies);
            
            // Log de agencias filtradas
            const filteredOut = allAgencies.length - agencies.length;
            if (filteredOut > 0) {
                console.log(`⚠️ ${filteredOut} agencias filtradas (no permitidas o duplicadas)`);
            }
            
            const agencySelect = document.getElementById('qc-agency');
            if (agencySelect) {
                agencySelect.innerHTML = '<option value="">Ninguna</option>' +
                    agencies.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
                console.log(`✅ ${agencies.length} agencias permitidas cargadas: ${agencies.map(a => a.name).join(', ')}`);
            }

            // Cargar TODAS las guías inicialmente (no solo cuando hay agencia seleccionada)
            const guides = await DB.getAll('catalog_guides') || [];
            const guideSelect = document.getElementById('qc-guide');
            if (guideSelect) {
                if (guides.length > 0) {
                    guideSelect.innerHTML = '<option value="">Ninguno</option>' +
                        guides.map(g => {
                            const agencyName = g.agency_id ? (agencies.find(a => this.compareIds(a.id, g.agency_id))?.name || '') : '';
                            return `<option value="${g.id}">${g.name}${agencyName ? ' (' + agencyName + ')' : ''}</option>`;
                        }).join('');
                } else {
                    guideSelect.innerHTML = '<option value="">Ninguno (no hay guías disponibles)</option>';
                }
            }
        } catch (error) {
            console.error('Error cargando catálogos de captura rápida:', error);
        }
    },

    async loadQuickArrivalsCatalogs() {
        try {
            // Cargar sucursales (si es master admin)
            const isMasterAdmin = typeof UserManager !== 'undefined' && (
                UserManager.currentUser?.role === 'master_admin' ||
                UserManager.currentUser?.is_master_admin
            );
            if (isMasterAdmin) {
                const branches = await DB.getAll('catalog_branches') || [];
                const branchSelect = document.getElementById('qc-arrival-branch');
                if (branchSelect) {
                    branchSelect.innerHTML = '<option value="">Seleccionar...</option>' +
                        branches.filter(b => b.active).map(b => 
                            `<option value="${b.id}">${b.name}</option>`
                        ).join('');
                }
            }

            // Cargar agencias (solo las 7 agencias permitidas, eliminar duplicados)
            const allAgencies = await DB.getAll('catalog_agencies') || [];
            const agencies = this.filterAllowedAgencies(allAgencies);
            
            const agencySelect = document.getElementById('qc-arrival-agency');
            if (agencySelect) {
                agencySelect.innerHTML = '<option value="">Seleccionar...</option>' +
                    agencies.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
                console.log(`✅ [Llegadas] ${agencies.length} agencias permitidas cargadas: ${agencies.map(a => a.name).join(', ')}`);
            }
        } catch (error) {
            console.error('Error cargando catálogos de llegadas:', error);
        }
    },

    async loadGuidesForAgency(agencyId) {
        try {
            const guides = await DB.getAll('catalog_guides') || [];
            const agencies = await DB.getAll('catalog_agencies') || [];
            const guideSelect = document.getElementById('qc-guide');
            
            if (!guideSelect) return;

            console.log(`🔍 Cargando guías para agencia: ${agencyId}`);
            console.log(`   Total guías en DB: ${guides.length}`);
            console.log(`   Total agencias en DB: ${agencies.length}`);

            if (!agencyId || agencyId === '') {
                // Si no hay agencia seleccionada, mostrar TODAS las guías
                if (guides.length > 0) {
                    guideSelect.innerHTML = '<option value="">Ninguno</option>' +
                        guides.map(g => {
                            const agencyName = g.agency_id ? (agencies.find(a => this.compareIds(a.id, g.agency_id))?.name || '') : '';
                            return `<option value="${g.id}">${g.name}${agencyName ? ' (' + agencyName + ')' : ''}</option>`;
                        }).join('');
                } else {
                    guideSelect.innerHTML = '<option value="">Ninguno (no hay guías disponibles)</option>';
                }
                return;
            }

            // Buscar la agencia seleccionada (puede haber duplicados por nombre)
            const selectedAgency = agencies.find(a => this.compareIds(a.id, agencyId));
            if (!selectedAgency) {
                console.warn(`⚠️ Agencia con ID ${agencyId} no encontrada`);
                // Si no se encuentra la agencia, mostrar todas las guías
                if (guides.length > 0) {
                    guideSelect.innerHTML = '<option value="">Ninguno</option>' +
                        guides.map(g => {
                            const agencyName = g.agency_id ? (agencies.find(a => this.compareIds(a.id, g.agency_id))?.name || '') : '';
                            return `<option value="${g.id}">${g.name}${agencyName ? ' (' + agencyName + ')' : ''}</option>`;
                        }).join('');
                } else {
                    guideSelect.innerHTML = '<option value="">Ninguno (no hay guías disponibles)</option>';
                }
                return;
            }

            console.log(`   Agencia seleccionada: ${selectedAgency.name} (ID: ${selectedAgency.id})`);

            // Filtrar guías por agencia seleccionada
            // Usar comparación flexible de IDs
            const filteredGuides = guides.filter(g => {
                if (!g.agency_id) {
                    return false; // Guías sin agencia no se muestran cuando hay una agencia seleccionada
                }
                const matches = this.compareIds(g.agency_id, agencyId);
                if (matches) {
                    console.log(`   ✅ Guía encontrada: ${g.name} (agency_id: ${g.agency_id})`);
                }
                return matches;
            });

            console.log(`   Guías filtradas: ${filteredGuides.length}`);

            if (filteredGuides.length > 0) {
                guideSelect.innerHTML = '<option value="">Ninguno</option>' +
                    filteredGuides.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
                console.log(`✅ ${filteredGuides.length} guías cargadas para agencia ${selectedAgency.name}`);
            } else {
                // Si no hay guías para esta agencia, mostrar todas pero indicar que no hay para esta agencia
                console.warn(`⚠️ No se encontraron guías para la agencia ${selectedAgency.name}`);
                if (guides.length > 0) {
                    guideSelect.innerHTML = '<option value="">Ninguno (no hay guías para esta agencia)</option>' +
                        guides.map(g => {
                            const agencyName = g.agency_id ? (agencies.find(a => this.compareIds(a.id, g.agency_id))?.name || '') : '';
                            return `<option value="${g.id}">${g.name}${agencyName ? ' (' + agencyName + ')' : ''}</option>`;
                        }).join('');
                } else {
                    guideSelect.innerHTML = '<option value="">Ninguno (no hay guías disponibles)</option>';
                }
            }
        } catch (error) {
            console.error('Error cargando guías:', error);
            const guideSelect = document.getElementById('qc-guide');
            if (guideSelect) {
                guideSelect.innerHTML = '<option value="">Error cargando guías</option>';
            }
        }
    },

    // Función auxiliar para comparar IDs de forma flexible
    compareIds(id1, id2) {
        if (!id1 || !id2) return false;
        // Normalizar: convertir a string, trim, y comparar
        const normalized1 = String(id1).trim().toLowerCase();
        const normalized2 = String(id2).trim().toLowerCase();
        return normalized1 === normalized2;
    },

    // Función auxiliar para filtrar y ordenar agencias permitidas
    filterAllowedAgencies(allAgencies) {
        // Lista de agencias permitidas (en mayúsculas para comparación)
        const allowedAgencies = ['TRAVELEX', 'VERANOS', 'TANITOURS', 'DISCOVERY', 'TB', 'TTF', 'TROPICAL ADVENTURE'];
        
        // Filtrar: solo agencias permitidas y eliminar duplicados (mantener la primera de cada nombre)
        const seenAgencyNames = new Set();
        const filtered = allAgencies.filter(a => {
            if (!a || !a.name) return false;
            const normalizedName = a.name.trim().toUpperCase();
            
            // Verificar si es una agencia permitida
            const isAllowed = allowedAgencies.some(allowed => 
                normalizedName === allowed || 
                normalizedName.includes(allowed) || 
                allowed.includes(normalizedName)
            );
            
            if (!isAllowed) {
                return false;
            }
            
            // Eliminar duplicados: mantener solo la primera agencia con cada nombre
            if (seenAgencyNames.has(normalizedName)) {
                return false;
            }
            seenAgencyNames.add(normalizedName);
            return true;
        });
        
        // Ordenar agencias según el orden de la lista permitida
        filtered.sort((a, b) => {
            const nameA = a.name.trim().toUpperCase();
            const nameB = b.name.trim().toUpperCase();
            const indexA = allowedAgencies.findIndex(allowed => 
                nameA === allowed || nameA.includes(allowed) || allowed.includes(nameA)
            );
            const indexB = allowedAgencies.findIndex(allowed => 
                nameB === allowed || nameB.includes(allowed) || allowed.includes(nameB)
            );
            return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
        });
        
        return filtered;
    },

    // Cargar guías para agencia en el formulario de edición
    async loadGuidesForAgencyInEdit(agencyId, currentGuideId = null) {
        try {
            const guides = await DB.getAll('catalog_guides') || [];
            const agencies = await DB.getAll('catalog_agencies') || [];
            const guideSelect = document.getElementById('edit-qc-guide');
            
            if (!guideSelect) return;

            console.log(`🔍 [Edición] Cargando guías para agencia: ${agencyId}`);

            if (!agencyId || agencyId === '') {
                // Si no hay agencia seleccionada, mostrar TODAS las guías
                if (guides.length > 0) {
                    guideSelect.innerHTML = '<option value="">Ninguno</option>' +
                        guides.map(g => {
                            const agencyName = g.agency_id ? (agencies.find(a => this.compareIds(a.id, g.agency_id))?.name || '') : '';
                            return `<option value="${g.id}" ${currentGuideId && this.compareIds(g.id, currentGuideId) ? 'selected' : ''}>${g.name}${agencyName ? ' (' + agencyName + ')' : ''}</option>`;
                        }).join('');
                } else {
                    guideSelect.innerHTML = '<option value="">Ninguno (no hay guías disponibles)</option>';
                }
                return;
            }

            // Buscar la agencia seleccionada
            const selectedAgency = agencies.find(a => this.compareIds(a.id, agencyId));
            if (!selectedAgency) {
                console.warn(`⚠️ [Edición] Agencia con ID ${agencyId} no encontrada`);
                if (guides.length > 0) {
                    guideSelect.innerHTML = '<option value="">Ninguno</option>' +
                        guides.map(g => {
                            const agencyName = g.agency_id ? (agencies.find(a => this.compareIds(a.id, g.agency_id))?.name || '') : '';
                            return `<option value="${g.id}" ${currentGuideId && this.compareIds(g.id, currentGuideId) ? 'selected' : ''}>${g.name}${agencyName ? ' (' + agencyName + ')' : ''}</option>`;
                        }).join('');
                } else {
                    guideSelect.innerHTML = '<option value="">Ninguno (no hay guías disponibles)</option>';
                }
                return;
            }

            // Filtrar guías por agencia seleccionada
            const filteredGuides = guides.filter(g => {
                if (!g.agency_id) return false;
                return this.compareIds(g.agency_id, agencyId);
            });

            console.log(`   [Edición] Guías filtradas: ${filteredGuides.length}`);

            if (filteredGuides.length > 0) {
                guideSelect.innerHTML = '<option value="">Ninguno</option>' +
                    filteredGuides.map(g => 
                        `<option value="${g.id}" ${currentGuideId && this.compareIds(g.id, currentGuideId) ? 'selected' : ''}>${g.name}</option>`
                    ).join('');
                console.log(`✅ [Edición] ${filteredGuides.length} guías cargadas para agencia ${selectedAgency.name}`);
            } else {
                console.warn(`⚠️ [Edición] No se encontraron guías para la agencia ${selectedAgency.name}`);
                guideSelect.innerHTML = '<option value="">Ninguno (no hay guías para esta agencia)</option>';
            }
        } catch (error) {
            console.error('Error cargando guías en edición:', error);
            const guideSelect = document.getElementById('edit-qc-guide');
            if (guideSelect) {
                guideSelect.innerHTML = '<option value="">Error cargando guías</option>';
            }
        }
    },

    async addToPendingList() {
        try {
            const isMasterAdmin = typeof UserManager !== 'undefined' && (
                UserManager.currentUser?.role === 'master_admin' ||
                UserManager.currentUser?.is_master_admin
            );
            const currentBranchId = typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : null;

            const branchId = isMasterAdmin 
                ? document.getElementById('qc-branch')?.value || currentBranchId
                : currentBranchId;
            const sellerId = document.getElementById('qc-seller')?.value;
            const guideId = document.getElementById('qc-guide')?.value || null;
            const agencyId = document.getElementById('qc-agency')?.value || null;
            const product = document.getElementById('qc-product')?.value.trim();
            const quantity = parseInt(document.getElementById('qc-quantity')?.value) || 1;
            const currency = document.getElementById('qc-currency')?.value;
            const captureDate = document.getElementById('qc-date')?.value || new Date().toISOString().split('T')[0];
            
            // Obtener pagos múltiples
            const payments = this.getPaymentsFromForm();
            if (!payments || payments.length === 0) {
                Utils.showNotification('Debes agregar al menos un pago', 'error');
                return;
            }
            
            // Calcular total de todos los pagos
            const total = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
            if (total <= 0) {
                Utils.showNotification('El total de los pagos debe ser mayor a 0', 'error');
                return;
            }
            
            const isStreet = document.getElementById('qc-is-street')?.checked || false;

            // Validar campos requeridos
            if (!branchId || !sellerId || !product || !currency || total <= 0) {
                Utils.showNotification('Por favor completa todos los campos requeridos', 'error');
                return;
            }

            // Obtener nombres para mostrar
            const sellers = await DB.getAll('catalog_sellers') || [];
            const seller = sellers.find(s => s.id === sellerId);
            const sellerName = seller ? seller.name : 'Desconocido';

            let guideName = null;
            if (guideId) {
                const guides = await DB.getAll('catalog_guides') || [];
                const guide = guides.find(g => g.id === guideId);
                guideName = guide ? guide.name : null;
            }

            let agencyName = null;
            if (agencyId) {
                const agencies = await DB.getAll('catalog_agencies') || [];
                const agency = agencies.find(a => a.id === agencyId);
                agencyName = agency ? agency.name : null;
            }

            const branches = await DB.getAll('catalog_branches') || [];
            const branch = branches.find(b => b.id === branchId);
            const branchName = branch ? branch.name : 'Desconocida';

            // Obtener costo de mercancía (manual o del inventario)
            let merchandiseCost = parseFloat(document.getElementById('qc-cost')?.value || 0);
            
            // Si no se ingresó costo manual, intentar obtener del inventario
            if (!merchandiseCost || merchandiseCost === 0) {
                try {
                    const inventoryItems = await DB.getAll('inventory_items') || [];
                    const matchingItem = inventoryItems.find(i => 
                        i.name && product && 
                        i.name.toLowerCase().includes(product.toLowerCase())
                    );
                    if (matchingItem && matchingItem.cost) {
                        merchandiseCost = (matchingItem.cost || 0) * quantity;
                    }
                } catch (e) {
                    console.warn('No se pudo obtener costo del inventario:', e);
                }
            }

            // Obtener notas
            const notes = document.getElementById('qc-notes')?.value?.trim() || null;

            // Verificar si estamos editando una captura existente
            if (this.editingPendingCaptureId) {
                // Actualizar la captura existente
                const existingIndex = this.pendingCaptures.findIndex(c => c.id === this.editingPendingCaptureId);
                if (existingIndex !== -1) {
                    // Actualizar la captura existente
                    this.pendingCaptures[existingIndex] = {
                        ...this.pendingCaptures[existingIndex],
                        branch_id: branchId,
                        branch_name: branchName,
                        seller_id: sellerId,
                        seller_name: sellerName,
                        guide_id: guideId,
                        guide_name: guideName,
                        agency_id: agencyId,
                        agency_name: agencyName,
                        product: product,
                        quantity: quantity,
                        currency: currency,
                        total: total,
                        merchandise_cost: merchandiseCost,
                        notes: notes,
                        is_street: isStreet,
                        payments: payments, // Array de pagos múltiples
                        payment_method: payments.length === 1 ? payments[0].method : 'mixed', // Para compatibilidad
                        date: captureDate, // Fecha manual seleccionada
                        updated_at: new Date().toISOString()
                    };
                    // Limpiar el ID de edición
                    const wasEditing = true;
                    this.editingPendingCaptureId = null;
                    
                    // Limpiar formulario después de actualizar
                    document.getElementById('quick-capture-form')?.reset();
                    if (document.getElementById('qc-quantity')) {
                        document.getElementById('qc-quantity').value = '1';
                    }
                    const today = new Date().toISOString().split('T')[0];
                    if (document.getElementById('qc-date')) {
                        document.getElementById('qc-date').value = today;
                    }
                    this.initializePaymentsSystem();
                    
                    // Actualizar lista de pendientes
                    await this.loadPendingCaptures();
                    
                    Utils.showNotification('Captura actualizada en la lista', 'success');
                    return;
                } else {
                    Utils.showNotification('No se encontró la captura a editar', 'error');
                    this.editingPendingCaptureId = null;
                    return;
                }
            } else {
                // Crear nueva captura (pendiente)
                const capture = {
                    id: 'pending_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    branch_id: branchId,
                    branch_name: branchName,
                    seller_id: sellerId,
                    seller_name: sellerName,
                    guide_id: guideId,
                    guide_name: guideName,
                    agency_id: agencyId,
                    agency_name: agencyName,
                    product: product,
                    quantity: quantity,
                    currency: currency,
                    total: total,
                    merchandise_cost: merchandiseCost,
                    notes: notes,
                    is_street: isStreet,
                    payments: payments, // Array de pagos múltiples
                    payment_method: payments.length === 1 ? payments[0].method : 'mixed', // Para compatibilidad
                    date: captureDate, // Fecha manual seleccionada
                    created_at: new Date().toISOString(),
                    created_by: typeof UserManager !== 'undefined' && UserManager.currentUser ? UserManager.currentUser.id : null,
                    isPending: true // Marca para identificar que es pendiente
                };

                // Agregar a la lista pendiente en memoria
                this.pendingCaptures.push(capture);

                // Limpiar formulario
                document.getElementById('quick-capture-form')?.reset();
                if (document.getElementById('qc-quantity')) {
                    document.getElementById('qc-quantity').value = '1';
                }
                // Restablecer fecha a hoy
                const today = new Date().toISOString().split('T')[0];
                if (document.getElementById('qc-date')) {
                    document.getElementById('qc-date').value = today;
                }
                // Reinicializar sistema de pagos
                this.initializePaymentsSystem();

                // Actualizar lista de pendientes
                await this.loadPendingCaptures();

                Utils.showNotification(`Captura agregada a la lista (${this.pendingCaptures.length} pendientes)`, 'success');
            }
        } catch (error) {
            console.error('Error agregando captura a lista pendiente:', error);
            Utils.showNotification('Error al agregar la captura: ' + error.message, 'error');
        }
    },

    initializePaymentsSystem() {
        try {
            // Inicializar el sistema de pagos múltiples
            const container = document.getElementById('qc-payments-container');
            if (!container) return;
            
            // Limpiar y agregar una fila inicial
            container.innerHTML = `
                <div class="payment-row" style="display: grid; grid-template-columns: 1fr 140px 70px; gap: 6px; align-items: center; padding: 4px; background: white; border-radius: 4px; border: 1px solid #dee2e6;">
                    <select class="form-select payment-method" required style="border: 1px solid #ced4da; font-size: 11px; padding: 6px;">
                        <option value="">Método...</option>
                        <option value="cash">Efectivo</option>
                        <option value="card">Tarjeta</option>
                        <option value="transfer">Transferencia</option>
                        <option value="other">Otro</option>
                    </select>
                    <input type="number" class="form-input payment-amount" min="0" step="0.01" placeholder="0.00" required style="border: 1px solid #ced4da; font-size: 11px; padding: 6px;">
                    <button type="button" class="btn-danger btn-xs remove-payment" style="display: none; padding: 4px 6px; font-size: 10px;" onclick="if(window.Reports && window.Reports.updatePaymentsTotal) window.Reports.updatePaymentsTotal(); this.closest('.payment-row').remove(); if(window.Reports && window.Reports.updateRemoveButtons) window.Reports.updateRemoveButtons();">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            
            // Agregar event listeners a los campos de pago
            const amountInputs = container.querySelectorAll('.payment-amount');
            if (amountInputs && amountInputs.length > 0) {
                amountInputs.forEach(input => {
                    if (input) {
                        input.addEventListener('input', () => {
                            if (this.updatePaymentsTotal) {
                                this.updatePaymentsTotal();
                            }
                        });
                    }
                });
            }
            
            if (this.updatePaymentsTotal) {
                this.updatePaymentsTotal();
            }
            if (this.updateRemoveButtons) {
                this.updateRemoveButtons();
            }
        } catch (error) {
            console.error('Error inicializando sistema de pagos:', error);
        }
    },

    addPaymentRow() {
        try {
            const container = document.getElementById('qc-payments-container');
            if (!container) return;
            
            const row = document.createElement('div');
            row.className = 'payment-row';
            row.style.cssText = 'display: grid; grid-template-columns: 1fr 140px 70px; gap: 6px; align-items: center; padding: 4px; background: white; border-radius: 4px; border: 1px solid #dee2e6;';
            row.innerHTML = `
                <select class="form-select payment-method" required style="border: 1px solid #ced4da; font-size: 11px; padding: 6px;">
                    <option value="">Método...</option>
                    <option value="cash">Efectivo</option>
                    <option value="card">Tarjeta</option>
                    <option value="transfer">Transferencia</option>
                    <option value="other">Otro</option>
                </select>
                <input type="number" class="form-input payment-amount" min="0" step="0.01" placeholder="0.00" required style="border: 1px solid #ced4da; font-size: 11px; padding: 6px;">
                <button type="button" class="btn-danger btn-xs remove-payment" style="padding: 4px 6px; font-size: 10px;" onclick="if(window.Reports && window.Reports.updatePaymentsTotal) window.Reports.updatePaymentsTotal(); this.closest('.payment-row').remove(); if(window.Reports && window.Reports.updateRemoveButtons) window.Reports.updateRemoveButtons();">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            container.appendChild(row);
            
            // Agregar event listener al nuevo campo de monto
            const amountInput = row.querySelector('.payment-amount');
            if (amountInput) {
                amountInput.addEventListener('input', () => {
                    if (this.updatePaymentsTotal) {
                        this.updatePaymentsTotal();
                    }
                });
            }
            
            // Mostrar botones de eliminar si hay más de una fila
            if (this.updateRemoveButtons) {
                this.updateRemoveButtons();
            }
        } catch (error) {
            console.error('Error agregando fila de pago:', error);
        }
    },

    updateRemoveButtons() {
        const container = document.getElementById('qc-payments-container');
        if (!container) return;
        
        const rows = container.querySelectorAll('.payment-row');
        rows.forEach((row, index) => {
            const removeBtn = row.querySelector('.remove-payment');
            if (removeBtn) {
                removeBtn.style.display = rows.length > 1 ? 'block' : 'none';
            }
        });
    },

    updatePaymentsTotal() {
        try {
            const container = document.getElementById('qc-payments-container');
            if (!container) return;
            
            const amountInputs = container.querySelectorAll('.payment-amount');
            const amounts = Array.from(amountInputs || [])
                .map(input => parseFloat(input?.value) || 0);
            
            const total = amounts.reduce((sum, amount) => sum + amount, 0);
            
            const totalDisplay = document.getElementById('qc-payments-total');
            if (totalDisplay) {
                totalDisplay.textContent = `$${total.toFixed(2)}`;
            }
            
            const totalInput = document.getElementById('qc-total');
            if (totalInput) {
                totalInput.value = total;
            }
            
            if (this.updateRemoveButtons) {
                this.updateRemoveButtons();
            }
        } catch (error) {
            console.error('Error actualizando total de pagos:', error);
        }
    },

    getPaymentsFromForm() {
        try {
            const container = document.getElementById('qc-payments-container');
            if (!container) return [];
            
            const payments = [];
            const rows = container.querySelectorAll('.payment-row');
            
            if (rows && rows.length > 0) {
                rows.forEach(row => {
                    try {
                        const methodSelect = row.querySelector('.payment-method');
                        const amountInput = row.querySelector('.payment-amount');
                        
                        if (methodSelect && amountInput) {
                            const method = methodSelect.value;
                            const amount = parseFloat(amountInput.value || 0);
                            
                            if (method && amount > 0) {
                                payments.push({
                                    method: method,
                                    amount: amount
                                });
                            }
                        }
                    } catch (rowError) {
                        console.warn('Error procesando fila de pago:', rowError);
                    }
                });
            }
            
            return payments;
        } catch (error) {
            console.error('Error obteniendo pagos del formulario:', error);
            return [];
        }
    },

    async loadPendingCaptures() {
        try {
            const container = document.getElementById('pending-captures-container');
            const listContainer = document.getElementById('pending-captures-list');
            const countSpan = document.getElementById('pending-count');
            const saveBtn = document.getElementById('save-all-pending-btn');
            const saveBtnHeader = document.getElementById('save-all-pending-btn-header');

            if (!container || !listContainer) return;

            // Actualizar contador
            if (countSpan) {
                countSpan.textContent = this.pendingCaptures.length;
            }
            if (saveBtn) {
                saveBtn.textContent = `Guardar Todo (${this.pendingCaptures.length})`;
                saveBtn.disabled = this.pendingCaptures.length === 0;
            }
            if (saveBtnHeader) {
                saveBtnHeader.textContent = `Guardar Todo (${this.pendingCaptures.length})`;
                saveBtnHeader.disabled = this.pendingCaptures.length === 0;
            }

            // Mostrar/ocultar contenedor
            if (this.pendingCaptures.length === 0) {
                container.style.display = 'none';
                return;
            }
            container.style.display = 'block';

            // Calcular totales
            const totals = {
                USD: 0,
                MXN: 0,
                CAD: 0
            };
            let totalQuantity = 0;

            this.pendingCaptures.forEach(c => {
                totals[c.currency] = (totals[c.currency] || 0) + c.total;
                totalQuantity += c.quantity || 1;
            });

            // Renderizar tabla
            let html = `
                <div style="margin-bottom: 10px; padding: 10px; background: linear-gradient(135deg, #fff9e6 0%, #fff3cd 100%); border-radius: 6px; border: 1px solid #ffc107; box-shadow: 0 1px 3px rgba(255,193,7,0.15);">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px;">
                        <div style="padding: 8px; background: white; border-radius: 4px; border-left: 3px solid #ffc107; box-shadow: 0 1px 2px rgba(0,0,0,0.08);">
                            <div style="font-size: 9px; color: #856404; text-transform: uppercase; margin-bottom: 4px; font-weight: 600; letter-spacing: 0.3px;">Total Pendientes</div>
                            <div style="font-size: 20px; font-weight: 700; color: #ffc107;">${this.pendingCaptures.length}</div>
                        </div>
                        <div style="padding: 8px; background: white; border-radius: 4px; border-left: 3px solid #ffc107; box-shadow: 0 1px 2px rgba(0,0,0,0.08);">
                            <div style="font-size: 9px; color: #856404; text-transform: uppercase; margin-bottom: 4px; font-weight: 600; letter-spacing: 0.3px;">Total Cantidad</div>
                            <div style="font-size: 20px; font-weight: 700; color: #ffc107;">${totalQuantity}</div>
                        </div>
                        <div style="padding: 8px; background: white; border-radius: 4px; border-left: 3px solid #ffc107; box-shadow: 0 1px 2px rgba(0,0,0,0.08);">
                            <div style="font-size: 9px; color: #856404; text-transform: uppercase; margin-bottom: 4px; font-weight: 600; letter-spacing: 0.3px;">Total USD</div>
                            <div style="font-size: 16px; font-weight: 700; color: #ffc107;">$${totals.USD.toFixed(2)}</div>
                        </div>
                        <div style="padding: 8px; background: white; border-radius: 4px; border-left: 3px solid #ffc107; box-shadow: 0 1px 2px rgba(0,0,0,0.08);">
                            <div style="font-size: 9px; color: #856404; text-transform: uppercase; margin-bottom: 4px; font-weight: 600; letter-spacing: 0.3px;">Total MXN</div>
                            <div style="font-size: 16px; font-weight: 700; color: #ffc107;">$${totals.MXN.toFixed(2)}</div>
                        </div>
                        <div style="padding: 8px; background: white; border-radius: 4px; border-left: 3px solid #ffc107; box-shadow: 0 1px 2px rgba(0,0,0,0.08);">
                            <div style="font-size: 9px; color: #856404; text-transform: uppercase; margin-bottom: 4px; font-weight: 600; letter-spacing: 0.3px;">Total CAD</div>
                            <div style="font-size: 16px; font-weight: 700; color: #ffc107;">$${totals.CAD.toFixed(2)}</div>
                        </div>
                    </div>
                </div>

                <div style="overflow-x: auto; border-radius: 4px; border: 1px solid #ffc107;">
                    <table style="width: 100%; border-collapse: collapse; background: white; font-size: 11px;">
                        <thead>
                            <tr style="background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%); color: white;">
                                <th style="padding: 8px 6px; text-align: left; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px;">#</th>
                                <th style="padding: 8px 6px; text-align: left; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px;">Sucursal</th>
                                <th style="padding: 8px 6px; text-align: left; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px;">Vendedor</th>
                                <th style="padding: 8px 6px; text-align: left; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px;">Guía</th>
                                <th style="padding: 8px 6px; text-align: left; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px;">Agencia</th>
                                <th style="padding: 8px 6px; text-align: left; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px;">Producto</th>
                                <th style="padding: 8px 6px; text-align: center; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px;">Cantidad</th>
                                <th style="padding: 8px 6px; text-align: right; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px;">Moneda</th>
                                <th style="padding: 8px 6px; text-align: right; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px;">Total</th>
                                <th style="padding: 8px 6px; text-align: right; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px;">Costo</th>
                                <th style="padding: 8px 6px; text-align: center; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.pendingCaptures.map((c, index) => {
                                const isEven = index % 2 === 0;
                                return `
                                    <tr style="border-bottom: 1px solid #ffe69c; background: ${isEven ? 'white' : '#fff9e6'};">
                                        <td style="padding: 6px; font-size: 11px; font-weight: 600; color: #856404;">${index + 1}</td>
                                        <td style="padding: 6px; font-size: 11px; color: #495057;">${c.branch_name || 'N/A'}</td>
                                        <td style="padding: 6px; font-size: 11px; color: #495057; font-weight: 500;">${c.seller_name || 'N/A'}</td>
                                        <td style="padding: 6px; font-size: 11px; color: #6c757d;">${c.guide_name || '-'}</td>
                                        <td style="padding: 6px; font-size: 11px; color: #6c757d;">${c.agency_name || '-'}</td>
                                        <td style="padding: 6px; font-size: 11px; color: #495057; font-weight: 500;">${c.product}</td>
                                        <td style="padding: 6px; font-size: 11px; text-align: center; color: #495057;">${c.quantity}</td>
                                        <td style="padding: 6px; font-size: 11px; text-align: right; color: #495057; font-weight: 500;">${c.currency}</td>
                                        <td style="padding: 6px; font-size: 11px; text-align: right; font-weight: 600; color: #28a745;">$${c.total.toFixed(2)}</td>
                                        <td style="padding: 6px; font-size: 11px; text-align: right; color: #dc3545; font-weight: 500;">$${(c.merchandise_cost || 0).toFixed(2)}</td>
                                        <td style="padding: 6px; text-align: center;">
                                            <div style="display: flex; gap: 4px; justify-content: center;">
                                                <button class="btn-primary btn-xs" onclick="window.Reports.editPendingCapture('${c.id}')" title="Editar" style="padding: 4px 6px; font-size: 10px;">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button class="btn-danger btn-xs" onclick="window.Reports.deletePendingCapture('${c.id}')" title="Eliminar" style="padding: 4px 6px; font-size: 10px;">
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

            listContainer.innerHTML = html;
        } catch (error) {
            console.error('Error cargando capturas pendientes:', error);
        }
    },

    async editPendingCapture(captureId) {
        try {
            const capture = this.pendingCaptures.find(c => c.id === captureId);
            if (!capture) {
                Utils.showNotification('Captura no encontrada', 'error');
                return;
            }

            // Guardar el ID de la captura que se está editando (NO eliminar de la lista)
            this.editingPendingCaptureId = captureId;

            // Llenar el formulario con los datos de la captura
            const isMasterAdmin = typeof UserManager !== 'undefined' && (
                UserManager.currentUser?.role === 'master_admin' ||
                UserManager.currentUser?.is_master_admin ||
                UserManager.currentUser?.isMasterAdmin
            );

            if (isMasterAdmin && document.getElementById('qc-branch')) {
                document.getElementById('qc-branch').value = capture.branch_id;
            }
            if (document.getElementById('qc-seller')) {
                document.getElementById('qc-seller').value = capture.seller_id;
            }
            if (document.getElementById('qc-guide')) {
                document.getElementById('qc-guide').value = capture.guide_id || '';
                // Si hay agencia, cargar guías filtradas
                if (capture.agency_id) {
                    await this.loadGuidesForAgency(capture.agency_id, capture.guide_id);
                }
            }
            if (document.getElementById('qc-agency')) {
                document.getElementById('qc-agency').value = capture.agency_id || '';
                // Disparar evento change para cargar guías si hay agencia
                if (capture.agency_id) {
                    document.getElementById('qc-agency').dispatchEvent(new Event('change'));
                }
            }
            if (document.getElementById('qc-product')) {
                document.getElementById('qc-product').value = capture.product;
            }
            if (document.getElementById('qc-quantity')) {
                document.getElementById('qc-quantity').value = capture.quantity;
            }
            if (document.getElementById('qc-date')) {
                document.getElementById('qc-date').value = capture.date || new Date().toISOString().split('T')[0];
            }
            if (document.getElementById('qc-currency')) {
                document.getElementById('qc-currency').value = capture.currency;
            }
            if (document.getElementById('qc-cost')) {
                document.getElementById('qc-cost').value = capture.merchandise_cost || '';
            }
            if (document.getElementById('qc-notes')) {
                document.getElementById('qc-notes').value = capture.notes || '';
            }
            if (document.getElementById('qc-is-street')) {
                document.getElementById('qc-is-street').checked = capture.is_street || false;
                // Disparar evento change para mostrar/ocultar campo de método de pago
                document.getElementById('qc-is-street').dispatchEvent(new Event('change'));
            }
            if (document.getElementById('qc-payment-method')) {
                document.getElementById('qc-payment-method').value = capture.payment_method || '';
            }

            // Cargar pagos múltiples si existen
            if (capture.payments && Array.isArray(capture.payments) && capture.payments.length > 0) {
                // Limpiar pagos actuales
                const container = document.getElementById('qc-payments-container');
                if (container) {
                    container.innerHTML = '';
                    // Agregar cada pago
                    capture.payments.forEach((payment, index) => {
                        const row = document.createElement('div');
                        row.className = 'payment-row';
                        row.style.cssText = 'display: grid; grid-template-columns: 1fr 140px 70px; gap: 6px; align-items: center; padding: 4px; background: white; border-radius: 4px; border: 1px solid #dee2e6;';
                        row.innerHTML = `
                            <select class="form-select payment-method" required style="border: 1px solid #ced4da; font-size: 11px; padding: 6px;">
                                <option value="">Método...</option>
                                <option value="cash" ${payment.method === 'cash' ? 'selected' : ''}>Efectivo</option>
                                <option value="card" ${payment.method === 'card' ? 'selected' : ''}>Tarjeta</option>
                                <option value="transfer" ${payment.method === 'transfer' ? 'selected' : ''}>Transferencia</option>
                                <option value="other" ${payment.method === 'other' ? 'selected' : ''}>Otro</option>
                            </select>
                            <input type="number" class="form-input payment-amount" min="0" step="0.01" placeholder="0.00" value="${payment.amount || 0}" required style="border: 1px solid #ced4da; font-size: 11px; padding: 6px;">
                            <button type="button" class="btn-danger btn-xs remove-payment" style="padding: 4px 6px; font-size: 10px;" onclick="if(window.Reports && window.Reports.updatePaymentsTotal) window.Reports.updatePaymentsTotal(); this.closest('.payment-row').remove(); if(window.Reports && window.Reports.updateRemoveButtons) window.Reports.updateRemoveButtons();">
                                <i class="fas fa-times"></i>
                            </button>
                        `;
                        container.appendChild(row);
                    });
                    // Agregar event listeners
                    container.querySelectorAll('.payment-amount').forEach(input => {
                        input.addEventListener('input', () => {
                            if (this.updatePaymentsTotal) {
                                this.updatePaymentsTotal();
                            }
                        });
                    });
                    if (this.updatePaymentsTotal) {
                        this.updatePaymentsTotal();
                    }
                    if (this.updateRemoveButtons) {
                        this.updateRemoveButtons();
                    }
                }
            } else {
                // Si no hay pagos, reinicializar el sistema
                this.initializePaymentsSystem();
            }

            // NO eliminar la captura de la lista - solo marcarla como en edición
            // La captura se actualizará cuando se guarde con "Agregar a Lista"

            // Scroll al formulario
            document.getElementById('quick-capture-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            document.getElementById('qc-product')?.focus();

            Utils.showNotification('Captura cargada para edición. Modifica los datos y haz clic en "Agregar a Lista" para actualizar.', 'info');
        } catch (error) {
            console.error('Error editando captura pendiente:', error);
            Utils.showNotification('Error al editar la captura: ' + error.message, 'error');
        }
    },

    async deletePendingCapture(captureId) {
        try {
            if (!confirm('¿Estás seguro de eliminar esta captura de la lista?')) {
                return;
            }

            this.pendingCaptures = this.pendingCaptures.filter(c => c.id !== captureId);
            await this.loadPendingCaptures();

            Utils.showNotification('Captura eliminada de la lista', 'success');
        } catch (error) {
            console.error('Error eliminando captura pendiente:', error);
            Utils.showNotification('Error al eliminar la captura: ' + error.message, 'error');
        }
    },

    async clearPendingCaptures() {
        try {
            if (this.pendingCaptures.length === 0) {
                Utils.showNotification('No hay capturas pendientes', 'info');
                return;
            }

            if (!confirm(`¿Estás seguro de eliminar todas las ${this.pendingCaptures.length} capturas pendientes?`)) {
                return;
            }

            this.pendingCaptures = [];
            await this.loadPendingCaptures();

            Utils.showNotification('Lista de capturas pendientes limpiada', 'success');
        } catch (error) {
            console.error('Error limpiando capturas pendientes:', error);
            Utils.showNotification('Error al limpiar la lista: ' + error.message, 'error');
        }
    },

    async saveAllPendingCaptures() {
        try {
            if (this.pendingCaptures.length === 0) {
                Utils.showNotification('No hay capturas pendientes para guardar', 'warning');
                return;
            }

            if (!confirm(`¿Guardar todas las ${this.pendingCaptures.length} capturas pendientes?`)) {
                return;
            }

            // Guardar cada captura en IndexedDB
            let savedCount = 0;
            for (const capture of this.pendingCaptures) {
                try {
                    // Generar nuevo ID para la captura guardada
                    const savedCapture = {
                        ...capture,
                        id: 'qc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
                    };
                    delete savedCapture.isPending;

                    await DB.put('temp_quick_captures', savedCapture);
                    savedCount++;
                } catch (error) {
                    console.error('Error guardando captura individual:', error);
                }
            }

            // Limpiar lista pendiente
            this.pendingCaptures = [];
            await this.loadPendingCaptures();

            // Recargar datos y generar estadísticas
            await this.loadQuickCaptureData();

            Utils.showNotification(`${savedCount} capturas guardadas exitosamente. Las estadísticas se han actualizado.`, 'success');
        } catch (error) {
            console.error('Error guardando capturas pendientes:', error);
            Utils.showNotification('Error al guardar las capturas: ' + error.message, 'error');
        }
    },

    async loadQuickCaptureData() {
        try {
            const today = new Date().toISOString().split('T')[0];
            
            // Obtener todas las capturas del día
            let captures = await DB.getAll('temp_quick_captures') || [];
            captures = captures.filter(c => c.date === today);
            
            // Ordenar por fecha de creación (más recientes primero)
            captures.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            const listContainer = document.getElementById('quick-capture-list');
            if (!listContainer) return;

            if (captures.length === 0) {
                listContainer.innerHTML = `
                    <div style="text-align: center; padding: var(--spacing-lg); color: var(--color-text-secondary);">
                        <i class="fas fa-inbox" style="font-size: 48px; opacity: 0.3; margin-bottom: var(--spacing-md);"></i>
                        <p>No hay capturas del día de hoy</p>
                    </div>
                `;
                return;
            }

            // Calcular totales
            const totals = {
                USD: 0,
                MXN: 0,
                CAD: 0
            };
            let totalQuantity = 0;

            captures.forEach(c => {
                // Si hay múltiples pagos, calcular el total desde los pagos
                let captureTotal = c.total || 0;
                if ((!captureTotal || captureTotal === 0) && c.payments && Array.isArray(c.payments) && c.payments.length > 0) {
                    captureTotal = c.payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
                }
                captureTotal = parseFloat(captureTotal) || 0;
                totals[c.currency] = (totals[c.currency] || 0) + captureTotal;
                totalQuantity += c.quantity || 1;
            });

            // Renderizar tabla
            let html = `
                <div style="margin-bottom: 10px; padding: 10px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 6px; border: 1px solid #dee2e6; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px;">
                        <div style="padding: 8px; background: white; border-radius: 4px; border-left: 3px solid #667eea; box-shadow: 0 1px 2px rgba(0,0,0,0.08);">
                            <div style="font-size: 9px; color: #6c757d; text-transform: uppercase; margin-bottom: 4px; font-weight: 600; letter-spacing: 0.3px;">Total Capturas</div>
                            <div style="font-size: 20px; font-weight: 700; color: #667eea;">${captures.length}</div>
                        </div>
                        <div style="padding: 8px; background: white; border-radius: 4px; border-left: 3px solid #11998e; box-shadow: 0 1px 2px rgba(0,0,0,0.08);">
                            <div style="font-size: 9px; color: #6c757d; text-transform: uppercase; margin-bottom: 4px; font-weight: 600; letter-spacing: 0.3px;">Total Cantidad</div>
                            <div style="font-size: 20px; font-weight: 700; color: #11998e;">${totalQuantity}</div>
                        </div>
                        <div style="padding: 8px; background: white; border-radius: 4px; border-left: 3px solid #f093fb; box-shadow: 0 1px 2px rgba(0,0,0,0.08);">
                            <div style="font-size: 9px; color: #6c757d; text-transform: uppercase; margin-bottom: 4px; font-weight: 600; letter-spacing: 0.3px;">Total USD</div>
                            <div style="font-size: 16px; font-weight: 700; color: #f093fb;">$${totals.USD.toFixed(2)}</div>
                        </div>
                        <div style="padding: 8px; background: white; border-radius: 4px; border-left: 3px solid #4facfe; box-shadow: 0 1px 2px rgba(0,0,0,0.08);">
                            <div style="font-size: 9px; color: #6c757d; text-transform: uppercase; margin-bottom: 4px; font-weight: 600; letter-spacing: 0.3px;">Total MXN</div>
                            <div style="font-size: 16px; font-weight: 700; color: #4facfe;">$${totals.MXN.toFixed(2)}</div>
                        </div>
                        <div style="padding: 8px; background: white; border-radius: 4px; border-left: 3px solid #fa709a; box-shadow: 0 1px 2px rgba(0,0,0,0.08);">
                            <div style="font-size: 9px; color: #6c757d; text-transform: uppercase; margin-bottom: 4px; font-weight: 600; letter-spacing: 0.3px;">Total CAD</div>
                            <div style="font-size: 16px; font-weight: 700; color: #fa709a;">$${totals.CAD.toFixed(2)}</div>
                        </div>
                    </div>
                </div>

                <div style="overflow-x: auto; border-radius: 4px; border: 1px solid #e0e0e0;">
                    <table style="width: 100%; border-collapse: collapse; background: white; font-size: 11px;">
                        <thead>
                            <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                                <th style="padding: 8px 6px; text-align: left; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px;">Hora</th>
                                <th style="padding: 8px 6px; text-align: left; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px;">Sucursal</th>
                                <th style="padding: 8px 6px; text-align: left; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px;">Vendedor</th>
                                <th style="padding: 8px 6px; text-align: left; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px;">Guía</th>
                                <th style="padding: 8px 6px; text-align: left; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px;">Agencia</th>
                                <th style="padding: 8px 6px; text-align: left; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px;">Producto</th>
                                <th style="padding: 8px 6px; text-align: center; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px;">Cantidad</th>
                                <th style="padding: 8px 6px; text-align: right; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px;">Moneda</th>
                                <th style="padding: 8px 6px; text-align: right; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px;">Total</th>
                                <th style="padding: 8px 6px; text-align: right; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px;">Costo</th>
                                <th style="padding: 8px 6px; text-align: left; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px;">Notas</th>
                                <th style="padding: 8px 6px; text-align: center; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${captures.map((c, index) => {
                                const time = new Date(c.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                                const isEven = index % 2 === 0;
                                return `
                                    <tr style="border-bottom: 1px solid #f0f0f0; background: ${isEven ? 'white' : '#f8f9fa'};">
                                        <td style="padding: 6px; font-size: 11px; color: #495057;">${time}</td>
                                        <td style="padding: 6px; font-size: 11px; color: #495057;">${c.branch_name || 'N/A'}</td>
                                        <td style="padding: 6px; font-size: 11px; color: #495057; font-weight: 500;">${c.seller_name || 'N/A'}</td>
                                        <td style="padding: 6px; font-size: 11px; color: #6c757d;">${c.guide_name || '-'}</td>
                                        <td style="padding: 6px; font-size: 11px; color: #6c757d;">${c.agency_name || '-'}</td>
                                        <td style="padding: 6px; font-size: 11px; color: #495057; font-weight: 500;">${c.product}</td>
                                        <td style="padding: 6px; font-size: 11px; text-align: center; color: #495057;">${c.quantity}</td>
                                        <td style="padding: 6px; font-size: 11px; text-align: right; color: #495057; font-weight: 500;">${c.currency}</td>
                                        <td style="padding: 6px; font-size: 11px; text-align: right; font-weight: 600; color: #28a745;">$${((c.total || 0) || (c.payments && Array.isArray(c.payments) && c.payments.length > 0 ? c.payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) : 0)).toFixed(2)}</td>
                                        <td style="padding: 6px; font-size: 11px; text-align: right; color: #dc3545; font-weight: 500;">$${(c.merchandise_cost || 0).toFixed(2)}</td>
                                        <td style="padding: 6px; font-size: 10px; color: #6c757d; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${c.notes || ''}">${c.notes || '-'}</td>
                                        <td style="padding: 6px; text-align: center;">
                                            <div style="display: flex; gap: 4px; justify-content: center;">
                                                <button class="btn-primary btn-xs" onclick="window.Reports.editQuickCaptureSale('${c.id}')" title="Editar" style="padding: 4px 6px; font-size: 10px;">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button class="btn-danger btn-xs" onclick="window.Reports.deleteQuickCaptureSale('${c.id}')" title="Eliminar" style="padding: 4px 6px; font-size: 10px;">
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

            listContainer.innerHTML = html;
            
            // Cargar llegadas, comisiones y utilidades
            await this.loadQuickCaptureArrivals();
            await this.loadQuickCaptureCommissions(captures);
            await this.loadQuickCaptureProfits(captures);
        } catch (error) {
            console.error('Error cargando capturas rápidas:', error);
            const listContainer = document.getElementById('quick-capture-list');
            if (listContainer) {
                listContainer.innerHTML = `
                    <div style="padding: var(--spacing-md); background: var(--color-danger); color: white; border-radius: var(--radius-md);">
                        Error al cargar capturas: ${error.message}
                    </div>
                `;
            }
        }
    },

    async loadQuickCaptureArrivals() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const arrivals = await DB.getAll('agency_arrivals') || [];
            const todayArrivals = arrivals.filter(a => a.date === today);
            
            const agencies = await DB.getAll('catalog_agencies') || [];
            const branches = await DB.getAll('catalog_branches') || [];

            const container = document.getElementById('quick-capture-arrivals');
            if (!container) return;

            if (todayArrivals.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: var(--spacing-md); color: var(--color-text-secondary);">
                        <i class="fas fa-inbox" style="font-size: 32px; opacity: 0.3; margin-bottom: var(--spacing-sm);"></i>
                        <p>No hay llegadas registradas para hoy</p>
                    </div>
                `;
                return;
            }

            // Agrupar por agencia
            const arrivalsByAgency = {};
            todayArrivals.forEach(arrival => {
                const agencyId = arrival.agency_id;
                if (!arrivalsByAgency[agencyId]) {
                    arrivalsByAgency[agencyId] = {
                        agency: agencies.find(a => a.id === agencyId),
                        arrivals: [],
                        totalPassengers: 0
                    };
                }
                arrivalsByAgency[agencyId].arrivals.push(arrival);
                arrivalsByAgency[agencyId].totalPassengers += arrival.passengers || 0;
            });

            let html = `
                <div style="display: grid; gap: 8px;">
                    ${Object.values(arrivalsByAgency).map(group => `
                        <div style="padding: 10px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 4px; border-left: 3px solid #fa709a; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #dee2e6;">
                                <strong style="font-size: 12px; color: #495057; font-weight: 600;">${group.agency?.name || 'Agencia Desconocida'}</strong>
                                <span style="font-size: 10px; color: #6c757d; font-weight: 500; padding: 3px 10px; background: white; border-radius: 10px; border: 1px solid #dee2e6;">${group.totalPassengers} pasajeros</span>
                            </div>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 6px; font-size: 10px; color: #6c757d;">
                                ${group.arrivals.map(a => {
                                    const branch = branches.find(b => b.id === a.branch_id);
                                    return `
                                        <div style="padding: 4px 6px; background: white; border-radius: 3px;">
                                            <i class="fas fa-building" style="font-size: 9px; margin-right: 4px;"></i> ${branch?.name || 'N/A'}: 
                                            <strong style="color: #495057;">${a.passengers || 0}</strong> pasajeros
                                            ${a.time ? `<span style="margin-left: 4px; font-size: 9px;">(${a.time})</span>` : ''}
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;

            container.innerHTML = html;
        } catch (error) {
            console.error('Error cargando llegadas:', error);
            const container = document.getElementById('quick-capture-arrivals');
            if (container) {
                container.innerHTML = `
                    <div style="padding: var(--spacing-sm); background: var(--color-danger); color: white; border-radius: var(--radius-sm); font-size: 12px;">
                        Error: ${error.message}
                    </div>
                `;
            }
        }
    },

    toggleArrivalsForm() {
        const container = document.getElementById('quick-capture-arrivals-form-container');
        const icon = document.getElementById('arrivals-form-toggle-icon');
        if (container && icon) {
            const isHidden = container.style.display === 'none';
            container.style.display = isHidden ? 'block' : 'none';
            icon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
        }
    },

    async loadQuickArrivalsCatalogs() {
        try {
            const isMasterAdmin = typeof UserManager !== 'undefined' && (
                UserManager.currentUser?.role === 'master_admin' ||
                UserManager.currentUser?.is_master_admin ||
                UserManager.currentUser?.isMasterAdmin
            );
            
            // Cargar sucursales para formulario de llegadas (si es master admin)
            if (isMasterAdmin) {
                const branches = await DB.getAll('catalog_branches') || [];
                const branchSelect = document.getElementById('qc-arrival-branch');
                if (branchSelect) {
                    branchSelect.innerHTML = '<option value="">Seleccionar...</option>' +
                        branches.filter(b => b.active !== false).map(b => 
                            `<option value="${b.id}">${b.name}</option>`
                        ).join('');
                }
            }

            // Cargar agencias para formulario de llegadas (filtrar duplicados)
            const allAgencies = await DB.getAll('catalog_agencies') || [];
            const seenAgencyNames = new Set();
            const agencies = allAgencies.filter(a => {
                if (!a || !a.name) return false;
                const normalizedName = a.name.trim().toUpperCase();
                if (seenAgencyNames.has(normalizedName)) {
                    return false;
                }
                seenAgencyNames.add(normalizedName);
                return true;
            });
            const agencySelect = document.getElementById('qc-arrival-agency');
            if (agencySelect) {
                agencySelect.innerHTML = '<option value="">Seleccionar...</option>' +
                    agencies.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
            }
        } catch (error) {
            console.error('Error cargando catálogos de llegadas:', error);
        }
    },

    async saveQuickArrival() {
        try {
            const isMasterAdmin = typeof UserManager !== 'undefined' && (
                UserManager.currentUser?.role === 'master_admin' ||
                UserManager.currentUser?.is_master_admin ||
                UserManager.currentUser?.isMasterAdmin
            );
            const currentBranchId = typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : null;

            const branchId = isMasterAdmin 
                ? document.getElementById('qc-arrival-branch')?.value || currentBranchId
                : currentBranchId;
            const agencyId = document.getElementById('qc-arrival-agency')?.value;
            const passengers = parseInt(document.getElementById('qc-arrival-pax')?.value || 0);
            const units = parseInt(document.getElementById('qc-arrival-units')?.value || 0);
            const unitType = document.getElementById('qc-arrival-unit-type')?.value || null;
            const notes = document.getElementById('qc-arrival-notes')?.value?.trim() || null;

            // Validar campos requeridos
            if (!branchId || !agencyId || !passengers || passengers <= 0 || !units || units <= 0) {
                Utils.showNotification('Por favor completa todos los campos requeridos', 'error');
                return;
            }

            // Obtener nombres para mostrar
            const agencies = await DB.getAll('catalog_agencies') || [];
            const agency = agencies.find(a => a.id === agencyId);
            const agencyName = agency ? agency.name : 'Desconocida';

            const branches = await DB.getAll('catalog_branches') || [];
            const branch = branches.find(b => b.id === branchId);
            const branchName = branch ? branch.name : 'Desconocida';

            // Calcular costo de llegada
            const today = new Date().toISOString().split('T')[0];
            let arrivalFee = 0;
            let overrideRequired = false;
            let overrideAmount = null;
            let overrideReason = null;
            
            if (typeof ArrivalRules !== 'undefined' && ArrivalRules.calculateArrivalFee) {
                const calculation = await ArrivalRules.calculateArrivalFee(agencyId, branchId, passengers, unitType, today);
                
                // Priorizar usar calculatedFee si está disponible (incluso si overrideRequired es true)
                if (calculation.calculatedFee && calculation.calculatedFee > 0) {
                    // Hay una tarifa calculada válida, usarla
                    arrivalFee = calculation.calculatedFee;
                    overrideRequired = false;
                } else if (calculation.overrideRequired) {
                    // No hay tarifa calculada y requiere override, verificar si se proporcionó monto manual
                    overrideAmount = parseFloat(document.getElementById('qc-arrival-override-amount')?.value || 0);
                    overrideReason = document.getElementById('qc-arrival-override-reason')?.value?.trim() || '';
                    
                    if (!overrideAmount || overrideAmount <= 0 || !overrideReason) {
                        Utils.showNotification('Esta llegada requiere override manual. Por favor completa el monto y el motivo del override.', 'warning');
                        return;
                    }
                    
                    overrideRequired = true;
                    arrivalFee = overrideAmount;
                } else {
                    // No hay tarifa calculada pero no requiere override explícito, usar 0
                    arrivalFee = 0;
                }
            }

            // Guardar llegada usando ArrivalRules.saveArrival (única forma, evita duplicados)
            if (typeof ArrivalRules !== 'undefined' && ArrivalRules.saveArrival) {
                await ArrivalRules.saveArrival({
                    date: today,
                    branch_id: branchId,
                    agency_id: agencyId,
                    passengers: passengers,
                    units: units,
                    unit_type: unitType,
                    calculated_fee: overrideRequired ? 0 : arrivalFee,
                    arrival_fee: arrivalFee,
                    override: overrideRequired,
                    override_amount: overrideAmount,
                    override_reason: overrideReason,
                    notes: notes
                });
            } else {
                Utils.showNotification('Error: No se puede guardar la llegada. ArrivalRules no está disponible.', 'error');
                console.error('ArrivalRules.saveArrival no está disponible');
                return;
            }

            // Limpiar formulario
            document.getElementById('quick-arrivals-form')?.reset();
            const costInput = document.getElementById('qc-arrival-cost');
            if (costInput) {
                costInput.value = '';
                costInput.style.color = '';
            }
            const costHelp = document.getElementById('qc-arrival-cost-help');
            if (costHelp) {
                costHelp.textContent = 'Se calcula automáticamente';
                costHelp.style.color = 'var(--color-text-secondary)';
            }
            const overrideContainer = document.getElementById('qc-arrival-override-container');
            if (overrideContainer) {
                overrideContainer.style.display = 'none';
            }

            // Recargar llegadas y recalcular utilidades
            await this.loadQuickCaptureArrivals();
            await this.loadQuickCaptureData(); // Recargar datos para actualizar utilidades
            
            // Recalcular utilidad diaria para que se actualice en el reporte
            if (typeof ProfitCalculator !== 'undefined' && ProfitCalculator.calculateDailyProfit && branchId) {
                try {
                    await ProfitCalculator.calculateDailyProfit(today, branchId);
                } catch (error) {
                    console.warn('Error recalculando utilidad diaria:', error);
                }
            }

            Utils.showNotification('Llegada guardada correctamente', 'success');
        } catch (error) {
            console.error('Error guardando llegada rápida:', error);
            Utils.showNotification('Error al guardar la llegada: ' + error.message, 'error');
        }
    },

    async loadQuickCaptureProfits(captures) {
        try {
            const container = document.getElementById('quick-capture-profits');
            if (!container) return;

            if (!captures || captures.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: var(--spacing-md); color: var(--color-text-secondary);">
                        <i class="fas fa-inbox" style="font-size: 32px; opacity: 0.3; margin-bottom: var(--spacing-sm);"></i>
                        <p>No hay capturas para calcular utilidades</p>
                    </div>
                `;
                return;
            }

            // Usar la fecha de las capturas (todas deberían tener la misma fecha)
            const captureDate = captures[0]?.date || new Date().toISOString().split('T')[0];
            
            // 1. Obtener tipo de cambio del día (usar la fecha de las capturas)
            const exchangeRates = await DB.query('exchange_rates_daily', 'date', captureDate) || [];
            const todayRate = exchangeRates[0] || { usd_to_mxn: 20.0, cad_to_mxn: 15.0 };
            const usdRate = todayRate.usd_to_mxn || 20.0;
            const cadRate = todayRate.cad_to_mxn || 15.0;

            console.log(`💱 Tipo de cambio usado para ${captureDate}: USD=${usdRate}, CAD=${cadRate}`);

            // 2. Calcular totales de ventas por moneda
            const totals = { USD: 0, MXN: 0, CAD: 0 };
            captures.forEach(c => {
                // Si hay múltiples pagos, calcular el total desde los pagos
                let captureTotal = c.total || 0;
                if ((!captureTotal || captureTotal === 0) && c.payments && Array.isArray(c.payments) && c.payments.length > 0) {
                    captureTotal = c.payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
                }
                // Asegurar que captureTotal sea un número válido
                captureTotal = parseFloat(captureTotal) || 0;
                totals[c.currency] = (totals[c.currency] || 0) + captureTotal;
            });

            // 3. Convertir totales a MXN
            const totalSalesMXN = totals.USD * usdRate + totals.MXN + totals.CAD * cadRate;

            // 4. Calcular comisiones totales (vendedores + guías)
            // IMPORTANTE: Las comisiones deben calcularse sobre el monto en MXN
            const commissionRules = await DB.getAll('commission_rules') || [];
            // Obtener catálogos una sola vez antes del bucle
            const agencies = await DB.getAll('catalog_agencies') || [];
            const sellers = await DB.getAll('catalog_sellers') || [];
            const guides = await DB.getAll('catalog_guides') || [];
            
            let totalCommissions = 0;
            for (const capture of captures) {
                // Calcular el total de la captura (puede venir de payments si hay múltiples pagos)
                let captureTotal = capture.total || 0;
                if ((!captureTotal || captureTotal === 0) && capture.payments && Array.isArray(capture.payments) && capture.payments.length > 0) {
                    captureTotal = capture.payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
                }
                captureTotal = parseFloat(captureTotal) || 0;
                
                // Convertir el total de la captura a MXN antes de calcular comisiones
                let captureTotalMXN = captureTotal;
                if (capture.currency === 'USD') {
                    captureTotalMXN = captureTotal * usdRate;
                } else if (capture.currency === 'CAD') {
                    captureTotalMXN = captureTotal * cadRate;
                }
                
                // Si es venta de calle, aplicar reglas especiales de calle (solo para vendedores)
                if (capture.is_street && capture.seller_id && captureTotalMXN > 0 && capture.payment_method) {
                    let streetCommission = 0;
                    if (capture.payment_method === 'card') {
                        // Tarjeta: (monto - 4.5%) * 12%
                        const afterDiscount = captureTotalMXN * (1 - 0.045); // Restar 4.5%
                        streetCommission = afterDiscount * 0.12; // Multiplicar por 12%
                    } else if (capture.payment_method === 'cash') {
                        // Efectivo: monto * 14%
                        streetCommission = captureTotalMXN * 0.14;
                    }
                    totalCommissions += streetCommission;
                    console.log(`💰 Comisión de calle (${capture.payment_method === 'card' ? 'Tarjeta' : 'Efectivo'}): $${streetCommission.toFixed(2)} MXN sobre $${captureTotalMXN.toFixed(2)} MXN`);
                } else {
                    // Comisiones basadas en reglas de agencia, Sebastian o Gloria
                    const agency = agencies.find(a => a.id === capture.agency_id);
                    const seller = sellers.find(s => s.id === capture.seller_id);
                    const guide = guides.find(g => g.id === capture.guide_id);
                    
                    const agencyName = agency?.name || null;
                    const sellerName = seller?.name || null;
                    const guideName = guide?.name || null;
                    
                    // Calcular comisiones usando las nuevas reglas (retorna {sellerCommission, guideCommission})
                    const commissionsByRules = this.calculateCommissionByRules(captureTotalMXN, agencyName, sellerName, guideName);
                    
                    // COMISIÓN DEL VENDEDOR
                    if (capture.seller_id && captureTotalMXN > 0 && !capture.is_street) {
                        let sellerCommission = commissionsByRules.sellerCommission;
                        
                        // Si no hay regla especial (Sebastian), usar reglas normales
                        if (sellerCommission === 0) {
                            const sellerRule = commissionRules.find(r => 
                                r.entity_type === 'seller' && r.entity_id === capture.seller_id
                            ) || commissionRules.find(r => 
                                r.entity_type === 'seller' && r.entity_id === null
                            );
                            if (sellerRule) {
                                const discountPct = sellerRule.discount_pct || 0;
                                const multiplier = sellerRule.multiplier || 1;
                                const afterDiscount = captureTotalMXN * (1 - (discountPct / 100));
                                sellerCommission = afterDiscount * (multiplier / 100);
                            }
                        }
                        
                        if (sellerCommission > 0) {
                            totalCommissions += sellerCommission;
                            console.log(`💰 Comisión vendedor (${sellerName || 'N/A'}): $${sellerCommission.toFixed(2)} MXN`);
                        }
                    }
                    
                    // COMISIÓN DEL GUÍA
                    if (capture.guide_id && captureTotalMXN > 0) {
                        let guideCommission = commissionsByRules.guideCommission;
                        
                        // Si no hay regla especial (agencia o Gloria), usar reglas normales
                        if (guideCommission === 0) {
                            const guideRule = commissionRules.find(r => 
                                r.entity_type === 'guide' && r.entity_id === capture.guide_id
                            ) || commissionRules.find(r => 
                                r.entity_type === 'guide' && r.entity_id === null
                            );
                            if (guideRule) {
                                const discountPct = guideRule.discount_pct || 0;
                                const multiplier = guideRule.multiplier || 1;
                                const afterDiscount = captureTotalMXN * (1 - (discountPct / 100));
                                guideCommission = afterDiscount * (multiplier / 100);
                            }
                        }
                        
                        if (guideCommission > 0) {
                            totalCommissions += guideCommission;
                            console.log(`💰 Comisión guía (${guideName || 'N/A'}${agencyName ? ` - ${agencyName}` : ''}): $${guideCommission.toFixed(2)} MXN`);
                        }
                    }
                }
            }

            // 5. COGS: Usar costo de mercancía almacenado en capturas o buscar en inventario
            let totalCOGS = 0;
            for (const capture of captures) {
                // Priorizar costo almacenado manualmente
                if (capture.merchandise_cost && capture.merchandise_cost > 0) {
                    totalCOGS += capture.merchandise_cost;
                } else {
                    // Si no hay costo almacenado, intentar obtener del inventario
                    try {
                        const inventoryItems = await DB.getAll('inventory_items') || [];
                        const item = inventoryItems.find(i => 
                            i.name && capture.product && 
                            i.name.toLowerCase().includes(capture.product.toLowerCase())
                        );
                        if (item && item.cost) {
                            totalCOGS += (item.cost || 0) * (capture.quantity || 1);
                        }
                    } catch (e) {
                        console.warn('No se pudo obtener costo del inventario:', e);
                    }
                }
            }

            // 6. Costos de llegadas del día - Leer desde cost_entries (fuente autorizada)
            // IMPORTANTE: Usar la fecha de las capturas, no la fecha actual
            const captureBranchIds = [...new Set(captures.map(c => c.branch_id).filter(Boolean))];
            const branchIdForArrivals = captureBranchIds.length === 1 ? captureBranchIds[0] : null;
            const totalArrivalCostsRaw = await this.calculateArrivalCosts(captureDate, branchIdForArrivals, captureBranchIds);
            const totalArrivalCosts = typeof totalArrivalCostsRaw === 'number' ? totalArrivalCostsRaw : parseFloat(totalArrivalCostsRaw) || 0;
            console.log(`✈️ Costos de llegadas para ${captureDate}: $${totalArrivalCosts.toFixed(2)} (sucursales: ${captureBranchIds.join(', ')})`);

            // 7. Costos operativos del día (prorrateados) - Por todas las sucursales involucradas
            // IMPORTANTE: Usar la fecha de las capturas, no la fecha actual
            // SEPARAR: Variables del día vs Fijos prorrateados
            // Nota: captureBranchIds ya está definido arriba (línea 6298)
            let variableCostsDaily = 0;  // Costos variables registrados hoy
            let fixedCostsProrated = 0;  // Costos fijos prorrateados (mensuales, semanales, anuales)
            let bankCommissions = 0;
            let variableCostsDetail = []; // Detalle de costos variables
            let fixedCostsDetail = []; // Detalle de costos fijos
            try {
                const allCosts = await DB.getAll('cost_entries') || [];
                const targetDate = new Date(captureDate);
                // captureBranchIds ya está definido arriba, no redefinir
                console.log(`💰 Calculando costos operativos para ${captureDate}, sucursales: ${captureBranchIds.join(', ') || 'todas'}`);
                console.log(`   📊 Total costos en DB: ${allCosts.length}`);
                
                // CRÍTICO: Determinar si debemos incluir costos globales (sin branch_id)
                // Solo incluirlos si el usuario es master_admin y está viendo todas las sucursales
                const isMasterAdmin = typeof UserManager !== 'undefined' && (
                    UserManager.currentUser?.role === 'master_admin' ||
                    UserManager.currentUser?.is_master_admin ||
                    UserManager.currentUser?.isMasterAdmin ||
                    UserManager.currentEmployee?.role === 'master_admin'
                );
                const includeGlobalCosts = isMasterAdmin && captureBranchIds.length === 0;
                
                // Si hay branchIds específicos, procesar cada uno por separado con filtro estricto
                const branchIdsToProcess = captureBranchIds.length > 0 ? captureBranchIds : (includeGlobalCosts ? [null] : []);
                
                for (const branchId of branchIdsToProcess) {
                    // CRÍTICO: Filtro estricto por sucursal
                    // Si branchId es null (costos globales), solo incluir costos sin branch_id
                    // Si branchId tiene valor, SOLO incluir costos de esa sucursal (excluir globales)
                    const branchCosts = allCosts.filter(c => {
                        if (branchId === null) {
                            // Costos globales: solo incluir si no tienen branch_id
                            return !c.branch_id;
                        } else {
                            // Sucursal específica: SOLO incluir costos de esta sucursal (excluir sin branch_id)
                            if (!c.branch_id) {
                                return false; // EXCLUIR costos sin branch_id cuando se filtra por sucursal específica
                            }
                            return String(c.branch_id) === String(branchId);
                        }
                    });
                    console.log(`   🏢 Costos para sucursal ${branchId || 'todas'}: ${branchCosts.length}`);
                    console.log(`   📋 Costos recurrentes: ${branchCosts.filter(c => c.recurring === true).length}`);
                    
                    // DEBUG: Mostrar detalles de los primeros 5 costos para diagnosticar
                    if (branchCosts.length > 0) {
                        console.log(`   🔍 DEBUG - Detalles de costos encontrados:`);
                        branchCosts.slice(0, 5).forEach((c, idx) => {
                            console.log(`      Costo ${idx + 1}:`, {
                                id: c.id,
                                category: c.category,
                                type: c.type,
                                period_type: c.period_type,
                                recurring: c.recurring,
                                amount: c.amount,
                                date: c.date,
                                branch_id: c.branch_id
                            });
                        });
                    }

                    // A) COSTOS FIJOS PRORRATEADOS (Mensuales, Semanales, Anuales)
                    // Costos mensuales prorrateados
                    // IMPORTANTE: Para costos recurrentes mensuales, aplicar al mes objetivo completo
                    // independientemente de cuándo se creó el costo
                    // NOTA: Aceptamos costos con period_type='monthly' Y (recurring=true O type='fijo')
                    const monthlyCosts = branchCosts.filter(c => {
                        const isMonthly = c.period_type === 'monthly';
                        // Aceptar si tiene recurring=true O si tiene type='fijo' (para compatibilidad)
                        const isRecurring = c.recurring === true || c.recurring === 'true' || c.type === 'fijo';
                        const isValidCategory = c.category !== 'pago_llegadas' && c.category !== 'comisiones_bancarias';
                        return isMonthly && isRecurring && isValidCategory;
                    });
                    console.log(`   📅 Costos mensuales encontrados: ${monthlyCosts.length}`);
                    for (const cost of monthlyCosts) {
                        // Usar el mes objetivo (targetDate) para calcular días del mes, no el mes del costo
                        const daysInMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
                        const dailyAmount = (cost.amount || 0) / daysInMonth;
                        fixedCostsProrated += dailyAmount;
                        console.log(`   💰 Costo mensual: ${cost.category || 'Sin categoría'} - $${cost.amount} / ${daysInMonth} días = $${dailyAmount.toFixed(2)}/día`);
                        fixedCostsDetail.push({
                            category: cost.category || 'Sin categoría',
                            description: cost.description || cost.notes || '',
                            amount: dailyAmount,
                            period: 'Mensual prorrateado',
                            original: cost.amount || 0
                        });
                    }

                    // Costos semanales prorrateados
                    // IMPORTANTE: Para costos recurrentes semanales, aplicar si estamos en la misma semana
                    // del año objetivo
                    const weeklyCosts = branchCosts.filter(c => {
                        const costDate = new Date(c.date || c.created_at);
                        // Para costos recurrentes semanales, aplicar si están en el mismo año
                        const isWeekly = c.period_type === 'weekly';
                        const isRecurring = c.recurring === true || c.recurring === 'true' || c.type === 'fijo';
                        const isValidCategory = c.category !== 'pago_llegadas' && c.category !== 'comisiones_bancarias';
                        const isSameYear = targetDate.getFullYear() === costDate.getFullYear();
                        return isWeekly && isRecurring && isValidCategory && isSameYear;
                    });
                    console.log(`   📅 Costos semanales encontrados: ${weeklyCosts.length}`);
                    for (const cost of weeklyCosts) {
                        const dailyAmount = (cost.amount || 0) / 7;
                        fixedCostsProrated += dailyAmount;
                        console.log(`   💰 Costo semanal: ${cost.category || 'Sin categoría'} - $${cost.amount} / 7 días = $${dailyAmount.toFixed(2)}/día`);
                        fixedCostsDetail.push({
                            category: cost.category || 'Sin categoría',
                            description: cost.description || cost.notes || '',
                            amount: dailyAmount,
                            period: 'Semanal prorrateado',
                            original: cost.amount || 0
                        });
                    }

                    // Costos anuales prorrateados
                    // IMPORTANTE: Para costos recurrentes anuales, aplicar al año objetivo
                    // NOTA: El schema usa 'yearly' pero aceptamos ambos 'annual' y 'yearly'
                    const annualCosts = branchCosts.filter(c => {
                        const isAnnual = c.period_type === 'annual' || c.period_type === 'yearly';
                        const isRecurring = c.recurring === true || c.recurring === 'true' || c.type === 'fijo';
                        const isValidCategory = c.category !== 'pago_llegadas' && c.category !== 'comisiones_bancarias';
                        return isAnnual && isRecurring && isValidCategory;
                        // Removido el filtro de año porque los costos recurrentes anuales se aplican siempre
                        // que estén activos para ese año
                    });
                    console.log(`   📅 Costos anuales encontrados: ${annualCosts.length}`);
                    for (const cost of annualCosts) {
                        const daysInYear = ((targetDate.getFullYear() % 4 === 0 && targetDate.getFullYear() % 100 !== 0) || (targetDate.getFullYear() % 400 === 0)) ? 366 : 365;
                        const dailyAmount = (cost.amount || 0) / daysInYear;
                        fixedCostsProrated += dailyAmount;
                        console.log(`   💰 Costo anual: ${cost.category || 'Sin categoría'} - $${cost.amount} / ${daysInYear} días = $${dailyAmount.toFixed(2)}/día`);
                        fixedCostsDetail.push({
                            category: cost.category || 'Sin categoría',
                            description: cost.description || cost.notes || '',
                            amount: dailyAmount,
                            period: 'Anual prorrateado',
                            original: cost.amount || 0
                        });
                    }

                    // B) COSTOS VARIABLES DEL DÍA (registrados hoy)
                    const variableCosts = branchCosts.filter(c => {
                        const costDate = c.date || c.created_at;
                        const costDateStr = costDate.split('T')[0];
                        return costDateStr === captureDate &&
                               c.category !== 'pago_llegadas' &&
                               c.category !== 'comisiones_bancarias' &&
                               (c.period_type === 'one_time' || c.period_type === 'daily' || !c.period_type);
                    });
                    for (const cost of variableCosts) {
                        if (cost.category === 'comisiones_bancarias') {
                            bankCommissions += (cost.amount || 0);
                        } else {
                            const amount = cost.amount || 0;
                            variableCostsDaily += amount;
                            variableCostsDetail.push({
                                category: cost.category || 'Sin categoría',
                                description: cost.description || cost.notes || '',
                                amount: amount
                            });
                        }
                    }
                }
            } catch (e) {
                console.warn('No se pudieron obtener costos operativos:', e);
            }
            
            // 8. Gastos de caja (retiros) del día
            // Los retiros de caja también son gastos operativos que deben incluirse
            let cashExpenses = 0;
            let cashExpensesDetail = [];
            try {
                // Obtener todas las sesiones de caja del día
                const allSessions = await DB.getAll('cash_sessions') || [];
                const daySessions = allSessions.filter(s => {
                    const sessionDate = s.date || s.created_at;
                    const sessionDateStr = typeof sessionDate === 'string' ? sessionDate.split('T')[0] : new Date(sessionDate).toISOString().split('T')[0];
                    return sessionDateStr === captureDate;
                });
                
                // Obtener todos los movimientos de caja
                const allMovements = await DB.getAll('cash_movements') || [];
                
                // Obtener branches para mostrar nombres
                const branches = await DB.getAll('catalog_branches') || [];
                
                // Filtrar movimientos de retiro (withdrawal) del día y de las sesiones del día
                const sessionIds = daySessions.map(s => s.id);
                const dayWithdrawals = allMovements.filter(m => {
                    // Solo retiros (gastos)
                    if (m.type !== 'withdrawal') return false;
                    
                    // Debe pertenecer a una sesión del día
                    if (!sessionIds.includes(m.session_id)) return false;
                    
                    // Filtrar por sucursal si hay sucursales específicas
                    if (captureBranchIds.length > 0) {
                        const session = daySessions.find(s => s.id === m.session_id);
                        if (!session || !session.branch_id) return false;
                        if (!captureBranchIds.includes(session.branch_id)) return false;
                    }
                    
                    return true;
                });
                
                // Sumar retiros y agregar al detalle
                for (const withdrawal of dayWithdrawals) {
                    const amount = withdrawal.amount || 0;
                    cashExpenses += amount;
                    const session = daySessions.find(s => s.id === withdrawal.session_id);
                    const branch = session?.branch_id ? branches.find(b => b.id === session.branch_id) : null;
                    const branchName = branch?.name || 'Sin sucursal';
                    
                    cashExpensesDetail.push({
                        category: 'Gasto de Caja',
                        description: withdrawal.description || 'Retiro de caja',
                        amount: amount,
                        branch: branchName
                    });
                }
                
                if (cashExpenses > 0) {
                    console.log(`💰 Gastos de caja (retiros) para ${captureDate}: $${cashExpenses.toFixed(2)} (${dayWithdrawals.length} retiros)`);
                    // Agregar gastos de caja a los gastos variables del día
                    variableCostsDaily += cashExpenses;
                    // Agregar al detalle de costos variables
                    variableCostsDetail = variableCostsDetail.concat(cashExpensesDetail);
                }
            } catch (e) {
                console.warn('No se pudieron obtener gastos de caja:', e);
            }
            
            // Total de costos operativos (variables + fijos)
            const totalOperatingCosts = variableCostsDaily + fixedCostsProrated;
            
            // Log de verificación de cálculos
            console.log('📊 Verificación de cálculos:');
            console.log(`   Ingresos (Ventas): $${totalSalesMXN.toFixed(2)}`);
            console.log(`   COGS: $${totalCOGS.toFixed(2)}`);
            console.log(`   Comisiones: $${totalCommissions.toFixed(2)}`);
            console.log(`   Utilidad Bruta: $${(totalSalesMXN - totalCOGS - totalCommissions).toFixed(2)}`);
            console.log(`   Costos de Llegadas: $${totalArrivalCosts.toFixed(2)}`);
            console.log(`   Gastos Variables del Día: $${variableCostsDaily.toFixed(2)} (${variableCostsDetail.length} items)`);
            if (cashExpenses > 0) {
                console.log(`   └─ Gastos de Caja (retiros): $${cashExpenses.toFixed(2)} (${cashExpensesDetail.length} retiros)`);
            }
            console.log(`   Gastos Fijos Prorrateados: $${fixedCostsProrated.toFixed(2)} (${fixedCostsDetail.length} items)`);
            console.log(`   Total Costos Operativos: $${totalOperatingCosts.toFixed(2)}`);
            console.log(`   Comisiones Bancarias: $${bankCommissions.toFixed(2)}`);
            console.log(`   Total Gastos Operativos: $${(totalArrivalCosts + totalOperatingCosts + bankCommissions).toFixed(2)}`);

            // 8. Calcular utilidades
            const grossProfit = totalSalesMXN - totalCOGS - totalCommissions;
            const netProfit = grossProfit - totalArrivalCosts - totalOperatingCosts - bankCommissions;
            const grossMargin = totalSalesMXN > 0 ? (grossProfit / totalSalesMXN * 100) : 0;
            const netMargin = totalSalesMXN > 0 ? (netProfit / totalSalesMXN * 100) : 0;

            console.log(`   Utilidad Neta: $${netProfit.toFixed(2)} (${netMargin.toFixed(2)}%)`);

            // 9. Información básica del encabezado
            const branchId = captureBranchIds.length === 1 ? captureBranchIds[0] : null;
            let branchName = 'Todas las sucursales';
            if (branchId) {
                try {
                    const branch = await DB.get('catalog_branches', branchId);
                    branchName = branch?.name || 'Sucursal';
                } catch (e) {
                    console.warn('Error obteniendo nombre de sucursal:', e);
                }
            }
            const formattedDate = (typeof Utils !== 'undefined' && Utils.formatDate) 
                ? Utils.formatDate(new Date(captureDate), 'DD/MM/YYYY')
                : new Date(captureDate).toLocaleDateString('es-MX');
            const ticketCount = captures.length;
            const ticketAverage = ticketCount > 0 ? totalSalesMXN / ticketCount : 0;

            // 10. Renderizar HTML
            const profitColor = netProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
            const marginColor = netMargin >= 0 ? 'var(--color-success)' : 'var(--color-danger)';

            let html = `
                <div style="display: grid; gap: var(--spacing-md);">
                    <!-- Encabezado del Reporte -->
                    <div style="padding: var(--spacing-md); background: var(--color-bg-secondary); border-radius: var(--radius-md); border-left: 4px solid var(--color-primary);">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--spacing-sm); font-size: 11px;">
                            <div>
                                <span style="color: var(--color-text-secondary);">Sucursal:</span>
                                <div style="font-weight: 600; color: var(--color-text-primary);">${branchName}</div>
                            </div>
                            <div>
                                <span style="color: var(--color-text-secondary);">Fecha:</span>
                                <div style="font-weight: 600; color: var(--color-text-primary);">${formattedDate}</div>
                            </div>
                            <div>
                                <span style="color: var(--color-text-secondary);"># Tickets:</span>
                                <div style="font-weight: 600; color: var(--color-text-primary);">${ticketCount}</div>
                            </div>
                            <div>
                                <span style="color: var(--color-text-secondary);">Ticket Promedio:</span>
                                <div style="font-weight: 600; color: var(--color-text-primary);">$${ticketAverage.toFixed(2)}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Resumen de Ingresos -->
                    <div style="padding: var(--spacing-md); background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: var(--radius-md); color: white;">
                        <h4 style="margin: 0 0 var(--spacing-sm) 0; font-size: 12px; text-transform: uppercase; opacity: 0.9;">Ingresos del Día</h4>
                        <div style="font-size: 28px; font-weight: 700; margin-bottom: var(--spacing-xs);">$${totalSalesMXN.toFixed(2)} MXN</div>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing-sm); font-size: 11px; opacity: 0.9; margin-top: var(--spacing-sm);">
                            <div>USD: $${totals.USD.toFixed(2)} (x${usdRate.toFixed(2)})</div>
                            <div>MXN: $${totals.MXN.toFixed(2)}</div>
                            <div>CAD: $${totals.CAD.toFixed(2)} (x${cadRate.toFixed(2)})</div>
                        </div>
                    </div>

                    <!-- Gastos Brutos -->
                    <div style="padding: var(--spacing-md); background: var(--color-bg-secondary); border-radius: var(--radius-md); border-left: 4px solid var(--color-warning);">
                        <h4 style="margin: 0 0 var(--spacing-sm) 0; font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--color-text-primary);">
                            <i class="fas fa-minus-circle"></i> Gastos Brutos
                        </h4>
                        <div style="display: grid; gap: var(--spacing-xs); font-size: 12px;">
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: var(--color-text-secondary);">Costo Mercancía (COGS):</span>
                                <span style="font-weight: 600;">$${totalCOGS.toFixed(2)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: var(--color-text-secondary);">Comisiones (Vendedores + Guías):</span>
                                <span style="font-weight: 600;">$${totalCommissions.toFixed(2)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-top: var(--spacing-xs); padding-top: var(--spacing-xs); border-top: 1px solid var(--color-border-light);">
                                <span style="font-weight: 600;">Total Gastos Brutos:</span>
                                <span style="font-weight: 700; font-size: 14px;">$${(totalCOGS + totalCommissions).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Utilidad Bruta -->
                    <div style="padding: var(--spacing-md); background: var(--color-bg-secondary); border-radius: var(--radius-md); border-left: 4px solid var(--color-success);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <h4 style="margin: 0 0 var(--spacing-xs) 0; font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--color-text-primary);">
                                    <i class="fas fa-chart-line"></i> Utilidad Bruta
                                </h4>
                                <div style="font-size: 11px; color: var(--color-text-secondary);">Ventas - Gastos Brutos</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 24px; font-weight: 700; color: var(--color-success);">$${grossProfit.toFixed(2)}</div>
                                <div style="font-size: 12px; color: var(--color-text-secondary);">${grossMargin.toFixed(2)}%</div>
                            </div>
                        </div>
                    </div>

                    <!-- Gastos Operativos -->
                    <div style="padding: var(--spacing-md); background: var(--color-bg-secondary); border-radius: var(--radius-md); border-left: 4px solid var(--color-info);">
                        <h4 style="margin: 0 0 var(--spacing-sm) 0; font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--color-text-primary);">
                            <i class="fas fa-minus-circle"></i> Gastos Operativos del Día
                        </h4>
                        <div style="display: grid; gap: var(--spacing-sm); font-size: 12px;">
                            <!-- Costos de Llegadas -->
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: var(--color-text-secondary);">Costos de Llegadas:</span>
                                <span style="font-weight: 600;">$${totalArrivalCosts.toFixed(2)}</span>
                            </div>
                            
                            <!-- A) Costos Variables del Día -->
                            <div style="margin-top: var(--spacing-xs); padding-top: var(--spacing-xs); border-top: 1px solid var(--color-border-light);">
                                <div style="display: flex; justify-content: space-between; margin-bottom: var(--spacing-xs);">
                                    <span style="font-weight: 600; font-size: 11px; text-transform: uppercase; color: var(--color-text-primary);">
                                        A) Gastos Variables del Día:
                                    </span>
                                    <span style="font-weight: 600;">$${variableCostsDaily.toFixed(2)}</span>
                                </div>
                                ${variableCostsDetail.length > 0 ? `
                                    <div style="margin-left: var(--spacing-sm); font-size: 11px; color: var(--color-text-secondary);">
                                        ${variableCostsDetail.map(c => `
                                            <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                                                <span>• ${c.category}${c.description ? `: ${c.description}` : ''}</span>
                                                <span>$${(parseFloat(c.amount) || 0).toFixed(2)}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : '<div style="margin-left: var(--spacing-sm); font-size: 11px; color: var(--color-text-secondary); font-style: italic;">No hay gastos variables registrados hoy</div>'}
                            </div>

                            <!-- B) Costos Fijos Prorrateados -->
                            <div style="margin-top: var(--spacing-xs); padding-top: var(--spacing-xs); border-top: 1px solid var(--color-border-light);">
                                <div style="display: flex; justify-content: space-between; margin-bottom: var(--spacing-xs);">
                                    <span style="font-weight: 600; font-size: 11px; text-transform: uppercase; color: var(--color-text-primary);">
                                        B) Gastos Fijos Prorrateados:
                                    </span>
                                    <span style="font-weight: 600;">$${fixedCostsProrated.toFixed(2)}</span>
                                </div>
                                ${fixedCostsDetail.length > 0 ? `
                                    <div style="margin-left: var(--spacing-sm); font-size: 11px; color: var(--color-text-secondary);">
                                        ${fixedCostsDetail.map(c => `
                                            <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                                                <span>• ${c.category}${c.description ? `: ${c.description}` : ''} <small style="opacity: 0.7;">(${c.period})</small></span>
                                                <span>$${(parseFloat(c.amount) || 0).toFixed(2)}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : '<div style="margin-left: var(--spacing-sm); font-size: 11px; color: var(--color-text-secondary); font-style: italic;">No hay gastos fijos prorrateados</div>'}
                            </div>

                            <!-- Costos Operativos Totales (Variables + Fijos) -->
                            <div style="display: flex; justify-content: space-between; margin-top: var(--spacing-xs); padding-top: var(--spacing-xs); border-top: 1px solid var(--color-border-light);">
                                <span style="color: var(--color-text-secondary);">Total Costos Operativos (Variables + Fijos):</span>
                                <span style="font-weight: 600;">$${totalOperatingCosts.toFixed(2)}</span>
                            </div>

                            <!-- Comisiones Bancarias -->
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: var(--color-text-secondary);">Comisiones Bancarias:</span>
                                <span style="font-weight: 600;">$${bankCommissions.toFixed(2)}</span>
                            </div>
                            
                            <!-- Total General de Gastos Operativos -->
                            <div style="display: flex; justify-content: space-between; margin-top: var(--spacing-xs); padding-top: var(--spacing-xs); border-top: 2px solid var(--color-border-light);">
                                <span style="font-weight: 700; font-size: 13px;">Total Gastos Operativos del Día:</span>
                                <span style="font-weight: 700; font-size: 15px; color: var(--color-danger);">$${(totalArrivalCosts + totalOperatingCosts + bankCommissions).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Utilidad Neta (GANANCIA O PÉRDIDA DEL DÍA) -->
                    <div style="padding: var(--spacing-md); background: linear-gradient(135deg, ${netProfit >= 0 ? '#11998e 0%, #38ef7d 100%' : '#ee0979 0%, #ff6a00 100%'}); border-radius: var(--radius-md); color: white;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <h4 style="margin: 0 0 var(--spacing-xs) 0; font-size: 12px; text-transform: uppercase; opacity: 0.9;">
                                    <i class="fas fa-${netProfit >= 0 ? 'arrow-up' : 'arrow-down'}"></i> ${netProfit >= 0 ? 'GANANCIA' : 'PÉRDIDA'} DEL DÍA
                                </h4>
                                <div style="font-size: 11px; opacity: 0.8;">Utilidad Bruta - Gastos Operativos</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 32px; font-weight: 700;">$${Math.abs(netProfit).toFixed(2)}</div>
                                <div style="font-size: 14px; opacity: 0.9;">Margen: ${netMargin.toFixed(2)}%</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            container.innerHTML = html;
        } catch (error) {
            console.error('Error calculando utilidades:', error);
            const container = document.getElementById('quick-capture-profits');
            if (container) {
                container.innerHTML = `
                    <div style="padding: var(--spacing-sm); background: var(--color-danger); color: white; border-radius: var(--radius-sm); font-size: 12px;">
                        Error: ${error.message}
                    </div>
                `;
            }
        }
    },

    async loadQuickCaptureCommissions(captures) {
        try {
            if (!captures || captures.length === 0) {
                const container = document.getElementById('quick-capture-commissions');
                if (container) {
                    container.innerHTML = `
                        <div style="text-align: center; padding: var(--spacing-md); color: var(--color-text-secondary);">
                            <i class="fas fa-inbox" style="font-size: 32px; opacity: 0.3; margin-bottom: var(--spacing-sm);"></i>
                            <p>No hay capturas para calcular comisiones</p>
                        </div>
                    `;
                }
                return;
            }

            // Obtener reglas de comisión y catálogos
            const commissionRules = await DB.getAll('commission_rules') || [];
            const sellers = await DB.getAll('catalog_sellers') || [];
            const guides = await DB.getAll('catalog_guides') || [];
            const agencies = await DB.getAll('catalog_agencies') || [];

            // Obtener tipo de cambio del día (usar la fecha de las capturas)
            const captureDate = captures[0]?.date || new Date().toISOString().split('T')[0];
            const exchangeRates = await DB.query('exchange_rates_daily', 'date', captureDate) || [];
            const todayRate = exchangeRates[0] || { usd_to_mxn: 20.0, cad_to_mxn: 15.0 };
            const usdRate = todayRate.usd_to_mxn || 20.0;
            const cadRate = todayRate.cad_to_mxn || 15.0;

            // Calcular comisiones por vendedor y guía
            const sellerCommissions = {};
            const guideCommissions = {};

            for (const capture of captures) {
                // Convertir el total de la captura a MXN antes de calcular comisiones
                let captureTotalMXN = capture.total;
                if (capture.currency === 'USD') {
                    captureTotalMXN = capture.total * usdRate;
                } else if (capture.currency === 'CAD') {
                    captureTotalMXN = capture.total * cadRate;
                }

                // Calcular comisión del vendedor
                if (capture.seller_id && captureTotalMXN > 0) {
                    if (!sellerCommissions[capture.seller_id]) {
                        sellerCommissions[capture.seller_id] = {
                            seller: sellers.find(s => s.id === capture.seller_id),
                            total: 0,
                            sales: 0,
                            commissions: {}
                        };
                    }

                    let commission = 0;

                    // Si es venta de calle, aplicar reglas especiales de calle
                    if (capture.is_street && capture.payment_method) {
                        if (capture.payment_method === 'card') {
                            // Tarjeta: (monto - 4.5%) * 12%
                            const afterDiscount = captureTotalMXN * (1 - 0.045);
                            commission = afterDiscount * 0.12;
                        } else if (capture.payment_method === 'cash') {
                            // Efectivo: monto * 14%
                            commission = captureTotalMXN * 0.14;
                        }
                    } else {
                        // Comisiones basadas en reglas de agencia, Sebastian o Gloria
                        const agency = agencies.find(a => a.id === capture.agency_id);
                        const seller = sellers.find(s => s.id === capture.seller_id);
                        const guide = guides.find(g => g.id === capture.guide_id);
                        
                        const agencyName = agency?.name || null;
                        const sellerName = seller?.name || null;
                        const guideName = guide?.name || null;
                        
                        // Calcular comisiones usando las nuevas reglas (retorna {sellerCommission, guideCommission})
                        const commissionsByRules = this.calculateCommissionByRules(captureTotalMXN, agencyName, sellerName, guideName);
                        
                        // Usar la comisión del vendedor de las reglas
                        commission = commissionsByRules.sellerCommission;
                        
                        // Si no hay regla especial (Sebastian), usar reglas normales de vendedor
                        if (commission === 0) {
                            const sellerRule = commissionRules.find(r => 
                                r.entity_type === 'seller' && r.entity_id === capture.seller_id
                            ) || commissionRules.find(r => 
                                r.entity_type === 'seller' && r.entity_id === null
                            );

                            if (sellerRule) {
                                const discountPct = sellerRule.discount_pct || 0;
                                const multiplier = sellerRule.multiplier || 1;
                                const afterDiscount = captureTotalMXN * (1 - (discountPct / 100));
                                commission = afterDiscount * (multiplier / 100);
                            }
                        }
                    }

                    if (commission > 0) {
                        sellerCommissions[capture.seller_id].total += commission;
                        sellerCommissions[capture.seller_id].sales += 1;
                        if (!sellerCommissions[capture.seller_id].commissions[capture.currency]) {
                            sellerCommissions[capture.seller_id].commissions[capture.currency] = 0;
                        }
                        // Convertir comisión a moneda original para mostrar
                        if (capture.currency === 'USD') {
                            sellerCommissions[capture.seller_id].commissions[capture.currency] += commission / usdRate;
                        } else if (capture.currency === 'CAD') {
                            sellerCommissions[capture.seller_id].commissions[capture.currency] += commission / cadRate;
                        } else {
                            sellerCommissions[capture.seller_id].commissions[capture.currency] += commission;
                        }
                    }
                }

                // Calcular comisión del guía (siempre se calculan normalmente, no aplican reglas de calle)
                if (capture.guide_id && captureTotalMXN > 0) {
                    if (!guideCommissions[capture.guide_id]) {
                        guideCommissions[capture.guide_id] = {
                            guide: guides.find(g => g.id === capture.guide_id),
                            total: 0,
                            sales: 0,
                            commissions: {}
                        };
                    }

                    // Comisiones basadas en reglas de agencia, Sebastian o Gloria
                    const agency = agencies.find(a => a.id === capture.agency_id);
                    const seller = sellers.find(s => s.id === capture.seller_id);
                    const guide = guides.find(g => g.id === capture.guide_id);
                    
                    const agencyName = agency?.name || null;
                    const sellerName = seller?.name || null;
                    const guideName = guide?.name || null;
                    
                    // Calcular comisiones usando las nuevas reglas (retorna {sellerCommission, guideCommission})
                    const commissionsByRules = this.calculateCommissionByRules(captureTotalMXN, agencyName, sellerName, guideName);
                    
                    // Usar la comisión del guía de las reglas
                    let commission = commissionsByRules.guideCommission;
                    
                    // Si no hay regla especial (agencia o Gloria), usar reglas normales de guía
                    if (commission === 0) {
                        const guideRule = commissionRules.find(r => 
                            r.entity_type === 'guide' && r.entity_id === capture.guide_id
                        ) || commissionRules.find(r => 
                            r.entity_type === 'guide' && r.entity_id === null
                        );

                        if (guideRule) {
                            const discountPct = guideRule.discount_pct || 0;
                            const multiplier = guideRule.multiplier || 1;
                            const afterDiscount = captureTotalMXN * (1 - (discountPct / 100));
                            commission = afterDiscount * (multiplier / 100);
                        }
                    }
                    
                    if (commission > 0) {
                        guideCommissions[capture.guide_id].total += commission;
                        guideCommissions[capture.guide_id].sales += 1;
                        if (!guideCommissions[capture.guide_id].commissions[capture.currency]) {
                            guideCommissions[capture.guide_id].commissions[capture.currency] = 0;
                        }
                        // Convertir comisión a moneda original para mostrar
                        if (capture.currency === 'USD') {
                            guideCommissions[capture.guide_id].commissions[capture.currency] += commission / usdRate;
                        } else if (capture.currency === 'CAD') {
                            guideCommissions[capture.guide_id].commissions[capture.currency] += commission / cadRate;
                        } else {
                            guideCommissions[capture.guide_id].commissions[capture.currency] += commission;
                        }
                    }
                }
            }

            const container = document.getElementById('quick-capture-commissions');
            if (!container) return;

            let html = '<div style="display: grid; gap: var(--spacing-lg);">';

            // Comisiones de Vendedores
            const sellerEntries = Object.values(sellerCommissions).filter(s => s.total > 0);
            if (sellerEntries.length > 0) {
                html += `
                    <div>
                        <h4 style="font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: var(--spacing-sm); color: var(--color-primary);">
                            <i class="fas fa-user-tag"></i> Comisiones de Vendedores
                        </h4>
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                                <thead>
                                    <tr style="background: var(--color-bg-secondary); border-bottom: 2px solid var(--color-border-light);">
                                        <th style="padding: var(--spacing-xs); text-align: left;">Vendedor</th>
                                        <th style="padding: var(--spacing-xs); text-align: center;">Ventas</th>
                                        <th style="padding: var(--spacing-xs); text-align: right;">Comisión Total</th>
                                        <th style="padding: var(--spacing-xs); text-align: right;">USD</th>
                                        <th style="padding: var(--spacing-xs); text-align: right;">MXN</th>
                                        <th style="padding: var(--spacing-xs); text-align: right;">CAD</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${sellerEntries.map(s => `
                                        <tr style="border-bottom: 1px solid var(--color-border-light);">
                                            <td style="padding: var(--spacing-xs);">${s.seller?.name || 'N/A'}</td>
                                            <td style="padding: var(--spacing-xs); text-align: center;">${s.sales}</td>
                                            <td style="padding: var(--spacing-xs); text-align: right; font-weight: 600;">$${s.total.toFixed(2)}</td>
                                            <td style="padding: var(--spacing-xs); text-align: right;">${s.commissions.USD ? '$' + s.commissions.USD.toFixed(2) : '-'}</td>
                                            <td style="padding: var(--spacing-xs); text-align: right;">${s.commissions.MXN ? '$' + s.commissions.MXN.toFixed(2) : '-'}</td>
                                            <td style="padding: var(--spacing-xs); text-align: right;">${s.commissions.CAD ? '$' + s.commissions.CAD.toFixed(2) : '-'}</td>
                                        </tr>
                                    `).join('')}
                                    <tr style="background: var(--color-bg-secondary); font-weight: 600;">
                                        <td style="padding: var(--spacing-xs);">TOTAL</td>
                                        <td style="padding: var(--spacing-xs); text-align: center;">${sellerEntries.reduce((sum, s) => sum + s.sales, 0)}</td>
                                        <td style="padding: var(--spacing-xs); text-align: right;">$${sellerEntries.reduce((sum, s) => sum + s.total, 0).toFixed(2)}</td>
                                        <td style="padding: var(--spacing-xs); text-align: right;">$${sellerEntries.reduce((sum, s) => sum + (s.commissions.USD || 0), 0).toFixed(2)}</td>
                                        <td style="padding: var(--spacing-xs); text-align: right;">$${sellerEntries.reduce((sum, s) => sum + (s.commissions.MXN || 0), 0).toFixed(2)}</td>
                                        <td style="padding: var(--spacing-xs); text-align: right;">$${sellerEntries.reduce((sum, s) => sum + (s.commissions.CAD || 0), 0).toFixed(2)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }

            // Comisiones de Guías
            const guideEntries = Object.values(guideCommissions).filter(g => g.total > 0);
            if (guideEntries.length > 0) {
                html += `
                    <div>
                        <h4 style="font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: var(--spacing-sm); color: var(--color-primary);">
                            <i class="fas fa-suitcase"></i> Comisiones de Guías
                        </h4>
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                                <thead>
                                    <tr style="background: var(--color-bg-secondary); border-bottom: 2px solid var(--color-border-light);">
                                        <th style="padding: var(--spacing-xs); text-align: left;">Guía</th>
                                        <th style="padding: var(--spacing-xs); text-align: center;">Ventas</th>
                                        <th style="padding: var(--spacing-xs); text-align: right;">Comisión Total</th>
                                        <th style="padding: var(--spacing-xs); text-align: right;">USD</th>
                                        <th style="padding: var(--spacing-xs); text-align: right;">MXN</th>
                                        <th style="padding: var(--spacing-xs); text-align: right;">CAD</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${guideEntries.map(g => `
                                        <tr style="border-bottom: 1px solid var(--color-border-light);">
                                            <td style="padding: var(--spacing-xs);">${g.guide?.name || 'N/A'}</td>
                                            <td style="padding: var(--spacing-xs); text-align: center;">${g.sales}</td>
                                            <td style="padding: var(--spacing-xs); text-align: right; font-weight: 600;">$${g.total.toFixed(2)}</td>
                                            <td style="padding: var(--spacing-xs); text-align: right;">${g.commissions.USD ? '$' + g.commissions.USD.toFixed(2) : '-'}</td>
                                            <td style="padding: var(--spacing-xs); text-align: right;">${g.commissions.MXN ? '$' + g.commissions.MXN.toFixed(2) : '-'}</td>
                                            <td style="padding: var(--spacing-xs); text-align: right;">${g.commissions.CAD ? '$' + g.commissions.CAD.toFixed(2) : '-'}</td>
                                        </tr>
                                    `).join('')}
                                    <tr style="background: var(--color-bg-secondary); font-weight: 600;">
                                        <td style="padding: var(--spacing-xs);">TOTAL</td>
                                        <td style="padding: var(--spacing-xs); text-align: center;">${guideEntries.reduce((sum, g) => sum + g.sales, 0)}</td>
                                        <td style="padding: var(--spacing-xs); text-align: right;">$${guideEntries.reduce((sum, g) => sum + g.total, 0).toFixed(2)}</td>
                                        <td style="padding: var(--spacing-xs); text-align: right;">$${guideEntries.reduce((sum, g) => sum + (g.commissions.USD || 0), 0).toFixed(2)}</td>
                                        <td style="padding: var(--spacing-xs); text-align: right;">$${guideEntries.reduce((sum, g) => sum + (g.commissions.MXN || 0), 0).toFixed(2)}</td>
                                        <td style="padding: var(--spacing-xs); text-align: right;">$${guideEntries.reduce((sum, g) => sum + (g.commissions.CAD || 0), 0).toFixed(2)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }

            if (sellerEntries.length === 0 && guideEntries.length === 0) {
                html += `
                    <div style="text-align: center; padding: var(--spacing-md); color: var(--color-text-secondary);">
                        <i class="fas fa-inbox" style="font-size: 32px; opacity: 0.3; margin-bottom: var(--spacing-sm);"></i>
                        <p>No hay comisiones para calcular</p>
                    </div>
                `;
            }

            html += '</div>';
            container.innerHTML = html;
        } catch (error) {
            console.error('Error calculando comisiones:', error);
            const container = document.getElementById('quick-capture-commissions');
            if (container) {
                container.innerHTML = `
                    <div style="padding: var(--spacing-sm); background: var(--color-danger); color: white; border-radius: var(--radius-sm); font-size: 12px;">
                        Error: ${error.message}
                    </div>
                `;
            }
        }
    },

    async editQuickCaptureSale(captureId) {
        try {
            const capture = await DB.get('temp_quick_captures', captureId);
            if (!capture) {
                Utils.showNotification('Captura no encontrada', 'error');
                return;
            }

            // Crear modal de edición con overlay para centrarlo correctamente
            const modalOverlay = document.createElement('div');
            modalOverlay.className = 'modal-overlay';
            modalOverlay.id = 'edit-quick-capture-overlay';
            
            const modal = document.createElement('div');
            modal.className = 'modal modal-medium';
            modal.id = 'edit-quick-capture-modal';
            
            const sellers = await DB.getAll('catalog_sellers') || [];
            const guides = await DB.getAll('catalog_guides') || [];
            const allAgencies = await DB.getAll('catalog_agencies') || [];
            const agencies = this.filterAllowedAgencies(allAgencies);
            
            const branches = await DB.getAll('catalog_branches') || [];

            modal.innerHTML = `
                <div class="modal-content" style="max-width: 600px; width: 90%;">
                    <div class="modal-header">
                        <h3>Editar Captura Rápida</h3>
                        <button class="modal-close" onclick="document.getElementById('edit-quick-capture-overlay').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="edit-quick-capture-form" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--spacing-md);">
                            <div class="form-group" style="grid-column: 1 / -1;">
                                <label>Sucursal <span style="color: var(--color-danger);">*</span></label>
                                <select id="edit-qc-branch" class="form-select" required>
                                    ${branches.filter(b => b.active).map(b => 
                                        `<option value="${b.id}" ${b.id === capture.branch_id ? 'selected' : ''}>${b.name}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Vendedor <span style="color: var(--color-danger);">*</span></label>
                                <select id="edit-qc-seller" class="form-select" required>
                                    ${sellers.map(s => 
                                        `<option value="${s.id}" ${s.id === capture.seller_id ? 'selected' : ''}>${s.name}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Guía</label>
                                <select id="edit-qc-guide" class="form-select">
                                    <option value="">Ninguno</option>
                                    ${guides.map(g => 
                                        `<option value="${g.id}" ${g.id === capture.guide_id ? 'selected' : ''}>${g.name}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Agencia</label>
                                <select id="edit-qc-agency" class="form-select">
                                    <option value="">Ninguna</option>
                                    ${agencies.map(a => 
                                        `<option value="${a.id}" ${a.id === capture.agency_id ? 'selected' : ''}>${a.name}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Producto <span style="color: var(--color-danger);">*</span></label>
                                <input type="text" id="edit-qc-product" class="form-input" value="${capture.product || ''}" required>
                            </div>
                            <div class="form-group">
                                <label>Cantidad <span style="color: var(--color-danger);">*</span></label>
                                <input type="number" id="edit-qc-quantity" class="form-input" min="1" step="1" value="${capture.quantity || 1}" required>
                            </div>
                            <div class="form-group">
                                <label>Tipo de Moneda <span style="color: var(--color-danger);">*</span></label>
                                <select id="edit-qc-currency" class="form-select" required>
                                    <option value="USD" ${capture.currency === 'USD' ? 'selected' : ''}>USD</option>
                                    <option value="MXN" ${capture.currency === 'MXN' ? 'selected' : ''}>MXN</option>
                                    <option value="CAD" ${capture.currency === 'CAD' ? 'selected' : ''}>CAD</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Total <span style="color: var(--color-danger);">*</span></label>
                                <input type="number" id="edit-qc-total" class="form-input" min="0" step="0.01" value="${capture.total || 0}" required>
                            </div>
                            <div class="form-group">
                                <label>Costo de Mercancía (MXN)</label>
                                <input type="number" id="edit-qc-cost" class="form-input" min="0" step="0.01" value="${capture.merchandise_cost || 0}">
                            </div>
                            <div class="form-group">
                                <label>Notas</label>
                                <input type="text" id="edit-qc-notes" class="form-input" value="${capture.notes || ''}" placeholder="Notas adicionales (opcional)">
                            </div>
                            <div class="form-group">
                                <label style="display: flex; align-items: center; gap: var(--spacing-xs);">
                                    <input type="checkbox" id="edit-qc-is-street" style="width: auto; margin: 0;" ${capture.is_street ? 'checked' : ''}>
                                    <span>Es venta de calle</span>
                                </label>
                            </div>
                            <div class="form-group" id="edit-qc-payment-method-group" style="${capture.is_street ? '' : 'display: none;'}">
                                <label>Método de Pago (Calle) <span style="color: var(--color-danger);">*</span></label>
                                <select id="edit-qc-payment-method" class="form-select">
                                    <option value="">Seleccionar...</option>
                                    <option value="card" ${capture.payment_method === 'card' ? 'selected' : ''}>Tarjeta</option>
                                    <option value="cash" ${capture.payment_method === 'cash' ? 'selected' : ''}>Efectivo</option>
                                </select>
                            </div>
                            <div class="form-group" style="grid-column: 1 / -1; display: flex; gap: var(--spacing-sm);">
                                <button type="submit" class="btn-primary" style="flex: 1;">
                                    <i class="fas fa-save"></i> Guardar Cambios
                                </button>
                                <button type="button" class="btn-secondary" onclick="document.getElementById('edit-quick-capture-overlay').remove()" style="flex: 1;">
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;

            modalOverlay.appendChild(modal);
            document.body.appendChild(modalOverlay);

            // Cargar guías filtradas si hay una agencia seleccionada
            if (capture.agency_id) {
                setTimeout(async () => {
                    await this.loadGuidesForAgencyInEdit(capture.agency_id, capture.guide_id);
                }, 100);
            }

            // Event listener para mostrar/ocultar campo de método de pago
            const editIsStreetCheckbox = document.getElementById('edit-qc-is-street');
            const editPaymentMethodGroup = document.getElementById('edit-qc-payment-method-group');
            const editPaymentMethodSelect = document.getElementById('edit-qc-payment-method');
            if (editIsStreetCheckbox && editPaymentMethodGroup && editPaymentMethodSelect) {
                editIsStreetCheckbox.addEventListener('change', () => {
                    if (editIsStreetCheckbox.checked) {
                        editPaymentMethodGroup.style.display = 'block';
                        editPaymentMethodSelect.required = true;
                    } else {
                        editPaymentMethodGroup.style.display = 'none';
                        editPaymentMethodSelect.required = false;
                        editPaymentMethodSelect.value = '';
                    }
                });
            }

            // Event listener para filtrar guías cuando cambia la agencia
            const editAgencySelect = document.getElementById('edit-qc-agency');
            if (editAgencySelect) {
                editAgencySelect.addEventListener('change', async () => {
                    await this.loadGuidesForAgencyInEdit(editAgencySelect.value, capture.guide_id);
                });
            }

            // Event listener del formulario
            const form = document.getElementById('edit-quick-capture-form');
            const self = this; // Guardar referencia al objeto Reports
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                try {
                    const branchId = document.getElementById('edit-qc-branch').value;
                    const sellerId = document.getElementById('edit-qc-seller').value;
                    const guideId = document.getElementById('edit-qc-guide').value || null;
                    const agencyId = document.getElementById('edit-qc-agency').value || null;
                    const product = document.getElementById('edit-qc-product').value.trim();
                    const quantity = parseInt(document.getElementById('edit-qc-quantity').value) || 1;
                    const currency = document.getElementById('edit-qc-currency').value;
                    const total = parseFloat(document.getElementById('edit-qc-total').value) || 0;
                    const merchandiseCost = parseFloat(document.getElementById('edit-qc-cost').value) || 0;
                    const isStreet = document.getElementById('edit-qc-is-street')?.checked || false;
                    const paymentMethod = document.getElementById('edit-qc-payment-method')?.value || null;

                    // Validar campos
                    if (!branchId || !sellerId || !product || !currency || total <= 0) {
                        Utils.showNotification('Por favor completa todos los campos requeridos', 'error');
                        return;
                    }

                    // Si es venta de calle, validar que se haya seleccionado método de pago
                    if (isStreet && !paymentMethod) {
                        Utils.showNotification('Si es venta de calle, debes seleccionar el método de pago', 'error');
                        return;
                    }

                    // Obtener nombres para mostrar
                    const seller = sellers.find(s => s.id === sellerId);
                    const sellerName = seller ? seller.name : 'Desconocido';
                    let guideName = null;
                    if (guideId) {
                        const guide = guides.find(g => g.id === guideId);
                        guideName = guide ? guide.name : null;
                    }
                    let agencyName = null;
                    if (agencyId) {
                        const agency = agencies.find(a => a.id === agencyId);
                        agencyName = agency ? agency.name : null;
                    }
                    const branch = branches.find(b => b.id === branchId);
                    const branchName = branch ? branch.name : 'Desconocida';

                    // Actualizar captura
                    capture.branch_id = branchId;
                    capture.branch_name = branchName;
                    capture.seller_id = sellerId;
                    capture.seller_name = sellerName;
                    capture.guide_id = guideId;
                    capture.guide_name = guideName;
                    capture.agency_id = agencyId;
                    capture.agency_name = agencyName;
                    capture.product = product;
                    capture.quantity = quantity;
                    capture.currency = currency;
                    capture.total = parseFloat(total) || 0;
                    capture.merchandise_cost = parseFloat(merchandiseCost) || 0;
                    capture.notes = notes;
                    capture.is_street = isStreet;
                    capture.payment_method = paymentMethod;
                    capture.updated_at = new Date().toISOString();

                    await DB.put('temp_quick_captures', capture);

                    modalOverlay.remove();
                    Utils.showNotification('Captura actualizada correctamente', 'success');
                    await self.loadQuickCaptureData();
                } catch (error) {
                    console.error('Error actualizando captura:', error);
                    Utils.showNotification('Error al actualizar la captura: ' + error.message, 'error');
                }
            });
        } catch (error) {
            console.error('Error abriendo edición:', error);
            Utils.showNotification('Error al abrir edición: ' + error.message, 'error');
        }
    },

    async deleteQuickCaptureSale(captureId) {
        const confirm = await Utils.confirm('¿Eliminar esta captura?', 'Eliminar Captura');
        if (!confirm) return;

        try {
            await DB.delete('temp_quick_captures', captureId);
            Utils.showNotification('Captura eliminada', 'success');
            await this.loadQuickCaptureData();
        } catch (error) {
            console.error('Error eliminando captura:', error);
            Utils.showNotification('Error al eliminar la captura: ' + error.message, 'error');
        }
    },

    async exportQuickCapture() {
        // Prevenir múltiples ejecuciones simultáneas
        if (this.isExporting) {
            console.warn('Exportación ya en progreso, ignorando llamada duplicada');
            return;
        }
        
        this.isExporting = true;
        try {
            const today = new Date().toISOString().split('T')[0];
            let captures = await DB.getAll('temp_quick_captures') || [];
            captures = captures.filter(c => c.date === today);

            if (captures.length === 0) {
                Utils.showNotification('No hay capturas para exportar', 'warning');
                this.isExporting = false;
                return;
            }

            // Calcular totales
            const totals = { USD: 0, MXN: 0, CAD: 0 };
            captures.forEach(c => {
                totals[c.currency] = (totals[c.currency] || 0) + c.total;
            });

            // Crear CSV
            let csv = 'Fecha,Hora,Sucursal,Vendedor,Guía,Agencia,Producto,Cantidad,Moneda,Total\n';
            captures.forEach(c => {
                const time = new Date(c.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                csv += `${c.date},${time},"${c.branch_name || ''}","${c.seller_name || ''}","${c.guide_name || ''}","${c.agency_name || ''}","${c.product}",${c.quantity},${c.currency},${c.total.toFixed(2)}\n`;
            });

            csv += `\n,,RESUMEN\n`;
            csv += `Total Capturas,${captures.length}\n`;
            csv += `Total USD,${totals.USD.toFixed(2)}\n`;
            csv += `Total MXN,${totals.MXN.toFixed(2)}\n`;
            csv += `Total CAD,${totals.CAD.toFixed(2)}\n`;

            // Descargar
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `Captura_Rapida_${today}_${Date.now()}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            Utils.showNotification('Capturas exportadas correctamente', 'success');
        } catch (error) {
            console.error('Error exportando capturas:', error);
            Utils.showNotification('Error al exportar: ' + error.message, 'error');
        } finally {
            // Siempre resetear el flag, incluso si hay error
            this.isExporting = false;
        }
    },

    async archiveQuickCaptureReport() {
        try {
            const today = new Date().toISOString().split('T')[0];
            let captures = await DB.getAll('temp_quick_captures') || [];
            captures = captures.filter(c => c.date === today);

            if (captures.length === 0) {
                Utils.showNotification('No hay capturas para archivar', 'warning');
                return;
            }

            // Calcular todos los datos del reporte
            const exchangeRates = await DB.query('exchange_rates_daily', 'date', today) || [];
            const todayRate = exchangeRates[0] || { usd_to_mxn: 20.0, cad_to_mxn: 15.0 };
            const usdRate = todayRate.usd_to_mxn || 20.0;
            const cadRate = todayRate.cad_to_mxn || 15.0;

            const totals = { USD: 0, MXN: 0, CAD: 0 };
            let totalQuantity = 0;
            let totalCOGS = 0;

            captures.forEach(c => {
                totals[c.currency] = (totals[c.currency] || 0) + c.total;
                totalQuantity += c.quantity || 1;
                totalCOGS += c.merchandise_cost || 0;
            });

            const totalSalesMXN = totals.USD * usdRate + totals.MXN + totals.CAD * cadRate;

            // Calcular comisiones
            const commissionRules = await DB.getAll('commission_rules') || [];
            let totalCommissions = 0;
            for (const capture of captures) {
                if (capture.seller_id && capture.total > 0) {
                    const sellerRule = commissionRules.find(r => 
                        r.entity_type === 'seller' && r.entity_id === capture.seller_id
                    ) || commissionRules.find(r => r.entity_type === 'seller' && r.entity_id === null);
                    if (sellerRule) {
                        const discountPct = sellerRule.discount_pct || 0;
                        const multiplier = sellerRule.multiplier || 1;
                        const afterDiscount = capture.total * (1 - (discountPct / 100));
                        totalCommissions += afterDiscount * (multiplier / 100);
                    }
                }
                if (capture.guide_id && capture.total > 0) {
                    const guideRule = commissionRules.find(r => 
                        r.entity_type === 'guide' && r.entity_id === capture.guide_id
                    ) || commissionRules.find(r => r.entity_type === 'guide' && r.entity_id === null);
                    if (guideRule) {
                        const discountPct = guideRule.discount_pct || 0;
                        const multiplier = guideRule.multiplier || 1;
                        const afterDiscount = capture.total * (1 - (discountPct / 100));
                        totalCommissions += afterDiscount * (multiplier / 100);
                    }
                }
            }

            // Obtener costos de llegadas desde cost_entries (fuente autorizada)
            const captureBranchIds = [...new Set(captures.map(c => c.branch_id).filter(Boolean))];
            const branchIdForArrivals = captureBranchIds.length === 1 ? captureBranchIds[0] : null;
            const totalArrivalCosts = await this.calculateArrivalCosts(today, branchIdForArrivals, captureBranchIds);
            
            // Obtener llegadas para mostrar en el reporte (solo para referencia)
            const arrivals = await DB.getAll('agency_arrivals') || [];
            const todayArrivals = arrivals.filter(a => a.date === today);
            const filteredArrivals = todayArrivals.filter(a => 
                captureBranchIds.length === 0 || !a.branch_id || captureBranchIds.includes(a.branch_id)
            );

            // Calcular costos operativos (usar la misma lógica que loadQuickCaptureProfits)
            let totalOperatingCosts = 0;
            let bankCommissions = 0;
            try {
                const allCosts = await DB.getAll('cost_entries') || [];
                const targetDate = new Date(today);
                const branchIdsToProcess = captureBranchIds.length > 0 ? captureBranchIds : [null];
                
                for (const branchId of branchIdsToProcess) {
                    const branchCosts = allCosts.filter(c => 
                        branchId === null ? (!c.branch_id || captureBranchIds.includes(c.branch_id)) : 
                        (c.branch_id === branchId || !c.branch_id)
                    );

                    // Mensuales
                    const monthlyCosts = branchCosts.filter(c => {
                        const costDate = new Date(c.date || c.created_at);
                        return c.period_type === 'monthly' && c.recurring === true &&
                               costDate.getMonth() === targetDate.getMonth() &&
                               costDate.getFullYear() === targetDate.getFullYear();
                    });
                    for (const cost of monthlyCosts) {
                        const costDate = new Date(cost.date || cost.created_at);
                        const daysInMonth = new Date(costDate.getFullYear(), costDate.getMonth() + 1, 0).getDate();
                        totalOperatingCosts += (cost.amount || 0) / daysInMonth;
                    }

                    // Semanales
                    const weeklyCosts = branchCosts.filter(c => {
                        const costDate = new Date(c.date || c.created_at);
                        const targetWeek = this.getWeekNumber(targetDate);
                        const costWeek = this.getWeekNumber(costDate);
                        return c.period_type === 'weekly' && c.recurring === true &&
                               targetWeek === costWeek &&
                               targetDate.getFullYear() === costDate.getFullYear();
                    });
                    for (const cost of weeklyCosts) {
                        totalOperatingCosts += (cost.amount || 0) / 7;
                    }

                    // Anuales
                    const annualCosts = branchCosts.filter(c => {
                        const costDate = new Date(c.date || c.created_at);
                        return c.period_type === 'annual' && c.recurring === true &&
                               costDate.getFullYear() === targetDate.getFullYear();
                    });
                    for (const cost of annualCosts) {
                        const daysInYear = ((targetDate.getFullYear() % 4 === 0 && targetDate.getFullYear() % 100 !== 0) || (targetDate.getFullYear() % 400 === 0)) ? 366 : 365;
                        totalOperatingCosts += (cost.amount || 0) / daysInYear;
                    }

                    // Variables/diarios
                    const variableCosts = branchCosts.filter(c => {
                        const costDate = c.date || c.created_at;
                        const costDateStr = costDate.split('T')[0];
                        return costDateStr === today &&
                               (c.period_type === 'one_time' || c.period_type === 'daily' || !c.period_type);
                    });
                    for (const cost of variableCosts) {
                        if (cost.category === 'comisiones_bancarias') {
                            bankCommissions += (cost.amount || 0);
                        } else {
                            totalOperatingCosts += (cost.amount || 0);
                        }
                    }
                }
            } catch (e) {
                console.warn('Error calculando costos operativos:', e);
            }

            const grossProfit = totalSalesMXN - totalCOGS - totalCommissions;
            const netProfit = grossProfit - totalArrivalCosts - totalOperatingCosts - bankCommissions;

            // Crear objeto de reporte archivado
            const archivedReport = {
                id: 'archived_' + today + '_' + Date.now(),
                date: today,
                report_type: 'quick_capture',
                captures: captures,
                totals: totals,
                total_quantity: totalQuantity,
                total_sales_mxn: totalSalesMXN,
                total_cogs: totalCOGS,
                total_commissions: totalCommissions,
                total_arrival_costs: totalArrivalCosts,
                total_operating_costs: totalOperatingCosts,
                bank_commissions: bankCommissions,
                gross_profit: grossProfit,
                net_profit: netProfit,
                exchange_rates: { usd: usdRate, cad: cadRate },
                arrivals: filteredArrivals,
                archived_at: new Date().toISOString(),
                archived_by: typeof UserManager !== 'undefined' && UserManager.currentUser ? UserManager.currentUser.id : null
            };

            // Guardar en IndexedDB (store permanente para historial)
            await DB.put('archived_quick_captures', archivedReport);

            // Opcional: Intentar guardar en backend si hay API disponible
            if (typeof API !== 'undefined' && API.saveArchivedReport) {
                try {
                    await API.saveArchivedReport(archivedReport);
                } catch (e) {
                    console.warn('No se pudo guardar en backend, solo guardado local:', e);
                }
            }

            // Crear modal de confirmación personalizado (bien posicionado)
            const confirmModal = document.createElement('div');
            confirmModal.className = 'modal-overlay';
            confirmModal.id = 'archive-confirm-modal';
            confirmModal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';
            
            confirmModal.innerHTML = `
                <div class="modal-content" style="max-width: 500px; width: 90%; background: white; border-radius: var(--radius-md); padding: 0; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                    <div class="modal-header" style="padding: var(--spacing-md); border-bottom: 1px solid var(--color-border-light);">
                        <h3 style="margin: 0; font-size: 16px; font-weight: 600;">Archivar Reporte</h3>
                    </div>
                    <div class="modal-body" style="padding: var(--spacing-md);">
                        <p style="margin: 0 0 var(--spacing-md) 0; font-size: 14px; line-height: 1.5;">
                            Se guardaron <strong>${captures.length}</strong> capturas en el historial.
                        </p>
                        <p style="margin: 0; font-size: 14px; line-height: 1.5; color: var(--color-text-secondary);">
                            ¿Deseas limpiar las capturas temporales del día después de archivar?
                        </p>
                    </div>
                    <div class="modal-footer" style="padding: var(--spacing-md); border-top: 1px solid var(--color-border-light); display: flex; gap: var(--spacing-sm); justify-content: flex-end;">
                        <button class="btn-secondary" id="archive-cancel-btn" style="min-width: 100px;">Cancelar</button>
                        <button class="btn-primary" id="archive-confirm-btn" style="min-width: 100px;">Limpiar y Archivar</button>
                        <button class="btn-secondary" id="archive-keep-btn" style="min-width: 100px;">Archivar sin Limpiar</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(confirmModal);
            
            // Manejar eventos
            return new Promise((resolve) => {
                document.getElementById('archive-confirm-btn').onclick = async () => {
                    confirmModal.remove();
                    for (const capture of captures) {
                        await DB.delete('temp_quick_captures', capture.id);
                    }
                    Utils.showNotification(`Reporte archivado correctamente. ${captures.length} capturas eliminadas del día.`, 'success');
                    await this.loadQuickCaptureData();
                    resolve();
                };
                
                document.getElementById('archive-keep-btn').onclick = async () => {
                    confirmModal.remove();
                    Utils.showNotification('Reporte archivado correctamente. Las capturas temporales se mantienen.', 'success');
                    resolve();
                };
                
                document.getElementById('archive-cancel-btn').onclick = () => {
                    confirmModal.remove();
                    resolve();
                };
            });
        } catch (error) {
            console.error('Error archivando reporte:', error);
            Utils.showNotification('Error al archivar el reporte: ' + error.message, 'error');
        }
    },

    async clearQuickCapture() {
        const confirm = await Utils.confirm(
            '¿Eliminar TODAS las capturas del día? Esta acción no se puede deshacer.',
            'Limpiar Todas las Capturas'
        );
        if (!confirm) return;

        try {
            const today = new Date().toISOString().split('T')[0];
            let captures = await DB.getAll('temp_quick_captures') || [];
            captures = captures.filter(c => c.date === today);

            for (const capture of captures) {
                await DB.delete('temp_quick_captures', capture.id);
            }

            Utils.showNotification(`${captures.length} capturas eliminadas`, 'success');
            await this.loadQuickCaptureData();
        } catch (error) {
            console.error('Error limpiando capturas:', error);
            Utils.showNotification('Error al limpiar: ' + error.message, 'error');
        }
    },

    async exportQuickCapturePDF() {
        // Prevenir múltiples ejecuciones simultáneas
        if (this.isExporting) {
            console.warn('Exportación ya en progreso, ignorando llamada duplicada');
            return;
        }
        
        // Mostrar modal para seleccionar fecha del reporte
        const selectedDate = await this.showDateSelectorModal();
        if (!selectedDate) {
            // Usuario canceló
            return;
        }
        
        this.isExporting = true;
        try {
            const jspdfLib = Utils.checkJsPDF();
            if (!jspdfLib) {
                Utils.showNotification('jsPDF no está disponible. Exportando como CSV...', 'warning');
                await this.exportQuickCapture();
                this.isExporting = false;
                return;
            }

            const { jsPDF } = jspdfLib;
            
            // Obtener datos - Usar la fecha seleccionada o la fecha de las capturas
            let captures = await DB.getAll('temp_quick_captures') || [];
            
            // Determinar la fecha del reporte:
            // 1. Si todas las capturas son de un reporte restaurado, usar la fecha del reporte original
            // 2. Si hay capturas restauradas con la misma fecha original, usar esa fecha
            // 3. Si no, usar la fecha más común entre las capturas
            // 4. Si no hay capturas, usar la fecha actual
            let captureDate = new Date().toISOString().split('T')[0];
            
            if (captures.length > 0) {
                // Verificar si todas las capturas son de un reporte restaurado con la misma fecha original
                const restoredCaptures = captures.filter(c => c.restored_from && c.original_report_date);
                if (restoredCaptures.length === captures.length) {
                    // Todas son restauradas, usar la fecha original del reporte (debería ser la misma para todas)
                    const originalDates = [...new Set(restoredCaptures.map(c => c.original_report_date || c.date))];
                    if (originalDates.length === 1) {
                        captureDate = originalDates[0];
                    } else {
                        // Si hay diferentes fechas, usar la más común
                        const dateCounts = {};
                        restoredCaptures.forEach(c => {
                            const date = c.original_report_date || c.date;
                            dateCounts[date] = (dateCounts[date] || 0) + 1;
                        });
                        captureDate = Object.keys(dateCounts).reduce((a, b) => dateCounts[a] > dateCounts[b] ? a : b);
                    }
                } else {
                    // Hay capturas mixtas, usar la fecha más común
                    const dateCounts = {};
                    captures.forEach(c => {
                        const date = c.original_report_date || c.date;
                        dateCounts[date] = (dateCounts[date] || 0) + 1;
                    });
                    captureDate = Object.keys(dateCounts).reduce((a, b) => dateCounts[a] > dateCounts[b] ? a : b);
                }
                
                // Filtrar capturas que coincidan con la fecha determinada
                captures = captures.filter(c => {
                    const captureDateValue = c.original_report_date || c.date;
                    return captureDateValue === captureDate;
                });
            }
            
            if (captures.length === 0) {
                Utils.showNotification('No hay capturas para exportar', 'warning');
                return;
            }

            // Obtener llegadas
            // IMPORTANTE: Usar la fecha de las capturas, no la fecha actual
            const arrivals = await DB.getAll('agency_arrivals') || [];
            const todayArrivals = arrivals.filter(a => a.date === captureDate);
            
            // Calcular comisiones
            const commissionRules = await DB.getAll('commission_rules') || [];
            const sellers = await DB.getAll('catalog_sellers') || [];
            const guides = await DB.getAll('catalog_guides') || [];
            const agencies = await DB.getAll('catalog_agencies') || [];
            const branches = await DB.getAll('catalog_branches') || [];

            // Crear PDF
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 15;
            let y = margin;

            // ========== HEADER ==========
            doc.setFillColor(52, 73, 94);
            doc.rect(0, 0, pageWidth, 35, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text('OPAL & CO', margin, 15);
            
            doc.setFontSize(14);
            doc.setFont('helvetica', 'normal');
            doc.text('Reporte de Captura Rápida', margin, 22);
            
            doc.setFontSize(10);
            doc.setTextColor(220, 220, 220);
            const dateStr = typeof Utils !== 'undefined' && Utils.formatDate 
                ? Utils.formatDate(new Date(), 'DD/MM/YYYY HH:mm')
                : new Date().toLocaleString('es-MX');
            doc.text(dateStr, pageWidth - margin, 15, { align: 'right' });
            // Formatear la fecha del reporte para que sea más legible
            const reportDate = new Date(captureDate + 'T00:00:00');
            const formattedDate = reportDate.toLocaleDateString('es-MX', { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit' 
            });
            doc.text(`Fecha del Reporte: ${formattedDate}`, pageWidth - margin, 22, { align: 'right' });

            y = 45;

            // ========== RESUMEN ==========
            const totals = { USD: 0, MXN: 0, CAD: 0 };
            let totalQuantity = 0;
            captures.forEach(c => {
                totals[c.currency] = (totals[c.currency] || 0) + c.total;
                totalQuantity += c.quantity || 1;
            });

            // Obtener información de sucursal(es)
            const captureBranchIdsForSummary = [...new Set(captures.map(c => c.branch_id).filter(Boolean))];
            const branchNames = captureBranchIdsForSummary.map(bid => {
                const branch = branches.find(b => b.id === bid);
                return branch ? branch.name : 'N/A';
            }).join(', ');

            doc.setFillColor(240, 248, 255);
            doc.rect(margin, y, pageWidth - (margin * 2), 30, 'F');
            doc.setDrawColor(200, 200, 200);
            doc.rect(margin, y, pageWidth - (margin * 2), 30);

            doc.setTextColor(0, 0, 0);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('RESUMEN DEL DÍA', margin + 5, y + 8);

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`Sucursal(es): ${branchNames || 'Todas'}`, margin + 5, y + 15);
            doc.text(`Fecha: ${captureDate}`, pageWidth - margin - 5, y + 15, { align: 'right' });

            doc.setFontSize(10);
            doc.text(`Total Capturas: ${captures.length}`, margin + 5, y + 22);
            doc.text(`Total Cantidad: ${totalQuantity}`, margin + 60, y + 22);
            doc.text(`Total USD: $${totals.USD.toFixed(2)}`, margin + 5, y + 28);
            doc.text(`Total MXN: $${totals.MXN.toFixed(2)}`, margin + 60, y + 28);
            doc.text(`Total CAD: $${totals.CAD.toFixed(2)}`, margin + 115, y + 28);

            y += 38;

            // ========== LLEGADAS DEL DÍA ==========
            if (todayArrivals.length > 0) {
                const arrivalsByAgency = {};
                todayArrivals.forEach(arrival => {
                    const agencyId = arrival.agency_id;
                    if (!arrivalsByAgency[agencyId]) {
                        arrivalsByAgency[agencyId] = {
                            agency: agencies.find(a => a.id === agencyId),
                            totalPassengers: 0,
                            arrivals: []
                        };
                    }
                    arrivalsByAgency[agencyId].arrivals.push(arrival);
                    arrivalsByAgency[agencyId].totalPassengers += arrival.passengers || 0;
                });

                // Verificar si hay espacio
                if (y + 40 > pageHeight - 30) {
                    doc.addPage();
                    y = margin;
                }

                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('LLEGADAS DEL DÍA', margin, y);
                y += 8;

                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                Object.values(arrivalsByAgency).forEach(group => {
                    if (y + 10 > pageHeight - 30) {
                        doc.addPage();
                        y = margin;
                    }
                    doc.setFont('helvetica', 'bold');
                    doc.text(`${group.agency?.name || 'Agencia Desconocida'}: ${group.totalPassengers} pasajeros`, margin + 5, y);
                    y += 6;
                    
                    doc.setFont('helvetica', 'normal');
                    group.arrivals.forEach(arrival => {
                        if (y + 6 > pageHeight - 30) {
                            doc.addPage();
                            y = margin;
                        }
                        const branch = branches.find(b => b.id === arrival.branch_id);
                        doc.text(`  • ${branch?.name || 'N/A'}: ${arrival.passengers || 0} pasajeros${arrival.time ? ` (${arrival.time})` : ''}`, margin + 10, y);
                        y += 6;
                    });
                    y += 3;
                });
                y += 5;
            }

            // ========== TABLA DE CAPTURAS ==========
            if (y + 30 > pageHeight - 30) {
                doc.addPage();
                y = margin;
            }

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('CAPTURAS REALIZADAS', margin, y);
            y += 8;

            // Definir anchos de columnas para la tabla de capturas (mejor organizadas)
            // IMPORTANTE: Definir ANTES de usar para evitar errores de inicialización
            const captCol1X = margin + 2;      // Hora (10mm)
            const captCol2X = margin + 15;     // Sucursal (18mm)
            const captCol3X = margin + 35;     // Vendedor (18mm)
            const captCol4X = margin + 55;     // Guía (15mm)
            const captCol5X = margin + 72;     // Producto (20mm)
            const captCol6X = margin + 94;     // Notas (25mm)
            const captCol7X = pageWidth - margin - 50; // Cantidad (12mm)
            const captCol8X = pageWidth - margin - 35; // Moneda (8mm)
            const captCol9X = pageWidth - margin - 2;  // Total (alineado derecha)

            // Encabezados de tabla (mejor organizados)
            doc.setFillColor(245, 245, 245);
            doc.rect(margin, y, pageWidth - (margin * 2), 8, 'F');
            doc.setDrawColor(200, 200, 200);
            doc.rect(margin, y, pageWidth - (margin * 2), 8);
            
            // Líneas verticales para separar columnas (opcional, para mejor organización)
            doc.setDrawColor(180, 180, 180);
            doc.line(captCol2X - 2, y, captCol2X - 2, y + 8);
            doc.line(captCol3X - 2, y, captCol3X - 2, y + 8);
            doc.line(captCol4X - 2, y, captCol4X - 2, y + 8);
            doc.line(captCol5X - 2, y, captCol5X - 2, y + 8);
            doc.line(captCol6X - 2, y, captCol6X - 2, y + 8);
            doc.line(captCol7X - 2, y, captCol7X - 2, y + 8);
            doc.line(captCol8X - 2, y, captCol8X - 2, y + 8);

            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.text('Hora', captCol1X, y + 5.5);
            doc.text('Sucursal', captCol2X, y + 5.5);
            doc.text('Vendedor', captCol3X, y + 5.5);
            doc.text('Guía', captCol4X, y + 5.5);
            doc.text('Producto', captCol5X, y + 5.5);
            doc.text('Notas', captCol6X, y + 5.5);
            doc.text('Cant.', captCol7X, y + 5.5, { align: 'right' });
            doc.text('Mon.', captCol8X, y + 5.5, { align: 'center' });
            doc.text('Total', captCol9X, y + 5.5, { align: 'right' });

            y += 8;

            // Filas de capturas
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            captures.forEach((c, index) => {
                if (y + 7 > pageHeight - 30) {
                    doc.addPage();
                    y = margin;
                    // Re-dibujar encabezados
                    doc.setFillColor(245, 245, 245);
                    doc.rect(margin, y, pageWidth - (margin * 2), 8, 'F');
                    doc.setDrawColor(200, 200, 200);
                    doc.rect(margin, y, pageWidth - (margin * 2), 8);
                    
                    // Líneas verticales
                    doc.setDrawColor(180, 180, 180);
                    doc.line(captCol2X - 2, y, captCol2X - 2, y + 8);
                    doc.line(captCol3X - 2, y, captCol3X - 2, y + 8);
                    doc.line(captCol4X - 2, y, captCol4X - 2, y + 8);
                    doc.line(captCol5X - 2, y, captCol5X - 2, y + 8);
                    doc.line(captCol6X - 2, y, captCol6X - 2, y + 8);
                    doc.line(captCol7X - 2, y, captCol7X - 2, y + 8);
                    doc.line(captCol8X - 2, y, captCol8X - 2, y + 8);
                    
                    doc.setFontSize(7);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Hora', captCol1X, y + 5.5);
                    doc.text('Sucursal', captCol2X, y + 5.5);
                    doc.text('Vendedor', captCol3X, y + 5.5);
                    doc.text('Guía', captCol4X, y + 5.5);
                    doc.text('Producto', captCol5X, y + 5.5);
                    doc.text('Notas', captCol6X, y + 5.5);
                    doc.text('Cant.', captCol7X, y + 5.5, { align: 'right' });
                    doc.text('Mon.', captCol8X, y + 5.5, { align: 'center' });
                    doc.text('Total', captCol9X, y + 5.5, { align: 'right' });
                    y += 8;
                }

                const time = new Date(c.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                
                doc.setDrawColor(220, 220, 220);
                doc.rect(margin, y, pageWidth - (margin * 2), 7);
                
                // Líneas verticales para filas (opcional, para mejor organización)
                doc.setDrawColor(200, 200, 200);
                doc.line(captCol2X - 2, y, captCol2X - 2, y + 7);
                doc.line(captCol3X - 2, y, captCol3X - 2, y + 7);
                doc.line(captCol4X - 2, y, captCol4X - 2, y + 7);
                doc.line(captCol5X - 2, y, captCol5X - 2, y + 7);
                doc.line(captCol6X - 2, y, captCol6X - 2, y + 7);
                doc.line(captCol7X - 2, y, captCol7X - 2, y + 7);
                doc.line(captCol8X - 2, y, captCol8X - 2, y + 7);
                
                doc.setFontSize(7);
                doc.setFont('helvetica', 'normal');
                doc.text(time, captCol1X, y + 5);
                doc.text((c.branch_name || 'N/A').substring(0, 10), captCol2X, y + 5);
                doc.text((c.seller_name || 'N/A').substring(0, 10), captCol3X, y + 5);
                doc.text((c.guide_name || '-').substring(0, 8), captCol4X, y + 5);
                doc.text((c.product || '').substring(0, 12), captCol5X, y + 5);
                // Notas (truncar si es muy largo)
                const notesText = (c.notes || '-').substring(0, 18);
                doc.text(notesText, captCol6X, y + 5);
                doc.text(c.quantity.toString(), captCol7X, y + 5, { align: 'right' });
                doc.text(c.currency, captCol8X, y + 5, { align: 'center' });
                doc.setFont('helvetica', 'bold');
                doc.text(`$${c.total.toFixed(2)}`, captCol9X, y + 5, { align: 'right' });
                doc.setFont('helvetica', 'normal');
                
                y += 7;
            });

            y += 5;

            // ========== COMISIONES ==========
            // Obtener tipo de cambio del día PRIMERO (para convertir comisiones a MXN)
            // IMPORTANTE: Usar la fecha de las capturas, no la fecha actual
            const exchangeRates = await DB.query('exchange_rates_daily', 'date', captureDate) || [];
            const todayRate = exchangeRates[0] || { usd_to_mxn: 20.0, cad_to_mxn: 15.0 };
            // Asegurar que sean números
            const usdRate = parseFloat(todayRate.usd_to_mxn) || 20.0;
            const cadRate = parseFloat(todayRate.cad_to_mxn) || 15.0;

            // Calcular comisiones (convertir cada captura a MXN antes de calcular comisiones)
            // Nota: commissionRules, agencies, sellers y guides ya están declarados arriba
            const sellerCommissions = {};
            const guideCommissions = {};

            for (const capture of captures) {
                // Convertir total de captura a MXN
                // IMPORTANTE: Asegurar que capture.total sea un número
                const captureTotal = parseFloat(capture.total) || 0;
                let captureTotalMXN = 0;
                if (capture.currency === 'USD') {
                    captureTotalMXN = captureTotal * usdRate;
                } else if (capture.currency === 'CAD') {
                    captureTotalMXN = captureTotal * cadRate;
                } else {
                    captureTotalMXN = captureTotal; // Ya está en MXN
                }

                if (capture.seller_id && captureTotalMXN > 0) {
                    if (!sellerCommissions[capture.seller_id]) {
                        sellerCommissions[capture.seller_id] = {
                            seller: sellers.find(s => s.id === capture.seller_id),
                            total: 0,
                            commissions: {}
                        };
                    }
                    
                    let commission = 0;
                    
                    // Si es venta de calle, aplicar reglas especiales de calle
                    if (capture.is_street && capture.payment_method) {
                        if (capture.payment_method === 'card') {
                            // Tarjeta: (monto - 4.5%) * 12%
                            const afterDiscount = captureTotalMXN * (1 - 0.045);
                            commission = afterDiscount * 0.12;
                        } else if (capture.payment_method === 'cash') {
                            // Efectivo: monto * 14%
                            commission = captureTotalMXN * 0.14;
                        }
                    } else {
                        // Comisiones basadas en reglas de agencia, Sebastian o Gloria
                        // Nota: agencies, sellers y guides ya están declarados arriba (líneas 8351-8353)
                        const agency = agencies.find(a => a.id === capture.agency_id);
                        const seller = sellers.find(s => s.id === capture.seller_id);
                        const guide = guides.find(g => g.id === capture.guide_id);
                        
                        const agencyName = agency?.name || null;
                        const sellerName = seller?.name || null;
                        const guideName = guide?.name || null;
                        
                        // Calcular comisiones usando las nuevas reglas (retorna {sellerCommission, guideCommission})
                        const commissionsByRules = this.calculateCommissionByRules(captureTotalMXN, agencyName, sellerName, guideName);
                        
                        // Usar la comisión del vendedor de las reglas
                        commission = commissionsByRules.sellerCommission;
                        
                        // Si no hay regla especial (Sebastian), usar reglas normales de vendedor
                        if (commission === 0) {
                            const sellerRule = commissionRules.find(r => 
                                r.entity_type === 'seller' && r.entity_id === capture.seller_id
                            ) || commissionRules.find(r => 
                                r.entity_type === 'seller' && r.entity_id === null
                            );
                            if (sellerRule) {
                                const discountPct = sellerRule.discount_pct || 0;
                                const multiplier = sellerRule.multiplier || 1;
                                // Calcular comisión sobre el total convertido a MXN
                                const afterDiscount = captureTotalMXN * (1 - (discountPct / 100));
                                commission = afterDiscount * (multiplier / 100);
                            }
                        }
                    }
                    
                    if (commission > 0) {
                        sellerCommissions[capture.seller_id].total += commission;
                        // Mantener comisión en moneda original también para mostrar en PDF
                        if (!sellerCommissions[capture.seller_id].commissions[capture.currency]) {
                            sellerCommissions[capture.seller_id].commissions[capture.currency] = 0;
                        }
                        // Convertir comisión a moneda original para mostrar
                        if (capture.currency === 'USD') {
                            sellerCommissions[capture.seller_id].commissions[capture.currency] += commission / usdRate;
                        } else if (capture.currency === 'CAD') {
                            sellerCommissions[capture.seller_id].commissions[capture.currency] += commission / cadRate;
                        } else {
                            sellerCommissions[capture.seller_id].commissions[capture.currency] += commission;
                        }
                    }
                }

                if (capture.guide_id && captureTotalMXN > 0) {
                    if (!guideCommissions[capture.guide_id]) {
                        guideCommissions[capture.guide_id] = {
                            guide: guides.find(g => g.id === capture.guide_id),
                            total: 0,
                            commissions: {}
                        };
                    }
                    
                    // Comisiones basadas en reglas de agencia, Sebastian o Gloria
                    const agency = agencies.find(a => a.id === capture.agency_id);
                    const seller = sellers.find(s => s.id === capture.seller_id);
                    const guide = guides.find(g => g.id === capture.guide_id);
                    
                    const agencyName = agency?.name || null;
                    const sellerName = seller?.name || null;
                    const guideName = guide?.name || null;
                    
                    // Calcular comisiones usando las nuevas reglas (retorna {sellerCommission, guideCommission})
                    const commissionsByRules = this.calculateCommissionByRules(captureTotalMXN, agencyName, sellerName, guideName);
                    
                    // Usar la comisión del guía de las reglas
                    let commission = commissionsByRules.guideCommission;
                    
                    // Si no hay regla especial (agencia o Gloria), usar reglas normales de guía
                    if (commission === 0) {
                        const guideRule = commissionRules.find(r => 
                            r.entity_type === 'guide' && r.entity_id === capture.guide_id
                        ) || commissionRules.find(r => 
                            r.entity_type === 'guide' && r.entity_id === null
                        );
                        if (guideRule) {
                            const discountPct = guideRule.discount_pct || 0;
                            const multiplier = guideRule.multiplier || 1;
                            // Calcular comisión sobre el total convertido a MXN
                            const afterDiscount = captureTotalMXN * (1 - (discountPct / 100));
                            commission = afterDiscount * (multiplier / 100);
                        }
                    }
                    
                    if (commission > 0) {
                        guideCommissions[capture.guide_id].total += commission;
                        // Mantener comisión en moneda original también para mostrar en PDF
                        if (!guideCommissions[capture.guide_id].commissions[capture.currency]) {
                            guideCommissions[capture.guide_id].commissions[capture.currency] = 0;
                        }
                        // Convertir comisión a moneda original para mostrar
                        if (capture.currency === 'USD') {
                            guideCommissions[capture.guide_id].commissions[capture.currency] += commission / usdRate;
                        } else if (capture.currency === 'CAD') {
                            guideCommissions[capture.guide_id].commissions[capture.currency] += commission / cadRate;
                        } else {
                            guideCommissions[capture.guide_id].commissions[capture.currency] += commission;
                        }
                    }
                }
            }

            const sellerEntries = Object.values(sellerCommissions).filter(s => s.total > 0);
            const guideEntries = Object.values(guideCommissions).filter(g => g.total > 0);

            if (sellerEntries.length > 0 || guideEntries.length > 0) {
                if (y + 30 > pageHeight - 30) {
                    doc.addPage();
                    y = margin;
                }

                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('COMISIONES CALCULADAS', margin, y);
                y += 10;

                // Comisiones de Vendedores
                if (sellerEntries.length > 0) {
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Vendedores:', margin, y);
                    y += 7;

                    doc.setFillColor(245, 245, 245);
                    doc.rect(margin, y, pageWidth - (margin * 2), 6, 'F');
                    doc.setDrawColor(200, 200, 200);
                    doc.rect(margin, y, pageWidth - (margin * 2), 6);

                    // Definir anchos de columnas
                    const col1X = margin + 2; // Vendedor
                    const col2X = pageWidth - margin - 80; // Total
                    const col3X = pageWidth - margin - 60; // USD
                    const col4X = pageWidth - margin - 40; // MXN
                    const col5X = pageWidth - margin - 20; // CAD
                    const nameMaxWidth = col2X - col1X - 5; // Ancho máximo para nombre

                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Vendedor', col1X, y + 4);
                    doc.text('Total', col2X, y + 4, { align: 'right' });
                    doc.text('USD', col3X, y + 4, { align: 'right' });
                    doc.text('MXN', col4X, y + 4, { align: 'right' });
                    doc.text('CAD', col5X, y + 4, { align: 'right' });
                    y += 6;

                    doc.setFont('helvetica', 'normal');
                    sellerEntries.forEach(s => {
                        if (y + 6 > pageHeight - 30) {
                            doc.addPage();
                            y = margin;
                            // Redibujar encabezados
                            doc.setFillColor(245, 245, 245);
                            doc.rect(margin, y, pageWidth - (margin * 2), 6, 'F');
                            doc.setDrawColor(200, 200, 200);
                            doc.rect(margin, y, pageWidth - (margin * 2), 6);
                            doc.setFontSize(8);
                            doc.setFont('helvetica', 'bold');
                            doc.text('Vendedor', col1X, y + 4);
                            doc.text('Total', col2X, y + 4, { align: 'right' });
                            doc.text('USD', col3X, y + 4, { align: 'right' });
                            doc.text('MXN', col4X, y + 4, { align: 'right' });
                            doc.text('CAD', col5X, y + 4, { align: 'right' });
                            y += 6;
                        }
                        doc.setDrawColor(220, 220, 220);
                        doc.rect(margin, y, pageWidth - (margin * 2), 6);
                        doc.text((s.seller?.name || 'N/A').substring(0, 25), col1X, y + 4);
                        doc.text(`$${(parseFloat(s.total) || 0).toFixed(2)}`, col2X, y + 4, { align: 'right' });
                        doc.text(s.commissions?.USD ? `$${(parseFloat(s.commissions.USD) || 0).toFixed(2)}` : '-', col3X, y + 4, { align: 'right' });
                        doc.text(s.commissions?.MXN ? `$${(parseFloat(s.commissions.MXN) || 0).toFixed(2)}` : '-', col4X, y + 4, { align: 'right' });
                        doc.text(s.commissions?.CAD ? `$${(parseFloat(s.commissions.CAD) || 0).toFixed(2)}` : '-', col5X, y + 4, { align: 'right' });
                        y += 6;
                    });

                    // Total vendedores
                    if (y + 6 > pageHeight - 30) {
                        doc.addPage();
                        y = margin;
                    }
                    const totalSellerComm = sellerEntries.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
                    doc.setFillColor(240, 240, 240);
                    doc.rect(margin, y, pageWidth - (margin * 2), 6, 'F');
                    doc.setFont('helvetica', 'bold');
                    doc.text('TOTAL VENDEDORES', col1X, y + 4);
                    doc.text(`$${(parseFloat(totalSellerComm) || 0).toFixed(2)}`, col2X, y + 4, { align: 'right' });
                    y += 8;
                }

                // Comisiones de Guías
                if (guideEntries.length > 0) {
                    if (y + 20 > pageHeight - 30) {
                        doc.addPage();
                        y = margin;
                    }

                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Guías:', margin, y);
                    y += 7;

                    doc.setFillColor(245, 245, 245);
                    doc.rect(margin, y, pageWidth - (margin * 2), 6, 'F');
                    doc.setDrawColor(200, 200, 200);
                    doc.rect(margin, y, pageWidth - (margin * 2), 6);

                    // Definir anchos de columnas (mismo que vendedores)
                    const col1X = margin + 2; // Guía
                    const col2X = pageWidth - margin - 85; // Total
                    const col3X = pageWidth - margin - 65; // USD
                    const col4X = pageWidth - margin - 45; // MXN
                    const col5X = pageWidth - margin - 25; // CAD

                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Guía', col1X, y + 4);
                    doc.text('Total', col2X, y + 4, { align: 'right' });
                    doc.text('USD', col3X, y + 4, { align: 'right' });
                    doc.text('MXN', col4X, y + 4, { align: 'right' });
                    doc.text('CAD', col5X, y + 4, { align: 'right' });
                    y += 6;

                    doc.setFont('helvetica', 'normal');
                    guideEntries.forEach(g => {
                        if (y + 6 > pageHeight - 30) {
                            doc.addPage();
                            y = margin;
                            // Redibujar encabezados
                            doc.setFillColor(245, 245, 245);
                            doc.rect(margin, y, pageWidth - (margin * 2), 6, 'F');
                            doc.setDrawColor(200, 200, 200);
                            doc.rect(margin, y, pageWidth - (margin * 2), 6);
                            doc.setFontSize(8);
                            doc.setFont('helvetica', 'bold');
                            doc.text('Guía', col1X, y + 4);
                            doc.text('Total', col2X, y + 4, { align: 'right' });
                            doc.text('USD', col3X, y + 4, { align: 'right' });
                            doc.text('MXN', col4X, y + 4, { align: 'right' });
                            doc.text('CAD', col5X, y + 4, { align: 'right' });
                            y += 6;
                        }
                        doc.setDrawColor(220, 220, 220);
                        doc.rect(margin, y, pageWidth - (margin * 2), 6);
                        doc.text((g.guide?.name || 'N/A').substring(0, 25), col1X, y + 4);
                        doc.text(`$${(parseFloat(g.total) || 0).toFixed(2)}`, col2X, y + 4, { align: 'right' });
                        doc.text(g.commissions?.USD ? `$${(parseFloat(g.commissions.USD) || 0).toFixed(2)}` : '-', col3X, y + 4, { align: 'right' });
                        doc.text(g.commissions?.MXN ? `$${(parseFloat(g.commissions.MXN) || 0).toFixed(2)}` : '-', col4X, y + 4, { align: 'right' });
                        doc.text(g.commissions?.CAD ? `$${(parseFloat(g.commissions.CAD) || 0).toFixed(2)}` : '-', col5X, y + 4, { align: 'right' });
                        y += 6;
                    });

                    // Total guías
                    if (y + 6 > pageHeight - 30) {
                        doc.addPage();
                        y = margin;
                    }
                    const totalGuideComm = guideEntries.reduce((sum, g) => sum + (parseFloat(g.total) || 0), 0);
                    doc.setFillColor(240, 240, 240);
                    doc.rect(margin, y, pageWidth - (margin * 2), 6, 'F');
                    doc.setFont('helvetica', 'bold');
                    doc.text('TOTAL GUÍAS', col1X, y + 4);
                    doc.text(`$${(parseFloat(totalGuideComm) || 0).toFixed(2)}`, col2X, y + 4, { align: 'right' });
                    y += 8;
                }
            }

            // ========== UTILIDADES (MARGEN BRUTO Y NETO) ==========
            // El tipo de cambio ya se obtuvo arriba, reutilizarlo
            // Convertir totales a MXN - Asegurar que todos sean números
            const totalsUSD = parseFloat(totals.USD) || 0;
            const totalsMXN = parseFloat(totals.MXN) || 0;
            const totalsCAD = parseFloat(totals.CAD) || 0;
            const usdRateNum = parseFloat(usdRate) || 20.0;
            const cadRateNum = parseFloat(cadRate) || 15.0;
            const totalSalesMXN = totalsUSD * usdRateNum + totalsMXN + totalsCAD * cadRateNum;

            // Calcular comisiones totales (ya están en MXN según el cálculo anterior)
            // Asegurar que sean números
            const sellerTotal = sellerEntries.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
            const guideTotal = guideEntries.reduce((sum, g) => sum + (parseFloat(g.total) || 0), 0);
            const totalCommissions = sellerTotal + guideTotal;

            // COGS: Usar costo de mercancía almacenado en capturas o buscar en inventario
            let totalCOGS = 0;
            for (const capture of captures) {
                // Priorizar costo almacenado manualmente
                const merchandiseCost = parseFloat(capture.merchandise_cost) || 0;
                if (merchandiseCost > 0) {
                    totalCOGS += merchandiseCost;
                } else {
                    // Si no hay costo almacenado, intentar obtener del inventario
                    try {
                        const inventoryItems = await DB.getAll('inventory_items') || [];
                        const item = inventoryItems.find(i => 
                            i.name && capture.product && 
                            i.name.toLowerCase().includes(capture.product.toLowerCase())
                        );
                        if (item && item.cost) {
                            const itemCost = parseFloat(item.cost) || 0;
                            const quantity = parseFloat(capture.quantity) || 1;
                            totalCOGS += itemCost * quantity;
                        }
                    } catch (e) {
                        console.warn('No se pudo obtener costo del inventario:', e);
                    }
                }
            }

            // Costos de llegadas - Leer desde cost_entries (fuente autorizada)
            // IMPORTANTE: Usar la fecha de las capturas, no la fecha actual
            const captureBranchIds = [...new Set(captures.map(c => c.branch_id).filter(Boolean))];
            const branchIdForArrivals = captureBranchIds.length === 1 ? captureBranchIds[0] : null;
            const totalArrivalCostsRaw = await this.calculateArrivalCosts(captureDate, branchIdForArrivals, captureBranchIds);
            // Asegurar que sea un número
            const totalArrivalCosts = typeof totalArrivalCostsRaw === 'number' ? totalArrivalCostsRaw : parseFloat(totalArrivalCostsRaw) || 0;

            // Costos operativos del día (prorrateados)
            // IMPORTANTE: Usar la fecha de las capturas, no la fecha actual
            // SEPARAR: Variables del día vs Fijos prorrateados
            let variableCostsDaily = 0;  // Costos variables registrados hoy
            let fixedCostsProrated = 0;  // Costos fijos prorrateados (mensuales, semanales, anuales)
            let bankCommissions = 0;
            try {
                const allCosts = await DB.getAll('cost_entries') || [];
                const targetDate = new Date(captureDate);
                const captureBranchIdsForOperating = [...new Set(captures.map(c => c.branch_id).filter(Boolean))];
                
                // Si no hay branchIds específicos, considerar costos globales
                const branchIdsToProcess = captureBranchIdsForOperating.length > 0 ? captureBranchIdsForOperating : [null];
                
                for (const branchId of branchIdsToProcess) {
                    const branchCosts = allCosts.filter(c => 
                        branchId === null ? (!c.branch_id || captureBranchIdsForOperating.includes(c.branch_id)) : 
                        (c.branch_id === branchId || !c.branch_id) // Incluir costos globales también
                    );

                    // A) COSTOS FIJOS PRORRATEADOS (Mensuales, Semanales, Anuales)
                    // IMPORTANTE: Usar la misma lógica que loadQuickCaptureProfits
                    // Costos mensuales prorrateados
                    // IMPORTANTE: Para costos recurrentes mensuales, aplicar al mes objetivo completo
                    // independientemente de cuándo se creó el costo
                    // NOTA: Aceptamos costos con period_type='monthly' Y (recurring=true O type='fijo')
                    const monthlyCosts = branchCosts.filter(c => {
                        const isMonthly = c.period_type === 'monthly';
                        // Aceptar si tiene recurring=true O si tiene type='fijo' (para compatibilidad)
                        const isRecurring = c.recurring === true || c.recurring === 'true' || c.type === 'fijo';
                        const isValidCategory = c.category !== 'pago_llegadas' && c.category !== 'comisiones_bancarias';
                        return isMonthly && isRecurring && isValidCategory;
                    });
                    for (const cost of monthlyCosts) {
                        // Usar el mes objetivo (targetDate) para calcular días del mes, no el mes del costo
                        const daysInMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
                        const dailyAmount = (cost.amount || 0) / daysInMonth;
                        fixedCostsProrated += dailyAmount;
                    }

                    // Costos semanales prorrateados
                    // IMPORTANTE: Para costos recurrentes semanales, aplicar si estamos en el mismo año
                    const weeklyCosts = branchCosts.filter(c => {
                        const costDate = new Date(c.date || c.created_at);
                        // Para costos recurrentes semanales, aplicar si están en el mismo año
                        const isWeekly = c.period_type === 'weekly';
                        const isRecurring = c.recurring === true || c.recurring === 'true' || c.type === 'fijo';
                        const isValidCategory = c.category !== 'pago_llegadas' && c.category !== 'comisiones_bancarias';
                        const isSameYear = targetDate.getFullYear() === costDate.getFullYear();
                        return isWeekly && isRecurring && isValidCategory && isSameYear;
                    });
                    for (const cost of weeklyCosts) {
                        const dailyAmount = (cost.amount || 0) / 7;
                        fixedCostsProrated += dailyAmount;
                    }

                    // Costos anuales prorrateados
                    // IMPORTANTE: Para costos recurrentes anuales, aplicar al año objetivo
                    // NOTA: El schema usa 'yearly' pero aceptamos ambos 'annual' y 'yearly'
                    const annualCosts = branchCosts.filter(c => {
                        const isAnnual = c.period_type === 'annual' || c.period_type === 'yearly';
                        const isRecurring = c.recurring === true || c.recurring === 'true' || c.type === 'fijo';
                        const isValidCategory = c.category !== 'pago_llegadas' && c.category !== 'comisiones_bancarias';
                        return isAnnual && isRecurring && isValidCategory;
                        // Removido el filtro de año porque los costos recurrentes anuales se aplican siempre
                        // que estén activos para ese año
                    });
                    for (const cost of annualCosts) {
                        const daysInYear = ((targetDate.getFullYear() % 4 === 0 && targetDate.getFullYear() % 100 !== 0) || (targetDate.getFullYear() % 400 === 0)) ? 366 : 365;
                        const dailyAmount = (cost.amount || 0) / daysInYear;
                        fixedCostsProrated += dailyAmount;
                    }

                    // B) COSTOS VARIABLES DEL DÍA (registrados hoy)
                    const variableCosts = branchCosts.filter(c => {
                        const costDate = c.date || c.created_at;
                        const costDateStr = costDate.split('T')[0];
                        return costDateStr === captureDate &&
                               c.category !== 'pago_llegadas' && // Excluir llegadas (se calculan por separado)
                               c.category !== 'comisiones_bancarias' && // Excluir comisiones bancarias
                               (c.period_type === 'one_time' || c.period_type === 'daily' || !c.period_type);
                    });
                    for (const cost of variableCosts) {
                        variableCostsDaily += (cost.amount || 0);
                    }
                    
                    // También buscar comisiones bancarias en cost_entries para el día
                    const bankCommissionCosts = branchCosts.filter(c => {
                        const costDate = c.date || c.created_at;
                        const costDateStr = costDate.split('T')[0];
                        return costDateStr === captureDate &&
                               c.category === 'comisiones_bancarias';
                    });
                    for (const cost of bankCommissionCosts) {
                        bankCommissions += (cost.amount || 0);
                    }
                }
                
                // Calcular comisiones bancarias de las ventas capturadas si aplica
                // Buscar configuración de comisiones bancarias por método de pago
                for (const capture of captures) {
                    // Si la captura tiene método de pago que genera comisión (tarjeta), calcular comisión bancaria
                    // Por ahora, asumimos que todas las ventas con tarjeta generan comisión bancaria
                    // Necesitaríamos agregar un campo de método de pago en las capturas rápidas
                    // Por ahora, verificar en settings si hay una comisión bancaria configurada por defecto
                    if (capture.payment_method && capture.payment_method !== 'cash') {
                        // Calcular comisión bancaria sobre el total convertido a MXN
                        // IMPORTANTE: Asegurar que capture.total sea un número
                        const captureTotal = parseFloat(capture.total) || 0;
                        let captureTotalMXN = 0;
                        if (capture.currency === 'USD') {
                            captureTotalMXN = captureTotal * usdRate;
                        } else if (capture.currency === 'CAD') {
                            captureTotalMXN = captureTotal * cadRate;
                        } else {
                            captureTotalMXN = captureTotal;
                        }
                        
                        // Buscar configuración de comisión bancaria
                        const bankCommissionSetting = await DB.get('settings', 'bank_commission_default_rate');
                        const bankCommissionRate = bankCommissionSetting?.value ? parseFloat(bankCommissionSetting.value) : 0;
                        if (bankCommissionRate > 0) {
                            bankCommissions += (captureTotalMXN * bankCommissionRate) / 100;
                        }
                    }
                }
            } catch (e) {
                console.warn('No se pudieron obtener costos operativos:', e);
            }

            // Total de costos operativos (variables + fijos prorrateados)
            // IMPORTANTE: Asegurar que siempre sean números antes de sumar
            const variableCostsDailyNum = parseFloat(variableCostsDaily) || 0;
            const fixedCostsProratedNum = parseFloat(fixedCostsProrated) || 0;
            const totalOperatingCostsRaw = variableCostsDailyNum + fixedCostsProratedNum;
            // Asegurar que totalOperatingCosts sea un número
            const totalOperatingCosts = typeof totalOperatingCostsRaw === 'number' ? totalOperatingCostsRaw : parseFloat(totalOperatingCostsRaw) || 0;

            // Calcular utilidades
            // IMPORTANTE: Asegurar que todos los valores sean números antes de calcular
            const totalSalesMXNNum = parseFloat(totalSalesMXN) || 0;
            const totalCOGSNum = parseFloat(totalCOGS) || 0;
            const totalCommissionsNum = parseFloat(totalCommissions) || 0;
            const totalArrivalCostsNum = typeof totalArrivalCosts === 'number' ? totalArrivalCosts : parseFloat(totalArrivalCosts) || 0;
            const bankCommissionsNum = parseFloat(bankCommissions) || 0;
            
            // Utilidad Bruta = Ingresos - COGS - Comisiones
            const grossProfit = totalSalesMXNNum - totalCOGSNum - totalCommissionsNum;
            // Utilidad Neta = Utilidad Bruta - Costos Llegadas - Costos Operativos (variables + fijos prorrateados) - Comisiones Bancarias
            const netProfit = grossProfit - totalArrivalCostsNum - totalOperatingCosts - bankCommissionsNum;
            const grossMargin = totalSalesMXNNum > 0 ? (grossProfit / totalSalesMXNNum * 100) : 0;
            const netMargin = totalSalesMXNNum > 0 ? (netProfit / totalSalesMXNNum * 100) : 0;

            // Mostrar sección de utilidades
            // Ajustar altura si hay gastos fijos prorrateados (necesita más espacio)
            const utilSectionHeight = fixedCostsProratedNum > 0 ? 85 : 80;
            if (y + utilSectionHeight > pageHeight - 30) {
                doc.addPage();
                y = margin;
            }

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('UTILIDADES DEL DÍA', margin, y);
            y += 8;

            // Posición fija para alinear todos los números a la derecha (mejor organizada)
            const valueX = pageWidth - margin - 50; // Posición fija para valores (más espacio)
            const labelX = margin + 5; // Posición fija para etiquetas

            doc.setFillColor(240, 255, 240);
            doc.rect(margin, y, pageWidth - (margin * 2), utilSectionHeight, 'F');
            doc.setDrawColor(200, 200, 200);
            doc.rect(margin, y, pageWidth - (margin * 2), utilSectionHeight);
            
            // Línea divisoria vertical para mejor organización
            doc.setDrawColor(180, 180, 180);
            doc.line(valueX - 10, y, valueX - 10, y + utilSectionHeight);

            // Línea 1: Ingresos (bien alineada)
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('Ingresos:', labelX, y + 8);
            doc.text(`$${totalSalesMXNNum.toFixed(2)}`, valueX, y + 8, { align: 'right' });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            const currencyDetails = `USD: $${(parseFloat(totals.USD) || 0).toFixed(2)} (x${(parseFloat(usdRate) || 0).toFixed(2)}) | MXN: $${(parseFloat(totals.MXN) || 0).toFixed(2)} | CAD: $${(parseFloat(totals.CAD) || 0).toFixed(2)} (x${(parseFloat(cadRate) || 0).toFixed(2)})`;
            doc.text(currencyDetails, labelX + 5, y + 12.5, { maxWidth: valueX - labelX - 15 });

            // Línea 2: COGS (bien alineada)
            doc.setFontSize(10);
            doc.text('(-) Costo Mercancía (COGS):', labelX, y + 19);
            doc.text(`$${totalCOGSNum.toFixed(2)}`, valueX, y + 19, { align: 'right' });

            // Línea 3: Comisiones (bien alineada)
            doc.text('(-) Comisiones (Vendedores + Guías):', labelX, y + 26);
            doc.text(`$${totalCommissionsNum.toFixed(2)}`, valueX, y + 26, { align: 'right' });

            // Línea 4: Utilidad Bruta (bien alineada)
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 128, 0);
            doc.text('= Utilidad Bruta:', labelX, y + 33);
            doc.text(`$${grossProfit.toFixed(2)}`, valueX - 15, y + 33, { align: 'right' });
            doc.setFontSize(8);
            doc.text(`(${grossMargin.toFixed(2)}%)`, valueX + 5, y + 33);

            // Línea 5: Costos Llegadas (bien alineada)
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);
            doc.text('(-) Costos Llegadas:', labelX, y + 40);
            doc.text(`$${totalArrivalCostsNum.toFixed(2)}`, valueX, y + 40, { align: 'right' });

            // Línea 6: Costos Operativos (incluye fijos prorrateados) (bien alineada)
            doc.text('(-) Costos Operativos:', labelX, y + 47);
            doc.text(`$${totalOperatingCosts.toFixed(2)}`, valueX, y + 47, { align: 'right' });
            // Nota sobre gastos fijos prorrateados en una línea adicional más pequeña
            if (fixedCostsProratedNum > 0) {
                doc.setFontSize(7);
                doc.setTextColor(100, 100, 100);
                doc.text(`Incluye fijos prorrateados: $${fixedCostsProratedNum.toFixed(2)} (renta, luz, nómina, etc.)`, labelX + 5, y + 50.5);
                doc.setFontSize(9);
                doc.setTextColor(0, 0, 0);
            }

            // Línea 7: Comisiones Bancarias (bien alineada)
            const commissionY = fixedCostsProratedNum > 0 ? y + 58 : y + 55;
            doc.text('(-) Comisiones Bancarias:', labelX, commissionY);
            doc.text(`$${bankCommissionsNum.toFixed(2)}`, valueX, commissionY, { align: 'right' });

            // Línea 8: Utilidad Neta (bien alineada)
            const netY = fixedCostsProratedNum > 0 ? y + 66 : y + 63;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 255);
            doc.text('= Utilidad Neta:', labelX, netY);
            doc.text(`$${netProfit.toFixed(2)}`, valueX - 15, netY, { align: 'right' });
            doc.setFontSize(8);
            doc.text(`(${netMargin.toFixed(2)}%)`, valueX + 5, netY);

            doc.setTextColor(0, 0, 0);
            y += utilSectionHeight;

            // ========== FOOTER ==========
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(
                    `Página ${i} de ${totalPages}`,
                    pageWidth / 2,
                    pageHeight - 10,
                    { align: 'center' }
                );
            }

            // Guardar PDF
            const todayStr = Utils.formatDate(new Date(captureDate), 'YYYYMMDD');
            const filename = `Captura_Rapida_${todayStr}_${Date.now()}.pdf`;
            doc.save(filename);

            Utils.showNotification('PDF exportado correctamente', 'success');
        } catch (error) {
            console.error('Error exportando PDF:', error);
            Utils.showNotification('Error al exportar PDF: ' + error.message, 'error');
        } finally {
            // Siempre resetear el flag, incluso si hay error
            this.isExporting = false;
        }
    },

    async archiveQuickCaptureReport() {
        try {
            const today = new Date().toISOString().split('T')[0];
            let captures = await DB.getAll('temp_quick_captures') || [];
            captures = captures.filter(c => c.date === today);

            if (captures.length === 0) {
                Utils.showNotification('No hay capturas para archivar', 'warning');
                return;
            }

            // Calcular todos los datos del reporte
            const exchangeRates = await DB.query('exchange_rates_daily', 'date', today) || [];
            const todayRate = exchangeRates[0] || { usd_to_mxn: 20.0, cad_to_mxn: 15.0 };
            const usdRate = todayRate.usd_to_mxn || 20.0;
            const cadRate = todayRate.cad_to_mxn || 15.0;

            const totals = { USD: 0, MXN: 0, CAD: 0 };
            let totalQuantity = 0;
            let totalCOGS = 0;

            captures.forEach(c => {
                totals[c.currency] = (totals[c.currency] || 0) + c.total;
                totalQuantity += c.quantity || 1;
                totalCOGS += c.merchandise_cost || 0;
            });

            const totalSalesMXN = totals.USD * usdRate + totals.MXN + totals.CAD * cadRate;

            // Calcular comisiones (usar misma lógica que loadQuickCaptureProfits)
            // IMPORTANTE: Las comisiones deben calcularse sobre el monto en MXN
            const commissionRules = await DB.getAll('commission_rules') || [];
            // Obtener catálogos una sola vez antes del bucle
            const agencies = await DB.getAll('catalog_agencies') || [];
            const sellers = await DB.getAll('catalog_sellers') || [];
            const guides = await DB.getAll('catalog_guides') || [];
            
            let totalCommissions = 0;
            // Calcular comisiones detalladas por vendedor y guía para guardar en el archivo
            const sellerCommissions = {};
            const guideCommissions = {};
            
            for (const capture of captures) {
                // Convertir el total de la captura a MXN antes de calcular comisiones
                let captureTotalMXN = capture.total;
                if (capture.currency === 'USD') {
                    captureTotalMXN = capture.total * usdRate;
                } else if (capture.currency === 'CAD') {
                    captureTotalMXN = capture.total * cadRate;
                }
                
                // Si es venta de calle, aplicar reglas especiales de calle (solo para vendedores)
                if (capture.is_street && capture.seller_id && captureTotalMXN > 0 && capture.payment_method) {
                    let streetCommission = 0;
                    if (capture.payment_method === 'card') {
                        // Tarjeta: (monto - 4.5%) * 12%
                        const afterDiscount = captureTotalMXN * (1 - 0.045);
                        streetCommission = afterDiscount * 0.12;
                    } else if (capture.payment_method === 'cash') {
                        // Efectivo: monto * 14%
                        streetCommission = captureTotalMXN * 0.14;
                    }
                    totalCommissions += streetCommission;
                } else {
                    // Comisiones basadas en reglas de agencia, Sebastian o Gloria
                    // Nota: agencies, sellers y guides ya están declarados arriba
                    const agency = agencies.find(a => a.id === capture.agency_id);
                    const seller = sellers.find(s => s.id === capture.seller_id);
                    const guide = guides.find(g => g.id === capture.guide_id);
                    
                    const agencyName = agency?.name || null;
                    const sellerName = seller?.name || null;
                    const guideName = guide?.name || null;
                    
                    // Calcular comisiones usando las nuevas reglas (retorna {sellerCommission, guideCommission})
                    const commissionsByRules = this.calculateCommissionByRules(captureTotalMXN, agencyName, sellerName, guideName);
                    
                    // COMISIÓN DEL VENDEDOR
                    if (capture.seller_id && captureTotalMXN > 0 && !capture.is_street) {
                        let sellerCommission = commissionsByRules.sellerCommission;
                        
                        // Si no hay regla especial (Sebastian), usar reglas normales
                        if (sellerCommission === 0) {
                            const sellerRule = commissionRules.find(r => 
                                r.entity_type === 'seller' && r.entity_id === capture.seller_id
                            ) || commissionRules.find(r => 
                                r.entity_type === 'seller' && r.entity_id === null
                            );
                            if (sellerRule) {
                                const discountPct = sellerRule.discount_pct || 0;
                                const multiplier = sellerRule.multiplier || 1;
                                const afterDiscount = captureTotalMXN * (1 - (discountPct / 100));
                                sellerCommission = afterDiscount * (multiplier / 100);
                            }
                        }
                        
                        if (sellerCommission > 0) {
                            totalCommissions += sellerCommission;
                            
                            // Guardar comisión detallada por vendedor
                            if (!sellerCommissions[capture.seller_id]) {
                                sellerCommissions[capture.seller_id] = {
                                    seller: seller,
                                    total: 0,
                                    sales: 0,
                                    commissions: {}
                                };
                            }
                            sellerCommissions[capture.seller_id].total += sellerCommission;
                            sellerCommissions[capture.seller_id].sales += 1;
                            if (!sellerCommissions[capture.seller_id].commissions[capture.currency]) {
                                sellerCommissions[capture.seller_id].commissions[capture.currency] = 0;
                            }
                            // Convertir comisión a moneda original para mostrar
                            if (capture.currency === 'USD') {
                                sellerCommissions[capture.seller_id].commissions[capture.currency] += sellerCommission / usdRate;
                            } else if (capture.currency === 'CAD') {
                                sellerCommissions[capture.seller_id].commissions[capture.currency] += sellerCommission / cadRate;
                            } else {
                                sellerCommissions[capture.seller_id].commissions[capture.currency] += sellerCommission;
                            }
                        }
                    }
                    
                    // COMISIÓN DEL GUÍA
                    if (capture.guide_id && captureTotalMXN > 0) {
                        let guideCommission = commissionsByRules.guideCommission;
                        
                        // Si no hay regla especial (agencia o Gloria), usar reglas normales
                        if (guideCommission === 0) {
                            const guideRule = commissionRules.find(r => 
                                r.entity_type === 'guide' && r.entity_id === capture.guide_id
                            ) || commissionRules.find(r => 
                                r.entity_type === 'guide' && r.entity_id === null
                            );
                            if (guideRule) {
                                const discountPct = guideRule.discount_pct || 0;
                                const multiplier = guideRule.multiplier || 1;
                                const afterDiscount = captureTotalMXN * (1 - (discountPct / 100));
                                guideCommission = afterDiscount * (multiplier / 100);
                            }
                        }
                        
                        if (guideCommission > 0) {
                            totalCommissions += guideCommission;
                            
                            // Guardar comisión detallada por guía
                            if (!guideCommissions[capture.guide_id]) {
                                guideCommissions[capture.guide_id] = {
                                    guide: guide,
                                    total: 0,
                                    sales: 0,
                                    commissions: {}
                                };
                            }
                            guideCommissions[capture.guide_id].total += guideCommission;
                            guideCommissions[capture.guide_id].sales += 1;
                            if (!guideCommissions[capture.guide_id].commissions[capture.currency]) {
                                guideCommissions[capture.guide_id].commissions[capture.currency] = 0;
                            }
                            // Convertir comisión a moneda original para mostrar
                            if (capture.currency === 'USD') {
                                guideCommissions[capture.guide_id].commissions[capture.currency] += guideCommission / usdRate;
                            } else if (capture.currency === 'CAD') {
                                guideCommissions[capture.guide_id].commissions[capture.currency] += guideCommission / cadRate;
                            } else {
                                guideCommissions[capture.guide_id].commissions[capture.currency] += guideCommission;
                            }
                        }
                    }
                }
            }

            // Obtener llegadas y costos (usar misma lógica que loadQuickCaptureProfits)
            const captureBranchIds = [...new Set(captures.map(c => c.branch_id).filter(Boolean))];
            const branchIdForArrivals = captureBranchIds.length === 1 ? captureBranchIds[0] : null;
            // Usar calculateArrivalCosts para obtener costos de llegadas correctamente
            const totalArrivalCostsRaw = await this.calculateArrivalCosts(today, branchIdForArrivals, captureBranchIds);
            const totalArrivalCosts = typeof totalArrivalCostsRaw === 'number' ? totalArrivalCostsRaw : parseFloat(totalArrivalCostsRaw) || 0;
            
            // Obtener llegadas para guardar en el archivo
            const arrivals = await DB.getAll('agency_arrivals') || [];
            const todayArrivals = arrivals.filter(a => a.date === today);
            const filteredArrivals = todayArrivals.filter(a => 
                captureBranchIds.length === 0 || !a.branch_id || captureBranchIds.includes(a.branch_id)
            );

            // Calcular costos operativos (usar misma lógica que loadQuickCaptureProfits)
            let variableCostsDaily = 0;  // Costos variables registrados hoy
            let fixedCostsProrated = 0;  // Costos fijos prorrateados (mensuales, semanales, anuales)
            let bankCommissions = 0;
            try {
                const allCosts = await DB.getAll('cost_entries') || [];
                const targetDate = new Date(today);
                
                // Determinar si debemos incluir costos globales
                const isMasterAdmin = typeof UserManager !== 'undefined' && (
                    UserManager.currentUser?.role === 'master_admin' ||
                    UserManager.currentUser?.is_master_admin ||
                    UserManager.currentUser?.isMasterAdmin ||
                    UserManager.currentEmployee?.role === 'master_admin'
                );
                const includeGlobalCosts = isMasterAdmin && captureBranchIds.length === 0;
                const branchIdsToProcess = captureBranchIds.length > 0 ? captureBranchIds : (includeGlobalCosts ? [null] : []);
                
                for (const branchId of branchIdsToProcess) {
                    // Filtro estricto por sucursal
                    const branchCosts = allCosts.filter(c => {
                        if (branchId === null) {
                            return !c.branch_id;
                        } else {
                            if (!c.branch_id) return false;
                            return String(c.branch_id) === String(branchId);
                        }
                    });

                    // A) COSTOS FIJOS PRORRATEADOS
                    // Mensuales
                    const monthlyCosts = branchCosts.filter(c => {
                        const isMonthly = c.period_type === 'monthly';
                        const isRecurring = c.recurring === true || c.recurring === 'true' || c.type === 'fijo';
                        const isValidCategory = c.category !== 'pago_llegadas' && c.category !== 'comisiones_bancarias';
                        return isMonthly && isRecurring && isValidCategory;
                    });
                    for (const cost of monthlyCosts) {
                        const daysInMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
                        fixedCostsProrated += (cost.amount || 0) / daysInMonth;
                    }

                    // Semanales
                    const weeklyCosts = branchCosts.filter(c => {
                        const isWeekly = c.period_type === 'weekly';
                        const isRecurring = c.recurring === true || c.recurring === 'true' || c.type === 'fijo';
                        const isValidCategory = c.category !== 'pago_llegadas' && c.category !== 'comisiones_bancarias';
                        const costDate = new Date(c.date || c.created_at);
                        const isSameYear = targetDate.getFullYear() === costDate.getFullYear();
                        return isWeekly && isRecurring && isValidCategory && isSameYear;
                    });
                    for (const cost of weeklyCosts) {
                        fixedCostsProrated += (cost.amount || 0) / 7;
                    }

                    // Anuales/Yearly
                    const annualCosts = branchCosts.filter(c => {
                        const isAnnual = c.period_type === 'annual' || c.period_type === 'yearly';
                        const isRecurring = c.recurring === true || c.recurring === 'true' || c.type === 'fijo';
                        const isValidCategory = c.category !== 'pago_llegadas' && c.category !== 'comisiones_bancarias';
                        return isAnnual && isRecurring && isValidCategory;
                    });
                    for (const cost of annualCosts) {
                        const daysInYear = ((targetDate.getFullYear() % 4 === 0 && targetDate.getFullYear() % 100 !== 0) || (targetDate.getFullYear() % 400 === 0)) ? 366 : 365;
                        fixedCostsProrated += (cost.amount || 0) / daysInYear;
                    }

                    // B) COSTOS VARIABLES DEL DÍA
                    const variableCosts = branchCosts.filter(c => {
                        const costDate = c.date || c.created_at;
                        const costDateStr = costDate.split('T')[0];
                        return costDateStr === today &&
                               c.category !== 'pago_llegadas' &&
                               c.category !== 'comisiones_bancarias' &&
                               (c.period_type === 'one_time' || c.period_type === 'daily' || !c.period_type);
                    });
                    for (const cost of variableCosts) {
                        if (cost.category === 'comisiones_bancarias') {
                            bankCommissions += (cost.amount || 0);
                        } else {
                            variableCostsDaily += (cost.amount || 0);
                        }
                    }
                }
                
                // C) GASTOS DE CAJA (retiros) del día
                let cashExpenses = 0;
                try {
                    const allSessions = await DB.getAll('cash_sessions') || [];
                    const daySessions = allSessions.filter(s => {
                        const sessionDate = s.date || s.created_at;
                        const sessionDateStr = typeof sessionDate === 'string' ? sessionDate.split('T')[0] : new Date(sessionDate).toISOString().split('T')[0];
                        return sessionDateStr === today;
                    });
                    
                    const allMovements = await DB.getAll('cash_movements') || [];
                    const sessionIds = daySessions.map(s => s.id);
                    const dayWithdrawals = allMovements.filter(m => {
                        if (m.type !== 'withdrawal') return false;
                        if (!sessionIds.includes(m.session_id)) return false;
                        if (captureBranchIds.length > 0) {
                            const session = daySessions.find(s => s.id === m.session_id);
                            if (!session || !session.branch_id) return false;
                            if (!captureBranchIds.includes(session.branch_id)) return false;
                        }
                        return true;
                    });
                    
                    for (const withdrawal of dayWithdrawals) {
                        cashExpenses += withdrawal.amount || 0;
                    }
                    
                    if (cashExpenses > 0) {
                        variableCostsDaily += cashExpenses;
                    }
                } catch (e) {
                    console.warn('No se pudieron obtener gastos de caja:', e);
                }
            } catch (e) {
                console.warn('Error calculando costos operativos:', e);
            }
            
            // Total de costos operativos (variables + fijos)
            const totalOperatingCosts = variableCostsDaily + fixedCostsProrated;

            const grossProfit = totalSalesMXN - totalCOGS - totalCommissions;
            const netProfit = grossProfit - totalArrivalCosts - totalOperatingCosts - bankCommissions;

            // Crear objeto de reporte archivado con TODOS los datos calculados
            const archivedReport = {
                id: 'archived_' + today + '_' + Date.now(),
                date: today,
                report_type: 'quick_capture',
                captures: captures,
                totals: totals,
                total_quantity: totalQuantity,
                total_sales_mxn: totalSalesMXN,
                total_cogs: totalCOGS,
                total_commissions: totalCommissions,
                // Comisiones detalladas por vendedor y guía
                seller_commissions: Object.values(sellerCommissions).map(s => ({
                    seller_id: s.seller?.id,
                    seller_name: s.seller?.name,
                    total: s.total,
                    sales: s.sales,
                    commissions: s.commissions
                })),
                guide_commissions: Object.values(guideCommissions).map(g => ({
                    guide_id: g.guide?.id,
                    guide_name: g.guide?.name,
                    total: g.total,
                    sales: g.sales,
                    commissions: g.commissions
                })),
                total_arrival_costs: totalArrivalCosts,
                total_operating_costs: totalOperatingCosts,
                variable_costs_daily: variableCostsDaily,
                fixed_costs_prorated: fixedCostsProrated,
                bank_commissions: bankCommissions,
                gross_profit: grossProfit,
                net_profit: netProfit,
                exchange_rates: { usd: usdRate, cad: cadRate },
                arrivals: filteredArrivals,
                branch_ids: captureBranchIds,
                archived_at: new Date().toISOString(),
                archived_by: typeof UserManager !== 'undefined' && UserManager.currentUser ? UserManager.currentUser.id : null
            };

            // Guardar en IndexedDB (store permanente para historial)
            await DB.put('archived_quick_captures', archivedReport);

            // Opcional: Intentar guardar en backend si hay API disponible
            if (typeof API !== 'undefined' && API.saveArchivedReport) {
                try {
                    await API.saveArchivedReport(archivedReport);
                } catch (e) {
                    console.warn('No se pudo guardar en backend, solo guardado local:', e);
                }
            }

            const confirm = await Utils.confirm(
                `¿Deseas limpiar las capturas temporales del día después de archivar?\n\nSe guardaron ${captures.length} capturas en el historial.`,
                'Archivar Reporte'
            );

            if (confirm) {
                for (const capture of captures) {
                    await DB.delete('temp_quick_captures', capture.id);
                }
                Utils.showNotification(`Reporte archivado correctamente. ${captures.length} capturas eliminadas del día.`, 'success');
                await this.loadQuickCaptureData();
            } else {
                Utils.showNotification('Reporte archivado correctamente. Las capturas temporales se mantienen.', 'success');
            }

            // Recargar historial
            await this.loadArchivedReports();
        } catch (error) {
            console.error('Error archivando reporte:', error);
            Utils.showNotification('Error al archivar el reporte: ' + error.message, 'error');
        } finally {
            // Siempre resetear el flag, incluso si hay error
            if (this.isExporting) {
                this.isExporting = false;
            }
        }
    },

    async clearQuickCapture() {
        const confirm = await Utils.confirm(
            '¿Eliminar TODAS las capturas del día? Esta acción no se puede deshacer.',
            'Limpiar Todas las Capturas'
        );
        if (!confirm) return;

        try {
            const today = new Date().toISOString().split('T')[0];
            let captures = await DB.getAll('temp_quick_captures') || [];
            captures = captures.filter(c => c.date === today);

            for (const capture of captures) {
                await DB.delete('temp_quick_captures', capture.id);
            }

            Utils.showNotification(`${captures.length} capturas eliminadas`, 'success');
            await this.loadQuickCaptureData();
        } catch (error) {
            console.error('Error limpiando capturas:', error);
            Utils.showNotification('Error al limpiar: ' + error.message, 'error');
        }
    },

    async loadArchivedReports() {
        try {
            const container = document.getElementById('archived-reports-list');
            if (!container) return;

            // Obtener todos los reportes archivados
            const archivedReports = await DB.getAll('archived_quick_captures') || [];
            
            // Ordenar por fecha (más recientes primero)
            archivedReports.sort((a, b) => {
                const dateA = new Date(a.archived_at || a.date);
                const dateB = new Date(b.archived_at || b.date);
                return dateB - dateA;
            });

            if (archivedReports.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: var(--spacing-lg); color: var(--color-text-secondary);">
                        <i class="fas fa-inbox" style="font-size: 32px; opacity: 0.3; margin-bottom: var(--spacing-sm);"></i>
                        <p>No hay reportes archivados</p>
                        <small style="font-size: 11px; color: var(--color-text-secondary);">
                            Los reportes archivados aparecerán aquí después de usar el botón "Archivar Reporte"
                        </small>
                    </div>
                `;
                return;
            }

            // Renderizar tabla de reportes archivados
            let html = `
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                        <thead>
                            <tr style="background: var(--color-bg-secondary); border-bottom: 2px solid var(--color-border-light);">
                                <th style="padding: var(--spacing-sm); text-align: left; font-size: 11px; text-transform: uppercase; font-weight: 600;">Fecha</th>
                                <th style="padding: var(--spacing-sm); text-align: center; font-size: 11px; text-transform: uppercase; font-weight: 600;">Capturas</th>
                                <th style="padding: var(--spacing-sm); text-align: right; font-size: 11px; text-transform: uppercase; font-weight: 600;">Ventas (MXN)</th>
                                <th style="padding: var(--spacing-sm); text-align: right; font-size: 11px; text-transform: uppercase; font-weight: 600;">Utilidad Bruta</th>
                                <th style="padding: var(--spacing-sm); text-align: right; font-size: 11px; text-transform: uppercase; font-weight: 600;">Utilidad Neta</th>
                                <th style="padding: var(--spacing-sm); text-align: center; font-size: 11px; text-transform: uppercase; font-weight: 600;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${archivedReports.map(report => {
                                const date = new Date(report.date);
                                const dateStr = date.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' });
                                const archivedDate = report.archived_at ? new Date(report.archived_at).toLocaleString('es-MX', { 
                                    year: 'numeric', 
                                    month: '2-digit', 
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                }) : '';
                                
                                const grossProfit = report.gross_profit || 0;
                                const netProfit = report.net_profit || 0;
                                const totalSales = report.total_sales_mxn || 0;
                                const captureCount = report.captures ? report.captures.length : 0;
                                
                                const grossMargin = totalSales > 0 ? ((grossProfit / totalSales) * 100).toFixed(2) : '0.00';
                                const netMargin = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(2) : '0.00';
                                
                                return `
                                    <tr style="border-bottom: 1px solid var(--color-border-light);">
                                        <td style="padding: var(--spacing-sm);">
                                            <div style="font-weight: 600;">${dateStr}</div>
                                            ${archivedDate ? `<small style="color: var(--color-text-secondary); font-size: 10px;">Archivado: ${archivedDate}</small>` : ''}
                                        </td>
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
                                        <td style="padding: var(--spacing-sm); text-align: center;">
                                            <div style="display: flex; gap: var(--spacing-xs); justify-content: center; flex-wrap: wrap;">
                                                <button class="btn-primary btn-xs" onclick="window.Reports.viewArchivedReport('${report.id}')" title="Ver Detalles">
                                                    <i class="fas fa-eye"></i>
                                                </button>
                                                <button class="btn-success btn-xs" onclick="window.Reports.restoreArchivedReport('${report.id}')" title="Restaurar y Editar">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button class="btn-secondary btn-xs" onclick="window.Reports.exportArchivedReportPDF('${report.id}')" title="Exportar PDF">
                                                    <i class="fas fa-file-pdf"></i>
                                                </button>
                                                <button class="btn-danger btn-xs" onclick="window.Reports.deleteArchivedReport('${report.id}')" title="Eliminar">
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
            console.error('Error cargando reportes archivados:', error);
            const container = document.getElementById('archived-reports-list');
            if (container) {
                container.innerHTML = `
                    <div style="padding: var(--spacing-sm); background: var(--color-danger); color: white; border-radius: var(--radius-sm); font-size: 12px;">
                        Error: ${error.message}
                    </div>
                `;
            }
        }
    },

    async viewArchivedReport(reportId) {
        try {
            const report = await DB.get('archived_quick_captures', reportId);
            if (!report) {
                Utils.showNotification('Reporte no encontrado', 'error');
                return;
            }

            // Crear modal para ver detalles del reporte
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.id = 'view-archived-report-modal';
            modal.style.display = 'flex';

            const date = new Date(report.date);
            const dateStr = date.toLocaleDateString('es-MX', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                weekday: 'long'
            });

            modal.innerHTML = `
                <div class="modal-content" style="max-width: 900px; width: 90%; max-height: 90vh; overflow-y: auto;">
                    <div class="modal-header">
                        <h3>Reporte Archivado - ${dateStr}</h3>
                        <button class="modal-close" onclick="document.getElementById('view-archived-report-modal').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div style="display: grid; gap: var(--spacing-md);">
                            <!-- Resumen -->
                            <div style="padding: var(--spacing-md); background: var(--color-bg-secondary); border-radius: var(--radius-md);">
                                <h4 style="margin: 0 0 var(--spacing-sm) 0; font-size: 13px; font-weight: 600; text-transform: uppercase;">Resumen</h4>
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--spacing-sm); font-size: 12px;">
                                    <div>
                                        <div style="color: var(--color-text-secondary); font-size: 10px; text-transform: uppercase;">Total Capturas</div>
                                        <div style="font-weight: 600; font-size: 16px;">${report.captures ? report.captures.length : 0}</div>
                                    </div>
                                    <div>
                                        <div style="color: var(--color-text-secondary); font-size: 10px; text-transform: uppercase;">Ventas (MXN)</div>
                                        <div style="font-weight: 600; font-size: 16px;">$${parseFloat(report.total_sales_mxn || 0).toFixed(2)}</div>
                                    </div>
                                    <div>
                                        <div style="color: var(--color-text-secondary); font-size: 10px; text-transform: uppercase;">Utilidad Bruta</div>
                                        <div style="font-weight: 600; font-size: 16px; color: var(--color-success);">$${parseFloat(report.gross_profit || 0).toFixed(2)}</div>
                                    </div>
                                    <div>
                                        <div style="color: var(--color-text-secondary); font-size: 10px; text-transform: uppercase;">Utilidad Neta</div>
                                        <div style="font-weight: 600; font-size: 16px; color: ${parseFloat(report.net_profit || 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">$${parseFloat(report.net_profit || 0).toFixed(2)}</div>
                                    </div>
                                </div>
                            </div>

                            <!-- Detalles Financieros -->
                            <div style="padding: var(--spacing-md); background: var(--color-bg-secondary); border-radius: var(--radius-md);">
                                <h4 style="margin: 0 0 var(--spacing-sm) 0; font-size: 13px; font-weight: 600; text-transform: uppercase;">Desglose Financiero</h4>
                                <div style="display: grid; gap: var(--spacing-xs); font-size: 12px;">
                                    <div style="display: flex; justify-content: space-between;">
                                        <span style="color: var(--color-text-secondary);">Costo Mercancía (COGS):</span>
                                        <span style="font-weight: 600;">$${parseFloat(report.total_cogs || 0).toFixed(2)}</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between;">
                                        <span style="color: var(--color-text-secondary);">Comisiones:</span>
                                        <span style="font-weight: 600;">$${parseFloat(report.total_commissions || 0).toFixed(2)}</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between;">
                                        <span style="color: var(--color-text-secondary);">Costos de Llegadas:</span>
                                        <span style="font-weight: 600;">$${parseFloat(report.total_arrival_costs || 0).toFixed(2)}</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between;">
                                        <span style="color: var(--color-text-secondary);">Costos Operativos:</span>
                                        <span style="font-weight: 600;">$${parseFloat(report.total_operating_costs || 0).toFixed(2)}</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between;">
                                        <span style="color: var(--color-text-secondary);">Comisiones Bancarias:</span>
                                        <span style="font-weight: 600;">$${parseFloat(report.bank_commissions || 0).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Capturas -->
                            ${report.captures && report.captures.length > 0 ? `
                            <div>
                                <h4 style="margin: 0 0 var(--spacing-sm) 0; font-size: 13px; font-weight: 600; text-transform: uppercase;">Capturas (${report.captures.length})</h4>
                                <div style="overflow-x: auto;">
                                    <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                                        <thead>
                                            <tr style="background: var(--color-bg-secondary); border-bottom: 1px solid var(--color-border-light);">
                                                <th style="padding: var(--spacing-xs); text-align: left;">Hora</th>
                                                <th style="padding: var(--spacing-xs); text-align: left;">Sucursal</th>
                                                <th style="padding: var(--spacing-xs); text-align: left;">Vendedor</th>
                                                <th style="padding: var(--spacing-xs); text-align: left;">Producto</th>
                                                <th style="padding: var(--spacing-xs); text-align: center;">Cant.</th>
                                                <th style="padding: var(--spacing-xs); text-align: right;">Total</th>
                                                <th style="padding: var(--spacing-xs); text-align: right;">Costo</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${report.captures.map(c => {
                                                const time = new Date(c.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                                                return `
                                                    <tr style="border-bottom: 1px solid var(--color-border-light);">
                                                        <td style="padding: var(--spacing-xs);">${time}</td>
                                                        <td style="padding: var(--spacing-xs);">${c.branch_name || 'N/A'}</td>
                                                        <td style="padding: var(--spacing-xs);">${c.seller_name || 'N/A'}</td>
                                                        <td style="padding: var(--spacing-xs);">${c.product || ''}</td>
                                                        <td style="padding: var(--spacing-xs); text-align: center;">${c.quantity || 1}</td>
                                                        <td style="padding: var(--spacing-xs); text-align: right; font-weight: 600;">$${(c.total || 0).toFixed(2)} ${c.currency || ''}</td>
                                                        <td style="padding: var(--spacing-xs); text-align: right; color: var(--color-text-secondary);">$${(c.merchandise_cost || 0).toFixed(2)}</td>
                                                    </tr>
                                                `;
                                            }).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="modal-footer" style="display: flex; gap: var(--spacing-sm); justify-content: flex-end; padding: var(--spacing-md); border-top: 1px solid var(--color-border-light);">
                        <button class="btn-success" onclick="window.Reports.restoreArchivedReport('${report.id}'); document.getElementById('view-archived-report-modal').remove();">
                            <i class="fas fa-edit"></i> Restaurar y Editar
                        </button>
                        <button class="btn-secondary" onclick="window.Reports.exportArchivedReportPDF('${report.id}')">
                            <i class="fas fa-file-pdf"></i> Exportar PDF
                        </button>
                        <button class="btn-primary" onclick="document.getElementById('view-archived-report-modal').remove()">
                            Cerrar
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
        } catch (error) {
            console.error('Error viendo reporte archivado:', error);
            Utils.showNotification('Error al ver el reporte: ' + error.message, 'error');
        }
    },

    async exportArchivedReportPDF(reportId) {
        try {
            if (this.isExporting) {
                Utils.showNotification('Ya se está exportando un reporte. Por favor espera...', 'warning');
                return;
            }
            this.isExporting = true;

            const report = await DB.get('archived_quick_captures', reportId);
            if (!report) {
                Utils.showNotification('Reporte no encontrado', 'error');
                this.isExporting = false;
                return;
            }

            // IMPORTANTE: Usar los datos guardados en el reporte archivado
            // El reporte ya tiene todos los cálculos guardados, solo necesitamos renderizarlos
            const jspdfLib = Utils.checkJsPDF();
            if (!jspdfLib) {
                Utils.showNotification('jsPDF no está disponible', 'error');
                this.isExporting = false;
                return;
            }

            const { jsPDF } = jspdfLib;
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 15;
            let y = margin;

            // ========== HEADER ==========
            doc.setFillColor(52, 73, 94);
            doc.rect(0, 0, pageWidth, 35, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text('OPAL & CO', margin, 15);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'normal');
            doc.text('Reporte Archivado', margin, 22);
            doc.setFontSize(10);
            doc.setTextColor(220, 220, 220);
            const date = new Date(report.date);
            doc.text(`Fecha: ${date.toLocaleDateString('es-MX')}`, pageWidth - margin, 15, { align: 'right' });
            doc.text(`Archivado: ${new Date(report.archived_at).toLocaleString('es-MX')}`, pageWidth - margin, 22, { align: 'right' });

            y = 45;

            // ========== RESUMEN ==========
            doc.setFillColor(240, 248, 255);
            doc.rect(margin, y, pageWidth - (margin * 2), 30, 'F');
            doc.setDrawColor(200, 200, 200);
            doc.rect(margin, y, pageWidth - (margin * 2), 30);

            doc.setTextColor(0, 0, 0);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('RESUMEN DEL DÍA', margin + 5, y + 8);

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`Fecha: ${report.date}`, pageWidth - margin - 5, y + 15, { align: 'right' });

            doc.setFontSize(10);
            doc.text(`Total Capturas: ${report.captures ? report.captures.length : 0}`, margin + 5, y + 15);
            doc.text(`Total Cantidad: ${report.total_quantity || 0}`, margin + 60, y + 15);
            doc.text(`Total USD: $${(parseFloat(report.totals?.USD) || 0).toFixed(2)}`, margin + 5, y + 22);
            doc.text(`Total MXN: $${(parseFloat(report.totals?.MXN) || 0).toFixed(2)}`, margin + 60, y + 22);
            doc.text(`Total CAD: $${(parseFloat(report.totals?.CAD) || 0).toFixed(2)}`, margin + 115, y + 22);
            doc.text(`Ventas Totales (MXN): $${parseFloat(report.total_sales_mxn || 0).toFixed(2)}`, margin + 5, y + 28);

            y += 38;

            // ========== UTILIDADES DEL DÍA (usar datos guardados) ==========
            if (y + 85 > pageHeight - 30) {
                doc.addPage();
                y = margin;
            }

            doc.setFillColor(240, 255, 240);
            const utilSectionHeight = 85;
            doc.rect(margin, y, pageWidth - (margin * 2), utilSectionHeight, 'F');
            doc.setDrawColor(200, 200, 200);
            doc.rect(margin, y, pageWidth - (margin * 2), utilSectionHeight);

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('UTILIDADES DEL DÍA', margin + 5, y + 8);

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            let utilY = y + 15;

            // Usar los datos guardados en el reporte
            const totalSalesMXN = parseFloat(report.total_sales_mxn || 0);
            const totalCOGS = parseFloat(report.total_cogs || 0);
            const totalCommissions = parseFloat(report.total_commissions || 0);
            const totalArrivalCosts = parseFloat(report.total_arrival_costs || 0);
            const totalOperatingCosts = parseFloat(report.total_operating_costs || 0);
            const bankCommissions = parseFloat(report.bank_commissions || 0);
            const grossProfit = parseFloat(report.gross_profit || 0);
            const netProfit = parseFloat(report.net_profit || 0);

            doc.text(`Ventas Totales (MXN):`, margin + 5, utilY);
            doc.text(`$${totalSalesMXN.toFixed(2)}`, pageWidth - margin - 5, utilY, { align: 'right' });
            utilY += 6;

            doc.text(`Costo de Mercancía:`, margin + 5, utilY);
            doc.text(`$${totalCOGS.toFixed(2)}`, pageWidth - margin - 5, utilY, { align: 'right' });
            utilY += 6;

            doc.text(`Comisiones:`, margin + 5, utilY);
            doc.text(`$${totalCommissions.toFixed(2)}`, pageWidth - margin - 5, utilY, { align: 'right' });
            utilY += 6;

            doc.setFont('helvetica', 'bold');
            doc.text(`Utilidad Bruta:`, margin + 5, utilY);
            doc.text(`$${grossProfit.toFixed(2)}`, pageWidth - margin - 5, utilY, { align: 'right' });
            utilY += 6;
            doc.setFont('helvetica', 'normal');

            doc.text(`Costos Llegadas:`, margin + 5, utilY);
            doc.text(`$${totalArrivalCosts.toFixed(2)}`, pageWidth - margin - 5, utilY, { align: 'right' });
            utilY += 6;

            doc.text(`Gastos Operativos:`, margin + 5, utilY);
            doc.text(`$${totalOperatingCosts.toFixed(2)}`, pageWidth - margin - 5, utilY, { align: 'right' });
            utilY += 6;

            doc.text(`Comisiones Bancarias:`, margin + 5, utilY);
            doc.text(`$${bankCommissions.toFixed(2)}`, pageWidth - margin - 5, utilY, { align: 'right' });
            utilY += 6;

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(netProfit >= 0 ? 0 : 255, netProfit >= 0 ? 150 : 0, 0);
            doc.text(`Utilidad Neta:`, margin + 5, utilY);
            doc.text(`$${netProfit.toFixed(2)}`, pageWidth - margin - 5, utilY, { align: 'right' });
            doc.setTextColor(0, 0, 0);

            y += utilSectionHeight + 5;

            // ========== CAPTURAS (si están guardadas) ==========
            if (report.captures && report.captures.length > 0) {
                if (y + 30 > pageHeight - 30) {
                    doc.addPage();
                    y = margin;
                }

                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('CAPTURAS REALIZADAS', margin, y);
                y += 8;

                // Encabezados
                doc.setFillColor(245, 245, 245);
                doc.rect(margin, y, pageWidth - (margin * 2), 8, 'F');
                doc.setDrawColor(200, 200, 200);
                doc.rect(margin, y, pageWidth - (margin * 2), 8);

                doc.setFontSize(7);
                doc.setFont('helvetica', 'bold');
                doc.text('Hora', margin + 2, y + 5.5);
                doc.text('Vendedor', margin + 20, y + 5.5);
                doc.text('Producto', margin + 50, y + 5.5);
                doc.text('Cant.', pageWidth - margin - 50, y + 5.5, { align: 'right' });
                doc.text('Total', pageWidth - margin - 2, y + 5.5, { align: 'right' });
                y += 8;

                // Filas
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                report.captures.forEach(c => {
                    if (y + 7 > pageHeight - 30) {
                        doc.addPage();
                        y = margin;
                    }
                    const time = c.created_at ? new Date(c.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '-';
                    doc.setDrawColor(220, 220, 220);
                    doc.rect(margin, y, pageWidth - (margin * 2), 7);
                    doc.text(time, margin + 2, y + 5);
                    doc.text((c.seller_name || 'N/A').substring(0, 20), margin + 20, y + 5);
                    doc.text((c.product || '').substring(0, 25), margin + 50, y + 5);
                    doc.text((c.quantity || 1).toString(), pageWidth - margin - 50, y + 5, { align: 'right' });
                    doc.setFont('helvetica', 'bold');
                    doc.text(`$${parseFloat(c.total || 0).toFixed(2)} ${c.currency || 'MXN'}`, pageWidth - margin - 2, y + 5, { align: 'right' });
                    doc.setFont('helvetica', 'normal');
                    y += 7;
                });
                y += 5;
            }

            // ========== COMISIONES (si están guardadas) ==========
            if (report.seller_commissions && report.seller_commissions.length > 0) {
                if (y + 30 > pageHeight - 30) {
                    doc.addPage();
                    y = margin;
                }

                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('COMISIONES DE VENDEDORES', margin, y);
                y += 8;

                doc.setFillColor(245, 245, 245);
                doc.rect(margin, y, pageWidth - (margin * 2), 6, 'F');
                doc.setDrawColor(200, 200, 200);
                doc.rect(margin, y, pageWidth - (margin * 2), 6);

                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.text('Vendedor', margin + 2, y + 4);
                doc.text('Total', pageWidth - margin - 2, y + 4, { align: 'right' });
                y += 6;

                doc.setFont('helvetica', 'normal');
                report.seller_commissions.forEach(s => {
                    if (y + 6 > pageHeight - 30) {
                        doc.addPage();
                        y = margin;
                    }
                    doc.setDrawColor(220, 220, 220);
                    doc.rect(margin, y, pageWidth - (margin * 2), 6);
                    doc.text((s.seller_name || 'N/A').substring(0, 40), margin + 2, y + 4);
                    doc.text(`$${parseFloat(s.total || 0).toFixed(2)}`, pageWidth - margin - 2, y + 4, { align: 'right' });
                    y += 6;
                });
                y += 5;
            }

            if (report.guide_commissions && report.guide_commissions.length > 0) {
                if (y + 30 > pageHeight - 30) {
                    doc.addPage();
                    y = margin;
                }

                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('COMISIONES DE GUÍAS', margin, y);
                y += 8;

                doc.setFillColor(245, 245, 245);
                doc.rect(margin, y, pageWidth - (margin * 2), 6, 'F');
                doc.setDrawColor(200, 200, 200);
                doc.rect(margin, y, pageWidth - (margin * 2), 6);

                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.text('Guía', margin + 2, y + 4);
                doc.text('Total', pageWidth - margin - 2, y + 4, { align: 'right' });
                y += 6;

                doc.setFont('helvetica', 'normal');
                report.guide_commissions.forEach(g => {
                    if (y + 6 > pageHeight - 30) {
                        doc.addPage();
                        y = margin;
                    }
                    doc.setDrawColor(220, 220, 220);
                    doc.rect(margin, y, pageWidth - (margin * 2), 6);
                    doc.text((g.guide_name || 'N/A').substring(0, 40), margin + 2, y + 4);
                    doc.text(`$${parseFloat(g.total || 0).toFixed(2)}`, pageWidth - margin - 2, y + 4, { align: 'right' });
                    y += 6;
                });
            }

            // ========== FOOTER ==========
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(
                    `Página ${i} de ${totalPages}`,
                    pageWidth / 2,
                    pageHeight - 10,
                    { align: 'center' }
                );
            }

            // Guardar PDF
            const filename = `Reporte_Archivado_${report.date}_${Date.now()}.pdf`;
            doc.save(filename);

            Utils.showNotification('PDF exportado correctamente', 'success');
        } catch (error) {
            console.error('Error exportando PDF del reporte archivado:', error);
            Utils.showNotification('Error al exportar PDF: ' + error.message, 'error');
        } finally {
            this.isExporting = false;
        }
    },

    async deleteArchivedReport(reportId) {
        // Crear modal de confirmación personalizado (bien posicionado)
        const confirmModal = document.createElement('div');
        confirmModal.className = 'modal-overlay';
        confirmModal.id = 'delete-archived-confirm-modal';
        confirmModal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';
        
        confirmModal.innerHTML = `
            <div class="modal-content" style="max-width: 500px; width: 90%; background: white; border-radius: var(--radius-md); padding: 0; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <div class="modal-header" style="padding: var(--spacing-md); border-bottom: 1px solid var(--color-border-light);">
                    <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: var(--color-danger);">Eliminar Reporte Archivado</h3>
                </div>
                <div class="modal-body" style="padding: var(--spacing-md);">
                    <p style="margin: 0; font-size: 14px; line-height: 1.5;">
                        ¿Estás seguro de que deseas eliminar este reporte archivado?
                    </p>
                    <p style="margin: var(--spacing-sm) 0 0 0; font-size: 13px; line-height: 1.5; color: var(--color-danger);">
                        <strong>Esta acción no se puede deshacer.</strong>
                    </p>
                </div>
                <div class="modal-footer" style="padding: var(--spacing-md); border-top: 1px solid var(--color-border-light); display: flex; gap: var(--spacing-sm); justify-content: flex-end;">
                    <button class="btn-secondary" id="delete-archived-cancel-btn" style="min-width: 100px;">Cancelar</button>
                    <button class="btn-danger" id="delete-archived-confirm-btn" style="min-width: 100px;">Eliminar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(confirmModal);
        
        // Manejar eventos
        return new Promise((resolve) => {
            document.getElementById('delete-archived-confirm-btn').onclick = async () => {
                confirmModal.remove();
                try {
                    await DB.delete('archived_quick_captures', reportId);
                    Utils.showNotification('Reporte archivado eliminado', 'success');
                    await this.loadArchivedReports();
                } catch (error) {
                    console.error('Error eliminando reporte archivado:', error);
                    Utils.showNotification('Error al eliminar: ' + error.message, 'error');
                }
                resolve();
            };
            
            document.getElementById('delete-archived-cancel-btn').onclick = () => {
                confirmModal.remove();
                resolve();
            };
        });
    },

    async restoreArchivedReport(reportId) {
        try {
            const report = await DB.get('archived_quick_captures', reportId);
            if (!report) {
                Utils.showNotification('Reporte no encontrado', 'error');
                return;
            }

            if (!report.captures || report.captures.length === 0) {
                Utils.showNotification('Este reporte no tiene capturas para restaurar', 'warning');
                return;
            }

            // Crear modal de confirmación
            const confirmModal = document.createElement('div');
            confirmModal.className = 'modal-overlay';
            confirmModal.id = 'restore-archived-confirm-modal';
            confirmModal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';
            
            confirmModal.innerHTML = `
                <div class="modal-content" style="max-width: 500px; width: 90%; background: white; border-radius: var(--radius-md); padding: 0; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                    <div class="modal-header" style="padding: var(--spacing-md); border-bottom: 1px solid var(--color-border-light);">
                        <h3 style="margin: 0; font-size: 16px; font-weight: 600;">Restaurar Reporte</h3>
                    </div>
                    <div class="modal-body" style="padding: var(--spacing-md);">
                        <p style="margin: 0 0 var(--spacing-sm) 0; font-size: 14px; line-height: 1.5;">
                            Se restaurarán <strong>${report.captures.length}</strong> capturas del reporte del <strong>${new Date(report.date).toLocaleDateString('es-MX')}</strong>.
                        </p>
                        <p style="margin: 0; font-size: 13px; line-height: 1.5; color: var(--color-text-secondary);">
                            Las capturas se agregarán a las capturas temporales del día actual y podrás editarlas.
                        </p>
                        <p style="margin: var(--spacing-sm) 0 0 0; font-size: 12px; line-height: 1.5; color: var(--color-warning);">
                            <i class="fas fa-exclamation-triangle"></i> Si ya tienes capturas del día, estas se agregarán a las existentes.
                        </p>
                    </div>
                    <div class="modal-footer" style="padding: var(--spacing-md); border-top: 1px solid var(--color-border-light); display: flex; gap: var(--spacing-sm); justify-content: flex-end;">
                        <button class="btn-secondary" id="restore-cancel-btn" style="min-width: 100px;">Cancelar</button>
                        <button class="btn-success" id="restore-confirm-btn" style="min-width: 100px;">
                            <i class="fas fa-edit"></i> Restaurar
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(confirmModal);
            
            // Manejar eventos
            return new Promise((resolve) => {
                document.getElementById('restore-confirm-btn').onclick = async () => {
                    confirmModal.remove();
                    
                    try {
                        // Restaurar cada captura a temp_quick_captures
                        let restoredCount = 0;
                        for (const capture of report.captures) {
                            try {
                                // Generar nuevo ID para evitar conflictos
                                // IMPORTANTE: Mantener la fecha original del reporte archivado
                                const restoredCapture = {
                                    ...capture,
                                    id: 'qc_restored_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                                    date: report.date, // Mantener la fecha original del reporte archivado
                                    restored_from: reportId,
                                    restored_at: new Date().toISOString(),
                                    original_report_date: report.date // Guardar la fecha original para referencia
                                };
                                
                                await DB.put('temp_quick_captures', restoredCapture);
                                restoredCount++;
                            } catch (error) {
                                console.error('Error restaurando captura individual:', error);
                            }
                        }
                        
                        if (restoredCount > 0) {
                            Utils.showNotification(`${restoredCount} capturas restauradas correctamente. Puedes editarlas ahora.`, 'success');
                            
                            // Cambiar a la pestaña de captura rápida
                            const quickCaptureTab = document.querySelector('[data-tab="quick-capture"]');
                            if (quickCaptureTab) {
                                quickCaptureTab.click();
                            }
                            
                            // Recargar datos
                            await this.loadQuickCaptureData();
                        } else {
                            Utils.showNotification('No se pudieron restaurar las capturas', 'error');
                        }
                    } catch (error) {
                        console.error('Error restaurando reporte:', error);
                        Utils.showNotification('Error al restaurar el reporte: ' + error.message, 'error');
                    }
                    
                    resolve();
                };
                
                document.getElementById('restore-cancel-btn').onclick = () => {
                    confirmModal.remove();
                    resolve();
                };
            });
        } catch (error) {
            console.error('Error restaurando reporte archivado:', error);
            Utils.showNotification('Error al restaurar el reporte: ' + error.message, 'error');
        }
    },

    async showDateSelectorModal() {
        return new Promise((resolve) => {
            // Obtener todas las fechas disponibles de las capturas
            const getAvailableDates = async () => {
                const captures = await DB.getAll('temp_quick_captures') || [];
                const dates = [...new Set(captures.map(c => c.original_report_date || c.date).filter(Boolean))];
                return dates.sort().reverse(); // Más recientes primero
            };
            
            getAvailableDates().then(availableDates => {
                const today = new Date().toISOString().split('T')[0];
                const defaultDate = availableDates.length > 0 ? availableDates[0] : today;
                
                const modal = document.createElement('div');
                modal.className = 'modal-overlay';
                modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';
                
                modal.innerHTML = `
                    <div class="modal-content" style="max-width: 400px; width: 90%; background: white; border-radius: var(--radius-md); padding: 0; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                        <div class="modal-header" style="padding: var(--spacing-md); border-bottom: 1px solid var(--color-border-light);">
                            <h3 style="margin: 0; font-size: 16px; font-weight: 600;">Seleccionar Fecha del Reporte</h3>
                        </div>
                        <div class="modal-body" style="padding: var(--spacing-md);">
                            <div class="form-group">
                                <label>Fecha del Reporte <span style="color: var(--color-danger);">*</span></label>
                                <input type="date" id="export-date-selector" class="form-input" value="${defaultDate}" required style="width: 100%;">
                            </div>
                            ${availableDates.length > 0 ? `
                            <div style="margin-top: var(--spacing-sm);">
                                <small style="color: var(--color-text-secondary); font-size: 11px;">Fechas disponibles en capturas:</small>
                                <div style="display: flex; flex-wrap: wrap; gap: var(--spacing-xs); margin-top: var(--spacing-xs);">
                                    ${availableDates.slice(0, 5).map(date => `
                                        <button type="button" class="btn-secondary btn-xs" onclick="document.getElementById('export-date-selector').value='${date}';">
                                            ${new Date(date + 'T00:00:00').toLocaleDateString('es-MX')}
                                        </button>
                                    `).join('')}
                                </div>
                            </div>
                            ` : ''}
                        </div>
                        <div class="modal-footer" style="padding: var(--spacing-md); border-top: 1px solid var(--color-border-light); display: flex; gap: var(--spacing-sm); justify-content: flex-end;">
                            <button class="btn-secondary" id="export-date-cancel-btn" style="min-width: 100px;">Cancelar</button>
                            <button class="btn-primary" id="export-date-confirm-btn" style="min-width: 100px;">
                                <i class="fas fa-file-pdf"></i> Exportar
                            </button>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(modal);
                
                document.getElementById('export-date-confirm-btn').onclick = () => {
                    const selectedDate = document.getElementById('export-date-selector').value;
                    modal.remove();
                    resolve(selectedDate);
                };
                
                document.getElementById('export-date-cancel-btn').onclick = () => {
                    modal.remove();
                    resolve(null);
                };
            });
        });
    }
};

window.Reports = Reports;
