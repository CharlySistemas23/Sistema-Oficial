// Branches Module - Gestión de Sucursales (Solo Master Admin)

const Branches = {
    initialized: false,
    branches: [],

    async init() {
        // Verificar que sea master_admin (verificar múltiples formas)
        let isMasterAdmin = false;
        
        // Verificar en UserManager.currentUser
        if (UserManager.currentUser) {
            isMasterAdmin = UserManager.currentUser.is_master_admin === true ||
                           UserManager.currentUser.isMasterAdmin === true ||
                           UserManager.currentUser.role === 'master_admin';
        }
        
        // Si no se encontró, verificar en currentEmployee
        if (!isMasterAdmin && UserManager.currentEmployee) {
            isMasterAdmin = UserManager.currentEmployee.role === 'master_admin';
        }
        
        // Si aún no se encontró, verificar en localStorage (por si el módulo se carga antes de que UserManager se actualice)
        if (!isMasterAdmin) {
            try {
                const savedUser = localStorage.getItem('current_user');
                if (savedUser) {
                    const user = JSON.parse(savedUser);
                    isMasterAdmin = user.is_master_admin === true ||
                                   user.isMasterAdmin === true ||
                                   user.role === 'master_admin';
                }
            } catch (e) {
                console.warn('Error leyendo usuario de localStorage:', e);
            }
        }
        
        // Debug: mostrar información del usuario
        console.log('🔐 Verificando permisos para módulo de sucursales:', {
            currentUser: UserManager.currentUser,
            currentEmployee: UserManager.currentEmployee,
            isMasterAdmin
        });
        
        if (!isMasterAdmin) {
            const content = document.getElementById('module-content');
            if (content) {
                content.innerHTML = `
                    <div style="padding: var(--spacing-lg); text-align: center; color: var(--color-text-secondary);">
                        <i class="fas fa-lock" style="font-size: 48px; margin-bottom: var(--spacing-md); opacity: 0.3;"></i>
                        <div style="font-size: 18px; font-weight: 600; margin-bottom: var(--spacing-sm); color: var(--color-text);">
                            No tienes permiso para gestionar sucursales
                        </div>
                        <div style="font-size: 14px; margin-top: var(--spacing-md);">
                            Solo usuarios con rol <strong>master_admin</strong> pueden acceder a este módulo.
                        </div>
                        <div style="font-size: 12px; margin-top: var(--spacing-sm); color: var(--color-text-tertiary);">
                            Usuario actual: ${UserManager.currentUser?.username || 'No identificado'}<br>
                            Rol: ${UserManager.currentUser?.role || UserManager.currentEmployee?.role || 'No asignado'}
                        </div>
                    </div>
                `;
            }
            return;
        }

        if (this.initialized) {
            await this.loadBranches();
            return;
        }

        await this.setupUI();
        await this.loadBranches();
        this.initialized = true;
    },

    async setupUI() {
        const content = document.getElementById('module-content');
        if (!content) return;

        content.innerHTML = `
            <div style="padding: var(--spacing-lg); max-width: 1600px; margin: 0 auto; width: 100%;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-lg); flex-wrap: wrap; gap: var(--spacing-md);">
                    <h2 style="margin: 0; font-size: 24px; font-weight: 700;">Gestión de Sucursales</h2>
                    <button class="btn-primary" id="add-branch-btn" style="display: flex; align-items: center; gap: var(--spacing-xs);">
                        <i class="fas fa-plus"></i> Nueva Sucursal
                    </button>
                </div>

                <div id="branches-list" style="
                    display: grid !important; 
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)) !important; 
                    gap: var(--spacing-lg) !important;
                    width: 100% !important;
                    align-items: start !important;
                    grid-auto-flow: row !important;
                ">
                    <div style="grid-column: 1 / -1; text-align: center; padding: var(--spacing-lg); color: var(--color-text-secondary);">
                        <i class="fas fa-spinner fa-spin" style="font-size: 24px; margin-bottom: var(--spacing-sm);"></i>
                        <div>Cargando sucursales...</div>
                    </div>
                </div>
            </div>
        `;

        // Event listeners
        document.getElementById('add-branch-btn')?.addEventListener('click', () => this.showAddBranchForm());
        
        // Event delegation para los botones de las tarjetas
        const listDiv = document.getElementById('branches-list');
        if (listDiv) {
            listDiv.addEventListener('click', (e) => {
                const target = e.target.closest('[data-action]');
                if (!target) return;
                
                const action = target.dataset.action;
                const branchId = target.dataset.branchId;
                
                if (action === 'edit') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showEditBranchForm(branchId);
                } else if (action === 'toggle') {
                    e.preventDefault();
                    e.stopPropagation();
                    const branch = this.branches.find(b => b.id === branchId);
                    if (branch) {
                        this.toggleBranchStatus(branchId, !branch.active);
                    }
                } else if (action === 'delete') {
                    e.preventDefault();
                    e.stopPropagation();
                    const branch = this.branches.find(b => b.id === branchId);
                    if (branch) {
                        this.deleteBranch(branchId);
                    }
                }
            });
        }
    },

    async loadBranches() {
        const listDiv = document.getElementById('branches-list');
        if (!listDiv) {
            console.warn('⚠️ branches-list no encontrado, esperando a que se cargue el UI...');
            return;
        }

        try {
            console.log('🔄 Cargando sucursales...');
            
            // Intentar cargar desde API
            if (typeof API !== 'undefined' && API.baseURL && API.token && API.getBranches) {
                try {
                    console.log('📡 Obteniendo sucursales desde API...');
                    const branchesFromAPI = await API.getBranches();
                    
                    if (!branchesFromAPI || !Array.isArray(branchesFromAPI)) {
                        console.warn('⚠️ API retornó datos inválidos:', branchesFromAPI);
                        throw new Error('Respuesta inválida del servidor');
                    }
                    
                    this.branches = branchesFromAPI;
                    console.log(`✅ ${this.branches.length} sucursales obtenidas desde API`);
                    
                    // Guardar en IndexedDB como caché
                    for (const branch of this.branches) {
                        try {
                            await DB.put('catalog_branches', branch);
                        } catch (dbError) {
                            console.warn('Error guardando sucursal en IndexedDB:', dbError);
                        }
                    }
                } catch (apiError) {
                    console.warn('❌ Error cargando sucursales desde API:', apiError);
                    console.warn('🔄 Intentando usar caché local...');
                    // Fallback a modo local
                    try {
                        this.branches = await DB.getAll('catalog_branches') || [];
                        console.log(`✅ ${this.branches.length} sucursales cargadas desde caché local`);
                    } catch (localError) {
                        console.error('❌ Error cargando desde caché local:', localError);
                        this.branches = [];
                    }
                }
            } else {
                console.warn('⚠️ API no configurada, usando modo offline');
                // Modo offline
                try {
                    this.branches = await DB.getAll('catalog_branches') || [];
                    console.log(`✅ ${this.branches.length} sucursales cargadas desde modo offline`);
                } catch (localError) {
                    console.error('❌ Error cargando desde modo offline:', localError);
                    this.branches = [];
                }
            }

            console.log(`📊 Total de sucursales a mostrar: ${this.branches.length}`);
            this.displayBranches();
        } catch (error) {
            console.error('❌ Error cargando sucursales:', error);
            listDiv.innerHTML = `
                <div style="padding: var(--spacing-md); background: rgba(239, 68, 68, 0.1); border-radius: var(--radius-md); color: var(--color-danger);">
                    <i class="fas fa-exclamation-triangle"></i> Error al cargar sucursales: ${error.message}
                    <br><small style="margin-top: var(--spacing-xs); display: block;">Verifica la consola para más detalles</small>
                </div>
            `;
        }
    },

    displayBranches() {
        const listDiv = document.getElementById('branches-list');
        if (!listDiv) return;

        if (this.branches.length === 0) {
            listDiv.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: var(--spacing-2xl); color: var(--color-text-secondary);">
                    <i class="fas fa-store" style="font-size: 64px; margin-bottom: var(--spacing-md); opacity: 0.3;"></i>
                    <div style="font-size: 18px; font-weight: 600; margin-bottom: var(--spacing-sm); color: var(--color-text);">No hay sucursales registradas</div>
                    <div style="font-size: 14px; margin-bottom: var(--spacing-lg);">Comienza creando tu primera sucursal</div>
                    <button class="btn-primary" id="add-first-branch-btn" style="display: inline-flex; align-items: center; gap: var(--spacing-xs);">
                        <i class="fas fa-plus"></i> Crear Primera Sucursal
                    </button>
                </div>
            `;
            document.getElementById('add-first-branch-btn')?.addEventListener('click', () => this.showAddBranchForm());
            return;
        }

        // Asegurar que el contenedor tenga el estilo correcto
        listDiv.style.cssText = `
            display: grid !important; 
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)) !important; 
            gap: var(--spacing-lg) !important;
            width: 100% !important;
            align-items: start !important;
            grid-auto-flow: row !important;
        `;
        
        listDiv.innerHTML = this.branches.map(branch => {
            // Escapar HTML para prevenir XSS
            const escapeHtml = (str) => {
                if (!str) return '';
                const div = document.createElement('div');
                div.textContent = str;
                return div.innerHTML;
            };
            
            const branchName = escapeHtml(branch.name || 'Sin nombre');
            const branchCode = escapeHtml(branch.code || 'N/A');
            const branchAddress = branch.address ? escapeHtml(branch.address) : '';
            const branchPhone = branch.phone ? escapeHtml(branch.phone) : '';
            const branchEmail = branch.email ? escapeHtml(branch.email) : '';
            const createdDate = branch.created_at ? Utils.formatDate(branch.created_at, 'DD/MM/YYYY') : 'N/A';
            
            return `
            <div class="branch-card" style="
                background: var(--color-bg-card);
                border: 1px solid var(--color-border-light);
                border-radius: var(--radius-md);
                padding: var(--spacing-lg);
                box-shadow: var(--shadow-sm);
                transition: all var(--transition-base);
                position: relative;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                height: 100%;
            " onmouseover="this.style.boxShadow='var(--shadow-md)'; this.style.transform='translateY(-2px)'" 
               onmouseout="this.style.boxShadow='var(--shadow-sm)'; this.style.transform='translateY(0)'">
                
                <!-- Badge de estado -->
                <div style="position: absolute; top: var(--spacing-md); right: var(--spacing-md); z-index: 10;">
                    ${branch.active ? 
                        '<span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; background: rgba(34, 197, 94, 0.1); color: #22c55e; border-radius: var(--radius-full); font-size: 11px; font-weight: 600;"><i class="fas fa-circle" style="font-size: 6px;"></i> Activa</span>' : 
                        '<span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; background: rgba(239, 68, 68, 0.1); color: #ef4444; border-radius: var(--radius-full); font-size: 11px; font-weight: 600;"><i class="fas fa-circle" style="font-size: 6px;"></i> Inactiva</span>'
                    }
                </div>
                
                <!-- Icono de sucursal -->
                <div style="width: 56px; height: 56px; border-radius: var(--radius-md); background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%); display: flex; align-items: center; justify-content: center; margin-bottom: var(--spacing-md); box-shadow: var(--shadow-sm); flex-shrink: 0;">
                    <i class="fas fa-store" style="font-size: 24px; color: white;"></i>
                </div>
                
                <!-- Nombre y código -->
                <h3 style="margin: 0 0 var(--spacing-xs) 0; font-size: 18px; font-weight: 700; color: var(--color-text); line-height: 1.3; padding-right: 80px;">
                    ${branchName}
                </h3>
                <div style="font-size: 12px; color: var(--color-text-secondary); margin-bottom: var(--spacing-md); display: flex; align-items: center; gap: var(--spacing-xs);">
                    <i class="fas fa-code" style="font-size: 10px; flex-shrink: 0;"></i>
                    <span>Código: ${branchCode}</span>
                </div>
                
                <!-- Información adicional -->
                <div style="margin-top: auto; padding-top: var(--spacing-md); border-top: 1px solid var(--color-border-light); flex-grow: 1;">
                    ${branchAddress ? `
                        <div style="display: flex; align-items: start; gap: var(--spacing-xs); margin-bottom: var(--spacing-sm); font-size: 12px; color: var(--color-text-secondary);">
                            <i class="fas fa-map-marker-alt" style="margin-top: 2px; min-width: 14px; flex-shrink: 0;"></i>
                            <span style="line-height: 1.4; word-break: break-word;">${branchAddress}</span>
                        </div>
                    ` : ''}
                    ${branchPhone ? `
                        <div style="display: flex; align-items: center; gap: var(--spacing-xs); margin-bottom: var(--spacing-sm); font-size: 12px; color: var(--color-text-secondary);">
                            <i class="fas fa-phone" style="min-width: 14px; flex-shrink: 0;"></i>
                            <span>${branchPhone}</span>
                        </div>
                    ` : ''}
                    ${branchEmail ? `
                        <div style="display: flex; align-items: center; gap: var(--spacing-xs); margin-bottom: var(--spacing-sm); font-size: 12px; color: var(--color-text-secondary);">
                            <i class="fas fa-envelope" style="min-width: 14px; flex-shrink: 0;"></i>
                            <span style="word-break: break-word;">${branchEmail}</span>
                        </div>
                    ` : ''}
                    <div style="display: flex; align-items: center; gap: var(--spacing-xs); font-size: 11px; color: var(--color-text-tertiary);">
                        <i class="fas fa-calendar" style="min-width: 14px; flex-shrink: 0;"></i>
                        <span>Creada: ${createdDate}</span>
                    </div>
                </div>
                
                <!-- Botones de acción -->
                <div style="display: flex; gap: var(--spacing-xs); margin-top: var(--spacing-md); padding-top: var(--spacing-md); border-top: 1px solid var(--color-border-light); flex-shrink: 0;">
                    <button class="btn-secondary" data-action="edit" data-branch-id="${branch.id}" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: var(--spacing-xs); padding: var(--spacing-xs) var(--spacing-sm); font-size: 12px; cursor: pointer;" title="Editar">
                        <i class="fas fa-edit"></i>
                        <span>Editar</span>
                    </button>
                    <button class="${branch.active ? 'btn-secondary' : 'btn-primary'}" data-action="toggle" data-branch-id="${branch.id}" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: var(--spacing-xs); padding: var(--spacing-xs) var(--spacing-sm); font-size: 12px; cursor: pointer;" title="${branch.active ? 'Desactivar' : 'Activar'}">
                        <i class="fas fa-${branch.active ? 'ban' : 'check'}"></i>
                        <span>${branch.active ? 'Desactivar' : 'Activar'}</span>
                    </button>
                    ${branch.code !== 'MAIN' ? `
                    <button class="btn-danger" data-action="delete" data-branch-id="${branch.id}" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: var(--spacing-xs); padding: var(--spacing-xs) var(--spacing-sm); font-size: 12px; cursor: pointer; background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2);" title="Eliminar" onmouseover="this.style.background='rgba(239, 68, 68, 0.2)'" onmouseout="this.style.background='rgba(239, 68, 68, 0.1)'">
                        <i class="fas fa-trash"></i>
                        <span>Eliminar</span>
                    </button>
                    ` : ''}
                </div>
            </div>
        `;
        }).join('');
    },

    showAddBranchForm(branch = null) {
        const isEdit = !!branch;
        
        // Remover modal existente si hay uno
        const existingModal = document.querySelector('.modal-overlay');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: var(--spacing-md);
        `;
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.cssText = `
            background: var(--color-bg-card);
            border-radius: var(--radius-md);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            width: 100%;
            max-width: 600px;
            max-height: 90vh;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            border: 1px solid var(--color-border-light);
            animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        `;
        
        modal.innerHTML = `
            <div class="modal-content" style="display: flex; flex-direction: column; width: 100%;">
                <div class="modal-header">
                    <h3>${isEdit ? 'Editar' : 'Nueva'} Sucursal</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="branch-form">
                        <div class="form-group">
                            <label>Código <span style="color: var(--color-danger);">*</span></label>
                            <input type="text" id="branch-code" class="form-input" 
                                   value="${branch?.code || ''}" 
                                   placeholder="Ej: MAIN, BRANCH1" required>
                            <small style="color: var(--color-text-secondary);">Código único para identificar la sucursal</small>
                        </div>

                        <div class="form-group">
                            <label>Nombre <span style="color: var(--color-danger);">*</span></label>
                            <input type="text" id="branch-name" class="form-input" 
                                   value="${branch?.name || ''}" 
                                   placeholder="Ej: Sucursal Principal" required>
                        </div>

                        <div class="form-group">
                            <label>Dirección</label>
                            <textarea id="branch-address" class="form-input" rows="2" 
                                      placeholder="Dirección completa">${branch?.address || ''}</textarea>
                        </div>

                        <div class="form-group">
                            <label>Teléfono</label>
                            <input type="tel" id="branch-phone" class="form-input" 
                                   value="${branch?.phone || ''}" 
                                   placeholder="Ej: 1234567890">
                        </div>

                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="branch-email" class="form-input" 
                                   value="${branch?.email || ''}" 
                                   placeholder="Ej: sucursal@empresa.com">
                        </div>

                        <div class="form-group">
                            <label style="display: flex; align-items: center; gap: var(--spacing-xs);">
                                <input type="checkbox" id="branch-active" ${branch?.active !== false ? 'checked' : ''}>
                                Sucursal activa
                            </label>
                        </div>

                        <div style="display: flex; gap: var(--spacing-sm); margin-top: var(--spacing-md);">
                            <button type="submit" class="btn-primary" style="flex: 1;">
                                <i class="fas fa-save"></i> ${isEdit ? 'Actualizar' : 'Crear'}
                            </button>
                            <button type="button" class="btn-secondary" onclick="this.closest('.modal').remove()">
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        modalOverlay.appendChild(modal);
        document.body.appendChild(modalOverlay);

        // Cerrar al hacer clic fuera del modal
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.remove();
            }
        });

        // Event listener para el formulario
        const form = modal.querySelector('#branch-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveBranch(branch?.id);
                modalOverlay.remove();
            });
        }
        
        // Cerrar con botón X
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modalOverlay.remove();
            });
        }
    },

    showEditBranchForm(branchId) {
        const branch = this.branches.find(b => b.id === branchId);
        if (!branch) {
            Utils.showNotification('Sucursal no encontrada', 'error');
            return;
        }
        this.showAddBranchForm(branch);
    },

    async deleteBranch(branchId) {
        const branch = this.branches.find(b => b.id === branchId);
        if (!branch) {
            Utils.showNotification('Sucursal no encontrada', 'error');
            return;
        }

        // No permitir eliminar la sucursal principal
        if (branch.code === 'MAIN') {
            Utils.showNotification('No se puede eliminar la sucursal principal', 'error');
            return;
        }

        // Confirmación más detallada
        const confirmMessage = `¿Estás seguro de eliminar la sucursal "${branch.name}" (${branch.code})?\n\n` +
            `⚠️ ADVERTENCIA:\n` +
            `- Esta acción NO se puede deshacer\n` +
            `- Solo se puede eliminar si la sucursal NO tiene:\n` +
            `  • Empleados asignados\n` +
            `  • Items de inventario\n` +
            `  • Ventas registradas\n\n` +
            `Si la sucursal tiene datos asociados, deberás desactivarla en lugar de eliminarla.`;

        if (!await Utils.confirm(confirmMessage)) {
            return;
        }

        try {
            // Eliminar en el servidor primero
            if (typeof API !== 'undefined' && API.baseURL && API.token && API.deleteBranch) {
                try {
                    const result = await API.deleteBranch(branchId);
                    console.log('✅ Sucursal eliminada en Railway:', result);
                } catch (apiError) {
                    // Si el error es porque tiene datos asociados, mostrar mensaje específico
                    if (apiError.message && (apiError.message.includes('datos asociados') || apiError.message.includes('dependencias'))) {
                        throw new Error('No se puede eliminar la sucursal porque tiene datos asociados (empleados, inventario o ventas). Por favor, desactívala en lugar de eliminarla.');
                    }
                    throw apiError;
                }
            } else {
                // Modo offline - agregar a cola de sincronización
                if (typeof SyncManager !== 'undefined') {
                    await SyncManager.addToQueue('branch', branchId, 'delete');
                }
            }

            // Eliminar de IndexedDB
            try {
                await DB.delete('catalog_branches', branchId);
            } catch (dbError) {
                console.warn('Error eliminando de IndexedDB (puede no existir):', dbError);
            }

            // Remover de la lista local
            this.branches = this.branches.filter(b => b.id !== branchId);

            Utils.showNotification('✅ Sucursal eliminada correctamente del servidor', 'success');
            
            // Recargar lista para asegurar sincronización
            await this.loadBranches();

            // Actualizar BranchManager
            if (typeof BranchManager !== 'undefined') {
                await BranchManager.updateBranchSelector();
            }

            // Actualizar selector de sucursales si estaba seleccionada la eliminada
            const currentBranchId = BranchManager?.getCurrentBranchId();
            if (currentBranchId === branchId) {
                // Cambiar a la sucursal principal
                const mainBranch = this.branches.find(b => b.code === 'MAIN') || this.branches[0];
                if (mainBranch && typeof BranchManager !== 'undefined') {
                    BranchManager.setCurrentBranch(mainBranch.id);
                }
            }
        } catch (error) {
            console.error('❌ Error eliminando sucursal:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Error al eliminar sucursal';
            Utils.showNotification(`❌ Error: ${errorMessage}`, 'error');
            
            // Recargar lista para mostrar estado actualizado
            await this.loadBranches();
        }
    },

    async saveBranch(branchId = null) {
        const code = document.getElementById('branch-code').value.trim();
        const name = document.getElementById('branch-name').value.trim();
        const address = document.getElementById('branch-address').value.trim();
        const phone = document.getElementById('branch-phone').value.trim();
        const email = document.getElementById('branch-email').value.trim();
        const active = document.getElementById('branch-active').checked;

        if (!code || !name) {
            Utils.showNotification('Código y nombre son requeridos', 'warning');
            return;
        }

        try {
            const branchData = { code, name, address, phone, email, active };

            if (branchId) {
                // Actualizar
                if (typeof API !== 'undefined' && API.baseURL && API.token && API.updateBranch) {
                    const updatedBranch = await API.updateBranch(branchId, branchData);
                    await DB.put('catalog_branches', updatedBranch);
                } else {
                    // Modo offline
                    const existingBranch = await DB.get('catalog_branches', branchId);
                    await DB.put('catalog_branches', { 
                        ...existingBranch, 
                        ...branchData, 
                        id: branchId,
                        updated_at: new Date().toISOString()
                    });
                    // Agregar a cola de sincronización
                    if (typeof window.SyncManager !== 'undefined') {
                        await window.SyncManager.addToQueue('branch', branchId, branchData);
                    }
                }
                Utils.showNotification('Sucursal actualizada correctamente', 'success');
            } else {
                // Crear
                let newBranch;
                if (typeof API !== 'undefined' && API.baseURL && API.token && API.createBranch) {
                    newBranch = await API.createBranch(branchData);
                    await DB.put('catalog_branches', newBranch);
                } else {
                    // Modo offline - generar ID temporal
                    newBranch = {
                        ...branchData,
                        id: 'branch_' + Date.now(),
                        created_at: new Date().toISOString()
                    };
                    await DB.put('catalog_branches', newBranch);
                    // Agregar a cola de sincronización
                    if (typeof window.SyncManager !== 'undefined') {
                        await window.SyncManager.addToQueue('branch', newBranch.id, newBranch);
                    }
                }
                Utils.showNotification('Sucursal creada correctamente', 'success');
            }

            // Cerrar modal
            document.querySelector('.modal-overlay')?.remove();

            // Recargar lista
            await this.loadBranches();

            // Actualizar BranchManager si existe
            if (typeof BranchManager !== 'undefined') {
                await BranchManager.updateBranchSelector();
            }
        } catch (error) {
            console.error('Error guardando sucursal:', error);
            Utils.showNotification(`Error: ${error.message || 'Error al guardar sucursal'}`, 'error');
        }
    },

    async toggleBranchStatus(branchId, active) {
        const branch = this.branches.find(b => b.id === branchId);
        if (!branch) {
            Utils.showNotification('Sucursal no encontrada', 'error');
            return;
        }

        if (!await Utils.confirm(`¿Estás seguro de ${active ? 'activar' : 'desactivar'} la sucursal "${branch.name}"?`)) {
            return;
        }

        try {
            const branchData = { ...branch, active };

            if (typeof API !== 'undefined' && API.baseURL && API.token && API.updateBranch) {
                await API.updateBranch(branchId, branchData);
            }
            await DB.put('catalog_branches', branchData);

            Utils.showNotification(`Sucursal ${active ? 'activada' : 'desactivada'} correctamente`, 'success');
            await this.loadBranches();

            // Actualizar BranchManager
            if (typeof BranchManager !== 'undefined') {
                await BranchManager.updateBranchSelector();
            }
        } catch (error) {
            console.error('Error cambiando estado de sucursal:', error);
            Utils.showNotification(`Error: ${error.message || 'Error al cambiar estado'}`, 'error');
        }
    }
};

// Exportar para uso global
window.Branches = Branches;
