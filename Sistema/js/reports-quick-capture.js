// ============================================================
// reports-quick-capture.js - Captura Rapida + Sincronizacion
// Extension de Reports. Cargar DESPUES de reports.js
// ============================================================

const ReportsQuickCapture = {
    // ==================== CAPTURA RÁPIDA TEMPORAL ====================
    
    async getQuickCaptureTab() {
        const today = this.getLocalDateStr();
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
                            <span id="captures-date-display" style="color: var(--color-text-secondary); font-size: 10px; font-weight: 400; margin-left: 4px;">(${today})</span>
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
            <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border); margin-bottom: var(--spacing-md); box-shadow: var(--shadow-sm);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm); padding-bottom: var(--spacing-xs); border-bottom: 1px solid var(--color-border-light); cursor: pointer;" onclick="window.Reports.toggleArrivalsForm()">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <div style="width: 3px; height: 18px; background: var(--gradient-primary); border-radius: 2px;"></div>
                        <h3 style="margin: 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; color: var(--color-text);">
                            <i class="fas fa-plane-arrival" style="color: var(--color-primary); margin-right: 4px; font-size: 11px;"></i> Llegadas del Día
                        </h3>
                    </div>
                    <i id="arrivals-form-toggle-icon" class="fas fa-chevron-down" style="transition: transform 0.3s; color: var(--color-text-secondary); font-size: 11px;"></i>
                </div>
                <div id="quick-capture-arrivals-form-container" style="display: none; margin-bottom: var(--spacing-sm); padding: var(--spacing-md); background: var(--color-bg-secondary); border-radius: var(--radius-sm); border: 1px solid var(--color-border-light);">
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
                            <input type="number" id="qc-arrival-cost" class="form-input" min="0" step="0.01" placeholder="0.00" readonly style="background: var(--color-bg-tertiary);">
                            <small id="qc-arrival-cost-help" style="color: var(--color-text-secondary); font-size: 9px;">Se calcula automáticamente según reglas en Configuración → Reglas de Llegadas</small>
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
            <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border); margin-bottom: var(--spacing-md); box-shadow: var(--shadow-sm);">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: var(--spacing-sm); padding-bottom: var(--spacing-xs); border-bottom: 1px solid var(--color-border-light);">
                    <div style="width: 3px; height: 18px; background: var(--gradient-accent); border-radius: 2px;"></div>
                    <h3 style="margin: 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; color: var(--color-text);">
                        <i class="fas fa-percent" style="color: var(--color-primary); margin-right: 4px; font-size: 11px;"></i> Comisiones Calculadas
                    </h3>
                </div>
                <div id="quick-capture-commissions">
                    <div style="text-align: center; padding: var(--spacing-lg); color: var(--color-text-secondary);">
                        <i class="fas fa-spinner fa-spin"></i> Calculando comisiones...
                    </div>
                </div>
            </div>

            <!-- Sección de Utilidades del Día -->
            <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border); margin-bottom: var(--spacing-md); box-shadow: var(--shadow-sm);">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: var(--spacing-sm); padding-bottom: var(--spacing-xs); border-bottom: 1px solid var(--color-border-light);">
                    <div style="width: 3px; height: 18px; background: var(--gradient-success); border-radius: 2px;"></div>
                    <h3 style="margin: 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; color: var(--color-text);">
                        <i class="fas fa-chart-line" style="color: var(--color-success); margin-right: 4px; font-size: 11px;"></i> Utilidades del Día
                    </h3>
                </div>
                <div id="quick-capture-profits">
                    <div style="text-align: center; padding: var(--spacing-lg); color: var(--color-text-secondary);">
                        <i class="fas fa-spinner fa-spin"></i> Calculando utilidades...
                    </div>
                </div>
            </div>

            <!-- Sección de Historial de Reportes Archivados -->
            <div class="module" style="padding: var(--spacing-md); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border); margin-bottom: var(--spacing-md); box-shadow: var(--shadow-sm);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm); padding-bottom: var(--spacing-xs); border-bottom: 1px solid var(--color-border-light);">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <div style="width: 3px; height: 18px; background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-danger) 100%); border-radius: 2px;"></div>
                        <h3 style="margin: 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; color: var(--color-text);">
                            <i class="fas fa-history" style="color: var(--color-primary); margin-right: 4px; font-size: 11px;"></i> Historial de Reportes Archivados
                        </h3>
                    </div>
                    <div style="display: flex; gap: 6px;">
                        <button class="btn-secondary btn-sm" onclick="window.Reports.recalcAllArchivedCosts()" title="Recalcular costos operativos (variables + fijos + bancarias) de todos los archivados desde cost_entries" style="font-weight: 600; padding: 6px 10px; font-size: 11px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); color: var(--color-info, #3498db);">
                            <i class="fas fa-sync-alt"></i> Recalcular Costos
                        </button>
                        <button class="btn-secondary btn-sm" onclick="window.Reports.recalcAllArchivedArrivals()" title="Re-asociar llegadas desde agency_arrivals por fecha y recalcular costos de llegadas en todos los archivados" style="font-weight: 600; padding: 6px 10px; font-size: 11px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); color: var(--color-success, #27ae60);">
                            <i class="fas fa-plane-arrival"></i> Recalcular Llegadas
                        </button>
                        <button class="btn-secondary btn-sm" onclick="window.Reports.recalculateAllArchivedCommissions()" title="Recalcular comisiones de todos los reportes archivados" style="font-weight: 600; padding: 6px 10px; font-size: 11px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); color: var(--color-warning, #e67e22);">
                            <i class="fas fa-calculator"></i> Recalcular Comisiones
                        </button>
                        <button class="btn-secondary btn-sm" onclick="window.Reports.loadArchivedReports()" title="Actualizar historial" style="font-weight: 600; padding: 6px 10px; font-size: 11px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                            <i class="fas fa-sync-alt"></i> Actualizar
                        </button>
                    </div>
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
                const today = this.getLocalDateStr();
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
                        const arrivalDate = arrivalDateInput?.value || mainDateInput?.value || this.getLocalDateStr();
                        
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
                                    const calculatedFee = parseFloat(calculation.calculatedFee) || 0;
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
                const today = this.getLocalDateStr();
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

            // Prioridad 1: usar asignación explícita agencia -> guías
            const assignedGuides = this.getAssignedGuidesForAgency(guides, selectedAgency.name);
            if (assignedGuides && assignedGuides.length > 0) {
                guideSelect.innerHTML = '<option value="">Seleccionar...</option>' +
                    assignedGuides.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
                console.log(`✅ [Llegadas] ${assignedGuides.length} guías cargados por asignación explícita para ${selectedAgency.name}`);
                return;
            }

            // Normalizar nombre de la agencia seleccionada para comparaciones
            const selectedNameNorm = String(selectedAgency.name || '').trim().toUpperCase().replace(/\s+/g, '');
            // IDs de todas las agencias con el mismo nombre (duplicados local vs servidor)
            const agencyIdsWithSameName = agencies
                .filter(a => {
                    const an = String(a.name || '').trim().toUpperCase().replace(/\s+/g, '');
                    return an === selectedNameNorm || an.includes(selectedNameNorm) || selectedNameNorm.includes(an);
                })
                .map(a => a.id);

            // Filtrar guías por agencia seleccionada
            const filteredGuides = guides.filter(g => {
                // Permitir guías sin agency_id solo si hay un segundo pase fallback (ver más abajo)
                const guideAgencyIdStr = String(g.agency_id || '').trim();
                if (!guideAgencyIdStr) {
                    return false;
                }
                
                // 1. Comparar por ID (método principal)
                let matches = this.compareIds(g.agency_id, agencyId);
                
                // 2. Si no coincide, verificar si agency_id del guía coincide con CUALQUIER agencia del mismo nombre
                if (!matches && agencyIdsWithSameName.length > 0) {
                    matches = agencyIdsWithSameName.some(aid => this.compareIds(g.agency_id, aid));
                }
                
                // 3. Si no coincide por ID, intentar comparar por nombre de agencia (guideAgency encontrada por g.agency_id)
                if (!matches) {
                    const guideAgency = agencies.find(a => this.compareIds(a.id, g.agency_id));
                    if (guideAgency) {
                        const guideAgencyNameNorm = String(guideAgency.name || '').trim().toUpperCase().replace(/\s+/g, '');
                        matches = selectedNameNorm === guideAgencyNameNorm || 
                                 selectedNameNorm.includes(guideAgencyNameNorm) || 
                                 guideAgencyNameNorm.includes(selectedNameNorm);
                    }
                }
                
                // 4. Guías con agency_id = nombre de agencia (ej. "VERANOS" en lugar de id)
                if (!matches) {
                    const guideAgencyIdUpper = guideAgencyIdStr.toUpperCase().replace(/\s+/g, '');
                    matches = guideAgencyIdUpper === selectedNameNorm || 
                             guideAgencyIdUpper.includes(selectedNameNorm) || 
                             selectedNameNorm.includes(guideAgencyIdUpper);
                }
                
                // 5. Si el agency_id del guía es legacy (ag1..ag7), mapear al nombre de agencia y comparar
                if (!matches && /^ag\d+$/i.test(guideAgencyIdStr)) {
                    const legacyNameMap = { 'ag1': 'TRAVELEX', 'ag2': 'VERANOS', 'ag3': 'TANITOURS', 'ag4': 'DISCOVERY', 'ag5': 'TB', 'ag6': 'TTF', 'ag7': 'TROPICALADVENTURE' };
                    const legacyName = legacyNameMap[guideAgencyIdStr.toLowerCase()] || '';
                    if (legacyName) {
                        matches = legacyName === selectedNameNorm || selectedNameNorm.includes(legacyName) || legacyName.includes(selectedNameNorm);
                    }
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

            // Prioridad 1: usar asignación explícita agencia -> guías
            const assignedGuides = this.getAssignedGuidesForAgency(guides, selectedAgency.name);
            if (assignedGuides && assignedGuides.length > 0) {
                guideSelect.innerHTML = '<option value="">Ninguno</option>' +
                    assignedGuides.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
                console.log(`✅ ${assignedGuides.length} guías cargados por asignación explícita para agencia ${selectedAgency.name}`);
                return;
            }

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

    normalizeCatalogName(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '');
    },

    getAgencyGuideAssignments() {
        return {
            VERANOS: ['CARLOS SIS', 'MARIO RENDON', 'CHAVA', 'FREDY', 'NETO', 'EMMANUEL'],
            TANITOURS: ['MARINA', 'GLORIA', 'DANIELA'],
            DISCOVERY: ['RAMON', 'GUSTAVO SIS', 'GUSTAVO LEPE', 'NOVOA', 'ERIK', 'CHILO', 'FERMIN', 'EMMA', 'HERASMO'],
            TRAVELEX: ['MIGUEL SUAREZ', 'SANTA', 'MIGUEL DELGADILLO', 'ANDRES CHAVEZ', 'SAREM', 'ZAVALA', 'TEMO', 'ROCIO', 'NETO', 'SEBASTIAN S'],
            TB: ['MIGUEL IBARRA', 'ADAN', 'MIGUEL RAGA', 'GABINO', 'HECTOR SUAREZ', 'OSCAR', 'JOSE AVILES'],
            TTF: ['HUGO', 'HILBERTO', 'JOSE MASIAS', 'DAVID BUSTOS', 'ALFONSO', 'DANIEL RIVERA', 'EDUARDO LEAL'],
            TROPICALADVENTURE: ['GEOVANNY', 'GINA', 'JAVIER', 'JULIAN', 'LUKE', 'NANCY', 'NEYRA', 'ROGER']
        };
    },

    getAssignedGuidesForAgency(guides, selectedAgencyName) {
        const agencyAssignments = this.getAgencyGuideAssignments();
        const selectedAgencyNorm = this.normalizeCatalogName(selectedAgencyName);
        const assignedGuideNames = agencyAssignments[selectedAgencyNorm];

        if (!assignedGuideNames || assignedGuideNames.length === 0) {
            return null;
        }

        const normalizeGuideBaseName = (value) => {
            const raw = String(value || '');
            const withoutAgencySuffix = raw.replace(/\s*\([^)]*\)\s*$/g, '');
            return this.normalizeCatalogName(withoutAgencySuffix);
        };

        const catalogGuides = (guides || []).filter(g => g && g.name);
        if (!catalogGuides.length) return [];

        const usedGuideIds = new Set();
        const resolvedGuides = [];

        const findBestGuideMatch = (targetName) => {
            const targetNorm = normalizeGuideBaseName(targetName);
            if (!targetNorm) return null;

            const tokenList = targetNorm
                .split(/\s+/)
                .map(t => t.trim())
                .filter(Boolean);

            let best = null;
            let bestScore = -1;

            for (const guide of catalogGuides) {
                if (usedGuideIds.has(guide.id)) continue;

                const guideNorm = normalizeGuideBaseName(guide.name);
                if (!guideNorm) continue;

                let score = 0;
                if (guideNorm === targetNorm) score = 100;
                else if (guideNorm.includes(targetNorm) || targetNorm.includes(guideNorm)) score = 80;
                else {
                    // Coincidencia por tokens significativos
                    const matchedTokens = tokenList.filter(token => token.length >= 3 && guideNorm.includes(token)).length;
                    if (matchedTokens > 0) {
                        score = 40 + matchedTokens * 10;
                    }
                }

                if (score > bestScore) {
                    bestScore = score;
                    best = guide;
                }
            }

            if (bestScore < 40) return null;
            return best;
        };

        // Construir lista en el mismo orden exacto de la asignación requerida
        for (const targetGuideName of assignedGuideNames) {
            const match = findBestGuideMatch(targetGuideName);
            if (match) {
                usedGuideIds.add(match.id);
                resolvedGuides.push(match);
            }
        }

        return resolvedGuides;
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
            let filteredGuides = guides.filter(g => {
                if (!g.agency_id) return false;
                return this.compareIds(g.agency_id, agencyId);
            });

            // Prioridad 1: usar asignación explícita agencia -> guías
            const assignedGuides = this.getAssignedGuidesForAgency(guides, selectedAgency.name);
            if (assignedGuides && assignedGuides.length > 0) {
                filteredGuides = assignedGuides;
            }

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
            const captureDate = document.getElementById('qc-date')?.value || this.getLocalDateStr();
            
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
                    const currentDate = document.getElementById('qc-date')?.value || this.getLocalDateStr();
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
                const currentDate = document.getElementById('qc-date')?.value || this.getLocalDateStr();
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
            const date = dateStr || document.getElementById('qc-date')?.value || this.getLocalDateStr();
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
                const cTotal = parseFloat(c.total) || 0;
                // Si hay pagos individuales, calcular desde ellos
                if (c.payments && Array.isArray(c.payments) && c.payments.length > 0) {
                    c.payments.forEach(payment => {
                        const amount = parseFloat(payment.amount) || 0;
                        const currency = payment.currency || c.currency || 'MXN';
                        totals[currency] = (totals[currency] || 0) + amount;
                    });
                    // El total ya está en MXN (se calculó al agregar)
                    totalMXN += cTotal;
                } else {
                    // Fallback: usar total y currency de la captura
                    totals[c.currency || 'MXN'] = (totals[c.currency || 'MXN'] || 0) + cTotal;
                    // Convertir a MXN si es necesario
                    if (c.currency === 'USD') {
                        totalMXN += cTotal * usdRate;
                    } else if (c.currency === 'CAD') {
                        totalMXN += cTotal * cadRate;
                    } else {
                        totalMXN += cTotal;
                    }
                }
                totalQuantity += c.quantity || 1;
            });

            // Renderizar tabla
            let html = `
                <div style="margin-bottom: 10px; padding: 10px; background: var(--color-bg-secondary); border-radius: 6px; border: 1px solid var(--color-warning); box-shadow: var(--shadow-sm);">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px;">
                        <div style="padding: 8px; background: var(--color-bg-card); border-radius: 4px; border-left: 3px solid var(--color-warning); box-shadow: var(--shadow-xs);">
                            <div style="font-size: 9px; color: var(--color-text-secondary); text-transform: uppercase; margin-bottom: 4px; font-weight: 600; letter-spacing: 0.3px;">Total Pendientes</div>
                            <div style="font-size: 20px; font-weight: 700; color: var(--color-warning);">${this.pendingCaptures.length}</div>
                        </div>
                        <div style="padding: 8px; background: var(--color-bg-card); border-radius: 4px; border-left: 3px solid var(--color-warning); box-shadow: var(--shadow-xs);">
                            <div style="font-size: 9px; color: var(--color-text-secondary); text-transform: uppercase; margin-bottom: 4px; font-weight: 600; letter-spacing: 0.3px;">Total Cantidad</div>
                            <div style="font-size: 20px; font-weight: 700; color: var(--color-warning);">${totalQuantity}</div>
                        </div>
                        <div style="padding: 8px; background: var(--color-bg-card); border-radius: 4px; border-left: 3px solid var(--color-warning); box-shadow: var(--shadow-xs);">
                            <div style="font-size: 9px; color: var(--color-text-secondary); text-transform: uppercase; margin-bottom: 4px; font-weight: 600; letter-spacing: 0.3px;">Total USD</div>
                            <div style="font-size: 16px; font-weight: 700; color: var(--color-warning);">$${totals.USD.toFixed(2)}</div>
                        </div>
                        <div style="padding: 8px; background: var(--color-bg-card); border-radius: 4px; border-left: 3px solid var(--color-warning); box-shadow: var(--shadow-xs);">
                            <div style="font-size: 9px; color: var(--color-text-secondary); text-transform: uppercase; margin-bottom: 4px; font-weight: 600; letter-spacing: 0.3px;">Total MXN</div>
                            <div style="font-size: 16px; font-weight: 700; color: var(--color-warning);">$${totalMXN.toFixed(2)}</div>
                        </div>
                        <div style="padding: 8px; background: var(--color-bg-card); border-radius: 4px; border-left: 3px solid var(--color-warning); box-shadow: var(--shadow-xs);">
                            <div style="font-size: 9px; color: var(--color-text-secondary); text-transform: uppercase; margin-bottom: 4px; font-weight: 600; letter-spacing: 0.3px;">Total CAD</div>
                            <div style="font-size: 16px; font-weight: 700; color: var(--color-warning);">$${totals.CAD.toFixed(2)}</div>
                        </div>
                    </div>
                </div>

                <div style="overflow-x: auto; border-radius: 4px; border: 1px solid var(--color-border);">
                    <table style="width: 100%; min-width: 900px; border-collapse: collapse; background: var(--color-bg-card); font-size: 11px; table-layout: auto;">
                        <thead>
                            <tr style="background: linear-gradient(135deg, var(--color-warning) 0%, #ff9800 100%); color: white;">
                                <th style="padding: 8px 6px; text-align: left; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px; white-space: nowrap; min-width: 40px;">#</th>
                                <th style="padding: 8px 6px; text-align: left; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px; white-space: nowrap; min-width: 80px;">Sucursal</th>
                                <th style="padding: 8px 6px; text-align: left; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px; white-space: nowrap; min-width: 80px;">Vendedor</th>
                                <th style="padding: 8px 6px; text-align: left; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px; white-space: nowrap; min-width: 70px;">Guía</th>
                                <th style="padding: 8px 6px; text-align: left; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px; white-space: nowrap; min-width: 70px;">Agencia</th>
                                <th style="padding: 8px 6px; text-align: left; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px; white-space: nowrap; min-width: 90px;">Producto</th>
                                <th style="padding: 8px 6px; text-align: center; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px; white-space: nowrap; min-width: 60px;">Cantidad</th>
                                <th style="padding: 8px 6px; text-align: right; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px; white-space: nowrap; min-width: 80px;">Moneda</th>
                                <th style="padding: 8px 6px; text-align: right; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px; white-space: nowrap; min-width: 80px;">Total</th>
                                <th style="padding: 8px 6px; text-align: right; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px; white-space: nowrap; min-width: 80px;">Costos</th>
                                <th style="padding: 8px 6px; text-align: center; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px; white-space: nowrap; min-width: 90px;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.pendingCaptures.map((c, index) => {
                                const isEven = index % 2 === 0;
                                return `
                                    <tr style="border-bottom: 1px solid var(--color-border-light); background: ${isEven ? 'var(--color-bg-card)' : 'var(--color-bg-secondary)'};">
                                        <td style="padding: 6px; font-size: 11px; font-weight: 600; color: var(--color-text);">${index + 1}</td>
                                        <td style="padding: 6px; font-size: 11px; color: var(--color-text);">${c.branch_name || 'N/A'}</td>
                                        <td style="padding: 6px; font-size: 11px; color: var(--color-text); font-weight: 500;">${c.seller_name || 'N/A'}</td>
                                        <td style="padding: 6px; font-size: 11px; color: var(--color-text-secondary);">${c.guide_name || '-'}</td>
                                        <td style="padding: 6px; font-size: 11px; color: var(--color-text-secondary);">${c.agency_name || '-'}</td>
                                        <td style="padding: 6px; font-size: 11px; color: var(--color-text); font-weight: 500;">${c.product}</td>
                                        <td style="padding: 6px; font-size: 11px; text-align: center; color: var(--color-text);">${c.quantity}</td>
                                        <td style="padding: 6px; font-size: 11px; text-align: right; color: var(--color-text); font-weight: 500;">
                                            ${c.payments && Array.isArray(c.payments) && c.payments.length > 0 
                                                ? c.payments.map(p => `${p.method === 'cash' ? 'Efectivo' : p.method === 'card' ? 'Tarjeta' : p.method} ${p.currency || 'MXN'} $${(parseFloat(p.amount) || 0).toFixed(2)}`).join('<br>')
                                                : `${c.currency || 'MXN'} $${(parseFloat(c.total) || 0).toFixed(2)}`
                                            }
                                        </td>
                                        <td style="padding: 6px; font-size: 11px; text-align: right; font-weight: 600; color: var(--color-success);">$${(parseFloat(c.total) || 0).toFixed(2)}</td>
                                        <td style="padding: 6px; font-size: 11px; text-align: right; color: var(--color-danger); font-weight: 500;">$${(parseFloat(c.merchandise_cost) || 0).toFixed(2)}</td>
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
                const dateVal = capture.date ? (typeof capture.date === 'string' ? capture.date.split('T')[0] : capture.date) : '';
                document.getElementById('qc-date').value = dateVal || (typeof Utils !== 'undefined' && Utils.formatDate ? Utils.formatDate(new Date(), 'YYYY-MM-DD') : new Date().toISOString().split('T')[0]);
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
                        capture.date = dateInput?.value || this.getLocalDateStr();
                    }
                    
                    // CRÍTICO: Preservar la fecha original asignada (puede ser histórica como 1ro de enero)
                    // NO usar la fecha actual, usar siempre la fecha que el usuario asignó
                    const originalReportDate = capture.original_report_date || capture.date || (document.getElementById('qc-date')?.value || this.getLocalDateStr());
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
                            
                            // Validar que guide_id sea UUID válido, si no convertir a null
                            const isValidUUID = (value) => {
                                if (!value || typeof value !== 'string') return false;
                                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                                return uuidRegex.test(value);
                            };
                            
                            const guideIdToSend = savedCapture.guide_id && isValidUUID(savedCapture.guide_id) ? savedCapture.guide_id : null;
                            if (savedCapture.guide_id && !isValidUUID(savedCapture.guide_id)) {
                                console.warn(`⚠️ guide_id inválido ignorado: "${savedCapture.guide_id}" (enviando null en su lugar)`);
                            }
                            
                            const serverCapture = await API.createQuickCapture({
                                branch_id: savedCapture.branch_id,
                                seller_id: savedCapture.seller_id,
                                guide_id: guideIdToSend,
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

    async loadQuickCaptureData(options = {}) {
        try {
            const skipRemoteLookup = options?.skipRemoteLookup === true;
            // Obtener la fecha del formulario o usar hoy por defecto
            const dateInput = document.getElementById('qc-date');
            const selectedDate = dateInput?.value || this.getLocalDateStr();
            
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

            const filterCaptureForSelectedDate = (c) => {
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
            };

            captures = captures.filter(filterCaptureForSelectedDate);

            // IMPORTANTE: siempre intentar mezclar con servidor para la fecha seleccionada.
            // Si solo rehidratamos cuando no hay datos locales, master_admin puede quedarse con
            // una vista parcial cuando otro equipo creó capturas y este cliente perdió el evento Socket.
            if (!skipRemoteLookup) {
                const hydratedCount = await this.hydrateQuickCapturesForDate(selectedDate, currentBranchId, isMasterAdmin);
                if (hydratedCount > 0) {
                    const reloadedCaptures = await DB.getAll('temp_quick_captures') || [];
                    captures = reloadedCaptures.filter(filterCaptureForSelectedDate);
                    console.log(`🔄 Rehidratadas ${hydratedCount} capturas para ${selectedDate}. Coincidencias tras relectura: ${captures.length}`);
                }
            }

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
                <div style="margin-bottom: 10px; padding: 10px; background: var(--color-bg-secondary); border-radius: 6px; border: 1px solid var(--color-border); box-shadow: var(--shadow-sm);">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px;">
                        <div style="padding: 8px; background: var(--color-bg-card); border-radius: 4px; border-left: 3px solid #667eea; box-shadow: var(--shadow-xs);">
                            <div style="font-size: 9px; color: var(--color-text-secondary); text-transform: uppercase; margin-bottom: 4px; font-weight: 600; letter-spacing: 0.3px;">Total Capturas</div>
                            <div style="font-size: 20px; font-weight: 700; color: #667eea;">${captures.length}</div>
                        </div>
                        <div style="padding: 8px; background: var(--color-bg-card); border-radius: 4px; border-left: 3px solid #11998e; box-shadow: var(--shadow-xs);">
                            <div style="font-size: 9px; color: var(--color-text-secondary); text-transform: uppercase; margin-bottom: 4px; font-weight: 600; letter-spacing: 0.3px;">Total Cantidad</div>
                            <div style="font-size: 20px; font-weight: 700; color: #11998e;">${totalQuantity}</div>
                        </div>
                        <div style="padding: 8px; background: var(--color-bg-card); border-radius: 4px; border-left: 3px solid #f093fb; box-shadow: var(--shadow-xs);">
                            <div style="font-size: 9px; color: var(--color-text-secondary); text-transform: uppercase; margin-bottom: 4px; font-weight: 600; letter-spacing: 0.3px;">Total USD</div>
                            <div style="font-size: 16px; font-weight: 700; color: #f093fb;">$${totals.USD.toFixed(2)}</div>
                        </div>
                        <div style="padding: 8px; background: var(--color-bg-card); border-radius: 4px; border-left: 3px solid #4facfe; box-shadow: var(--shadow-xs);">
                            <div style="font-size: 9px; color: var(--color-text-secondary); text-transform: uppercase; margin-bottom: 4px; font-weight: 600; letter-spacing: 0.3px;">Total MXN</div>
                            <div style="font-size: 16px; font-weight: 700; color: #4facfe;">$${totals.MXN.toFixed(2)}</div>
                        </div>
                        <div style="padding: 8px; background: var(--color-bg-card); border-radius: 4px; border-left: 3px solid #fa709a; box-shadow: var(--shadow-xs);">
                            <div style="font-size: 9px; color: var(--color-text-secondary); text-transform: uppercase; margin-bottom: 4px; font-weight: 600; letter-spacing: 0.3px;">Total CAD</div>
                            <div style="font-size: 16px; font-weight: 700; color: #fa709a;">$${totals.CAD.toFixed(2)}</div>
                        </div>
                    </div>
                </div>

                <div style="overflow-x: auto; border-radius: 4px; border: 1px solid var(--color-border);">
                    <table style="width: 100%; min-width: 900px; border-collapse: collapse; background: var(--color-bg-card); font-size: 11px; table-layout: auto;">
                        <thead>
                            <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                                <th style="padding: 8px 6px; text-align: left; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px; white-space: nowrap; min-width: 50px;">Hora</th>
                                <th style="padding: 8px 6px; text-align: left; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px; white-space: nowrap; min-width: 80px;">Sucursal</th>
                                <th style="padding: 8px 6px; text-align: left; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px; white-space: nowrap; min-width: 80px;">Vendedor</th>
                                <th style="padding: 8px 6px; text-align: left; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px; white-space: nowrap; min-width: 70px;">Guía</th>
                                <th style="padding: 8px 6px; text-align: left; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px; white-space: nowrap; min-width: 70px;">Agencia</th>
                                <th style="padding: 8px 6px; text-align: left; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px; white-space: nowrap; min-width: 90px;">Producto</th>
                                <th style="padding: 8px 6px; text-align: center; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px; white-space: nowrap; min-width: 60px;">Cantidad</th>
                                <th style="padding: 8px 6px; text-align: right; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px; white-space: nowrap; min-width: 80px;">Moneda</th>
                                <th style="padding: 8px 6px; text-align: right; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px; white-space: nowrap; min-width: 80px;">Total</th>
                                <th style="padding: 8px 6px; text-align: right; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px; white-space: nowrap; min-width: 80px;">Costos</th>
                                <th style="padding: 8px 6px; text-align: left; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px; white-space: nowrap; min-width: 100px;">Notas</th>
                                <th style="padding: 8px 6px; text-align: center; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px; white-space: nowrap; min-width: 90px;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${captures.map((c, index) => {
                                const time = new Date(c.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                                const isEven = index % 2 === 0;
                                return `
                                    <tr style="border-bottom: 1px solid var(--color-border-light); background: ${isEven ? 'var(--color-bg-card)' : 'var(--color-bg-secondary)'};">
                                        <td style="padding: 6px; font-size: 11px; color: var(--color-text);">${time}</td>
                                        <td style="padding: 6px; font-size: 11px; color: var(--color-text);">${c.branch_name || 'N/A'}</td>
                                        <td style="padding: 6px; font-size: 11px; color: var(--color-text); font-weight: 500;">${c.seller_name || 'N/A'}</td>
                                        <td style="padding: 6px; font-size: 11px; color: var(--color-text-secondary);">${c.guide_name || '-'}</td>
                                        <td style="padding: 6px; font-size: 11px; color: var(--color-text-secondary);">${c.agency_name || '-'}</td>
                                        <td style="padding: 6px; font-size: 11px; color: var(--color-text); font-weight: 500;">${c.product}</td>
                                        <td style="padding: 6px; font-size: 11px; text-align: center; color: var(--color-text);">${c.quantity}</td>
                                        <td style="padding: 6px; font-size: 10px; text-align: right; color: var(--color-text); font-weight: 500;">
                                            ${c.payments && Array.isArray(c.payments) && c.payments.length > 0 
                                                ? c.payments.map(p => {
                                                    const methodLabel = p.method === 'cash' ? 'Efectivo' : p.method === 'card' ? 'Tarjeta' : p.method === 'transfer' ? 'Transferencia' : p.method || 'Otro';
                                                    return `${methodLabel} ${p.currency || 'MXN'} $${(parseFloat(p.amount) || 0).toFixed(2)}`;
                                                }).join('<br>')
                                                : `${c.currency || 'MXN'} $${(parseFloat(c.total) || 0).toFixed(2)}`
                                            }
                                        </td>
                                        <td style="padding: 6px; font-size: 11px; text-align: right; font-weight: 600; color: var(--color-success);">$${(parseFloat(c.total) || 0).toFixed(2)}</td>
                                        <td style="padding: 6px; font-size: 11px; text-align: right; color: var(--color-danger); font-weight: 500;">$${(parseFloat(c.merchandise_cost) || 0).toFixed(2)}</td>
                                        <td style="padding: 6px; font-size: 10px; color: var(--color-text-secondary); max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${c.notes || ''}">${c.notes || '-'}</td>
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

    async hydrateQuickCapturesForDate(selectedDate, currentBranchId, isMasterAdmin) {
        try {
            if (typeof API === 'undefined' || !API.baseURL || !API.token || !API.getQuickCaptures) {
                return 0;
            }

            const normalizedSelectedDate = String(selectedDate || '').split('T')[0];
            const filters = {
                date: normalizedSelectedDate
            };
            if (!isMasterAdmin && currentBranchId) {
                filters.branch_id = currentBranchId;
            }

            const serverCaptures = await API.getQuickCaptures(filters);
            if (!Array.isArray(serverCaptures) || serverCaptures.length === 0) {
                return 0;
            }

            const capturesForDate = serverCaptures.filter(capture => {
                const captureDate = (capture?.original_report_date || capture?.date || '').split('T')[0];
                return captureDate === normalizedSelectedDate;
            });

            if (capturesForDate.length === 0) {
                return 0;
            }

            let upsertedCount = 0;
            for (const capture of capturesForDate) {
                try {
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
                        total: parseFloat(capture.total) || 0,
                        merchandise_cost: parseFloat(capture.merchandise_cost) || 0,
                        notes: capture.notes,
                        is_street: capture.is_street || false,
                        payment_method: capture.payment_method,
                        payments: capture.payments || [],
                        date: capture.date || capture.original_report_date,
                        original_report_date: capture.original_report_date || capture.date,
                        created_at: capture.created_at || new Date().toISOString(),
                        updated_at: capture.updated_at || new Date().toISOString(),
                        created_by: capture.created_by,
                        sync_status: 'synced'
                    };

                    const allLocal = await DB.getAll('temp_quick_captures') || [];
                    const existing = allLocal.find(c => c.server_id === capture.id || c.id === capture.id);
                    const toSave = existing
                        ? { ...localCapture, id: existing.id, server_id: capture.id }
                        : localCapture;

                    await DB.put('temp_quick_captures', toSave);
                    upsertedCount++;
                } catch (captureError) {
                    console.warn('⚠️ Error rehidratando captura individual:', captureError);
                }
            }

            return upsertedCount;
        } catch (error) {
            console.warn('⚠️ No se pudo rehidratar capturas desde servidor para la fecha seleccionada:', error?.message || error);
            return 0;
        }
    },

    async loadQuickCaptureArrivals() {
        try {
            // Obtener la fecha del formulario o usar hoy por defecto (fecha LOCAL, no UTC)
            const dateInput = document.getElementById('qc-date');
            const arrivalDateInput = document.getElementById('qc-arrival-date');
            const selectedDate = arrivalDateInput?.value || dateInput?.value || this.getLocalDateStr();
            
            // SINCRONIZACIÓN BAJANTE: cargar llegadas del servidor para esta fecha
            if (typeof API !== 'undefined' && API.baseURL && API.token && typeof API.getArrivals === 'function') {
                try {
                    const serverArrivals = await API.getArrivals({ date: selectedDate });
                    if (Array.isArray(serverArrivals) && serverArrivals.length > 0) {
                        for (const a of serverArrivals) {
                            if (a && a.id) {
                                const existing = await DB.get('agency_arrivals', a.id);
                                // Solo actualizar si el servidor tiene una versión más reciente
                                if (!existing || new Date(a.updated_at || 0) >= new Date(existing.updated_at || 0)) {
                                    await DB.put('agency_arrivals', a);
                                }
                            }
                        }
                        console.log(`🔄 Sincronizadas ${serverArrivals.length} llegadas desde servidor para ${selectedDate}`);
                    }
                } catch (syncErr) {
                    console.warn('⚠️ No se pudieron sincronizar llegadas desde servidor (usando caché local):', syncErr.message);
                }
            }

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
                
                // Filtrar por agencia si hay una seleccionada en el formulario
                if (selectedAgencyId) {
                    if (!a.agency_id || String(a.agency_id) !== String(selectedAgencyId)) {
                        return false;
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
                
                // Solo incluir llegadas válidas (con pasajeros > 0 o con costo registrado)
                const passengers = parseFloat(a.passengers) || 0;
                const arrivalCost = parseFloat(a.arrival_fee || a.calculated_fee || 0) || 0;
                if (passengers <= 0 && arrivalCost <= 0) {
                    return false;
                }
                
                return true;
            });

            let finalArrivals = filteredArrivals;

            // Fallback: si no hay agency_arrivals para esa fecha, consultar costos de llegadas
            if (finalArrivals.length === 0) {
                const allCosts = await DB.getAll('cost_entries') || [];
                const arrivalCosts = allCosts.filter(c => {
                    if (c.category !== 'pago_llegadas') return false;

                    const costDate = (c.date || c.created_at || '').split('T')[0];
                    if (!costDate || costDate !== selectedDate) return false;

                    if (!isMasterAdmin && currentBranchId) {
                        if (!c.branch_id || String(c.branch_id) !== String(currentBranchId)) {
                            return false;
                        }
                    }

                    if (selectedAgencyId && c.agency_id && String(c.agency_id) !== String(selectedAgencyId)) {
                        return false;
                    }

                    return true;
                });

                finalArrivals = arrivalCosts.map(c => {
                    const passengersFromField = parseFloat(c.passengers) || 0;
                    const passengersFromNotes = (() => {
                        const notes = String(c.notes || '');
                        const match = notes.match(/(\d+)\s*pasajeros/i);
                        return match ? parseFloat(match[1]) || 0 : 0;
                    })();

                    return {
                        id: `arrival_from_cost_${c.id}`,
                        agency_id: c.agency_id || null,
                        guide_id: c.guide_id || null,
                        guide_name: c.guide_name || null,
                        agency_name: c.agency_name || null,
                        branch_id: c.branch_id || null,
                        date: (c.date || c.created_at || selectedDate).split('T')[0],
                        passengers: passengersFromField || passengersFromNotes || 0,
                        units: parseInt(c.units || 0, 10) || null,
                        unit_type: c.unit_type || null,
                        arrival_fee: parseFloat(c.amount) || 0,
                        calculated_fee: parseFloat(c.amount) || 0,
                        notes: c.notes || '',
                        source: 'cost_entries',
                        created_at: c.created_at || new Date().toISOString()
                    };
                });

                if (finalArrivals.length > 0) {
                    console.log(`🔁 Fallback aplicado: ${finalArrivals.length} llegadas cargadas desde cost_entries para ${selectedDate}`);
                }
            }
            
            const agencies = await DB.getAll('catalog_agencies') || [];
            const branches = await DB.getAll('catalog_branches') || [];

            const container = document.getElementById('quick-capture-arrivals');
            if (!container) return;

            if (finalArrivals.length === 0) {
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
            finalArrivals.forEach(arrival => {
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
                                            <div style="display: grid; gap: 4px; font-size: 10px; color: #6c757d;">
                                                ${guideGroup.arrivals.map(a => {
                                                    const branch = branches.find(b => b.id === a.branch_id);
                                                    return `
                                                        <div style="padding: 3px 6px; background: #f8f9fa; border-radius: 2px; display: flex; justify-content: space-between; align-items: center;">
                                                            <span>
                                                                <i class="fas fa-building" style="font-size: 9px; margin-right: 4px;"></i> ${branch?.name || 'N/A'}: 
                                                                <strong style="color: #495057;">${a.passengers || 0}</strong> pax
                                                                ${a.unit_type ? `<span style="margin-left: 4px; font-size: 9px;">(${a.unit_type})</span>` : ''}
                                                                ${a.arrival_fee || a.calculated_fee ? `<span style="margin-left: 4px; color: #28a745; font-weight: 600;">$${parseFloat(a.arrival_fee || a.calculated_fee || 0).toFixed(0)}</span>` : ''}
                                                            </span>
                                                            <span style="display: flex; gap: 3px; flex-shrink: 0; margin-left: 6px;">
                                                                <button onclick="window.Reports.editArrivalRecord('${a.id}')" style="font-size: 8px; padding: 2px 5px; background: #667eea; color: white; border: none; border-radius: 2px; cursor: pointer;" title="Editar llegada">
                                                                    <i class="fas fa-edit"></i>
                                                                </button>
                                                                <button onclick="window.Reports.deleteArrivalRecord('${a.id}')" style="font-size: 8px; padding: 2px 5px; background: #dc3545; color: white; border: none; border-radius: 2px; cursor: pointer;" title="Eliminar llegada">
                                                                    <i class="fas fa-trash"></i>
                                                                </button>
                                                            </span>
                                                        </div>
                                                    `;
                                                }).join('')}
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : `
                            <div style="display: grid; gap: 6px; font-size: 10px; color: #6c757d;">
                                ${group.arrivals.map(a => {
                                    const branch = branches.find(b => b.id === a.branch_id);
                                    const guide = a.guide_id ? guides.find(g => g.id === a.guide_id) : null;
                                    return `
                                        <div style="padding: 4px 6px; background: white; border-radius: 3px; display: flex; justify-content: space-between; align-items: center;">
                                            <span>
                                                <i class="fas fa-building" style="font-size: 9px; margin-right: 4px;"></i> ${branch?.name || 'N/A'}: 
                                                <strong style="color: #495057;">${a.passengers || 0}</strong> pax
                                                ${guide ? `<span style="margin-left: 4px; font-size: 9px; color: #667eea;"><i class="fas fa-user-tie"></i> ${guide.name}</span>` : ''}
                                                ${a.unit_type ? `<span style="margin-left: 4px; font-size: 9px;">(${a.unit_type})</span>` : ''}
                                                ${a.arrival_fee || a.calculated_fee ? `<span style="margin-left: 4px; color: #28a745; font-weight: 600;">$${parseFloat(a.arrival_fee || a.calculated_fee || 0).toFixed(0)}</span>` : ''}
                                            </span>
                                            <span style="display: flex; gap: 3px; flex-shrink: 0; margin-left: 6px;">
                                                <button onclick="window.Reports.editArrivalRecord('${a.id}')" style="font-size: 8px; padding: 2px 5px; background: #667eea; color: white; border: none; border-radius: 2px; cursor: pointer;" title="Editar llegada">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button onclick="window.Reports.deleteArrivalRecord('${a.id}')" style="font-size: 8px; padding: 2px 5px; background: #dc3545; color: white; border: none; border-radius: 2px; cursor: pointer;" title="Eliminar llegada">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </span>
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

    async deleteArrivalRecord(arrivalId) {
        if (!confirm('¿Eliminar esta llegada? Esta acción no se puede deshacer.')) return;
        try {
            let apiId = arrivalId;
            const arrival = await DB.get('agency_arrivals', arrivalId);
            if (arrival?.server_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(arrival.server_id))) {
                apiId = arrival.server_id;
            } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(arrivalId))) {
                apiId = null;
            }
            if (apiId && typeof API !== 'undefined' && API.baseURL && API.token && typeof API.deleteArrival === 'function') {
                try {
                    await API.deleteArrival(apiId);
                    console.log('✅ Llegada eliminada del servidor:', arrivalId);
                } catch (apiErr) {
                    console.warn('⚠️ No se pudo eliminar llegada del servidor (se elimina localmente):', apiErr);
                }
            }
            // Eliminar del cost_entries relacionado
            try {
                const allCosts = await DB.getAll('cost_entries') || [];
                const relatedCost = allCosts.find(c => c.arrival_id === arrivalId);
                if (relatedCost) {
                    if (typeof API !== 'undefined' && API.baseURL && API.token && typeof API.deleteCost === 'function') {
                        try { await API.deleteCost(relatedCost.id); } catch (e) {}
                    }
                    await DB.delete('cost_entries', relatedCost.id);
                }
            } catch (e) { console.warn('No se pudo limpiar cost_entry relacionado:', e); }
            // Eliminar localmente
            await DB.delete('agency_arrivals', arrivalId);
            Utils.showNotification('Llegada eliminada correctamente', 'success');
            await this.loadQuickCaptureArrivals();
            // Refrescar resumen
            await this.loadQuickCaptureCommissions();
        } catch (error) {
            console.error('Error eliminando llegada:', error);
            Utils.showNotification('Error al eliminar llegada: ' + error.message, 'error');
        }
    },

    async editArrivalRecord(arrivalId) {
        try {
            const arrival = await DB.get('agency_arrivals', arrivalId);
            if (!arrival) {
                Utils.showNotification('Llegada no encontrada', 'error');
                return;
            }
            const agencies = await DB.getAll('catalog_agencies') || [];
            const guides = await DB.getAll('catalog_guides') || [];
            const branches = await DB.getAll('catalog_branches') || [];

            const agencyOptions = agencies.map(a => `<option value="${a.id}" ${a.id === arrival.agency_id ? 'selected' : ''}>${a.name}</option>`).join('');
            const guideOptions = '<option value="">Sin guía</option>' + guides.map(g => `<option value="${g.id}" ${g.id === arrival.guide_id ? 'selected' : ''}>${g.name}</option>`).join('');
            const branchOptions = branches.map(b => `<option value="${b.id}" ${b.id === arrival.branch_id ? 'selected' : ''}>${b.name}</option>`).join('');

            const modal = document.createElement('div');
            modal.id = 'edit-arrival-modal';
            modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;';
            modal.innerHTML = `
                <div style="background:var(--color-bg-card,#1e1e2e);border-radius:8px;padding:24px;min-width:380px;max-width:500px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.4);">
                    <h3 style="margin:0 0 16px;color:var(--color-text,#fff);font-size:16px;">Editar Llegada</h3>
                    <div style="display:grid;gap:12px;">
                        <div>
                            <label style="font-size:11px;color:var(--color-text-secondary,#aaa);display:block;margin-bottom:4px;">Agencia</label>
                            <select id="edit-arr-agency" style="width:100%;padding:7px;border-radius:4px;border:1px solid var(--color-border,#333);background:var(--color-bg,#13131f);color:var(--color-text,#fff);">${agencyOptions}</select>
                        </div>
                        <div>
                            <label style="font-size:11px;color:var(--color-text-secondary,#aaa);display:block;margin-bottom:4px;">Guía</label>
                            <select id="edit-arr-guide" style="width:100%;padding:7px;border-radius:4px;border:1px solid var(--color-border,#333);background:var(--color-bg,#13131f);color:var(--color-text,#fff);">${guideOptions}</select>
                        </div>
                        <div>
                            <label style="font-size:11px;color:var(--color-text-secondary,#aaa);display:block;margin-bottom:4px;">Sucursal</label>
                            <select id="edit-arr-branch" style="width:100%;padding:7px;border-radius:4px;border:1px solid var(--color-border,#333);background:var(--color-bg,#13131f);color:var(--color-text,#fff);">${branchOptions}</select>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                            <div>
                                <label style="font-size:11px;color:var(--color-text-secondary,#aaa);display:block;margin-bottom:4px;">Pasajeros</label>
                                <input id="edit-arr-pax" type="number" min="0" value="${arrival.passengers || 0}" style="width:100%;padding:7px;border-radius:4px;border:1px solid var(--color-border,#333);background:var(--color-bg,#13131f);color:var(--color-text,#fff);">
                            </div>
                            <div>
                                <label style="font-size:11px;color:var(--color-text-secondary,#aaa);display:block;margin-bottom:4px;">Costo (MXN)</label>
                                <input id="edit-arr-fee" type="number" min="0" step="0.01" value="${parseFloat(arrival.arrival_fee || arrival.calculated_fee || 0).toFixed(2)}" style="width:100%;padding:7px;border-radius:4px;border:1px solid var(--color-border,#333);background:var(--color-bg,#13131f);color:var(--color-text,#fff);">
                            </div>
                        </div>
                        <div>
                            <label style="font-size:11px;color:var(--color-text-secondary,#aaa);display:block;margin-bottom:4px;">Fecha</label>
                            <input id="edit-arr-date" type="date" value="${(arrival.date || '').split('T')[0]}" style="width:100%;padding:7px;border-radius:4px;border:1px solid var(--color-border,#333);background:var(--color-bg,#13131f);color:var(--color-text,#fff);">
                        </div>
                        <div>
                            <label style="font-size:11px;color:var(--color-text-secondary,#aaa);display:block;margin-bottom:4px;">Notas</label>
                            <input id="edit-arr-notes" type="text" value="${arrival.notes || ''}" style="width:100%;padding:7px;border-radius:4px;border:1px solid var(--color-border,#333);background:var(--color-bg,#13131f);color:var(--color-text,#fff);">
                        </div>
                    </div>
                    <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end;">
                        <button id="edit-arr-cancel" style="padding:8px 16px;border-radius:4px;border:1px solid var(--color-border,#333);background:transparent;color:var(--color-text,#fff);cursor:pointer;">Cancelar</button>
                        <button id="edit-arr-save" style="padding:8px 16px;border-radius:4px;border:none;background:#667eea;color:white;cursor:pointer;font-weight:600;">Guardar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            document.getElementById('edit-arr-cancel').onclick = () => modal.remove();

            document.getElementById('edit-arr-save').onclick = async () => {
                const updatedArrival = {
                    ...arrival,
                    agency_id: document.getElementById('edit-arr-agency').value,
                    guide_id: document.getElementById('edit-arr-guide').value || null,
                    branch_id: document.getElementById('edit-arr-branch').value,
                    passengers: parseInt(document.getElementById('edit-arr-pax').value) || 0,
                    arrival_fee: parseFloat(document.getElementById('edit-arr-fee').value) || 0,
                    calculated_fee: parseFloat(document.getElementById('edit-arr-fee').value) || 0,
                    date: document.getElementById('edit-arr-date').value,
                    notes: document.getElementById('edit-arr-notes').value,
                    updated_at: new Date().toISOString(),
                    sync_status: 'pending'
                };
                try {
                    // Guardar en servidor
                    if (typeof API !== 'undefined' && API.baseURL && API.token && typeof API.updateArrival === 'function') {
                        try {
                            const isUUID = (v) => /^[0-9a-f]{8}-/i.test(String(v || ''));
                            const payload = { ...updatedArrival };
                            if (!isUUID(payload.branch_id)) payload.branch_id = null;
                            if (!isUUID(payload.agency_id)) payload.agency_id = null;
                            if (!isUUID(payload.guide_id)) payload.guide_id = null;
                            await API.updateArrival(arrivalId, payload);
                        } catch (apiErr) {
                            console.warn('⚠️ No se pudo actualizar en servidor:', apiErr);
                        }
                    }
                    // Guardar localmente
                    await DB.put('agency_arrivals', updatedArrival);
                    // Actualizar cost_entry relacionado
                    try {
                        const allCosts = await DB.getAll('cost_entries') || [];
                        const relatedCost = allCosts.find(c => c.arrival_id === arrivalId);
                        if (relatedCost) {
                            relatedCost.amount = updatedArrival.arrival_fee;
                            relatedCost.passengers = updatedArrival.passengers;
                            relatedCost.date = updatedArrival.date;
                            relatedCost.branch_id = updatedArrival.branch_id;
                            relatedCost.updated_at = new Date().toISOString();
                            await DB.put('cost_entries', relatedCost);
                        }
                    } catch (e) {}
                    modal.remove();
                    Utils.showNotification('Llegada actualizada correctamente', 'success');
                    await this.loadQuickCaptureArrivals();
                    await this.loadQuickCaptureCommissions();
                } catch (err) {
                    Utils.showNotification('Error al guardar: ' + err.message, 'error');
                }
            };
        } catch (error) {
            console.error('Error editando llegada:', error);
            Utils.showNotification('Error al abrir edición: ' + error.message, 'error');
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

            // Cargar agencias para formulario de llegadas (solo agencias permitidas y sin duplicados)
            const allAgencies = await DB.getAll('catalog_agencies') || [];
            const agencies = this.filterAllowedAgencies(allAgencies);

            const agencySelect = document.getElementById('qc-arrival-agency');
            if (agencySelect) {
                agencySelect.innerHTML = '<option value="">Seleccionar agencia...</option>' +
                    agencies.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
                console.log(`✅ [Llegadas] ${agencies.length} agencias permitidas cargadas: ${agencies.map(a => a.name).join(', ')}`);
            }

            // Cargar guías (se filtrarán por agencia cuando se seleccione una)
            const guideSelect = document.getElementById('qc-arrival-guide');
            if (guideSelect) {
                const preSelectedAgencyId = agencySelect?.value;
                if (preSelectedAgencyId) {
                    console.log(`🔍 [Llegadas] Agencia pre-seleccionada detectada: ${preSelectedAgencyId}, cargando guías...`);
                    await this.loadGuidesForAgencyInArrivalsForm(preSelectedAgencyId);
                } else {
                    await this.loadGuidesForAgencyInArrivalsForm(null);
                }
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
            const arrivalDate = arrivalDateInput?.value || mainDateInput?.value || this.getLocalDateStr();

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
            if (arrivalDateInput && mainDateInput?.value) {
                arrivalDateInput.value = mainDateInput.value;
            }
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

            // Usar la fecha de las capturas (priorizar original_report_date, consistente con loadQuickCaptureData)
            const captureDateRaw = captures[0]?.original_report_date || captures[0]?.date || this.getLocalDateStr();
            const captureDate = typeof captureDateRaw === 'string' ? captureDateRaw.split('T')[0] : (captureDateRaw || '').toString().split('T')[0] || this.getLocalDateStr();
            
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
                const merchCost = parseFloat(capture.merchandise_cost) || 0;
                if (merchCost > 0) {
                    totalCOGS += merchCost;
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
            // IMPORTANTE: Usar la fecha de las capturas. Si no hay branch_id en capturas, usar sucursal actual
            const captureBranchIds = [...new Set(captures.map(c => c.branch_id).filter(Boolean))];
            const currentBranchId = typeof BranchManager !== 'undefined' ? BranchManager.getCurrentBranchId() : null;
            const effectiveBranchIds = captureBranchIds.length > 0 ? captureBranchIds : (currentBranchId ? [currentBranchId] : []);
            const branchIdForArrivals = effectiveBranchIds.length === 1 ? effectiveBranchIds[0] : null;
            const totalArrivalCostsRaw = await this.calculateArrivalCosts(captureDate, branchIdForArrivals, effectiveBranchIds);
            const totalArrivalCosts = typeof totalArrivalCostsRaw === 'number' ? totalArrivalCostsRaw : parseFloat(totalArrivalCostsRaw) || 0;
            console.log(`✈️ Costos de llegadas para ${captureDate}: $${totalArrivalCosts.toFixed(2)} (sucursales: ${effectiveBranchIds.join(', ') || 'todas'})`);

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
                // effectiveBranchIds ya definido arriba (incluye currentBranchId si captureBranchIds vacío)
                console.log(`💰 Calculando costos operativos para ${captureDate}, sucursales: ${effectiveBranchIds.join(', ') || 'todas'}`);
                console.log(`   📊 Total costos en DB: ${allCosts.length}`);
                
                // CRÍTICO: Determinar si debemos incluir costos globales (sin branch_id)
                // Solo incluirlos si el usuario es master_admin y está viendo todas las sucursales
                const isMasterAdmin = typeof UserManager !== 'undefined' && (
                    UserManager.currentUser?.role === 'master_admin' ||
                    UserManager.currentUser?.is_master_admin ||
                    UserManager.currentUser?.isMasterAdmin ||
                    UserManager.currentEmployee?.role === 'master_admin'
                );
                const includeGlobalCosts = isMasterAdmin && effectiveBranchIds.length === 0;
                
                // Si hay branchIds específicos, procesar cada uno. Si no, usar sucursal actual o globales
                const branchIdsToProcess = effectiveBranchIds.length > 0 ? effectiveBranchIds : (includeGlobalCosts ? [null] : []);
                
                for (const branchId of branchIdsToProcess) {
                    // CRÍTICO: Filtro estricto por sucursal
                    // Si branchId es null (costos globales), solo incluir costos sin branch_id
                    // Si branchId tiene valor, SOLO incluir costos de esa sucursal (excluir globales)
                    let branchCosts = allCosts.filter(c => {
                        if (branchId === null) {
                            return !c.branch_id;
                        } else {
                            if (!c.branch_id) return false;
                            return String(c.branch_id) === String(branchId);
                        }
                    });
                    branchCosts = this.deduplicateCosts(branchCosts);

                    // A) COSTOS FIJOS PRORRATEADOS (Mensuales, Semanales, Anuales)
                    // Costos mensuales prorrateados
                    // IMPORTANTE: Para costos recurrentes mensuales, aplicar al mes objetivo completo
                    // independientemente de cuándo se creó el costo
                    // NOTA: Aceptamos costos con period_type='monthly' Y (recurring=true O type='fijo')
                    const monthlyCosts = this.deduplicateRecurringCosts(branchCosts.filter(c => {
                        const isMonthly = c.period_type === 'monthly';
                        // Aceptar si tiene recurring=true O si tiene type='fijo' (para compatibilidad)
                        const isRecurring = c.recurring === true || c.recurring === 'true' || c.type === 'fijo';
                        const isValidCategory = c.category !== 'pago_llegadas' && c.category !== 'comisiones_bancarias';
                        return isMonthly && isRecurring && isValidCategory;
                    }));
                    console.log(`   📅 Costos mensuales encontrados: ${monthlyCosts.length} (únicos tras deduplicar recurrentes)`);
                    for (const cost of monthlyCosts) {
                        // Usar 30 días fijos para prorrateo mensual (convención contable estándar)
                        const DAYS_PER_MONTH = 30;
                        const amount = parseFloat(cost.amount) || 0;
                        const dailyAmount = amount / DAYS_PER_MONTH;
                        fixedCostsProrated += dailyAmount;
                        console.log(`   💰 Costo mensual: ${cost.category || 'Sin categoría'} - $${amount} / ${DAYS_PER_MONTH} días = $${dailyAmount.toFixed(2)}/día`);
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
                    const weeklyCosts = this.deduplicateRecurringCosts(branchCosts.filter(c => {
                        const costDate = new Date(c.date || c.created_at);
                        // Para costos recurrentes semanales, aplicar si están en el mismo año
                        const isWeekly = c.period_type === 'weekly';
                        const isRecurring = c.recurring === true || c.recurring === 'true' || c.type === 'fijo';
                        const isValidCategory = c.category !== 'pago_llegadas' && c.category !== 'comisiones_bancarias';
                        const isSameYear = targetDate.getFullYear() === costDate.getFullYear();
                        return isWeekly && isRecurring && isValidCategory && isSameYear;
                    }));
                    console.log(`   📅 Costos semanales encontrados: ${weeklyCosts.length} (únicos tras deduplicar recurrentes)`);
                    for (const cost of weeklyCosts) {
                        const amount = parseFloat(cost.amount) || 0;
                        const dailyAmount = amount / 7;
                        fixedCostsProrated += dailyAmount;
                        console.log(`   💰 Costo semanal: ${cost.category || 'Sin categoría'} - $${amount} / 7 días = $${dailyAmount.toFixed(2)}/día`);
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
                    const annualCosts = this.deduplicateRecurringCosts(branchCosts.filter(c => {
                        const isAnnual = c.period_type === 'annual' || c.period_type === 'yearly';
                        const isRecurring = c.recurring === true || c.recurring === 'true' || c.type === 'fijo';
                        const isValidCategory = c.category !== 'pago_llegadas' && c.category !== 'comisiones_bancarias';
                        return isAnnual && isRecurring && isValidCategory;
                        // Removido el filtro de año porque los costos recurrentes anuales se aplican siempre
                        // que estén activos para ese año
                    }));
                    console.log(`   📅 Costos anuales encontrados: ${annualCosts.length} (únicos tras deduplicar recurrentes)`);
                    for (const cost of annualCosts) {
                        const daysInYear = ((targetDate.getFullYear() % 4 === 0 && targetDate.getFullYear() % 100 !== 0) || (targetDate.getFullYear() % 400 === 0)) ? 366 : 365;
                        const amount = parseFloat(cost.amount) || 0;
                        const dailyAmount = amount / daysInYear;
                        fixedCostsProrated += dailyAmount;
                        console.log(`   💰 Costo anual: ${cost.category || 'Sin categoría'} - $${amount} / ${daysInYear} días = $${dailyAmount.toFixed(2)}/día`);
                        fixedCostsDetail.push({
                            category: cost.category || 'Sin categoría',
                            description: cost.description || cost.notes || '',
                            amount: dailyAmount,
                            period: 'Anual prorrateado',
                            original: cost.amount || 0
                        });
                    }

                    // B) COSTOS VARIABLES DEL DÍA (registrados hoy)
                    const isRecurringFixedLocal = c => (c.recurring === true || c.recurring === 'true' || c.type === 'fijo');
                    const variableCosts = branchCosts.filter(c => {
                        const costDate = c.date || c.created_at;
                        const costDateStr = costDate.split('T')[0];
                        const cat = (c.category || '').toLowerCase();
                        return costDateStr === captureDate &&
                               cat !== 'pago_llegadas' &&
                               cat !== 'comisiones_bancarias' &&
                               cat !== 'comisiones' &&
                               cat !== 'costo_ventas' &&
                               cat !== 'cogs' &&
                               !isRecurringFixedLocal(c) &&
                               (c.period_type === 'one_time' || c.period_type === 'daily' || !c.period_type);
                    });
                    for (const cost of variableCosts) {
                        const amount = parseFloat(cost.amount) || 0;
                        variableCostsDaily += amount;
                        variableCostsDetail.push({
                            category: cost.category || 'Sin categoría',
                            description: cost.description || cost.notes || '',
                            amount: amount
                        });
                    }
                }
            } catch (e) {
                console.warn('No se pudieron obtener costos operativos:', e);
            }

            // Si no hay comisiones bancarias registradas en cost_entries, aplicar 4.5% fijo sobre ventas (temporal)
            const BANK_COMMISSION_FALLBACK_RATE = 4.5;
            if (bankCommissions <= 0 && totalSalesMXN > 0) {
                bankCommissions = totalSalesMXN * (BANK_COMMISSION_FALLBACK_RATE / 100);
                console.log(`   Comisiones Bancarias (${BANK_COMMISSION_FALLBACK_RATE}% fijo sobre ventas): $${bankCommissions.toFixed(2)}`);
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
            const captureDate = captures[0]?.date || this.getLocalDateStr();
            const exchangeRates = await DB.query('exchange_rates_daily', 'date', captureDate) || [];
            const todayRate = exchangeRates[0] || { usd_to_mxn: 20.0, cad_to_mxn: 15.0 };
            const usdRate = todayRate.usd_to_mxn || 20.0;
            const cadRate = todayRate.cad_to_mxn || 15.0;

            // Calcular comisiones por vendedor y guía
            const sellerCommissions = {};
            const guideCommissions = {};

            for (const capture of captures) {
                // Convertir el total de la captura a MXN antes de calcular comisiones
                const capTotal = parseFloat(capture.total) || 0;
                let captureTotalMXN = capTotal;
                if (capture.currency === 'USD') {
                    captureTotalMXN = capTotal * usdRate;
                } else if (capture.currency === 'CAD') {
                    captureTotalMXN = capTotal * cadRate;
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
                                            <td style="padding: var(--spacing-xs); text-align: right; font-weight: 600;">$${(parseFloat(s.total) || 0).toFixed(2)}</td>
                                            <td style="padding: var(--spacing-xs); text-align: right;">${s.commissions.USD ? '$' + (parseFloat(s.commissions.USD) || 0).toFixed(2) : '-'}</td>
                                            <td style="padding: var(--spacing-xs); text-align: right;">${s.commissions.MXN ? '$' + (parseFloat(s.commissions.MXN) || 0).toFixed(2) : '-'}</td>
                                            <td style="padding: var(--spacing-xs); text-align: right;">${s.commissions.CAD ? '$' + (parseFloat(s.commissions.CAD) || 0).toFixed(2) : '-'}</td>
                                        </tr>
                                    `).join('')}
                                    <tr style="background: var(--color-bg-secondary); font-weight: 600;">
                                        <td style="padding: var(--spacing-xs);">TOTAL</td>
                                        <td style="padding: var(--spacing-xs); text-align: center;">${sellerEntries.reduce((sum, s) => sum + s.sales, 0)}</td>
                                        <td style="padding: var(--spacing-xs); text-align: right;">$${sellerEntries.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0).toFixed(2)}</td>
                                        <td style="padding: var(--spacing-xs); text-align: right;">$${sellerEntries.reduce((sum, s) => sum + (parseFloat(s.commissions.USD) || 0), 0).toFixed(2)}</td>
                                        <td style="padding: var(--spacing-xs); text-align: right;">$${sellerEntries.reduce((sum, s) => sum + (parseFloat(s.commissions.MXN) || 0), 0).toFixed(2)}</td>
                                        <td style="padding: var(--spacing-xs); text-align: right;">$${sellerEntries.reduce((sum, s) => sum + (parseFloat(s.commissions.CAD) || 0), 0).toFixed(2)}</td>
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
                                            <td style="padding: var(--spacing-xs); text-align: right; font-weight: 600;">$${(parseFloat(g.total) || 0).toFixed(2)}</td>
                                            <td style="padding: var(--spacing-xs); text-align: right;">${g.commissions.USD ? '$' + (parseFloat(g.commissions.USD) || 0).toFixed(2) : '-'}</td>
                                            <td style="padding: var(--spacing-xs); text-align: right;">${g.commissions.MXN ? '$' + (parseFloat(g.commissions.MXN) || 0).toFixed(2) : '-'}</td>
                                            <td style="padding: var(--spacing-xs); text-align: right;">${g.commissions.CAD ? '$' + (parseFloat(g.commissions.CAD) || 0).toFixed(2) : '-'}</td>
                                        </tr>
                                    `).join('')}
                                    <tr style="background: var(--color-bg-secondary); font-weight: 600;">
                                        <td style="padding: var(--spacing-xs);">TOTAL</td>
                                        <td style="padding: var(--spacing-xs); text-align: center;">${guideEntries.reduce((sum, g) => sum + g.sales, 0)}</td>
                                        <td style="padding: var(--spacing-xs); text-align: right;">$${guideEntries.reduce((sum, g) => sum + (parseFloat(g.total) || 0), 0).toFixed(2)}</td>
                                        <td style="padding: var(--spacing-xs); text-align: right;">$${guideEntries.reduce((sum, g) => sum + (parseFloat(g.commissions.USD) || 0), 0).toFixed(2)}</td>
                                        <td style="padding: var(--spacing-xs); text-align: right;">$${guideEntries.reduce((sum, g) => sum + (parseFloat(g.commissions.MXN) || 0), 0).toFixed(2)}</td>
                                        <td style="padding: var(--spacing-xs); text-align: right;">$${guideEntries.reduce((sum, g) => sum + (parseFloat(g.commissions.CAD) || 0), 0).toFixed(2)}</td>
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
                            // Validar UUID helper
                            const isValidUUID = (value) => {
                                if (!value || typeof value !== 'string') return false;
                                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                                return uuidRegex.test(value);
                            };
                            
                            // Si tiene server_id, actualizar en servidor
                            if (capture.server_id && API.updateQuickCapture) {
                                console.log('📤 Sincronizando edición con servidor...');
                                
                                const guideIdToSend = capture.guide_id && isValidUUID(capture.guide_id) ? capture.guide_id : null;
                                if (capture.guide_id && !isValidUUID(capture.guide_id)) {
                                    console.warn(`⚠️ guide_id inválido ignorado en actualización: "${capture.guide_id}"`);
                                }
                                
                                await API.updateQuickCapture(capture.server_id, {
                                    branch_id: capture.branch_id,
                                    seller_id: capture.seller_id,
                                    guide_id: guideIdToSend,
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
            const selectedDate = dateInput?.value || this.getLocalDateStr();
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
                const totalNum = parseFloat(c.total) || 0;
                totals[c.currency] = (totals[c.currency] || 0) + totalNum;
            });

            // Crear CSV
            let csv = 'Fecha,Hora,Sucursal,Vendedor,Guía,Agencia,Producto,Cantidad,Moneda,Total\n';
            captures.forEach(c => {
                const time = new Date(c.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                csv += `${c.date},${time},"${c.branch_name || ''}","${c.seller_name || ''}","${c.guide_name || ''}","${c.agency_name || ''}","${c.product}",${c.quantity},${c.currency},${(parseFloat(c.total) || 0).toFixed(2)}\n`;
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
            link.setAttribute('download', `Captura_Rapida_${normalizedSelectedDate.replace(/-/g,'')}_${Date.now()}.csv`);
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
            const selectedDate = dateInput?.value || this.getLocalDateStr();
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
            // IMPORTANTE: Usar el MISMO método de obtención de tipos de cambio que se usa en pantalla
            // para garantizar consistencia entre visualización y archivo
            const exchangeRatesInfo = await this.getExchangeRatesForDate(selectedDate);
            const usdRate = exchangeRatesInfo?.usd || 18.0;
            const cadRate = exchangeRatesInfo?.cad || 13.0;
            console.log(`💱 Tipos de cambio para archivado (${normalizedSelectedDate}): USD=${usdRate}, CAD=${cadRate}`);

            const currencySummary = this.calculateCaptureCurrencyTotals(captures, usdRate, cadRate);
            const totals = currencySummary.totals;
            const totalQuantity = currencySummary.totalQuantity;
            let totalCOGS = 0;

            captures.forEach(c => {
                totalCOGS += (parseFloat(c.merchandise_cost) || 0);
            });

            const totalSalesMXN = currencySummary.totalSalesMXN;

            // Calcular comisiones
            const commissionRules = await DB.getAll('commission_rules') || [];
            let totalCommissions = 0;
            for (const capture of captures) {
                const capTotal = parseFloat(capture.total) || 0;
                if (capture.seller_id && capTotal > 0) {
                    const sellerRule = commissionRules.find(r => 
                        r.entity_type === 'seller' && r.entity_id === capture.seller_id
                    ) || commissionRules.find(r => r.entity_type === 'seller' && r.entity_id === null);
                    if (sellerRule) {
                        const discountPct = sellerRule.discount_pct || 0;
                        const multiplier = sellerRule.multiplier || 1;
                        const afterDiscount = capTotal * (1 - (discountPct / 100));
                        totalCommissions += afterDiscount * (multiplier / 100);
                    }
                }
                if (capture.guide_id && capTotal > 0) {
                    const guideRule = commissionRules.find(r => 
                        r.entity_type === 'guide' && r.entity_id === capture.guide_id
                    ) || commissionRules.find(r => r.entity_type === 'guide' && r.entity_id === null);
                    if (guideRule) {
                        const discountPct = guideRule.discount_pct || 0;
                        const multiplier = guideRule.multiplier || 1;
                        const afterDiscount = capTotal * (1 - (discountPct / 100));
                        totalCommissions += afterDiscount * (multiplier / 100);
                    }
                }
            }

            // Obtener costos de llegadas desde cost_entries (fuente autorizada)
            const captureBranchIds = [...new Set(captures.map(c => c.branch_id).filter(Boolean))];
            const branchIdForArrivals = captureBranchIds.length === 1 ? captureBranchIds[0] : null;
            const totalArrivalCosts = await this.calculateArrivalCosts(normalizedSelectedDate, branchIdForArrivals, captureBranchIds);
            
            // Obtener llegadas para mostrar en el reporte (solo para referencia)
            const arrivals = await DB.getAll('agency_arrivals') || [];
            const todayArrivals = arrivals.filter(a => {
                const aDate = (a.date || '').split('T')[0];
                return aDate === normalizedSelectedDate;
            });
            const filteredArrivals = todayArrivals.filter(a => 
                captureBranchIds.length === 0 || !a.branch_id || captureBranchIds.includes(a.branch_id)
            );

            // Calcular costos operativos (usar la misma lógica que loadQuickCaptureProfits)
            let totalOperatingCosts = 0;
            let bankCommissions = 0;
            try {
                const allCosts = await DB.getAll('cost_entries') || [];
                const targetDate = new Date(normalizedSelectedDate + 'T12:00:00');
                const branchIdsToProcess = captureBranchIds.length > 0 ? captureBranchIds : [null];
                
                for (const branchId of branchIdsToProcess) {
                    let branchCosts = allCosts.filter(c => 
                        branchId === null ? (!c.branch_id || captureBranchIds.includes(c.branch_id)) : 
                        (c.branch_id && String(c.branch_id) === String(branchId))
                    );
                    branchCosts = this.deduplicateCosts(branchCosts);

                    // Mensuales
                    const monthlyCosts = this.deduplicateRecurringCosts(branchCosts.filter(c => {
                        const costDate = new Date(c.date || c.created_at);
                        return c.period_type === 'monthly' && c.recurring === true &&
                               costDate.getMonth() === targetDate.getMonth() &&
                               costDate.getFullYear() === targetDate.getFullYear();
                    }));
                    for (const cost of monthlyCosts) {
                        // Usar 30 días fijos para prorrateo mensual (convención contable estándar)
                        const DAYS_PER_MONTH = 30;
                        totalOperatingCosts += (parseFloat(cost.amount) || 0) / DAYS_PER_MONTH;
                    }

                    // Semanales
                    const weeklyCosts = this.deduplicateRecurringCosts(branchCosts.filter(c => {
                        const costDate = new Date(c.date || c.created_at);
                        const targetWeek = this.getWeekNumber(targetDate);
                        const costWeek = this.getWeekNumber(costDate);
                        return c.period_type === 'weekly' && c.recurring === true &&
                               targetWeek === costWeek &&
                               targetDate.getFullYear() === costDate.getFullYear();
                    }));
                    for (const cost of weeklyCosts) {
                        totalOperatingCosts += (parseFloat(cost.amount) || 0) / 7;
                    }

                    // Anuales
                    const annualCosts = this.deduplicateRecurringCosts(branchCosts.filter(c => {
                        const costDate = new Date(c.date || c.created_at);
                        return c.period_type === 'annual' && c.recurring === true &&
                               costDate.getFullYear() === targetDate.getFullYear();
                    }));
                    for (const cost of annualCosts) {
                        const daysInYear = ((targetDate.getFullYear() % 4 === 0 && targetDate.getFullYear() % 100 !== 0) || (targetDate.getFullYear() % 400 === 0)) ? 366 : 365;
                        totalOperatingCosts += (parseFloat(cost.amount) || 0) / daysInYear;
                    }

                    // Variables/diarios
                    const variableCosts = branchCosts.filter(c => {
                        const costDate = c.date || c.created_at;
                        const costDateStr = costDate.split('T')[0];
                        return costDateStr === normalizedSelectedDate &&
                               (c.period_type === 'one_time' || c.period_type === 'daily' || !c.period_type);
                    });
                    for (const cost of variableCosts) {
                        const amt = parseFloat(cost.amount) || 0;
                        if (cost.category === 'comisiones_bancarias') {
                            bankCommissions += amt;
                        } else {
                            totalOperatingCosts += amt;
                        }
                    }
                }
            } catch (e) {
                console.warn('Error calculando costos operativos:', e);
            }

            // Si no hay comisiones bancarias registradas, aplicar 4.5% fijo sobre ventas (temporal)
            if (bankCommissions <= 0 && totalSalesMXN > 0) {
                bankCommissions = totalSalesMXN * 0.045;
            }

            const grossProfit = totalSalesMXN - totalCOGS - totalCommissions;
            const netProfit = grossProfit - totalArrivalCosts - totalOperatingCosts - bankCommissions;

            // Crear objeto de reporte archivado
            const archivedReport = {
                id: 'archived_' + normalizedSelectedDate + '_' + Date.now(),
                date: normalizedSelectedDate,
                report_type: 'quick_capture',
                captures: captures,
                totals: totals,
                total_quantity: totalQuantity,
                total_sales_mxn: parseFloat(totalSalesMXN) || 0,
                total_cogs: parseFloat(totalCOGS) || 0,
                total_commissions: parseFloat(totalCommissions) || 0,
                total_arrival_costs: parseFloat(totalArrivalCosts) || 0,
                total_operating_costs: parseFloat(totalOperatingCosts) || 0,
                bank_commissions: parseFloat(bankCommissions) || 0,
                gross_profit: parseFloat(grossProfit) || 0,
                net_profit: parseFloat(netProfit) || 0,
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
            const selectedDate = dateInput?.value || this.getLocalDateStr();
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
        let selectedDate = dateInput?.value || this.getLocalDateStr();
        
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

            // ========== HELPER: DIBUJAR TÍTULO DE SECCIÓN ==========
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
            doc.text('Reporte de Captura Rápida', margin, 28);

            const dateStr = typeof Utils !== 'undefined' && Utils.formatDate 
                ? Utils.formatDate(new Date(), 'DD/MM/YYYY HH:mm')
                : new Date().toLocaleString('es-MX');
            doc.setFontSize(9);
            doc.setTextColor(200, 215, 230);
            doc.text(dateStr, pageWidth - margin, 16, { align: 'right' });

            const reportDate = new Date(selectedDate + 'T00:00:00');
            const formattedDate = reportDate.toLocaleDateString('es-MX', { 
                year: 'numeric', month: '2-digit', day: '2-digit' 
            });
            const pillLabel = `Fecha del Reporte: ${formattedDate}`;
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            const pillW = doc.getStringUnitWidth(pillLabel) * 9 / doc.internal.scaleFactor + 8;
            doc.setFillColor(212, 160, 23);
            doc.rect(pageWidth - margin - pillW, 21, pillW, 9, 'F');
            doc.setTextColor(255, 255, 255);
            doc.text(pillLabel, pageWidth - margin - pillW + 4, 27);

            doc.setTextColor(0, 0, 0);
            y = 52;

            // ========== RESUMEN ==========
            // Obtener tipo de cambio del día para mostrar en el reporte
            const exchangeRatesForDisplay = await this.getExchangeRatesForDate(selectedDate);
            const usdRateForDisplay = exchangeRatesForDisplay?.usd || 18.0;
            const cadRateForDisplay = exchangeRatesForDisplay?.cad || 13.0;

            const computedSummary = this.calculateCaptureCurrencyTotals(captures, usdRateForDisplay, cadRateForDisplay);
            const totals = computedSummary.totals;
            const totalQuantity = computedSummary.totalQuantity;

            // Obtener información de sucursal(es)
            const captureBranchIdsForSummary = [...new Set(captures.map(c => c.branch_id).filter(Boolean))];
            const branchNames = captureBranchIdsForSummary.map(bid => {
                const branch = branches.find(b => b.id === bid);
                return branch ? branch.name : 'N/A';
            }).join(', ');

            // ========== RESUMEN DEL DÍA (dos columnas) ==========
            y = drawSectionTitle('RESUMEN DEL DÍA', y);

            const summaryTotalUSDOriginal = totals.USD || 0;
            const summaryTotalUSDInMXN = summaryTotalUSDOriginal * usdRateForDisplay;
            const summaryTotalCADOriginal = totals.CAD || 0;
            const summaryTotalCADInMXN = summaryTotalCADOriginal * cadRateForDisplay;
            const totalGeneralMXN = computedSummary.totalSalesMXN;

            const summaryBoxH = 42;
            const summaryMidX = pageWidth / 2;
            // Fondo caja izquierda
            doc.setFillColor(248, 250, 253);
            doc.rect(margin, y, summaryMidX - margin - 4, summaryBoxH, 'F');
            doc.setDrawColor(210, 215, 220);
            doc.rect(margin, y, summaryMidX - margin - 4, summaryBoxH);
            // Fondo caja derecha
            doc.setFillColor(240, 255, 245);
            doc.rect(summaryMidX + 4, y, pageWidth - summaryMidX - margin - 4, summaryBoxH, 'F');
            doc.setDrawColor(150, 210, 170);
            doc.rect(summaryMidX + 4, y, pageWidth - summaryMidX - margin - 4, summaryBoxH);

            // --- Columna izquierda: datos del reporte ---
            const sL = margin + 5;
            const vL = summaryMidX - margin - 8;
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 110);
            doc.setFont('helvetica', 'normal');
            doc.text('Sucursal(es):', sL, y + 8);
            doc.text('Fecha:', sL, y + 16);
            doc.text('Total Capturas:', sL, y + 24);
            doc.text('Total Cantidad:', sL, y + 32);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 30, 40);
            doc.setFontSize(9);
            doc.text(branchNames || 'Todas', vL, y + 8, { align: 'right' });
            doc.text(formattedDate, vL, y + 16, { align: 'right' });
            doc.text(String(captures.length), vL, y + 24, { align: 'right' });
            doc.text(String(totalQuantity), vL, y + 32, { align: 'right' });

            // --- Columna derecha: monedas + total ---
            const sR = summaryMidX + 9;
            const vR = pageWidth - margin - 6;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 110);
            doc.text(`USD: $${summaryTotalUSDOriginal.toFixed(2)} = $${summaryTotalUSDInMXN.toFixed(2)} MXN`, sR, y + 8);
            doc.text(`CAD: $${summaryTotalCADOriginal.toFixed(2)} = $${summaryTotalCADInMXN.toFixed(2)} MXN`, sR, y + 16);
            doc.text(`MXN: $${totals.MXN.toFixed(2)}`, sR, y + 24);
            doc.setFontSize(7);
            doc.text(`Tipo de Cambio — USD: $${usdRateForDisplay.toFixed(2)} MXN  |  CAD: $${cadRateForDisplay.toFixed(2)} MXN`, sR, y + 32);
            // Total general destacado
            doc.setFillColor(39, 174, 96);
            doc.rect(summaryMidX + 4, y + 34, pageWidth - summaryMidX - margin - 4, 8, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(255, 255, 255);
            doc.text(`TOTAL GENERAL: $${totalGeneralMXN.toFixed(2)} MXN`, sR, y + 40);
            doc.setTextColor(0, 0, 0);

            y += summaryBoxH + 6;

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

                y = drawSectionTitle('LLEGADAS DEL DÍA', y);

                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                Object.values(arrivalsByAgency).forEach(group => {
                    if (y + 10 > pageHeight - 30) {
                        doc.addPage();
                        y = margin;
                    }
                    // Fila de agencia con fondo suave
                    doc.setFillColor(240, 244, 250);
                    doc.rect(margin, y - 3, pageWidth - margin * 2, 8, 'F');
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(44, 62, 80);
                    doc.setFontSize(9);
                    doc.text(`${group.agency?.name || 'Agencia Desconocida'}: ${group.totalPassengers} pasajeros`, margin + 5, y + 2);
                    doc.setTextColor(0, 0, 0);
                    y += 9;
                    
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8);
                    group.arrivals.forEach(arrival => {
                        if (y + 6 > pageHeight - 30) {
                            doc.addPage();
                            y = margin;
                        }
                        const branch = branches.find(b => b.id === arrival.branch_id);
                        doc.setTextColor(80, 80, 90);
                        doc.text(`• ${branch?.name || 'N/A'}: ${arrival.passengers || 0} pasajeros`, margin + 10, y);
                        doc.setTextColor(0, 0, 0);
                        y += 5.5;
                    });
                    y += 3;
                });
                y += 4;
            }

            // ========== TABLA DE CAPTURAS ==========
            if (y + 30 > pageHeight - 30) {
                doc.addPage();
                y = margin;
            }

            doc.setFontSize(12);
            y = drawSectionTitle('CAPTURAS REALIZADAS', y);

            // Columnas de captura (espacio útil ~273mm con margin=12)
            const captCol1X = margin + 2;    // Hora ~14mm
            const captCol2X = margin + 18;   // Sucursal ~20mm
            const captCol3X = margin + 42;   // Vendedor ~22mm
            const captCol4X = margin + 66;   // Guía ~20mm
            const captCol5X = margin + 90;   // Producto ~38mm (más espacio)
            const captCol6X = margin + 130;  // Notas ~14mm (reducido)
            const captCol7X = margin + 146;  // Cantidad ~10mm
            const captCol8X = margin + 158;  // Moneda Original ~32mm
            const captCol9X = margin + 192;  // Total MXN ~32mm
            const captCol10X = margin + 226; // Total Original
            const captCol10EndX = pageWidth - margin - 2;
            const captCol8Width = captCol9X - captCol8X - 2;
            const captCol9Width = captCol10X - captCol9X - 2;
            const captCol10Width = captCol10EndX - captCol10X - 2;

            // Helper interno para dibujar encabezado de tabla de capturas
            const drawCaptureTableHeader = (yh) => {
                doc.setFillColor(44, 62, 80);
                doc.rect(margin, yh, pageWidth - margin * 2, 8, 'F');
                doc.setDrawColor(60, 80, 100);
                [captCol2X, captCol3X, captCol4X, captCol5X, captCol6X, captCol7X, captCol8X, captCol9X, captCol10X].forEach(x => {
                    doc.line(x - 1, yh, x - 1, yh + 8);
                });
                doc.setFontSize(7);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(255, 255, 255);
                doc.text('Hora', captCol1X, yh + 5.5);
                doc.text('Sucursal', captCol2X, yh + 5.5);
                doc.text('Vendedor', captCol3X, yh + 5.5);
                doc.text('Guía', captCol4X, yh + 5.5);
                doc.text('Producto', captCol5X, yh + 5.5);
                doc.text('Notas', captCol6X, yh + 5.5);
                doc.text('Cant.', captCol7X, yh + 5.5, { align: 'right' });
                doc.text('Moneda Original', captCol8X + captCol8Width / 2, yh + 5.5, { align: 'center', maxWidth: captCol8Width });
                doc.text('Total MXN', captCol9X + captCol9Width, yh + 5.5, { align: 'right', maxWidth: captCol9Width });
                doc.text('Total Original', captCol10X + captCol10Width, yh + 5.5, { align: 'right', maxWidth: captCol10Width });
                doc.setTextColor(0, 0, 0);
                return yh + 8;
            };
            y = drawCaptureTableHeader(y);

            // Filas de capturas con zebra striping
            doc.setFontSize(7);
            let capturesTotalMXN = 0;
            captures.forEach((c, index) => {
                if (y + 7 > pageHeight - 30) {
                    doc.addPage();
                    y = margin;
                    y = drawCaptureTableHeader(y);
                }

                const time = new Date(c.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                let originalAmount = 0;
                let totalMXN = parseFloat(c.total) || 0;
                const currency = c.currency || 'MXN';
                const capturePayments = this.normalizeCapturePayments(c);
                if (capturePayments.length > 0) {
                    let totalOriginal = 0;
                    let totalMXNFromPayments = 0;
                    capturePayments.forEach(payment => {
                        const amount = parseFloat(payment.amount) || 0;
                        const payCurrency = payment.currency || currency;
                        totalOriginal += amount;
                        if (payCurrency === 'USD') totalMXNFromPayments += amount * usdRateForDisplay;
                        else if (payCurrency === 'CAD') totalMXNFromPayments += amount * cadRateForDisplay;
                        else totalMXNFromPayments += amount;
                    });
                    originalAmount = totalOriginal;
                    totalMXN = totalMXNFromPayments;
                } else {
                    if (currency === 'USD') originalAmount = totalMXN / usdRateForDisplay;
                    else if (currency === 'CAD') originalAmount = totalMXN / cadRateForDisplay;
                    else originalAmount = totalMXN;
                }
                capturesTotalMXN += totalMXN;

                // Zebra striping
                if (index % 2 === 0) {
                    doc.setFillColor(249, 250, 251);
                    doc.rect(margin, y, pageWidth - margin * 2, 7, 'F');
                }
                doc.setDrawColor(220, 225, 230);
                doc.rect(margin, y, pageWidth - margin * 2, 7);
                doc.setDrawColor(210, 215, 220);
                [captCol2X, captCol3X, captCol4X, captCol5X, captCol6X, captCol7X, captCol8X, captCol9X, captCol10X].forEach(x => {
                    doc.line(x - 1, y, x - 1, y + 7);
                });

                doc.setFont('helvetica', 'normal');
                doc.setTextColor(60, 60, 70);
                doc.text(time, captCol1X, y + 5);
                doc.text((c.branch_name || 'N/A').substring(0, 13), captCol2X, y + 5);
                doc.text((c.seller_name || 'N/A').substring(0, 15), captCol3X, y + 5);
                doc.text((c.guide_name || '-').substring(0, 13), captCol4X, y + 5);
                doc.text((c.product || '').substring(0, 24), captCol5X, y + 5);
                doc.text((c.notes || '-').substring(0, 10), captCol6X, y + 5);
                doc.text(String(c.quantity || 1), captCol7X, y + 5, { align: 'right' });

                const currencyDisplay = `${currency !== 'MXN' ? currency : 'MXN'} $${originalAmount.toFixed(2)}`;
                doc.setTextColor(80, 80, 90);
                doc.text(currencyDisplay, captCol8X + captCol8Width / 2, y + 5, { align: 'center', maxWidth: captCol8Width });

                doc.setFont('helvetica', 'bold');
                doc.setTextColor(30, 90, 30);
                doc.text(`$${totalMXN.toFixed(2)}`, captCol9X + captCol9Width, y + 5, { align: 'right', maxWidth: captCol9Width });

                doc.setFont('helvetica', 'normal');
                doc.setTextColor(60, 60, 70);
                const origText = currency !== 'MXN' ? `$${originalAmount.toFixed(2)} ${currency}` : `$${originalAmount.toFixed(2)}`;
                doc.text(origText, captCol10X + captCol10Width, y + 5, { align: 'right', maxWidth: captCol10Width });
                doc.setTextColor(0, 0, 0);

                y += 7;
            });

            // Fila de total de capturas
            doc.setFillColor(238, 242, 255);
            doc.rect(margin, y, pageWidth - margin * 2, 8, 'F');
            doc.setDrawColor(180, 190, 220);
            doc.rect(margin, y, pageWidth - margin * 2, 8);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(44, 62, 80);
            doc.text('TOTAL', captCol1X, y + 5.5);
            doc.text(`$${capturesTotalMXN.toFixed(2)}`, captCol9X + captCol9Width, y + 5.5, { align: 'right', maxWidth: captCol9Width });
            doc.setTextColor(0, 0, 0);
            y += 10;

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
                if (y + 30 > pageHeight - 30) { doc.addPage(); y = margin; }

                y = drawSectionTitle('COMISIONES CALCULADAS', y);

                // Columnas de comisiones (reutilizadas para vendedores y guías)
                const cC1 = margin + 2;        // Nombre
                const cC2 = margin + 80;       // Total MXN
                const cC3 = margin + 120;      // USD
                const cC4 = margin + 155;      // MXN
                const cC5 = margin + 190;      // CAD
                const cC5End = pageWidth - margin - 2;
                const cC2W = cC3 - cC2 - 2;
                const cC3W = cC4 - cC3 - 2;
                const cC4W = cC5 - cC4 - 2;
                const cC5W = cC5End - cC5 - 2;

                const drawCommTableHeader = (label, yh) => {
                    // Sub-título de grupo
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(44, 62, 80);
                    doc.text(label, cC1, yh + 4);
                    doc.setTextColor(0, 0, 0);
                    yh += 7;
                    // Header oscuro
                    doc.setFillColor(44, 62, 80);
                    doc.rect(margin, yh, pageWidth - margin * 2, 7, 'F');
                    doc.setDrawColor(60, 80, 100);
                    [cC2, cC3, cC4, cC5].forEach(x => doc.line(x - 1, yh, x - 1, yh + 7));
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(255, 255, 255);
                    doc.text(label.startsWith('Vendedor') ? 'Vendedor' : 'Guía', cC1, yh + 5);
                    doc.text('Total MXN', cC2 + cC2W, yh + 5, { align: 'right', maxWidth: cC2W });
                    doc.text('USD', cC3 + cC3W, yh + 5, { align: 'right', maxWidth: cC3W });
                    doc.text('MXN', cC4 + cC4W, yh + 5, { align: 'right', maxWidth: cC4W });
                    doc.text('CAD', cC5 + cC5W, yh + 5, { align: 'right', maxWidth: cC5W });
                    doc.setTextColor(0, 0, 0);
                    return yh + 7;
                };

                const drawCommRow = (name, total, comms, idx, yh) => {
                    if (idx % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(margin, yh, pageWidth - margin * 2, 7, 'F'); }
                    doc.setDrawColor(220, 225, 230);
                    doc.rect(margin, yh, pageWidth - margin * 2, 7);
                    doc.setDrawColor(210, 215, 220);
                    [cC2, cC3, cC4, cC5].forEach(x => doc.line(x - 1, yh, x - 1, yh + 7));
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8);
                    doc.setTextColor(60, 60, 70);
                    doc.text(name.substring(0, 30), cC1, yh + 5, { maxWidth: cC2 - cC1 - 5 });
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(30, 90, 30);
                    doc.text(`$${(parseFloat(total) || 0).toFixed(2)}`, cC2 + cC2W, yh + 5, { align: 'right', maxWidth: cC2W });
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(80, 80, 90);
                    doc.text(comms?.USD ? `$${(parseFloat(comms.USD) || 0).toFixed(2)}` : '-', cC3 + cC3W, yh + 5, { align: 'right', maxWidth: cC3W });
                    doc.text(comms?.MXN ? `$${(parseFloat(comms.MXN) || 0).toFixed(2)}` : '-', cC4 + cC4W, yh + 5, { align: 'right', maxWidth: cC4W });
                    doc.text(comms?.CAD ? `$${(parseFloat(comms.CAD) || 0).toFixed(2)}` : '-', cC5 + cC5W, yh + 5, { align: 'right', maxWidth: cC5W });
                    doc.setTextColor(0, 0, 0);
                    return yh + 7;
                };

                const drawCommTotal = (label, total, yh) => {
                    doc.setFillColor(232, 245, 233);
                    doc.rect(margin, yh, pageWidth - margin * 2, 7, 'F');
                    doc.setDrawColor(150, 200, 160);
                    doc.rect(margin, yh, pageWidth - margin * 2, 7);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(8);
                    doc.setTextColor(27, 100, 50);
                    doc.text(label, cC1, yh + 5);
                    doc.text(`$${(parseFloat(total) || 0).toFixed(2)}`, cC2 + cC2W, yh + 5, { align: 'right', maxWidth: cC2W });
                    doc.setTextColor(0, 0, 0);
                    return yh + 9;
                };

                // Tabla Vendedores
                if (sellerEntries.length > 0) {
                    if (y + 20 > pageHeight - 30) { doc.addPage(); y = margin; }
                    y = drawCommTableHeader('Vendedores:', y);
                    sellerEntries.forEach((s, i) => {
                        if (y + 7 > pageHeight - 30) { doc.addPage(); y = margin; y = drawCommTableHeader('Vendedores (cont.):', y); }
                        y = drawCommRow(s.seller?.name || 'N/A', s.total, s.commissions, i, y);
                    });
                    if (y + 7 > pageHeight - 30) { doc.addPage(); y = margin; }
                    const totalSellerComm = sellerEntries.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
                    y = drawCommTotal('TOTAL VENDEDORES', totalSellerComm, y);
                }

                // Tabla Guías
                if (guideEntries.length > 0) {
                    if (y + 20 > pageHeight - 30) { doc.addPage(); y = margin; }
                    y = drawCommTableHeader('Guías:', y);
                    guideEntries.forEach((g, i) => {
                        if (y + 7 > pageHeight - 30) { doc.addPage(); y = margin; y = drawCommTableHeader('Guías (cont.):', y); }
                        y = drawCommRow(g.guide?.name || 'N/A', g.total, g.commissions, i, y);
                    });
                    if (y + 7 > pageHeight - 30) { doc.addPage(); y = margin; }
                    const totalGuideComm = guideEntries.reduce((sum, g) => sum + (parseFloat(g.total) || 0), 0);
                    y = drawCommTotal('TOTAL GUÍAS', totalGuideComm, y);
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
                    let branchCosts = allCosts.filter(c => 
                        branchId === null ? (!c.branch_id || captureBranchIdsForOperating.includes(c.branch_id)) : 
                        (c.branch_id && String(c.branch_id) === String(branchId))
                    );
                    branchCosts = this.deduplicateCosts(branchCosts);

                    // A) COSTOS FIJOS PRORRATEADOS (Mensuales, Semanales, Anuales)
                    // IMPORTANTE: Usar la misma lógica que loadQuickCaptureProfits
                    // Costos mensuales prorrateados
                    const monthlyCosts = this.deduplicateRecurringCosts(branchCosts.filter(c => {
                        const isMonthly = c.period_type === 'monthly';
                        const isRecurring = c.recurring === true || c.recurring === 'true' || c.type === 'fijo';
                        const isValidCategory = c.category !== 'pago_llegadas' && c.category !== 'comisiones_bancarias';
                        return isMonthly && isRecurring && isValidCategory;
                    }));
                    for (const cost of monthlyCosts) {
                        // Usar 30 días fijos para prorrateo mensual (convención contable estándar)
                        const DAYS_PER_MONTH = 30;
                        const dailyAmount = (parseFloat(cost.amount) || 0) / DAYS_PER_MONTH;
                        fixedCostsProrated += dailyAmount;
                    }

                    // Costos semanales prorrateados
                    const weeklyCosts = this.deduplicateRecurringCosts(branchCosts.filter(c => {
                        const costDate = new Date(c.date || c.created_at);
                        const isWeekly = c.period_type === 'weekly';
                        const isRecurring = c.recurring === true || c.recurring === 'true' || c.type === 'fijo';
                        const isValidCategory = c.category !== 'pago_llegadas' && c.category !== 'comisiones_bancarias';
                        const isSameYear = targetDate.getFullYear() === costDate.getFullYear();
                        return isWeekly && isRecurring && isValidCategory && isSameYear;
                    }));
                    for (const cost of weeklyCosts) {
                        const dailyAmount = (parseFloat(cost.amount) || 0) / 7;
                        fixedCostsProrated += dailyAmount;
                    }

                    // Costos anuales prorrateados
                    const annualCosts = this.deduplicateRecurringCosts(branchCosts.filter(c => {
                        const isAnnual = c.period_type === 'annual' || c.period_type === 'yearly';
                        const isRecurring = c.recurring === true || c.recurring === 'true' || c.type === 'fijo';
                        const isValidCategory = c.category !== 'pago_llegadas' && c.category !== 'comisiones_bancarias';
                        return isAnnual && isRecurring && isValidCategory;
                    }));
                    for (const cost of annualCosts) {
                        const daysInYear = ((targetDate.getFullYear() % 4 === 0 && targetDate.getFullYear() % 100 !== 0) || (targetDate.getFullYear() % 400 === 0)) ? 366 : 365;
                        const dailyAmount = (parseFloat(cost.amount) || 0) / daysInYear;
                        fixedCostsProrated += dailyAmount;
                    }

                    // B) COSTOS VARIABLES DEL DÍA (registrados en la fecha seleccionada)
                    const isRecurringFixedPdf = c => (c.recurring === true || c.recurring === 'true' || c.type === 'fijo');
                    const variableCosts = branchCosts.filter(c => {
                        const costDate = c.date || c.created_at;
                        const costDateStr = costDate.split('T')[0];
                        const normalizedSelectedDate = selectedDate.split('T')[0];
                        const cat = (c.category || '').toLowerCase();
                        return costDateStr === normalizedSelectedDate &&
                               cat !== 'pago_llegadas' &&
                               cat !== 'comisiones_bancarias' &&
                               cat !== 'comisiones' &&
                               cat !== 'costo_ventas' &&
                               cat !== 'cogs' &&
                               !isRecurringFixedPdf(c) &&
                               (c.period_type === 'one_time' || c.period_type === 'daily' || !c.period_type);
                    });
                    for (const cost of variableCosts) {
                        variableCostsDaily += (parseFloat(cost.amount) || 0);
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
                        bankCommissions += (parseFloat(cost.amount) || 0);
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
                        
                        // Buscar configuración de comisión bancaria; si no existe, usar 4.5% fijo (temporal)
                        const bankCommissionSetting = await DB.get('settings', 'bank_commission_default_rate');
                        const bankCommissionRate = bankCommissionSetting?.value ? parseFloat(bankCommissionSetting.value) : 4.5;
                        if (bankCommissionRate > 0) {
                            bankCommissions += (captureTotalMXN * bankCommissionRate) / 100;
                        }
                    }
                }
                // Si aún no hay comisiones bancarias (sin payment_method o sin capturas con tarjeta), aplicar 4.5% fijo sobre total ventas
                const BANK_COMMISSION_FALLBACK_RATE = 4.5;
                if (bankCommissions <= 0 && totalSalesMXN > 0) {
                    bankCommissions = totalSalesMXN * (BANK_COMMISSION_FALLBACK_RATE / 100);
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

            // ========== UTILIDADES DEL DÍA ==========
            if (y + 30 > pageHeight - 30) { doc.addPage(); y = margin; }
            y = drawSectionTitle('UTILIDADES DEL DÍA', y);

            const utilTotalUSDOriginal = totals.USD || 0;
            const utilTotalCADOriginal = totals.CAD || 0;
            const utilTotalMXNOriginal = totals.MXN || 0;

            // Función helper para una fila de utilidades
            const utilBox = { left: margin + 5, right: pageWidth - margin - 5, labelX: margin + 8, valueX: pageWidth - margin - 8, lineH: 9 };
            const drawUtilRow = (label, value, yh, opts = {}) => {
                const { bold = false, color = [60, 60, 70], bgColor = null, small = false, indent = 0 } = opts;
                if (bgColor) { doc.setFillColor(...bgColor); doc.rect(margin, yh, pageWidth - margin * 2, utilBox.lineH, 'F'); }
                doc.setDrawColor(225, 228, 232);
                doc.line(margin, yh + utilBox.lineH, pageWidth - margin, yh + utilBox.lineH);
                doc.setFont('helvetica', bold ? 'bold' : 'normal');
                doc.setFontSize(small ? 8 : 9);
                doc.setTextColor(...color);
                doc.text(label, utilBox.labelX + indent, yh + 6.5);
                if (value !== null) {
                    doc.setFont('helvetica', 'bold');
                    doc.text(value, utilBox.valueX, yh + 6.5, { align: 'right' });
                }
                doc.setTextColor(0, 0, 0);
                return yh + utilBox.lineH;
            };

            // Fondo general de la caja
            const utilRows = 8 + (fixedCostsProratedNum > 0 ? 1 : 0);
            const utilBoxH = utilRows * utilBox.lineH + 4;
            doc.setFillColor(248, 255, 250);
            doc.rect(margin, y, pageWidth - margin * 2, utilBoxH, 'F');
            doc.setDrawColor(180, 215, 185);
            doc.rect(margin, y, pageWidth - margin * 2, utilBoxH);

            // Ingresos
            let currencyDetails = [];
            if (utilTotalUSDOriginal > 0) currencyDetails.push(`USD $${utilTotalUSDOriginal.toFixed(2)} × ${usdRateForDisplay.toFixed(2)}`);
            if (utilTotalMXNOriginal > 0) currencyDetails.push(`MXN $${utilTotalMXNOriginal.toFixed(2)}`);
            if (utilTotalCADOriginal > 0) currencyDetails.push(`CAD $${utilTotalCADOriginal.toFixed(2)} × ${cadRateForDisplay.toFixed(2)}`);
            y = drawUtilRow(`Ingresos:  ${currencyDetails.join('  |  ')}`, `$${totalSalesMXNNum.toFixed(2)} MXN`, y, { bold: true, color: [30, 30, 40], bgColor: [240, 250, 243] });
            y = drawUtilRow('(-) Costo Mercancía (COGS):', `$${totalCOGSNum.toFixed(2)}`, y, { indent: 8 });
            y = drawUtilRow('(-) Comisiones (Vendedores + Guías):', `$${totalCommissionsNum.toFixed(2)}`, y, { indent: 8 });

            // Separador Utilidad Bruta
            doc.setFillColor(212, 160, 23);
            doc.rect(margin, y, pageWidth - margin * 2, 0.8, 'F');
            y += 1;
            const grossColor = grossProfit >= 0 ? [27, 110, 50] : [170, 30, 30];
            y = drawUtilRow(`= Utilidad Bruta  (${grossMargin.toFixed(1)}%)`, `$${grossProfit.toFixed(2)}`, y, { bold: true, color: grossColor, bgColor: [236, 252, 243] });

            y = drawUtilRow('(-) Costos de Llegadas:', `$${totalArrivalCostsNum.toFixed(2)}`, y, { indent: 8 });
            y = drawUtilRow('(-) Costos Operativos (Variables + Fijos):', `$${totalOperatingCosts.toFixed(2)}`, y, { indent: 8 });
            if (fixedCostsProratedNum > 0) {
                y = drawUtilRow(`    Incluye fijos prorrateados: $${fixedCostsProratedNum.toFixed(2)} (renta, luz, nómina, etc.)`, null, y, { small: true, color: [120, 120, 130], indent: 12 });
            }
            y = drawUtilRow('(-) Comisiones Bancarias:', `$${bankCommissionsNum.toFixed(2)}`, y, { indent: 8 });

            // Separador Utilidad Neta
            doc.setFillColor(212, 160, 23);
            doc.rect(margin, y, pageWidth - margin * 2, 0.8, 'F');
            y += 1;
            const netColor = netProfit >= 0 ? [27, 80, 160] : [170, 30, 30];
            const netBg = netProfit >= 0 ? [232, 244, 255] : [255, 235, 235];
            y = drawUtilRow(`= Utilidad Neta  (${netMargin.toFixed(1)}%)`, `$${netProfit.toFixed(2)}`, y, { bold: true, color: netColor, bgColor: netBg });

            doc.setTextColor(0, 0, 0);
            y += 6;

            // ========== FOOTER ==========
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                // Línea separadora footer
                doc.setDrawColor(180, 180, 180);
                doc.setLineWidth(0.3);
                doc.line(margin, pageHeight - 16, pageWidth - margin, pageHeight - 16);
                doc.setLineWidth(0.2);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(
                    `Página ${i} de ${totalPages}`,
                    pageWidth / 2,
                    pageHeight - 10,
                    { align: 'center' }
                );
                doc.text(
                    `Generado: ${dateStr}`,
                    margin,
                    pageHeight - 10
                );
                doc.text(
                    `OPAL & CO  |  Reporte de Captura Rápida`,
                    pageWidth - margin,
                    pageHeight - 10,
                    { align: 'right' }
                );
                doc.setTextColor(0, 0, 0);
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
            const selectedDate = dateInput?.value || this.getLocalDateStr();
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

            const currencySummary = this.calculateCaptureCurrencyTotals(captures, usdRate, cadRate);
            const totals = currencySummary.totals;
            const totalQuantity = currencySummary.totalQuantity;
            let totalCOGS = 0;

            captures.forEach(c => {
                totalCOGS += (parseFloat(c.merchandise_cost) || 0);
            });

            const totalSalesMXN = currencySummary.totalSalesMXN;
            // capture.total siempre está en MXN (convertido al momento del registro)
            const getCaptureTotalMXN = (capture) => parseFloat(capture.total) || 0;

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
                // Calcular el total en MXN usando los pagos originales o el total ya almacenado
                const captureTotalMXN = getCaptureTotalMXN(capture);
                
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
                    let branchCosts = allCosts.filter(c => {
                        if (branchId === null) {
                            return !c.branch_id;
                        } else {
                            if (!c.branch_id) return false;
                            return String(c.branch_id) === String(branchId);
                        }
                    });
                    branchCosts = this.deduplicateCosts(branchCosts);

                    // A) COSTOS FIJOS PRORRATEADOS
                    // Mensuales
                    const monthlyCosts = this.deduplicateRecurringCosts(branchCosts.filter(c => {
                        const isMonthly = c.period_type === 'monthly';
                        const isRecurring = c.recurring === true || c.recurring === 'true' || c.type === 'fijo';
                        const isValidCategory = c.category !== 'pago_llegadas' && c.category !== 'comisiones_bancarias';
                        return isMonthly && isRecurring && isValidCategory;
                    }));
                    for (const cost of monthlyCosts) {
                        // Usar 30 días fijos para prorrateo mensual (convención contable estándar)
                        const DAYS_PER_MONTH = 30;
                        fixedCostsProrated += (parseFloat(cost.amount) || 0) / DAYS_PER_MONTH;
                    }

                    // Semanales
                    const weeklyCosts = this.deduplicateRecurringCosts(branchCosts.filter(c => {
                        const isWeekly = c.period_type === 'weekly';
                        const isRecurring = c.recurring === true || c.recurring === 'true' || c.type === 'fijo';
                        const isValidCategory = c.category !== 'pago_llegadas' && c.category !== 'comisiones_bancarias';
                        const costDate = new Date(c.date || c.created_at);
                        const isSameYear = targetDate.getFullYear() === costDate.getFullYear();
                        return isWeekly && isRecurring && isValidCategory && isSameYear;
                    }));
                    for (const cost of weeklyCosts) {
                        fixedCostsProrated += (parseFloat(cost.amount) || 0) / 7;
                    }

                    // Anuales/Yearly
                    const annualCosts = this.deduplicateRecurringCosts(branchCosts.filter(c => {
                        const isAnnual = c.period_type === 'annual' || c.period_type === 'yearly';
                        const isRecurring = c.recurring === true || c.recurring === 'true' || c.type === 'fijo';
                        const isValidCategory = c.category !== 'pago_llegadas' && c.category !== 'comisiones_bancarias';
                        return isAnnual && isRecurring && isValidCategory;
                    }));
                    for (const cost of annualCosts) {
                        const daysInYear = ((targetDate.getFullYear() % 4 === 0 && targetDate.getFullYear() % 100 !== 0) || (targetDate.getFullYear() % 400 === 0)) ? 366 : 365;
                        fixedCostsProrated += (parseFloat(cost.amount) || 0) / daysInYear;
                    }

                    // B) COSTOS VARIABLES DEL DÍA (usar fecha seleccionada)
                    const isRecurringFixedArchive = c => (c.recurring === true || c.recurring === 'true' || c.type === 'fijo');
                    const variableCosts = branchCosts.filter(c => {
                        const costDate = c.date || c.created_at;
                        const costDateStr = costDate.split('T')[0];
                        const cat = (c.category || '').toLowerCase();
                        return costDateStr === normalizedSelectedDate &&
                               cat !== 'pago_llegadas' &&
                               cat !== 'comisiones_bancarias' &&
                               cat !== 'comisiones' &&
                               cat !== 'costo_ventas' &&
                               cat !== 'cogs' &&
                               !isRecurringFixedArchive(c) &&
                               (c.period_type === 'one_time' || c.period_type === 'daily' || !c.period_type);
                    });
                    for (const cost of variableCosts) {
                        variableCostsDaily += (parseFloat(cost.amount) || 0);
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

            // Si no hay comisiones bancarias registradas, aplicar 4.5% fijo sobre ventas (temporal)
            if (bankCommissions <= 0 && totalSalesMXN > 0) {
                bankCommissions = totalSalesMXN * 0.045;
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
                    const captureTotalMXN = getCaptureTotalMXN(capture);
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
                    total_ventas_mxn: parseFloat((parseFloat(agencyData.total_ventas_mxn) || 0).toFixed(2))
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
                    const captureTotalMXN = getCaptureTotalMXN(capture);
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
                    total_ventas_mxn: parseFloat((parseFloat(guideData.total_ventas_mxn) || 0).toFixed(2))
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
                    const captureTotalMXN = getCaptureTotalMXN(capture);
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
                    total_ventas_mxn: parseFloat((parseFloat(sellerData.total_ventas_mxn) || 0).toFixed(2))
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
                total_sales_mxn: parseFloat(totalSalesMXN) || 0,
                total_cogs: parseFloat(totalCOGS) || 0,
                total_commissions: parseFloat(totalCommissions) || 0,
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
                total_arrival_costs: parseFloat(totalArrivalCosts) || 0,
                total_operating_costs: parseFloat(totalOperatingCosts) || 0,
                variable_costs_daily: parseFloat(variableCostsDaily) || 0,
                fixed_costs_prorated: parseFloat(fixedCostsProrated) || 0,
                bank_commissions: parseFloat(bankCommissions) || 0,
                gross_profit: parseFloat(grossProfit) || 0,
                net_profit: parseFloat(netProfit) || 0,
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
                
                // Validar UUID helper
                const isValidUUID = (value) => {
                    if (!value || typeof value !== 'string') return false;
                    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                    return uuidRegex.test(value);
                };
                
                for (const capture of captures) {
                    try {
                        // Limpiar guide_id si no es UUID válido
                        const cleanCapture = { ...capture };
                        if (cleanCapture.guide_id && !isValidUUID(cleanCapture.guide_id)) {
                            console.warn(`⚠️ guide_id inválido en captura ${capture.id}: "${cleanCapture.guide_id}" → null`);
                            cleanCapture.guide_id = null;
                        }
                        
                        // Verificar si ya existe en el servidor (tiene server_id)
                        if (capture.server_id) {
                            // Actualizar captura existente
                            if (API.updateQuickCapture) {
                                await API.updateQuickCapture(capture.server_id, cleanCapture);
                                syncedCount++;
                            }
                        } else {
                            // Crear nueva captura en el servidor
                            const serverCapture = await API.createQuickCapture(cleanCapture);
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
                            total_sales_mxn: parseFloat(totalSalesMXN) || 0,
                            total_cogs: parseFloat(totalCOGS) || 0,
                            total_commissions: parseFloat(totalCommissions) || 0,
                            total_arrival_costs: parseFloat(totalArrivalCosts) || 0,
                            total_operating_costs: parseFloat(totalOperatingCosts) || 0,
                            variable_costs_daily: parseFloat(variableCostsDaily) || 0,
                            fixed_costs_prorated: parseFloat(fixedCostsProrated) || 0,
                            bank_commissions: parseFloat(bankCommissions) || 0,
                            gross_profit: parseFloat(grossProfit) || 0,
                            net_profit: parseFloat(netProfit) || 0,
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

    async recalcAllArchivedCosts() {
        try {
            const confirmed = await Utils.confirm(
                '¿Recalcular los costos operativos (variables, fijos, bancarias) de TODOS los reportes archivados desde los registros locales de cost_entries?\n\nEsto actualizará también la Utilidad Bruta y Neta de cada reporte.',
                'Recalcular Costos Todos'
            );
            if (!confirmed) return;

            const allReports = await DB.getAll('archived_quick_captures') || [];
            if (allReports.length === 0) {
                Utils.showNotification('No hay reportes archivados', 'warning');
                return;
            }

            const allCosts = await DB.getAll('cost_entries') || [];
            const allSessions = await DB.getAll('cash_sessions') || [];
            const allMovements = await DB.getAll('cash_movements') || [];

            let updated = 0;
            let errors = 0;

            for (const report of allReports) {
                try {
                    const reportDate = this.getArchivedReportDate(report);
                    if (!reportDate) continue;

                    const captureBranchIds = report.branch_id ? [report.branch_id] : [];
                    const targetDate = new Date(reportDate);
                    const DAYS_PER_MONTH = 30;
                    const daysInYear = ((targetDate.getFullYear() % 4 === 0 && targetDate.getFullYear() % 100 !== 0) || (targetDate.getFullYear() % 400 === 0)) ? 366 : 365;

                    let variableCostsDaily = 0;
                    let fixedCostsProrated = 0;
                    let bankCommissions = 0;

                    for (const branchId of (captureBranchIds.length > 0 ? captureBranchIds : [null])) {
                        let branchCosts = allCosts.filter(c => {
                            if (branchId === null) return !c.branch_id;
                            if (!c.branch_id) return false;
                            return String(c.branch_id) === String(branchId);
                        });
                        branchCosts = this.deduplicateCosts(branchCosts);

                        // A) FIJOS PRORRATEADOS
                        const monthlyCosts = this.deduplicateRecurringCosts(branchCosts.filter(c =>
                            c.period_type === 'monthly' &&
                            (c.recurring === true || c.recurring === 'true' || c.type === 'fijo') &&
                            c.category !== 'pago_llegadas' && c.category !== 'comisiones_bancarias'
                        ));
                        for (const cost of monthlyCosts) fixedCostsProrated += (parseFloat(cost.amount) || 0) / DAYS_PER_MONTH;

                        const weeklyCosts = this.deduplicateRecurringCosts(branchCosts.filter(c => {
                            const cd = new Date(c.date || c.created_at);
                            return c.period_type === 'weekly' &&
                                (c.recurring === true || c.recurring === 'true' || c.type === 'fijo') &&
                                c.category !== 'pago_llegadas' && c.category !== 'comisiones_bancarias' &&
                                targetDate.getFullYear() === cd.getFullYear();
                        }));
                        for (const cost of weeklyCosts) fixedCostsProrated += (parseFloat(cost.amount) || 0) / 7;

                        const annualCosts = this.deduplicateRecurringCosts(branchCosts.filter(c =>
                            (c.period_type === 'annual' || c.period_type === 'yearly') &&
                            (c.recurring === true || c.recurring === 'true' || c.type === 'fijo') &&
                            c.category !== 'pago_llegadas' && c.category !== 'comisiones_bancarias'
                        ));
                        for (const cost of annualCosts) fixedCostsProrated += (parseFloat(cost.amount) || 0) / daysInYear;

                        // B) VARIABLES DEL DÍA
                        const isFixed = c => c.recurring === true || c.recurring === 'true' || c.type === 'fijo';
                        const varCosts = branchCosts.filter(c => {
                            const ds = (c.date || c.created_at || '').split('T')[0];
                            const cat = (c.category || '').toLowerCase();
                            return ds === reportDate &&
                                cat !== 'pago_llegadas' && cat !== 'comisiones_bancarias' &&
                                cat !== 'comisiones' && cat !== 'costo_ventas' && cat !== 'cogs' &&
                                !isFixed(c) &&
                                (c.period_type === 'one_time' || c.period_type === 'daily' || !c.period_type);
                        });
                        for (const cost of varCosts) variableCostsDaily += (parseFloat(cost.amount) || 0);

                        // C) COMISIONES BANCARIAS REGISTRADAS
                        const bankCosts = branchCosts.filter(c => {
                            const ds = (c.date || c.created_at || '').split('T')[0];
                            return ds === reportDate && (c.category || '').toLowerCase() === 'comisiones_bancarias';
                        });
                        for (const cost of bankCosts) bankCommissions += (parseFloat(cost.amount) || 0);

                        // D) RETIROS DE CAJA
                        const daySessions = allSessions.filter(s => {
                            const sd = (s.date || s.created_at || '').split('T')[0];
                            return sd === reportDate && (!branchId || String(s.branch_id) === String(branchId));
                        });
                        const sessionIds = daySessions.map(s => s.id);
                        for (const m of allMovements) {
                            if (m.type === 'withdrawal' && sessionIds.includes(m.session_id)) {
                                variableCostsDaily += (parseFloat(m.amount) || 0);
                            }
                        }
                    }

                    // Fallback bancarias
                    const totalSales = parseFloat(report.total_sales_mxn) || 0;
                    if (bankCommissions <= 0 && totalSales > 0) bankCommissions = totalSales * 0.045;

                    const totalOpCosts = variableCostsDaily + fixedCostsProrated;
                    const totalCOGS = parseFloat(report.total_cogs) || 0;
                    const totalComm = parseFloat(report.total_commissions) || 0;
                    const totalArrival = parseFloat(report.total_arrival_costs) || 0;
                    // Misma fórmula que archiveQuickCaptureReport:
                    // gross = sales - COGS - commissions  (llegadas NO en gross)
                    // net   = gross - arrivals - opCosts - bank
                    const grossProfit = totalSales - totalCOGS - totalComm;
                    const netProfit = grossProfit - totalArrival - totalOpCosts - bankCommissions;

                    const updatedReport = {
                        ...report,
                        variable_costs_daily: variableCostsDaily,
                        fixed_costs_prorated: fixedCostsProrated,
                        total_operating_costs: totalOpCosts,
                        bank_commissions: bankCommissions,
                        gross_profit: grossProfit,
                        net_profit: netProfit,
                        recalculated_at: new Date().toISOString()
                    };
                    await DB.put('archived_quick_captures', updatedReport);

                    // Sincronizar al servidor si tiene UUID
                    const serverId = report.server_id || report.id;
                    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(serverId));
                    if (isUUID && typeof API !== 'undefined' && API.updateArchivedReport) {
                        try {
                            await API.updateArchivedReport(serverId, {
                                variable_costs_daily: variableCostsDaily,
                                fixed_costs_prorated: fixedCostsProrated,
                                total_operating_costs: totalOpCosts,
                                bank_commissions: bankCommissions,
                                gross_profit: grossProfit,
                                net_profit: netProfit
                            });
                        } catch (_) {}
                    }

                    updated++;
                    console.log(`✅ [RecalcCostos] ${reportDate}: fijos=$${fixedCostsProrated.toFixed(2)} var=$${variableCostsDaily.toFixed(2)} banco=$${bankCommissions.toFixed(2)} neta=$${netProfit.toFixed(2)}`);
                } catch (err) {
                    console.error('Error en reporte', report.id, err);
                    errors++;
                }
            }

            Utils.showNotification(`Costos recalculados: ${updated} reportes actualizados${errors > 0 ? `, ${errors} con error` : ''}.`, errors > 0 ? 'warning' : 'success');
            await this.loadArchivedReports(true);
        } catch (error) {
            console.error('Error recalcAllarchivedCosts:', error);
            Utils.showNotification('Error: ' + error.message, 'error');
        }
    },

    async recalcAllArchivedArrivals() {
        try {
            const confirmed = await Utils.confirm(
                '¿Re-asociar llegadas y recalcular costos de llegadas en TODOS los reportes archivados?\n\nSe consultarán las llegadas registradas en el sistema por fecha y se actualizarán los reportes que tengan llegadas faltantes o incorrectas.',
                'Recalcular Llegadas'
            );
            if (!confirmed) return;

            const allReports = await DB.getAll('archived_quick_captures') || [];
            if (allReports.length === 0) {
                Utils.showNotification('No hay reportes archivados', 'warning');
                return;
            }

            const allCosts = await DB.getAll('cost_entries') || [];
            const allArrivals = await DB.getAll('agency_arrivals') || [];

            const norm = (id) => (id != null && id !== '') ? String(id).trim().toLowerCase() : '';
            const isArrivalCost = (cat) => (cat || '').toLowerCase().replace(/\s+/g, '_') === 'pago_llegadas';

            let updated = 0;
            let errors = 0;

            for (const report of allReports) {
                try {
                    const reportDate = this.getArchivedReportDate(report);
                    if (!reportDate) continue;

                    const captureBranchIds = Array.isArray(report.branch_ids) && report.branch_ids.length > 0
                        ? report.branch_ids
                        : (report.branch_id ? [report.branch_id] : []);
                    const normBranchIds = captureBranchIds.map(norm).filter(Boolean);

                    // 1. Buscar costos de llegadas en cost_entries (fuente autorizada)
                    const arrivalCostEntries = allCosts.filter(c => {
                        const costDate = (c.date || c.created_at || '').split('T')[0];
                        if (!isArrivalCost(c.category)) return false;
                        if (costDate !== reportDate) return false;
                        if (normBranchIds.length === 0) return true;
                        if (!c.branch_id) return true;
                        return normBranchIds.includes(norm(c.branch_id));
                    });

                    const uniqueArrivalCosts = new Map();
                    arrivalCostEntries.forEach(c => {
                        const amount = parseFloat(c.amount) || 0;
                        if (c.arrival_id) {
                            const existing = uniqueArrivalCosts.get(c.arrival_id) || 0;
                            if (amount > existing) uniqueArrivalCosts.set(c.arrival_id, amount);
                        } else {
                            const key = `${c.date||''}_${c.agency_id||''}_${c.branch_id||''}_${amount}`;
                            if (!uniqueArrivalCosts.has(key)) uniqueArrivalCosts.set(key, amount);
                        }
                    });
                    let totalArrival = Array.from(uniqueArrivalCosts.values()).reduce((s, a) => s + a, 0);

                    // Llegadas del día para guardar en el reporte
                    let dayArrivals = allArrivals.filter(a => {
                        const aDate = (a.date || (a.created_at ? a.created_at.split('T')[0] : null) || '');
                        if (aDate !== reportDate) return false;
                        if (normBranchIds.length === 0) return true;
                        return !a.branch_id || normBranchIds.includes(norm(a.branch_id));
                    });

                    // 2. Fallback: calcular desde agency_arrivals si no hay en cost_entries
                    if (uniqueArrivalCosts.size === 0 || totalArrival === 0) {
                        const arrivalsWithFee = dayArrivals.filter(a =>
                            parseFloat(a.calculated_fee || a.arrival_fee || 0) > 0
                        );
                        const uniqueArrivals = new Map();
                        arrivalsWithFee.forEach(a => {
                            const fee = parseFloat(a.calculated_fee || a.arrival_fee || 0) || 0;
                            if (a.id) {
                                const existing = uniqueArrivals.get(a.id) || 0;
                                if (fee > existing) uniqueArrivals.set(a.id, fee);
                            }
                        });
                        totalArrival = Array.from(uniqueArrivals.values()).reduce((s, f) => s + f, 0);
                    }

                    const prevArrival = parseFloat(report.total_arrival_costs) || 0;
                    const prevArrivalsCount = (report.arrivals || []).length;

                    // Si no encontramos NINGÚN dato (ni cost_entries ni agency_arrivals), no tocar el reporte
                    // Esto evita sobreescribir valores existentes con $0 cuando los datos históricos no están localmente
                    if (totalArrival === 0 && uniqueArrivalCosts.size === 0 && dayArrivals.length === 0) {
                        console.log(`⏭️ [RecalcLlegadas] ${reportDate}: sin datos locales, conservando $${prevArrival.toFixed(2)}`);
                        continue;
                    }

                    // Si no hay cambio significativo, continuar (evitar writes innecesarios)
                    if (Math.abs(totalArrival - prevArrival) < 0.01 && dayArrivals.length === prevArrivalsCount) continue;

                    // Recalcular gross/net con el nuevo total de llegadas
                    const totalSales = parseFloat(report.total_sales_mxn) || 0;
                    const totalCOGS = parseFloat(report.total_cogs) || 0;
                    const totalComm = parseFloat(report.total_commissions) || 0;
                    const totalOpCosts = parseFloat(report.total_operating_costs) || 0;
                    const bankComm = parseFloat(report.bank_commissions) || 0;
                    const grossProfit = totalSales - totalCOGS - totalComm;
                    const netProfit = grossProfit - totalArrival - totalOpCosts - bankComm;

                    const updatedReport = {
                        ...report,
                        arrivals: dayArrivals,
                        total_arrival_costs: totalArrival,
                        gross_profit: grossProfit,
                        net_profit: netProfit,
                        recalculated_at: new Date().toISOString()
                    };
                    await DB.put('archived_quick_captures', updatedReport);

                    // Sincronizar al servidor
                    const serverId = report.server_id || report.id;
                    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(serverId));
                    if (isUUID && typeof API !== 'undefined' && API.updateArchivedReport) {
                        try {
                            await API.updateArchivedReport(serverId, {
                                total_arrival_costs: totalArrival,
                                arrivals: dayArrivals,
                                gross_profit: grossProfit,
                                net_profit: netProfit
                            });
                        } catch (_) {}
                    }

                    updated++;
                    console.log(`✅ [RecalcLlegadas] ${reportDate}: prev=$${prevArrival.toFixed(2)} → nuevo=$${totalArrival.toFixed(2)}, llegadas: ${dayArrivals.length}`);
                } catch (err) {
                    console.error('Error en reporte', report.id, err);
                    errors++;
                }
            }

            Utils.showNotification(
                updated > 0
                    ? `Llegadas recalculadas: ${updated} reporte(s) actualizado(s)${errors > 0 ? `, ${errors} con error` : ''}.`
                    : `Sin cambios necesarios${errors > 0 ? ` (${errors} con error)` : ''}.`,
                errors > 0 ? 'warning' : 'success'
            );
            if (updated > 0) await this.loadArchivedReports(true);
        } catch (error) {
            console.error('Error recalcAllArchivedArrivals:', error);
            Utils.showNotification('Error: ' + error.message, 'error');
        }
    },

    async recalculateAllArchivedCommissions() {
        try {
            const confirmed = await Utils.confirm(
                '¿Recalcular las comisiones de TODOS los reportes archivados? Se actualizarán también en el servidor.',
                'Recalcular Comisiones'
            );
            if (!confirmed) return;

            // Primero descargar reportes frescos del servidor para tener las capturas actualizadas
            Utils.showNotification('Descargando reportes del servidor...', 'info');
            let allReports = [];
            try {
                if (typeof API !== 'undefined' && API.getArchivedReports) {
                    const serverReports = await API.getArchivedReports({}) || [];
                    for (const sr of serverReports) {
                        const reportDate = this.getArchivedReportDate(sr);
                        const branchId = sr.branch_id;
                        const existingLocal = await DB.getAll('archived_quick_captures') || [];
                        const existing = existingLocal.find(r => this.getArchivedReportDate(r) === reportDate && r.branch_id === branchId);
                        // Solo actualizar captures y datos estructurales del servidor;
                        // NO sobreescribir valores financieros si ya fueron recalculados localmente.
                        // Esto permite que el recálculo use siempre los captures frescos del servidor.
                        const localReport = {
                            id: existing ? existing.id : (branchId && reportDate ? `report_${reportDate}_${branchId}` : sr.id),
                            date: reportDate,
                            branch_id: branchId,
                            archived_by: sr.archived_by,
                            total_captures: sr.total_captures || 0,
                            total_quantity: sr.total_quantity || 0,
                            total_sales_mxn: sr.total_sales_mxn || 0,
                            total_cogs: sr.total_cogs || 0,
                            total_commissions: sr.total_commissions || 0,
                            total_arrival_costs: sr.total_arrival_costs || 0,
                            total_operating_costs: sr.total_operating_costs || 0,
                            variable_costs_daily: sr.variable_costs_daily || 0,
                            fixed_costs_prorated: sr.fixed_costs_prorated || 0,
                            bank_commissions: sr.bank_commissions || 0,
                            gross_profit: sr.gross_profit || 0,
                            net_profit: sr.net_profit || 0,
                            exchange_rates: sr.exchange_rates || {},
                            captures: this.normalizeArchivedArray(sr.captures),
                            daily_summary: this.normalizeArchivedArray(sr.daily_summary),
                            seller_commissions: this.normalizeArchivedArray(sr.seller_commissions),
                            guide_commissions: this.normalizeArchivedArray(sr.guide_commissions),
                            arrivals: this.normalizeArchivedArray(sr.arrivals),
                            metrics: sr.metrics || {},
                            archived_at: sr.archived_at || sr.created_at || new Date().toISOString(),
                            server_id: sr.id,
                            sync_status: 'synced'
                            // Nota: recalculated_at se eliminará intencionalmente para hacer recálculo fresco
                        };
                        await DB.put('archived_quick_captures', localReport);
                    }
                }
                allReports = await DB.getAll('archived_quick_captures') || [];
            } catch (e) {
                console.warn('No se pudo descargar del servidor, usando local:', e);
                allReports = await DB.getAll('archived_quick_captures') || [];
            }

            // Descargar respaldo JSON antes de modificar cualquier dato
            try {
                const backupData = JSON.stringify(allReports, null, 2);
                const blob = new Blob([backupData], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const dateStr = new Date().toISOString().split('T')[0];
                a.href = url;
                a.download = `respaldo-reportes-${dateStr}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch (backupError) {
                console.error('Error generando respaldo:', backupError);
            }

            const reportsWithCaptures = allReports.filter(r => r.captures && r.captures.length > 0);

            if (reportsWithCaptures.length === 0) {
                Utils.showNotification('No hay reportes con capturas para recalcular. Los reportes anteriores no tienen datos individuales de ventas guardados.', 'warning');
                return;
            }

            Utils.showNotification(`Recalculando ${reportsWithCaptures.length} reportes...`, 'info');

            // Cargar catálogos una sola vez
            const commissionRules = await DB.getAll('commission_rules') || [];
            const agencies = await DB.getAll('catalog_agencies') || [];
            const sellers = await DB.getAll('catalog_sellers') || [];
            const guides = await DB.getAll('catalog_guides') || [];

            let updatedCount = 0;
            let serverUpdatedCount = 0;

            for (const report of reportsWithCaptures) {
                const captures = report.captures;
                const usdRate = report.exchange_rates?.usd || 20.0;
                const cadRate = report.exchange_rates?.cad || 15.0;

                let totalCommissions = 0;
                const sellerCommissions = {};
                const guideCommissions = {};

                for (const capture of captures) {
                    // capture.total siempre está en MXN — usar directamente sin multiplicar por tipo de cambio
                    const captureTotalMXN = parseFloat(capture.total) || 0;

                    if (capture.is_street && capture.seller_id && captureTotalMXN > 0 && capture.payment_method) {
                        let streetCommission = 0;
                        if (capture.payment_method === 'card') {
                            streetCommission = captureTotalMXN * (1 - 0.045) * 0.12;
                        } else if (capture.payment_method === 'cash') {
                            streetCommission = captureTotalMXN * 0.14;
                        }
                        totalCommissions += streetCommission;
                    } else {
                        const agency = agencies.find(a => a.id === capture.agency_id);
                        const seller = sellers.find(s => s.id === capture.seller_id);
                        const guide = guides.find(g => g.id === capture.guide_id);
                        const agencyName = agency?.name || null;
                        const sellerName = seller?.name || null;
                        const guideName = guide?.name || null;

                        const commissionsByRules = this.calculateCommissionByRules(captureTotalMXN, agencyName, sellerName, guideName);

                        // Comisión del vendedor
                        if (capture.seller_id && captureTotalMXN > 0 && !capture.is_street) {
                            let sellerCommission = commissionsByRules.sellerCommission;
                            if (sellerCommission === 0) {
                                const sellerRule = commissionRules.find(r => r.entity_type === 'seller' && r.entity_id === capture.seller_id)
                                    || commissionRules.find(r => r.entity_type === 'seller' && r.entity_id === null);
                                if (sellerRule) {
                                    const afterDiscount = captureTotalMXN * (1 - ((sellerRule.discount_pct || 0) / 100));
                                    sellerCommission = afterDiscount * ((sellerRule.multiplier || 1) / 100);
                                }
                            }
                            if (sellerCommission > 0) {
                                totalCommissions += sellerCommission;
                                if (!sellerCommissions[capture.seller_id]) {
                                    sellerCommissions[capture.seller_id] = { seller, total: 0, sales: 0, commissions: {} };
                                }
                                sellerCommissions[capture.seller_id].total += sellerCommission;
                                sellerCommissions[capture.seller_id].sales += 1;
                                const cur = capture.currency || 'MXN';
                                if (!sellerCommissions[capture.seller_id].commissions[cur]) sellerCommissions[capture.seller_id].commissions[cur] = 0;
                                sellerCommissions[capture.seller_id].commissions[cur] += cur === 'USD' ? sellerCommission / usdRate : cur === 'CAD' ? sellerCommission / cadRate : sellerCommission;
                            }
                        }

                        // Comisión del guía
                        if (capture.guide_id && captureTotalMXN > 0) {
                            let guideCommission = commissionsByRules.guideCommission;
                            if (guideCommission === 0) {
                                const guideRule = commissionRules.find(r => r.entity_type === 'guide' && r.entity_id === capture.guide_id)
                                    || commissionRules.find(r => r.entity_type === 'guide' && r.entity_id === null);
                                if (guideRule) {
                                    const afterDiscount = captureTotalMXN * (1 - ((guideRule.discount_pct || 0) / 100));
                                    guideCommission = afterDiscount * ((guideRule.multiplier || 1) / 100);
                                }
                            }
                            if (guideCommission > 0) {
                                totalCommissions += guideCommission;
                                if (!guideCommissions[capture.guide_id]) {
                                    guideCommissions[capture.guide_id] = { guide, total: 0, sales: 0, commissions: {} };
                                }
                                guideCommissions[capture.guide_id].total += guideCommission;
                                guideCommissions[capture.guide_id].sales += 1;
                                const cur = capture.currency || 'MXN';
                                if (!guideCommissions[capture.guide_id].commissions[cur]) guideCommissions[capture.guide_id].commissions[cur] = 0;
                                guideCommissions[capture.guide_id].commissions[cur] += cur === 'USD' ? guideCommission / usdRate : cur === 'CAD' ? guideCommission / cadRate : guideCommission;
                            }
                        }
                    }
                }

                // Recalcular total de ventas directamente de las capturas (capture.total ya está en MXN)
                const totalSalesMXN = captures.reduce((sum, c) => sum + (parseFloat(c.total) || 0), 0);
                const totalCOGS = parseFloat(report.total_cogs) || 0;
                const totalArrivalCosts = parseFloat(report.total_arrival_costs) || 0;
                const totalOperatingCosts = parseFloat(report.total_operating_costs) || 0;
                let bankCommissions = parseFloat(report.bank_commissions) || 0;
                if (bankCommissions <= 0 && totalSalesMXN > 0) bankCommissions = totalSalesMXN * 0.045;

                const grossProfit = totalSalesMXN - totalCOGS - totalCommissions;
                const netProfit = grossProfit - totalArrivalCosts - totalOperatingCosts - bankCommissions;

                report.total_sales_mxn = parseFloat(totalSalesMXN.toFixed(2));
                report.total_commissions = parseFloat(totalCommissions.toFixed(2));
                report.seller_commissions = Object.values(sellerCommissions).map(s => ({
                    seller_id: s.seller?.id,
                    seller_name: s.seller?.name,
                    total: s.total,
                    sales: s.sales,
                    commissions: s.commissions
                }));
                report.guide_commissions = Object.values(guideCommissions).map(g => ({
                    guide_id: g.guide?.id,
                    guide_name: g.guide?.name,
                    total: g.total,
                    sales: g.sales,
                    commissions: g.commissions
                }));
                report.gross_profit = parseFloat(grossProfit.toFixed(2));
                report.net_profit = parseFloat(netProfit.toFixed(2));
                report.bank_commissions = parseFloat(bankCommissions.toFixed(2));
                report.recalculated_at = new Date().toISOString();

                // Guardar localmente
                await DB.put('archived_quick_captures', report);
                updatedCount++;

                // Subir al servidor usando POST (upsert por fecha+sucursal).
                // El endpoint POST busca si ya existe un reporte para esa fecha+sucursal y lo actualiza,
                // o lo crea nuevo si no existe. Esto es más robusto que PUT /:id porque no depende
                // de que el server_id local sea válido en la BD actual.
                if (typeof API !== 'undefined' && API.saveArchivedReport) {
                    try {
                        const reportDate = report.date || report.report_date || '';
                        const serverResult = await API.saveArchivedReport({
                            report_date: reportDate,
                            branch_id: report.branch_id,
                            total_captures: report.total_captures || (report.captures ? report.captures.length : 0),
                            total_quantity: report.total_quantity || 0,
                            total_sales_mxn: report.total_sales_mxn,
                            total_cogs: report.total_cogs || 0,
                            total_commissions: report.total_commissions,
                            total_arrival_costs: report.total_arrival_costs || 0,
                            total_operating_costs: report.total_operating_costs || 0,
                            variable_costs_daily: report.variable_costs_daily || 0,
                            fixed_costs_prorated: report.fixed_costs_prorated || 0,
                            bank_commissions: report.bank_commissions,
                            gross_profit: report.gross_profit,
                            net_profit: report.net_profit,
                            exchange_rates: report.exchange_rates || {},
                            captures: report.captures || [],
                            daily_summary: report.daily_summary || [],
                            seller_commissions: report.seller_commissions,
                            guide_commissions: report.guide_commissions,
                            arrivals: report.arrivals || [],
                            metrics: report.metrics || {}
                        });
                        // Actualizar server_id local con el devuelto por el servidor
                        if (serverResult && serverResult.id) {
                            report.server_id = serverResult.id;
                            report.sync_status = 'synced';
                            await DB.put('archived_quick_captures', report);
                        }
                        serverUpdatedCount++;
                        console.log(`✅ Servidor actualizado (upsert): ${reportDate} (ID: ${serverResult?.id})`);
                    } catch (serverError) {
                        console.warn(`⚠️ No se pudo actualizar en servidor (${report.date}):`, serverError.message);
                    }
                }
            }

            const failedCount = updatedCount - serverUpdatedCount;
            const serverMsg = failedCount > 0
                ? ` (⚠️ ${failedCount} no pudieron subirse al servidor)`
                : ` (${serverUpdatedCount} actualizados en servidor)`;
            Utils.showNotification(`✅ ${updatedCount} reportes recalculados${serverMsg}.`, failedCount > 0 ? 'warning' : 'success');
            // skipSync=true para no sobreescribir los datos corregidos con la sync del servidor
            await this.loadArchivedReports(true);
        } catch (error) {
            console.error('Error recalculando comisiones:', error);
            Utils.showNotification('Error al recalcular: ' + error.message, 'error');
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
            const selectedDate = dateInput?.value || this.getLocalDateStr();
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

    async loadArchivedReports(skipServerSync = false) {
        try {
            const container = document.getElementById('archived-reports-list');
            if (!container) return;

            // PASO 1: Sincronizar reportes locales que NO están en el servidor (subirlos)
            if (skipServerSync) {
                console.log('⏭️ [loadArchivedReports] Saltando sync del servidor (skipServerSync=true)');
            } else
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
                                    total_sales_mxn: parseFloat(localReport.total_sales_mxn) || 0,
                                    total_cogs: parseFloat(localReport.total_cogs) || 0,
                                    total_commissions: parseFloat(localReport.total_commissions) || 0,
                                    total_arrival_costs: parseFloat(localReport.total_arrival_costs) || 0,
                                    total_operating_costs: parseFloat(localReport.total_operating_costs) || 0,
                                    variable_costs_daily: parseFloat(localReport.variable_costs_daily) || 0,
                                    fixed_costs_prorated: parseFloat(localReport.fixed_costs_prorated) || 0,
                                    bank_commissions: parseFloat(localReport.bank_commissions) || 0,
                                    gross_profit: parseFloat(localReport.gross_profit) || 0,
                                    net_profit: parseFloat(localReport.net_profit) || 0,
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
            if (!skipServerSync)
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
                        
                        // Obtener reportes archivados eliminados localmente para no re-insertarlos
                        const deletedArchivedReportIds = new Set();
                        try {
                            const deletedItems = await DB.getAll('sync_deleted_items') || [];
                            for (const d of deletedItems) {
                                if (d.entity_type === 'archived_quick_capture' && d.metadata?.server_id) {
                                    deletedArchivedReportIds.add(String(d.metadata.server_id));
                                }
                            }
                        } catch (_) {}
                        
                        if (serverReports.length > 0) {
                            console.log(`📋 [Paso 2] Fechas de reportes recibidos:`, 
                                serverReports.map(r => r.report_date || r.date).join(', '));
                        }
                        
                        // Guardar/actualizar cada reporte en IndexedDB local (excluir eliminados)
                        let savedCount = 0;
                        let updatedCount = 0;
                        for (const serverReport of serverReports) {
                            if (serverReport.id && deletedArchivedReportIds.has(String(serverReport.id))) continue;
                            try {
                                const reportDate = this.getArchivedReportDate(serverReport);
                                const branchId = serverReport.branch_id;
                                
                                // Usar una clave única basada en fecha y sucursal para evitar duplicados
                                // Formato: report_YYYY-MM-DD_branchId
                                const reportDateStr = reportDate || '';
                                const uniqueKey = branchId && reportDateStr 
                                    ? `report_${reportDateStr}_${branchId}` 
                                    : serverReport.id || `archived_${reportDateStr || Date.now()}`;
                                
                                // Verificar si ya existe un reporte local con la misma fecha y sucursal
                                const existingLocalReports = await DB.getAll('archived_quick_captures') || [];
                                const existingReport = existingLocalReports.find(r => {
                                    const rDateStr = this.getArchivedReportDate(r);
                                    return rDateStr === reportDateStr && r.branch_id === branchId;
                                });
                                
                                // Si el reporte local fue recalculado manualmente y ese recálculo es más
                                // reciente que la última actualización del servidor, preservar los valores
                                // financieros locales (el PUT al servidor puede haber fallado silenciosamente).
                                const localRecalcTS = existingReport?.recalculated_at ? new Date(existingReport.recalculated_at).getTime() : 0;
                                const serverUpdatedTS = serverReport.updated_at ? new Date(serverReport.updated_at).getTime() : 0;
                                const shouldKeepLocalCalcs = localRecalcTS > 0 && localRecalcTS > serverUpdatedTS;
                                if (shouldKeepLocalCalcs) {
                                    console.log(`🔒 [Paso 2] Preservando valores recalculados localmente para ${reportDateStr} (local recalculated_at=${existingReport.recalculated_at} > server updated_at=${serverReport.updated_at})`);
                                }
                                
                                // Si existe, actualizar; si no, crear nuevo
                                const localReport = {
                                    id: existingReport ? existingReport.id : uniqueKey, // Mantener ID existente o usar clave única
                                    date: reportDate,
                                    branch_id: branchId,
                                    archived_by: serverReport.archived_by, // Guardar quién archivó el reporte
                                    total_captures: serverReport.total_captures || 0,
                                    total_quantity: serverReport.total_quantity || 0,
                                    total_sales_mxn: shouldKeepLocalCalcs ? existingReport.total_sales_mxn : (serverReport.total_sales_mxn || 0),
                                    total_cogs: serverReport.total_cogs || 0,
                                    total_commissions: shouldKeepLocalCalcs ? existingReport.total_commissions : (serverReport.total_commissions || 0),
                                    total_arrival_costs: serverReport.total_arrival_costs || 0,
                                    total_operating_costs: serverReport.total_operating_costs || 0,
                                    variable_costs_daily: serverReport.variable_costs_daily || 0,
                                    fixed_costs_prorated: serverReport.fixed_costs_prorated || 0,
                                    bank_commissions: shouldKeepLocalCalcs ? existingReport.bank_commissions : (serverReport.bank_commissions || 0),
                                    gross_profit: shouldKeepLocalCalcs ? existingReport.gross_profit : (serverReport.gross_profit || 0),
                                    net_profit: shouldKeepLocalCalcs ? existingReport.net_profit : (serverReport.net_profit || 0),
                                    exchange_rates: serverReport.exchange_rates || {},
                                    captures: this.normalizeArchivedArray(serverReport.captures),
                                    daily_summary: this.normalizeArchivedArray(serverReport.daily_summary),
                                    seller_commissions: shouldKeepLocalCalcs ? existingReport.seller_commissions : this.normalizeArchivedArray(serverReport.seller_commissions),
                                    guide_commissions: shouldKeepLocalCalcs ? existingReport.guide_commissions : this.normalizeArchivedArray(serverReport.guide_commissions),
                                    arrivals: this.normalizeArchivedArray(serverReport.arrivals),
                                    metrics: serverReport.metrics || {},
                                    archived_at: serverReport.archived_at || serverReport.created_at || new Date().toISOString(),
                                    server_id: serverReport.id, // Guardar el ID del servidor para referencia
                                    sync_status: 'synced',
                                    recalculated_at: existingReport?.recalculated_at || null // Preservar timestamp de recálculo
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
                const reportDateStr = this.getArchivedReportDate(report);
                const branchId = report.branch_id;
                
                if (!reportDateStr || !branchId) continue;
                
                const key = `${reportDateStr}_${branchId}`;

                const existing = reportsByKey.get(key);
                reportsByKey.set(key, this.pickMostCompleteArchivedReport(existing, report));
            }
            
            archivedReports = Array.from(reportsByKey.values());
            console.log(`🔍 [Deduplicación] ${archivedReports.length} reportes únicos después de eliminar duplicados`);
            
            // Ordenar por fecha del reporte (más recientes primero) para el histórico
            // Usar la fecha del reporte (date), no la fecha de archivado (archived_at)
            archivedReports.sort((a, b) => {
                // Obtener la fecha del reporte (puede estar en 'date' o 'report_date')
                const dateAStr = this.getArchivedReportDate(a);
                const dateBStr = this.getArchivedReportDate(b);
                
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
                                const normalizedDate = this.getArchivedReportDate(report);
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
                                                <button class="btn-success btn-xs" onclick="window.Reports.restoreArchivedReport('${report.id}')" title="Restaurar al Temp (editar capturas)">
                                                    <i class="fas fa-undo"></i>
                                                </button>
                                                <button class="btn-xs" onclick="window.Reports.editArchivedReport('${report.id}')" title="Editar Valores Directamente" style="background: var(--color-warning, #e67e22); color: white; border: none; border-radius: 4px; cursor: pointer; padding: 4px 6px; font-size: 11px;">
                                                    <i class="fas fa-sliders-h"></i>
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

    async editArchivedReport(reportId) {
        try {
            const report = await DB.get('archived_quick_captures', reportId);
            if (!report) {
                Utils.showNotification('Reporte no encontrado', 'error');
                return;
            }

            const normalizedDate = this.getArchivedReportDate(report);
            const dateStr = normalizedDate ? this.formatDateWithoutTimezone(normalizedDate) : 'Sin fecha';

            const f = v => (parseFloat(v) || 0).toFixed(2);

            const existingModal = document.getElementById('edit-archived-report-modal');
            if (existingModal) existingModal.remove();

            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.id = 'edit-archived-report-modal';
            modal.style.cssText = 'display:flex; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:9999; align-items:center; justify-content:center;';
            modal.innerHTML = `
                <div class="modal-content" style="max-width:640px; width:94%; max-height:90vh; overflow-y:auto; border-radius:10px; background:var(--color-bg-card); box-shadow:0 8px 32px rgba(0,0,0,0.3);">
                    <div class="modal-header" style="padding:16px 20px; border-bottom:1px solid var(--color-border); display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <h3 style="margin:0; font-size:15px; font-weight:700;"><i class="fas fa-sliders-h" style="color:var(--color-warning,#e67e22); margin-right:6px;"></i>Editar Reporte Archivado</h3>
                            <div style="font-size:11px; color:var(--color-text-secondary); margin-top:2px;">${dateStr} &nbsp;·&nbsp; ID: ${reportId.substring(0,8)}…</div>
                        </div>
                        <button onclick="document.getElementById('edit-archived-report-modal').remove()" style="background:none; border:none; font-size:18px; cursor:pointer; color:var(--color-text-secondary);">&times;</button>
                    </div>
                    <div style="padding:20px;">
                        <div style="background:var(--color-warning-light,#fff3cd); border:1px solid var(--color-warning,#e67e22); border-radius:6px; padding:10px 14px; margin-bottom:16px; font-size:12px; display:flex; gap:8px; align-items:flex-start;">
                            <i class="fas fa-info-circle" style="color:var(--color-warning,#e67e22); margin-top:1px; flex-shrink:0;"></i>
                            <span>Los cambios se guardan en local y en el servidor. El <strong>Histórico</strong> leerá automáticamente estos valores actualizados.</span>
                        </div>

                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">
                            <div>
                                <label style="font-size:11px; font-weight:600; text-transform:uppercase; color:var(--color-text-secondary); display:block; margin-bottom:4px;">Ventas Totales (MXN)</label>
                                <input type="number" id="ea-total-sales" step="0.01" value="${f(report.total_sales_mxn)}" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px; font-size:13px; box-sizing:border-box;" oninput="window.Reports._eaAutoCalc()">
                            </div>
                            <div>
                                <label style="font-size:11px; font-weight:600; text-transform:uppercase; color:var(--color-text-secondary); display:block; margin-bottom:4px;">Costo de Ventas (COGS)</label>
                                <input type="number" id="ea-total-cogs" step="0.01" value="${f(report.total_cogs)}" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px; font-size:13px; box-sizing:border-box;" oninput="window.Reports._eaAutoCalc()">
                            </div>
                            <div>
                                <label style="font-size:11px; font-weight:600; text-transform:uppercase; color:var(--color-text-secondary); display:block; margin-bottom:4px;">Comisiones Totales</label>
                                <input type="number" id="ea-total-commissions" step="0.01" value="${f(report.total_commissions)}" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px; font-size:13px; box-sizing:border-box;" oninput="window.Reports._eaAutoCalc()">
                            </div>
                            <div>
                                <label style="font-size:11px; font-weight:600; text-transform:uppercase; color:var(--color-text-secondary); display:block; margin-bottom:4px;">Costos de Llegadas</label>
                                <input type="number" id="ea-total-arrival-costs" step="0.01" value="${f(report.total_arrival_costs)}" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px; font-size:13px; box-sizing:border-box;" oninput="window.Reports._eaAutoCalc()">
                            </div>
                            <div>
                                <label style="font-size:11px; font-weight:600; text-transform:uppercase; color:var(--color-text-secondary); display:block; margin-bottom:4px;">Costos Variables Diarios</label>
                                <input type="number" id="ea-variable-costs" step="0.01" value="${f(report.variable_costs_daily)}" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px; font-size:13px; box-sizing:border-box;" oninput="window.Reports._eaAutoCalc()">
                            </div>
                            <div>
                                <label style="font-size:11px; font-weight:600; text-transform:uppercase; color:var(--color-text-secondary); display:block; margin-bottom:4px;">Costos Fijos Prorrateados</label>
                                <input type="number" id="ea-fixed-costs" step="0.01" value="${f(report.fixed_costs_prorated)}" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px; font-size:13px; box-sizing:border-box;" oninput="window.Reports._eaAutoCalc()">
                            </div>
                            <div>
                                <label style="font-size:11px; font-weight:600; text-transform:uppercase; color:var(--color-text-secondary); display:block; margin-bottom:4px;">Comisiones Bancarias</label>
                                <input type="number" id="ea-bank-commissions" step="0.01" value="${f(report.bank_commissions)}" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px; font-size:13px; box-sizing:border-box;" oninput="window.Reports._eaAutoCalc()">
                            </div>
                            <div>
                                <label style="font-size:11px; font-weight:600; text-transform:uppercase; color:var(--color-text-secondary); display:block; margin-bottom:4px;">Costos Operativos Totales <span style="font-weight:400; font-style:italic;">(referencia)</span></label>
                                <input type="number" id="ea-total-operating-costs" step="0.01" value="${f(report.total_operating_costs)}" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:6px; font-size:13px; box-sizing:border-box; color:var(--color-text-secondary);">
                            </div>
                        </div>

                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; background:var(--color-bg-secondary); border-radius:8px; padding:12px; margin-bottom:16px;">
                            <div>
                                <label style="font-size:11px; font-weight:600; text-transform:uppercase; color:var(--color-success); display:block; margin-bottom:4px;">✦ Utilidad Bruta (auto)</label>
                                <input type="number" id="ea-gross-profit" step="0.01" value="${f(report.gross_profit)}" style="width:100%; padding:8px; border:2px solid var(--color-success); border-radius:6px; font-size:14px; font-weight:700; box-sizing:border-box; color:var(--color-success);">
                            </div>
                            <div>
                                <label style="font-size:11px; font-weight:600; text-transform:uppercase; color:var(--color-primary); display:block; margin-bottom:4px;">✦ Utilidad Neta (auto)</label>
                                <input type="number" id="ea-net-profit" step="0.01" value="${f(report.net_profit)}" style="width:100%; padding:8px; border:2px solid var(--color-primary); border-radius:6px; font-size:14px; font-weight:700; box-sizing:border-box; color:var(--color-primary);">
                            </div>
                        </div>
                        <p style="font-size:11px; color:var(--color-text-secondary); margin:0 0 16px 0; text-align:center;">
                            U. Bruta = Ventas − COGS − Comisiones − Llegadas &nbsp;|&nbsp; U. Neta = U. Bruta − Variables − Fijos − Bancarias
                        </p>

                        <div style="display:flex; gap:10px; justify-content:flex-end;">
                            <button onclick="document.getElementById('edit-archived-report-modal').remove()" style="padding:9px 18px; border:1px solid var(--color-border); background:var(--color-bg); color:var(--color-text); border-radius:6px; cursor:pointer; font-size:13px;">Cancelar</button>
                            <button onclick="window.Reports.recalcArchivedCosts('${reportId}')" style="padding:9px 18px; background:var(--color-info,#3498db); color:white; border:none; border-radius:6px; cursor:pointer; font-size:13px;" title="Recalcula variables, fijos y bancarias desde cost_entries local">
                                <i class="fas fa-sync-alt"></i> Recalcular Costos
                            </button>
                            <button onclick="window.Reports.saveArchivedReportEdits('${reportId}')" style="padding:9px 20px; background:var(--color-primary); color:white; border:none; border-radius:6px; cursor:pointer; font-size:13px; font-weight:600;">
                                <i class="fas fa-save"></i> Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
        } catch (error) {
            console.error('Error abriendo editor de reporte archivado:', error);
            Utils.showNotification('Error al abrir el editor: ' + error.message, 'error');
        }
    },

    _eaAutoCalc() {
        const g = id => parseFloat(document.getElementById(id)?.value) || 0;
        const sales = g('ea-total-sales');
        const cogs = g('ea-total-cogs');
        const comm = g('ea-total-commissions');
        const arrivals = g('ea-total-arrival-costs');
        const varCosts = g('ea-variable-costs');
        const fixedCosts = g('ea-fixed-costs');
        const bankComm = g('ea-bank-commissions');

        const grossProfit = sales - cogs - comm - arrivals;
        const totalOpCosts = varCosts + fixedCosts;
        const netProfit = grossProfit - totalOpCosts - bankComm;

        const gpEl = document.getElementById('ea-gross-profit');
        const npEl = document.getElementById('ea-net-profit');
        const opEl = document.getElementById('ea-total-operating-costs');
        if (gpEl) gpEl.value = grossProfit.toFixed(2);
        if (npEl) npEl.value = netProfit.toFixed(2);
        if (opEl) opEl.value = totalOpCosts.toFixed(2);
    },

    async recalcArchivedCosts(reportId) {
        const btn = document.querySelector('#edit-archived-report-modal button[onclick*="recalcArchivedCosts"]');
        const originalText = btn ? btn.innerHTML : '';
        try {
            if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculando…'; }

            const report = await DB.get('archived_quick_captures', reportId);
            if (!report) throw new Error('Reporte no encontrado');

            const reportDate = this.getArchivedReportDate(report);
            if (!reportDate) throw new Error('El reporte no tiene fecha');

            const targetDate = new Date(reportDate);
            const captureBranchIds = [];
            if (report.branch_id) captureBranchIds.push(report.branch_id);

            const allCosts = await DB.getAll('cost_entries') || [];

            let variableCostsDaily = 0;
            let fixedCostsProrated = 0;
            let bankCommissions = 0;

            for (const branchId of (captureBranchIds.length > 0 ? captureBranchIds : [null])) {
                let branchCosts = allCosts.filter(c => {
                    if (branchId === null) return !c.branch_id;
                    if (!c.branch_id) return false;
                    return String(c.branch_id) === String(branchId);
                });
                branchCosts = this.deduplicateCosts(branchCosts);

                // A) COSTOS FIJOS PRORRATEADOS
                const DAYS_PER_MONTH = 30;
                const daysInYear = ((targetDate.getFullYear() % 4 === 0 && targetDate.getFullYear() % 100 !== 0) || (targetDate.getFullYear() % 400 === 0)) ? 366 : 365;

                const monthlyCosts = this.deduplicateRecurringCosts(branchCosts.filter(c =>
                    c.period_type === 'monthly' &&
                    (c.recurring === true || c.recurring === 'true' || c.type === 'fijo') &&
                    c.category !== 'pago_llegadas' && c.category !== 'comisiones_bancarias'
                ));
                for (const cost of monthlyCosts) fixedCostsProrated += (parseFloat(cost.amount) || 0) / DAYS_PER_MONTH;

                const weeklyCosts = this.deduplicateRecurringCosts(branchCosts.filter(c => {
                    const costDate = new Date(c.date || c.created_at);
                    return c.period_type === 'weekly' &&
                        (c.recurring === true || c.recurring === 'true' || c.type === 'fijo') &&
                        c.category !== 'pago_llegadas' && c.category !== 'comisiones_bancarias' &&
                        targetDate.getFullYear() === costDate.getFullYear();
                }));
                for (const cost of weeklyCosts) fixedCostsProrated += (parseFloat(cost.amount) || 0) / 7;

                const annualCosts = this.deduplicateRecurringCosts(branchCosts.filter(c =>
                    (c.period_type === 'annual' || c.period_type === 'yearly') &&
                    (c.recurring === true || c.recurring === 'true' || c.type === 'fijo') &&
                    c.category !== 'pago_llegadas' && c.category !== 'comisiones_bancarias'
                ));
                for (const cost of annualCosts) fixedCostsProrated += (parseFloat(cost.amount) || 0) / daysInYear;

                // B) COSTOS VARIABLES DEL DÍA
                const isFixed = c => c.recurring === true || c.recurring === 'true' || c.type === 'fijo';
                const variableCosts = branchCosts.filter(c => {
                    const costDateStr = (c.date || c.created_at || '').split('T')[0];
                    const cat = (c.category || '').toLowerCase();
                    return costDateStr === reportDate &&
                        cat !== 'pago_llegadas' && cat !== 'comisiones_bancarias' &&
                        cat !== 'comisiones' && cat !== 'costo_ventas' && cat !== 'cogs' &&
                        !isFixed(c) &&
                        (c.period_type === 'one_time' || c.period_type === 'daily' || !c.period_type);
                });
                for (const cost of variableCosts) variableCostsDaily += (parseFloat(cost.amount) || 0);

                // C) COMISIONES BANCARIAS
                const bankCosts = branchCosts.filter(c => {
                    const costDateStr = (c.date || c.created_at || '').split('T')[0];
                    return costDateStr === reportDate && (c.category || '').toLowerCase() === 'comisiones_bancarias';
                });
                for (const cost of bankCosts) bankCommissions += (parseFloat(cost.amount) || 0);

                // D) RETIROS DE CAJA
                try {
                    const allSessions = await DB.getAll('cash_sessions') || [];
                    const daySessions = allSessions.filter(s => {
                        const sd = (s.date || s.created_at || '').split('T')[0];
                        return sd === reportDate && (!branchId || String(s.branch_id) === String(branchId));
                    });
                    const allMovements = await DB.getAll('cash_movements') || [];
                    const sessionIds = daySessions.map(s => s.id);
                    for (const m of allMovements) {
                        if (m.type === 'withdrawal' && sessionIds.includes(m.session_id)) {
                            variableCostsDaily += (parseFloat(m.amount) || 0);
                        }
                    }
                } catch (_) {}
            }

            // Fallback comisiones bancarias: 4.5% si no hay registradas
            const totalSales = parseFloat(report.total_sales_mxn) || 0;
            if (bankCommissions <= 0 && totalSales > 0) bankCommissions = totalSales * 0.045;

            const totalOpCosts = variableCostsDaily + fixedCostsProrated;

            // E) LLEGADAS: recalcular desde cost_entries(pago_llegadas) + fallback agency_arrivals
            const branchIdForArrivals = captureBranchIds[0] || null;
            let totalArrivalCosts = 0;
            try {
                totalArrivalCosts = await this.calculateArrivalCosts(reportDate, branchIdForArrivals, captureBranchIds);
            } catch (_) {}

            // Rellenar campos del modal y recalcular utilidades
            const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val.toFixed(2); };
            set('ea-variable-costs', variableCostsDaily);
            set('ea-fixed-costs', fixedCostsProrated);
            set('ea-bank-commissions', bankCommissions);
            set('ea-total-operating-costs', totalOpCosts);
            set('ea-total-arrival-costs', totalArrivalCosts);
            // _eaAutoCalc lee los campos del DOM (ya actualizados) y recalcula gross/net
            this._eaAutoCalc();

            Utils.showNotification(`Costos recalculados: Fijos $${fixedCostsProrated.toFixed(2)} | Variables $${variableCostsDaily.toFixed(2)} | Bancarias $${bankCommissions.toFixed(2)} | Llegadas $${totalArrivalCosts.toFixed(2)}`, 'success');
        } catch (error) {
            console.error('Error recalculando costos:', error);
            Utils.showNotification('Error: ' + error.message, 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = originalText; }
        }
    },

    async saveArchivedReportEdits(reportId) {
        try {
            const g = id => parseFloat(document.getElementById(id)?.value) || 0;

            const updates = {
                total_sales_mxn: g('ea-total-sales'),
                total_cogs: g('ea-total-cogs'),
                total_commissions: g('ea-total-commissions'),
                total_arrival_costs: g('ea-total-arrival-costs'),
                variable_costs_daily: g('ea-variable-costs'),
                fixed_costs_prorated: g('ea-fixed-costs'),
                bank_commissions: g('ea-bank-commissions'),
                total_operating_costs: g('ea-total-operating-costs'),
                gross_profit: g('ea-gross-profit'),
                net_profit: g('ea-net-profit'),
                manually_edited: true
            };

            // 1) Actualizar IndexedDB local con marca de recálculo manual
            const report = await DB.get('archived_quick_captures', reportId);
            if (!report) throw new Error('Reporte no encontrado en local');

            const updatedReport = {
                ...report,
                ...updates,
                recalculated_at: new Date().toISOString()
            };
            await DB.put('archived_quick_captures', updatedReport);
            console.log('✅ Reporte archivado actualizado en IndexedDB local');

            // 2) Sincronizar al servidor si hay server_id
            const serverId = report.server_id || reportId;
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(serverId));
            if (isUUID && typeof API !== 'undefined' && API.updateArchivedReport) {
                try {
                    await API.updateArchivedReport(serverId, updates);
                    console.log('✅ Reporte archivado sincronizado al servidor');
                } catch (serverError) {
                    console.warn('⚠️ Error sincronizando al servidor (guardado localmente):', serverError.message);
                    Utils.showNotification('Guardado localmente. Error de sincronización con el servidor.', 'warning');
                }
            }

            document.getElementById('edit-archived-report-modal')?.remove();
            Utils.showNotification('Reporte actualizado correctamente. El Histórico reflejará los nuevos valores.', 'success');

            // Recargar la lista de archivados
            await this.loadArchivedReports(true);
        } catch (error) {
            console.error('Error guardando edición de reporte archivado:', error);
            Utils.showNotification('Error al guardar: ' + error.message, 'error');
        }
    },

    async viewArchivedReportLegacy(reportId) {
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
                                                        <td style="padding: var(--spacing-xs); text-align: right; font-weight: 600;">$${(parseFloat(c.total) || 0).toFixed(2)} ${c.currency || ''}</td>
                                                        <td style="padding: var(--spacing-xs); text-align: right; color: var(--color-text-secondary);">$${(parseFloat(c.merchandise_cost) || 0).toFixed(2)}</td>
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
        // Prevenir múltiples ejecuciones simultáneas
            if (this.isExporting) {
            console.warn('Exportación ya en progreso, ignorando llamada duplicada');
                return;
            }

        this.isExporting = true;
        try {
            const report = await DB.get('archived_quick_captures', reportId);
            if (!report) {
                Utils.showNotification('Reporte no encontrado', 'error');
                this.isExporting = false;
                return;
            }

            const jspdfLib = Utils.checkJsPDF();
            if (!jspdfLib) {
                Utils.showNotification('jsPDF no está disponible', 'error');
                this.isExporting = false;
                return;
            }

            const { jsPDF } = jspdfLib;
            
            // Obtener datos del reporte archivado
            const captures = this.normalizeArchivedArray(report.captures);
            const selectedDate = this.getArchivedReportDate(report);
            
            // Obtener catálogos necesarios
            const sellers = await DB.getAll('catalog_sellers') || [];
            const guides = await DB.getAll('catalog_guides') || [];
            const agencies = await DB.getAll('catalog_agencies') || [];
            const branches = await DB.getAll('catalog_branches') || [];

            // Obtener llegadas del reporte archivado
            const todayArrivals = this.getArchivedReportArrivals(report);

            // Obtener tipos de cambio del reporte archivado
            const exchangeRates = report.exchange_rates || {};
            const usdRateForDisplay = parseFloat(exchangeRates.usd) || 18.0;
            const cadRateForDisplay = parseFloat(exchangeRates.cad) || 13.0;

            // Crear PDF en formato HORIZONTAL (landscape) A4 para mejor legibilidad
            const doc = new jsPDF('l', 'mm', 'a4'); // 'l' = landscape (horizontal)
            const pageWidth = doc.internal.pageSize.getWidth(); // ~297mm en horizontal
            const pageHeight = doc.internal.pageSize.getHeight(); // ~210mm en horizontal
            const margin = 12; // Margen reducido para aprovechar mejor el espacio horizontal
            let y = margin;

            // ========== HELPER: DIBUJAR TÍTULO DE SECCIÓN (homologado con exportQuickCapturePDF) ==========
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

            // ========== HEADER (homologado con exportQuickCapturePDF) ==========
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
            doc.text('Reporte de Captura Rápida', margin, 28);

            const generatedAtStr = typeof Utils !== 'undefined' && Utils.formatDate 
                ? Utils.formatDate(new Date(), 'DD/MM/YYYY HH:mm')
                : new Date().toLocaleString('es-MX');
            doc.setFontSize(9);
            doc.setTextColor(200, 215, 230);
            doc.text(generatedAtStr, pageWidth - margin, 16, { align: 'right' });

            let formattedDate = 'Sin fecha';
            if (selectedDate) {
                const reportDate = new Date(`${selectedDate}T00:00:00`);
                formattedDate = reportDate.toLocaleDateString('es-MX', {
                    year: 'numeric', month: '2-digit', day: '2-digit'
                });
            }
            const pillLabel = `Fecha del Reporte: ${formattedDate}`;
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            const pillW = doc.getStringUnitWidth(pillLabel) * 9 / doc.internal.scaleFactor + 8;
            doc.setFillColor(212, 160, 23);
            doc.rect(pageWidth - margin - pillW, 21, pillW, 9, 'F');
            doc.setTextColor(255, 255, 255);
            doc.text(pillLabel, pageWidth - margin - pillW + 4, 27);

            doc.setTextColor(0, 0, 0);
            y = 52;

            // ========== RESUMEN ==========
            // IMPORTANTE: Calcular totales desde los PAGOS ORIGINALES o desde report.totals
            const computedSummary = this.calculateCaptureCurrencyTotals(captures, usdRateForDisplay, cadRateForDisplay);
            const totals = computedSummary.totals;
            let totalQuantity = computedSummary.totalQuantity || report.total_quantity || 0;
            
            // Obtener información de sucursal(es)
            const captureBranchIdsForSummary = report.branch_ids || [...new Set(captures.map(c => c.branch_id).filter(Boolean))];
            const branchNames = captureBranchIdsForSummary.map(bid => {
                const branch = branches.find(b => b.id === bid);
                return branch ? branch.name : 'N/A';
            }).join(', ');

            // ========== RESUMEN DEL DÍA (dos columnas - homologado) ==========
            y = drawSectionTitle('RESUMEN DEL DÍA', y);

            const summaryTotalUSDOriginal = totals.USD || 0;
            const summaryTotalUSDInMXN = summaryTotalUSDOriginal * usdRateForDisplay;
            const summaryTotalCADOriginal = totals.CAD || 0;
            const summaryTotalCADInMXN = summaryTotalCADOriginal * cadRateForDisplay;
            const totalGeneralMXN = computedSummary.totalSalesMXN;

            const summaryBoxH = 42;
            const summaryMidX = pageWidth / 2;
            doc.setFillColor(248, 250, 253);
            doc.rect(margin, y, summaryMidX - margin - 4, summaryBoxH, 'F');
            doc.setDrawColor(210, 215, 220);
            doc.rect(margin, y, summaryMidX - margin - 4, summaryBoxH);
            doc.setFillColor(240, 255, 245);
            doc.rect(summaryMidX + 4, y, pageWidth - summaryMidX - margin - 4, summaryBoxH, 'F');
            doc.setDrawColor(150, 210, 170);
            doc.rect(summaryMidX + 4, y, pageWidth - summaryMidX - margin - 4, summaryBoxH);

            const sL = margin + 5;
            const vL = summaryMidX - margin - 8;
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 110);
            doc.setFont('helvetica', 'normal');
            doc.text('Sucursal(es):', sL, y + 8);
            doc.text('Fecha:', sL, y + 16);
            doc.text('Total Capturas:', sL, y + 24);
            doc.text('Total Cantidad:', sL, y + 32);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 30, 40);
            doc.setFontSize(9);
            doc.text(branchNames || 'Todas', vL, y + 8, { align: 'right' });
            doc.text(formattedDate, vL, y + 16, { align: 'right' });
            doc.text(String(captures.length), vL, y + 24, { align: 'right' });
            doc.text(String(totalQuantity), vL, y + 32, { align: 'right' });

            const sR = summaryMidX + 9;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 110);
            doc.text(`USD: $${summaryTotalUSDOriginal.toFixed(2)} = $${summaryTotalUSDInMXN.toFixed(2)} MXN`, sR, y + 8);
            doc.text(`CAD: $${summaryTotalCADOriginal.toFixed(2)} = $${summaryTotalCADInMXN.toFixed(2)} MXN`, sR, y + 16);
            doc.text(`MXN: $${(totals.MXN || 0).toFixed(2)}`, sR, y + 24);
            doc.setFontSize(7);
            doc.text(`Tipo de Cambio — USD: $${usdRateForDisplay.toFixed(2)} MXN  |  CAD: $${cadRateForDisplay.toFixed(2)} MXN`, sR, y + 32);
            doc.setFillColor(39, 174, 96);
            doc.rect(summaryMidX + 4, y + 34, pageWidth - summaryMidX - margin - 4, 8, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(255, 255, 255);
            doc.text(`TOTAL GENERAL: $${totalGeneralMXN.toFixed(2)} MXN`, sR, y + 40);
            doc.setTextColor(0, 0, 0);

            y += summaryBoxH + 6;

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

                if (y + 40 > pageHeight - 30) {
                    doc.addPage();
                    y = margin;
                }

                y = drawSectionTitle('LLEGADAS DEL DÍA', y);

                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                Object.values(arrivalsByAgency).forEach(group => {
                    if (y + 10 > pageHeight - 30) {
                        doc.addPage();
                        y = margin;
                    }
                    doc.setFillColor(240, 244, 250);
                    doc.rect(margin, y - 3, pageWidth - margin * 2, 8, 'F');
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(44, 62, 80);
                    doc.setFontSize(9);
                    doc.text(`${group.agency?.name || 'Agencia Desconocida'}: ${group.totalPassengers} pasajeros`, margin + 5, y + 2);
                    doc.setTextColor(0, 0, 0);
                    y += 9;
                    
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8);
                    group.arrivals.forEach(arrival => {
                        if (y + 6 > pageHeight - 30) {
                            doc.addPage();
                            y = margin;
                        }
                        const branch = branches.find(b => b.id === arrival.branch_id);
                        doc.setTextColor(80, 80, 90);
                        doc.text(`• ${branch?.name || 'N/A'}: ${arrival.passengers || 0} pasajeros`, margin + 10, y);
                        doc.setTextColor(0, 0, 0);
                        y += 5.5;
                    });
                    y += 3;
                });
                y += 4;
            }

            // ========== TABLA DE CAPTURAS ==========
            if (y + 30 > pageHeight - 30) {
                doc.addPage();
                y = margin;
            }

            y = drawSectionTitle('CAPTURAS REALIZADAS', y);

            const captCol1X = margin + 2;
            const captCol2X = margin + 18;
            const captCol3X = margin + 42;
            const captCol4X = margin + 66;
            const captCol5X = margin + 90;
            const captCol6X = margin + 130;
            const captCol7X = margin + 146;
            const captCol8X = margin + 158;
            const captCol9X = margin + 192;
            const captCol10X = margin + 226;
            const captCol10EndX = pageWidth - margin - 2;
            const captCol8Width = captCol9X - captCol8X - 2;
            const captCol9Width = captCol10X - captCol9X - 2;
            const captCol10Width = captCol10EndX - captCol10X - 2;

            const drawCaptureTableHeader = (yh) => {
                doc.setFillColor(44, 62, 80);
                doc.rect(margin, yh, pageWidth - margin * 2, 8, 'F');
                doc.setDrawColor(60, 80, 100);
                [captCol2X, captCol3X, captCol4X, captCol5X, captCol6X, captCol7X, captCol8X, captCol9X, captCol10X].forEach(x => {
                    doc.line(x - 1, yh, x - 1, yh + 8);
                });
                doc.setFontSize(7);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(255, 255, 255);
                doc.text('Hora', captCol1X, yh + 5.5);
                doc.text('Sucursal', captCol2X, yh + 5.5);
                doc.text('Vendedor', captCol3X, yh + 5.5);
                doc.text('Guía', captCol4X, yh + 5.5);
                doc.text('Producto', captCol5X, yh + 5.5);
                doc.text('Notas', captCol6X, yh + 5.5);
                doc.text('Cant.', captCol7X, yh + 5.5, { align: 'right' });
                doc.text('Moneda Original', captCol8X + captCol8Width / 2, yh + 5.5, { align: 'center', maxWidth: captCol8Width });
                doc.text('Total MXN', captCol9X + captCol9Width, yh + 5.5, { align: 'right', maxWidth: captCol9Width });
                doc.text('Total Original', captCol10X + captCol10Width, yh + 5.5, { align: 'right', maxWidth: captCol10Width });
                doc.setTextColor(0, 0, 0);
                return yh + 8;
            };
            y = drawCaptureTableHeader(y);

            let capturesTotalMXN = 0;
            // Filas de capturas
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
            captures.forEach((c, index) => {
                if (y + 7 > pageHeight - 30) {
                    doc.addPage();
                    y = margin;
                    y = drawCaptureTableHeader(y);
                }

                const time = c.created_at ? new Date(c.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '-';
                
                // Calcular valores originales y convertidos
                let originalAmount = 0;
                let totalMXN = parseFloat(c.total) || 0;
                const currency = c.currency || 'MXN';
                
                const capturePayments = this.normalizeCapturePayments(c);
                if (capturePayments.length > 0) {
                    let totalOriginal = 0;
                    let totalMXNFromPayments = 0;
                    capturePayments.forEach(payment => {
                        const amount = parseFloat(payment.amount) || 0;
                        const payCurrency = payment.currency || currency;
                        totalOriginal += amount;
                        if (payCurrency === 'USD') totalMXNFromPayments += amount * usdRateForDisplay;
                        else if (payCurrency === 'CAD') totalMXNFromPayments += amount * cadRateForDisplay;
                        else totalMXNFromPayments += amount;
                    });
                    originalAmount = totalOriginal;
                    totalMXN = totalMXNFromPayments;
                } else {
                    if (currency === 'USD') originalAmount = totalMXN / usdRateForDisplay;
                    else if (currency === 'CAD') originalAmount = totalMXN / cadRateForDisplay;
                    else originalAmount = totalMXN;
                }
                capturesTotalMXN += totalMXN;

                if (index % 2 === 0) {
                    doc.setFillColor(249, 250, 251);
                    doc.rect(margin, y, pageWidth - margin * 2, 7, 'F');
                }
                doc.setDrawColor(220, 225, 230);
                doc.rect(margin, y, pageWidth - margin * 2, 7);
                doc.setDrawColor(210, 215, 220);
                [captCol2X, captCol3X, captCol4X, captCol5X, captCol6X, captCol7X, captCol8X, captCol9X, captCol10X].forEach(x => {
                    doc.line(x - 1, y, x - 1, y + 7);
                });

                doc.setFontSize(7);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(60, 60, 70);
                doc.text(time, captCol1X, y + 5);
                doc.text((c.branch_name || 'N/A').substring(0, 13), captCol2X, y + 5);
                doc.text((c.seller_name || 'N/A').substring(0, 15), captCol3X, y + 5);
                doc.text((c.guide_name || '-').substring(0, 13), captCol4X, y + 5);
                doc.text((c.product || '').substring(0, 24), captCol5X, y + 5);
                doc.text((c.notes || '-').substring(0, 10), captCol6X, y + 5);
                doc.text(String(c.quantity || 1), captCol7X, y + 5, { align: 'right' });

                const currencyDisplay = `${currency !== 'MXN' ? currency : 'MXN'} $${originalAmount.toFixed(2)}`;
                doc.setTextColor(80, 80, 90);
                doc.text(currencyDisplay, captCol8X + captCol8Width / 2, y + 5, { align: 'center', maxWidth: captCol8Width });

                doc.setFont('helvetica', 'bold');
                doc.setTextColor(30, 90, 30);
                doc.text(`$${totalMXN.toFixed(2)}`, captCol9X + captCol9Width, y + 5, { align: 'right', maxWidth: captCol9Width });

                doc.setFont('helvetica', 'normal');
                doc.setTextColor(60, 60, 70);
                const origText = currency !== 'MXN' ? `$${originalAmount.toFixed(2)} ${currency}` : `$${originalAmount.toFixed(2)}`;
                doc.text(origText, captCol10X + captCol10Width, y + 5, { align: 'right', maxWidth: captCol10Width });
                doc.setTextColor(0, 0, 0);

                y += 7;
            });

            doc.setFillColor(238, 242, 255);
            doc.rect(margin, y, pageWidth - margin * 2, 8, 'F');
            doc.setDrawColor(180, 190, 220);
            doc.rect(margin, y, pageWidth - margin * 2, 8);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(44, 62, 80);
            doc.text('TOTAL', captCol1X, y + 5.5);
            doc.text(`$${capturesTotalMXN.toFixed(2)}`, captCol9X + captCol9Width, y + 5.5, { align: 'right', maxWidth: captCol9Width });
            doc.setTextColor(0, 0, 0);
            y += 10;

            // ========== COMISIONES ==========
            const sellerEntries = (report.seller_commissions || []).filter(s => parseFloat(s.total || 0) > 0);
            const guideEntries = (report.guide_commissions || []).filter(g => parseFloat(g.total || 0) > 0);

            if (sellerEntries.length > 0 || guideEntries.length > 0) {
                if (y + 30 > pageHeight - 30) { doc.addPage(); y = margin; }

                y = drawSectionTitle('COMISIONES CALCULADAS', y);

                const cC1 = margin + 2;
                const cC2 = margin + 80;
                const cC3 = margin + 120;
                const cC4 = margin + 155;
                const cC5 = margin + 190;
                const cC5End = pageWidth - margin - 2;
                const cC2W = cC3 - cC2 - 2;
                const cC3W = cC4 - cC3 - 2;
                const cC4W = cC5 - cC4 - 2;
                const cC5W = cC5End - cC5 - 2;

                const drawCommTableHeader = (label, yh) => {
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(44, 62, 80);
                    doc.text(label, cC1, yh + 4);
                    doc.setTextColor(0, 0, 0);
                    yh += 7;
                    doc.setFillColor(44, 62, 80);
                    doc.rect(margin, yh, pageWidth - margin * 2, 7, 'F');
                    doc.setDrawColor(60, 80, 100);
                    [cC2, cC3, cC4, cC5].forEach(x => doc.line(x - 1, yh, x - 1, yh + 7));
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(255, 255, 255);
                    doc.text(label.startsWith('Vendedor') ? 'Vendedor' : 'Guía', cC1, yh + 5);
                    doc.text('Total MXN', cC2 + cC2W, yh + 5, { align: 'right', maxWidth: cC2W });
                    doc.text('USD', cC3 + cC3W, yh + 5, { align: 'right', maxWidth: cC3W });
                    doc.text('MXN', cC4 + cC4W, yh + 5, { align: 'right', maxWidth: cC4W });
                    doc.text('CAD', cC5 + cC5W, yh + 5, { align: 'right', maxWidth: cC5W });
                    doc.setTextColor(0, 0, 0);
                    return yh + 7;
                };

                const drawCommRow = (name, total, comms, idx, yh) => {
                    if (idx % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(margin, yh, pageWidth - margin * 2, 7, 'F'); }
                    doc.setDrawColor(220, 225, 230);
                    doc.rect(margin, yh, pageWidth - margin * 2, 7);
                    doc.setDrawColor(210, 215, 220);
                    [cC2, cC3, cC4, cC5].forEach(x => doc.line(x - 1, yh, x - 1, yh + 7));
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8);
                    doc.setTextColor(60, 60, 70);
                    doc.text(name.substring(0, 30), cC1, yh + 5, { maxWidth: cC2 - cC1 - 5 });
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(30, 90, 30);
                    doc.text(`$${(parseFloat(total) || 0).toFixed(2)}`, cC2 + cC2W, yh + 5, { align: 'right', maxWidth: cC2W });
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(80, 80, 90);
                    doc.text(comms?.USD ? `$${(parseFloat(comms.USD) || 0).toFixed(2)}` : '-', cC3 + cC3W, yh + 5, { align: 'right', maxWidth: cC3W });
                    doc.text(comms?.MXN ? `$${(parseFloat(comms.MXN) || 0).toFixed(2)}` : '-', cC4 + cC4W, yh + 5, { align: 'right', maxWidth: cC4W });
                    doc.text(comms?.CAD ? `$${(parseFloat(comms.CAD) || 0).toFixed(2)}` : '-', cC5 + cC5W, yh + 5, { align: 'right', maxWidth: cC5W });
                    doc.setTextColor(0, 0, 0);
                    return yh + 7;
                };

                const drawCommTotal = (label, total, yh) => {
                    doc.setFillColor(232, 245, 233);
                    doc.rect(margin, yh, pageWidth - margin * 2, 7, 'F');
                    doc.setDrawColor(150, 200, 160);
                    doc.rect(margin, yh, pageWidth - margin * 2, 7);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(8);
                    doc.setTextColor(27, 100, 50);
                    doc.text(label, cC1, yh + 5);
                    doc.text(`$${(parseFloat(total) || 0).toFixed(2)}`, cC2 + cC2W, yh + 5, { align: 'right', maxWidth: cC2W });
                    doc.setTextColor(0, 0, 0);
                    return yh + 9;
                };

                if (sellerEntries.length > 0) {
                    if (y + 20 > pageHeight - 30) { doc.addPage(); y = margin; }
                    y = drawCommTableHeader('Vendedores:', y);
                    sellerEntries.forEach((s, i) => {
                        if (y + 7 > pageHeight - 30) { doc.addPage(); y = margin; y = drawCommTableHeader('Vendedores (cont.):', y); }
                        y = drawCommRow(s.seller_name || 'N/A', s.total, s.commissions, i, y);
                    });
                    if (y + 7 > pageHeight - 30) { doc.addPage(); y = margin; }
                    const totalSellerComm = sellerEntries.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
                    y = drawCommTotal('TOTAL VENDEDORES', totalSellerComm, y);
                }

                if (guideEntries.length > 0) {
                    if (y + 20 > pageHeight - 30) { doc.addPage(); y = margin; }
                    y = drawCommTableHeader('Guías:', y);
                    guideEntries.forEach((g, i) => {
                        if (y + 7 > pageHeight - 30) { doc.addPage(); y = margin; y = drawCommTableHeader('Guías (cont.):', y); }
                        y = drawCommRow(g.guide_name || 'N/A', g.total, g.commissions, i, y);
                    });
                    if (y + 7 > pageHeight - 30) { doc.addPage(); y = margin; }
                    const totalGuideComm = guideEntries.reduce((sum, g) => sum + (parseFloat(g.total) || 0), 0);
                    y = drawCommTotal('TOTAL GUÍAS', totalGuideComm, y);
                }
            }

            // ========== UTILIDADES (MARGEN BRUTO Y NETO) - homologado ==========
            const totalSalesMXNStored = parseFloat(report.total_sales_mxn || 0);
            const totalSalesMXNNum = totalSalesMXNStored > 0 ? totalSalesMXNStored : (parseFloat(computedSummary.totalSalesMXN) || 0);
            const totalCOGSNum = parseFloat(report.total_cogs || 0);
            const totalCommissionsNum = parseFloat(report.total_commissions || 0);
            const totalArrivalCostsNum = parseFloat(report.total_arrival_costs || 0);
            const totalOperatingCostsRaw = parseFloat(report.total_operating_costs || 0);
            const totalOperatingCosts = typeof totalOperatingCostsRaw === 'number' ? totalOperatingCostsRaw : parseFloat(totalOperatingCostsRaw) || 0;
            const bankCommissionsNum = parseFloat(report.bank_commissions || 0);
            const grossProfit = parseFloat(report.gross_profit || 0);
            const netProfit = parseFloat(report.net_profit || 0);
            const fixedCostsProratedNum = parseFloat(report.fixed_costs_prorated || 0);
            const grossMargin = totalSalesMXNNum > 0 ? (grossProfit / totalSalesMXNNum * 100) : 0;
            const netMargin = totalSalesMXNNum > 0 ? (netProfit / totalSalesMXNNum * 100) : 0;

            if (y + 30 > pageHeight - 30) { doc.addPage(); y = margin; }
            y = drawSectionTitle('UTILIDADES DEL DÍA', y);

            const utilTotalUSDOriginal = totals.USD || 0;
            const utilTotalCADOriginal = totals.CAD || 0;
            const utilTotalMXNOriginal = totals.MXN || 0;

            const utilBox = { left: margin + 5, right: pageWidth - margin - 5, labelX: margin + 8, valueX: pageWidth - margin - 8, lineH: 9 };
            const drawUtilRow = (label, value, yh, opts = {}) => {
                const { bold = false, color = [60, 60, 70], bgColor = null, small = false, indent = 0 } = opts;
                if (bgColor) { doc.setFillColor(...bgColor); doc.rect(margin, yh, pageWidth - margin * 2, utilBox.lineH, 'F'); }
                doc.setDrawColor(225, 228, 232);
                doc.line(margin, yh + utilBox.lineH, pageWidth - margin, yh + utilBox.lineH);
                doc.setFont('helvetica', bold ? 'bold' : 'normal');
                doc.setFontSize(small ? 8 : 9);
                doc.setTextColor(...color);
                doc.text(label, utilBox.labelX + indent, yh + 6.5);
                if (value !== null) {
                    doc.setFont('helvetica', 'bold');
                    doc.text(value, utilBox.valueX, yh + 6.5, { align: 'right' });
                }
                doc.setTextColor(0, 0, 0);
                return yh + utilBox.lineH;
            };

            const utilRows = 8 + (fixedCostsProratedNum > 0 ? 1 : 0);
            const utilBoxH = utilRows * utilBox.lineH + 4;
            doc.setFillColor(248, 255, 250);
            doc.rect(margin, y, pageWidth - margin * 2, utilBoxH, 'F');
            doc.setDrawColor(180, 215, 185);
            doc.rect(margin, y, pageWidth - margin * 2, utilBoxH);

            let currencyDetails = [];
            if (utilTotalUSDOriginal > 0) currencyDetails.push(`USD $${utilTotalUSDOriginal.toFixed(2)} × ${usdRateForDisplay.toFixed(2)}`);
            if (utilTotalMXNOriginal > 0) currencyDetails.push(`MXN $${utilTotalMXNOriginal.toFixed(2)}`);
            if (utilTotalCADOriginal > 0) currencyDetails.push(`CAD $${utilTotalCADOriginal.toFixed(2)} × ${cadRateForDisplay.toFixed(2)}`);
            y = drawUtilRow(`Ingresos:  ${currencyDetails.join('  |  ')}`, `$${totalSalesMXNNum.toFixed(2)} MXN`, y, { bold: true, color: [30, 30, 40], bgColor: [240, 250, 243] });
            y = drawUtilRow('(-) Costo Mercancía (COGS):', `$${totalCOGSNum.toFixed(2)}`, y, { indent: 8 });
            y = drawUtilRow('(-) Comisiones (Vendedores + Guías):', `$${totalCommissionsNum.toFixed(2)}`, y, { indent: 8 });

            doc.setFillColor(212, 160, 23);
            doc.rect(margin, y, pageWidth - margin * 2, 0.8, 'F');
            y += 1;
            const grossColor = grossProfit >= 0 ? [27, 110, 50] : [170, 30, 30];
            y = drawUtilRow(`= Utilidad Bruta  (${grossMargin.toFixed(1)}%)`, `$${grossProfit.toFixed(2)}`, y, { bold: true, color: grossColor, bgColor: [236, 252, 243] });

            y = drawUtilRow('(-) Costos de Llegadas:', `$${totalArrivalCostsNum.toFixed(2)}`, y, { indent: 8 });
            y = drawUtilRow('(-) Costos Operativos (Variables + Fijos):', `$${totalOperatingCosts.toFixed(2)}`, y, { indent: 8 });
            if (fixedCostsProratedNum > 0) {
                y = drawUtilRow(`    Incluye fijos prorrateados: $${fixedCostsProratedNum.toFixed(2)} (renta, luz, nómina, etc.)`, null, y, { small: true, color: [120, 120, 130], indent: 12 });
            }
            y = drawUtilRow('(-) Comisiones Bancarias:', `$${bankCommissionsNum.toFixed(2)}`, y, { indent: 8 });

            doc.setFillColor(212, 160, 23);
            doc.rect(margin, y, pageWidth - margin * 2, 0.8, 'F');
            y += 1;
            const netColor = netProfit >= 0 ? [27, 80, 160] : [170, 30, 30];
            const netBg = netProfit >= 0 ? [232, 244, 255] : [255, 235, 235];
            y = drawUtilRow(`= Utilidad Neta  (${netMargin.toFixed(1)}%)`, `$${netProfit.toFixed(2)}`, y, { bold: true, color: netColor, bgColor: netBg });

            doc.setTextColor(0, 0, 0);
            y += 6;

            // ========== FOOTER (homologado) ==========
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
                doc.text(`OPAL & CO  |  Reporte de Captura Rápida`, pageWidth - margin, pageHeight - 10, { align: 'right' });
                doc.setTextColor(0, 0, 0);
            }

            // Guardar PDF
            const todayStr = typeof Utils !== 'undefined' && Utils.formatDate 
                ? Utils.formatDate(new Date(selectedDate + 'T00:00:00'), 'YYYYMMDD')
                : selectedDate.replace(/-/g, '');
            const filename = `Captura_Rapida_${todayStr}_${Date.now()}.pdf`;
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
        // Obtener el reporte local PARA OBTENER server_id Y METADATOS
        let report = null;
        let apiId = null;
        
        try {
            report = await DB.get('archived_quick_captures', reportId);
            if (report?.server_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(report.server_id))) {
                apiId = report.server_id;
            }
        } catch (dbErr) {
            console.warn(`⚠️ Reporte local no encontrado (${reportId}), intentaré eliminar del servidor si está disponible`, dbErr);
        }
        
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
                        <strong>Esta acción se eliminar tanto del servidor como del dispositivo local.</strong>
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
                    let deletedFromServer = false;
                    let deletedFromLocal = false;
                    
                    // PASO 1: Intentar eliminar del servidor (usar server_id si está disponible)
                    if ((apiId || reportId) && typeof API !== 'undefined' && API.baseURL && API.token && typeof API.deleteArchivedReport === 'function') {
                        // Intentar primero con server_id, después con reportId local como fallback
                        const idsToTry = apiId ? [apiId, reportId] : [reportId];
                        
                        for (const idToDelete of idsToTry) {
                            try {
                                console.log(`📤 Intentando eliminar reporte del servidor (ID: ${idToDelete})...`);
                                await API.deleteArchivedReport(idToDelete);
                                console.log(`✅ Reporte eliminado del servidor: ${idToDelete}`);
                                deletedFromServer = true;
                                break; // Éxito, no reintentar con otro ID
                            } catch (apiErr) {
                                const is404 = apiErr?.status === 404 || apiErr?.message?.includes('Reporte archivado no encontrado') || apiErr?.message?.includes('no encontrado');
                                const isTimeout = apiErr?.message?.includes('timeout');
                                
                                if (is404 && idToDelete === reportId && apiId) {
                                    // El ID local no existe, intentar con server_id a continuación
                                    console.log(`ℹ️ Reporte no encontrado con ID local, probando con server_id...`);
                                    continue;
                                } else if (is404) {
                                    console.log(`ℹ️ Reporte no estaba en el servidor (ya eliminado o nunca sincronizado)`);
                                    deletedFromServer = true; // Considerar como "eliminado" si no existe
                                    break;
                                } else if (isTimeout) {
                                    console.warn(`⚠️ Timeout eliminando del servidor (${idToDelete}). Continuando con eliminación local...`);
                                    break; // No reintentar más
                                } else {
                                    console.warn(`⚠️ Error eliminando del servidor (${idToDelete}):`, apiErr?.message);
                                }
                            }
                        }
                    } else {
                        console.log('ℹ️ Sin ID de servidor o API no disponible, eliminando solo localmente...');
                    }
                    
                    // PASO 2: Siempre eliminar del local (funciona si existe)
                    try {
                        await DB.delete('archived_quick_captures', reportId);
                        console.log(`✅ Reporte eliminado del almacenamiento local: ${reportId}`);
                        deletedFromLocal = true;
                    } catch (dbErr) {
                        console.warn(`⚠️ Error eliminando del almacenamiento local:`, dbErr);
                    }
                    
                    // PASO 3: Registrar eliminación en sync_deleted_items (para futuras sincronizaciones)
                    try {
                        const deletedId = `archived_deleted_${Date.now()}_${reportId}`;
                        await DB.put('sync_deleted_items', {
                            id: deletedId,
                            entity_type: 'archived_quick_capture',
                            metadata: {
                                server_id: apiId,
                                report_id: reportId,
                                date: report?.date || report?.report_date,
                                branch_id: report?.branch_id
                            },
                            deleted_at: new Date().toISOString()
                        });
                    } catch (e) { 
                        console.warn('Error registrando eliminación en sync_deleted_items:', e); 
                    }
                    
                    if (deletedFromLocal || deletedFromServer) {
                        Utils.showNotification('✅ Reporte archivado eliminado correctamente', 'success');
                        await this.loadArchivedReports();
                    } else {
                        Utils.showNotification('⚠️ No se pudo eliminar el reporte (no encontrado)', 'warning');
                    }
                } catch (error) {
                    console.error('❌ Error eliminando reporte archivado:', error);
                    Utils.showNotification('❌ Error al eliminar: ' + error.message, 'error');
                }
                resolve();
            };
            
            document.getElementById('delete-archived-cancel-btn').onclick = () => {
                confirmModal.remove();
                resolve();
            };
        });
    },

    // Obtener la fecha LOCAL actual como YYYY-MM-DD (evita desfase de UTC)
    getLocalDateStr() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
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

    getArchivedReportDate(report) {
        if (!report) return '';
        const rawDate = report.report_date || report.date || '';
        if (!rawDate) return '';

        if (typeof rawDate === 'string') {
            return rawDate.split('T')[0];
        }

        if (rawDate instanceof Date) {
            const year = rawDate.getFullYear();
            const month = String(rawDate.getMonth() + 1).padStart(2, '0');
            const day = String(rawDate.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        return String(rawDate).split('T')[0];
    },

    normalizeArchivedArray(value) {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed : [];
            } catch (_) {
                return [];
            }
        }
        return [];
    },

    normalizeCapturePayments(capture) {
        if (!capture) return [];
        const rawPayments = capture.payments;

        if (Array.isArray(rawPayments)) return rawPayments;

        if (typeof rawPayments === 'string') {
            try {
                const parsed = JSON.parse(rawPayments);
                return Array.isArray(parsed) ? parsed : [];
            } catch (_) {
                return [];
            }
        }

        return [];
    },

    calculateCaptureCurrencyTotals(captures, usdRate = 18.0, cadRate = 13.0) {
        const normalizedCaptures = Array.isArray(captures) ? captures : [];
        const safeUsdRate = parseFloat(usdRate) || 18.0;
        const safeCadRate = parseFloat(cadRate) || 13.0;

        const totals = { USD: 0, MXN: 0, CAD: 0 };
        let totalQuantity = 0;
        let totalSalesMXN = 0;

        normalizedCaptures.forEach(capture => {
            totalQuantity += parseFloat(capture?.quantity) || 1;

            const payments = this.normalizeCapturePayments(capture);
            if (payments.length > 0) {
                payments.forEach(payment => {
                    const amount = parseFloat(payment?.amount) || 0;
                    const paymentCurrency = (payment?.currency || capture?.currency || 'MXN').toUpperCase();
                    const currency = ['USD', 'MXN', 'CAD'].includes(paymentCurrency) ? paymentCurrency : 'MXN';

                    totals[currency] = (totals[currency] || 0) + amount;
                    if (currency === 'USD') totalSalesMXN += amount * safeUsdRate;
                    else if (currency === 'CAD') totalSalesMXN += amount * safeCadRate;
                    else totalSalesMXN += amount;
                });
                return;
            }

            const captureCurrencyRaw = (capture?.currency || 'MXN').toUpperCase();
            const captureCurrency = ['USD', 'MXN', 'CAD'].includes(captureCurrencyRaw) ? captureCurrencyRaw : 'MXN';
            const captureTotal = parseFloat(capture?.total) || 0;

            if (captureCurrency === 'USD') {
                const originalAmount = parseFloat(capture?.original_amount) || (captureTotal / safeUsdRate);
                totals.USD += originalAmount;
                totalSalesMXN += originalAmount * safeUsdRate;
            } else if (captureCurrency === 'CAD') {
                const originalAmount = parseFloat(capture?.original_amount) || (captureTotal / safeCadRate);
                totals.CAD += originalAmount;
                totalSalesMXN += originalAmount * safeCadRate;
            } else {
                totals.MXN += captureTotal;
                totalSalesMXN += captureTotal;
            }
        });

        return { totals, totalQuantity, totalSalesMXN };
    },

    getArchivedReportArrivals(report) {
        const directArrivals = this.normalizeArchivedArray(report?.arrivals);
        if (directArrivals.length > 0) return directArrivals;

        const dailySummary = this.normalizeArchivedArray(report?.daily_summary);
        if (dailySummary.length === 0) return [];

        const extractedArrivals = [];
        dailySummary.forEach(day => {
            const dayArrivals = this.normalizeArchivedArray(
                day?.arrivals || day?.arrivals_json || day?.arrival_details
            );
            if (dayArrivals.length > 0) {
                extractedArrivals.push(...dayArrivals);
            }
        });

        return extractedArrivals;
    },

    getArchivedReportCompletenessScore(report) {
        const capturesCount = this.normalizeArchivedArray(report?.captures).length;
        const arrivalsCount = this.normalizeArchivedArray(report?.arrivals).length;
        const hasMetrics = report?.metrics && typeof report.metrics === 'object' ? 1 : 0;
        const hasDailySummary = this.normalizeArchivedArray(report?.daily_summary).length > 0 ? 1 : 0;
        return (capturesCount * 1000) + (arrivalsCount * 100) + (hasDailySummary * 10) + hasMetrics;
    },

    pickMostCompleteArchivedReport(existingReport, candidateReport) {
        if (!existingReport) return candidateReport;
        if (!candidateReport) return existingReport;

        const existingScore = this.getArchivedReportCompletenessScore(existingReport);
        const candidateScore = this.getArchivedReportCompletenessScore(candidateReport);

        if (candidateScore > existingScore) return candidateReport;
        if (existingScore > candidateScore) return existingReport;

        if (candidateReport.server_id && !existingReport.server_id) return candidateReport;
        if (existingReport.server_id && !candidateReport.server_id) return existingReport;

        const existingArchived = existingReport.archived_at ? new Date(existingReport.archived_at) : new Date(0);
        const candidateArchived = candidateReport.archived_at ? new Date(candidateReport.archived_at) : new Date(0);
        return candidateArchived > existingArchived ? candidateReport : existingReport;
    },

    async restoreArchivedReport(reportId) {
        try {
            const report = await DB.get('archived_quick_captures', reportId);
            if (!report) {
                Utils.showNotification('Reporte no encontrado', 'error');
                return;
            }

            const reportCaptures = this.normalizeArchivedArray(report.captures);
            const reportArrivals = this.getArchivedReportArrivals(report);

            if (reportCaptures.length === 0) {
                Utils.showNotification('Este reporte no tiene capturas para restaurar', 'warning');
                return;
            }

            // Normalizar la fecha sin desfase de zona horaria
            const normalizedReportDate = this.getArchivedReportDate(report);
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
                            Se restaurarán <strong>${reportCaptures.length}</strong> capturas del reporte del <strong>${formattedDate}</strong>.
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
                        const normalizedReportDate = this.getArchivedReportDate(report);

                        const normalizeDateStr = (value) => {
                            if (!value) return '';
                            return String(value).split('T')[0];
                        };

                        const normalizeCaptureKey = (capture) => {
                            const payments = this.normalizeCapturePayments(capture)
                                .map(p => ({
                                    method: p?.method || '',
                                    currency: p?.currency || '',
                                    amount: parseFloat(p?.amount) || 0
                                }))
                                .sort((a, b) => `${a.method}_${a.currency}_${a.amount}`.localeCompare(`${b.method}_${b.currency}_${b.amount}`));

                            return JSON.stringify({
                                date: normalizedReportDate,
                                branch_id: capture?.branch_id || null,
                                seller_id: capture?.seller_id || null,
                                guide_id: capture?.guide_id || null,
                                agency_id: capture?.agency_id || null,
                                product: String(capture?.product || '').trim().toLowerCase(),
                                quantity: parseFloat(capture?.quantity) || 0,
                                total: parseFloat(capture?.total) || 0,
                                currency: capture?.currency || 'MXN',
                                payments
                            });
                        };

                        const normalizeArrivalKey = (arrival) => JSON.stringify({
                            date: normalizedReportDate,
                            branch_id: arrival?.branch_id || report?.branch_id || null,
                            agency_id: arrival?.agency_id || null,
                            guide_id: arrival?.guide_id || null,
                            passengers: parseFloat(arrival?.passengers) || 0,
                            units: parseFloat(arrival?.units) || 0,
                            unit_type: arrival?.unit_type || null,
                            fee: parseFloat(arrival?.arrival_fee || arrival?.calculated_fee || 0) || 0
                        });
                        
                        // Verificar si ya hay capturas restauradas de este reporte para evitar duplicados
                        const existingCaptures = await DB.getAll('temp_quick_captures') || [];
                        const alreadyRestored = existingCaptures.filter(c => 
                            c.restored_from === reportId || 
                            (c.date && c.date.split('T')[0] === normalizedReportDate && c.restored_from)
                        );

                        const sameDateCaptures = existingCaptures.filter(c => {
                            const cDate = normalizeDateStr(c.original_report_date || c.date);
                            return cDate === normalizedReportDate;
                        });

                        const existingCaptureKeys = new Set(sameDateCaptures.map(c => normalizeCaptureKey(c)));
                        
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

                            // Eliminar llegadas restauradas previamente de este reporte para evitar duplicados
                            try {
                                const existingArrivals = await DB.getAll('agency_arrivals') || [];
                                const arrivalsToDelete = existingArrivals.filter(a => 
                                    a.restored_from_archived_report === reportId ||
                                    (a.date && a.date.split('T')[0] === normalizedReportDate && a.restored_from_archived_report)
                                );

                                for (const existingArrival of arrivalsToDelete) {
                                    try {
                                        await DB.delete('agency_arrivals', existingArrival.id);
                                    } catch (arrivalDeleteError) {
                                        console.warn('Error eliminando llegada restaurada duplicada:', arrivalDeleteError);
                                    }
                                }
                            } catch (arrivalCleanupError) {
                                console.warn('Error limpiando llegadas restauradas previas:', arrivalCleanupError);
                            }
                        }
                        
                        // Restaurar cada captura a temp_quick_captures PRIMERO
                        let restoredCount = 0;
                        let skippedDuplicateCaptures = 0;
                        for (const capture of reportCaptures) {
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

                                const captureKey = normalizeCaptureKey(restoredCapture);
                                if (existingCaptureKeys.has(captureKey)) {
                                    skippedDuplicateCaptures++;
                                    continue;
                                }
                                
                                await DB.put('temp_quick_captures', restoredCapture);
                                existingCaptureKeys.add(captureKey);
                                restoredCount++;
                            } catch (error) {
                                console.error('Error restaurando captura individual:', error);
                            }
                        }

                        // Restaurar llegadas archivadas para la misma fecha
                        const existingArrivals = await DB.getAll('agency_arrivals') || [];
                        const sameDateArrivals = existingArrivals.filter(a => normalizeDateStr(a.date) === normalizedReportDate);
                        const existingArrivalKeys = new Set(sameDateArrivals.map(a => normalizeArrivalKey(a)));

                        let restoredArrivalsCount = 0;
                        let skippedDuplicateArrivals = 0;
                        for (const arrival of reportArrivals) {
                            try {
                                const restoredArrival = {
                                    ...arrival,
                                    id: 'arr_restored_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9) + '_' + restoredArrivalsCount,
                                    date: normalizedReportDate,
                                    branch_id: arrival.branch_id || report.branch_id || null,
                                    restored_from_archived_report: reportId,
                                    restored_at: new Date().toISOString(),
                                    updated_at: new Date().toISOString(),
                                    sync_status: 'local'
                                };

                                const arrivalKey = normalizeArrivalKey(restoredArrival);
                                if (existingArrivalKeys.has(arrivalKey)) {
                                    skippedDuplicateArrivals++;
                                    continue;
                                }

                                await DB.put('agency_arrivals', restoredArrival);
                                existingArrivalKeys.add(arrivalKey);
                                restoredArrivalsCount++;
                            } catch (arrivalRestoreError) {
                                console.error('Error restaurando llegada individual:', arrivalRestoreError);
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
                            const duplicatesInfo = (skippedDuplicateCaptures > 0 || skippedDuplicateArrivals > 0)
                                ? ` (${skippedDuplicateCaptures} capturas y ${skippedDuplicateArrivals} llegadas duplicadas omitidas)`
                                : '';
                            Utils.showNotification(`${restoredCount} capturas y ${restoredArrivalsCount} llegadas restauradas para la fecha ${formattedDate}${duplicatesInfo}. Puedes editarlas ahora.`, 'success');
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

            const normalizedReportDate = this.getArchivedReportDate(report);
            const date = normalizedReportDate ? new Date(`${normalizedReportDate}T00:00:00`) : new Date();
            const formattedDate = date.toLocaleDateString('es-MX', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });

            const reportCaptures = this.normalizeArchivedArray(report.captures);
            const reportArrivals = this.normalizeArchivedArray(report.arrivals);

            const grossMargin = report.total_sales_mxn > 0 
                ? ((report.gross_profit || 0) / report.total_sales_mxn * 100).toFixed(2)
                : '0.00';
            const netMargin = report.total_sales_mxn > 0 
                ? ((report.net_profit || 0) / report.total_sales_mxn * 100).toFixed(2)
                : '0.00';

            let capturesHtml = '';
            if (reportCaptures.length > 0) {
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
                                ${reportCaptures.map((capture, idx) => {
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

            let arrivalsHtml = '';
            if (reportArrivals.length > 0) {
                arrivalsHtml = `
                    <div style="max-height: 320px; overflow-y: auto; margin-top: var(--spacing-md);">
                        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                            <thead style="position: sticky; top: 0; background: var(--color-bg-secondary); z-index: 10;">
                                <tr style="border-bottom: 2px solid var(--color-border-light);">
                                    <th style="padding: var(--spacing-xs); text-align: left; font-weight: 600;">Agencia</th>
                                    <th style="padding: var(--spacing-xs); text-align: left; font-weight: 600;">Guía</th>
                                    <th style="padding: var(--spacing-xs); text-align: center; font-weight: 600;">Pasajeros</th>
                                    <th style="padding: var(--spacing-xs); text-align: right; font-weight: 600;">Costo</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${reportArrivals.map((arrival, idx) => `
                                    <tr style="border-bottom: 1px solid var(--color-border-light); ${idx % 2 === 0 ? 'background: var(--color-bg-secondary);' : ''}">
                                        <td style="padding: var(--spacing-xs);">${arrival.agency_name || arrival.agency || '-'}</td>
                                        <td style="padding: var(--spacing-xs);">${arrival.guide_name || arrival.guide || '-'}</td>
                                        <td style="padding: var(--spacing-xs); text-align: center;">${parseInt(arrival.passengers || 0, 10) || 0}</td>
                                        <td style="padding: var(--spacing-xs); text-align: right; font-weight: 600;">${Utils.formatCurrency(arrival.arrival_fee || arrival.calculated_fee || 0)}</td>
                                    </tr>
                                `).join('')}
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
                                <div style="font-size: 20px; font-weight: 700; color: var(--color-primary);">${reportCaptures.length}</div>
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
                                <h4 style="margin: 0 0 var(--spacing-sm) 0; font-size: 14px; font-weight: 600; text-transform: uppercase;">Capturas (${reportCaptures.length})</h4>
                                ${capturesHtml}
                            </div>
                        ` : ''}

                        ${arrivalsHtml ? `
                            <div style="margin-top: var(--spacing-lg);">
                                <h4 style="margin: 0 0 var(--spacing-sm) 0; font-size: 14px; font-weight: 600; text-transform: uppercase;">Llegadas Archivadas (${reportArrivals.length})</h4>
                                ${arrivalsHtml}
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
                        total: parseFloat(serverCapture.total) || 0,
                        merchandise_cost: parseFloat(serverCapture.merchandise_cost) || 0,
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
                            // Actualizar in situ preservando id local (evita duplicados)
                            const toUpdate = { ...localCapture, id: existing.id, server_id: serverCapture.id };
                            await DB.put('temp_quick_captures', toUpdate);
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

            // Evitar listeners duplicados: remover anteriores antes de registrar
            API.socket.off('quick_capture_created');
            API.socket.off('quick_capture_updated');
            API.socket.off('quick_capture_deleted');
            
            // Escuchar creación de capturas
            API.socket.on('quick_capture_created', async (data) => {
                try {
                    const { capture } = data || {};
                    if (!capture || !capture.id) return;

                    // Omitir si nosotros creamos esta captura (evita duplicado por race condition)
                    const currentUserId = typeof UserManager !== 'undefined' && UserManager.currentUser ? UserManager.currentUser.id : null;
                    if (currentUserId && capture.created_by && String(capture.created_by) === String(currentUserId)) {
                        return; // Ya la tenemos; saveAllPendingCaptures la actualizará con server_id
                    }
                    
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
                        total: parseFloat(capture.total) || 0,
                        merchandise_cost: parseFloat(capture.merchandise_cost) || 0,
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
                    
                    // Verificar si ya existe localmente (por id O por server_id - evita duplicados)
                    const allLocal = await DB.getAll('temp_quick_captures') || [];
                    const existing = allLocal.find(c => c.server_id === capture.id || c.id === capture.id);
                    if (existing) {
                        // Actualizar en sitio preservando el id local (evita crear duplicado)
                        const toUpdate = { ...localCapture, id: existing.id, server_id: capture.id };
                        await DB.put('temp_quick_captures', toUpdate);
                        console.log('✅ Captura existente actualizada desde servidor');
                    } else {
                        await DB.put('temp_quick_captures', localCapture);
                        console.log('✅ Captura sincronizada desde servidor en tiempo real');
                    }
                    // Recargar solo si se modificó algo
                    const activeTab = document.querySelector('#reports-tabs .tab-btn.active')?.dataset.tab;
                    if (activeTab === 'quick-capture') {
                        await this.loadQuickCaptureData();
                        await this.loadQuickCaptureArrivals();
                    }
                    if (activeTab === 'history') {
                        await this.loadArchivedReports();
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
                        total: parseFloat(capture.total) || 0,
                        merchandise_cost: parseFloat(capture.merchandise_cost) || 0,
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
                    
                    // Actualizar en sitio preservando id local si existe (evita duplicados)
                    const allLocal = await DB.getAll('temp_quick_captures') || [];
                    const existing = allLocal.find(c => c.server_id === capture.id || c.id === capture.id);
                    const toSave = existing
                        ? { ...localCapture, id: existing.id, server_id: capture.id }
                        : localCapture;
                    await DB.put('temp_quick_captures', toSave);
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
    }
};

// Mezclar metodos en window.Reports
if (typeof window.Reports !== 'undefined') {
    Object.assign(window.Reports, ReportsQuickCapture);
} else {
    console.error('reports-quick-capture.js: window.Reports no disponible');
}
