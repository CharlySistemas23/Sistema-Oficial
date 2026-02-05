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
            
            // DESHABILITADO: No registrar costos automáticamente
            // El usuario debe crear los costos manualmente desde el módulo de llegadas
            // Esto evita que se generen costos no deseados de datos demo o históricos
            if (totalFromArrivals > 0 && totalFromCosts === 0) {
                console.warn(`⚠️ Se encontraron ${dayArrivals.length} llegadas sin costos registrados para ${dateStr}, pero NO se crearán automáticamente. El usuario debe crear los costos manualmente si lo desea.`);
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
            <div class="module" style="padding: 8px; background: white; border-radius: 4px; border: 1px solid #e0e0e0; margin-bottom: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.04);">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #f0f0f0;">
                    <div style="width: 2px; height: 14px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 1px;"></div>
                    <h3 style="margin: 0; font-size: 11px; font-weight: 600; color: #333; text-transform: uppercase; letter-spacing: 0.2px;">
                        <i class="fas fa-plus-circle" style="color: #667eea; margin-right: 3px; font-size: 10px;"></i> Nueva Captura
                    </h3>
                </div>
                <form id="quick-capture-form" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 6px;">
                    ${isMasterAdmin ? `
                    <div class="form-group">
                        <label>Sucursal <span style="color: var(--color-danger);">*</span></label>
                        <select id="qc-branch" class="form-select" required>
                            <option value="">Seleccionar...</option>
                        </select>
                    </div>
                    ` : ''}
                    <div class="form-group" style="margin: 0;">
                        <label style="font-size: 10px; margin-bottom: 3px; display: block;">Vendedor <span style="color: var(--color-danger);">*</span></label>
                        <select id="qc-seller" class="form-select" required style="font-size: 11px; padding: 5px;">
                            <option value="">Seleccionar...</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin: 0;">
                        <label style="font-size: 10px; margin-bottom: 3px; display: block;">Guía</label>
                        <select id="qc-guide" class="form-select" style="font-size: 11px; padding: 5px;">
                            <option value="">Ninguno</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin: 0;">
                        <label style="font-size: 10px; margin-bottom: 3px; display: block;">Agencia</label>
                        <select id="qc-agency" class="form-select" style="font-size: 11px; padding: 5px;">
                            <option value="">Ninguna</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin: 0;">
                        <label style="font-size: 10px; margin-bottom: 3px; display: block;">Producto <span style="color: var(--color-danger);">*</span></label>
                        <input type="text" id="qc-product" class="form-input" placeholder="Nombre del producto" required style="font-size: 11px; padding: 5px;">
                    </div>
                    <div class="form-group" style="margin: 0;">
                        <label style="font-size: 10px; margin-bottom: 3px; display: block;">Cantidad <span style="color: var(--color-danger);">*</span></label>
                        <input type="number" id="qc-quantity" class="form-input" min="1" step="1" value="1" required style="font-size: 11px; padding: 5px;">
                    </div>
                    <div class="form-group" style="margin: 0;">
                        <label style="font-size: 10px; margin-bottom: 3px; display: block;">Fecha <span style="color: var(--color-danger);">*</span></label>
                        <input type="date" id="qc-date" class="form-input" value="${today}" required style="font-size: 11px; padding: 5px;">
                    </div>
                    <div class="form-group" style="display: none;">
                        <label>Tipo de Moneda <span style="color: var(--color-danger);">*</span></label>
                        <select id="qc-currency" class="form-select" required>
                            <option value="MXN">MXN</option>
                            <option value="USD">USD</option>
                            <option value="CAD">CAD</option>
                        </select>
                        <small style="color: var(--color-text-secondary); font-size: 9px;">Nota: La moneda ahora se especifica por cada pago individual</small>
                    </div>
                    <!-- Sección de Pagos y Campos Adicionales en Grid -->
                    <div class="form-group" style="grid-column: 1 / -1; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 4px;">
                        <!-- Columna Izquierda: Pagos (reducida) -->
                        <div style="padding: 6px; background: #f8f9fa; border-radius: 3px; border: 1px solid #dee2e6;">
                            <label style="font-weight: 600; margin-bottom: 4px; display: block; font-size: 10px;">Pagos <span style="color: var(--color-danger);">*</span></label>
                            <div id="qc-payments-container" style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 4px;">
                                <div class="payment-row" style="display: grid; grid-template-columns: 1fr 70px 90px 40px; gap: 3px; align-items: center; padding: 3px; background: white; border-radius: 3px; border: 1px solid #dee2e6;">
                                    <select class="form-select payment-method" required style="border: 1px solid #ced4da; font-size: 10px; padding: 4px;">
                                    <option value="">Método...</option>
                                    <option value="cash">Efectivo</option>
                                    <option value="card">Tarjeta</option>
                                    <option value="transfer">Transferencia</option>
                                    <option value="other">Otro</option>
                                </select>
                                    <select class="form-select payment-currency" required style="border: 1px solid #ced4da; font-size: 10px; padding: 4px;">
                                        <option value="MXN">MXN</option>
                                        <option value="USD">USD</option>
                                        <option value="CAD">CAD</option>
                                    </select>
                                    <input type="number" class="form-input payment-amount" min="0" step="0.01" placeholder="0.00" required style="border: 1px solid #ced4da; font-size: 10px; padding: 4px;">
                                    <button type="button" class="btn-danger btn-xs remove-payment" style="display: none; padding: 3px 5px; font-size: 9px;" onclick="this.closest('.payment-row').remove(); window.Reports.updatePaymentsTotal();">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 4px; border-top: 1px solid #dee2e6;">
                                <button type="button" class="btn-secondary btn-xs" onclick="window.Reports.addPaymentRow()" style="font-weight: 600; padding: 4px 8px; font-size: 10px;">
                                    <i class="fas fa-plus"></i> Agregar
                            </button>
                                <div style="font-weight: 700; font-size: 11px; color: #495057; padding: 3px 6px; background: white; border-radius: 3px; border: 1px solid #28a745;">
                                Total: <span id="qc-payments-total" style="color: #28a745;">$0.00</span>
                            </div>
                        </div>
                        <input type="hidden" id="qc-total" value="0">
                            <small style="color: #6c757d; font-size: 8px; margin-top: 3px; display: block; line-height: 1.2;">💡 Múltiples pagos con diferentes monedas se convierten automáticamente a MXN</small>
                    </div>
                        
                        <!-- Columna Derecha: Costo, Notas y Venta de Calle -->
                        <div style="display: flex; flex-direction: column; gap: 6px;">
                            <div class="form-group" style="margin: 0;">
                                <label style="font-size: 10px; margin-bottom: 3px; display: block;">Costo (MXN)</label>
                                <input type="number" id="qc-cost" class="form-input" min="0" step="0.01" placeholder="0.00" style="font-size: 11px; padding: 5px;">
                    </div>
                            <div class="form-group" style="margin: 0;">
                                <label style="font-size: 10px; margin-bottom: 3px; display: block;">Notas</label>
                                <input type="text" id="qc-notes" class="form-input" placeholder="Opcional" style="font-size: 11px; padding: 5px;">
                    </div>
                            <div class="form-group" style="margin: 0; display: flex; align-items: center; gap: 4px; padding-top: 4px;">
                            <input type="checkbox" id="qc-is-street" style="width: auto; margin: 0;">
                                <label style="font-size: 10px; margin: 0; cursor: pointer;">Es venta de calle</label>
                    </div>
                        </div>
                    </div>
                    <div class="form-group" id="qc-payment-method-group" style="display: none; margin: 0;">
                        <label style="font-size: 10px; margin-bottom: 3px; display: block;">Método (Calle) <span style="color: var(--color-danger);">*</span></label>
                        <select id="qc-payment-method" class="form-select" style="font-size: 11px; padding: 5px;">
                            <option value="">Seleccionar...</option>
                            <option value="card">Tarjeta</option>
                            <option value="cash">Efectivo</option>
                        </select>
                    </div>
                    <div class="form-group" style="grid-column: 1 / -1; margin-top: 4px;">
                        <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 6px; padding: 5px 8px; background: #f8f9fa; border-radius: 3px; border: 1px solid #dee2e6;">
                            <div style="flex: 1;">
                                <div style="font-size: 8px; color: #6c757d; margin-bottom: 2px; text-transform: uppercase; font-weight: 600;">Tipo de Cambio</div>
                                <div id="qc-exchange-rates-display" style="font-size: 10px; font-weight: 500; color: #495057;">
                                    <i class="fas fa-spinner fa-spin"></i> Obteniendo...
                                </div>
                            </div>
                            <button type="button" class="btn-secondary btn-xs" onclick="window.Reports.refreshExchangeRates()" title="Actualizar" style="padding: 4px 6px; font-size: 9px;">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                            <button type="submit" class="btn-primary btn-sm" style="padding: 6px 8px; font-weight: 600; font-size: 11px;">
                                <i class="fas fa-plus-circle"></i> Agregar
                            </button>
                            <button type="button" class="btn-success btn-sm" onclick="window.Reports.saveAllPendingCaptures()" style="padding: 6px 8px; font-weight: 600; font-size: 11px;" id="save-all-pending-btn" disabled>
                                <i class="fas fa-save"></i> Guardar (<span id="pending-count-header">0</span>)
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
                            <span id="captures-date-display" style="color: #6c757d; font-size: 10px; font-weight: 400; margin-left: 4px;">(${today})</span>
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
                            <label>Fecha <span style="color: var(--color-danger);">*</span></label>
                            <input type="date" id="qc-arrival-date" class="form-input" required>
                            <small style="color: var(--color-text-secondary); font-size: 9px;">Fecha de la llegada (se sincroniza con la fecha del formulario principal)</small>
                        </div>
                        <div class="form-group">
                            <label>Guía <span style="color: var(--color-danger);">*</span></label>
                            <select id="qc-arrival-guide" class="form-select" required>
                                <option value="">Seleccionar...</option>
                            </select>
                            <small style="color: var(--color-text-secondary); font-size: 9px;">La agencia se detectará automáticamente</small>
                        </div>
                        <div class="form-group">
                            <label>Agencia <span style="color: var(--color-danger);">*</span></label>
                            <select id="qc-arrival-agency" class="form-select" required>
                                <option value="">Seleccionar agencia...</option>
                            </select>
                            <small style="color: var(--color-text-secondary); font-size: 9px;">Selecciona la agencia para filtrar los guías disponibles</small>
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
            // Sincronizar fecha del formulario principal con el formulario de llegadas
            const mainDateInput = document.getElementById('qc-date');
            const arrivalDateInput = document.getElementById('qc-arrival-date');
            
            if (mainDateInput && arrivalDateInput) {
                // Inicializar con la fecha del formulario principal
                const today = new Date().toISOString().split('T')[0];
                if (!mainDateInput.value) {
                    mainDateInput.value = today;
                }
                arrivalDateInput.value = mainDateInput.value;
                
                // Sincronizar cuando cambie la fecha del formulario principal
                mainDateInput.addEventListener('change', () => {
                    if (arrivalDateInput) {
                        arrivalDateInput.value = mainDateInput.value;
                    }
                    // Recargar datos cuando cambie la fecha
                    this.loadQuickCaptureData();
                    this.loadQuickCaptureArrivals();
                });
                
                // Sincronizar cuando cambie la fecha del formulario de llegadas
                arrivalDateInput.addEventListener('change', () => {
                    if (mainDateInput) {
                        mainDateInput.value = arrivalDateInput.value;
                    }
                    // Recargar datos cuando cambie la fecha
                    this.loadQuickCaptureData();
                    this.loadQuickCaptureArrivals();
                });
            }
            
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
                        let agencyId = agencySelect?.value;
                        const unitType = unitTypeSelect?.value || null;
                        
                        // Si no hay agencia pero hay guía seleccionado, intentar obtener la agencia del guía
                        const guideSelect = document.getElementById('qc-arrival-guide');
                        if (!agencyId && guideSelect && guideSelect.value) {
                            try {
                                const guides = await DB.getAll('catalog_guides') || [];
                                const selectedGuide = guides.find(g => g.id === guideSelect.value);
                                if (selectedGuide && selectedGuide.agency_id) {
                                    agencyId = selectedGuide.agency_id;
                                    console.log('🔍 [Cálculo Costo] Agencia auto-detectada del guía:', {
                                        guideId: guideSelect.value,
                                        guideName: selectedGuide.name,
                                        agencyId: agencyId
                                    });
                                    // Auto-seleccionar la agencia en el select
                                    if (agencySelect) {
                                        agencySelect.value = agencyId;
                                    }
                                } else {
                                    console.warn('⚠️ [Cálculo Costo] El guía seleccionado no tiene agencia asignada');
                                }
                            } catch (e) {
                                console.warn('Error obteniendo agencia del guía:', e);
                            }
                        }
                        
                        // Calcular costo si hay pasajeros, unidades y agencia (o guía con agencia)
                        const costInput = document.getElementById('qc-arrival-cost');
                        const costHelp = document.getElementById('qc-arrival-cost-help');
                        
                        if (!pax || pax <= 0) {
                            if (costInput) costInput.value = '0.00';
                            if (costHelp) {
                                costHelp.textContent = 'Ingresa la cantidad de pasajeros para calcular el costo';
                                costHelp.style.color = 'var(--color-text-secondary)';
                            }
                            return;
                        }
                        
                        if (!units || units <= 0) {
                            if (costInput) costInput.value = '0.00';
                            if (costHelp) {
                                costHelp.textContent = 'Ingresa la cantidad de unidades para calcular el costo';
                                costHelp.style.color = 'var(--color-text-secondary)';
                            }
                            return;
                        }
                        
                        if (!agencyId) {
                            if (costInput) costInput.value = '0.00';
                            if (costHelp) {
                                costHelp.textContent = 'Selecciona un guía para calcular el costo automáticamente';
                                costHelp.style.color = 'var(--color-text-secondary)';
                            }
                            return;
                        }
                        
                        // Si tenemos todos los datos necesarios, calcular
                            const isMasterAdmin = typeof UserManager !== 'undefined' && (
                                UserManager.currentUser?.role === 'master_admin' ||
                                UserManager.currentUser?.is_master_admin ||
                                UserManager.currentUser?.isMasterAdmin
                            );
                            const currentBranchId = typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : null;
                            const branchId = isMasterAdmin && branchSelect?.value 
                                ? branchSelect.value 
                                : currentBranchId;
                            
                        if (!branchId) {
                            if (costInput) costInput.value = '0.00';
                            if (costHelp) {
                                costHelp.textContent = 'No se pudo determinar la sucursal';
                                costHelp.style.color = 'var(--color-text-secondary)';
                            }
                            return;
                        }
                        
                        // Obtener fecha del formulario de llegadas o del formulario principal
                        const arrivalDateInput = document.getElementById('qc-arrival-date');
                        const mainDateInput = document.getElementById('qc-date');
                        const arrivalDate = arrivalDateInput?.value || mainDateInput?.value || new Date().toISOString().split('T')[0];
                        
                                if (typeof ArrivalRules !== 'undefined' && ArrivalRules.calculateArrivalFee) {
                            try {
                                console.log('🔍 [Cálculo Costo] Parámetros:', {
                                    agencyId,
                                    branchId,
                                    pax,
                                    unitType,
                                    arrivalDate
                                });
                                
                                const calculation = await ArrivalRules.calculateArrivalFee(agencyId, branchId, pax, unitType, arrivalDate);
                                
                                console.log('💰 [Cálculo Costo] Resultado:', calculation);
                                    
                                    if (costInput) {
                                    const calculatedFee = calculation.calculatedFee || 0;
                                    costInput.value = calculatedFee.toFixed(2);
                                    costInput.style.color = '';
                                            if (costHelp) {
                                        if (calculatedFee > 0) {
                                            costHelp.textContent = `Costo calculado automáticamente: $${calculatedFee.toFixed(2)} MXN (${pax} pasajeros${unitType ? ', ' + unitType : ''})`;
                                            costHelp.style.color = 'var(--color-success, #28a745)';
                                        } else {
                                            const errorMsg = calculation.message || 'No hay regla configurada para esta combinación. Verifica las reglas de llegadas.';
                                            costHelp.textContent = errorMsg;
                                                costHelp.style.color = 'var(--color-warning, #ffc107)';
                                            console.warn('⚠️ [Cálculo Costo] No se encontró regla:', errorMsg);
                                        }
                                    }
                                }
                            } catch (error) {
                                console.error('❌ [Cálculo Costo] Error:', error);
                                if (costInput) costInput.value = '0.00';
                                if (costHelp) {
                                    costHelp.textContent = `Error al calcular el costo: ${error.message}`;
                                    costHelp.style.color = 'var(--color-danger, #dc3545)';
                                }
                                            }
                                        } else {
                            console.error('❌ [Cálculo Costo] ArrivalRules no está disponible');
                            if (costInput) costInput.value = '0.00';
                                            if (costHelp) {
                                costHelp.textContent = 'Sistema de cálculo no disponible';
                                                costHelp.style.color = 'var(--color-text-secondary)';
                                            }
                        }
                    } catch (error) {
                        console.error('Error calculando costo de llegada:', error);
                    }
                };
                
                // Event listeners para recalcular automáticamente
                if (paxInput) {
                    paxInput.addEventListener('input', calculateArrivalCost);
                    paxInput.addEventListener('change', calculateArrivalCost);
                }
                if (unitsInput) {
                    unitsInput.addEventListener('input', calculateArrivalCost);
                    unitsInput.addEventListener('change', calculateArrivalCost);
                }
                if (agencySelect) {
                    agencySelect.addEventListener('change', calculateArrivalCost);
                }
                if (unitTypeSelect) {
                    unitTypeSelect.addEventListener('change', calculateArrivalCost);
                }
                if (branchSelect) {
                    branchSelect.addEventListener('change', calculateArrivalCost);
                }
                
                // Calcular costo inicial si ya hay valores en los campos
                setTimeout(async () => {
                    await calculateArrivalCost();
                }, 500);
                
                // Auto-detectar agencia cuando se selecciona un guía
                const guideSelect = document.getElementById('qc-arrival-guide');
                let isAutoSelectingAgency = false; // Flag para evitar limpiar el guía cuando se auto-selecciona la agencia
                
                if (guideSelect) {
                    guideSelect.addEventListener('change', async () => {
                        const selectedGuideId = guideSelect.value;
                        if (selectedGuideId) {
                            try {
                                const guides = await DB.getAll('catalog_guides') || [];
                                const selectedGuide = guides.find(g => g.id === selectedGuideId);
                                
                                if (selectedGuide && selectedGuide.agency_id) {
                                    // Marcar que estamos auto-seleccionando la agencia
                                    isAutoSelectingAgency = true;
                                    
                                    // Auto-seleccionar la agencia del guía
                                    if (agencySelect) {
                                        const previousAgencyId = agencySelect.value;
                                        agencySelect.value = selectedGuide.agency_id;
                                        
                                        // Solo filtrar guías si la agencia cambió
                                        if (previousAgencyId !== selectedGuide.agency_id) {
                                            // Filtrar guías por la agencia (sin limpiar la selección del guía)
                                            await this.loadGuidesForAgencyInArrivalsForm(selectedGuide.agency_id);
                                        }
                                        
                                        // Asegurar que el guía seleccionado esté en la lista
                                        // Si no está, agregarlo manualmente
                                        const guideOption = guideSelect.querySelector(`option[value="${selectedGuideId}"]`);
                                        if (!guideOption) {
                                            // El guía no está en la lista filtrada, agregarlo
                                            const option = document.createElement('option');
                                            option.value = selectedGuideId;
                                            option.textContent = selectedGuide.name;
                                            guideSelect.appendChild(option);
                                        }
                                        
                                        // Restaurar la selección del guía después de filtrar
                                        guideSelect.value = selectedGuideId;
                                        
                                        // Esperar un momento para que el cambio se procese y luego recalcular
                                        setTimeout(async () => {
                                            await calculateArrivalCost();
                                            isAutoSelectingAgency = false;
                                        }, 100);
                                    } else {
                                        // Si la agencia ya estaba seleccionada, solo recalcular
                                        setTimeout(async () => {
                                            await calculateArrivalCost();
                                            isAutoSelectingAgency = false;
                                        }, 100);
                                    }
                                    
                                    // Recargar llegadas filtradas por el guía seleccionado
                                    await this.loadQuickCaptureArrivals();
                                } else {
                                    Utils.showNotification('El guía seleccionado no tiene agencia asignada', 'warning');
                                    // Limpiar costo si no hay agencia
                                    const costInput = document.getElementById('qc-arrival-cost');
                                    if (costInput) {
                                        costInput.value = '0.00';
                                    }
                                    // Recargar llegadas sin filtro de guía
                                    await this.loadQuickCaptureArrivals();
                                }
                            } catch (error) {
                                console.error('Error auto-detectando agencia:', error);
                                isAutoSelectingAgency = false;
                            }
                        } else {
                            // Limpiar agencia y costo si no hay guía seleccionado
                            if (agencySelect) {
                                agencySelect.value = '';
                            }
                            const costInput = document.getElementById('qc-arrival-cost');
                            if (costInput) {
                                costInput.value = '0.00';
                            }
                            // Recargar llegadas sin filtro de guía
                            await this.loadQuickCaptureArrivals();
                        }
                    });
                }
                
                // Filtrar guías cuando se selecciona una agencia manualmente
                if (agencySelect) {
                    agencySelect.addEventListener('change', async () => {
                        // Solo procesar si NO estamos auto-seleccionando desde el guía
                        if (!isAutoSelectingAgency) {
                            const selectedAgencyId = agencySelect.value;
                            
                            // Guardar el guía actualmente seleccionado ANTES de filtrar
                            const currentGuideId = guideSelect?.value || null;
                            
                            // Verificar si el guía actualmente seleccionado pertenece a la nueva agencia
                            let shouldKeepGuide = false;
                            let currentGuide = null;
                            
                            if (guideSelect && currentGuideId) {
                                try {
                                    const guides = await DB.getAll('catalog_guides') || [];
                                    currentGuide = guides.find(g => this.compareIds(g.id, currentGuideId));
                                    if (currentGuide && currentGuide.agency_id) {
                                        // Verificar si el guía pertenece a la agencia seleccionada
                                        shouldKeepGuide = this.compareIds(currentGuide.agency_id, selectedAgencyId);
                                        
                                        // Si no coincide por ID, intentar comparar por nombre (más flexible)
                                        if (!shouldKeepGuide) {
                                            const agencies = await DB.getAll('catalog_agencies') || [];
                                            const guideAgency = agencies.find(a => this.compareIds(a.id, currentGuide.agency_id));
                                            const selectedAgency = agencies.find(a => this.compareIds(a.id, selectedAgencyId));
                                            if (guideAgency && selectedAgency) {
                                                const guideAgencyName = String(guideAgency.name || '').trim().toUpperCase();
                                                const selectedAgencyName = String(selectedAgency.name || '').trim().toUpperCase();
                                                
                                                // Normalizar espacios para comparar (ej: "TANITOURS" vs "TANI TOURS")
                                                const guideAgencyNameNormalized = guideAgencyName.replace(/\s+/g, '');
                                                const selectedAgencyNameNormalized = selectedAgencyName.replace(/\s+/g, '');
                                                
                                                shouldKeepGuide = guideAgencyName === selectedAgencyName || 
                                                                  guideAgencyName.includes(selectedAgencyName) || 
                                                                  selectedAgencyName.includes(guideAgencyName) ||
                                                                  guideAgencyNameNormalized === selectedAgencyNameNormalized ||
                                                                  guideAgencyNameNormalized.includes(selectedAgencyNameNormalized) ||
                                                                  selectedAgencyNameNormalized.includes(guideAgencyNameNormalized);
                                            }
                                        }
                                    }
                                } catch (error) {
                                    console.warn('Error verificando guía actual:', error);
                                }
                            }
                            
                            // Filtrar guías por la agencia seleccionada (esto actualiza el innerHTML del select)
                            await this.loadGuidesForAgencyInArrivalsForm(selectedAgencyId);
                            
                            // Después de cargar los guías, restaurar o limpiar según corresponda
                            if (guideSelect) {
                                // Esperar un momento para que el DOM se actualice
                                await new Promise(resolve => setTimeout(resolve, 50));
                                
                                if (shouldKeepGuide && currentGuideId) {
                                    // El guía pertenece a la nueva agencia, intentar restaurarlo
                                    const guideOption = guideSelect.querySelector(`option[value="${currentGuideId}"]`);
                                    if (guideOption) {
                                        // El guía está en la lista filtrada, restaurarlo
                                        guideSelect.value = currentGuideId;
                                        console.log(`✅ [Llegadas] Guía "${currentGuide?.name || currentGuideId}" restaurado para agencia ${selectedAgencyId}`);
                                    } else if (currentGuide) {
                                        // El guía no está en la lista filtrada pero debería estar, agregarlo
                                        try {
                                            const option = document.createElement('option');
                                            option.value = currentGuideId;
                                            option.textContent = currentGuide.name;
                                            // Insertar después de la opción "Seleccionar..."
                                            const firstOption = guideSelect.querySelector('option[value=""]');
                                            if (firstOption) {
                                                firstOption.insertAdjacentElement('afterend', option);
                                            } else {
                                                guideSelect.appendChild(option);
                                            }
                                            guideSelect.value = currentGuideId;
                                            console.log(`✅ [Llegadas] Guía "${currentGuide.name}" agregado manualmente a la lista`);
                                        } catch (error) {
                                            console.warn('Error agregando guía a la lista:', error);
                                            guideSelect.value = '';
                                        }
                                    } else {
                                        guideSelect.value = '';
                                    }
                                } else {
                                    // El guía no pertenece a la nueva agencia, limpiarlo
                                    guideSelect.value = '';
                                }
                            }
                            
                            // Recalcular costo si hay datos
                            await calculateArrivalCost();
                            // Recargar llegadas
                            await this.loadQuickCaptureArrivals();
                        }
                    });
                }
                
                // Nota: loadQuickCaptureArrivals ya se llama en el event listener anterior
                
                // Asegurar que el cálculo se ejecute cuando cambian pasajeros o tipo de unidad
                // incluso si la agencia aún no está seleccionada (se auto-detecta del guía)
                if (paxInput) {
                    paxInput.addEventListener('input', async () => {
                        // Si hay guía seleccionado pero no agencia, intentar auto-detectar primero
                        if (guideSelect && guideSelect.value && (!agencySelect || !agencySelect.value)) {
                            const selectedGuideId = guideSelect.value;
                            try {
                                const guides = await DB.getAll('catalog_guides') || [];
                                const selectedGuide = guides.find(g => g.id === selectedGuideId);
                                if (selectedGuide && selectedGuide.agency_id && agencySelect) {
                                    agencySelect.value = selectedGuide.agency_id;
                                }
                            } catch (e) {
                                console.warn('Error auto-detectando agencia al cambiar pasajeros:', e);
                            }
                        }
                        await calculateArrivalCost();
                    });
                }
                
                if (unitTypeSelect) {
                    unitTypeSelect.addEventListener('change', async () => {
                        // Si hay guía seleccionado pero no agencia, intentar auto-detectar primero
                        if (guideSelect && guideSelect.value && (!agencySelect || !agencySelect.value)) {
                            const selectedGuideId = guideSelect.value;
                            try {
                                const guides = await DB.getAll('catalog_guides') || [];
                                const selectedGuide = guides.find(g => g.id === selectedGuideId);
                                if (selectedGuide && selectedGuide.agency_id && agencySelect) {
                                    agencySelect.value = selectedGuide.agency_id;
                                }
                            } catch (e) {
                                console.warn('Error auto-detectando agencia al cambiar tipo de unidad:', e);
                            }
                        }
                        await calculateArrivalCost();
                    });
                }
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

            // Sincronizar capturas desde el servidor (bidireccional)
            await this.syncQuickCapturesFromServer();

            // Inicializar lista de capturas pendientes
            await this.loadPendingCaptures();
            
            // Cargar datos guardados del día
            await this.loadQuickCaptureData();
            
            // Escuchar actualizaciones del servidor en tiempo real
            this.setupQuickCaptureSocketListeners();
            
            // Escuchar actualizaciones de reportes archivados en tiempo real
            this.setupArchivedReportsSocketListeners();
            
            // Escuchar actualizaciones de reportes históricos en tiempo real
            this.setupHistoricalReportsSocketListeners();
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
                    // Actualizar total de pagos cuando cambian los tipos de cambio
                    if (this.updatePaymentsTotal) {
                        await this.updatePaymentsTotal();
                    }
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
                    // Actualizar total de pagos cuando cambian los tipos de cambio
                    if (this.updatePaymentsTotal) {
                        await this.updatePaymentsTotal();
                    }
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
            // Eliminar duplicados basándose en nombre y agencia
            const allGuides = await DB.getAll('catalog_guides') || [];
            const seenGuides = new Map(); // Usar Map para rastrear guías únicos por nombre+agencia
            const uniqueGuides = [];
            
            for (const guide of allGuides) {
                if (!guide.active && guide.active !== undefined) continue; // Saltar guías inactivos
                
                const guideName = (guide.name || '').trim().toUpperCase();
                const guideAgencyId = guide.agency_id || '';
                const key = `${guideName}_${guideAgencyId}`;
                
                // Si no hemos visto este guía con este nombre y agencia, agregarlo
                if (!seenGuides.has(key)) {
                    seenGuides.set(key, guide);
                    uniqueGuides.push(guide);
                } else {
                    // Si ya existe, mantener el primero encontrado (o el que tenga ID más bajo)
                    const existing = seenGuides.get(key);
                    if (guide.id < existing.id) {
                        // Reemplazar con el que tiene ID más bajo (probablemente el original)
                        const index = uniqueGuides.indexOf(existing);
                        if (index !== -1) {
                            uniqueGuides[index] = guide;
                            seenGuides.set(key, guide);
                        }
                    }
                }
            }
            
            const guideSelect = document.getElementById('qc-guide');
            if (guideSelect) {
                if (uniqueGuides.length > 0) {
                    // Ordenar guías por nombre para mejor UX
                    uniqueGuides.sort((a, b) => {
                        const nameA = (a.name || '').toUpperCase();
                        const nameB = (b.name || '').toUpperCase();
                        return nameA.localeCompare(nameB);
                    });
                    
                    guideSelect.innerHTML = '<option value="">Ninguno</option>' +
                        uniqueGuides.map(g => {
                            const agencyName = g.agency_id ? (agencies.find(a => this.compareIds(a.id, g.agency_id))?.name || '') : '';
                            return `<option value="${g.id}">${g.name}${agencyName ? ' (' + agencyName + ')' : ''}</option>`;
                        }).join('');
                    
                    const duplicatesRemoved = allGuides.length - uniqueGuides.length;
                    if (duplicatesRemoved > 0) {
                        console.log(`✅ ${uniqueGuides.length} guías únicos cargados (${duplicatesRemoved} duplicados eliminados)`);
                    } else {
                        console.log(`✅ ${uniqueGuides.length} guías cargados`);
                    }
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
                agencySelect.innerHTML = '<option value="">Seleccionar agencia...</option>' +
                    agencies.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
                console.log(`✅ [Llegadas] ${agencies.length} agencias permitidas cargadas: ${agencies.map(a => a.name).join(', ')}`);
            }

            // Cargar guías (se filtrarán por agencia cuando se seleccione una)
            const guides = await DB.getAll('catalog_guides') || [];
            const guideSelect = document.getElementById('qc-arrival-guide');
            if (guideSelect) {
                // Verificar si ya hay una agencia seleccionada al cargar
                const agencySelect = document.getElementById('qc-arrival-agency');
                const preSelectedAgencyId = agencySelect?.value;
                
                if (preSelectedAgencyId) {
                    // Si ya hay una agencia seleccionada, cargar solo los guías de esa agencia
                    console.log(`🔍 [Llegadas] Agencia pre-seleccionada detectada: ${preSelectedAgencyId}, cargando guías...`);
                    await this.loadGuidesForAgencyInArrivalsForm(preSelectedAgencyId);
                } else {
                    // Inicialmente mostrar todos los guías
                    await this.loadGuidesForAgencyInArrivalsForm(null);
                }
            }
        } catch (error) {
            console.error('Error cargando catálogos de llegadas:', error);
        }
    },

    async saveQuickArrival() {
        try {
            const guideId = document.getElementById('qc-arrival-guide')?.value;
            const agencyId = document.getElementById('qc-arrival-agency')?.value;
            const date = document.getElementById('qc-arrival-date')?.value;
            const pax = parseInt(document.getElementById('qc-arrival-pax')?.value || 0);
            const units = parseInt(document.getElementById('qc-arrival-units')?.value || 0);
            const unitType = document.getElementById('qc-arrival-unit-type')?.value || null;
            const cost = parseFloat(document.getElementById('qc-arrival-cost')?.value || 0);
            const notes = document.getElementById('qc-arrival-notes')?.value || '';
            
            const isMasterAdmin = typeof UserManager !== 'undefined' && (
                UserManager.currentUser?.role === 'master_admin' ||
                UserManager.currentUser?.is_master_admin
            );
            const currentBranchId = typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : null;
            const branchId = isMasterAdmin && document.getElementById('qc-arrival-branch')?.value
                ? document.getElementById('qc-arrival-branch').value
                : currentBranchId;

            // Validaciones
            if (!guideId) {
                Utils.showNotification('Debes seleccionar un guía', 'error');
                return;
            }
            if (!agencyId) {
                Utils.showNotification('La agencia es requerida (debe detectarse automáticamente al seleccionar el guía)', 'error');
                return;
            }
            if (!date) {
                Utils.showNotification('La fecha es requerida', 'error');
                return;
            }
            if (pax <= 0) {
                Utils.showNotification('El número de pasajeros debe ser mayor a 0', 'error');
                return;
            }
            if (units <= 0) {
                Utils.showNotification('El número de unidades debe ser mayor a 0', 'error');
                return;
            }

            // Crear objeto de llegada
            const arrival = {
                id: 'arrival_' + Date.now(),
                guide_id: guideId,
                agency_id: agencyId,
                date: date,
                passengers: pax,
                units: units,
                unit_type: unitType,
                calculated_fee: cost,
                branch_id: branchId,
                notes: notes,
                created_at: new Date().toISOString()
            };

            // Guardar localmente
            await DB.put('agency_arrivals', arrival);

            // Guardar en servidor si está disponible
            if (typeof API !== 'undefined' && API.createArrival) {
                try {
                    const serverArrival = await API.createArrival({
                        guide_id: guideId,
                        agency_id: agencyId,
                        date: date,
                        passengers: pax,
                        units: units,
                        unit_type: unitType,
                        branch_id: branchId,
                        notes: notes
                    });
                    if (serverArrival && serverArrival.id) {
                        arrival.server_id = serverArrival.id;
                        arrival.id = serverArrival.id;
                        await DB.put('agency_arrivals', arrival);
                    }
                } catch (apiError) {
                    console.warn('No se pudo guardar llegada en servidor:', apiError);
                    // Continuar aunque falle el servidor
                }
            }

            Utils.showNotification('Llegada guardada correctamente', 'success');

            // Limpiar formulario
            document.getElementById('quick-arrivals-form')?.reset();
            const arrivalDateInput = document.getElementById('qc-arrival-date');
            const mainDateInput = document.getElementById('qc-date');
            if (arrivalDateInput && mainDateInput) {
                arrivalDateInput.value = mainDateInput.value;
            }

            // Recargar lista de llegadas
            await this.loadQuickCaptureArrivals();
        } catch (error) {
            console.error('Error guardando llegada:', error);
            Utils.showNotification('Error al guardar llegada: ' + error.message, 'error');
        }
    },

    async loadGuidesForAgencyInArrivalsForm(agencyId) {
        try {
            const guides = await DB.getAll('catalog_guides') || [];
            const agencies = await DB.getAll('catalog_agencies') || [];
            const guideSelect = document.getElementById('qc-arrival-guide');
            
            if (!guideSelect) return;

            console.log(`🔍 [Llegadas] Cargando guías para agencia: ${agencyId || 'TODAS'}`);

            if (!agencyId || agencyId === '') {
                // Si no hay agencia seleccionada, mostrar TODAS las guías (eliminando duplicados)
                if (guides.length > 0) {
                    // Eliminar duplicados basándose en nombre y agencia
                    const seenGuides = new Map();
                    const uniqueGuides = [];
                    
                    for (const guide of guides) {
                        if (!guide.active && guide.active !== undefined) continue;
                        
                        const guideName = (guide.name || '').trim().toUpperCase();
                        const guideAgencyId = guide.agency_id || '';
                        const key = `${guideName}_${guideAgencyId}`;
                        
                        if (!seenGuides.has(key)) {
                            seenGuides.set(key, guide);
                            uniqueGuides.push(guide);
                        }
                    }
                    
                    // Ordenar por nombre
                    uniqueGuides.sort((a, b) => {
                        const nameA = (a.name || '').toUpperCase();
                        const nameB = (b.name || '').toUpperCase();
                        return nameA.localeCompare(nameB);
                    });
                    
                    guideSelect.innerHTML = '<option value="">Seleccionar...</option>' +
                        uniqueGuides.map(g => {
                            const agencyName = g.agency_id ? (agencies.find(a => this.compareIds(a.id, g.agency_id))?.name || '') : '';
                            return `<option value="${g.id}">${g.name}${agencyName ? ' (' + agencyName + ')' : ''}</option>`;
                        }).join('');
                    
                    const duplicatesRemoved = guides.length - uniqueGuides.length;
                    if (duplicatesRemoved > 0) {
                        console.log(`✅ [Llegadas] ${uniqueGuides.length} guías únicos cargados (${duplicatesRemoved} duplicados eliminados)`);
                    }
                } else {
                    guideSelect.innerHTML = '<option value="">No hay guías disponibles</option>';
                }
                return;
            }

            // Buscar la agencia seleccionada
            const selectedAgency = agencies.find(a => this.compareIds(a.id, agencyId));
            if (!selectedAgency) {
                console.warn(`⚠️ [Llegadas] Agencia con ID ${agencyId} no encontrada`);
                // Si no se encuentra la agencia, mostrar todas las guías (eliminando duplicados)
                if (guides.length > 0) {
                    // Eliminar duplicados
                    const seenGuides = new Map();
                    const uniqueGuides = [];
                    
                    for (const guide of guides) {
                        if (!guide.active && guide.active !== undefined) continue;
                        
                        const guideName = (guide.name || '').trim().toUpperCase();
                        const guideAgencyId = guide.agency_id || '';
                        const key = `${guideName}_${guideAgencyId}`;
                        
                        if (!seenGuides.has(key)) {
                            seenGuides.set(key, guide);
                            uniqueGuides.push(guide);
                        }
                    }
                    
                    // Ordenar por nombre
                    uniqueGuides.sort((a, b) => {
                        const nameA = (a.name || '').toUpperCase();
                        const nameB = (b.name || '').toUpperCase();
                        return nameA.localeCompare(nameB);
                    });
                    
                    guideSelect.innerHTML = '<option value="">Seleccionar...</option>' +
                        uniqueGuides.map(g => {
                            const agencyName = g.agency_id ? (agencies.find(a => this.compareIds(a.id, g.agency_id))?.name || '') : '';
                            return `<option value="${g.id}">${g.name}${agencyName ? ' (' + agencyName + ')' : ''}</option>`;
                        }).join('');
                } else {
                    guideSelect.innerHTML = '<option value="">No hay guías disponibles</option>';
                }
                return;
            }

            console.log(`   [Llegadas] Agencia seleccionada: ${selectedAgency.name} (ID: ${selectedAgency.id})`);
            console.log(`   [Llegadas] Total guías en DB: ${guides.length}`);

            // Filtrar guías por agencia seleccionada
            const filteredGuides = guides.filter(g => {
                if (!g.agency_id) {
                    return false;
                }
                
                // Comparar por ID (método principal)
                let matches = this.compareIds(g.agency_id, agencyId);
                
                // Si no coincide por ID, intentar comparar por nombre de agencia (método fallback)
                if (!matches) {
                    const guideAgency = agencies.find(a => this.compareIds(a.id, g.agency_id));
                    if (guideAgency) {
                        const selectedName = String(selectedAgency.name || '').trim().toUpperCase();
                        const guideAgencyName = String(guideAgency.name || '').trim().toUpperCase();
                        
                        // Comparación flexible por nombre (incluye variaciones como "TANITOURS" vs "TANI TOURS")
                        // Normalizar espacios para comparar
                        const selectedNameNormalized = selectedName.replace(/\s+/g, '');
                        const guideAgencyNameNormalized = guideAgencyName.replace(/\s+/g, '');
                        
                        matches = selectedName === guideAgencyName || 
                                 selectedName.includes(guideAgencyName) || 
                                 guideAgencyName.includes(selectedName) ||
                                 selectedNameNormalized === guideAgencyNameNormalized ||
                                 selectedNameNormalized.includes(guideAgencyNameNormalized) ||
                                 guideAgencyNameNormalized.includes(selectedNameNormalized);
                    }
                }
                
                // Si aún no coincide, intentar comparar directamente el agency_id del guía con el nombre de la agencia seleccionada
                // (por si hay guías que tienen el nombre de la agencia en lugar del ID)
                if (!matches) {
                    const guideAgencyIdStr = String(g.agency_id || '').trim().toUpperCase();
                    const selectedName = String(selectedAgency.name || '').trim().toUpperCase();
                    const selectedNameNormalized = selectedName.replace(/\s+/g, '');
                    const guideAgencyIdNormalized = guideAgencyIdStr.replace(/\s+/g, '');
                    
                    matches = guideAgencyIdStr === selectedName || 
                             guideAgencyIdStr.includes(selectedName) || 
                             selectedName.includes(guideAgencyIdStr) ||
                             guideAgencyIdNormalized === selectedNameNormalized ||
                             guideAgencyIdNormalized.includes(selectedNameNormalized) ||
                             selectedNameNormalized.includes(guideAgencyIdNormalized);
                }
                
                return matches;
            });

            console.log(`   [Llegadas] Guías filtradas: ${filteredGuides.length}`);
            if (filteredGuides.length === 0) {
                console.warn(`   ⚠️ [Llegadas] No se encontraron guías para ${selectedAgency.name}.`);
                console.log(`   [Llegadas] Debug: Primeros 10 guías disponibles con agency_id:`, 
                    guides.filter(g => g.agency_id).slice(0, 10).map(g => ({
                        name: g.name,
                        agency_id: g.agency_id,
                        agency_name: agencies.find(a => this.compareIds(a.id, g.agency_id))?.name || 'N/A'
                    }))
                );
            }
            
            // Eliminar duplicados de guías filtrados
            const seenFilteredGuides = new Map();
            const uniqueFilteredGuides = [];
            
            for (const guide of filteredGuides) {
                if (!guide.active && guide.active !== undefined) continue;
                
                const guideName = (guide.name || '').trim().toUpperCase();
                const key = guideName;
                
                if (!seenFilteredGuides.has(key)) {
                    seenFilteredGuides.set(key, guide);
                    uniqueFilteredGuides.push(guide);
                }
            }
            
            if (uniqueFilteredGuides.length > 0) {
                // Ordenar por nombre
                uniqueFilteredGuides.sort((a, b) => {
                    const nameA = (a.name || '').toUpperCase();
                    const nameB = (b.name || '').toUpperCase();
                    return nameA.localeCompare(nameB);
                });
                
                guideSelect.innerHTML = '<option value="">Seleccionar...</option>' +
                    uniqueFilteredGuides.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
                
                const duplicatesRemoved = filteredGuides.length - uniqueFilteredGuides.length;
                if (duplicatesRemoved > 0) {
                    console.log(`✅ [Llegadas] ${uniqueFilteredGuides.length} guías únicos cargados para agencia ${selectedAgency.name} (${duplicatesRemoved} duplicados eliminados)`);
                } else {
                    console.log(`✅ [Llegadas] ${uniqueFilteredGuides.length} guías cargadas para agencia ${selectedAgency.name}`);
                }
            } else {
                console.warn(`⚠️ [Llegadas] No se encontraron guías para la agencia ${selectedAgency.name}`);
                guideSelect.innerHTML = '<option value="">No hay guías para esta agencia</option>';
            }
        } catch (error) {
            console.error('[Llegadas] Error cargando guías:', error);
            const guideSelect = document.getElementById('qc-arrival-guide');
            if (guideSelect) {
                guideSelect.innerHTML = '<option value="">Error cargando guías</option>';
            }
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
            // Usar comparación flexible de IDs Y nombres de agencia
            const filteredGuides = guides.filter(g => {
                if (!g.agency_id) {
                    return false; // Guías sin agencia no se muestran cuando hay una agencia seleccionada
                }
                
                // Primero intentar comparar por ID
                let matches = this.compareIds(g.agency_id, agencyId);
                
                // Si no coincide por ID, intentar comparar por nombre de agencia
                if (!matches) {
                    const guideAgency = agencies.find(a => this.compareIds(a.id, g.agency_id));
                    if (guideAgency) {
                        // Normalizar nombres para comparación flexible
                        const selectedName = String(selectedAgency.name || '').trim().toUpperCase();
                        const guideAgencyName = String(guideAgency.name || '').trim().toUpperCase();
                        matches = selectedName === guideAgencyName || 
                                 selectedName.includes(guideAgencyName) || 
                                 guideAgencyName.includes(selectedName);
                        
                if (matches) {
                            console.log(`   ✅ Guía encontrada por nombre: ${g.name} (agency: ${guideAgency.name}, agency_id: ${g.agency_id})`);
                }
                    }
                } else {
                    console.log(`   ✅ Guía encontrada por ID: ${g.name} (agency_id: ${g.agency_id})`);
                }
                
                return matches;
            });

            console.log(`   Guías filtradas: ${filteredGuides.length}`);

            // Si no se encontraron guías, mostrar todas las guías con sus agencias para debug
            if (filteredGuides.length === 0) {
                console.log(`   🔍 Debug: Todas las guías y sus agencias:`);
                guides.forEach(g => {
                    const guideAgency = agencies.find(a => this.compareIds(a.id, g.agency_id));
                    console.log(`      - ${g.name}: agency_id=${g.agency_id}, agency_name=${guideAgency?.name || 'N/A'}`);
                });
            }

            // Eliminar duplicados de guías filtrados
            const seenFilteredGuides = new Map();
            const uniqueFilteredGuides = [];
            
            for (const guide of filteredGuides) {
                if (!guide.active && guide.active !== undefined) continue;
                
                const guideName = (guide.name || '').trim().toUpperCase();
                const key = guideName;
                
                if (!seenFilteredGuides.has(key)) {
                    seenFilteredGuides.set(key, guide);
                    uniqueFilteredGuides.push(guide);
                }
            }
            
            if (uniqueFilteredGuides.length > 0) {
                // Ordenar por nombre
                uniqueFilteredGuides.sort((a, b) => {
                    const nameA = (a.name || '').toUpperCase();
                    const nameB = (b.name || '').toUpperCase();
                    return nameA.localeCompare(nameB);
                });
                
                guideSelect.innerHTML = '<option value="">Ninguno</option>' +
                    uniqueFilteredGuides.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
                
                const duplicatesRemoved = filteredGuides.length - uniqueFilteredGuides.length;
                if (duplicatesRemoved > 0) {
                    console.log(`✅ ${uniqueFilteredGuides.length} guías únicos cargados para agencia ${selectedAgency.name} (${duplicatesRemoved} duplicados eliminados)`);
                } else {
                    console.log(`✅ ${uniqueFilteredGuides.length} guías cargadas para agencia ${selectedAgency.name}`);
                }
            } else {
                // Si no hay guías para esta agencia, mostrar todas pero indicar que no hay para esta agencia
                console.warn(`⚠️ No se encontraron guías para la agencia ${selectedAgency.name}`);
                if (guides.length > 0) {
                    // También eliminar duplicados de todas las guías
                    const seenAllGuides = new Map();
                    const uniqueAllGuides = [];
                    
                    for (const guide of guides) {
                        if (!guide.active && guide.active !== undefined) continue;
                        
                        const guideName = (guide.name || '').trim().toUpperCase();
                        const key = guideName;
                        
                        if (!seenAllGuides.has(key)) {
                            seenAllGuides.set(key, guide);
                            uniqueAllGuides.push(guide);
                        }
                    }
                    
                    uniqueAllGuides.sort((a, b) => {
                        const nameA = (a.name || '').toUpperCase();
                        const nameB = (b.name || '').toUpperCase();
                        return nameA.localeCompare(nameB);
                    });
                    
                    guideSelect.innerHTML = '<option value="">Ninguno (no hay guías para esta agencia)</option>' +
                        uniqueAllGuides.map(g => {
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
        const allowedAgencies = ['TRAVELEX', 'VERANOS', 'TANITOURS', 'DISCOVERY', 'TB', 'TTF', 'TTD', 'TROPICAL ADVENTURE'];
        
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
            
            // Obtener tipos de cambio para convertir todos los pagos a MXN
            const exchangeRates = await this.getExchangeRatesForDate(captureDate);
            const usdRate = exchangeRates?.usd || 18.0;
            const cadRate = exchangeRates?.cad || 13.0;
            
            // Calcular total en MXN de todos los pagos (convirtiendo cada uno según su moneda)
            let totalMXN = 0;
            payments.forEach(payment => {
                const amount = parseFloat(payment.amount) || 0;
                const paymentCurrency = payment.currency || 'MXN';
                
                let amountMXN = amount;
                if (paymentCurrency === 'USD') {
                    amountMXN = amount * usdRate;
                } else if (paymentCurrency === 'CAD') {
                    amountMXN = amount * cadRate;
                }
                // Si es MXN, ya está en MXN
                
                totalMXN += amountMXN;
            });
            
            if (totalMXN <= 0) {
                Utils.showNotification('El total de los pagos debe ser mayor a 0', 'error');
                return;
            }
            
            // Determinar la moneda principal (la más usada o MXN por defecto)
            const currencyCounts = {};
            payments.forEach(p => {
                const curr = p.currency || 'MXN';
                currencyCounts[curr] = (currencyCounts[curr] || 0) + 1;
            });
            const mainCurrency = Object.keys(currencyCounts).reduce((a, b) => 
                currencyCounts[a] > currencyCounts[b] ? a : b, 'MXN'
            );
            
            const isStreet = document.getElementById('qc-is-street')?.checked || false;

            // Validar campos requeridos
            if (!branchId || !sellerId || !product || totalMXN <= 0) {
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
                        currency: mainCurrency, // Moneda principal (para compatibilidad)
                        total: totalMXN, // Total en MXN (convertido desde todos los pagos)
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
                    
                    // Limpiar formulario después de actualizar (pero mantener la fecha)
                    const currentDate = document.getElementById('qc-date')?.value || new Date().toISOString().split('T')[0];
                    document.getElementById('quick-capture-form')?.reset();
                    if (document.getElementById('qc-quantity')) {
                        document.getElementById('qc-quantity').value = '1';
                    }
                    // Restaurar la fecha después de resetear
                    if (document.getElementById('qc-date')) {
                        document.getElementById('qc-date').value = currentDate;
                    }
                    // Sincronizar fecha con formulario de llegadas
                    const arrivalDateInput = document.getElementById('qc-arrival-date');
                    if (arrivalDateInput) {
                        arrivalDateInput.value = currentDate;
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
                currency: mainCurrency, // Moneda principal (para compatibilidad)
                total: totalMXN, // Total en MXN (convertido desde todos los pagos)
                    merchandise_cost: merchandiseCost,
                    notes: notes,
                    is_street: isStreet,
                    payments: payments, // Array de pagos múltiples
                    payment_method: payments.length === 1 ? payments[0].method : 'mixed', // Para compatibilidad
                    date: captureDate, // Fecha manual seleccionada
                    original_report_date: captureDate, // CRÍTICO: Preservar la fecha asignada (puede ser histórica como 1ro de enero)
                    created_at: new Date().toISOString(),
                    created_by: typeof UserManager !== 'undefined' && UserManager.currentUser ? UserManager.currentUser.id : null,
                    isPending: true // Marca para identificar que es pendiente
                };

                // Agregar a la lista pendiente en memoria
                this.pendingCaptures.push(capture);

                // Limpiar formulario (pero mantener la fecha)
                const currentDate = document.getElementById('qc-date')?.value || new Date().toISOString().split('T')[0];
                document.getElementById('quick-capture-form')?.reset();
                if (document.getElementById('qc-quantity')) {
                    document.getElementById('qc-quantity').value = '1';
                }
                // Restaurar la fecha después de resetear (NO resetear a hoy)
                if (document.getElementById('qc-date')) {
                    document.getElementById('qc-date').value = currentDate;
                }
                // Sincronizar fecha con formulario de llegadas
                const arrivalDateInput = document.getElementById('qc-arrival-date');
                if (arrivalDateInput) {
                    arrivalDateInput.value = currentDate;
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
                <div class="payment-row" style="display: grid; grid-template-columns: 1fr 80px 110px 50px; gap: 4px; align-items: center; padding: 3px; background: white; border-radius: 3px; border: 1px solid #dee2e6;">
                    <select class="form-select payment-method" required style="border: 1px solid #ced4da; font-size: 10px; padding: 4px;">
                        <option value="">Método...</option>
                        <option value="cash">Efectivo</option>
                        <option value="card">Tarjeta</option>
                        <option value="transfer">Transferencia</option>
                        <option value="other">Otro</option>
                    </select>
                    <select class="form-select payment-currency" required style="border: 1px solid #ced4da; font-size: 10px; padding: 4px;">
                        <option value="MXN">MXN</option>
                        <option value="USD">USD</option>
                        <option value="CAD">CAD</option>
                    </select>
                    <input type="number" class="form-input payment-amount" min="0" step="0.01" placeholder="0.00" required style="border: 1px solid #ced4da; font-size: 10px; padding: 4px;">
                    <button type="button" class="btn-danger btn-xs remove-payment" style="display: none; padding: 3px 5px; font-size: 9px;" onclick="if(window.Reports && window.Reports.updatePaymentsTotal) window.Reports.updatePaymentsTotal(); this.closest('.payment-row').remove(); if(window.Reports && window.Reports.updateRemoveButtons) window.Reports.updateRemoveButtons();">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            
            // Agregar event listeners a los campos de pago
            const amountInputs = container.querySelectorAll('.payment-amount');
            const currencySelects = container.querySelectorAll('.payment-currency');
            
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
            
            if (currencySelects && currencySelects.length > 0) {
                currencySelects.forEach(select => {
                    if (select) {
                        select.addEventListener('change', () => {
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
            row.style.cssText = 'display: grid; grid-template-columns: 1fr 80px 110px 50px; gap: 4px; align-items: center; padding: 3px; background: white; border-radius: 3px; border: 1px solid #dee2e6;';
            row.innerHTML = `
                <select class="form-select payment-method" required style="border: 1px solid #ced4da; font-size: 10px; padding: 4px;">
                    <option value="">Método...</option>
                    <option value="cash">Efectivo</option>
                    <option value="card">Tarjeta</option>
                    <option value="transfer">Transferencia</option>
                    <option value="other">Otro</option>
                </select>
                <select class="form-select payment-currency" required style="border: 1px solid #ced4da; font-size: 10px; padding: 4px;">
                    <option value="MXN">MXN</option>
                    <option value="USD">USD</option>
                    <option value="CAD">CAD</option>
                </select>
                <input type="number" class="form-input payment-amount" min="0" step="0.01" placeholder="0.00" required style="border: 1px solid #ced4da; font-size: 10px; padding: 4px;">
                <button type="button" class="btn-danger btn-xs remove-payment" style="padding: 3px 5px; font-size: 9px;" onclick="if(window.Reports && window.Reports.updatePaymentsTotal) window.Reports.updatePaymentsTotal(); this.closest('.payment-row').remove(); if(window.Reports && window.Reports.updateRemoveButtons) window.Reports.updateRemoveButtons();">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            // Agregar event listener al nuevo campo de moneda
            const currencySelect = row.querySelector('.payment-currency');
            if (currencySelect) {
                currencySelect.addEventListener('change', () => {
                    if (this.updatePaymentsTotal) {
                        this.updatePaymentsTotal();
                    }
                });
            }
            
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

    // Obtener tipos de cambio del display (prioridad) o de la base de datos
    getExchangeRatesFromDisplay() {
        try {
            const display = document.getElementById('qc-exchange-rates-display');
            if (!display) return null;
            
            const text = display.textContent || display.innerText || '';
            
            // Buscar USD: $XX.XX MXN
            const usdMatch = text.match(/USD[:\s]*\$?([\d,]+\.?\d*)\s*MXN/i);
            // Buscar CAD: $XX.XX MXN
            const cadMatch = text.match(/CAD[:\s]*\$?([\d,]+\.?\d*)\s*MXN/i);
            
            if (usdMatch && cadMatch) {
                const usd = parseFloat(usdMatch[1].replace(/,/g, '')) || null;
                const cad = parseFloat(cadMatch[1].replace(/,/g, '')) || null;
                
                if (usd && cad) {
                    console.log(`✅ Tipos de cambio obtenidos del display: USD=${usd}, CAD=${cad}`);
                    return { usd, cad };
                }
            }
            
            return null;
        } catch (error) {
            console.warn('Error extrayendo tipos de cambio del display:', error);
            return null;
        }
    },

    async getExchangeRatesForDate(dateStr = null) {
        try {
            // PRIMERO: Intentar obtener del display (tiene prioridad)
            const displayRates = this.getExchangeRatesFromDisplay();
            if (displayRates && displayRates.usd && displayRates.cad) {
                return displayRates;
            }
            
            // SEGUNDO: Si no hay en el display, obtener de la base de datos
            const date = dateStr || document.getElementById('qc-date')?.value || new Date().toISOString().split('T')[0];
            const exchangeRates = await DB.query('exchange_rates_daily', 'date', date) || [];
            const todayRate = exchangeRates[0] || { usd_to_mxn: 18.0, cad_to_mxn: 13.0 };
            return {
                usd: todayRate.usd_to_mxn || 18.0,
                cad: todayRate.cad_to_mxn || 13.0
            };
        } catch (error) {
            console.warn('Error obteniendo tipos de cambio, usando valores por defecto:', error);
            return { usd: 18.0, cad: 13.0 };
        }
    },

    async updatePaymentsTotal() {
        try {
            const container = document.getElementById('qc-payments-container');
            if (!container) return;
            
            // Obtener tipos de cambio (prioriza el display)
            const exchangeRates = await this.getExchangeRatesForDate();
            const usdRate = exchangeRates?.usd || 18.0;
            const cadRate = exchangeRates?.cad || 13.0;
            
            const rows = container.querySelectorAll('.payment-row');
            let totalMXN = 0;
            
            rows.forEach(row => {
                const amountInput = row.querySelector('.payment-amount');
                const currencySelect = row.querySelector('.payment-currency');
                
                if (amountInput && currencySelect) {
                    const amount = parseFloat(amountInput.value) || 0;
                    const currency = currencySelect.value || 'MXN';
                    
                    // Convertir a MXN según la moneda usando los tipos de cambio del display
                    let amountMXN = amount;
                    if (currency === 'USD') {
                        amountMXN = amount * usdRate;
                    } else if (currency === 'CAD') {
                        amountMXN = amount * cadRate;
                    }
                    // Si es MXN, ya está en MXN
                    
                    totalMXN += amountMXN;
                }
            });
            
            const totalDisplay = document.getElementById('qc-payments-total');
            if (totalDisplay) {
                totalDisplay.textContent = `$${totalMXN.toFixed(2)}`;
            }
            
            const totalInput = document.getElementById('qc-total');
            if (totalInput) {
                totalInput.value = totalMXN;
            }
            
            if (this.updateRemoveButtons) {
                this.updateRemoveButtons();
            }
        } catch (error) {
            console.error('Error actualizando total de pagos:', error);
        }
    },

    initializePaymentsSystem() {
        const container = document.getElementById('qc-payments-container');
        if (!container) return;
        
        // Configurar listeners para todas las filas de pago existentes
        const setupRowListeners = (row) => {
            const amountInput = row.querySelector('.payment-amount');
            const currencySelect = row.querySelector('.payment-currency');
            
            if (amountInput) {
                // Remover listeners anteriores si existen
                const newAmountInput = amountInput.cloneNode(true);
                amountInput.parentNode.replaceChild(newAmountInput, amountInput);
                
                // Agregar nuevo listener
                newAmountInput.addEventListener('input', () => {
                    this.updatePaymentsTotal();
                });
                newAmountInput.addEventListener('change', () => {
                    this.updatePaymentsTotal();
                });
            }
            
            if (currencySelect) {
                // Remover listeners anteriores si existen
                const newCurrencySelect = currencySelect.cloneNode(true);
                currencySelect.parentNode.replaceChild(newCurrencySelect, currencySelect);
                
                // Agregar nuevo listener
                newCurrencySelect.addEventListener('change', () => {
                    this.updatePaymentsTotal();
                });
            }
        };
        
        // Configurar listeners para todas las filas existentes
        container.querySelectorAll('.payment-row').forEach(setupRowListeners);
        
        // Inicializar total
        this.updatePaymentsTotal();
    },

    addPaymentRow() {
        const container = document.getElementById('qc-payments-container');
        if (!container) return;
        
        // Crear nueva fila de pago
        const newRow = document.createElement('div');
        newRow.className = 'payment-row';
        newRow.style.cssText = 'display: grid; grid-template-columns: 1fr 70px 90px 40px; gap: 3px; align-items: center; padding: 3px; background: white; border-radius: 3px; border: 1px solid #dee2e6;';
        newRow.innerHTML = `
            <select class="form-select payment-method" required style="border: 1px solid #ced4da; font-size: 10px; padding: 4px;">
                <option value="">Método...</option>
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta</option>
                <option value="transfer">Transferencia</option>
                <option value="other">Otro</option>
            </select>
            <select class="form-select payment-currency" required style="border: 1px solid #ced4da; font-size: 10px; padding: 4px;">
                <option value="MXN">MXN</option>
                <option value="USD">USD</option>
                <option value="CAD">CAD</option>
            </select>
            <input type="number" class="form-input payment-amount" min="0" step="0.01" placeholder="0.00" required style="border: 1px solid #ced4da; font-size: 10px; padding: 4px;">
            <button type="button" class="btn-danger btn-xs remove-payment" style="padding: 3px 5px; font-size: 9px;" onclick="this.closest('.payment-row').remove(); window.Reports.updatePaymentsTotal();">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(newRow);
        
        // Configurar listeners para la nueva fila
        const amountInput = newRow.querySelector('.payment-amount');
        const currencySelect = newRow.querySelector('.payment-currency');
        
        if (amountInput) {
            amountInput.addEventListener('input', () => {
                this.updatePaymentsTotal();
            });
            amountInput.addEventListener('change', () => {
                this.updatePaymentsTotal();
            });
        }
        
        if (currencySelect) {
            currencySelect.addEventListener('change', () => {
                this.updatePaymentsTotal();
            });
        }
        
        // Actualizar botones de eliminar
        this.updateRemoveButtons();
        
        // Actualizar total
        this.updatePaymentsTotal();
    },

    updateRemoveButtons() {
        const container = document.getElementById('qc-payments-container');
        if (!container) return;
        
        const rows = container.querySelectorAll('.payment-row');
        rows.forEach((row, index) => {
            const removeBtn = row.querySelector('.remove-payment');
            if (removeBtn) {
                // Mostrar botón de eliminar solo si hay más de una fila
                removeBtn.style.display = rows.length > 1 ? 'block' : 'none';
            }
        });
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
                        const currencySelect = row.querySelector('.payment-currency');
                        const amountInput = row.querySelector('.payment-amount');
                        
                        if (methodSelect && currencySelect && amountInput) {
                            const method = methodSelect.value;
                            const currency = currencySelect.value || 'MXN';
                            const amount = parseFloat(amountInput.value || 0);
                            
                            if (method && amount > 0) {
                                payments.push({
                                    method: method,
                                    currency: currency,
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

            // Calcular totales desde pagos individuales (si existen) o desde total de captura
            const totals = {
                USD: 0,
                MXN: 0,
                CAD: 0
            };
            let totalQuantity = 0;
            let totalMXN = 0;

            // Obtener tipos de cambio para conversión
            const exchangeRates = await this.getExchangeRatesForDate();
            const usdRate = exchangeRates?.usd || 18.0;
            const cadRate = exchangeRates?.cad || 13.0;

            this.pendingCaptures.forEach(c => {
                // Si hay pagos individuales, calcular desde ellos
                if (c.payments && Array.isArray(c.payments) && c.payments.length > 0) {
                    c.payments.forEach(payment => {
                        const amount = parseFloat(payment.amount) || 0;
                        const currency = payment.currency || c.currency || 'MXN';
                        totals[currency] = (totals[currency] || 0) + amount;
                    });
                    // El total ya está en MXN (se calculó al agregar)
                    totalMXN += c.total || 0;
                } else {
                    // Fallback: usar total y currency de la captura
                    totals[c.currency || 'MXN'] = (totals[c.currency || 'MXN'] || 0) + (c.total || 0);
                    // Convertir a MXN si es necesario
                    if (c.currency === 'USD') {
                        totalMXN += (c.total || 0) * usdRate;
                    } else if (c.currency === 'CAD') {
                        totalMXN += (c.total || 0) * cadRate;
                    } else {
                        totalMXN += (c.total || 0);
                    }
                }
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
                            <div style="font-size: 16px; font-weight: 700; color: #ffc107;">$${totalMXN.toFixed(2)}</div>
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
                                        <td style="padding: 6px; font-size: 11px; text-align: right; color: #495057; font-weight: 500;">
                                            ${c.payments && Array.isArray(c.payments) && c.payments.length > 0 
                                                ? c.payments.map(p => `${p.method === 'cash' ? 'Efectivo' : p.method === 'card' ? 'Tarjeta' : p.method} ${p.currency || 'MXN'} $${(p.amount || 0).toFixed(2)}`).join('<br>')
                                                : `${c.currency || 'MXN'} $${(c.total || 0).toFixed(2)}`
                                            }
                                        </td>
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
                        row.style.cssText = 'display: grid; grid-template-columns: 1fr 80px 110px 50px; gap: 4px; align-items: center; padding: 3px; background: white; border-radius: 3px; border: 1px solid #dee2e6;';
                        row.innerHTML = `
                            <select class="form-select payment-method" required style="border: 1px solid #ced4da; font-size: 10px; padding: 4px;">
                                <option value="">Método...</option>
                                <option value="cash" ${payment.method === 'cash' ? 'selected' : ''}>Efectivo</option>
                                <option value="card" ${payment.method === 'card' ? 'selected' : ''}>Tarjeta</option>
                                <option value="transfer" ${payment.method === 'transfer' ? 'selected' : ''}>Transferencia</option>
                                <option value="other" ${payment.method === 'other' ? 'selected' : ''}>Otro</option>
                            </select>
                            <select class="form-select payment-currency" required style="border: 1px solid #ced4da; font-size: 10px; padding: 4px;">
                                <option value="MXN" ${(payment.currency || capture.currency || 'MXN') === 'MXN' ? 'selected' : ''}>MXN</option>
                                <option value="USD" ${(payment.currency || capture.currency || 'MXN') === 'USD' ? 'selected' : ''}>USD</option>
                                <option value="CAD" ${(payment.currency || capture.currency || 'MXN') === 'CAD' ? 'selected' : ''}>CAD</option>
                            </select>
                            <input type="number" class="form-input payment-amount" min="0" step="0.01" placeholder="0.00" value="${payment.amount || 0}" required style="border: 1px solid #ced4da; font-size: 10px; padding: 4px;">
                            <button type="button" class="btn-danger btn-xs remove-payment" style="padding: 3px 5px; font-size: 9px;" onclick="if(window.Reports && window.Reports.updatePaymentsTotal) window.Reports.updatePaymentsTotal(); this.closest('.payment-row').remove(); if(window.Reports && window.Reports.updateRemoveButtons) window.Reports.updateRemoveButtons();">
                                <i class="fas fa-times"></i>
                            </button>
                        `;
                        
                        // Agregar event listener al selector de moneda
                        const currencySelect = row.querySelector('.payment-currency');
                        if (currencySelect) {
                            currencySelect.addEventListener('change', () => {
                                if (this.updatePaymentsTotal) {
                                    this.updatePaymentsTotal();
                                }
                            });
                        }
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
                    container.querySelectorAll('.payment-currency').forEach(select => {
                        select.addEventListener('change', () => {
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
                    // Asegurar que la fecha esté presente y correcta
                    if (!capture.date) {
                        console.warn('⚠️ Captura sin fecha, usando fecha del formulario:', capture.id);
                        const dateInput = document.getElementById('qc-date');
                        capture.date = dateInput?.value || new Date().toISOString().split('T')[0];
                    }
                    
                    // CRÍTICO: Preservar la fecha original asignada (puede ser histórica como 1ro de enero)
                    // NO usar la fecha actual, usar siempre la fecha que el usuario asignó
                    const originalReportDate = capture.original_report_date || capture.date || (document.getElementById('qc-date')?.value || new Date().toISOString().split('T')[0]);
                    const captureDate = originalReportDate; // Usar la fecha original, no la actual
                    
                    // Asegurar que tenga branch_id (obtener de BranchManager si no lo tiene)
                    let branchId = capture.branch_id;
                    if (!branchId) {
                        branchId = typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : null;
                        console.log(`⚠️ Captura sin branch_id, asignando: ${branchId}`);
                    }
                    
                    // Generar nuevo ID para la captura guardada
                    const savedCapture = {
                        ...capture,
                        id: 'qc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                        branch_id: branchId, // Asegurar que siempre tenga branch_id
                        date: captureDate, // Fecha del reporte (puede ser histórica)
                        original_report_date: originalReportDate, // CRÍTICO: Fecha original asignada (para persistencia) - NO cambiar
                        created_at: capture.created_at || new Date().toISOString()
                    };
                    delete savedCapture.isPending;

                    console.log(`💾 Guardando captura: ${savedCapture.product}, fecha: ${savedCapture.date}, fecha original: ${savedCapture.original_report_date}`);
                    
                    // 1. Guardar localmente en IndexedDB
                    await DB.put('temp_quick_captures', savedCapture);
                    
                    // 2. Guardar en el servidor (sincronización bidireccional)
                    let serverSaved = false;
                    if (typeof API !== 'undefined' && API.baseURL && API.token && API.createQuickCapture) {
                        try {
                            console.log('📤 Sincronizando captura con servidor...');
                            const serverCapture = await API.createQuickCapture({
                                branch_id: savedCapture.branch_id,
                                seller_id: savedCapture.seller_id,
                                guide_id: savedCapture.guide_id,
                                agency_id: savedCapture.agency_id,
                                product: savedCapture.product,
                                quantity: savedCapture.quantity,
                                currency: savedCapture.currency,
                                total: savedCapture.total,
                                merchandise_cost: savedCapture.merchandise_cost || 0,
                                notes: savedCapture.notes,
                                is_street: savedCapture.is_street || false,
                                payment_method: savedCapture.payment_method,
                                payments: savedCapture.payments,
                                date: savedCapture.date,
                                original_report_date: savedCapture.original_report_date
                            });
                            
                            // Actualizar con el ID del servidor si viene
                            if (serverCapture && serverCapture.id) {
                                // Guardar también con el ID del servidor para referencia
                                savedCapture.server_id = serverCapture.id;
                                await DB.put('temp_quick_captures', savedCapture);
                            }
                            
                            serverSaved = true;
                            console.log('✅ Captura sincronizada con servidor');
                        } catch (apiError) {
                            console.warn('⚠️ Error sincronizando con servidor (continuando con guardado local):', apiError.message);
                            // Continuar con guardado local aunque falle el servidor
                            // Agregar a cola de sincronización para intentar más tarde
                            if (typeof SyncManager !== 'undefined') {
                                try {
                                    await SyncManager.addToQueue('quick_capture', savedCapture.id, 'create');
                                    console.log('📤 Captura agregada a cola de sincronización');
                                } catch (syncError) {
                                    console.error('Error agregando a cola de sincronización:', syncError);
                                }
                            }
                        }
                    }
                    
                    // Verificar que se guardó correctamente localmente
                    const verify = await DB.get('temp_quick_captures', savedCapture.id);
                    if (verify && verify.date === savedCapture.date) {
                    savedCount++;
                        console.log(`✅ Captura guardada correctamente: ${savedCapture.id}${serverSaved ? ' (sincronizada)' : ' (solo local)'}`);
                    } else {
                        console.error(`❌ Error: La captura no se guardó correctamente o la fecha no coincide`);
                    }
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
            // Obtener la fecha del formulario o usar hoy por defecto
            const dateInput = document.getElementById('qc-date');
            const selectedDate = dateInput?.value || new Date().toISOString().split('T')[0];
            
            // Obtener sucursal actual para filtrar
            const currentBranchId = typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : null;
            // Mejorar detección de master admin
            const isMasterAdmin = typeof UserManager !== 'undefined' && (
                UserManager.currentUser?.role === 'master_admin' ||
                UserManager.currentUser?.is_master_admin ||
                UserManager.currentUser?.isMasterAdmin ||
                UserManager.currentEmployee?.role === 'master_admin' ||
                (typeof PermissionManager !== 'undefined' && PermissionManager.hasPermission('admin.all'))
            );
            
            // Obtener todas las capturas y filtrar por la fecha seleccionada
            let captures = await DB.getAll('temp_quick_captures') || [];
            console.log(`📊 Total capturas en BD: ${captures.length}, filtrando por fecha: ${selectedDate}`);
            console.log(`🔍 Filtros: isMasterAdmin=${isMasterAdmin}, currentBranchId=${currentBranchId}`);
            
            captures = captures.filter(c => {
                // Normalizar fechas para comparación estricta (usar original_report_date si existe, sino date)
                const captureDate = c.original_report_date || c.date;
                if (!captureDate) {
                    console.warn('⚠️ Captura sin fecha:', c.id);
                    return false;
                }
                const normalizedCaptureDate = captureDate.split('T')[0];
                const normalizedSelectedDate = selectedDate.split('T')[0];
                const matches = normalizedCaptureDate === normalizedSelectedDate;
                if (!matches) {
                    // No loguear cada fecha que no coincide para reducir ruido en consola
                    return false;
                }
                
                // Si es master admin, mostrar TODAS las capturas (incluso sin branch_id)
                if (isMasterAdmin) {
                    console.log(`   ✅ Master admin: mostrando captura ${c.id} (branch_id: ${c.branch_id || 'sin sucursal'})`);
                    return true;
                }
                
                // Para usuarios normales: mostrar capturas de su sucursal O sin branch_id (legacy)
                if (currentBranchId) {
                    const captureBranchId = c.branch_id ? String(c.branch_id).trim() : null;
                    const currentBranchIdStr = String(currentBranchId).trim();
                    
                    // Incluir si:
                    // 1. Tiene branch_id y coincide con la sucursal actual
                    // 2. NO tiene branch_id (capturas legacy que se crearon antes de implementar el filtro)
                    if (captureBranchId && captureBranchId === currentBranchIdStr) {
                        console.log(`   ✅ Sucursal coincide: ${captureBranchId} === ${currentBranchIdStr}`);
                        return true;
                    } else if (!captureBranchId) {
                        // Capturas sin branch_id: incluir si el usuario está en una sucursal (legacy)
                        console.log(`   ✅ Captura sin branch_id (legacy), incluyendo para sucursal ${currentBranchIdStr}`);
                        return true;
                    } else {
                        console.log(`   ❌ Sucursal no coincide: ${captureBranchId} !== ${currentBranchIdStr}`);
                        return false;
                    }
                } else {
                    // Si no hay sucursal actual, mostrar solo capturas sin branch_id
                    if (!c.branch_id) {
                        console.log(`   ✅ Sin sucursal actual: mostrando captura sin branch_id`);
                        return true;
                    }
                    console.log(`   ❌ Sin sucursal actual pero captura tiene branch_id: ${c.branch_id}`);
                    return false;
                }
            });
            console.log(`✅ Capturas filtradas: ${captures.length} para fecha ${selectedDate}`);
            
            // Ordenar por fecha de creación (más recientes primero)
            captures.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            const listContainer = document.getElementById('quick-capture-list');
            if (!listContainer) return;

            if (captures.length === 0) {
                listContainer.innerHTML = `
                    <div style="text-align: center; padding: var(--spacing-lg); color: var(--color-text-secondary);">
                        <i class="fas fa-inbox" style="font-size: 48px; opacity: 0.3; margin-bottom: var(--spacing-md);"></i>
                        <p>No hay capturas para la fecha ${Utils.formatDate(selectedDate, 'DD/MM/YYYY')}</p>
                        <small style="color: var(--color-text-secondary); font-size: 10px;">Cambia la fecha en el formulario para ver capturas de otros días</small>
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

            // Obtener tipos de cambio para conversión (prioriza el display)
            const exchangeRates = await this.getExchangeRatesForDate(selectedDate);
            const usdRate = exchangeRates?.usd || 18.0;
            const cadRate = exchangeRates?.cad || 13.0;
            console.log(`💱 Tipos de cambio usados para ${selectedDate}: USD=${usdRate}, CAD=${cadRate}`);

            captures.forEach(c => {
                // Si hay múltiples pagos con monedas individuales, calcular desde los pagos
                if (c.payments && Array.isArray(c.payments) && c.payments.length > 0) {
                    c.payments.forEach(payment => {
                        const amount = parseFloat(payment.amount) || 0;
                        const currency = payment.currency || c.currency || 'MXN';
                        totals[currency] = (totals[currency] || 0) + amount;
                    });
                } else {
                    // Fallback: usar total y currency de la captura (compatibilidad)
                let captureTotal = c.total || 0;
                captureTotal = parseFloat(captureTotal) || 0;
                    const currency = c.currency || 'MXN';
                    totals[currency] = (totals[currency] || 0) + captureTotal;
                }
                totalQuantity += c.quantity || 1;
            });
            
            // El total en MXN ya está calculado en cada captura (c.total), así que sumamos directamente
            const totalSalesMXN = captures.reduce((sum, c) => sum + (parseFloat(c.total) || 0), 0);

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
                                        <td style="padding: 6px; font-size: 10px; text-align: right; color: #495057; font-weight: 500;">
                                            ${c.payments && Array.isArray(c.payments) && c.payments.length > 0 
                                                ? c.payments.map(p => {
                                                    const methodLabel = p.method === 'cash' ? 'Efectivo' : p.method === 'card' ? 'Tarjeta' : p.method === 'transfer' ? 'Transferencia' : p.method || 'Otro';
                                                    return `${methodLabel} ${p.currency || 'MXN'} $${(p.amount || 0).toFixed(2)}`;
                                                }).join('<br>')
                                                : `${c.currency || 'MXN'} $${(c.total || 0).toFixed(2)}`
                                            }
                                        </td>
                                        <td style="padding: 6px; font-size: 11px; text-align: right; font-weight: 600; color: #28a745;">$${(c.total || 0).toFixed(2)}</td>
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
            
            // Actualizar fecha en el título
            const dateDisplay = document.getElementById('captures-date-display');
            if (dateDisplay) {
                dateDisplay.textContent = `(${Utils.formatDate(selectedDate, 'YYYY-MM-DD')})`;
            }
            
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
            // Obtener la fecha del formulario o usar hoy por defecto
            const dateInput = document.getElementById('qc-date');
            const arrivalDateInput = document.getElementById('qc-arrival-date');
            const selectedDate = arrivalDateInput?.value || dateInput?.value || new Date().toISOString().split('T')[0];
            
            // Obtener guía seleccionado en el formulario (si existe)
            const guideSelect = document.getElementById('qc-arrival-guide');
            const selectedGuideId = guideSelect?.value || null;
            
            // Obtener agencia seleccionada en el formulario (si existe)
            const agencySelect = document.getElementById('qc-arrival-agency');
            const selectedAgencyId = agencySelect?.value || null;
            
            // Obtener sucursal actual para filtrar
            const currentBranchId = typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : null;
            const isMasterAdmin = typeof UserManager !== 'undefined' && (
                UserManager.currentUser?.role === 'master_admin' ||
                UserManager.currentUser?.is_master_admin ||
                UserManager.currentUser?.isMasterAdmin ||
                UserManager.currentEmployee?.role === 'master_admin'
            );
            
            const arrivals = await DB.getAll('agency_arrivals') || [];
            const filteredArrivals = arrivals.filter(a => {
                // Normalizar fechas para comparación estricta
                const arrivalDate = a.date ? a.date.split('T')[0] : null;
                if (!arrivalDate || arrivalDate !== selectedDate) {
                    return false; // Filtro estricto por fecha
                }
                
                // Filtrar por guía si hay uno seleccionado en el formulario
                if (selectedGuideId) {
                    if (!a.guide_id || String(a.guide_id) !== String(selectedGuideId)) {
                        return false; // Excluir llegadas de otros guías
                    }
                }
                
                // Filtrar por agencia si hay una seleccionada en el formulario (y no hay guía seleccionado)
                if (!selectedGuideId && selectedAgencyId) {
                    if (!a.agency_id || String(a.agency_id) !== String(selectedAgencyId)) {
                        return false; // Excluir llegadas de otras agencias
                    }
                }
                
                // Filtrar por sucursal si no es master admin
                if (!isMasterAdmin && currentBranchId) {
                    if (!a.branch_id || String(a.branch_id) !== String(currentBranchId)) {
                        return false; // Excluir llegadas de otras sucursales
                    }
                }
                
                // Excluir llegadas demo/mock (verificar si tienen notas que indiquen que son demo)
                if (a.notes && (a.notes.toLowerCase().includes('demo') || a.notes.toLowerCase().includes('mock') || a.notes.toLowerCase().includes('test'))) {
                    return false; // Excluir llegadas demo
                }
                
                // Solo incluir llegadas válidas (con pasajeros > 0)
                if (!a.passengers || a.passengers <= 0) {
                    return false;
                }
                
                return true;
            });
            
            const agencies = await DB.getAll('catalog_agencies') || [];
            const branches = await DB.getAll('catalog_branches') || [];

            const container = document.getElementById('quick-capture-arrivals');
            if (!container) return;

            if (filteredArrivals.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: var(--spacing-md); color: var(--color-text-secondary);">
                        <i class="fas fa-inbox" style="font-size: 32px; opacity: 0.3; margin-bottom: var(--spacing-sm);"></i>
                        <p>No hay llegadas registradas para ${Utils.formatDate(selectedDate, 'DD/MM/YYYY')}</p>
                    </div>
                `;
                return;
            }

            // Obtener guías para mostrar nombres
            const guides = await DB.getAll('catalog_guides') || [];
            
            // Agrupar por agencia y guía
            const arrivalsByAgency = {};
            filteredArrivals.forEach(arrival => {
                const agencyId = arrival.agency_id;
                const guideId = arrival.guide_id;
                
                if (!arrivalsByAgency[agencyId]) {
                    arrivalsByAgency[agencyId] = {
                        agency: agencies.find(a => a.id === agencyId),
                        arrivals: [],
                        totalPassengers: 0,
                        guides: {} // Agrupar por guía dentro de cada agencia
                    };
                }
                
                arrivalsByAgency[agencyId].arrivals.push(arrival);
                arrivalsByAgency[agencyId].totalPassengers += arrival.passengers || 0;
                
                // Agrupar por guía
                if (guideId) {
                    if (!arrivalsByAgency[agencyId].guides[guideId]) {
                        const guide = guides.find(g => g.id === guideId);
                        arrivalsByAgency[agencyId].guides[guideId] = {
                            guide: guide,
                            arrivals: [],
                            totalPassengers: 0
                        };
                    }
                    arrivalsByAgency[agencyId].guides[guideId].arrivals.push(arrival);
                    arrivalsByAgency[agencyId].guides[guideId].totalPassengers += arrival.passengers || 0;
                }
            });

            let html = `
                <div style="display: grid; gap: 8px;">
                    ${Object.values(arrivalsByAgency).map(group => {
                        // Si hay guías agrupados, mostrar por guía; si no, mostrar todas las llegadas
                        const hasGuides = Object.keys(group.guides || {}).length > 0;
                        
                        return `
                        <div style="padding: 10px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 4px; border-left: 3px solid #fa709a; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #dee2e6;">
                                <strong style="font-size: 12px; color: #495057; font-weight: 600;">${group.agency?.name || 'Agencia Desconocida'}</strong>
                                <span style="font-size: 10px; color: #6c757d; font-weight: 500; padding: 3px 10px; background: white; border-radius: 10px; border: 1px solid #dee2e6;">${group.totalPassengers} pasajeros</span>
                            </div>
                            ${hasGuides ? `
                                <div style="display: grid; gap: 6px;">
                                    ${Object.values(group.guides).map(guideGroup => `
                                        <div style="padding: 6px; background: white; border-radius: 3px; border-left: 2px solid #667eea;">
                                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                                <span style="font-size: 11px; color: #495057; font-weight: 600;">
                                                    <i class="fas fa-user-tie" style="font-size: 9px; margin-right: 4px; color: #667eea;"></i>
                                                    ${guideGroup.guide?.name || 'Guía Desconocido'}
                                                </span>
                                                <span style="font-size: 10px; color: #6c757d; font-weight: 500;">${guideGroup.totalPassengers} pasajeros</span>
                                            </div>
                                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 4px; font-size: 10px; color: #6c757d;">
                                                ${guideGroup.arrivals.map(a => {
                                                    const branch = branches.find(b => b.id === a.branch_id);
                                                    return `
                                                        <div style="padding: 3px 6px; background: #f8f9fa; border-radius: 2px;">
                                                            <i class="fas fa-building" style="font-size: 9px; margin-right: 4px;"></i> ${branch?.name || 'N/A'}: 
                                                            <strong style="color: #495057;">${a.passengers || 0}</strong> pasajeros
                                                            ${a.unit_type ? `<span style="margin-left: 4px; font-size: 9px; color: #6c757d;">(${a.unit_type})</span>` : ''}
                                                        </div>
                                                    `;
                                                }).join('')}
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : `
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 6px; font-size: 10px; color: #6c757d;">
                                ${group.arrivals.map(a => {
                                    const branch = branches.find(b => b.id === a.branch_id);
                                        const guide = a.guide_id ? guides.find(g => g.id === a.guide_id) : null;
                                    return `
                                        <div style="padding: 4px 6px; background: white; border-radius: 3px;">
                                            <i class="fas fa-building" style="font-size: 9px; margin-right: 4px;"></i> ${branch?.name || 'N/A'}: 
                                            <strong style="color: #495057;">${a.passengers || 0}</strong> pasajeros
                                                ${guide ? `<span style="margin-left: 4px; font-size: 9px; color: #667eea;"><i class="fas fa-user-tie"></i> ${guide.name}</span>` : ''}
                                                ${a.unit_type ? `<span style="margin-left: 4px; font-size: 9px;">(${a.unit_type})</span>` : ''}
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                            `}
                        </div>
                    `;
                    }).join('')}
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
            const guideId = document.getElementById('qc-arrival-guide')?.value || null;
            const agencyId = document.getElementById('qc-arrival-agency')?.value;
            const passengers = parseInt(document.getElementById('qc-arrival-pax')?.value || 0);
            const units = parseInt(document.getElementById('qc-arrival-units')?.value || 0);
            const unitType = document.getElementById('qc-arrival-unit-type')?.value || null;
            const notes = document.getElementById('qc-arrival-notes')?.value?.trim() || null;
            
            // Obtener fecha del formulario de llegadas o del formulario principal
            const arrivalDateInput = document.getElementById('qc-arrival-date');
            const mainDateInput = document.getElementById('qc-date');
            const arrivalDate = arrivalDateInput?.value || mainDateInput?.value || new Date().toISOString().split('T')[0];

            // Validar campos requeridos
            if (!branchId || !guideId || !agencyId || !passengers || passengers <= 0 || !units || units <= 0 || !arrivalDate) {
                Utils.showNotification('Por favor completa todos los campos requeridos: guía, agencia, pasajeros, unidades y fecha', 'error');
                return;
            }

            // Obtener nombres para mostrar
            const agencies = await DB.getAll('catalog_agencies') || [];
            const agency = agencies.find(a => a.id === agencyId);
            const agencyName = agency ? agency.name : 'Desconocida';

            const branches = await DB.getAll('catalog_branches') || [];
            const branch = branches.find(b => b.id === branchId);
            const branchName = branch ? branch.name : 'Desconocida';

            // Calcular costo de llegada usando la fecha del formulario
            let arrivalFee = 0;
            let overrideRequired = false;
            let overrideAmount = null;
            let overrideReason = null;
            
            if (typeof ArrivalRules !== 'undefined' && ArrivalRules.calculateArrivalFee) {
                const calculation = await ArrivalRules.calculateArrivalFee(agencyId, branchId, passengers, unitType, arrivalDate);
                
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
                    date: arrivalDate,
                    branch_id: branchId,
                    guide_id: guideId,
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
                    await ProfitCalculator.calculateDailyProfit(arrivalDate, branchId);
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
            
            // 1. Obtener tipo de cambio del día (prioriza el display, luego BD)
            const exchangeRates = await this.getExchangeRatesForDate(captureDate);
            const usdRate = exchangeRates?.usd || 18.0;
            const cadRate = exchangeRates?.cad || 13.0;

            console.log(`💱 Tipo de cambio usado para ${captureDate}: USD=${usdRate}, CAD=${cadRate}`);

            // 2. Calcular totales de ventas por moneda (desde pagos individuales si existen)
            const totals = { USD: 0, MXN: 0, CAD: 0 };
            captures.forEach(c => {
                // Si hay múltiples pagos con monedas individuales, calcular desde los pagos
                if (c.payments && Array.isArray(c.payments) && c.payments.length > 0) {
                    c.payments.forEach(payment => {
                        const amount = parseFloat(payment.amount) || 0;
                        const currency = payment.currency || c.currency || 'MXN';
                        totals[currency] = (totals[currency] || 0) + amount;
                    });
                } else {
                    // Fallback: usar el total y currency de la captura (compatibilidad)
                let captureTotal = c.total || 0;
                captureTotal = parseFloat(captureTotal) || 0;
                    const currency = c.currency || 'MXN';
                    totals[currency] = (totals[currency] || 0) + captureTotal;
                }
            });

            // 3. Calcular el total en MXN desde las capturas (ya convertido en cada captura)
            // Sumar todos los totales de las capturas que ya están en MXN
            const totalSalesMXN = captures.reduce((sum, c) => {
                return sum + (parseFloat(c.total) || 0);
            }, 0);
            
            // También calcular desde conversión manual para verificación
            const totalSalesMXNCalculated = totals.USD * usdRate + totals.MXN + totals.CAD * cadRate;
            console.log(`💱 Total calculado desde conversión: $${totalSalesMXNCalculated.toFixed(2)} MXN`);
            console.log(`💱 Total desde capturas (ya convertido): $${totalSalesMXN.toFixed(2)} MXN`);

            // 4. Calcular comisiones totales (vendedores + guías)
            // IMPORTANTE: Las comisiones deben calcularse sobre el monto en MXN
            const commissionRules = await DB.getAll('commission_rules') || [];
            // Obtener catálogos una sola vez antes del bucle
            const agencies = await DB.getAll('catalog_agencies') || [];
            const sellers = await DB.getAll('catalog_sellers') || [];
            const guides = await DB.getAll('catalog_guides') || [];
            
            let totalCommissions = 0;
            for (const capture of captures) {
                // Calcular el total de la captura en MXN desde los pagos individuales
                let captureTotalMXN = 0;
                
                if (capture.payments && Array.isArray(capture.payments) && capture.payments.length > 0) {
                    // Si hay múltiples pagos, convertir cada uno a MXN según su moneda
                    capture.payments.forEach(payment => {
                        const amount = parseFloat(payment.amount) || 0;
                        const currency = payment.currency || capture.currency || 'MXN';
                        
                        let amountMXN = amount;
                        if (currency === 'USD') {
                            amountMXN = amount * usdRate;
                        } else if (currency === 'CAD') {
                            amountMXN = amount * cadRate;
                        }
                        // Si es MXN, ya está en MXN
                        
                        captureTotalMXN += amountMXN;
                    });
                } else {
                    // Fallback: usar el total y currency de la captura (compatibilidad)
                    let captureTotal = capture.total || 0;
                captureTotal = parseFloat(captureTotal) || 0;
                
                if (capture.currency === 'USD') {
                    captureTotalMXN = captureTotal * usdRate;
                } else if (capture.currency === 'CAD') {
                    captureTotalMXN = captureTotal * cadRate;
                    } else {
                        captureTotalMXN = captureTotal; // MXN
                    }
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
                    const notes = document.getElementById('edit-qc-notes')?.value || '';
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

                    // CRÍTICO: Preservar la fecha original asignada (NO cambiar)
                    const originalReportDate = capture.original_report_date || capture.date;

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
                    capture.date = originalReportDate; // Preservar fecha original
                    capture.original_report_date = originalReportDate; // CRÍTICO: NO cambiar
                    capture.updated_at = new Date().toISOString();

                    // 1. Guardar localmente
                    await DB.put('temp_quick_captures', capture);
                    
                    // 2. Sincronizar con servidor (bidireccional)
                    if (typeof API !== 'undefined' && API.baseURL && API.token) {
                        try {
                            // Si tiene server_id, actualizar en servidor
                            if (capture.server_id && API.updateQuickCapture) {
                                console.log('📤 Sincronizando edición con servidor...');
                                await API.updateQuickCapture(capture.server_id, {
                                    branch_id: capture.branch_id,
                                    seller_id: capture.seller_id,
                                    guide_id: capture.guide_id,
                                    agency_id: capture.agency_id,
                                    product: capture.product,
                                    quantity: capture.quantity,
                                    currency: capture.currency,
                                    total: capture.total,
                                    merchandise_cost: capture.merchandise_cost || 0,
                                    notes: capture.notes,
                                    is_street: capture.is_street || false,
                                    payment_method: capture.payment_method,
                                    payments: capture.payments,
                                    date: capture.date,
                                    original_report_date: capture.original_report_date
                                });
                                console.log('✅ Captura actualizada en servidor');
                            } else if (API.createQuickCapture) {
                                // Si no tiene server_id pero existe en servidor, crear
                                console.log('📤 Creando captura en servidor (no tenía server_id)...');
                                const serverCapture = await API.createQuickCapture({
                                    branch_id: capture.branch_id,
                                    seller_id: capture.seller_id,
                                    guide_id: capture.guide_id,
                                    agency_id: capture.agency_id,
                                    product: capture.product,
                                    quantity: capture.quantity,
                                    currency: capture.currency,
                                    total: capture.total,
                                    merchandise_cost: capture.merchandise_cost || 0,
                                    notes: capture.notes,
                                    is_street: capture.is_street || false,
                                    payment_method: capture.payment_method,
                                    payments: capture.payments,
                                    date: capture.date,
                                    original_report_date: capture.original_report_date
                                });
                                if (serverCapture && serverCapture.id) {
                                    capture.server_id = serverCapture.id;
                                    await DB.put('temp_quick_captures', capture);
                                }
                                console.log('✅ Captura creada en servidor');
                            }
                        } catch (apiError) {
                            console.warn('⚠️ Error sincronizando con servidor (continuando con guardado local):', apiError.message);
                            // Agregar a cola de sincronización
                            if (typeof SyncManager !== 'undefined') {
                                try {
                                    await SyncManager.addToQueue('quick_capture', capture.id, capture.server_id ? 'update' : 'create');
                                    console.log('📤 Captura agregada a cola de sincronización');
                                } catch (syncError) {
                                    console.error('Error agregando a cola de sincronización:', syncError);
                                }
                            }
                        }
                    }

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
            // Obtener captura antes de eliminar para sincronizar
            const capture = await DB.get('temp_quick_captures', captureId);
            
            // 1. Eliminar localmente
            await DB.delete('temp_quick_captures', captureId);
            
            // 2. Eliminar en servidor (sincronización bidireccional)
            if (capture && capture.server_id && typeof API !== 'undefined' && API.baseURL && API.token && API.deleteQuickCapture) {
                try {
                    console.log('📤 Eliminando captura en servidor...');
                    await API.deleteQuickCapture(capture.server_id);
                    console.log('✅ Captura eliminada en servidor');
                } catch (apiError) {
                    console.warn('⚠️ Error eliminando en servidor (continuando con eliminación local):', apiError.message);
                    // Agregar a cola de sincronización
                    if (typeof SyncManager !== 'undefined') {
                        try {
                            await SyncManager.addToQueue('quick_capture', captureId, 'delete');
                            console.log('📤 Eliminación agregada a cola de sincronización');
                        } catch (syncError) {
                            console.error('Error agregando a cola de sincronización:', syncError);
                        }
                    }
                }
            }
            
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
            // Obtener la fecha seleccionada del formulario
            const dateInput = document.getElementById('qc-date');
            const selectedDate = dateInput?.value || new Date().toISOString().split('T')[0];
            const normalizedSelectedDate = selectedDate.split('T')[0];
            
            let captures = await DB.getAll('temp_quick_captures') || [];
            captures = captures.filter(c => {
                const captureDate = c.date || c.original_report_date || '';
                return captureDate.split('T')[0] === normalizedSelectedDate;
            });

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
            // Obtener la fecha seleccionada del formulario
            const dateInput = document.getElementById('qc-date');
            const selectedDate = dateInput?.value || new Date().toISOString().split('T')[0];
            const normalizedSelectedDate = selectedDate.split('T')[0];
            
            let captures = await DB.getAll('temp_quick_captures') || [];
            captures = captures.filter(c => {
                const captureDate = c.date || c.original_report_date || '';
                return captureDate.split('T')[0] === normalizedSelectedDate;
            });

            if (captures.length === 0) {
                Utils.showNotification(`No hay capturas para archivar para la fecha ${normalizedSelectedDate}`, 'warning');
                return;
            }

            // Calcular todos los datos del reporte
            const exchangeRates = await DB.query('exchange_rates_daily', 'date', normalizedSelectedDate) || [];
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
            // Obtener la fecha seleccionada del formulario
            const dateInput = document.getElementById('qc-date');
            const selectedDate = dateInput?.value || new Date().toISOString().split('T')[0];
            const normalizedSelectedDate = selectedDate.split('T')[0];
            
            let captures = await DB.getAll('temp_quick_captures') || [];
            captures = captures.filter(c => {
                const captureDate = c.date || c.original_report_date || '';
                return captureDate.split('T')[0] === normalizedSelectedDate;
            });

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
        
        // Obtener fecha del formulario o mostrar modal para seleccionar
        const dateInput = document.getElementById('qc-date');
        let selectedDate = dateInput?.value || new Date().toISOString().split('T')[0];
        
        // Si no hay fecha en el formulario, mostrar modal
        if (!dateInput?.value) {
            selectedDate = await this.showDateSelectorModal();
        if (!selectedDate) {
            // Usuario canceló
            return;
            }
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
            
            // Obtener capturas filtradas por la fecha seleccionada
            let captures = await DB.getAll('temp_quick_captures') || [];
            
            // Filtrar capturas por la fecha seleccionada (normalizar fechas)
                captures = captures.filter(c => {
                    const captureDateValue = c.original_report_date || c.date;
                if (!captureDateValue) return false;
                // Normalizar fecha para comparación
                const normalizedCaptureDate = captureDateValue.split('T')[0];
                const normalizedSelectedDate = selectedDate.split('T')[0];
                return normalizedCaptureDate === normalizedSelectedDate;
            });
            
            if (captures.length === 0) {
                Utils.showNotification(`No hay capturas para exportar para la fecha ${Utils.formatDate(selectedDate, 'DD/MM/YYYY')}`, 'warning');
                this.isExporting = false;
                return;
            }

            // Obtener llegadas SOLO de la fecha seleccionada
            // IMPORTANTE: Solo mostrar llegadas que realmente existan para esa fecha
            const arrivals = await DB.getAll('agency_arrivals') || [];
            const filteredArrivals = arrivals.filter(a => {
                if (!a.date) return false;
                const arrivalDate = a.date.split('T')[0];
                const normalizedSelectedDate = selectedDate.split('T')[0];
                return arrivalDate === normalizedSelectedDate;
            });
            
            // Obtener IDs de agencias de las capturas para filtrar llegadas relacionadas
            const captureAgencyIds = [...new Set(captures.map(c => c.agency_id).filter(Boolean))];
            
            // Filtrar llegadas para mostrar solo las que están relacionadas con las capturas
            // O si no hay agencias en capturas, mostrar todas las llegadas de esa fecha
            const todayArrivals = captureAgencyIds.length > 0
                ? filteredArrivals.filter(a => captureAgencyIds.includes(a.agency_id))
                : filteredArrivals;
            
            // Calcular comisiones
            const commissionRules = await DB.getAll('commission_rules') || [];
            const sellers = await DB.getAll('catalog_sellers') || [];
            const guides = await DB.getAll('catalog_guides') || [];
            const agencies = await DB.getAll('catalog_agencies') || [];
            const branches = await DB.getAll('catalog_branches') || [];

            // Crear PDF en formato HORIZONTAL (landscape) A4 para mejor legibilidad
            const doc = new jsPDF('l', 'mm', 'a4'); // 'l' = landscape (horizontal)
            const pageWidth = doc.internal.pageSize.getWidth(); // ~297mm en horizontal
            const pageHeight = doc.internal.pageSize.getHeight(); // ~210mm en horizontal
            const margin = 12; // Margen reducido para aprovechar mejor el espacio horizontal
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
            const reportDate = new Date(selectedDate + 'T00:00:00');
            const formattedDate = reportDate.toLocaleDateString('es-MX', { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit' 
            });
            doc.text(`Fecha del Reporte: ${formattedDate}`, pageWidth - margin, 22, { align: 'right' });

            y = 45;

            // ========== RESUMEN ==========
            // IMPORTANTE: Calcular totales desde los PAGOS ORIGINALES, no desde c.total que ya está convertido
            const totals = { USD: 0, MXN: 0, CAD: 0 };
            let totalQuantity = 0;
            
            // Obtener tipo de cambio del día para mostrar en el reporte
            const exchangeRatesForDisplay = await this.getExchangeRatesForDate(selectedDate);
            const usdRateForDisplay = exchangeRatesForDisplay?.usd || 18.0;
            const cadRateForDisplay = exchangeRatesForDisplay?.cad || 13.0;
            
            captures.forEach(c => {
                // Calcular desde pagos individuales si existen (valores originales)
                if (c.payments && Array.isArray(c.payments) && c.payments.length > 0) {
                    c.payments.forEach(payment => {
                        const amount = parseFloat(payment.amount) || 0;
                        const currency = payment.currency || c.currency || 'MXN';
                        totals[currency] = (totals[currency] || 0) + amount;
                    });
                } else {
                    // Fallback: Si no hay pagos, intentar obtener el valor original
                    // Si c.currency es USD o CAD, necesitamos el valor original, no el convertido
                    // Por ahora, usar c.total pero dividir por el tipo de cambio si es necesario
                    // NOTA: Esto es un fallback, idealmente todas las capturas deberían tener payments
                    const currency = c.currency || 'MXN';
                    if (currency === 'USD') {
                        // Si el total está en MXN, dividir por el tipo de cambio para obtener USD original
                        // Pero si ya está en USD, usar directamente
                        // Asumimos que c.total puede estar en MXN si fue convertido
                        // Intentar obtener desde un campo original_amount si existe
                        const originalAmount = c.original_amount || (parseFloat(c.total) || 0) / usdRateForDisplay;
                        totals.USD = (totals.USD || 0) + originalAmount;
                    } else if (currency === 'CAD') {
                        const originalAmount = c.original_amount || (parseFloat(c.total) || 0) / cadRateForDisplay;
                        totals.CAD = (totals.CAD || 0) + originalAmount;
                    } else {
                        totals.MXN = (totals.MXN || 0) + (parseFloat(c.total) || 0);
                    }
                }
                totalQuantity += c.quantity || 1;
            });

            // Obtener información de sucursal(es)
            const captureBranchIdsForSummary = [...new Set(captures.map(c => c.branch_id).filter(Boolean))];
            const branchNames = captureBranchIdsForSummary.map(bid => {
                const branch = branches.find(b => b.id === bid);
                return branch ? branch.name : 'N/A';
            }).join(', ');

            doc.setFillColor(240, 248, 255);
            doc.rect(margin, y, pageWidth - (margin * 2), 45, 'F'); // Aumentado de 30 a 45 para más espacio
            doc.setDrawColor(200, 200, 200);
            doc.rect(margin, y, pageWidth - (margin * 2), 45);

            doc.setTextColor(0, 0, 0);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('RESUMEN DEL DÍA', margin + 5, y + 8);

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`Sucursal(es): ${branchNames || 'Todas'}`, margin + 5, y + 15);
            doc.text(`Fecha: ${selectedDate}`, pageWidth - margin - 5, y + 15, { align: 'right' });

            doc.setFontSize(10);
            doc.text(`Total Capturas: ${captures.length}`, margin + 5, y + 22);
            doc.text(`Total Cantidad: ${totalQuantity}`, margin + 80, y + 22);
            
            // Mostrar totales en ambas monedas con tipo de cambio (mejor organizado)
            const summaryCol1X = margin + 5;
            const summaryCol2X = margin + 140; // Columna derecha para tipo de cambio y total general
            
            doc.setFontSize(10);
            // Mostrar USD con conversión
            const summaryTotalUSDOriginal = totals.USD || 0;
            const summaryTotalUSDInMXN = summaryTotalUSDOriginal * usdRateForDisplay;
            doc.text(`Total USD: $${summaryTotalUSDOriginal.toFixed(2)} = $${summaryTotalUSDInMXN.toFixed(2)} MXN`, summaryCol1X, y + 28);
            
            // Mostrar CAD con conversión
            const summaryTotalCADOriginal = totals.CAD || 0;
            const summaryTotalCADInMXN = summaryTotalCADOriginal * cadRateForDisplay;
            doc.text(`Total CAD: $${summaryTotalCADOriginal.toFixed(2)} = $${summaryTotalCADInMXN.toFixed(2)} MXN`, summaryCol1X, y + 33);
            
            // Mostrar MXN
            doc.text(`Total MXN: $${totals.MXN.toFixed(2)}`, summaryCol1X, y + 38);
            
            // Tipo de cambio del día (columna derecha)
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text('Tipo de Cambio:', summaryCol2X, y + 22);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text(`USD: $${usdRateForDisplay.toFixed(2)} MXN`, summaryCol2X, y + 27);
            doc.text(`CAD: $${cadRateForDisplay.toFixed(2)} MXN`, summaryCol2X, y + 32);
            
            // Total general en MXN
            const totalGeneralMXN = summaryTotalUSDInMXN + totals.MXN + summaryTotalCADInMXN;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text(`TOTAL GENERAL: $${totalGeneralMXN.toFixed(2)} MXN`, summaryCol2X, y + 38);

            y += 50; // Aumentado para acomodar el nuevo tamaño del resumen

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

            // Definir anchos de columnas para la tabla de capturas (formato horizontal A4 - bien distribuidas)
            // A4 horizontal: 297mm ancho, 210mm alto
            // Margen: 12mm, espacio útil: 273mm
            // IMPORTANTE: Definir ANTES de usar para evitar errores de inicialización
            const captCol1X = margin + 2;           // Hora (14mm)
            const captCol2X = margin + 16;          // Sucursal (18mm)
            const captCol3X = margin + 36;          // Vendedor (20mm)
            const captCol4X = margin + 58;          // Guía (18mm)
            const captCol5X = margin + 78;          // Producto (30mm)
            const captCol6X = margin + 110;         // Notas (18mm)
            const captCol7X = margin + 130;         // Cantidad (12mm)
            const captCol8X = margin + 144;         // Moneda Original (32mm)
            const captCol9X = margin + 178;         // Total MXN (32mm)
            const captCol10X = margin + 212;        // Total Original (32mm)
            const captCol10EndX = pageWidth - margin - 2; // Fin de la última columna

            // Encabezados de tabla (mejor organizados)
            doc.setFillColor(245, 245, 245);
            doc.rect(margin, y, pageWidth - (margin * 2), 8, 'F');
            doc.setDrawColor(200, 200, 200);
            doc.rect(margin, y, pageWidth - (margin * 2), 8);
            
            // Líneas verticales para separar columnas (bien alineadas con las nuevas posiciones)
            doc.setDrawColor(180, 180, 180);
            doc.line(captCol2X - 1, y, captCol2X - 1, y + 8);
            doc.line(captCol3X - 1, y, captCol3X - 1, y + 8);
            doc.line(captCol4X - 1, y, captCol4X - 1, y + 8);
            doc.line(captCol5X - 1, y, captCol5X - 1, y + 8);
            doc.line(captCol6X - 1, y, captCol6X - 1, y + 8);
            doc.line(captCol7X - 1, y, captCol7X - 1, y + 8);
            doc.line(captCol8X - 1, y, captCol8X - 1, y + 8);
            doc.line(captCol9X - 1, y, captCol9X - 1, y + 8);
            doc.line(captCol10X - 1, y, captCol10X - 1, y + 8);

            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.text('Hora', captCol1X, y + 5.5);
            doc.text('Sucursal', captCol2X, y + 5.5);
            doc.text('Vendedor', captCol3X, y + 5.5);
            doc.text('Guía', captCol4X, y + 5.5);
            doc.text('Producto', captCol5X, y + 5.5);
            doc.text('Notas', captCol6X, y + 5.5);
            doc.text('Cant.', captCol7X, y + 5.5, { align: 'right' });
            // Calcular anchos de columnas para alineación correcta
            const captCol8Width = captCol9X - captCol8X - 2;
            const captCol9Width = captCol10X - captCol9X - 2;
            const captCol10Width = captCol10EndX - captCol10X - 2;
            doc.text('Moneda Original', captCol8X + (captCol8Width / 2), y + 5.5, { align: 'center', maxWidth: captCol8Width });
            doc.text('Total MXN', captCol9X + captCol9Width, y + 5.5, { align: 'right', maxWidth: captCol9Width });
            doc.text('Total Original', captCol10X + captCol10Width, y + 5.5, { align: 'right', maxWidth: captCol10Width });

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
                    
                    // Líneas verticales (bien alineadas)
                    doc.setDrawColor(180, 180, 180);
                    doc.line(captCol2X - 1, y, captCol2X - 1, y + 8);
                    doc.line(captCol3X - 1, y, captCol3X - 1, y + 8);
                    doc.line(captCol4X - 1, y, captCol4X - 1, y + 8);
                    doc.line(captCol5X - 1, y, captCol5X - 1, y + 8);
                    doc.line(captCol6X - 1, y, captCol6X - 1, y + 8);
                    doc.line(captCol7X - 1, y, captCol7X - 1, y + 8);
                    doc.line(captCol8X - 1, y, captCol8X - 1, y + 8);
                    doc.line(captCol9X - 1, y, captCol9X - 1, y + 8);
                    
                    // Calcular anchos de columnas para alineación correcta (mismo que arriba)
                    const captCol8Width = captCol9X - captCol8X - 2;
                    const captCol9Width = captCol10X - captCol9X - 2;
                    const captCol10Width = captCol10EndX - captCol10X - 2;
                    
                    doc.setFontSize(7);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Hora', captCol1X, y + 5.5);
                    doc.text('Sucursal', captCol2X, y + 5.5);
                    doc.text('Vendedor', captCol3X, y + 5.5);
                    doc.text('Guía', captCol4X, y + 5.5);
                    doc.text('Producto', captCol5X, y + 5.5);
                    doc.text('Notas', captCol6X, y + 5.5);
                    doc.text('Cant.', captCol7X, y + 5.5, { align: 'right' });
                    doc.text('Moneda Original', captCol8X + (captCol8Width / 2), y + 5.5, { align: 'center', maxWidth: captCol8Width });
                    doc.text('Total MXN', captCol9X + captCol9Width, y + 5.5, { align: 'right', maxWidth: captCol9Width });
                    doc.text('Total Original', captCol10X + captCol10Width, y + 5.5, { align: 'right', maxWidth: captCol10Width });
                    y += 8;
                }

                const time = new Date(c.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                
                // Calcular valores originales y convertidos
                let originalAmount = 0;
                let totalMXN = parseFloat(c.total) || 0;
                const currency = c.currency || 'MXN';
                
                // Si hay pagos individuales, calcular desde ellos
                if (c.payments && Array.isArray(c.payments) && c.payments.length > 0) {
                    let totalOriginal = 0;
                    let totalMXNFromPayments = 0;
                    c.payments.forEach(payment => {
                        const amount = parseFloat(payment.amount) || 0;
                        const payCurrency = payment.currency || currency;
                        totalOriginal += amount;
                        
                        // Convertir a MXN
                        if (payCurrency === 'USD') {
                            totalMXNFromPayments += amount * usdRateForDisplay;
                        } else if (payCurrency === 'CAD') {
                            totalMXNFromPayments += amount * cadRateForDisplay;
                        } else {
                            totalMXNFromPayments += amount;
                        }
                    });
                    originalAmount = totalOriginal;
                    totalMXN = totalMXNFromPayments;
                } else {
                    // Fallback: Si no hay pagos, usar el total y calcular el original
                    if (currency === 'USD') {
                        originalAmount = totalMXN / usdRateForDisplay;
                    } else if (currency === 'CAD') {
                        originalAmount = totalMXN / cadRateForDisplay;
                    } else {
                        originalAmount = totalMXN;
                    }
                }
                
                doc.setDrawColor(220, 220, 220);
                doc.rect(margin, y, pageWidth - (margin * 2), 7);
                
                // Líneas verticales para filas (bien alineadas)
                doc.setDrawColor(200, 200, 200);
                doc.line(captCol2X - 1, y, captCol2X - 1, y + 7);
                doc.line(captCol3X - 1, y, captCol3X - 1, y + 7);
                doc.line(captCol4X - 1, y, captCol4X - 1, y + 7);
                doc.line(captCol5X - 1, y, captCol5X - 1, y + 7);
                doc.line(captCol6X - 1, y, captCol6X - 1, y + 7);
                doc.line(captCol7X - 1, y, captCol7X - 1, y + 7);
                doc.line(captCol8X - 1, y, captCol8X - 1, y + 7);
                doc.line(captCol9X - 1, y, captCol9X - 1, y + 7);
                doc.line(captCol10X - 1, y, captCol10X - 1, y + 7);
                
                doc.setFontSize(7);
                doc.setFont('helvetica', 'normal');
                doc.text(time, captCol1X, y + 5);
                doc.text((c.branch_name || 'N/A').substring(0, 12), captCol2X, y + 5);
                doc.text((c.seller_name || 'N/A').substring(0, 14), captCol3X, y + 5);
                doc.text((c.guide_name || '-').substring(0, 12), captCol4X, y + 5);
                doc.text((c.product || '').substring(0, 20), captCol5X, y + 5);
                // Notas (truncar si es muy largo)
                const notesText = (c.notes || '-').substring(0, 12);
                doc.text(notesText, captCol6X, y + 5);
                doc.text(c.quantity.toString(), captCol7X, y + 5, { align: 'right' });
                
                // Mostrar moneda original con monto (bien centrado en su columna)
                const currencyDisplay = currency !== 'MXN' 
                    ? `${currency} $${originalAmount.toFixed(2)}` 
                    : `MXN $${originalAmount.toFixed(2)}`;
                const currencyColWidth = captCol9X - captCol8X - 2;
                doc.text(currencyDisplay, captCol8X + (currencyColWidth / 2), y + 5, { align: 'center', maxWidth: currencyColWidth });
                
                // Mostrar total en MXN (alineado a la derecha de su columna)
                doc.setFont('helvetica', 'bold');
                const mxnColWidth = captCol10X - captCol9X - 2;
                doc.text(`$${totalMXN.toFixed(2)}`, captCol9X + mxnColWidth, y + 5, { align: 'right', maxWidth: mxnColWidth });
                
                // Mostrar total original (alineado a la derecha de su columna)
                doc.setFont('helvetica', 'normal');
                const originalColWidth = captCol10EndX - captCol10X - 2;
                if (currency !== 'MXN') {
                    doc.text(`$${originalAmount.toFixed(2)} ${currency}`, captCol10X + originalColWidth, y + 5, { align: 'right', maxWidth: originalColWidth });
                } else {
                    doc.text(`$${originalAmount.toFixed(2)}`, captCol10X + originalColWidth, y + 5, { align: 'right', maxWidth: originalColWidth });
                }
                
                y += 7;
            });

            y += 5;

            // ========== COMISIONES ==========
            // Obtener tipo de cambio del día PRIMERO (para convertir comisiones a MXN)
            // IMPORTANTE: Usar la fecha seleccionada, no la fecha actual
            const exchangeRates = await DB.query('exchange_rates_daily', 'date', selectedDate) || [];
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

                    // Definir anchos de columnas (bien distribuidas en formato horizontal)
                    const col1X = margin + 2; // Vendedor (70mm)
                    const col2X = margin + 75; // Total MXN (35mm)
                    const col3X = margin + 113; // USD (30mm)
                    const col4X = margin + 146; // MXN (30mm)
                    const col5X = margin + 179; // CAD (30mm)
                    const col5EndX = pageWidth - margin - 2; // Fin de la última columna
                    const nameMaxWidth = col2X - col1X - 5; // Ancho máximo para nombre
                    
                    // Calcular anchos de columnas una sola vez (fuera del forEach)
                    const col2Width = col3X - col2X - 2;
                    const col3Width = col4X - col3X - 2;
                    const col4Width = col5X - col4X - 2;
                    const col5Width = col5EndX - col5X - 2;

                    // Líneas verticales para separar columnas
                    doc.setDrawColor(180, 180, 180);
                    doc.line(col2X - 1, y, col2X - 1, y + 6);
                    doc.line(col3X - 1, y, col3X - 1, y + 6);
                    doc.line(col4X - 1, y, col4X - 1, y + 6);
                    doc.line(col5X - 1, y, col5X - 1, y + 6);
                    doc.line(col5EndX - 1, y, col5EndX - 1, y + 6);
                    doc.line(col5EndX - 1, y, col5EndX - 1, y + 6);

                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Vendedor', col1X, y + 4);
                    doc.text('Total MXN', col2X + col2Width, y + 4, { align: 'right', maxWidth: col2Width });
                    doc.text('USD', col3X + col3Width, y + 4, { align: 'right', maxWidth: col3Width });
                    doc.text('MXN', col4X + col4Width, y + 4, { align: 'right', maxWidth: col4Width });
                    doc.text('CAD', col5X + col5Width, y + 4, { align: 'right', maxWidth: col5Width });
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
                            // Líneas verticales para separar columnas
                            doc.setDrawColor(180, 180, 180);
                            doc.line(col2X - 1, y, col2X - 1, y + 6);
                            doc.line(col3X - 1, y, col3X - 1, y + 6);
                            doc.line(col4X - 1, y, col4X - 1, y + 6);
                            doc.line(col5X - 1, y, col5X - 1, y + 6);
                            doc.line(col5EndX - 1, y, col5EndX - 1, y + 6);
                            
                            doc.setFontSize(8);
                            doc.setFont('helvetica', 'bold');
                            doc.text('Vendedor', col1X, y + 4);
                            // Usar las variables ya declaradas fuera del forEach
                            doc.text('Total MXN', col2X + col2Width, y + 4, { align: 'right', maxWidth: col2Width });
                            doc.text('USD', col3X + col3Width, y + 4, { align: 'right', maxWidth: col3Width });
                            doc.text('MXN', col4X + col4Width, y + 4, { align: 'right', maxWidth: col4Width });
                            doc.text('CAD', col5X + col5Width, y + 4, { align: 'right', maxWidth: col5Width });
                            y += 6;
                        }
                        doc.setDrawColor(220, 220, 220);
                        doc.rect(margin, y, pageWidth - (margin * 2), 6);
                        
                        // Líneas verticales para filas
                        doc.setDrawColor(200, 200, 200);
                        doc.line(col2X - 1, y, col2X - 1, y + 6);
                        doc.line(col3X - 1, y, col3X - 1, y + 6);
                        doc.line(col4X - 1, y, col4X - 1, y + 6);
                        doc.line(col5X - 1, y, col5X - 1, y + 6);
                        
                        // Usar las variables ya declaradas fuera del forEach
                        doc.text((s.seller?.name || 'N/A').substring(0, 25), col1X, y + 4, { maxWidth: col2X - col1X - 5 });
                        doc.text(`$${(parseFloat(s.total) || 0).toFixed(2)}`, col2X + col2Width, y + 4, { align: 'right', maxWidth: col2Width });
                        doc.text(s.commissions?.USD ? `$${(parseFloat(s.commissions.USD) || 0).toFixed(2)}` : '-', col3X + col3Width, y + 4, { align: 'right', maxWidth: col3Width });
                        doc.text(s.commissions?.MXN ? `$${(parseFloat(s.commissions.MXN) || 0).toFixed(2)}` : '-', col4X + col4Width, y + 4, { align: 'right', maxWidth: col4Width });
                        doc.text(s.commissions?.CAD ? `$${(parseFloat(s.commissions.CAD) || 0).toFixed(2)}` : '-', col5X + col5Width, y + 4, { align: 'right', maxWidth: col5Width });
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
                    // Usar la variable ya declarada fuera del forEach
                    doc.setFont('helvetica', 'bold');
                    doc.text('TOTAL VENDEDORES', col1X, y + 4);
                    doc.text(`$${(parseFloat(totalSellerComm) || 0).toFixed(2)}`, col2X + col2Width, y + 4, { align: 'right', maxWidth: col2Width });
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

                    // Definir anchos de columnas (mismo que vendedores, bien distribuidas)
                    const col1X = margin + 2; // Guía (70mm)
                    const col2X = margin + 75; // Total MXN (35mm)
                    const col3X = margin + 113; // USD (30mm)
                    const col4X = margin + 146; // MXN (30mm)
                    const col5X = margin + 179; // CAD (30mm)
                    const col5EndX = pageWidth - margin - 2; // Fin de la última columna
                    
                    // Calcular anchos de columnas una sola vez (fuera del forEach)
                    const col2WidthGuide = col3X - col2X - 2;
                    const col3WidthGuide = col4X - col3X - 2;
                    const col4WidthGuide = col5X - col4X - 2;
                    const col5WidthGuide = col5EndX - col5X - 2;

                    // Líneas verticales para separar columnas
                    doc.setDrawColor(180, 180, 180);
                    doc.line(col2X - 1, y, col2X - 1, y + 6);
                    doc.line(col3X - 1, y, col3X - 1, y + 6);
                    doc.line(col4X - 1, y, col4X - 1, y + 6);
                    doc.line(col5X - 1, y, col5X - 1, y + 6);
                    doc.line(col5EndX - 1, y, col5EndX - 1, y + 6);

                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Guía', col1X, y + 4);
                    // Usar las variables ya declaradas fuera del forEach
                    doc.text('Total MXN', col2X + col2WidthGuide, y + 4, { align: 'right', maxWidth: col2WidthGuide });
                    doc.text('USD', col3X + col3WidthGuide, y + 4, { align: 'right', maxWidth: col3WidthGuide });
                    doc.text('MXN', col4X + col4WidthGuide, y + 4, { align: 'right', maxWidth: col4WidthGuide });
                    doc.text('CAD', col5X + col5WidthGuide, y + 4, { align: 'right', maxWidth: col5WidthGuide });
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
                            // Líneas verticales para separar columnas
                            doc.setDrawColor(180, 180, 180);
                            doc.line(col2X - 1, y, col2X - 1, y + 6);
                            doc.line(col3X - 1, y, col3X - 1, y + 6);
                            doc.line(col4X - 1, y, col4X - 1, y + 6);
                            doc.line(col5X - 1, y, col5X - 1, y + 6);
                            doc.line(col5EndX - 1, y, col5EndX - 1, y + 6);
                            
                            doc.setFontSize(8);
                            doc.setFont('helvetica', 'bold');
                            doc.text('Guía', col1X, y + 4);
                            // Usar las variables ya declaradas fuera del forEach
                            doc.text('Total MXN', col2X + col2WidthGuide, y + 4, { align: 'right', maxWidth: col2WidthGuide });
                            doc.text('USD', col3X + col3WidthGuide, y + 4, { align: 'right', maxWidth: col3WidthGuide });
                            doc.text('MXN', col4X + col4WidthGuide, y + 4, { align: 'right', maxWidth: col4WidthGuide });
                            doc.text('CAD', col5X + col5WidthGuide, y + 4, { align: 'right', maxWidth: col5WidthGuide });
                            y += 6;
                        }
                        doc.setDrawColor(220, 220, 220);
                        doc.rect(margin, y, pageWidth - (margin * 2), 6);
                        
                        // Líneas verticales para filas
                        doc.setDrawColor(200, 200, 200);
                        doc.line(col2X - 1, y, col2X - 1, y + 6);
                        doc.line(col3X - 1, y, col3X - 1, y + 6);
                        doc.line(col4X - 1, y, col4X - 1, y + 6);
                        doc.line(col5X - 1, y, col5X - 1, y + 6);
                        
                        // Usar las variables ya declaradas fuera del forEach
                        doc.text((g.guide?.name || 'N/A').substring(0, 25), col1X, y + 4, { maxWidth: col2X - col1X - 5 });
                        doc.text(`$${(parseFloat(g.total) || 0).toFixed(2)}`, col2X + col2WidthGuide, y + 4, { align: 'right', maxWidth: col2WidthGuide });
                        doc.text(g.commissions?.USD ? `$${(parseFloat(g.commissions.USD) || 0).toFixed(2)}` : '-', col3X + col3WidthGuide, y + 4, { align: 'right', maxWidth: col3WidthGuide });
                        doc.text(g.commissions?.MXN ? `$${(parseFloat(g.commissions.MXN) || 0).toFixed(2)}` : '-', col4X + col4WidthGuide, y + 4, { align: 'right', maxWidth: col4WidthGuide });
                        doc.text(g.commissions?.CAD ? `$${(parseFloat(g.commissions.CAD) || 0).toFixed(2)}` : '-', col5X + col5WidthGuide, y + 4, { align: 'right', maxWidth: col5WidthGuide });
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
                    // Usar la variable ya declarada fuera del forEach
                    doc.setFont('helvetica', 'bold');
                    doc.text('TOTAL GUÍAS', col1X, y + 4);
                    doc.text(`$${(parseFloat(totalGuideComm) || 0).toFixed(2)}`, col2X + col2WidthGuide, y + 4, { align: 'right', maxWidth: col2WidthGuide });
                    y += 8;
                }
            }

            // ========== UTILIDADES (MARGEN BRUTO Y NETO) ==========
            // IMPORTANTE: Usar los tipos de cambio del display (usdRateForDisplay, cadRateForDisplay)
            // que ya se obtuvieron arriba, no los de la BD
            // Convertir totales a MXN - Asegurar que todos sean números
            const totalsUSD = parseFloat(totals.USD) || 0;
            const totalsMXN = parseFloat(totals.MXN) || 0;
            const totalsCAD = parseFloat(totals.CAD) || 0;
            // Usar los tipos de cambio del display (prioridad) o los de la BD como fallback
            const usdRateNum = parseFloat(usdRateForDisplay) || parseFloat(usdRate) || 20.0;
            const cadRateNum = parseFloat(cadRateForDisplay) || parseFloat(cadRate) || 15.0;
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
            // IMPORTANTE: Usar la fecha seleccionada, no la fecha actual
            const captureBranchIds = [...new Set(captures.map(c => c.branch_id).filter(Boolean))];
            const branchIdForArrivals = captureBranchIds.length === 1 ? captureBranchIds[0] : null;
            const totalArrivalCostsRaw = await this.calculateArrivalCosts(selectedDate, branchIdForArrivals, captureBranchIds);
            // Asegurar que sea un número
            const totalArrivalCosts = typeof totalArrivalCostsRaw === 'number' ? totalArrivalCostsRaw : parseFloat(totalArrivalCostsRaw) || 0;

            // Costos operativos del día (prorrateados)
            // IMPORTANTE: Usar la fecha seleccionada, no la fecha actual
            // SEPARAR: Variables del día vs Fijos prorrateados
            let variableCostsDaily = 0;  // Costos variables registrados hoy
            let fixedCostsProrated = 0;  // Costos fijos prorrateados (mensuales, semanales, anuales)
            let bankCommissions = 0;
            try {
                const allCosts = await DB.getAll('cost_entries') || [];
                const targetDate = new Date(selectedDate);
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

                    // B) COSTOS VARIABLES DEL DÍA (registrados en la fecha seleccionada)
                    const variableCosts = branchCosts.filter(c => {
                        const costDate = c.date || c.created_at;
                        const costDateStr = costDate.split('T')[0];
                        const normalizedSelectedDate = selectedDate.split('T')[0];
                        return costDateStr === normalizedSelectedDate &&
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
                        const normalizedSelectedDate = selectedDate.split('T')[0];
                        return costDateStr === normalizedSelectedDate &&
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

            // Línea 1: Ingresos (bien alineada) - Mostrar en ambas monedas con conversión
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('Ingresos:', labelX, y + 8);
            doc.text(`$${totalSalesMXNNum.toFixed(2)} MXN`, valueX, y + 8, { align: 'right' });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            // Mostrar desglose detallado con conversiones usando los tipos de cambio del día
            const utilTotalUSDOriginal = totals.USD || 0;
            const utilTotalCADOriginal = totals.CAD || 0;
            const utilTotalMXNOriginal = totals.MXN || 0;
            const utilTotalUSDInMXN = utilTotalUSDOriginal * usdRateForDisplay;
            const utilTotalCADInMXN = utilTotalCADOriginal * cadRateForDisplay;
            
            let currencyDetails = '';
            if (utilTotalUSDOriginal > 0) {
                currencyDetails += `USD: $${utilTotalUSDOriginal.toFixed(2)} (x${usdRateForDisplay.toFixed(2)}) = $${utilTotalUSDInMXN.toFixed(2)} MXN`;
            }
            if (utilTotalMXNOriginal > 0) {
                if (currencyDetails) currencyDetails += ' | ';
                currencyDetails += `MXN: $${utilTotalMXNOriginal.toFixed(2)}`;
            }
            if (utilTotalCADOriginal > 0) {
                if (currencyDetails) currencyDetails += ' | ';
                currencyDetails += `CAD: $${utilTotalCADOriginal.toFixed(2)} (x${cadRateForDisplay.toFixed(2)}) = $${utilTotalCADInMXN.toFixed(2)} MXN`;
            }
            if (currencyDetails) {
            doc.text(currencyDetails, labelX + 5, y + 12.5, { maxWidth: valueX - labelX - 15 });
            }

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
            const todayStr = Utils.formatDate(new Date(selectedDate + 'T00:00:00'), 'YYYYMMDD');
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
            // Obtener la fecha seleccionada del formulario
            const dateInput = document.getElementById('qc-date');
            const selectedDate = dateInput?.value || new Date().toISOString().split('T')[0];
            const normalizedSelectedDate = selectedDate.split('T')[0];
            
            let captures = await DB.getAll('temp_quick_captures') || [];
            captures = captures.filter(c => {
                const captureDate = c.date || c.original_report_date || '';
                return captureDate.split('T')[0] === normalizedSelectedDate;
            });

            if (captures.length === 0) {
                Utils.showNotification(`No hay capturas para archivar para la fecha ${normalizedSelectedDate}`, 'warning');
                return;
            }

            // Calcular todos los datos del reporte
            const exchangeRates = await DB.query('exchange_rates_daily', 'date', normalizedSelectedDate) || [];
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
            const totalArrivalCostsRaw = await this.calculateArrivalCosts(normalizedSelectedDate, branchIdForArrivals, captureBranchIds);
            const totalArrivalCosts = typeof totalArrivalCostsRaw === 'number' ? totalArrivalCostsRaw : parseFloat(totalArrivalCostsRaw) || 0;
            
            // Obtener llegadas para guardar en el archivo (filtrar por fecha seleccionada)
            const arrivals = await DB.getAll('agency_arrivals') || [];
            const selectedDateArrivals = arrivals.filter(a => {
                if (!a.date) return false;
                const arrivalDate = a.date.split('T')[0];
                return arrivalDate === normalizedSelectedDate;
            });
            const filteredArrivals = selectedDateArrivals.filter(a => 
                captureBranchIds.length === 0 || !a.branch_id || captureBranchIds.includes(a.branch_id)
            );

            // Calcular costos operativos (usar misma lógica que loadQuickCaptureProfits)
            let variableCostsDaily = 0;  // Costos variables registrados hoy
            let fixedCostsProrated = 0;  // Costos fijos prorrateados (mensuales, semanales, anuales)
            let bankCommissions = 0;
            try {
                const allCosts = await DB.getAll('cost_entries') || [];
                const targetDate = new Date(normalizedSelectedDate);
                
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

                    // B) COSTOS VARIABLES DEL DÍA (usar fecha seleccionada)
                    const variableCosts = branchCosts.filter(c => {
                        const costDate = c.date || c.created_at;
                        const costDateStr = costDate.split('T')[0];
                        return costDateStr === normalizedSelectedDate &&
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
                        return sessionDateStr === normalizedSelectedDate;
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

            // ========== CALCULAR MÉTRICAS: Ticket Promedio y % de Cierre ==========
            const metrics = {
                general: {
                    total_ventas: captures.length,
                    total_pasajeros: 0,
                    cierre_percent: 0
                },
                por_agencia: [],
                por_guia: [],
                por_vendedor: []
            };

            // Obtener total de pasajeros del día (de las llegadas ya filtradas)
            const totalPassengers = filteredArrivals.reduce((sum, arrival) => sum + (arrival.passengers || 0), 0);
            metrics.general.total_pasajeros = totalPassengers;
            metrics.general.cierre_percent = totalPassengers > 0 ? ((captures.length / totalPassengers) * 100) : 0;

            // Agrupar ventas por agencia
            const salesByAgency = {};
            captures.forEach(capture => {
                if (capture.agency_id) {
                    if (!salesByAgency[capture.agency_id]) {
                        salesByAgency[capture.agency_id] = {
                            agency_id: capture.agency_id,
                            agency_name: agencies.find(a => a.id === capture.agency_id)?.name || 'Desconocida',
                            ventas: 0,
                            total_ventas_mxn: 0
                        };
                    }
                    let captureTotalMXN = capture.total;
                    if (capture.currency === 'USD') {
                        captureTotalMXN = capture.total * usdRate;
                    } else if (capture.currency === 'CAD') {
                        captureTotalMXN = capture.total * cadRate;
                    }
                    salesByAgency[capture.agency_id].ventas++;
                    salesByAgency[capture.agency_id].total_ventas_mxn += captureTotalMXN;
                }
            });

            // Calcular métricas por agencia
            // Ticket promedio en USD: (Total ventas MXN) / (Pasajeros) / (Tipo cambio USD)
            Object.values(salesByAgency).forEach(agencyData => {
                const agencyPassengers = filteredArrivals
                    .filter(a => a.agency_id === agencyData.agency_id)
                    .reduce((sum, a) => sum + (a.passengers || 0), 0);
                
                // Ticket promedio en USD por pasajero
                const ticketPromedioUSD = (agencyPassengers > 0 && usdRate > 0) 
                    ? agencyData.total_ventas_mxn / agencyPassengers / usdRate 
                    : 0;
                const cierrePercent = agencyPassengers > 0 ? ((agencyData.ventas / agencyPassengers) * 100) : 0;

                metrics.por_agencia.push({
                    agency_id: agencyData.agency_id,
                    agency_name: agencyData.agency_name,
                    ventas: agencyData.ventas,
                    pasajeros: agencyPassengers,
                    cierre_percent: parseFloat(cierrePercent.toFixed(2)),
                    ticket_promedio: parseFloat(ticketPromedioUSD.toFixed(2)), // En USD
                    ticket_promedio_currency: 'USD',
                    total_ventas_mxn: parseFloat(agencyData.total_ventas_mxn.toFixed(2))
                });
            });

            // Agrupar ventas por guía
            const salesByGuide = {};
            captures.forEach(capture => {
                if (capture.guide_id) {
                    if (!salesByGuide[capture.guide_id]) {
                        const guide = guides.find(g => g.id === capture.guide_id);
                        salesByGuide[capture.guide_id] = {
                            guide_id: capture.guide_id,
                            guide_name: guide?.name || 'Desconocido',
                            agency_id: guide?.agency_id || capture.agency_id,
                            agency_name: agencies.find(a => a.id === (guide?.agency_id || capture.agency_id))?.name || 'Desconocida',
                            ventas: 0,
                            total_ventas_mxn: 0
                        };
                    }
                    let captureTotalMXN = capture.total;
                    if (capture.currency === 'USD') {
                        captureTotalMXN = capture.total * usdRate;
                    } else if (capture.currency === 'CAD') {
                        captureTotalMXN = capture.total * cadRate;
                    }
                    salesByGuide[capture.guide_id].ventas++;
                    salesByGuide[capture.guide_id].total_ventas_mxn += captureTotalMXN;
                }
            });

            // Calcular métricas por guía
            // Ticket promedio en USD: (Total ventas MXN) / (Pasajeros) / (Tipo cambio USD)
            Object.values(salesByGuide).forEach(guideData => {
                // Obtener pasajeros directamente del guía (de las llegadas con guide_id)
                const guidePassengers = filteredArrivals
                    .filter(a => a.guide_id === guideData.guide_id)
                    .reduce((sum, a) => sum + (a.passengers || 0), 0);

                // Ticket promedio en USD por pasajero
                const ticketPromedioUSD = (guidePassengers > 0 && usdRate > 0) 
                    ? guideData.total_ventas_mxn / guidePassengers / usdRate 
                    : 0;
                const cierrePercent = guidePassengers > 0 ? ((guideData.ventas / guidePassengers) * 100) : 0;

                metrics.por_guia.push({
                    guide_id: guideData.guide_id,
                    guide_name: guideData.guide_name,
                    agency_id: guideData.agency_id,
                    agency_name: guideData.agency_name,
                    ventas: guideData.ventas,
                    pasajeros: guidePassengers,
                    cierre_percent: parseFloat(cierrePercent.toFixed(2)),
                    ticket_promedio: parseFloat(ticketPromedioUSD.toFixed(2)), // En USD
                    ticket_promedio_currency: 'USD',
                    total_ventas_mxn: parseFloat(guideData.total_ventas_mxn.toFixed(2))
                });
            });

            // Agrupar ventas por vendedor
            const salesBySeller = {};
            captures.forEach(capture => {
                if (capture.seller_id) {
                    if (!salesBySeller[capture.seller_id]) {
                        salesBySeller[capture.seller_id] = {
                            seller_id: capture.seller_id,
                            seller_name: sellers.find(s => s.id === capture.seller_id)?.name || 'Desconocido',
                            ventas: 0,
                            total_ventas_mxn: 0
                        };
                    }
                    let captureTotalMXN = capture.total;
                    if (capture.currency === 'USD') {
                        captureTotalMXN = capture.total * usdRate;
                    } else if (capture.currency === 'CAD') {
                        captureTotalMXN = capture.total * cadRate;
                    }
                    salesBySeller[capture.seller_id].ventas++;
                    salesBySeller[capture.seller_id].total_ventas_mxn += captureTotalMXN;
                }
            });

            // Calcular métricas por vendedor
            // Ticket promedio en USD por venta: (Total ventas MXN) / (Número de ventas) / (Tipo cambio USD)
            // Para reportes diarios, el ticket promedio es por venta (no por día)
            Object.values(salesBySeller).forEach(sellerData => {
                // Ticket promedio en USD por venta
                const ticketPromedioUSD = (sellerData.ventas > 0 && usdRate > 0) 
                    ? sellerData.total_ventas_mxn / sellerData.ventas / usdRate 
                    : 0;

                metrics.por_vendedor.push({
                    seller_id: sellerData.seller_id,
                    seller_name: sellerData.seller_name,
                    ventas: sellerData.ventas,
                    ticket_promedio: parseFloat(ticketPromedioUSD.toFixed(2)), // En USD por venta
                    ticket_promedio_currency: 'USD',
                    total_ventas_mxn: parseFloat(sellerData.total_ventas_mxn.toFixed(2))
                });
            });

            // Crear objeto de reporte archivado con TODOS los datos calculados
            const archivedReport = {
                id: 'archived_' + normalizedSelectedDate + '_' + Date.now(),
                date: normalizedSelectedDate,
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
                metrics: metrics, // Métricas: ticket promedio y % de cierre
                archived_at: new Date().toISOString(),
                archived_by: typeof UserManager !== 'undefined' && UserManager.currentUser ? UserManager.currentUser.id : null
            };

            // Verificar si el store existe antes de guardar
            if (!DB.db || !DB.db.objectStoreNames.contains('archived_quick_captures')) {
                console.error('Store archived_quick_captures no existe en la base de datos');
                Utils.showNotification('Error: El store de reportes archivados no está disponible. Verifica la base de datos.', 'error');
                this.isExporting = false;
                return;
            }

            // Verificar si ya existe un reporte archivado para esta fecha
            let existingReport = null;
            try {
                const existingReports = await DB.query('archived_quick_captures', 'date', normalizedSelectedDate) || [];
                // Buscar el más reciente para esta fecha
                existingReport = existingReports
                    .filter(r => r.report_type === 'quick_capture')
                    .sort((a, b) => new Date(b.archived_at || 0) - new Date(a.archived_at || 0))[0];
            } catch (e) {
                console.warn('No se pudo verificar reportes existentes:', e);
            }

            // Si existe un reporte para esta fecha, actualizarlo; si no, crear uno nuevo
            if (existingReport) {
                // Actualizar reporte existente
                archivedReport.id = existingReport.id; // Mantener el mismo ID
                archivedReport.archived_at = new Date().toISOString(); // Actualizar timestamp
                console.log(`Actualizando reporte archivado existente: ${existingReport.id}`);
            } else {
                console.log(`Creando nuevo reporte archivado para fecha: ${normalizedSelectedDate}`);
            }

            // Guardar en IndexedDB (store permanente para historial)
            try {
            await DB.put('archived_quick_captures', archivedReport);
                console.log(`✅ Reporte archivado guardado correctamente: ${archivedReport.id}`);
            } catch (dbError) {
                console.error('Error guardando en IndexedDB:', dbError);
                throw new Error(`No se pudo guardar el reporte archivado: ${dbError.message}`);
            }

            // Guardar capturas en el servidor (sincronización bidireccional)
            if (typeof API !== 'undefined' && API.createQuickCapture) {
                console.log(`📤 Sincronizando ${captures.length} capturas con el servidor...`);
                let syncedCount = 0;
                let failedCount = 0;
                
                for (const capture of captures) {
                    try {
                        // Verificar si ya existe en el servidor (tiene server_id)
                        if (capture.server_id) {
                            // Actualizar captura existente
                            if (API.updateQuickCapture) {
                                await API.updateQuickCapture(capture.server_id, capture);
                                syncedCount++;
                            }
                        } else {
                            // Crear nueva captura en el servidor
                            const serverCapture = await API.createQuickCapture(capture);
                            if (serverCapture && serverCapture.id) {
                                // Actualizar la captura local con el server_id
                                capture.server_id = serverCapture.id;
                                await DB.put('temp_quick_captures', capture);
                                syncedCount++;
                            }
                        }
                } catch (e) {
                        console.warn(`⚠️ No se pudo sincronizar captura ${capture.id}:`, e);
                        failedCount++;
                        // Agregar a la cola de sincronización si SyncManager está disponible
                        if (typeof SyncManager !== 'undefined' && SyncManager.addToQueue) {
                            SyncManager.addToQueue('quick_captures', 'create', capture);
                        }
                    }
                }
                
                console.log(`✅ ${syncedCount} capturas sincronizadas con el servidor${failedCount > 0 ? `, ${failedCount} fallaron` : ''}`);
            } else {
                console.warn('⚠️ API.createQuickCapture no disponible, capturas no sincronizadas con servidor');
            }
            
            // CRÍTICO: Guardar el reporte archivado en el servidor (SIEMPRE intentar, incluso si las capturas fallaron)
            // Esto es independiente de la sincronización de capturas
            try {
                // Verificar que API esté disponible y configurado
                const isAPIAvailable = typeof API !== 'undefined' && 
                                      API.saveArchivedReport && 
                                      API.baseURL; // baseURL es requerido para hacer requests
                
                if (isAPIAvailable) {
                    const branchId = captureBranchIds.length === 1 ? captureBranchIds[0] : null;
                    const currentUserId = typeof UserManager !== 'undefined' && UserManager.currentUser ? UserManager.currentUser.id : null;
                    
                    console.log('📤 [CRÍTICO] Guardando reporte archivado en servidor...');
                    console.log(`   API.baseURL: ${API.baseURL}`);
                    console.log(`   API.token: ${API.token ? 'Presente' : 'Ausente (usará headers x-username/x-branch-id)'}`);
                    console.log(`   Fecha: ${normalizedSelectedDate}`);
                    console.log(`   Sucursal: ${branchId}`);
                    console.log(`   Usuario: ${currentUserId}`);
                    console.log(`   Capturas: ${captures.length}`);
                    
                    const reportData = {
                        report_date: normalizedSelectedDate,
                        branch_id: branchId,
                        total_captures: captures.length,
                        total_quantity: totalQuantity,
                        total_sales_mxn: totalSalesMXN,
                        total_cogs: totalCOGS,
                        total_commissions: totalCommissions,
                        total_arrival_costs: totalArrivalCosts,
                        total_operating_costs: totalOperatingCosts,
                        variable_costs_daily: variableCostsDaily,
                        fixed_costs_prorated: fixedCostsProrated,
                        bank_commissions: bankCommissions,
                        gross_profit: grossProfit,
                        net_profit: netProfit,
                        exchange_rates: { usd: usdRate, cad: cadRate },
                        captures: captures,
                        daily_summary: [{
                            date: normalizedSelectedDate,
                            captures: captures.length,
                            sales: totalSalesMXN,
                            profit: netProfit
                        }],
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
                        arrivals: filteredArrivals,
                        metrics: metrics
                    };
                    
                    console.log('📤 [CRÍTICO] Enviando petición POST a /api/reports/archived-quick-captures...');
                    const serverReport = await API.saveArchivedReport(reportData);
                    
                    if (serverReport && serverReport.id) {
                        console.log('✅ [CRÍTICO] Reporte archivado guardado en servidor:', serverReport.id);
                        console.log(`   Fecha del reporte: ${serverReport.report_date || serverReport.date}`);
                        console.log(`   Archivado por: ${serverReport.archived_by || 'N/A'}`);
                        
                        // Actualizar el reporte local con el ID del servidor
                        archivedReport.server_id = serverReport.id;
                        archivedReport.archived_by = serverReport.archived_by;
                        await DB.put('archived_quick_captures', archivedReport);
                        
                        Utils.showNotification('✅ Reporte archivado guardado en servidor correctamente', 'success', 3000);
                    } else {
                        console.error('❌ [CRÍTICO] El servidor no devolvió un ID para el reporte archivado');
                        console.error('   Respuesta del servidor:', serverReport);
                        Utils.showNotification('⚠️ El servidor no devolvió un ID para el reporte. Verifica los logs.', 'warning');
                    }
                } else {
                    console.error('❌ [CRÍTICO] API no está disponible o no está configurado correctamente');
                    console.error('   API disponible:', typeof API !== 'undefined');
                    console.error('   API.saveArchivedReport:', typeof API?.saveArchivedReport);
                    console.error('   API.baseURL:', API?.baseURL || 'NO CONFIGURADO');
                    console.error('   API.token:', API?.token ? 'Presente' : 'Ausente');
                    Utils.showNotification('⚠️ API no configurado. El reporte se guardó solo localmente. Configura la URL del servidor en Configuración → Sincronización.', 'warning');
                }
            } catch (e) {
                console.error('❌ [CRÍTICO] Error guardando reporte archivado en backend:', e);
                console.error('   Mensaje:', e.message);
                console.error('   Status:', e.status);
                console.error('   URL:', e.url);
                console.error('   Stack:', e.stack);
                
                // Mostrar mensaje de error más detallado
                let errorMessage = `Error al guardar reporte en servidor: ${e.message}`;
                if (e.status === 401) {
                    errorMessage += '. Token expirado. Por favor, inicia sesión nuevamente.';
                } else if (e.status === 403) {
                    errorMessage += '. No tienes permisos para guardar reportes.';
                } else if (e.message && e.message.includes('CORS')) {
                    errorMessage += '. Error de CORS. Verifica la configuración del servidor.';
                } else if (e.message && e.message.includes('Failed to fetch')) {
                    errorMessage += '. No se pudo conectar al servidor. Verifica tu conexión.';
                }
                
                Utils.showNotification(errorMessage + ' El reporte se guardó localmente.', 'warning');
                // No bloquear el proceso si falla el guardado en servidor
            }

            // Mostrar modal personalizado para confirmar limpieza
            const shouldClean = await this.showArchiveConfirmModal(captures.length, existingReport !== null);

            if (shouldClean) {
                // Eliminar capturas temporales del día (solo localmente, ya están en el servidor)
                let deletedCount = 0;
                for (const capture of captures) {
                    try {
                        // Si tiene server_id, también eliminar del servidor
                        if (capture.server_id && typeof API !== 'undefined' && API.deleteQuickCapture) {
                            try {
                                await API.deleteQuickCapture(capture.server_id);
                                console.log(`✅ Captura ${capture.id} eliminada del servidor`);
                            } catch (e) {
                                console.warn(`⚠️ No se pudo eliminar captura ${capture.id} del servidor:`, e);
                                // Agregar a cola de sincronización si falla
                                if (typeof SyncManager !== 'undefined' && SyncManager.addToQueue) {
                                    SyncManager.addToQueue('quick_captures', 'delete', { id: capture.server_id });
                                }
                            }
                        }
                        
                        // Eliminar de IndexedDB local
                    await DB.delete('temp_quick_captures', capture.id);
                        deletedCount++;
                    } catch (e) {
                        console.warn(`No se pudo eliminar captura ${capture.id}:`, e);
                }
                }
                Utils.showNotification(`Reporte archivado correctamente. ${deletedCount} capturas eliminadas del día (local y servidor).`, 'success');
                await this.loadQuickCaptureData();
            } else {
                Utils.showNotification('Reporte archivado correctamente. Las capturas temporales se mantienen.', 'success');
            }

            // Recargar historial
            await this.loadArchivedReports();
            
            console.log('✅ Proceso de archivado completado exitosamente');
        } catch (error) {
            console.error('❌ Error archivando reporte:', error);
            console.error('Stack trace:', error.stack);
            Utils.showNotification('Error al archivar el reporte: ' + (error.message || 'Error desconocido'), 'error');
        } finally {
            // Siempre resetear el flag, incluso si hay error
                this.isExporting = false;
            }
    },

    async showArchiveConfirmModal(captureCount, isUpdate) {
        return new Promise((resolve) => {
            // Crear modal de confirmación personalizado (bien posicionado)
            const confirmModal = document.createElement('div');
            confirmModal.className = 'modal-overlay';
            confirmModal.id = 'archive-confirm-modal';
            confirmModal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';
            
            const updateText = isUpdate ? ' (actualizado)' : '';
            confirmModal.innerHTML = `
                <div class="modal-content" style="max-width: 500px; width: 90%; background: white; border-radius: 8px; padding: 0; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                    <div class="modal-header" style="padding: 16px; border-bottom: 1px solid #e0e0e0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
                        <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: white;">
                            <i class="fas fa-archive" style="margin-right: 8px;"></i>Archivar Reporte${updateText}
                        </h3>
                    </div>
                    <div class="modal-body" style="padding: 20px;">
                        <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.5; color: #333;">
                            Se guardaron <strong>${captureCount}</strong> capturas en el historial.
                        </p>
                        <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #666;">
                            ¿Deseas limpiar las capturas temporales del día después de archivar?
                        </p>
                    </div>
                    <div class="modal-footer" style="padding: 16px; border-top: 1px solid #e0e0e0; display: flex; gap: 10px; justify-content: flex-end;">
                        <button class="btn-secondary" id="archive-keep-btn" style="min-width: 120px; padding: 10px;">
                            <i class="fas fa-save" style="margin-right: 6px;"></i>Mantener
                        </button>
                        <button class="btn-success" id="archive-clean-btn" style="min-width: 120px; padding: 10px;">
                            <i class="fas fa-trash" style="margin-right: 6px;"></i>Limpiar y Archivar
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(confirmModal);
            
            // Event listeners
            const keepBtn = document.getElementById('archive-keep-btn');
            const cleanBtn = document.getElementById('archive-clean-btn');
            
            const cleanup = () => {
                if (confirmModal && confirmModal.parentNode) {
                    confirmModal.parentNode.removeChild(confirmModal);
                }
            };
            
            keepBtn.onclick = () => {
                cleanup();
                resolve(false);
            };
            
            cleanBtn.onclick = () => {
                cleanup();
                resolve(true);
            };
            
            // Cerrar al hacer clic fuera del modal
            confirmModal.onclick = (e) => {
                if (e.target === confirmModal) {
                    cleanup();
                    resolve(false);
                }
            };
            
            // Cerrar con ESC
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    cleanup();
                    document.removeEventListener('keydown', escHandler);
                    resolve(false);
                }
            };
            document.addEventListener('keydown', escHandler);
        });
    },

    async clearQuickCapture() {
        const confirm = await Utils.confirm(
            '¿Eliminar TODAS las capturas del día? Esta acción no se puede deshacer.',
            'Limpiar Todas las Capturas'
        );
        if (!confirm) return;

        try {
            // Obtener la fecha seleccionada del formulario
            const dateInput = document.getElementById('qc-date');
            const selectedDate = dateInput?.value || new Date().toISOString().split('T')[0];
            const normalizedSelectedDate = selectedDate.split('T')[0];
            
            let captures = await DB.getAll('temp_quick_captures') || [];
            captures = captures.filter(c => {
                const captureDate = c.date || c.original_report_date || '';
                return captureDate.split('T')[0] === normalizedSelectedDate;
            });

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

            // PASO 1: Sincronizar reportes locales que NO están en el servidor (subirlos)
            try {
                if (typeof API !== 'undefined' && API.baseURL && API.saveArchivedReport) {
                    console.log('📤 [Paso 1] Buscando reportes locales que no están en el servidor...');
                    
                    // Obtener todos los reportes locales
                    const allLocalReports = await DB.getAll('archived_quick_captures') || [];
                    
                    // Filtrar reportes que NO tienen server_id (no están en el servidor)
                    const unsyncedReports = allLocalReports.filter(r => !r.server_id);
                    
                    console.log(`📊 [Paso 1] Encontrados ${unsyncedReports.length} reportes locales sin sincronizar`);
                    
                    if (unsyncedReports.length > 0) {
                        const currentBranchId = typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : null;
                        
                        // Agrupar reportes por fecha y sucursal para evitar duplicados
                        const reportsByKey = new Map();
                        for (const localReport of unsyncedReports) {
                            // Solo procesar reportes de la sucursal actual (o todos si no hay sucursal seleccionada)
                            if (currentBranchId && localReport.branch_id !== currentBranchId) {
                                console.log(`⏭️ [Paso 1] Omitiendo reporte ${localReport.id} (sucursal diferente)`);
                                continue;
                            }
                            
                            const reportDate = localReport.date || localReport.report_date || '';
                            const reportDateStr = reportDate ? (typeof reportDate === 'string' ? reportDate.split('T')[0] : reportDate) : '';
                            const branchId = localReport.branch_id;
                            
                            if (!reportDateStr || !branchId) {
                                console.warn(`⚠️ [Paso 1] Reporte ${localReport.id} sin fecha o sucursal, omitiendo`);
                                continue;
                            }
                            
                            // Clave única: fecha + sucursal
                            const key = `${reportDateStr}_${branchId}`;
                            
                            // Si ya hay un reporte con esta clave, usar el más reciente (por archived_at)
                            if (!reportsByKey.has(key)) {
                                reportsByKey.set(key, localReport);
                            } else {
                                const existing = reportsByKey.get(key);
                                const existingArchived = existing.archived_at ? new Date(existing.archived_at) : new Date(0);
                                const currentArchived = localReport.archived_at ? new Date(localReport.archived_at) : new Date(0);
                                if (currentArchived > existingArchived) {
                                    reportsByKey.set(key, localReport);
                                }
                            }
                        }
                        
                        // Subir solo los reportes únicos (uno por fecha + sucursal)
                        let uploadedCount = 0;
                        let skippedCount = 0;
                        for (const [key, localReport] of reportsByKey) {
                            try {
                                const reportDate = localReport.date || localReport.report_date || '';
                                console.log(`📤 [Paso 1] Subiendo reporte local al servidor: ${localReport.id} (Fecha: ${reportDate}, Branch: ${localReport.branch_id})`);
                                
                                // Convertir reporte local al formato que espera el servidor
                                const reportData = {
                                    report_date: reportDate,
                                    branch_id: localReport.branch_id,
                                    total_captures: localReport.total_captures || (localReport.captures ? localReport.captures.length : 0),
                                    total_quantity: localReport.total_quantity || 0,
                                    total_sales_mxn: localReport.total_sales_mxn || 0,
                                    total_cogs: localReport.total_cogs || 0,
                                    total_commissions: localReport.total_commissions || 0,
                                    total_arrival_costs: localReport.total_arrival_costs || 0,
                                    total_operating_costs: localReport.total_operating_costs || 0,
                                    variable_costs_daily: localReport.variable_costs_daily || 0,
                                    fixed_costs_prorated: localReport.fixed_costs_prorated || 0,
                                    bank_commissions: localReport.bank_commissions || 0,
                                    gross_profit: localReport.gross_profit || 0,
                                    net_profit: localReport.net_profit || 0,
                                    exchange_rates: localReport.exchange_rates || {},
                                    captures: localReport.captures || [],
                                    daily_summary: localReport.daily_summary || [],
                                    seller_commissions: localReport.seller_commissions || [],
                                    guide_commissions: localReport.guide_commissions || [],
                                    arrivals: localReport.arrivals || [],
                                    metrics: localReport.metrics || {}
                                };
                                
                                const serverReport = await API.saveArchivedReport(reportData);
                                
                                if (serverReport && serverReport.id) {
                                    // Actualizar TODOS los reportes locales con la misma fecha y sucursal
                                    const allLocalReports = await DB.getAll('archived_quick_captures') || [];
                                    const reportsToUpdate = allLocalReports.filter(r => {
                                        const rDate = r.date || r.report_date || '';
                                        const rDateStr = rDate ? (typeof rDate === 'string' ? rDate.split('T')[0] : rDate) : '';
                                        return rDateStr === reportDate.split('T')[0] && r.branch_id === localReport.branch_id;
                                    });
                                    
                                    for (const reportToUpdate of reportsToUpdate) {
                                        reportToUpdate.server_id = serverReport.id;
                                        reportToUpdate.archived_by = serverReport.archived_by;
                                        reportToUpdate.sync_status = 'synced';
                                        await DB.put('archived_quick_captures', reportToUpdate);
                                    }
                                    
                                    uploadedCount++;
                                    console.log(`✅ [Paso 1] Reporte ${localReport.id} subido correctamente (server_id: ${serverReport.id})`);
                                } else {
                                    console.warn(`⚠️ [Paso 1] El servidor no devolvió un ID para el reporte ${localReport.id}`);
                                }
                            } catch (uploadError) {
                                console.error(`❌ [Paso 1] Error subiendo reporte ${localReport.id}:`, uploadError);
                                console.error('   Mensaje:', uploadError.message);
                                // Continuar con el siguiente reporte aunque falle uno
                            }
                        }
                        
                        skippedCount = unsyncedReports.length - reportsByKey.size;
                        if (skippedCount > 0) {
                            console.log(`⏭️ [Paso 1] ${skippedCount} reportes duplicados omitidos (misma fecha y sucursal)`);
                        }
                        
                        console.log(`✅ [Paso 1] Sincronización local→servidor completada: ${uploadedCount} reportes subidos`);
                    }
                } else {
                    console.log('⚠️ [Paso 1] API no disponible para subir reportes locales');
                }
            } catch (error) {
                console.error('❌ [Paso 1] Error sincronizando reportes locales al servidor:', error);
                // Continuar aunque falle este paso
            }

            // PASO 2: Sincronizar reportes archivados desde el servidor (descargarlos)
            try {
                if (typeof API !== 'undefined' && API.baseURL && API.token && API.getArchivedReports) {
                    console.log('📥 [Paso 2] Sincronizando reportes archivados desde el servidor...');
                    console.log(`   API.baseURL: ${API.baseURL}`);
                    console.log(`   API.token: ${API.token ? 'Presente' : 'Ausente'}`);
                    
                    // Obtener información del usuario actual
                    const currentUserId = typeof UserManager !== 'undefined' && UserManager.currentUser ? UserManager.currentUser.id : null;
                    const currentBranchId = typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : null;
                    const isMasterAdmin = typeof UserManager !== 'undefined' && (
                        UserManager.currentUser?.role === 'master_admin' ||
                        UserManager.currentUser?.is_master_admin ||
                        UserManager.currentUser?.isMasterAdmin ||
                        UserManager.currentEmployee?.role === 'master_admin' ||
                        (typeof PermissionManager !== 'undefined' && PermissionManager.hasPermission('admin.all'))
                    );
                    
                    console.log(`🔍 [Paso 2] Usuario: ${currentUserId}, Sucursal: ${currentBranchId}, Master Admin: ${isMasterAdmin}`);
                    
                    // NUEVA LÓGICA: El backend ahora filtra SOLO por branch_id y report_date
                    // Todos los usuarios de la misma sucursal verán los mismos reportes archivados
                    // No necesitamos pasar filtros adicionales - el backend usa req.user.branchId automáticamente
                    const filters = {};
                    // Opcional: Si quieres filtrar por rango de fechas, puedes agregar date_from y date_to aquí
                    // Por ahora, dejamos que el backend devuelva todos los reportes de la sucursal
                    
                    console.log(`📤 [Paso 2] Solicitando reportes de la sucursal (filtrado automático por backend):`, filters);
                    
                    let serverReports;
                    try {
                        serverReports = await API.getArchivedReports(filters);
                        console.log(`📥 [Paso 2] Respuesta del servidor recibida`);
                    } catch (apiError) {
                        console.error('❌ [Paso 2] Error al obtener reportes del servidor:', apiError);
                        console.error('   Mensaje:', apiError.message);
                        throw apiError; // Re-lanzar para que se maneje en el catch externo
                    }
                    
                    if (serverReports && Array.isArray(serverReports)) {
                        console.log(`✅ [Paso 2] ${serverReports.length} reportes archivados recibidos del servidor`);
                        
                        if (serverReports.length > 0) {
                            console.log(`📋 [Paso 2] Fechas de reportes recibidos:`, 
                                serverReports.map(r => r.report_date || r.date).join(', '));
                        }
                        
                        // Guardar/actualizar cada reporte en IndexedDB local
                        let savedCount = 0;
                        let updatedCount = 0;
                        for (const serverReport of serverReports) {
                            try {
                                const reportDate = serverReport.report_date || serverReport.date;
                                const branchId = serverReport.branch_id;
                                
                                // Usar una clave única basada en fecha y sucursal para evitar duplicados
                                // Formato: report_YYYY-MM-DD_branchId
                                const reportDateStr = reportDate ? (typeof reportDate === 'string' ? reportDate.split('T')[0] : reportDate) : '';
                                const uniqueKey = branchId && reportDateStr 
                                    ? `report_${reportDateStr}_${branchId}` 
                                    : serverReport.id || `archived_${reportDateStr || Date.now()}`;
                                
                                // Verificar si ya existe un reporte local con la misma fecha y sucursal
                                const existingLocalReports = await DB.getAll('archived_quick_captures') || [];
                                const existingReport = existingLocalReports.find(r => {
                                    const rDate = r.date || r.report_date || '';
                                    const rDateStr = rDate ? (typeof rDate === 'string' ? rDate.split('T')[0] : rDate) : '';
                                    return rDateStr === reportDateStr && r.branch_id === branchId;
                                });
                                
                                // Si existe, actualizar; si no, crear nuevo
                                const localReport = {
                                    id: existingReport ? existingReport.id : uniqueKey, // Mantener ID existente o usar clave única
                                    date: reportDate,
                                    branch_id: branchId,
                                    archived_by: serverReport.archived_by, // Guardar quién archivó el reporte
                                    total_captures: serverReport.total_captures || 0,
                                    total_quantity: serverReport.total_quantity || 0,
                                    total_sales_mxn: serverReport.total_sales_mxn || 0,
                                    total_cogs: serverReport.total_cogs || 0,
                                    total_commissions: serverReport.total_commissions || 0,
                                    total_arrival_costs: serverReport.total_arrival_costs || 0,
                                    total_operating_costs: serverReport.total_operating_costs || 0,
                                    variable_costs_daily: serverReport.variable_costs_daily || 0,
                                    fixed_costs_prorated: serverReport.fixed_costs_prorated || 0,
                                    bank_commissions: serverReport.bank_commissions || 0,
                                    gross_profit: serverReport.gross_profit || 0,
                                    net_profit: serverReport.net_profit || 0,
                                    exchange_rates: serverReport.exchange_rates || {},
                                    captures: serverReport.captures || [],
                                    daily_summary: serverReport.daily_summary || [],
                                    seller_commissions: serverReport.seller_commissions || [],
                                    guide_commissions: serverReport.guide_commissions || [],
                                    arrivals: serverReport.arrivals || [],
                                    metrics: serverReport.metrics || {},
                                    archived_at: serverReport.archived_at || serverReport.created_at || new Date().toISOString(),
                                    server_id: serverReport.id, // Guardar el ID del servidor para referencia
                                    sync_status: 'synced'
                                };
                                
                                // Guardar en IndexedDB local (actualizar si existe, crear si no)
                                await DB.put('archived_quick_captures', localReport);
                                
                                if (existingReport) {
                                    updatedCount++;
                                    console.log(`🔄 [Paso 2] Reporte actualizado: ${localReport.id} (Fecha: ${reportDateStr}, Branch: ${branchId})`);
                                } else {
                                    savedCount++;
                                    console.log(`💾 [Paso 2] Reporte guardado: ${localReport.id} (Fecha: ${reportDateStr}, Branch: ${branchId})`);
                                }
                            } catch (error) {
                                console.warn(`⚠️ [Paso 2] Error guardando reporte archivado ${serverReport.id}:`, error);
                            }
                        }
                        
                        console.log(`✅ [Paso 2] Sincronización servidor→local completada: ${savedCount} nuevos, ${updatedCount} actualizados`);
                        
                    } else {
                        console.warn('⚠️ [Paso 2] No se recibieron reportes del servidor o el formato es incorrecto');
                    }
                } else {
                    console.log('⚠️ [Paso 2] API no disponible, usando solo reportes locales');
                    if (!API || !API.baseURL) console.log('   - API.baseURL no configurado');
                    if (!API || !API.token) console.log('   - API.token no disponible');
                    if (!API || !API.getArchivedReports) console.log('   - API.getArchivedReports no disponible');
                }
            } catch (error) {
                console.error('❌ [Paso 2] Error sincronizando reportes archivados desde el servidor:', error);
                console.error('   Detalles:', error.message);
                // Continuar con reportes locales aunque falle la sincronización
            }

            // Obtener todos los reportes archivados (locales + sincronizados)
            let archivedReports = await DB.getAll('archived_quick_captures') || [];
            
            // NUEVA LÓGICA: Filtrar por sucursal actual (para mostrar solo reportes de la sucursal)
            // Esto asegura que solo se muestren reportes relevantes para la sucursal actual
            const currentBranchId = typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : null;
            if (currentBranchId) {
                archivedReports = archivedReports.filter(r => {
                    // Mostrar reportes de la sucursal actual
                    return r.branch_id === currentBranchId;
                });
                console.log(`🔍 [Filtrado Frontend] Mostrando ${archivedReports.length} reportes de la sucursal ${currentBranchId}`);
            } else {
                console.warn('⚠️ No hay sucursal seleccionada, mostrando todos los reportes');
            }
            
            // Eliminar duplicados: mantener solo el más reciente por fecha + sucursal
            const reportsByKey = new Map();
            for (const report of archivedReports) {
                const reportDate = report.date || report.report_date || '';
                const reportDateStr = reportDate ? (typeof reportDate === 'string' ? reportDate.split('T')[0] : reportDate) : '';
                const branchId = report.branch_id;
                
                if (!reportDateStr || !branchId) continue;
                
                const key = `${reportDateStr}_${branchId}`;
                
                if (!reportsByKey.has(key)) {
                    reportsByKey.set(key, report);
                } else {
                    const existing = reportsByKey.get(key);
                    // Preferir el que tiene server_id (está sincronizado)
                    if (report.server_id && !existing.server_id) {
                        reportsByKey.set(key, report);
                    } else if (existing.server_id && !report.server_id) {
                        // Mantener el existente
                    } else {
                        // Si ambos tienen o no tienen server_id, usar el más reciente por archived_at
                        const existingArchived = existing.archived_at ? new Date(existing.archived_at) : new Date(0);
                        const currentArchived = report.archived_at ? new Date(report.archived_at) : new Date(0);
                        if (currentArchived > existingArchived) {
                            reportsByKey.set(key, report);
                        }
                    }
                }
            }
            
            archivedReports = Array.from(reportsByKey.values());
            console.log(`🔍 [Deduplicación] ${archivedReports.length} reportes únicos después de eliminar duplicados`);
            
            // Ordenar por fecha del reporte (más recientes primero) para el histórico
            // Usar la fecha del reporte (date), no la fecha de archivado (archived_at)
            archivedReports.sort((a, b) => {
                // Obtener la fecha del reporte (puede estar en 'date' o 'report_date')
                const dateAStr = a.date || a.report_date || '';
                const dateBStr = b.date || b.report_date || '';
                
                // Si las fechas están en formato YYYY-MM-DD, compararlas directamente
                if (dateAStr && dateBStr) {
                    // Comparar como strings (YYYY-MM-DD se ordena correctamente)
                    if (dateBStr > dateAStr) return 1;
                    if (dateBStr < dateAStr) return -1;
                }
                
                // Si son iguales o no hay fecha, usar archived_at como desempate
                const archivedA = new Date(a.archived_at || 0);
                const archivedB = new Date(b.archived_at || 0);
                return archivedB - archivedA;
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
                                // Formatear fecha sin desfase de zona horaria
                                const reportDate = report.date || report.report_date || '';
                                const normalizedDate = reportDate ? (typeof reportDate === 'string' ? reportDate.split('T')[0] : reportDate) : '';
                                const dateStr = normalizedDate ? this.formatDateWithoutTimezone(normalizedDate) : 'Sin fecha';
                                
                                // Formatear fecha de archivado (puede tener hora, así que usar Date)
                                let archivedDate = '';
                                if (report.archived_at) {
                                    const archived = new Date(report.archived_at);
                                    const year = archived.getFullYear();
                                    const month = String(archived.getMonth() + 1).padStart(2, '0');
                                    const day = String(archived.getDate()).padStart(2, '0');
                                    const hour = String(archived.getHours()).padStart(2, '0');
                                    const minute = String(archived.getMinutes()).padStart(2, '0');
                                    const ampm = archived.getHours() >= 12 ? 'p.m.' : 'a.m.';
                                    const hour12 = archived.getHours() % 12 || 12;
                                    archivedDate = `${day}/${month}/${year}, ${hour12}:${minute} ${ampm}`;
                                }
                                
                                // Asegurar que los valores sean números (pueden venir como strings desde el servidor)
                                const grossProfit = parseFloat(report.gross_profit || 0) || 0;
                                const netProfit = parseFloat(report.net_profit || 0) || 0;
                                const totalSales = parseFloat(report.total_sales_mxn || 0) || 0;
                                const captureCount = report.captures ? (Array.isArray(report.captures) ? report.captures.length : 0) : 0;
                                
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

    // Función helper para formatear fechas sin desfase de zona horaria
    formatDateWithoutTimezone(dateStr) {
        if (!dateStr) return '';
        // Si ya es una cadena YYYY-MM-DD, formatearla directamente
        if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
            const [year, month, day] = dateStr.split('T')[0].split('-');
            return `${day}/${month}/${year}`;
        }
        // Si es un objeto Date, extraer componentes sin conversión de zona horaria
        if (dateStr instanceof Date) {
            const year = dateStr.getFullYear();
            const month = String(dateStr.getMonth() + 1).padStart(2, '0');
            const day = String(dateStr.getDate()).padStart(2, '0');
            return `${day}/${month}/${year}`;
        }
        // Fallback
        return dateStr;
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

            // Normalizar la fecha sin desfase de zona horaria
            const normalizedReportDate = report.date.split('T')[0];
            const formattedDate = this.formatDateWithoutTimezone(normalizedReportDate);

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
                            Se restaurarán <strong>${report.captures.length}</strong> capturas del reporte del <strong>${formattedDate}</strong>.
                        </p>
                        <p style="margin: 0; font-size: 13px; line-height: 1.5; color: var(--color-text-secondary);">
                            Las capturas se restaurarán con la fecha del reporte (<strong>${formattedDate}</strong>) y podrás editarlas.
                        </p>
                        <p style="margin: var(--spacing-sm) 0 0 0; font-size: 12px; line-height: 1.5; color: var(--color-warning);">
                            <i class="fas fa-exclamation-triangle"></i> La fecha del formulario se cambiará automáticamente para mostrar el reporte restaurado.
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
                        // Normalizar la fecha sin desfase de zona horaria
                        const normalizedReportDate = report.date.split('T')[0];
                        
                        // Verificar si ya hay capturas restauradas de este reporte para evitar duplicados
                        const existingCaptures = await DB.getAll('temp_quick_captures') || [];
                        const alreadyRestored = existingCaptures.filter(c => 
                            c.restored_from === reportId || 
                            (c.date && c.date.split('T')[0] === normalizedReportDate && c.restored_from)
                        );
                        
                        if (alreadyRestored.length > 0) {
                            // Crear modal de confirmación para reemplazar
                            const replaceModal = document.createElement('div');
                            replaceModal.className = 'modal-overlay';
                            replaceModal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10001;';
                            replaceModal.innerHTML = `
                                <div class="modal-content" style="max-width: 500px; width: 90%; background: white; border-radius: 8px; padding: 0; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                                    <div class="modal-header" style="padding: 16px; border-bottom: 1px solid #e0e0e0;">
                                        <h3 style="margin: 0; font-size: 16px; font-weight: 600;">Capturas ya restauradas</h3>
                                    </div>
                                    <div class="modal-body" style="padding: 20px;">
                                        <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #333;">
                                            Ya existen <strong>${alreadyRestored.length}</strong> capturas restauradas de este reporte. ¿Deseas reemplazarlas?
                                        </p>
                                    </div>
                                    <div class="modal-footer" style="padding: 16px; border-top: 1px solid #e0e0e0; display: flex; gap: 10px; justify-content: flex-end;">
                                        <button class="btn-secondary" id="replace-cancel-btn" style="min-width: 100px;">Cancelar</button>
                                        <button class="btn-success" id="replace-confirm-btn" style="min-width: 100px;">Reemplazar</button>
                                    </div>
                                </div>
                            `;
                            document.body.appendChild(replaceModal);
                            
                            const shouldReplace = await new Promise((resolve) => {
                                document.getElementById('replace-confirm-btn').onclick = () => {
                                    replaceModal.remove();
                                    resolve(true);
                                };
                                document.getElementById('replace-cancel-btn').onclick = () => {
                                    replaceModal.remove();
                                    resolve(false);
                                };
                            });
                            
                            if (!shouldReplace) {
                                return;
                            }
                            
                            // Eliminar capturas ya restauradas de este reporte
                            for (const existing of alreadyRestored) {
                                try {
                                    await DB.delete('temp_quick_captures', existing.id);
                                } catch (error) {
                                    console.warn('Error eliminando captura duplicada:', error);
                                }
                            }
                        }
                        
                        // Restaurar cada captura a temp_quick_captures PRIMERO
                        let restoredCount = 0;
                        for (const capture of report.captures) {
                            try {
                                // Generar nuevo ID para evitar conflictos
                                // IMPORTANTE: Mantener la fecha original del reporte archivado
                                const restoredCapture = {
                                    ...capture,
                                    id: 'qc_restored_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9) + '_' + restoredCount,
                                    date: normalizedReportDate, // Mantener la fecha original del reporte archivado
                                    restored_from: reportId,
                                    restored_at: new Date().toISOString(),
                                    original_report_date: normalizedReportDate // Guardar la fecha original para referencia
                                };
                                
                                await DB.put('temp_quick_captures', restoredCapture);
                                restoredCount++;
                            } catch (error) {
                                console.error('Error restaurando captura individual:', error);
                            }
                        }
                        
                        if (restoredCount > 0) {
                            // Cambiar a la pestaña de captura rápida PRIMERO
                            const quickCaptureTab = document.querySelector('[data-tab="quick-capture"]');
                            if (quickCaptureTab) {
                                quickCaptureTab.click();
                            }
                            
                            // Esperar un momento para que se cargue la pestaña
                            await new Promise(resolve => setTimeout(resolve, 300));
                            
                            // Cambiar la fecha del formulario DESPUÉS de restaurar
                            const dateInput = document.getElementById('qc-date');
                            const arrivalDateInput = document.getElementById('qc-arrival-date');
                            
                            if (dateInput) {
                                dateInput.value = normalizedReportDate;
                                // Actualizar el display de la fecha si existe
                                const dateDisplay = document.getElementById('captures-date-display');
                                if (dateDisplay) {
                                    dateDisplay.textContent = `(${normalizedReportDate})`;
                                }
                            }
                            if (arrivalDateInput) {
                                arrivalDateInput.value = normalizedReportDate;
                            }
                            
                            // Esperar un momento más para que se actualice el DOM
                            await new Promise(resolve => setTimeout(resolve, 200));
                            
                            // Recargar datos con la nueva fecha (llamar directamente a las funciones)
                            if (typeof this.loadQuickCaptureData === 'function') {
                            await this.loadQuickCaptureData();
                            }
                            if (typeof this.loadQuickCaptureArrivals === 'function') {
                                await this.loadQuickCaptureArrivals();
                            }
                            
                            // Disparar evento change para asegurar que los listeners se ejecuten
                            if (dateInput) {
                                dateInput.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                            
                            const formattedDate = this.formatDateWithoutTimezone(normalizedReportDate);
                            Utils.showNotification(`${restoredCount} capturas restauradas correctamente para la fecha ${formattedDate}. Puedes editarlas ahora.`, 'success');
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

    async viewArchivedReport(reportId) {
        try {
            const report = await DB.get('archived_quick_captures', reportId);
            if (!report) {
                Utils.showNotification('Reporte no encontrado', 'error');
                return;
            }

            const date = new Date(report.date);
            const formattedDate = date.toLocaleDateString('es-MX', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });

            const grossMargin = report.total_sales_mxn > 0 
                ? ((report.gross_profit || 0) / report.total_sales_mxn * 100).toFixed(2)
                : '0.00';
            const netMargin = report.total_sales_mxn > 0 
                ? ((report.net_profit || 0) / report.total_sales_mxn * 100).toFixed(2)
                : '0.00';

            let capturesHtml = '';
            if (report.captures && report.captures.length > 0) {
                capturesHtml = `
                    <div style="max-height: 400px; overflow-y: auto; margin-top: var(--spacing-md);">
                        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                            <thead style="position: sticky; top: 0; background: var(--color-bg-secondary); z-index: 10;">
                                <tr style="border-bottom: 2px solid var(--color-border-light);">
                                    <th style="padding: var(--spacing-xs); text-align: left; font-weight: 600;">Hora</th>
                                    <th style="padding: var(--spacing-xs); text-align: left; font-weight: 600;">Vendedor</th>
                                    <th style="padding: var(--spacing-xs); text-align: left; font-weight: 600;">Producto</th>
                                    <th style="padding: var(--spacing-xs); text-align: right; font-weight: 600;">Total</th>
                                    <th style="padding: var(--spacing-xs); text-align: right; font-weight: 600;">Costo</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${report.captures.map((capture, idx) => {
                                    const captureDate = capture.created_at || capture.date || '';
                                    const captureTime = captureDate ? new Date(captureDate).toLocaleTimeString('es-MX', { 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                    }) : '-';
                                    return `
                                        <tr style="border-bottom: 1px solid var(--color-border-light); ${idx % 2 === 0 ? 'background: var(--color-bg-secondary);' : ''}">
                                            <td style="padding: var(--spacing-xs);">${captureTime}</td>
                                            <td style="padding: var(--spacing-xs);">${capture.seller_name || capture.seller_id || '-'}</td>
                                            <td style="padding: var(--spacing-xs);">${capture.product || '-'}</td>
                                            <td style="padding: var(--spacing-xs); text-align: right; font-weight: 600;">${Utils.formatCurrency(capture.total || 0)}</td>
                                            <td style="padding: var(--spacing-xs); text-align: right;">${Utils.formatCurrency(capture.merchandise_cost || 0)}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }

            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000; overflow-y: auto; padding: 20px;';
            
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 800px; width: 100%; background: white; border-radius: 8px; padding: 0; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin: auto; position: relative;">
                    <div class="modal-header" style="padding: 16px; border-bottom: 1px solid #e0e0e0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: white;">
                                <i class="fas fa-file-alt" style="margin-right: 8px;"></i>Reporte Archivado - ${formattedDate}
                            </h3>
                            <button id="close-view-modal-btn" style="background: transparent; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <div class="modal-body" style="padding: 20px; max-height: calc(100vh - 200px); overflow-y: auto;">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--spacing-md); margin-bottom: var(--spacing-lg);">
                            <div style="padding: var(--spacing-md); background: var(--color-bg-secondary); border-radius: var(--radius-md);">
                                <div style="font-size: 11px; color: var(--color-text-secondary); margin-bottom: 4px;">TOTAL CAPTURAS</div>
                                <div style="font-size: 20px; font-weight: 700; color: var(--color-primary);">${report.captures?.length || 0}</div>
                            </div>
                            <div style="padding: var(--spacing-md); background: var(--color-bg-secondary); border-radius: var(--radius-md);">
                                <div style="font-size: 11px; color: var(--color-text-secondary); margin-bottom: 4px;">VENTAS (MXN)</div>
                                <div style="font-size: 20px; font-weight: 700; color: var(--color-primary);">${Utils.formatCurrency(report.total_sales_mxn || 0)}</div>
                            </div>
                            <div style="padding: var(--spacing-md); background: var(--color-bg-secondary); border-radius: var(--radius-md);">
                                <div style="font-size: 11px; color: var(--color-text-secondary); margin-bottom: 4px;">UTILIDAD BRUTA</div>
                                <div style="font-size: 20px; font-weight: 700; color: var(--color-success);">${Utils.formatCurrency(report.gross_profit || 0)}</div>
                                <div style="font-size: 11px; color: var(--color-text-secondary); margin-top: 4px;">${grossMargin}%</div>
                            </div>
                            <div style="padding: var(--spacing-md); background: var(--color-bg-secondary); border-radius: var(--radius-md);">
                                <div style="font-size: 11px; color: var(--color-text-secondary); margin-bottom: 4px;">UTILIDAD NETA</div>
                                <div style="font-size: 20px; font-weight: 700; color: var(--color-primary);">${Utils.formatCurrency(report.net_profit || 0)}</div>
                                <div style="font-size: 11px; color: var(--color-text-secondary); margin-top: 4px;">${netMargin}%</div>
                            </div>
                        </div>
                        
                        <div style="margin-bottom: var(--spacing-lg);">
                            <h4 style="margin: 0 0 var(--spacing-sm) 0; font-size: 14px; font-weight: 600; text-transform: uppercase;">Desglose Financiero</h4>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--spacing-sm);">
                                <div style="padding: var(--spacing-sm); background: var(--color-bg-secondary); border-radius: var(--radius-sm);">
                                    <div style="font-size: 10px; color: var(--color-text-secondary);">Costo Mercancía (COGS)</div>
                                    <div style="font-size: 14px; font-weight: 600;">${Utils.formatCurrency(report.total_cogs || 0)}</div>
                                </div>
                                <div style="padding: var(--spacing-sm); background: var(--color-bg-secondary); border-radius: var(--radius-sm);">
                                    <div style="font-size: 10px; color: var(--color-text-secondary);">Comisiones</div>
                                    <div style="font-size: 14px; font-weight: 600;">${Utils.formatCurrency(report.total_commissions || 0)}</div>
                                </div>
                                <div style="padding: var(--spacing-sm); background: var(--color-bg-secondary); border-radius: var(--radius-sm);">
                                    <div style="font-size: 10px; color: var(--color-text-secondary);">Costos de Llegadas</div>
                                    <div style="font-size: 14px; font-weight: 600;">${Utils.formatCurrency(report.total_arrival_costs || 0)}</div>
                                </div>
                                <div style="padding: var(--spacing-sm); background: var(--color-bg-secondary); border-radius: var(--radius-sm);">
                                    <div style="font-size: 10px; color: var(--color-text-secondary);">Costos Operativos</div>
                                    <div style="font-size: 14px; font-weight: 600;">${Utils.formatCurrency(report.total_operating_costs || 0)}</div>
                                </div>
                                <div style="padding: var(--spacing-sm); background: var(--color-bg-secondary); border-radius: var(--radius-sm);">
                                    <div style="font-size: 10px; color: var(--color-text-secondary);">Comisiones Bancarias</div>
                                    <div style="font-size: 14px; font-weight: 600;">${Utils.formatCurrency(report.bank_commissions || 0)}</div>
                                </div>
                            </div>
                        </div>
                        
                        ${capturesHtml ? `
                            <div>
                                <h4 style="margin: 0 0 var(--spacing-sm) 0; font-size: 14px; font-weight: 600; text-transform: uppercase;">Capturas (${report.captures?.length || 0})</h4>
                                ${capturesHtml}
                            </div>
                        ` : ''}
                    </div>
                    <div class="modal-footer" style="padding: 16px; border-top: 1px solid #e0e0e0; display: flex; gap: 10px; justify-content: flex-end;">
                        <button class="btn-primary" id="close-view-modal-footer-btn" style="min-width: 100px;">
                            <i class="fas fa-times"></i> Cerrar
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Cerrar modal
            const closeModal = () => {
                modal.remove();
            };
            
            document.getElementById('close-view-modal-btn').onclick = closeModal;
            document.getElementById('close-view-modal-footer-btn').onclick = closeModal;
            
            // Cerrar al hacer clic fuera del modal
            modal.onclick = (e) => {
                if (e.target === modal) {
                    closeModal();
                }
            };
        } catch (error) {
            console.error('Error mostrando reporte archivado:', error);
            Utils.showNotification('Error al mostrar el reporte: ' + error.message, 'error');
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
    },
    
    // ==================== SINCRONIZACIÓN BIDIRECCIONAL ====================
    
    /**
     * Sincronizar capturas rápidas desde el servidor al inicializar
     * Carga todas las capturas del servidor y las guarda en IndexedDB
     */
    async syncQuickCapturesFromServer() {
        try {
            if (typeof API === 'undefined' || !API.baseURL || !API.token || !API.getQuickCaptures) {
                console.log('⚠️ API no disponible, omitiendo sincronización desde servidor');
                return;
            }
            
            console.log('🔄 Sincronizando capturas rápidas desde servidor...');
            
            // Obtener sucursal actual para filtrar
            const currentBranchId = typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : null;
            // Mejorar detección de master admin (igual que en loadQuickCaptureData)
            const isMasterAdmin = typeof UserManager !== 'undefined' && (
                UserManager.currentUser?.role === 'master_admin' ||
                UserManager.currentUser?.is_master_admin ||
                UserManager.currentUser?.isMasterAdmin ||
                UserManager.currentEmployee?.role === 'master_admin' ||
                (typeof PermissionManager !== 'undefined' && PermissionManager.hasPermission('admin.all'))
            );
            
            // Obtener todas las capturas del servidor
            // Master admin obtiene TODAS las capturas (sin filtro)
            // Usuarios normales solo obtienen las de su sucursal
            const filters = {};
            if (!isMasterAdmin && currentBranchId) {
                filters.branch_id = currentBranchId;
            }
            // Si es master admin, no agregar filtro para obtener todas las capturas
            
            let serverCaptures;
            try {
                serverCaptures = await API.getQuickCaptures(filters);
            } catch (error) {
                // Si la tabla no existe en el backend, es normal (modo offline o backend no actualizado)
                const errorMessage = error.message || error.toString() || '';
                const errorDetails = error.details || error.toString() || '';
                const fullError = `${errorMessage} ${errorDetails}`.toLowerCase();
                
                if (fullError.includes('quick_captures') && (fullError.includes('does not exist') || fullError.includes('no existe'))) {
                    console.log('ℹ️ La tabla quick_captures no existe en el servidor. Continuando en modo local.');
                    console.log('💡 Para crear la tabla, ejecuta el schema.sql en Railway o reinicia el servidor para que se ejecute automáticamente.');
                    return;
                }
                // Otros errores: mostrar warning pero continuar
                console.warn('⚠️ Error sincronizando capturas desde servidor (continuando en modo local):', error.message || error);
                return;
            }
            
            if (!serverCaptures || !Array.isArray(serverCaptures)) {
                console.log('⚠️ No se recibieron capturas del servidor o formato inválido');
                return;
            }
            
            console.log(`📥 ${serverCaptures.length} capturas recibidas del servidor`);
            
            // Obtener capturas locales para comparar
            const localCaptures = await DB.getAll('temp_quick_captures') || [];
            const localCapturesMap = new Map(localCaptures.map(c => [c.server_id || c.id, c]));
            
            let syncedCount = 0;
            let updatedCount = 0;
            
            // Sincronizar cada captura del servidor
            for (const serverCapture of serverCaptures) {
                try {
                    // Convertir formato del servidor al formato local
                    const localCapture = {
                        id: serverCapture.id || `qc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        server_id: serverCapture.id, // Guardar ID del servidor
                        branch_id: serverCapture.branch_id,
                        branch_name: serverCapture.branch_name,
                        seller_id: serverCapture.seller_id,
                        seller_name: serverCapture.seller_name,
                        guide_id: serverCapture.guide_id,
                        guide_name: serverCapture.guide_name,
                        agency_id: serverCapture.agency_id,
                        agency_name: serverCapture.agency_name,
                        product: serverCapture.product,
                        quantity: serverCapture.quantity,
                        currency: serverCapture.currency,
                        total: serverCapture.total,
                        merchandise_cost: serverCapture.merchandise_cost || 0,
                        notes: serverCapture.notes,
                        is_street: serverCapture.is_street || false,
                        payment_method: serverCapture.payment_method,
                        payments: serverCapture.payments || [],
                        date: serverCapture.date || serverCapture.original_report_date,
                        original_report_date: serverCapture.original_report_date || serverCapture.date, // CRÍTICO: Preservar fecha original
                        created_at: serverCapture.created_at || new Date().toISOString(),
                        updated_at: serverCapture.updated_at || new Date().toISOString(),
                        created_by: serverCapture.created_by,
                        sync_status: 'synced' // Marcar como sincronizado
                    };
                    
                    // Verificar si ya existe localmente
                    const existing = localCapturesMap.get(serverCapture.id);
                    
                    if (existing) {
                        // Actualizar si el servidor tiene una versión más reciente
                        const serverUpdated = new Date(serverCapture.updated_at || 0);
                        const localUpdated = new Date(existing.updated_at || 0);
                        
                        if (serverUpdated > localUpdated) {
                            // Servidor tiene versión más reciente, actualizar local
                            await DB.put('temp_quick_captures', localCapture);
                            updatedCount++;
                            console.log(`🔄 Captura actualizada desde servidor: ${localCapture.product}`);
                        }
                    } else {
                        // Nueva captura del servidor, agregar localmente
                        await DB.put('temp_quick_captures', localCapture);
                        syncedCount++;
                        console.log(`➕ Captura sincronizada desde servidor: ${localCapture.product}`);
                    }
                } catch (error) {
                    console.error('Error sincronizando captura individual:', error);
                }
            }
            
            if (syncedCount > 0 || updatedCount > 0) {
                console.log(`✅ Sincronización completada: ${syncedCount} nuevas, ${updatedCount} actualizadas`);
            } else {
                console.log('✅ Sincronización completada: sin cambios');
            }
        } catch (error) {
            console.error('Error sincronizando capturas desde servidor:', error);
            // No lanzar error para no bloquear la inicialización
        }
    },
    
    /**
     * Configurar listeners de Socket.IO para actualizaciones en tiempo real
     */
    setupQuickCaptureSocketListeners() {
        try {
            if (typeof API === 'undefined' || !API.socket || !API.socket.connected) {
                console.log('⚠️ Socket.IO no disponible, omitiendo listeners en tiempo real');
                return;
            }
            
            // Escuchar creación de capturas
            API.socket.on('quick_capture_created', async (data) => {
                try {
                    const { capture } = data || {};
                    if (!capture || !capture.id) return;
                    
                    console.log('📥 Captura creada en servidor, sincronizando...');
                    
                    // Convertir al formato local
                    const localCapture = {
                        id: capture.id,
                        server_id: capture.id,
                        branch_id: capture.branch_id,
                        branch_name: capture.branch_name,
                        seller_id: capture.seller_id,
                        seller_name: capture.seller_name,
                        guide_id: capture.guide_id,
                        guide_name: capture.guide_name,
                        agency_id: capture.agency_id,
                        agency_name: capture.agency_name,
                        product: capture.product,
                        quantity: capture.quantity,
                        currency: capture.currency,
                        total: capture.total,
                        merchandise_cost: capture.merchandise_cost || 0,
                        notes: capture.notes,
                        is_street: capture.is_street || false,
                        payment_method: capture.payment_method,
                        payments: capture.payments || [],
                        date: capture.date || capture.original_report_date,
                        original_report_date: capture.original_report_date || capture.date,
                        created_at: capture.created_at || new Date().toISOString(),
                        updated_at: capture.updated_at || new Date().toISOString(),
                        sync_status: 'synced'
                    };
                    
                    // Verificar si ya existe localmente
                    const existing = await DB.get('temp_quick_captures', capture.id);
                    if (!existing) {
                        await DB.put('temp_quick_captures', localCapture);
                        console.log('✅ Captura sincronizada desde servidor en tiempo real');
                        
                        // Recargar datos si estamos en la pestaña de captura rápida
                        const activeTab = document.querySelector('#reports-tabs .tab-btn.active')?.dataset.tab;
                        if (activeTab === 'quick-capture') {
                            await this.loadQuickCaptureData();
                            await this.loadQuickCaptureArrivals();
                        }
                        // También recargar reportes archivados si estamos en esa pestaña
                        if (activeTab === 'history') {
                            await this.loadArchivedReports();
                        }
                    }
                } catch (error) {
                    console.error('Error procesando captura creada desde servidor:', error);
                }
            });
            
            // Escuchar actualización de capturas
            API.socket.on('quick_capture_updated', async (data) => {
                try {
                    const { capture } = data || {};
                    if (!capture || !capture.id) return;
                    
                    console.log('📥 Captura actualizada en servidor, sincronizando...');
                    
                    // Convertir al formato local
                    const localCapture = {
                        id: capture.id,
                        server_id: capture.id,
                        branch_id: capture.branch_id,
                        branch_name: capture.branch_name,
                        seller_id: capture.seller_id,
                        seller_name: capture.seller_name,
                        guide_id: capture.guide_id,
                        guide_name: capture.guide_name,
                        agency_id: capture.agency_id,
                        agency_name: capture.agency_name,
                        product: capture.product,
                        quantity: capture.quantity,
                        currency: capture.currency,
                        total: capture.total,
                        merchandise_cost: capture.merchandise_cost || 0,
                        notes: capture.notes,
                        is_street: capture.is_street || false,
                        payment_method: capture.payment_method,
                        payments: capture.payments || [],
                        date: capture.date || capture.original_report_date,
                        original_report_date: capture.original_report_date || capture.date,
                        created_at: capture.created_at || new Date().toISOString(),
                        updated_at: capture.updated_at || new Date().toISOString(),
                        sync_status: 'synced'
                    };
                    
                    await DB.put('temp_quick_captures', localCapture);
                    console.log('✅ Captura actualizada desde servidor en tiempo real');
                    
                    // Recargar datos si estamos en la pestaña de captura rápida
                    const activeTab = document.querySelector('#reports-tabs .tab-btn.active')?.dataset.tab;
                    if (activeTab === 'quick-capture') {
                        await this.loadQuickCaptureData();
                        await this.loadQuickCaptureArrivals();
                    }
                    // También recargar reportes archivados si estamos en esa pestaña
                    if (activeTab === 'history') {
                        await this.loadArchivedReports();
                    }
                } catch (error) {
                    console.error('Error procesando captura actualizada desde servidor:', error);
                }
            });
            
            // Escuchar eliminación de capturas
            API.socket.on('quick_capture_deleted', async (data) => {
                try {
                    const { capture_id } = data || {};
                    if (!capture_id) return;
                    
                    console.log('📥 Captura eliminada en servidor, sincronizando...');
                    
                    // Buscar por server_id o id
                    const localCaptures = await DB.getAll('temp_quick_captures') || [];
                    const toDelete = localCaptures.find(c => c.server_id === capture_id || c.id === capture_id);
                    
                    if (toDelete) {
                        await DB.delete('temp_quick_captures', toDelete.id);
                        console.log('✅ Captura eliminada localmente (sincronizada desde servidor)');
                        
                        // Recargar datos si estamos en la pestaña de captura rápida
                        const activeTab = document.querySelector('#reports-tabs .tab-btn.active')?.dataset.tab;
                        if (activeTab === 'quick-capture') {
                            await this.loadQuickCaptureData();
                            await this.loadQuickCaptureArrivals();
                        }
                        // También recargar reportes archivados si estamos en esa pestaña
                        if (activeTab === 'history') {
                            await this.loadArchivedReports();
                        }
                    }
                } catch (error) {
                    console.error('Error procesando captura eliminada desde servidor:', error);
                }
            });
            
            console.log('✅ Listeners de Socket.IO configurados para capturas rápidas');
        } catch (error) {
            console.error('Error configurando listeners de Socket.IO:', error);
            // No lanzar error para no bloquear la inicialización
        }
    },
    
    /**
     * Configurar listeners de Socket.IO para reportes archivados en tiempo real
     */
    setupArchivedReportsSocketListeners() {
        try {
            // Función para configurar los listeners (se puede llamar cuando Socket.IO se conecte)
            const setupListeners = () => {
                if (typeof API === 'undefined' || !API.socket) {
                    console.log('⚠️ Socket.IO no disponible para reportes archivados');
                    return false;
                }
                
                // Remover listeners anteriores si existen (evitar duplicados)
                if (API.socket.hasListeners && API.socket.hasListeners('archived_report_created')) {
                    API.socket.off('archived_report_created');
                    API.socket.off('archived_report_updated');
                }
                
                // Escuchar creación de reportes archivados
                API.socket.on('archived_report_created', async (data) => {
                try {
                    const { report } = data || {};
                    if (!report || !report.id) {
                        console.warn('⚠️ Evento archived_report_created recibido sin datos válidos');
                        return;
                    }
                    
                    console.log('📥 Reporte archivado creado en servidor, sincronizando...', {
                        id: report.id,
                        date: report.report_date || report.date,
                        branch_id: report.branch_id
                    });
                    
                    // Convertir el reporte del servidor al formato local
                    const reportId = report.id || report.report_date || `archived_${report.report_date}`;
                    const localReport = {
                        id: reportId,
                        date: report.report_date || report.date,
                        branch_id: report.branch_id,
                        archived_by: report.archived_by,
                        total_captures: report.total_captures || 0,
                        total_quantity: report.total_quantity || 0,
                        total_sales_mxn: report.total_sales_mxn || 0,
                        total_cogs: report.total_cogs || 0,
                        total_commissions: report.total_commissions || 0,
                        total_arrival_costs: report.total_arrival_costs || 0,
                        total_operating_costs: report.total_operating_costs || 0,
                        variable_costs_daily: report.variable_costs_daily || 0,
                        fixed_costs_prorated: report.fixed_costs_prorated || 0,
                        bank_commissions: report.bank_commissions || 0,
                        gross_profit: report.gross_profit || 0,
                        net_profit: report.net_profit || 0,
                        exchange_rates: report.exchange_rates || {},
                        captures: report.captures || [],
                        daily_summary: report.daily_summary || [],
                        seller_commissions: report.seller_commissions || [],
                        guide_commissions: report.guide_commissions || [],
                        arrivals: report.arrivals || [],
                        metrics: report.metrics || {},
                        archived_at: report.archived_at || report.created_at || new Date().toISOString(),
                        server_id: report.id,
                        sync_status: 'synced'
                    };
                    
                    // Verificar si ya existe localmente (por ID o por fecha y sucursal)
                    const existing = await DB.get('archived_quick_captures', reportId);
                    if (!existing) {
                        // Verificar también por fecha y sucursal para evitar duplicados
                        const allReports = await DB.getAll('archived_quick_captures') || [];
                        const duplicate = allReports.find(r => 
                            (r.date === localReport.date || r.date === report.report_date) &&
                            r.branch_id === localReport.branch_id &&
                            r.id !== reportId
                        );
                        
                        if (!duplicate) {
                            await DB.put('archived_quick_captures', localReport);
                            console.log('✅ Reporte archivado sincronizado desde servidor en tiempo real:', reportId);
                            
                            // Actualizar la lista visual automáticamente
                            await this.loadArchivedReports();
                            
                            // Mostrar notificación sutil
                            if (typeof Utils !== 'undefined' && Utils.showNotification) {
                                const dateStr = this.formatDateWithoutTimezone(localReport.date);
                                Utils.showNotification(`Nuevo reporte archivado recibido: ${dateStr}`, 'success', 3000);
                            }
                        } else {
                            console.log('⚠️ Reporte duplicado detectado, actualizando existente:', duplicate.id);
                            // Actualizar el existente con los nuevos datos
                            localReport.id = duplicate.id;
                            await DB.put('archived_quick_captures', localReport);
                            await this.loadArchivedReports();
                        }
                    } else {
                        // Si existe, actualizarlo con los datos más recientes
                        console.log('📝 Actualizando reporte archivado existente:', reportId);
                        await DB.put('archived_quick_captures', localReport);
                        await this.loadArchivedReports();
                    }
                } catch (error) {
                    console.error('❌ Error procesando reporte archivado creado desde servidor:', error);
                }
            });
            
            // Escuchar actualización de reportes archivados
            API.socket.on('archived_report_updated', async (data) => {
                try {
                    const { report } = data || {};
                    if (!report || !report.id) {
                        console.warn('⚠️ Evento archived_report_updated recibido sin datos válidos');
                        return;
                    }
                    
                    console.log('📥 Reporte archivado actualizado en servidor, sincronizando...', {
                        id: report.id,
                        date: report.report_date || report.date
                    });
                    
                    // Convertir el reporte del servidor al formato local (mismo proceso que created)
                    const reportId = report.id || report.report_date || `archived_${report.report_date}`;
                    const localReport = {
                        id: reportId,
                        date: report.report_date || report.date,
                        branch_id: report.branch_id,
                        archived_by: report.archived_by,
                        total_captures: report.total_captures || 0,
                        total_quantity: report.total_quantity || 0,
                        total_sales_mxn: report.total_sales_mxn || 0,
                        total_cogs: report.total_cogs || 0,
                        total_commissions: report.total_commissions || 0,
                        total_arrival_costs: report.total_arrival_costs || 0,
                        total_operating_costs: report.total_operating_costs || 0,
                        variable_costs_daily: report.variable_costs_daily || 0,
                        fixed_costs_prorated: report.fixed_costs_prorated || 0,
                        bank_commissions: report.bank_commissions || 0,
                        gross_profit: report.gross_profit || 0,
                        net_profit: report.net_profit || 0,
                        exchange_rates: report.exchange_rates || {},
                        captures: report.captures || [],
                        daily_summary: report.daily_summary || [],
                        seller_commissions: report.seller_commissions || [],
                        guide_commissions: report.guide_commissions || [],
                        arrivals: report.arrivals || [],
                        metrics: report.metrics || {},
                        archived_at: report.archived_at || report.created_at || new Date().toISOString(),
                        server_id: report.id,
                        sync_status: 'synced'
                    };
                    
                    await DB.put('archived_quick_captures', localReport);
                    console.log('✅ Reporte archivado actualizado desde servidor en tiempo real:', reportId);
                    
                    // Actualizar la lista visual automáticamente
                    await this.loadArchivedReports();
                } catch (error) {
                    console.error('❌ Error procesando reporte archivado actualizado desde servidor:', error);
                }
                });
                
                console.log('✅ Listeners de Socket.IO configurados para reportes archivados');
                return true;
            };
            
            // Intentar configurar listeners ahora si Socket.IO está disponible
            if (setupListeners()) {
                // Si se configuraron correctamente, también escuchar cuando se conecte en el futuro
                if (API.socket) {
                    API.socket.on('connect', () => {
                        console.log('🔄 Socket.IO reconectado, reconfigurando listeners de reportes archivados...');
                        setupListeners();
                    });
                }
            } else {
                // Si Socket.IO no está disponible, intentar configurar cuando se conecte
                console.log('⏳ Socket.IO no disponible aún, intentando configurar listeners cuando se conecte...');
                
                // Intentar configurar cuando API.socket esté disponible
                const checkSocket = setInterval(() => {
                    if (typeof API !== 'undefined' && API.socket && API.socket.connected) {
                        console.log('✅ Socket.IO conectado, configurando listeners de reportes archivados...');
                        setupListeners();
                        clearInterval(checkSocket);
                    }
                }, 1000);
                
                // Limpiar el intervalo después de 30 segundos si no se conecta
                setTimeout(() => {
                    clearInterval(checkSocket);
                }, 30000);
            }
            
            // SIEMPRE ejecutar sincronización inicial, incluso si Socket.IO no está disponible
            // Esto asegura que los reportes se sincronicen al cargar la página
            setTimeout(async () => {
                try {
                    console.log('🔄 Ejecutando sincronización inicial de reportes archivados...');
                    await this.loadArchivedReports();
                } catch (syncError) {
                    console.warn('⚠️ Error en sincronización inicial de reportes archivados:', syncError);
                }
            }, 2000); // Esperar 2 segundos para asegurar que todo esté inicializado
            
        } catch (error) {
            console.error('❌ Error configurando listeners de Socket.IO para reportes archivados:', error);
            // No lanzar error para no bloquear la inicialización
            // Aún así, intentar sincronización inicial
            setTimeout(async () => {
                try {
                    await this.loadArchivedReports();
                } catch (syncError) {
                    console.warn('⚠️ Error en sincronización inicial de reportes archivados (fallback):', syncError);
                }
            }, 2000);
        }
    },

    setupHistoricalReportsSocketListeners() {
        try {
            const setupListeners = () => {
                if (typeof API === 'undefined' || !API.socket) {
                    console.log('⚠️ Socket.IO no disponible para reportes históricos');
                    return false;
                }

                if (!API.socket.connected) {
                    console.log('⚠️ Socket.IO no conectado aún para reportes históricos');
                    return false;
                }

                // Obtener información del usuario actual
                const currentUserId = typeof UserManager !== 'undefined' && UserManager.currentUser ? UserManager.currentUser.id : null;
                const currentBranchId = typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : null;
                const isMasterAdmin = typeof UserManager !== 'undefined' && (
                    UserManager.currentUser?.role === 'master_admin' ||
                    UserManager.currentUser?.is_master_admin ||
                    UserManager.currentUser?.isMasterAdmin ||
                    UserManager.currentEmployee?.role === 'master_admin' ||
                    (typeof PermissionManager !== 'undefined' && PermissionManager.hasPermission('admin.all'))
                );

                // Unirse a las salas relevantes
                if (currentBranchId) {
                    API.socket.emit('join', `branch:${currentBranchId}`);
                    console.log(`✅ Usuario unido a sala branch:${currentBranchId} para reportes históricos`);
                }
                if (isMasterAdmin) {
                    API.socket.emit('join', 'master_admin');
                    console.log('✅ Usuario unido a sala master_admin para reportes históricos');
                }
                if (currentUserId) {
                    API.socket.emit('join', `user:${currentUserId}`);
                    console.log(`✅ Usuario unido a sala user:${currentUserId} para reportes históricos`);
                }
                
                // Escuchar creación de reportes históricos
                API.socket.on('historical_report_created', async (data) => {
                    try {
                        const { report } = data;
                        if (!report) return;

                        console.log('📥 Reporte histórico creado recibido desde servidor en tiempo real:', report.id);

                        // Verificar si ya existe localmente
                        const existingReport = await DB.get('historical_reports', report.id);
                        
                        const localReport = {
                            id: report.id,
                            period_type: report.period_type,
                            period_name: report.period_name,
                            date_from: report.date_from,
                            date_to: report.date_to,
                            branch_id: report.branch_id,
                            total_days: report.total_days || 0,
                            total_captures: report.total_captures || 0,
                            total_quantity: report.total_quantity || 0,
                            total_sales_mxn: report.total_sales_mxn || 0,
                            total_cogs: report.total_cogs || 0,
                            total_commissions: report.total_commissions || 0,
                            total_arrival_costs: report.total_arrival_costs || 0,
                            total_operating_costs: report.total_operating_costs || 0,
                            gross_profit: report.gross_profit || 0,
                            net_profit: report.net_profit || 0,
                            daily_summary: report.daily_summary || [],
                            archived_report_ids: report.archived_report_ids || [],
                            metrics: report.metrics || {},
                            created_at: report.created_at || new Date().toISOString(),
                            created_by: report.created_by,
                            server_id: report.id,
                            sync_status: 'synced'
                        };
                        
                        await DB.put('historical_reports', localReport);
                        console.log('✅ Reporte histórico guardado desde servidor en tiempo real:', report.id);
                        
                        // Actualizar la lista visual automáticamente si estamos en la pestaña de históricos
                        if (this.currentTab === 'historical') {
                            await this.loadHistoricalReports();
                        }
                    } catch (error) {
                        console.error('❌ Error procesando reporte histórico creado desde servidor:', error);
                    }
                });
                
                // Escuchar eliminación de reportes históricos
                API.socket.on('historical_report_deleted', async (data) => {
                    try {
                        const { report_id } = data;
                        if (!report_id) return;

                        console.log('📥 Reporte histórico eliminado recibido desde servidor en tiempo real:', report_id);
                        
                        // Eliminar del IndexedDB local
                        await DB.delete('historical_reports', report_id);
                        console.log('✅ Reporte histórico eliminado localmente:', report_id);
                        
                        // Actualizar la lista visual automáticamente si estamos en la pestaña de históricos
                        if (this.currentTab === 'historical') {
                            await this.loadHistoricalReports();
                        }
                    } catch (error) {
                        console.error('❌ Error procesando reporte histórico eliminado desde servidor:', error);
                    }
                });
                
                console.log('✅ Listeners de Socket.IO configurados para reportes históricos');
                return true;
            };
            
            // Intentar configurar listeners ahora si Socket.IO está disponible
            if (setupListeners()) {
                // Si se configuraron correctamente, también escuchar cuando se conecte en el futuro
                if (API.socket) {
                    API.socket.on('connect', () => {
                        console.log('🔄 Socket.IO reconectado, reconfigurando listeners de reportes históricos...');
                        setupListeners();
                    });
                }
            } else {
                // Si Socket.IO no está disponible, intentar configurar cuando se conecte
                console.log('⏳ Socket.IO no disponible aún, intentando configurar listeners de históricos cuando se conecte...');
                
                // Intentar configurar cuando API.socket esté disponible
                const checkSocket = setInterval(() => {
                    if (typeof API !== 'undefined' && API.socket && API.socket.connected) {
                        console.log('✅ Socket.IO conectado, configurando listeners de reportes históricos...');
                        setupListeners();
                        clearInterval(checkSocket);
                    }
                }, 1000);
                
                // Limpiar el intervalo después de 30 segundos si no se conecta
                setTimeout(() => {
                    clearInterval(checkSocket);
                }, 30000);
            }
            
            // SIEMPRE ejecutar sincronización inicial, incluso si Socket.IO no está disponible
            setTimeout(async () => {
                try {
                    console.log('🔄 Ejecutando sincronización inicial de reportes históricos...');
                    await this.loadHistoricalReports();
                } catch (syncError) {
                    console.warn('⚠️ Error en sincronización inicial de reportes históricos:', syncError);
                }
            }, 2000);
            
        } catch (error) {
            console.error('❌ Error configurando listeners de Socket.IO para reportes históricos:', error);
            // No lanzar error para no bloquear la inicialización
            setTimeout(async () => {
                try {
                    await this.loadHistoricalReports();
                } catch (syncError) {
                    console.warn('⚠️ Error en sincronización inicial de reportes históricos (fallback):', syncError);
                }
            }, 2000);
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
            let archivedReports = [];
            
            // Intentar obtener del servidor primero
            if (typeof API !== 'undefined' && API.getArchivedReports) {
                try {
                    const filters = {
                        date_from: dateFrom,
                        date_to: dateTo
                    };
                    if (currentBranchId) {
                        filters.branch_id = currentBranchId;
                    }
                    archivedReports = await API.getArchivedReports(filters);
                    console.log(`📥 ${archivedReports.length} reportes archivados obtenidos del servidor`);
                } catch (error) {
                    console.warn('Error obteniendo reportes archivados del servidor, usando locales:', error);
                }
            }

            // Si no hay reportes del servidor, obtener de IndexedDB local
            if (archivedReports.length === 0) {
                const localArchived = await DB.getAll('archived_quick_captures') || [];
                archivedReports = localArchived.filter(r => {
                    const reportDate = r.date || r.report_date || '';
                    const normalizedDate = reportDate.split('T')[0];
                    return normalizedDate >= dateFrom && normalizedDate <= dateTo;
                });
                console.log(`📥 ${archivedReports.length} reportes archivados obtenidos localmente`);
            }

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
                grossProfit += parseFloat(report.gross_profit || 0);
                netProfit += parseFloat(report.net_profit || 0);

                // Agregar a daily_summary
                const reportDate = report.date || report.report_date || '';
                dailySummary.push({
                    date: reportDate.split('T')[0],
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
                if (report.metrics) {
                    // Métricas generales: sumar pasajeros
                    if (report.metrics.general && report.metrics.general.total_pasajeros) {
                        totalPassengers += parseInt(report.metrics.general.total_pasajeros || 0);
                    }

                    // Agregar métricas por agencia
                    if (report.metrics.por_agencia && Array.isArray(report.metrics.por_agencia)) {
                        report.metrics.por_agencia.forEach(agencyMetric => {
                            const agencyId = agencyMetric.agency_id;
                            if (!metricsByAgency[agencyId]) {
                                metricsByAgency[agencyId] = {
                                    agency_id: agencyId,
                                    agency_name: agencyMetric.agency_name || 'Desconocida',
                                    ventas: 0,
                                    total_ventas_mxn: 0,
                                    pasajeros: 0
                                };
                            }
                            metricsByAgency[agencyId].ventas += parseInt(agencyMetric.ventas || 0);
                            metricsByAgency[agencyId].total_ventas_mxn += parseFloat(agencyMetric.total_ventas_mxn || 0);
                            metricsByAgency[agencyId].pasajeros += parseInt(agencyMetric.pasajeros || 0);
                        });
                    }

                    // Agregar métricas por guía
                    if (report.metrics.por_guia && Array.isArray(report.metrics.por_guia)) {
                        report.metrics.por_guia.forEach(guideMetric => {
                            const guideId = guideMetric.guide_id;
                            if (!metricsByGuide[guideId]) {
                                metricsByGuide[guideId] = {
                                    guide_id: guideId,
                                    guide_name: guideMetric.guide_name || 'Desconocido',
                                    agency_id: guideMetric.agency_id,
                                    agency_name: guideMetric.agency_name || 'Desconocida',
                                    ventas: 0,
                                    total_ventas_mxn: 0,
                                    pasajeros: 0
                                };
                            }
                            metricsByGuide[guideId].ventas += parseInt(guideMetric.ventas || 0);
                            metricsByGuide[guideId].total_ventas_mxn += parseFloat(guideMetric.total_ventas_mxn || 0);
                            metricsByGuide[guideId].pasajeros += parseInt(guideMetric.pasajeros || 0);
                        });
                    }

                    // Agregar métricas por vendedor
                    if (report.metrics.por_vendedor && Array.isArray(report.metrics.por_vendedor)) {
                        report.metrics.por_vendedor.forEach(sellerMetric => {
                            const sellerId = sellerMetric.seller_id;
                            if (!metricsBySeller[sellerId]) {
                                metricsBySeller[sellerId] = {
                                    seller_id: sellerId,
                                    seller_name: sellerMetric.seller_name || 'Desconocido',
                                    ventas: 0,
                                    total_ventas_mxn: 0
                                };
                            }
                            metricsBySeller[sellerId].ventas += parseInt(sellerMetric.ventas || 0);
                            metricsBySeller[sellerId].total_ventas_mxn += parseFloat(sellerMetric.total_ventas_mxn || 0);
                        });
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
                    total_ventas_mxn: parseFloat(agency.total_ventas_mxn.toFixed(2))
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
                    total_ventas_mxn: parseFloat(guide.total_ventas_mxn.toFixed(2))
                })),
                por_vendedor: Object.values(metricsBySeller).map(seller => ({
                    seller_id: seller.seller_id,
                    seller_name: seller.seller_name,
                    ventas: seller.ventas,
                    ticket_promedio: seller.ventas > 0 ? parseFloat((seller.total_ventas_mxn / seller.ventas).toFixed(2)) : 0,
                    total_ventas_mxn: parseFloat(seller.total_ventas_mxn.toFixed(2))
                }))
            };

            // Generar nombre del período automáticamente
            let periodName = '';
            if (periodType === 'monthly') {
                const date = new Date(dateFrom);
                const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                periodName = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
            } else if (periodType === 'yearly') {
                periodName = new Date(dateFrom).getFullYear().toString();
            } else if (periodType === 'quarterly') {
                const date = new Date(dateFrom);
                const quarter = Math.floor(date.getMonth() / 3) + 1;
                periodName = `Q${quarter} ${date.getFullYear()}`;
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

            // Generar PDF (similar a exportQuickCapturePDF pero para históricos)
            // Por ahora, mostrar notificación de que está en desarrollo
            Utils.showNotification('Exportación a PDF de reportes históricos próximamente', 'info');
            
            // TODO: Implementar generación de PDF para reportes históricos
            // Similar a exportQuickCapturePDF pero con datos agregados del período
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
