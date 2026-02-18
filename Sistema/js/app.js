// Main Application Entry Point

const App = {
    loadingModule: null,
    moduleLoadAbort: null,
    _initInProgress: false,
    _initDone: false,
    
    // Código de acceso de empresa (configurable)
    COMPANY_ACCESS_CODE: 'OPAL2024', // Cambia este código por el que quieras
    
    async initCompanyCodeAccess() {
        // Verificar si el usuario ya está autenticado (evitar mostrar diálogos si ya hay sesión)
        if (typeof UserManager !== 'undefined' && UserManager.currentUser) {
            const codeScreen = document.getElementById('company-code-screen');
            const loginScreen = document.getElementById('login-screen');
            if (codeScreen) codeScreen.style.display = 'none';
            if (loginScreen) loginScreen.style.display = 'none';
            return;
        }
        
        // Verificar si el código ya fue validado (guardado en localStorage)
        const savedCodeHash = localStorage.getItem('company_code_validated');
        const codeInput = document.getElementById('company-code-input');
        const codeBtn = document.getElementById('company-code-btn');
        const codeScreen = document.getElementById('company-code-screen');
        const loginScreen = document.getElementById('login-screen');
        const codeError = document.getElementById('company-code-error');
        
        // Si el código ya fue validado, mostrar directamente el login
        if (savedCodeHash) {
            const expectedHash = await this.hashCode(this.COMPANY_ACCESS_CODE);
            if (savedCodeHash === expectedHash) {
                if (codeScreen) codeScreen.style.display = 'none';
                if (loginScreen) loginScreen.style.display = 'flex';
                return;
            } else {
                // Código guardado es inválido, limpiar
                localStorage.removeItem('company_code_validated');
            }
        }
        
        // Mostrar pantalla de código y ocultar login (asegurar que solo uno esté visible)
        if (codeScreen) {
            codeScreen.style.display = 'flex';
        }
        if (loginScreen) {
            loginScreen.style.display = 'none';
        }
        
        // Handler para el botón de verificar código
        if (codeBtn) {
            codeBtn.addEventListener('click', async () => {
                await this.validateCompanyCode();
            });
        }
        
        // Handler para Enter en el input
        if (codeInput) {
            codeInput.addEventListener('keypress', async (e) => {
                if (e.key === 'Enter') {
                    await this.validateCompanyCode();
                }
            });
        }
    },
    
    async validateCompanyCode() {
        const codeInput = document.getElementById('company-code-input');
        const codeScreen = document.getElementById('company-code-screen');
        const loginScreen = document.getElementById('login-screen');
        const codeError = document.getElementById('company-code-error');
        const rememberCheckbox = document.getElementById('remember-company-code');
        
        if (!codeInput) return;
        
        const enteredCode = codeInput.value.trim();
        
        if (!enteredCode) {
            if (codeError) {
                codeError.textContent = 'Por favor, ingresa el código de acceso';
                codeError.style.display = 'block';
            }
            return;
        }
        
        // Validar código
        if (enteredCode === this.COMPANY_ACCESS_CODE) {
            // Código correcto
            if (codeError) codeError.style.display = 'none';
            
            // Guardar validación si el usuario marcó "recordar"
            if (rememberCheckbox && rememberCheckbox.checked) {
                const codeHash = await this.hashCode(enteredCode);
                localStorage.setItem('company_code_validated', codeHash);
            }
            
            // Ocultar pantalla de código y mostrar login
            if (codeScreen) codeScreen.style.display = 'none';
            if (loginScreen) loginScreen.style.display = 'flex';
            
            // Enfocar el input de usuario del login
            setTimeout(() => {
                const userInput = document.getElementById('employee-barcode-input');
                if (userInput) userInput.focus();
            }, 100);
        } else {
            // Código incorrecto
            if (codeError) {
                codeError.textContent = 'Código de acceso incorrecto';
                codeError.style.display = 'block';
            }
            if (codeInput) {
                codeInput.value = '';
                codeInput.focus();
            }
        }
    },
    
    async hashCode(str) {
        // Hash simple para validación (no es criptográficamente seguro, pero suficiente para este caso)
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },
    
    async init() {
        // Evitar doble inicialización (en este proyecto se cargaba 2 veces: auto-init en app.js + init en index.html).
        if (this._initDone) return;
        if (this._initInProgress) return;
        this._initInProgress = true;
        
        // Protección: Ocultar enlace de bypass en producción
        const isProduction = window.location.hostname.includes('vercel.app') || 
                            window.location.hostname.includes('opal-co.vercel.app') ||
                            (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');
        
        if (isProduction) {
            const helpFooter = document.getElementById('login-help-footer');
            if (helpFooter) {
                helpFooter.style.display = 'none';
            }
            // Eliminar bypassLogin de la consola en producción
            setTimeout(() => {
                if (window.bypassLogin) {
                    const originalBypass = window.bypassLogin;
                    window.bypassLogin = function() {
                        console.error('⚠️ Acceso denegado: bypassLogin deshabilitado en producción');
                        if (Utils && Utils.showNotification) {
                            Utils.showNotification('Acceso no autorizado', 'error');
                        }
                    };
                }
            }, 100);
        }
        
        try {
            // Initialize database
            await DB.init();
            console.log('Database initialized');

            // Initialize API Client (si está disponible)
            if (typeof API !== 'undefined' && API.init) {
                await API.init();
                console.log('API Client initialized');
            }

            // Initialize UI
            if (typeof UI !== 'undefined' && UI.init) {
                UI.init();
                console.log('UI initialized');
            } else {
                console.error('⚠️ UI no está disponible. Verifica que js/ui.js se haya cargado correctamente.');
            }

            // Initialize Barcode Manager
            if (typeof BarcodeManager !== 'undefined') {
                BarcodeManager.init();
                console.log('Barcode manager initialized');
            } else if (typeof window.BarcodeManager !== 'undefined') {
                window.BarcodeManager.init();
                console.log('Barcode manager initialized');
            } else {
                console.warn('⚠️ BarcodeManager no está disponible. El módulo de códigos de barras puede no funcionar correctamente.');
            }

            // Initialize Sync Manager (Server sync)
            if (typeof window.SyncManager !== 'undefined') {
                await window.SyncManager.init();
                console.log('Sync manager (Server) initialized');
            }

            // Initialize User Manager (checkAuth restaura sesión si hay token; debe ir antes de código de empresa)
            if (typeof UserManager !== 'undefined' && UserManager.init) {
                await UserManager.init();
                console.log('User manager initialized');
            } else {
                console.error('⚠️ UserManager no está disponible. Verifica que js/users.js se haya cargado correctamente.');
            }

            // Inicializar sistema de código de acceso de empresa (tras UserManager para que, si hay sesión, oculte ambas pantallas)
            await this.initCompanyCodeAccess();
            
            // Actualizar estado del topbar después de inicializar todo
            setTimeout(async () => {
                if (typeof this.updateTopbarStatus === 'function') {
                    await this.updateTopbarStatus();
                }
            }, 500);

            // Initialize Global Search
            this.initGlobalSearch();
            
            // Initialize Branch Manager (gestión multisucursal)
            if (typeof BranchManager !== 'undefined') {
                await BranchManager.init();
                console.log('Branch manager initialized');
                
                // Asegurar que los botones de sucursales se actualicen después de inicializar
                // Esto es importante cuando se recarga la página y el usuario ya está autenticado
                if (UserManager.currentUser) {
                    await BranchManager.updateBranchSelector();
                }

                // Después de cargar sucursales del servidor, sincronizar las locales que no existen
                if (typeof window.SyncManager !== 'undefined' && window.SyncManager.syncLocalDataToServer) {
                    setTimeout(async () => {
                        try {
                            await window.SyncManager.syncLocalDataToServer();
                        } catch (error) {
                            console.warn('Error sincronizando datos locales:', error);
                        }
                    }, 3000); // Esperar 3 segundos para que termine la carga inicial
                }

                // Validate system configuration for multi-branch
                if (typeof BranchValidator !== 'undefined') {
                    const config = await BranchValidator.validateSystemConfig();
                    if (config.issues && config.issues.length > 0) {
                        console.warn('BranchValidator: Problemas de configuración detectados:', config.issues);
                        // Mostrar notificación solo si hay problemas críticos
                        if (!config.hasBranches || !config.hasActiveBranch) {
                            setTimeout(() => {
                                Utils.showNotification(
                                    '⚠️ Configuración multisucursal incompleta. Ve a Configuración → Catálogos → Gestionar Sucursales',
                                    'warning'
                                );
                            }, 3000);
                        }
                    }
                }
            }
            
            // Initialize Backup Manager (backups automáticos cada 5 minutos con descarga automática)
            if (typeof BackupManager !== 'undefined') {
                await BackupManager.init();
                console.log('Backup manager initialized (cada 5 minutos con descarga automática)');
            }

            // Initialize Exchange Rates Manager (actualización automática de tipos de cambio)
            if (typeof ExchangeRates !== 'undefined') {
                await ExchangeRates.init();
                console.log('Exchange rates manager initialized');
            }
            
            // Verificar usuarios existentes (sin crear automáticamente)
            setTimeout(async () => {
                try {
                    const users = await DB.getAll('users') || [];
                    if (Array.isArray(users)) {
                        console.log(`✅ ${users.length} usuarios encontrados en la base de datos`);
                    }
                } catch (error) {
                    console.error('Error verificando usuarios:', error);
                }
            }, 2000);

            // Bypass login function for debugging - DISABLED IN PRODUCTION
            window.bypassLogin = async function() {
                // Verificar si estamos en producción (Vercel)
                const isProduction = window.location.hostname.includes('vercel.app') || 
                                    window.location.hostname.includes('opal-co.vercel.app') ||
                                    window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
                
                if (isProduction) {
                    console.error('⚠️ bypassLogin está deshabilitado en producción por seguridad');
                    if (Utils && Utils.showNotification) {
                        Utils.showNotification('Acceso no autorizado. Por favor, inicia sesión correctamente.', 'error');
                    }
                    return;
                }
                
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/d085ffd8-d37f-46dc-af23-0f9fbbe46595',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:103',message:'bypassLogin llamado',data:{dbReady:!!DB.db},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
                // #endregion
                console.log('=== BYPASS LOGIN ===');
                try {
                    // Ensure database is ready
                    if (!DB.db) {
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/d085ffd8-d37f-46dc-af23-0f9fbbe46595',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:107',message:'bypassLogin DB no listo, esperando',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                        // #endregion
                        console.log('Esperando inicialización de DB...');
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }

                    // Verificar que existan usuarios - NO crear automáticamente
                    let users = await DB.getAll('users') || [];
                    if (!Array.isArray(users) || users.length === 0) {
                        console.warn('⚠️ No hay usuarios en la base de datos. Debes crear usuarios desde el módulo de Empleados.');
                        await Utils.alert('No hay usuarios. Debes crear usuarios desde el módulo de Empleados o configurar el servidor centralizado.');
                        return;
                    }

                    const user = users.find(u => u && u.active) || users[0];
                    if (!user) {
                        await Utils.alert('Error: No se pudo encontrar usuario. Recarga la página.');
                        return;
                    }

                    let employee = await DB.get('employees', user.employee_id);
                    if (!employee) {
                        console.error('Empleado no encontrado para usuario:', user.username);
                        await Utils.alert('Error: Empleado asociado al usuario no encontrado. Contacta al administrador.');
                        return;
                    }
                    
                    // Ensure employee is active
                    if (!employee.active) {
                        employee.active = true;
                        await DB.put('employees', employee);
                        console.log('Empleado activado:', employee.name);
                    }

                    UserManager.currentUser = user;
                    UserManager.currentEmployee = employee;
                    localStorage.setItem('current_user_id', user.id);
                    localStorage.setItem('current_employee_id', employee.id);

                    // Ensure branch exists
                    if (employee.branch_id) {
                        let branch = await DB.get('catalog_branches', employee.branch_id);
                        if (!branch) {
                            branch = { id: 'branch1', name: 'Tienda 1', address: '', active: true };
                            await DB.put('catalog_branches', branch);
                        }
                        localStorage.setItem('current_branch_id', branch.id);
                    }

                    // Update UI
                    if (UI) {
                        if (UI.updateUserInfo) UI.updateUserInfo(employee);
                        if (employee.branch_id && UI.updateBranchInfo) {
                            const branch = await DB.get('catalog_branches', employee.branch_id);
                            if (branch) UI.updateBranchInfo(branch);
                        }
                    }

                    // Hide login screen
                    const loginScreen = document.getElementById('login-screen');
                    if (loginScreen) {
                        loginScreen.style.display = 'none';
                    }

                    // Show dashboard
                    document.querySelectorAll('.module').forEach(mod => {
                        mod.style.display = 'none';
                    });
                    
                    const dashboard = document.getElementById('module-dashboard');
                    if (dashboard) {
                        dashboard.style.display = 'block';
                    }

                    // Update nav
                    document.querySelectorAll('.nav-item').forEach(item => {
                        item.classList.remove('active');
                        if (item.dataset.module === 'dashboard') {
                            item.classList.add('active');
                        }
                    });

                    if (UI && UI.showModule) {
                        UI.showModule('dashboard');
                    }

                    // Mostrar navegación de admin (bypassLogin siempre es admin)
                    if (UI && UI.updateAdminNavigation) {
                        UI.updateAdminNavigation(true);
                    }

                    console.log('✅ Bypass login exitoso');
                    if (Utils && Utils.showNotification) {
                        Utils.showNotification('Acceso directo exitoso', 'success');
                    }
                } catch (error) {
                    console.error('Error en bypassLogin:', error);
                    await Utils.alert('Error en acceso directo: ' + error.message + '\nAbre la consola (F12) para más detalles.');
                }
            };
            
            // Make bypassLogin available immediately
            console.log('✅ bypassLogin disponible en window.bypassLogin');

            // Función eliminada: createUsersManually
            // Los usuarios deben ser creados desde el módulo de Empleados o desde el servidor centralizado

            // Setup module load handlers
            window.addEventListener('module-loaded', (e) => {
                this.loadModule(e.detail.module);
            });

            // Setup sync button (topbar)
            document.getElementById('topbar-sync-now-btn')?.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                if (typeof window.SyncManager !== 'undefined') {
                    await window.SyncManager.syncPending();
                }
            });

            // Setup logout - solo debe activarse cuando se hace clic específicamente en el botón
            const setupLogout = () => {
                const logoutBtn = document.getElementById('logout-btn');
                if (!logoutBtn) return;
                
                // Remover listener anterior si existe
                if (logoutBtn._logoutHandler) {
                    logoutBtn.removeEventListener('click', logoutBtn._logoutHandler);
                }
                
                // Crear nuevo handler
                logoutBtn._logoutHandler = (e) => {
                    // Verificar que el clic sea específicamente en el botón o su contenido
                    const target = e.target;
                    const isLogoutBtn = target.id === 'logout-btn' || 
                                       target.closest('#logout-btn') === logoutBtn ||
                                       target.parentElement === logoutBtn ||
                                       target === logoutBtn;
                    
                    if (!isLogoutBtn) {
                        return; // No es el botón de logout, ignorar
                    }
                    
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    
                    console.log('Logout button clicked');
                    UserManager.logout();
                };
                
                logoutBtn.addEventListener('click', logoutBtn._logoutHandler, true);
            };
            
            // Configurar logout después de un pequeño delay para asegurar que el DOM esté listo
            setTimeout(setupLogout, 100);

            // Inicializar estado del topbar después de un pequeño delay
            setTimeout(async () => {
                await this.updateTopbarStatus();
            }, 500);

            // Actualizar estado del topbar periódicamente (cada 5 segundos)
            setInterval(() => {
                this.updateTopbarStatus();
            }, 5000);

            // Load demo data if needed (DESACTIVADO - usar Settings > Limpiar Datos Mock para limpiar)
            // await this.loadDemoData();
            
            // SIEMPRE cargar datos básicos del sistema (vendedores, guías, reglas de llegadas, costos)
            // Hacerlo en background para no bloquear la inicialización
            this.loadSystemData().catch(e => {
                console.error('Error cargando datos del sistema en background:', e);
            });
            
            // Inicializar ProfitCalculator para escuchar eventos
            if (typeof ProfitCalculator !== 'undefined' && ProfitCalculator.init) {
                ProfitCalculator.init();
            }
            
            // Generar nómina semanal automáticamente si es necesario
            if (typeof Costs !== 'undefined' && Costs.generateAllWeeklyPayrolls) {
                // Ejecutar en background sin bloquear la inicialización
                setTimeout(async () => {
                    try {
                        await Costs.generateAllWeeklyPayrolls();
                    } catch (error) {
                        console.error('Error generando nómina automática:', error);
                    }
                }, 2000);
            }
            
            // Verificar y corregir códigos de barras faltantes o inconsistentes
            await this.verifyAndFixBarcodes();

            console.log('Application initialized');
            this._initDone = true;
            
            // Restaurar módulo guardado si el usuario está autenticado
            if (UserManager.currentUser) {
                const savedModule = localStorage.getItem('current_module');
                const savedSubPage = localStorage.getItem('current_subpage');
                const savedSubCategory = localStorage.getItem('current_subcategory');
                const navTimestamp = localStorage.getItem('navigation_timestamp');
                
                // Validar que el estado no sea muy antiguo (más de 24 horas)
                const isStateValid = navTimestamp && (Date.now() - parseInt(navTimestamp)) < 24 * 60 * 60 * 1000;
                
                if (savedModule && isStateValid && UI && UI.showModule) {
                    // Esperar un momento para que todo esté listo
                    setTimeout(async () => {
                        // Mostrar el módulo primero
                        UI.showModule(savedModule, savedSubPage || null, savedSubCategory || null);
                        // Luego cargar los datos del módulo
                        await this.loadModule(savedModule);
                    }, 200);
                }
            }
        } catch (e) {
            console.error('Error initializing app:', e);
            if (typeof Utils !== 'undefined' && Utils.showNotification) {
                Utils.showNotification('Error al inicializar la aplicación', 'error');
            } else {
                alert('Error al inicializar la aplicación: ' + e.message);
            }
        } finally {
            this._initInProgress = false;
        }
    },

    async loadModule(moduleName) {
        // Cancelar carga anterior si existe
        if (this.loadingModule && this.loadingModule !== moduleName) {
            console.log(`Cancelando carga anterior de módulo: ${this.loadingModule}`);
            this.loadingModule = null;
            if (this.moduleLoadAbort) {
                this.moduleLoadAbort.aborted = true;
                this.moduleLoadAbort = null;
            }
        }
        
        // Si ya se está cargando este módulo, esperar a que termine
        if (this.loadingModule === moduleName) {
            console.log(`Módulo ${moduleName} ya se está cargando, esperando...`);
            return;
        }
        
        this.loadingModule = moduleName;
        const abortController = { aborted: false };
        this.moduleLoadAbort = abortController;
        
        try {
            console.log(`Loading module: ${moduleName}`);
            
            // Verificar si fue cancelado antes de continuar
            if (abortController.aborted) {
                console.log(`Carga de ${moduleName} cancelada antes de iniciar`);
                return;
            }
            
            switch (moduleName) {
                case 'dashboard':
                    if (abortController.aborted) return;
                    if (typeof Dashboard !== 'undefined') {
                        if (!Dashboard.initialized) {
                            await Dashboard.init();
                        } else {
                            if (abortController.aborted) return;
                            await Dashboard.loadDashboard();
                        }
                    } else {
                        if (abortController.aborted) return;
                        await this.loadDashboard();
                    }
                    break;
                case 'pos':
                    if (abortController.aborted) return;
                    if (typeof POS !== 'undefined') {
                        if (!POS.initialized) {
                            await POS.init();
                        } else {
                            if (abortController.aborted) return;
                            // Si ya está inicializado, recargar productos
                            await POS.loadProducts();
                        }
                    }
                    break;
                case 'inventory':
                    if (abortController.aborted) return;
                    if (typeof Inventory !== 'undefined') {
                        if (!Inventory.initialized) {
                            await Inventory.init();
                        } else {
                            if (abortController.aborted) return;
                            // Verificar si el contenido necesita ser reconfigurado
                            const content = document.getElementById('module-content');
                            if (content && (content.innerHTML.includes('Cargando módulo') || content.innerHTML.trim() === '' || !content.querySelector('#inventory-list'))) {
                                // Asegurar que el UI esté creado
                                if (typeof Inventory.setupUI === 'function') {
                                    await Inventory.setupUI();
                                }
                                await Inventory.setupEventListeners();
                            }
                            if (abortController.aborted) return;
                            // Siempre recargar los datos cuando se navega al módulo
                            if (typeof Inventory.loadInventory === 'function') {
                                await Inventory.loadInventory();
                            }
                        }
                    } else {
                        // El script inventory.js no cargó (ej. error de sintaxis "import outside module" por caché)
                        const listEl = document.getElementById('inventory-list');
                        if (listEl) {
                            listEl.innerHTML = `
                                <div style="padding: 24px; text-align: center; background: var(--color-bg-secondary); border-radius: var(--radius-lg); margin: 16px;">
                                    <p style="color: var(--color-danger); font-weight: 600; margin-bottom: 8px;">No se pudo cargar el módulo de inventario</p>
                                    <p style="color: var(--color-text-secondary); font-size: 14px; margin-bottom: 16px;">Es posible que el navegador esté usando una versión en caché. Recarga la página con <kbd>Ctrl+F5</kbd> (o <kbd>Cmd+Shift+R</kbd> en Mac) para forzar la actualización.</p>
                                    <button type="button" class="btn-primary" onclick="window.location.reload(true)">Recargar página</button>
                                </div>`;
                        }
                        console.error('Inventory no está definido. ¿inventory.js cargó correctamente? Si ves "import outside a module" en consola, recarga con Ctrl+F5.');
                    }
                    break;
                case 'tourist-report':
                    if (abortController.aborted) return;
                    // Esperar un momento para que el módulo esté disponible
                    let TouristReport = window.TouristReport;
                    let touristRetries = 0;
                    while (!TouristReport && touristRetries < 10) {
                        await Utils.delay(50);
                        TouristReport = window.TouristReport;
                        touristRetries++;
                    }
                    if (TouristReport && typeof TouristReport !== 'undefined') {
                        if (!TouristReport.initialized) {
                            await TouristReport.init();
                        } else {
                            if (abortController.aborted) return;
                            // Verificar si el contenido necesita ser reconfigurado
                            const content = document.getElementById('module-content');
                            const arrivalsContainer = content?.querySelector('#arrivals-container');
                            const needsReconfig = !content || 
                                content.innerHTML.trim() === '' || 
                                content.innerHTML.includes('Cargando módulo') || 
                                !arrivalsContainer;
                            
                            if (needsReconfig) {
                                console.log('🔄 Reconfigurando UI de Tourist Report...');
                                TouristReport.setupUI();
                                // Esperar un momento para que el DOM se actualice
                                await Utils.delay(150);
                            }
                            if (abortController.aborted) return;
                            // Llamar a displayArrivals para renderizar los datos
                            if (typeof TouristReport.displayArrivals === 'function') {
                                await TouristReport.displayArrivals();
                            } else if (typeof TouristReport.displayReport === 'function') {
                                await TouristReport.displayReport();
                            }
                        }
                    } else {
                        console.error('TouristReport module not found after retries');
                        const content = document.getElementById('module-content');
                        if (content) {
                            content.innerHTML = '<div style="padding: var(--spacing-lg); text-align: center; color: var(--color-danger);">Error: Módulo de Llegadas no disponible</div>';
                        }
                    }
                    break;
                case 'transfers':
                    if (abortController.aborted) return;
                    if (typeof Transfers !== 'undefined') {
                        if (!Transfers.initialized) {
                            await Transfers.init();
                        } else {
                            if (abortController.aborted) return;
                            await Transfers.loadTransfers();
                        }
                    }
                    break;
                case 'barcodes':
                    if (abortController.aborted) return;
                    // Esperar un momento para que el módulo esté disponible
                    let BarcodesModule = window.BarcodesModule;
                    let barcodesRetries = 0;
                    while (!BarcodesModule && barcodesRetries < 10) {
                        await Utils.delay(50);
                        BarcodesModule = window.BarcodesModule;
                        barcodesRetries++;
                    }
                    if (BarcodesModule && typeof BarcodesModule !== 'undefined' && typeof BarcodesModule.init === 'function') {
                        if (!BarcodesModule.initialized) {
                            await BarcodesModule.init();
                        } else {
                            if (abortController.aborted) return;
                            // Verificar si el contenido necesita ser reconfigurado
                            const content = document.getElementById('barcodes-content');
                            const needsReconfig = !content || 
                                content.innerHTML.trim() === '' || 
                                content.innerHTML.includes('Cargando módulo');
                            
                            if (needsReconfig) {
                                console.log('🔄 Reconfigurando UI de Barcodes...');
                                if (typeof BarcodesModule.setupUI === 'function') {
                                    BarcodesModule.setupUI();
                                }
                                await Utils.delay(150);
                            }
                            if (abortController.aborted) return;
                            // Recargar la pestaña activa si el módulo ya está inicializado
                            const activeTab = document.querySelector('#barcodes-tabs .tab-btn.active')?.dataset.tab || BarcodesModule.currentTab || 'overview';
                            if (typeof BarcodesModule.loadTab === 'function') {
                                await BarcodesModule.loadTab(activeTab);
                            } else if (typeof BarcodesModule.loadBarcodes === 'function') {
                                await BarcodesModule.loadBarcodes();
                            }
                        }
                    } else {
                        console.error('BarcodesModule not found after retries');
                        const content = document.getElementById('barcodes-content');
                        if (content) {
                            content.innerHTML = '<div style="padding: var(--spacing-lg); text-align: center; color: var(--color-danger);">Error: Módulo de Códigos de Barras no disponible</div>';
                        }
                    }
                    break;
                case 'repairs':
                    if (abortController.aborted) return;
                    // Esperar un momento para que el módulo esté disponible
                    let Repairs = window.Repairs;
                    let repairsRetries = 0;
                    while (!Repairs && repairsRetries < 10) {
                        await Utils.delay(50);
                        Repairs = window.Repairs;
                        repairsRetries++;
                    }
                    if (Repairs && typeof Repairs !== 'undefined') {
                        if (!Repairs.initialized) {
                            await Repairs.init();
                        } else {
                            if (abortController.aborted) return;
                            // Verificar si el contenido necesita ser reconfigurado
                            const content = document.getElementById('module-content');
                            const repairsList = content?.querySelector('#repairs-list');
                            const needsReconfig = !content || 
                                content.innerHTML.trim() === '' || 
                                content.innerHTML.includes('Cargando módulo') || 
                                !repairsList;
                            
                            if (needsReconfig) {
                                console.log('🔄 Reconfigurando UI de Repairs...');
                                Repairs.setupUI();
                                // Esperar un momento para que el DOM se actualice
                                await Utils.delay(150);
                            }
                            if (abortController.aborted) return;
                            // Siempre recargar los datos cuando se navega al módulo
                            if (typeof Repairs.loadRepairs === 'function') {
                                await Repairs.loadRepairs();
                            }
                        }
                    } else {
                        console.error('Repairs module not found');
                        const content = document.getElementById('module-content');
                        if (content) {
                            content.innerHTML = '<div style="padding: var(--spacing-lg); text-align: center; color: var(--color-danger);">Error: Módulo de Reparaciones no disponible</div>';
                        }
                    }
                    break;
                case 'reports':
                    if (abortController.aborted) return;
                    if (typeof Reports !== 'undefined') {
                        if (!Reports.initialized) {
                            await Reports.init();
                        } else {
                            if (abortController.aborted) return;
                            // Verificar si el contenido necesita ser reconfigurado
                            const content = document.getElementById('module-content');
                            const reportsTabs = content?.querySelector('#reports-tabs');
                            const reportsContent = content?.querySelector('#reports-content');
                            
                            // Si no hay tabs o contenido, o el contenido está vacío/blanco, reconfigurar
                            if (!content || !reportsTabs || !reportsContent || 
                                content.innerHTML.includes('Cargando módulo') || 
                                content.innerHTML.trim() === '' ||
                                reportsContent.innerHTML.trim() === '' ||
                                reportsContent.innerHTML.includes('Cargando') ||
                                reportsContent.innerHTML.includes('Cargando...')) {
                                Reports.setupUI();
                                if (abortController.aborted) return;
                                await Utils.delay(100);
                                if (abortController.aborted) return;
                                await Reports.loadCatalogs();
                                // Esperar un momento para que el DOM se actualice
                                await Utils.delay(100);
                                if (abortController.aborted) return;
                                const activeTab = document.querySelector('#reports-tabs .tab-btn.active')?.dataset.tab || 'reports';
                                await Reports.loadTab(activeTab);
                            } else {
                                if (abortController.aborted) return;
                                // Recargar la pestaña activa para asegurar que los datos estén actualizados
                                const activeTab = document.querySelector('#reports-tabs .tab-btn.active')?.dataset.tab || 'reports';
                                await Reports.loadTab(activeTab);
                            }
                        }
                    }
                    break;
                case 'costs':
                    if (abortController.aborted) return;
                    if (typeof Costs !== 'undefined') {
                        if (!Costs.initialized) {
                            await Costs.init();
                        } else {
                            if (abortController.aborted) return;
                            // Verificar si el contenido necesita ser reconfigurado
                            const content = document.getElementById('module-content');
                            if (!content || content.innerHTML.includes('Cargando módulo') || content.innerHTML.trim() === '' || !content.querySelector('#costs-tabs')) {
                                Costs.setupUI();
                                // Esperar un momento para que el DOM se actualice
                                await Utils.delay(100);
                            }
                            if (abortController.aborted) return;
                            const activeTab = document.querySelector('#costs-tabs .tab-btn.active')?.dataset.tab || 'costs';
                            await Costs.loadTab(activeTab);
                        }
                    }
                    break;
                case 'suppliers':
                    if (abortController.aborted) return;
                    
                    // Mostrar mensaje de carga
                    const content = document.getElementById('module-content');
                    if (content) {
                        content.innerHTML = '<div style="padding: var(--spacing-lg); text-align: center;"><p>Cargando módulo de Proveedores...</p></div>';
                    }
                    
                    // Esperar un momento para que el módulo esté disponible
                    let Suppliers = window.Suppliers;
                    let suppliersRetries = 0;
                    const maxSuppliersRetries = 30; // Aumentar intentos
                    
                    // Verificar si el script se cargó correctamente
                    if (!Suppliers) {
                        console.log('🔄 Esperando a que suppliers.js se cargue...');
                        while (!Suppliers && suppliersRetries < maxSuppliersRetries) {
                            await Utils.delay(150);
                            Suppliers = window.Suppliers;
                            suppliersRetries++;
                            if (suppliersRetries % 5 === 0) {
                                console.log(`   Intento ${suppliersRetries}/${maxSuppliersRetries}...`);
                            }
                        }
                    }
                    
                    if (Suppliers && typeof Suppliers !== 'undefined' && typeof Suppliers.init === 'function') {
                        console.log('✅ Suppliers module encontrado, inicializando...');
                        try {
                            if (!Suppliers.initialized) {
                                await Suppliers.init();
                            } else {
                                if (abortController.aborted) return;
                                // Verificar si el contenido necesita ser reconfigurado
                                const suppliersList = content?.querySelector('#suppliers-list');
                                const suppliersModule = content?.querySelector('.suppliers-module');
                                const needsReconfig = !content || 
                                    content.innerHTML.trim() === '' || 
                                    content.innerHTML.includes('Cargando módulo') || 
                                    !suppliersModule;
                                
                                if (needsReconfig) {
                                    console.log('🔄 Reconfigurando UI de Suppliers...');
                                    if (typeof Suppliers.setupEventListeners === 'function') {
                                        Suppliers.setupEventListeners();
                                    }
                                    // Esperar a que el DOM se actualice
                                    await Utils.delay(150);
                                }
                            }
                            
                            if (abortController.aborted) return;
                            // Siempre recargar los datos cuando se navega al módulo
                            if (typeof Suppliers.loadSuppliers === 'function') {
                                await Suppliers.loadSuppliers();
                            } else {
                                console.warn('⚠️ Suppliers.loadSuppliers no es una función');
                            }
                        } catch (initError) {
                            console.error('❌ Error inicializando Suppliers:', initError);
                            if (content) {
                                content.innerHTML = `
                                    <div style="padding: var(--spacing-lg); text-align: center;">
                                        <h3 style="color: var(--color-danger); margin-bottom: var(--spacing-md);">Error al inicializar módulo</h3>
                                        <p style="color: var(--color-text-secondary); margin-bottom: var(--spacing-md);">
                                            ${initError.message || 'Error desconocido'}
                                        </p>
                                        <button class="btn-primary" onclick="location.reload()">
                                            <i class="fas fa-sync-alt"></i> Recargar Página
                                        </button>
                                    </div>
                                `;
                            }
                        }
                    } else {
                        console.error('❌ Suppliers module not found or invalid after retries');
                        console.error('   window.Suppliers:', window.Suppliers);
                        console.error('   typeof window.Suppliers:', typeof window.Suppliers);
                        
                        // Intentar cargar el script manualmente como último recurso
                        if (!window.Suppliers) {
                            console.log('🔄 Intentando cargar suppliers.js manualmente...');
                            const script = document.createElement('script');
                            script.src = 'js/suppliers.js?v=' + Date.now();
                            script.onload = () => {
                                console.log('✅ suppliers.js cargado manualmente');
                                if (window.Suppliers) {
                                    window.Suppliers.init().then(() => {
                                        if (typeof window.Suppliers.loadSuppliers === 'function') {
                                            window.Suppliers.loadSuppliers();
                                        }
                                    });
                                }
                            };
                            script.onerror = () => {
                                console.error('❌ Error cargando suppliers.js manualmente');
                            };
                            document.head.appendChild(script);
                            await Utils.delay(1000);
                            
                            if (window.Suppliers && typeof window.Suppliers !== 'undefined') {
                                console.log('✅ Suppliers module encontrado después de carga manual');
                                try {
                                    if (!window.Suppliers.initialized) {
                                        await window.Suppliers.init();
                                    } else {
                                        await window.Suppliers.loadSuppliers();
                                    }
                                    return; // Salir exitosamente
                                } catch (e) {
                                    console.error('❌ Error después de carga manual:', e);
                                }
                            }
                        }
                        
                        // Mostrar error final
                        if (content) {
                            content.innerHTML = `
                                <div style="padding: var(--spacing-lg); text-align: center;">
                                    <h3 style="color: var(--color-danger); margin-bottom: var(--spacing-md);">Error: Módulo de Proveedores no disponible</h3>
                                    <p style="color: var(--color-text-secondary); margin-bottom: var(--spacing-md);">
                                        El módulo no se pudo cargar después de ${maxSuppliersRetries} intentos.<br>
                                        Por favor, recarga la página o verifica la consola para más detalles.
                                    </p>
                                    <button class="btn-primary" onclick="location.reload()">
                                        <i class="fas fa-sync-alt"></i> Recargar Página
                                    </button>
                                </div>
                            `;
                        }
                    }
                    break;
                case 'customers':
                    if (abortController.aborted) return;
                    // Esperar un momento para que el módulo esté disponible
                    let Customers = window.Customers;
                    let customersRetries = 0;
                    while (!Customers && customersRetries < 10) {
                        await Utils.delay(50);
                        Customers = window.Customers;
                        customersRetries++;
                    }
                    if (Customers && typeof Customers !== 'undefined') {
                        if (!Customers.initialized) {
                            await Customers.init();
                        } else {
                            if (abortController.aborted) return;
                            // Verificar si el contenido necesita ser reconfigurado
                            const content = document.getElementById('module-content');
                            const customersList = content?.querySelector('#customers-list');
                            const customersModule = content?.querySelector('.customers-module');
                            const needsReconfig = !content || 
                                content.innerHTML.trim() === '' || 
                                content.innerHTML.includes('Cargando módulo') || 
                                !customersModule;
                            
                            if (needsReconfig) {
                                console.log('🔄 Reconfigurando UI de Customers...');
                                Customers.setupEventListeners();
                                // Esperar a que el DOM se actualice
                                await Utils.delay(150);
                            }
                            if (abortController.aborted) return;
                            // Siempre recargar los datos cuando se navega al módulo
                            if (typeof Customers.loadCustomers === 'function') {
                                await Customers.loadCustomers();
                            }
                        }
                    } else {
                        console.error('Customers module not found after retries');
                        const content = document.getElementById('module-content');
                        if (content) {
                            content.innerHTML = '<div style="padding: var(--spacing-lg); text-align: center; color: var(--color-danger);">Error: Módulo de Clientes no disponible</div>';
                        }
                    }
                    break;
                case 'employees':
                    if (abortController.aborted) return;
                    // Esperar un momento para que el módulo esté disponible
                    let Employees = window.Employees;
                    let employeesRetries = 0;
                    while (!Employees && employeesRetries < 10) {
                        await Utils.delay(50);
                        Employees = window.Employees;
                        employeesRetries++;
                    }
                    if (Employees && typeof Employees !== 'undefined') {
                        if (!Employees.initialized) {
                            await Employees.init();
                            if (abortController.aborted) return;
                        } else {
                            if (abortController.aborted) return;
                            // Verificar si el contenido necesita ser reconfigurado
                            const content = document.getElementById('module-content');
                            const employeesTabs = content?.querySelector('#employees-tabs');
                            const employeesContent = content?.querySelector('#employees-content');
                            const needsReconfig = !content || 
                                content.innerHTML.trim() === '' || 
                                content.innerHTML.includes('Cargando módulo') || 
                                !employeesTabs;
                            
                            if (needsReconfig) {
                                console.log('🔄 Reconfigurando UI de Employees...');
                                if (abortController.aborted) return;
                                Employees.setupUI();
                                // Esperar a que el DOM se actualice
                                await Utils.delay(150);
                            }
                            if (abortController.aborted) return;
                            // Siempre recargar los datos cuando se navega al módulo
                            if (typeof Employees.loadEmployees === 'function') {
                                await Employees.loadEmployees();
                            } else if (typeof Employees.loadTab === 'function') {
                                const currentTab = Employees.currentTab || 'employees';
                                await Employees.loadTab(currentTab);
                            }
                        }
                    } else {
                        console.error('Employees module not found after retries');
                        const content = document.getElementById('module-content');
                        if (content) {
                            content.innerHTML = '<div style="padding: var(--spacing-lg); text-align: center; color: var(--color-danger);">Error: Módulo de Empleados no disponible</div>';
                        }
                    }
                    break;
                case 'catalogs':
                    if (abortController.aborted) return;
                    const EmployeesForCatalogs = window.Employees;
                    if (EmployeesForCatalogs && typeof EmployeesForCatalogs.setupCatalogsUI === 'function') {
                        const content = document.getElementById('module-content');
                        const needsCatalogsUI = !content || !content.querySelector('#catalogs-tabs');
                        const subPage = (typeof localStorage !== 'undefined' && localStorage.getItem('current_subpage')) || '';
                        const catalogsTab = (subPage === 'agencies' || subPage === 'sellers' || subPage === 'guides') ? subPage : (EmployeesForCatalogs.currentTab || 'sellers');
                        if (needsCatalogsUI) {
                            EmployeesForCatalogs.setupCatalogsUI();
                            if (abortController.aborted) return;
                            await Utils.delay(100);
                            EmployeesForCatalogs.currentTab = catalogsTab;
                            const tabsEl = content && content.querySelector('#catalogs-tabs');
                            if (tabsEl) {
                                tabsEl.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === catalogsTab));
                            }
                            await EmployeesForCatalogs.loadTab(catalogsTab);
                        } else {
                            EmployeesForCatalogs._catalogsContentId = 'catalogs-content';
                            EmployeesForCatalogs.currentTab = catalogsTab;
                            const tabsEl = content && content.querySelector('#catalogs-tabs');
                            if (tabsEl) {
                                tabsEl.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === catalogsTab));
                            }
                            await EmployeesForCatalogs.loadTab(catalogsTab);
                        }
                    } else {
                        const content = document.getElementById('module-content');
                        if (content) content.innerHTML = '<div style="padding: var(--spacing-lg); text-align: center; color: var(--color-text-secondary);">Módulo Catálogos no disponible</div>';
                    }
                    break;
                case 'branches':
                    if (abortController.aborted) return;
                    if (typeof Branches !== 'undefined') {
                        if (!Branches.initialized) {
                            await Branches.init();
                        } else {
                            if (abortController.aborted) return;
                            await Branches.loadBranches();
                        }
                    }
                    break;
                case 'settings':
                    if (abortController.aborted) return;
                    if (typeof Settings !== 'undefined') {
                        if (!Settings.initialized) {
                            await Settings.init();
                        } else {
                            if (abortController.aborted) return;
                            // Settings necesita reconfigurar UI si el contenido está vacío o dice "Cargando módulo"
                            const content = document.getElementById('module-content');
                            if (!content || content.innerHTML.includes('Cargando módulo') || content.innerHTML.trim() === '' || !content.querySelector('#settings-tabs')) {
                                Settings.setupUI();
                                // Esperar un momento para que el DOM se actualice
                                await Utils.delay(100);
                            }
                            if (abortController.aborted) return;
                            if (typeof Settings.loadSettings === 'function') {
                                await Settings.loadSettings();
                            }
                        }
                    }
                    break;
                case 'sync':
                    if (abortController.aborted) return;
                    if (typeof SyncUI !== 'undefined') {
                        if (!SyncUI.initialized) {
                            await SyncUI.init();
                        } else {
                            if (abortController.aborted) return;
                            // Verificar si el contenido necesita ser reconfigurado
                            const content = document.getElementById('module-content');
                            if (!content || content.innerHTML.includes('Cargando módulo') || content.innerHTML.trim() === '' || !content.querySelector('#sync-ui-container')) {
                                SyncUI.setupUI();
                                await Utils.delay(100);
                            }
                            if (abortController.aborted) return;
                            await SyncUI.loadStatus();
                        }
                    }
                    break;
                case 'cash':
                    if (abortController.aborted) return;
                    if (typeof Cash !== 'undefined') {
                        if (!Cash.initialized) {
                            await Cash.init();
                        } else {
                            if (abortController.aborted) return;
                            // Verificar si el contenido necesita ser reconfigurado
                            const content = document.getElementById('module-content');
                            const cashStatusCard = content?.querySelector('#cash-status-card');
                            const cashStatusText = content?.querySelector('#cash-status-text');
                            
                            // Si no hay elementos clave o el contenido está vacío/blanco, reconfigurar
                            if (!content || !cashStatusCard || !cashStatusText || 
                                content.innerHTML.includes('Cargando módulo') || 
                                content.innerHTML.trim() === '' ||
                                content.innerHTML.includes('Cargando') ||
                                !content.querySelector('.cash-container')) {
                                Cash.setupUI();
                                if (abortController.aborted) return;
                                await Utils.delay(150);
                                if (abortController.aborted) return;
                                Cash.setupEventListeners();
                            }
                            
                            // Siempre recargar la sesión actual para asegurar datos actualizados
                            if (abortController.aborted) return;
                            // Esperar un momento adicional para asegurar que el DOM esté listo
                            await Utils.delay(50);
                            await Cash.loadCurrentSession();
                        }
                    }
                    break;
                case 'qa':
                    // Solo permitir a administradores
                    if (typeof QA !== 'undefined') {
                        if (UserManager?.currentUser?.role === 'admin' || UserManager?.currentUser?.permissions?.includes('all')) {
                            if (!QA.initialized) {
                                await QA.init();
                            } else {
                                QA.setupUI();
                                QA.loadHistory();
                            }
                        } else {
                            console.warn('Acceso denegado al módulo QA: solo administradores');
                            Utils.showNotification('Acceso denegado: solo administradores', 'error');
                            UI.showModule('dashboard');
                        }
                    }
                    break;
                default:
                    console.warn(`Unknown module: ${moduleName}`);
            }
            
            // Verificar si fue cancelado antes de marcar como completado
            if (abortController.aborted) {
                console.log(`Carga de ${moduleName} cancelada antes de completar`);
                return;
            }
            
            console.log(`Module ${moduleName} loaded successfully`);
        } catch (e) {
            // Solo mostrar error si no fue cancelado
            if (!abortController.aborted && this.loadingModule === moduleName) {
                console.error(`Error loading module ${moduleName}:`, e);
                Utils.showNotification(`Error al cargar módulo ${moduleName}: ${e.message}`, 'error');
            }
        } finally {
            // Solo limpiar si aún estamos en el mismo módulo
            if (this.loadingModule === moduleName) {
                this.loadingModule = null;
                this.moduleLoadAbort = null;
            }
        }
    },

    async loadDashboard() {
        try {
            const today = Utils.formatDate(new Date(), 'YYYY-MM-DD');
            const yesterday = Utils.formatDate(new Date(Date.now() - 86400000), 'YYYY-MM-DD');
            const sales = await DB.getAll('sales') || [];
            const isCompleted = (s) => (typeof Utils !== 'undefined' && Utils.isSaleCompleted ? Utils.isSaleCompleted(s) : (s.status === 'completada' || s.status === 'completed'));
            const todaySales = sales.filter(s => s.created_at?.startsWith(today) && isCompleted(s));
            const yesterdaySales = sales.filter(s => s.created_at?.startsWith(yesterday) && isCompleted(s));

            // KPIs
            const totalSales = todaySales.reduce((sum, s) => sum + s.total, 0);
            const yesterdayTotal = yesterdaySales.reduce((sum, s) => sum + s.total, 0);
            const tickets = todaySales.length;
            const passengers = todaySales.reduce((sum, s) => sum + (s.passengers || 1), 0);
            // Ticket promedio = Venta Total / Número de Pasajeros / Tipo de Cambio
            const exchangeRateUsd = parseFloat((await DB.get('settings', 'exchange_rate_usd'))?.value || '20.00');
            const avgTicket = passengers > 0 ? totalSales / passengers / exchangeRateUsd : 0;
            // % de Cierre = (Número de Ventas Totales / Número de Pasajeros) * 100
            const closeRate = passengers > 0 ? (tickets / passengers) * 100 : 0;
            const salesChange = yesterdayTotal > 0 ? ((totalSales - yesterdayTotal) / yesterdayTotal * 100).toFixed(1) : 0;

            document.getElementById('kpi-sales-today').textContent = Utils.formatCurrency(totalSales);
            document.getElementById('kpi-tickets').textContent = tickets;
            document.getElementById('kpi-avg-ticket').textContent = Utils.formatCurrency(avgTicket);
            document.getElementById('kpi-close-rate').textContent = `${closeRate.toFixed(1)}%`;

            // Sales chart data (last 7 days)
            const last7Days = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date(Date.now() - i * 86400000);
                const dateStr = Utils.formatDate(date, 'YYYY-MM-DD');
                const daySales = sales.filter(s => s.created_at?.startsWith(dateStr) && isCompleted(s));
                const dayTotal = daySales.reduce((sum, s) => sum + s.total, 0);
                last7Days.push({
                    date: Utils.formatDate(date, 'DD/MM'),
                    total: dayTotal
                });
            }

            // Top products
            const productCounts = {};
            const saleItems = await DB.getAll('sale_items') || [];
            for (const sale of todaySales) {
                const items = saleItems.filter(si => si.sale_id === sale.id);
                for (const item of items) {
                    const invItem = await DB.get('inventory_items', item.item_id);
                    if (invItem) {
                        const key = invItem.name || invItem.sku;
                        productCounts[key] = (productCounts[key] || 0) + item.quantity;
                    }
                }
            }

            const topProducts = Object.entries(productCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            // Top sellers
            const sellerCounts = {};
            todaySales.forEach(sale => {
                if (sale.seller_id) {
                    sellerCounts[sale.seller_id] = (sellerCounts[sale.seller_id] || 0) + sale.total;
                }
            });

            const topSellers = Object.entries(sellerCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            const sellersList = document.getElementById('top-sellers-list');
            if (sellersList) {
                const sellers = await DB.getAll('catalog_sellers') || [];
                sellersList.innerHTML = `
                    <h3 style="margin-bottom: 15px;">Top Vendedores</h3>
                    ${topSellers.length === 0 ? '<p style="text-align: center; color: #999;">No hay ventas hoy</p>' : topSellers.map(([id, total]) => {
                        const seller = sellers.find(s => s.id === id);
                        const percentage = totalSales > 0 ? (total / totalSales * 100).toFixed(1) : 0;
                        return `<div style="padding: 12px; margin-bottom: 8px; background: var(--color-bg-secondary); border-radius: var(--radius-md); border-left: 4px solid var(--color-primary);">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <strong>${seller?.name || id}</strong>
                                    <div style="font-size: 12px; color: var(--color-text-secondary);">${percentage}% del total</div>
                                </div>
                                <div style="font-size: 18px; font-weight: 600;">${Utils.formatCurrency(total)}</div>
                            </div>
                        </div>`;
                    }).join('')}
                `;
            }

            // Add charts section
            const dashboardModule = document.getElementById('module-dashboard');
            if (dashboardModule) {
                let chartsSection = dashboardModule.querySelector('#dashboard-charts');
                if (!chartsSection) {
                    chartsSection = document.createElement('div');
                    chartsSection.id = 'dashboard-charts';
                    chartsSection.className = 'dashboard-section';
                    const topSellersDiv = dashboardModule.querySelector('#top-sellers-list').parentElement;
                    topSellersDiv.insertBefore(chartsSection, topSellersDiv.firstChild);
                }

                const maxSales = Math.max(...last7Days.map(d => d.total), 1);
                chartsSection.innerHTML = `
                    <h3>Ventas Últimos 7 Días</h3>
                    <div style="display: flex; align-items: flex-end; gap: 8px; height: 200px; margin: 20px 0; padding: 20px; background: var(--color-bg-secondary); border-radius: var(--radius-md);">
                        ${last7Days.map(day => {
                            const height = maxSales > 0 ? (day.total / maxSales * 100) : 0;
                            return `
                                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                                    <div style="flex: 1; display: flex; align-items: flex-end; width: 100%;">
                                        <div style="width: 100%; background: linear-gradient(180deg, var(--color-primary) 0%, var(--color-accent) 100%); border-radius: var(--radius-sm) var(--radius-sm) 0 0; height: ${height}%; min-height: ${day.total > 0 ? '4px' : '0'}; transition: all 0.3s;"></div>
                                    </div>
                                    <div style="font-size: 11px; color: var(--color-text-secondary); text-align: center;">
                                        <div>${day.date}</div>
                                        <div style="font-weight: 600; color: var(--color-text); margin-top: 4px;">${Utils.formatCurrency(day.total)}</div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    ${yesterdayTotal > 0 ? `
                        <div style="padding: 12px; background: ${salesChange >= 0 ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)'}; border-radius: var(--radius-md); border-left: 4px solid ${salesChange >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}; margin-bottom: 20px;">
                            <strong>Comparativa con Ayer:</strong> ${salesChange >= 0 ? '+' : ''}${salesChange}% 
                            <small style="color: var(--color-text-secondary);">(${Utils.formatCurrency(Math.abs(totalSales - yesterdayTotal))})</small>
                        </div>
                    ` : ''}
                    ${topProducts.length > 0 ? `
                        <h3 style="margin-top: 30px;">Top Productos Hoy</h3>
                        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 15px;">
                            ${topProducts.map(([name, qty]) => `
                                <div style="padding: 10px; background: var(--color-bg-secondary); border-radius: var(--radius-md); display: flex; justify-content: space-between; align-items: center;">
                                    <span><strong>${name}</strong></span>
                                    <span style="font-size: 18px; font-weight: 600; color: var(--color-primary);">${qty} unidades</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                `;
            }

            // Alerts
            const items = await DB.getAll('inventory_items') || [];
            const itemsWithoutPhoto = [];
            for (const item of items) {
                const photos = await DB.query('inventory_photos', 'item_id', item.id);
                if (photos.length === 0) {
                    itemsWithoutPhoto.push(item);
                }
            }

            const alertsList = document.getElementById('alerts-list');
            if (alertsList) {
                const alerts = [];
                if (itemsWithoutPhoto.length > 0) {
                    alerts.push(`${itemsWithoutPhoto.length} piezas sin foto`);
                }
                
                const pendingSync = await DB.count('sync_queue', 'status', 'pending');
                if (pendingSync > 0) {
                    alerts.push(`${pendingSync} elementos pendientes de sincronizar`);
                }

                const lowStockItems = items.filter(item => item.status === 'disponible' && item.price > 0).length;
                if (lowStockItems < 10) {
                    alerts.push(`Solo ${lowStockItems} piezas disponibles`);
                }

                alertsList.innerHTML = alerts.length === 0 
                    ? '<p style="text-align: center; color: var(--color-success); padding: 20px;"><i class="fas fa-check-circle"></i> Todo en orden</p>'
                    : alerts.map(alert => `<div class="alert-item"><i class="fas fa-exclamation-triangle"></i> ${alert}</div>`).join('');
            }
        } catch (e) {
            console.error('Error loading dashboard:', e);
        }
    },

    async loadSystemData() {
        // Función para cargar SIEMPRE los datos básicos del sistema (vendedores, guías, reglas, costos)
        try {
            console.log('🔄 Cargando datos básicos del sistema...');
            
            // Asegurar que DB esté inicializado
            if (!DB.db) {
                console.log('Esperando inicialización de DB...');
                await DB.init();
            }
            
            // Load catalogs (vendedores, guías, agencias, sucursales, comisiones)
            await this.loadCatalogs();
            
            // Precargar reglas de llegadas (arrival_rate_rules) si está vacío
            await this.loadArrivalRateRules();
            
            // Precargar nómina semanal
            await this.loadWeeklyPayroll();
            
            // Precargar costos fijos y variables iniciales
            await this.loadInitialCosts();
            
            console.log('✅ Datos básicos del sistema cargados');
        } catch (e) {
            console.error('Error loading system data:', e);
            // Reintentar después de un segundo (máximo 3 intentos)
            if (!this.systemDataRetries) this.systemDataRetries = 0;
            if (this.systemDataRetries < 3) {
                this.systemDataRetries++;
                setTimeout(() => this.loadSystemData(), 1000);
            } else {
                console.error('❌ Error crítico: No se pudieron cargar los datos del sistema después de 3 intentos');
                Utils.showNotification('Error al cargar datos del sistema. Por favor recarga la página.', 'error');
            }
        }
    },

    async loadDemoData() {
        // Asegurar que se carguen productos demo
        await this.loadDemoInventory();
        // Always ensure demo data is loaded (in case of issues)
        try {
            // Load catalogs
            await this.loadCatalogs();
            
            // Load employees and users
            await this.loadEmployees();
            
            // Mark as loaded
            await DB.put('settings', {
                key: 'demo_data_loaded',
                value: 'true',
                updated_at: new Date().toISOString()
            });

            console.log('Demo data loaded/verified');
            
            // Verify users exist
            const users = await DB.getAll('users') || [];
            const employees = await DB.getAll('employees') || [];
            console.log(`Users loaded: ${Array.isArray(users) ? users.length : 'ERROR'}, Employees loaded: ${Array.isArray(employees) ? employees.length : 'ERROR'}`);
            
            if (users.length === 0 || employees.length === 0) {
                console.warn('No users or employees found, recreating...');
                await this.loadEmployees();
            }
        } catch (e) {
            console.error('Error loading demo data:', e);
            // Try again
            setTimeout(() => this.loadDemoData(), 1000);
        }
    },

    async loadCatalogs() {
        // ========== SINCRONIZACIÓN BIDIRECCCIONAL DE CATÁLOGOS (OPTIMIZADA) ==========
        // PASO 1: Intentar cargar desde el servidor si hay API disponible (PARALELIZADO)
        if (typeof API !== 'undefined' && API.baseURL && API.token) {
            try {
                console.log('📥 [Catalogs] Sincronizando catálogos desde el servidor (paralelo)...');
                
                // Paralelizar todas las llamadas al servidor
                const [serverAgenciesResult, serverGuidesResult, serverSellersResult] = await Promise.allSettled([
                    typeof API.getAgencies === 'function' ? API.getAgencies() : Promise.resolve([]),
                    typeof API.getGuides === 'function' ? API.getGuides() : Promise.resolve([]),
                    typeof API.getSellers === 'function' ? API.getSellers() : Promise.resolve([])
                ]);
                
                // Procesar agencias
                if (serverAgenciesResult.status === 'fulfilled') {
                    try {
                        const serverAgencies = serverAgenciesResult.value || [];
                        console.log(`📥 [Catalogs] ${serverAgencies.length} agencias recibidas del servidor`);
                        // Procesar en batch para mejor rendimiento
                        const agencyPromises = serverAgencies.map(async (serverAgency) => {
                            const existing = await DB.get('catalog_agencies', serverAgency.id);
                            const agencyData = {
                                ...serverAgency,
                                barcode: existing?.barcode || serverAgency.barcode || Utils.generateAgencyBarcode?.(serverAgency) || `AG${serverAgency.id.substring(0, 6)}`
                            };
                            return DB.put('catalog_agencies', agencyData);
                        });
                        await Promise.all(agencyPromises);
                    } catch (e) {
                        console.warn('⚠️ Error procesando agencias:', e);
                    }
                }
                
                // Procesar guías
                if (serverGuidesResult.status === 'fulfilled') {
                    try {
                        const serverGuides = serverGuidesResult.value || [];
                        console.log(`📥 [Catalogs] ${serverGuides.length} guías recibidos del servidor`);
                        const guidePromises = serverGuides.map(async (serverGuide) => {
                            const existing = await DB.get('catalog_guides', serverGuide.id);
                            const guideData = {
                                ...serverGuide,
                                barcode: existing?.barcode || serverGuide.barcode || Utils.generateGuideBarcode?.(serverGuide) || `GU${serverGuide.id.substring(0, 6)}`
                            };
                            return DB.put('catalog_guides', guideData);
                        });
                        await Promise.all(guidePromises);
                    } catch (e) {
                        console.warn('⚠️ Error procesando guías:', e);
                    }
                }
                
                // Procesar vendedores
                if (serverSellersResult.status === 'fulfilled') {
                    try {
                        const serverSellers = serverSellersResult.value || [];
                        console.log(`📥 [Catalogs] ${serverSellers.length} vendedores recibidos del servidor`);
                        const sellerPromises = serverSellers.map(async (serverSeller) => {
                            const existing = await DB.get('catalog_sellers', serverSeller.id);
                            const sellerData = {
                                ...serverSeller,
                                barcode: existing?.barcode || serverSeller.barcode || Utils.generateSellerBarcode?.(serverSeller) || `SE${serverSeller.id.substring(0, 6)}`
                            };
                            return DB.put('catalog_sellers', sellerData);
                        });
                        await Promise.all(sellerPromises);
                    } catch (e) {
                        console.warn('⚠️ Error procesando vendedores:', e);
                    }
                }
            } catch (e) {
                console.warn('⚠️ Error general sincronizando catálogos (continuando con datos locales):', e);
            }
        }
        
        // PASO 2: Cargar datos locales como fallback (solo si no existe ya una agencia con el mismo nombre)
        // Así evitamos duplicados: servidor devuelve 7 con UUID, no insertar ag1..ag7 si ya hay TRAVELEX, etc.
        const isUUID = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ''));
        const fallbackAgencies = [
            { id: 'ag1', name: 'TRAVELEX', active: true },
            { id: 'ag2', name: 'VERANOS', active: true },
            { id: 'ag3', name: 'TANITOURS', active: true },
            { id: 'ag4', name: 'DISCOVERY', active: true },
            { id: 'ag5', name: 'TB', active: true },
            { id: 'ag6', name: 'TTF', active: true },
            { id: 'ag7', name: 'TROPICAL ADVENTURE', active: true }
        ];
        const existingAgenciesByName = new Map();
        try {
            const allExisting = await DB.getAll('catalog_agencies') || [];
            for (const a of allExisting) {
                if (a && a.name) {
                    const key = a.name.trim().toUpperCase();
                    const current = existingAgenciesByName.get(key);
                    // Preferir el que tiene UUID (viene del servidor)
                    if (!current || (isUUID(a.id) && !isUUID(current.id))) {
                        existingAgenciesByName.set(key, a);
                    }
                }
            }
        } catch (e) { /* ignore */ }

        for (const agency of fallbackAgencies) {
            try {
                const existingById = await DB.get('catalog_agencies', agency.id);
                const existingByName = existingAgenciesByName.get((agency.name || '').trim().toUpperCase());
                if (existingById) {
                    if (!existingById.barcode || Utils.isBarcodeEmpty(existingById.barcode)) {
                        existingById.barcode = Utils.generateAgencyBarcode(existingById);
                        await DB.put('catalog_agencies', existingById);
                    }
                } else if (existingByName) {
                    // Ya hay una agencia con este nombre (p. ej. del servidor con UUID): no insertar ag1..ag7
                    if (!existingByName.barcode || Utils.isBarcodeEmpty(existingByName.barcode)) {
                        existingByName.barcode = Utils.generateAgencyBarcode(existingByName);
                        await DB.put('catalog_agencies', existingByName);
                    }
                } else {
                    agency.barcode = Utils.generateAgencyBarcode(agency);
                    await DB.put('catalog_agencies', agency);
                }
            } catch (e) {
                // Already exists
            }
        }

        // PASO 2b: Limpiar duplicados por nombre (quedarse con UUID, eliminar legacy ag1..ag7 si hay mismo nombre con UUID)
        try {
            const allAgencies = await DB.getAll('catalog_agencies') || [];
            const byName = new Map();
            for (const a of allAgencies) {
                if (!a || !a.name) continue;
                const key = a.name.trim().toUpperCase();
                const prev = byName.get(key);
                if (!prev) {
                    byName.set(key, a);
                } else {
                    let keep = prev;
                    let remove = a;
                    if (isUUID(a.id) && !isUUID(prev.id)) {
                        keep = a;
                        remove = prev;
                    } else if (!isUUID(a.id) && isUUID(prev.id)) {
                        keep = prev;
                        remove = a;
                    } else {
                        keep = (new Date(a.updated_at || 0) >= new Date(prev.updated_at || 0)) ? a : prev;
                        remove = keep === a ? prev : a;
                    }
                    if (remove.id !== keep.id && !isUUID(remove.id) && /^ag\d+$/i.test(remove.id)) {
                        await DB.delete('catalog_agencies', remove.id);
                    }
                    byName.set(key, keep);
                }
            }
        } catch (e) {
            console.warn('⚠️ Limpieza de agencias duplicadas:', e);
        }

        // Sellers
        const sellers = [
            'SEBASTIAN', 'CALI', 'SAULA', 'ANDRES', 'ANGEL', 'SR ANGEL', 'RAMSES', 'ISAURA',
            'CARLOS', 'PACO', 'FRANCISCO', 'OMAR', 'PANDA', 'KARLA', 'JUAN CARLOS', 'NADIA',
            'JASON', 'ROBERTO', 'PEDRO', 'ANA', 'JOVA', 'EDITH', 'VERO', 'POCHIS',
            'RAMON', 'ALDAIR', 'CLAUDIA', 'SERGIO', 'MANUEL', 'CHAYITO', 'XIMENA', 'RENE'
        ].map((name, idx) => ({
            id: `seller_${idx + 1}`,
            name: name,
            active: true,
            commission_rule: this.getSellerCommissionRule(name)
        }));

        for (const seller of sellers) {
            try {
                const existing = await DB.get('catalog_sellers', seller.id);
                if (existing) {
                    // Si existe pero no tiene código de barras, generarlo
                    if (!existing.barcode || Utils.isBarcodeEmpty(existing.barcode)) {
                        existing.barcode = Utils.generateSellerBarcode(existing);
                        await DB.put('catalog_sellers', existing);
                    }
                } else {
                    // Nuevo registro: generar código de barras
                    seller.barcode = Utils.generateSellerBarcode(seller);
                    await DB.put('catalog_sellers', seller);
                }
            } catch (e) {
                // Already exists
            }
        }

        // Guides (by agency)
        const guidesData = {
            'ag2': ['CARLOS SIS', 'MARIO RENDON', 'CHAVA', 'FREDY', 'NETO', 'EMMANUEL'],
            'ag3': ['MARINA', 'GLORIA', 'DANIELA'],
            'ag4': ['RAMON', 'GUSTAVO SIS', 'GUSTAVO LEPE', 'NOVOA', 'ERIK', 'CHILO', 'FERMIN', 'EMMA', 'HERASMO'],
            'ag1': ['MIGUEL SUAREZ', 'SANTA', 'MIGUEL DELGADILLO', 'ANDRES CHAVEZ', 'SAREM', 'ZAVALA', 'TEMO', 'ROCIO', 'NETO', 'SEBASTIAN S'],
            'ag5': ['MIGUEL IBARRA', 'ADAN', 'MIGUEL RAGA', 'GABINO', 'HECTOR SUAREZ', 'OSCAR', 'JOSE AVILES'],
            'ag6': ['HUGO', 'HILBERTO', 'JOSE MASIAS', 'DAVID BUSTOS', 'ALFONSO', 'DANIEL RIVERA', 'EDUARDO LEAL'],
            'ag7': ['NANCY', 'JAVIER', 'GINA', 'LUKE', 'JULIAN', 'GEOVANNY', 'NEYRA', 'ROGER']
        };

        let guideIdx = 1;
        for (const [agencyId, guideNames] of Object.entries(guidesData)) {
            for (const name of guideNames) {
                try {
                    const guideId = `guide_${guideIdx++}`;
                    const guideData = {
                        id: guideId,
                        name: name,
                        agency_id: agencyId,
                        active: true,
                        commission_rule: name === 'MARINA' ? 'guide_marina' : 'guide_default'
                    };
                    const existing = await DB.get('catalog_guides', guideId);
                    if (existing) {
                        // Si existe pero no tiene código de barras, generarlo
                        if (!existing.barcode || Utils.isBarcodeEmpty(existing.barcode)) {
                            existing.barcode = Utils.generateGuideBarcode(existing);
                            await DB.put('catalog_guides', existing);
                        }
                    } else {
                        // Nuevo registro: generar código de barras
                        guideData.barcode = Utils.generateGuideBarcode(guideData);
                        await DB.put('catalog_guides', guideData);
                    }
                } catch (e) {
                    // Already exists
                }
            }
        }

        // Intentar sincronizar TROPICAL ADVENTURE con Railway si hay API disponible
        if (typeof API !== 'undefined' && API.baseURL && API.token) {
            try {
                await this.syncTropicalAdventureToAPI();
            } catch (e) {
                // No bloquear carga de catálogos si falla la sincronización
                console.warn('No se pudo sincronizar TROPICAL ADVENTURE con API (continuando con modo local):', e);
            }
        }

        // Branches
        // IMPORTANTE: si hay API, NO sembrar sucursales fake (branch1/2/3/4). El backend usa UUID.
        try {
            if (typeof API !== 'undefined' && API.baseURL && API.token && typeof API.getBranches === 'function') {
                const branchesFromAPI = await API.getBranches();
                if (Array.isArray(branchesFromAPI) && branchesFromAPI.length > 0) {
                    for (const b of branchesFromAPI) {
                        await DB.put('catalog_branches', b, { autoBranchId: false });
                    }
                    // Limpiar legacy branches si existen
                    const legacy = await DB.getAll('catalog_branches') || [];
                    for (const lb of legacy) {
                        if (lb?.id && /^branch\d+$/i.test(String(lb.id))) {
                            try { await DB.delete('catalog_branches', lb.id); } catch (e) {}
                        }
                    }
                }
            } else {
                // Fallback offline/demo
        const branches = [
                    { id: 'branch1', code: 'LVALLARTA', name: 'L Vallarta', address: '', active: true },
                    { id: 'branch2', code: 'MALECON', name: 'Malecón', address: '', active: true },
                    { id: 'branch3', code: 'SANSEBASTIAN', name: 'San Sebastián', address: '', active: true },
                    { id: 'branch4', code: 'SAYULITA', name: 'Sayulita', address: '', active: true }
        ];
        for (const branch of branches) {
            try {
                        await DB.put('catalog_branches', branch, { autoBranchId: false });
            } catch (e) {
                // Already exists
            }
                }
            }
        } catch (e) {
            // No bloquear carga de catálogos si falla branches
        }

        // Payment Methods
        const paymentMethods = [
            { id: 'pm1', name: 'Efectivo USD', code: 'CASH_USD', active: true },
            { id: 'pm2', name: 'Efectivo MXN', code: 'CASH_MXN', active: true },
            { id: 'pm3', name: 'Efectivo EUR', code: 'CASH_EUR', active: true },
            { id: 'pm4', name: 'Efectivo CAD', code: 'CASH_CAD', active: true },
            { id: 'pm5', name: 'TPV Visa/MC', code: 'TPV_VISA', active: true },
            { id: 'pm6', name: 'TPV Amex', code: 'TPV_AMEX', active: true }
        ];

        for (const pm of paymentMethods) {
            try {
                await DB.put('payment_methods', pm);
            } catch (e) {
                // Already exists
            }
        }

        // Commission Rules (con entity_id específico)
        const allSellers = await DB.getAll('catalog_sellers') || [];
        const sebastianSeller = allSellers.find(s => s.name === 'SEBASTIAN');
        const omarSeller = allSellers.find(s => s.name === 'OMAR');
        const jcSeller = allSellers.find(s => s.name === 'JUAN CARLOS');
        const marinaGuide = (await DB.getAll('catalog_guides') || []).find(g => g.name === 'MARINA');

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
            entity_id: null, // null = default para todos los que no tengan regla específica
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
                if (existing) {
                    // Actualizar si cambió
                    await DB.put('commission_rules', rule);
                } else {
                    await DB.put('commission_rules', rule);
                }
            } catch (e) {
                console.error('Error creating commission rule:', e);
            }
        }

        // Precargar reglas de llegadas (arrival_rate_rules) si está vacío
        await this.loadArrivalRateRules();
        
        // Precargar nómina semanal
        await this.loadWeeklyPayroll();
        
        // Precargar costos fijos y variables iniciales
        await this.loadInitialCosts();
    },

    async loadArrivalRateRules() {
        try {
            const existingRules = await DB.getAll('arrival_rate_rules') || [];
            
            // Verificar si hay reglas con active_from en el futuro
            const rulesWithFutureDate = existingRules.filter(r => r.active_from && r.active_from > '2000-01-01');
            
            if (rulesWithFutureDate.length > 0) {
                console.log(`⚠️ Detectadas ${rulesWithFutureDate.length} reglas con active_from en el futuro, actualizando todas...`);
                // Actualizar todas las reglas con fecha futura
                for (const rule of rulesWithFutureDate) {
                    rule.active_from = '2000-01-01';
                    rule.updated_at = new Date().toISOString();
                    try {
                        await DB.put('arrival_rate_rules', rule);
                    } catch (e) {
                        console.warn('Error actualizando regla:', e);
                    }
                }
                console.log(`✅ ${rulesWithFutureDate.length} reglas actualizadas con active_from: 2000-01-01`);
            }
            
            // Solo precargar si no hay reglas o si hay menos de 25 (para asegurar que todas estén cargadas)
            // Hay aproximadamente 25 reglas en total según el tabulador:
            // 3 TANITOURS + 1 TRAVELEX + 6 DISCOVERY (2 city_tour + 4 sprinter/van) + 1 VERANOS + 5 TB + 5 TTF + 4 TROPICAL (van/sprinter/city_tour 1-14 + truck 15-45) = 25 reglas
            if (existingRules.length >= 25 && rulesWithFutureDate.length === 0) {
                console.log(`✅ Arrival rate rules ya existen (${existingRules.length}) y están actualizadas, omitiendo precarga`);
                return;
            }
            
            // Si hay menos de 25 reglas, eliminar todas y recargar
            if (existingRules.length < 25) {
                console.log(`⚠️ Reglas incompletas detectadas (${existingRules.length} < 25), eliminando y recargando todas las reglas del tabulador...`);
                for (const rule of existingRules) {
                    try {
                        await DB.delete('arrival_rate_rules', rule.id);
                    } catch (e) {
                        // Ignorar errores
                    }
                }
            }

            const agencies = await DB.getAll('catalog_agencies') || [];
            const branches = await DB.getAll('catalog_branches') || [];
            
            // Buscar agencias por nombre (case-insensitive, flexible)
            const tanitoursAgency = agencies.find(a => a.name.toUpperCase().includes('TANITOURS') || a.name.toUpperCase().includes('TANI TOURS'));
            const travelexAgency = agencies.find(a => a.name.toUpperCase().includes('TRAVELEX'));
            const discoveryAgency = agencies.find(a => a.name.toUpperCase().includes('DISCOVERY'));
            const veranosAgency = agencies.find(a => a.name.toUpperCase().includes('VERANOS'));
            const tbAgency = agencies.find(a => a.name.toUpperCase() === 'TB' || a.name.toUpperCase().trim() === 'TB');
            const ttfAgency = agencies.find(a => a.name.toUpperCase() === 'TTF' || a.name.toUpperCase().trim() === 'TTF');
            const tropicalAgency = agencies.find(a => a.name.toUpperCase().includes('TROPICAL ADVENTURE') || a.name.toUpperCase().includes('TROPICAL'));
            
            // Buscar sucursales por nombre (más robusto que por ID)
            const branch1 = branches.find(b => 
                b.name && (b.name.toUpperCase().includes('VALLARTA') || b.name.toUpperCase().includes('L VALLARTA') || b.id === 'branch1')
            );
            const branch2 = branches.find(b => 
                b.name && (b.name.toUpperCase().includes('MALECON') || b.name.toUpperCase().includes('MALECÓN') || b.id === 'branch2')
            );
            const branch3 = branches.find(b => 
                b.name && (b.name.toUpperCase().includes('SAN SEBASTIAN') || b.name.toUpperCase().includes('SAN SEBASTIÁN') || b.id === 'branch3')
            );
            const branch4 = branches.find(b => 
                b.name && (b.name.toUpperCase().includes('SAYULITA') || b.id === 'branch4')
            );

            const rules = [];
            // Usar una fecha muy antigua para que las reglas siempre estén activas (a menos que tengan active_until)
            const today = '2000-01-01'; // Fecha base para que las reglas siempre apliquen

            // TANITOURS: 11-15 → $1,300, 16-23 → $1,500, 24-39 → $2,500 (tarifa fija)
            if (tanitoursAgency) {
                rules.push(
                    { id: Utils.generateId(), agency_id: tanitoursAgency.id, branch_id: null, min_passengers: 11, max_passengers: 15, unit_type: null, rate_per_passenger: 0, fee_type: 'flat', flat_fee: 1300, extra_per_passenger: 0, active_from: today, active_until: null, notes: 'TANITOURS: 11-15 PAX', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sync_status: 'pending' },
                    { id: Utils.generateId(), agency_id: tanitoursAgency.id, branch_id: null, min_passengers: 16, max_passengers: 23, unit_type: null, rate_per_passenger: 0, fee_type: 'flat', flat_fee: 1500, extra_per_passenger: 0, active_from: today, active_until: null, notes: 'TANITOURS: 16-23 PAX', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sync_status: 'pending' },
                    { id: Utils.generateId(), agency_id: tanitoursAgency.id, branch_id: null, min_passengers: 24, max_passengers: 39, unit_type: null, rate_per_passenger: 0, fee_type: 'flat', flat_fee: 2500, extra_per_passenger: 0, active_from: today, active_until: null, notes: 'TANITOURS: 24-39 PAX', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sync_status: 'pending' }
                );
            }

            // TRAVELEX: Cualquier cantidad → $3,700 (tarifa fija)
            if (travelexAgency) {
                rules.push(
                    { id: Utils.generateId(), agency_id: travelexAgency.id, branch_id: null, min_passengers: 1, max_passengers: null, unit_type: null, rate_per_passenger: 0, fee_type: 'flat', flat_fee: 3700, extra_per_passenger: 0, active_from: today, active_until: null, notes: 'TRAVELEX: Cualquier cantidad', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sync_status: 'pending' }
                );
            }

            // DISCOVERY: Tienda 1 y 2 → $2,000 (city_tour), Tienda 3 y 4 → Sprinter $1,000 / Van $600
            if (discoveryAgency) {
                if (branch1) {
                    rules.push({ id: Utils.generateId(), agency_id: discoveryAgency.id, branch_id: branch1.id, min_passengers: 1, max_passengers: null, unit_type: 'city_tour', rate_per_passenger: 0, fee_type: 'flat', flat_fee: 2000, extra_per_passenger: 0, active_from: today, active_until: null, notes: 'DISCOVERY: L Vallarta - City Tour', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sync_status: 'pending' });
                }
                if (branch2) {
                    rules.push({ id: Utils.generateId(), agency_id: discoveryAgency.id, branch_id: branch2.id, min_passengers: 1, max_passengers: null, unit_type: 'city_tour', rate_per_passenger: 0, fee_type: 'flat', flat_fee: 2000, extra_per_passenger: 0, active_from: today, active_until: null, notes: 'DISCOVERY: Malecón - City Tour', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sync_status: 'pending' });
                }
                if (branch3) {
                    rules.push(
                        { id: Utils.generateId(), agency_id: discoveryAgency.id, branch_id: branch3.id, min_passengers: 1, max_passengers: null, unit_type: 'sprinter', rate_per_passenger: 0, fee_type: 'flat', flat_fee: 1000, extra_per_passenger: 0, active_from: today, active_until: null, notes: 'DISCOVERY: San Sebastián - Sprinter', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sync_status: 'pending' },
                        { id: Utils.generateId(), agency_id: discoveryAgency.id, branch_id: branch3.id, min_passengers: 1, max_passengers: null, unit_type: 'van', rate_per_passenger: 0, fee_type: 'flat', flat_fee: 600, extra_per_passenger: 0, active_from: today, active_until: null, notes: 'DISCOVERY: San Sebastián - Van', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sync_status: 'pending' }
                    );
                }
                if (branch4) {
                    rules.push(
                        { id: Utils.generateId(), agency_id: discoveryAgency.id, branch_id: branch4.id, min_passengers: 1, max_passengers: null, unit_type: 'sprinter', rate_per_passenger: 0, fee_type: 'flat', flat_fee: 1000, extra_per_passenger: 0, active_from: today, active_until: null, notes: 'DISCOVERY: Sayulita - Sprinter', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sync_status: 'pending' },
                        { id: Utils.generateId(), agency_id: discoveryAgency.id, branch_id: branch4.id, min_passengers: 1, max_passengers: null, unit_type: 'van', rate_per_passenger: 0, fee_type: 'flat', flat_fee: 600, extra_per_passenger: 0, active_from: today, active_until: null, notes: 'DISCOVERY: Sayulita - Van', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sync_status: 'pending' }
                    );
                }
            }

            // VERANOS: Cualquier cantidad → $2,000 (tarifa fija)
            if (veranosAgency) {
                rules.push(
                    { id: Utils.generateId(), agency_id: veranosAgency.id, branch_id: null, min_passengers: 1, max_passengers: null, unit_type: null, rate_per_passenger: 0, fee_type: 'flat', flat_fee: 2000, extra_per_passenger: 0, active_from: today, active_until: null, notes: 'VERANOS: Cualquier cantidad', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sync_status: 'pending' }
                );
            }

            // TB: 1-6 → $300, 7-14 → $600, 15-18 → $800, 20-30 → $1,000, 30-45 → $1,200, +$20 por pasajero extra >45
            // Nota: El extra solo aplica después de 45 pasajeros, no después de cada rango
            if (tbAgency) {
                rules.push(
                    { id: Utils.generateId(), agency_id: tbAgency.id, branch_id: null, min_passengers: 1, max_passengers: 6, unit_type: null, rate_per_passenger: 0, fee_type: 'flat', flat_fee: 300, extra_per_passenger: 0, active_from: today, active_until: null, notes: 'TB: 1-6 PAX', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sync_status: 'pending' },
                    { id: Utils.generateId(), agency_id: tbAgency.id, branch_id: null, min_passengers: 7, max_passengers: 14, unit_type: null, rate_per_passenger: 0, fee_type: 'flat', flat_fee: 600, extra_per_passenger: 0, active_from: today, active_until: null, notes: 'TB: 7-14 PAX', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sync_status: 'pending' },
                    { id: Utils.generateId(), agency_id: tbAgency.id, branch_id: null, min_passengers: 15, max_passengers: 18, unit_type: null, rate_per_passenger: 0, fee_type: 'flat', flat_fee: 800, extra_per_passenger: 0, active_from: today, active_until: null, notes: 'TB: 15-18 PAX', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sync_status: 'pending' },
                    { id: Utils.generateId(), agency_id: tbAgency.id, branch_id: null, min_passengers: 20, max_passengers: 30, unit_type: null, rate_per_passenger: 0, fee_type: 'flat', flat_fee: 1000, extra_per_passenger: 0, active_from: today, active_until: null, notes: 'TB: 20-30 PAX', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sync_status: 'pending' },
                    { id: Utils.generateId(), agency_id: tbAgency.id, branch_id: null, min_passengers: 30, max_passengers: 45, unit_type: null, rate_per_passenger: 0, fee_type: 'flat', flat_fee: 1200, extra_per_passenger: 20, active_from: today, active_until: null, notes: 'TB: 30-45 PAX + $20 extra >45', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sync_status: 'pending' }
                );
            }

            // TTF: 1-6 → $300, 7-14 → $600, 15-18 → $800, 20-30 → $1,000, 30-45 → $1,200 (tarifa fija, sin extra)
            if (ttfAgency) {
                rules.push(
                    { id: Utils.generateId(), agency_id: ttfAgency.id, branch_id: null, min_passengers: 1, max_passengers: 6, unit_type: null, rate_per_passenger: 0, fee_type: 'flat', flat_fee: 300, extra_per_passenger: 0, active_from: today, active_until: null, notes: 'TTF: 1-6 PAX', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sync_status: 'pending' },
                    { id: Utils.generateId(), agency_id: ttfAgency.id, branch_id: null, min_passengers: 7, max_passengers: 14, unit_type: null, rate_per_passenger: 0, fee_type: 'flat', flat_fee: 600, extra_per_passenger: 0, active_from: today, active_until: null, notes: 'TTF: 7-14 PAX', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sync_status: 'pending' },
                    { id: Utils.generateId(), agency_id: ttfAgency.id, branch_id: null, min_passengers: 15, max_passengers: 18, unit_type: null, rate_per_passenger: 0, fee_type: 'flat', flat_fee: 800, extra_per_passenger: 0, active_from: today, active_until: null, notes: 'TTF: 15-18 PAX', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sync_status: 'pending' },
                    { id: Utils.generateId(), agency_id: ttfAgency.id, branch_id: null, min_passengers: 20, max_passengers: 30, unit_type: null, rate_per_passenger: 0, fee_type: 'flat', flat_fee: 1000, extra_per_passenger: 0, active_from: today, active_until: null, notes: 'TTF: 20-30 PAX', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sync_status: 'pending' },
                    { id: Utils.generateId(), agency_id: ttfAgency.id, branch_id: null, min_passengers: 30, max_passengers: 45, unit_type: null, rate_per_passenger: 0, fee_type: 'flat', flat_fee: 1200, extra_per_passenger: 0, active_from: today, active_until: null, notes: 'TTF: 30-45 PAX', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sync_status: 'pending' }
                );
            }

            // TROPICAL ADVENTURE: 
            // - Van/Sprinter/City Tour (1-14 pasajeros) → $500
            // - Camión (15-45 pasajeros) → $1,200
            // Nota: Van, Sprinter y City Tour comparten la misma tarifa para 1-14 PAX
            if (tropicalAgency) {
                rules.push(
                    // Van 1-14 PAX
                    { id: Utils.generateId(), agency_id: tropicalAgency.id, branch_id: null, min_passengers: 1, max_passengers: 14, unit_type: 'van', rate_per_passenger: 0, fee_type: 'flat', flat_fee: 500, extra_per_passenger: 0, active_from: today, active_until: null, notes: 'TROPICAL ADVENTURE: Van 1-14 PAX', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sync_status: 'pending' },
                    // Sprinter 1-14 PAX (misma tarifa que Van)
                    { id: Utils.generateId(), agency_id: tropicalAgency.id, branch_id: null, min_passengers: 1, max_passengers: 14, unit_type: 'sprinter', rate_per_passenger: 0, fee_type: 'flat', flat_fee: 500, extra_per_passenger: 0, active_from: today, active_until: null, notes: 'TROPICAL ADVENTURE: Sprinter 1-14 PAX', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sync_status: 'pending' },
                    // City Tour 1-14 PAX (misma tarifa que Van)
                    { id: Utils.generateId(), agency_id: tropicalAgency.id, branch_id: null, min_passengers: 1, max_passengers: 14, unit_type: 'city_tour', rate_per_passenger: 0, fee_type: 'flat', flat_fee: 500, extra_per_passenger: 0, active_from: today, active_until: null, notes: 'TROPICAL ADVENTURE: City Tour 1-14 PAX', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sync_status: 'pending' },
                    // Camión 15-45 PAX
                    { id: Utils.generateId(), agency_id: tropicalAgency.id, branch_id: null, min_passengers: 15, max_passengers: 45, unit_type: 'truck', rate_per_passenger: 0, fee_type: 'flat', flat_fee: 1200, extra_per_passenger: 0, active_from: today, active_until: null, notes: 'TROPICAL ADVENTURE: Camión 15-45 PAX', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sync_status: 'pending' }
                );
            }

            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/d085ffd8-d37f-46dc-af23-0f9fbbe46595',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:1084',message:'About to save rules',data:{count:rules.length,rules:rules.map(r=>({agency:r.agency_id,min:r.min_passengers,max:r.max_passengers,fee_type:r.fee_type,flat_fee:r.flat_fee}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            for (const rule of rules) {
                try {
                    // Usar put en lugar de add para permitir actualización si existe
                    await DB.put('arrival_rate_rules', rule);
                    if (typeof window.SyncManager !== 'undefined') {
                        await window.SyncManager.addToQueue('arrival_rate_rule', rule.id);
                    }
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/d085ffd8-d37f-46dc-af23-0f9fbbe46595',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:1087',message:'Rule saved',data:{id:rule.id,agency:rule.agency_id,min:rule.min_passengers,max:rule.max_passengers},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                    // #endregion
                } catch (e) {
                    console.error('Error creating arrival rate rule:', e);
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/d085ffd8-d37f-46dc-af23-0f9fbbe46595',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:1090',message:'Error saving rule',data:{error:e.message,rule:rule.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                    // #endregion
                }
            }

            console.log(`✅ ${rules.length} reglas de llegadas precargadas`);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/d085ffd8-d37f-46dc-af23-0f9fbbe46595',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:1093',message:'Precarga completada',data:{count:rules.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
        } catch (e) {
            console.error('Error loading arrival rate rules:', e);
        }
    },

    async loadWeeklyPayroll() {
        try {
            // Verificar si ya existe nómina semanal
            const existingPayroll = await DB.getAll('cost_entries') || [];
            const hasPayroll = existingPayroll.some(c => 
                c.category === 'nomina' && 
                c.period_type === 'weekly' && 
                c.recurring === true
            );

            if (hasPayroll) {
                console.log('Nómina semanal ya existe, omitiendo precarga');
                return;
            }

            const branches = await DB.getAll('catalog_branches') || [];
            const branch1 = branches.find(b => b.id === 'branch1');
            const branch2 = branches.find(b => b.id === 'branch2');
            const branch3 = branches.find(b => b.id === 'branch3');
            const branch4 = branches.find(b => b.id === 'branch4');

            const today = Utils.formatDate(new Date(), 'YYYY-MM-DD');
            const payrollCosts = [];

            // Tienda 1 (L Vallarta): CHELY $3,000, XIMENA $2,500, ANA $1,500, DULCE $2,000 → total $9,000 semanal
            if (branch1) {
                payrollCosts.push({
                    id: Utils.generateId(),
                    type: 'fijo',
                    category: 'nomina',
                    amount: 9000,
                    branch_id: branch1.id,
                    date: today,
                    period_type: 'weekly',
                    recurring: true,
                    auto_generate: true,
                    notes: 'Nómina semanal: CHELY $3,000, XIMENA $2,500, ANA $1,500, DULCE $2,000',
                    created_at: new Date().toISOString(),
                    sync_status: 'pending'
                });
            }

            // Tienda 2 (Malecón): ITZEL $2,000, GUILLE $2,500 → total $4,500 semanal
            if (branch2) {
                payrollCosts.push({
                    id: Utils.generateId(),
                    type: 'fijo',
                    category: 'nomina',
                    amount: 4500,
                    branch_id: branch2.id,
                    date: today,
                    period_type: 'weekly',
                    recurring: true,
                    auto_generate: true,
                    notes: 'Nómina semanal: ITZEL $2,000, GUILLE $2,500',
                    created_at: new Date().toISOString(),
                    sync_status: 'pending'
                });
            }

            // Tienda 3 (San Sebastián): OMAR $2,000, JUAN CARLOS $2,000 → total $4,000 semanal
            if (branch3) {
                payrollCosts.push({
                    id: Utils.generateId(),
                    type: 'fijo',
                    category: 'nomina',
                    amount: 4000,
                    branch_id: branch3.id,
                    date: today,
                    period_type: 'weekly',
                    recurring: true,
                    auto_generate: true,
                    notes: 'Nómina semanal: OMAR $2,000, JUAN CARLOS $2,000',
                    created_at: new Date().toISOString(),
                    sync_status: 'pending'
                });
            }

            // Tienda 4 (Sayulita): OMAR $2,000, JUAN CARLOS $2,000, MIRNA $1,800 → total $5,800 semanal
            if (branch4) {
                payrollCosts.push({
                    id: Utils.generateId(),
                    type: 'fijo',
                    category: 'nomina',
                    amount: 5800,
                    branch_id: branch4.id,
                    date: today,
                    period_type: 'weekly',
                    recurring: true,
                    auto_generate: true,
                    notes: 'Nómina semanal: OMAR $2,000, JUAN CARLOS $2,000, MIRNA $1,800',
                    created_at: new Date().toISOString(),
                    sync_status: 'pending'
                });
            }

            for (const cost of payrollCosts) {
                try {
                    await DB.add('cost_entries', cost);
                    await SyncManager.addToQueue('cost_entry', cost.id);
                } catch (e) {
                    console.error('Error creating payroll cost:', e);
                }
            }

            console.log(`✅ ${payrollCosts.length} nóminas semanales precargadas`);
        } catch (e) {
            console.error('Error loading weekly payroll:', e);
        }
    },

    getSellerCommissionRule(name) {
        if (name === 'SEBASTIAN') return 'seller_sebastian';
        if (name === 'OMAR' || name === 'JUAN CARLOS') return 'seller_omar';
        return 'seller_default';
    },

    async loadInitialCosts() {
        try {
            // Verificar si ya existen costos fijos iniciales
            const existingCosts = await DB.getAll('cost_entries') || [];
            const hasInitialCosts = existingCosts.some(c => 
                (c.category === 'renta' || c.category === 'agua' || c.category === 'linea_amarilla' || c.category === 'licencias') &&
                c.recurring === true
            );

            if (hasInitialCosts) {
                console.log('Costos iniciales ya existen, omitiendo precarga');
                return;
            }

            const branches = await DB.getAll('catalog_branches') || [];
            const branch1 = branches.find(b => b.id === 'branch1');
            const branch2 = branches.find(b => b.id === 'branch2');
            const branch3 = branches.find(b => b.id === 'branch3');
            const branch4 = branches.find(b => b.id === 'branch4');

            const today = Utils.formatDate(new Date(), 'YYYY-MM-DD');
            const initialCosts = [];

            // Costos fijos que aplican a todas las sucursales
            const fixedCosts = [
                { category: 'renta', name: 'Renta Local', amount: 0, period_type: 'monthly', notes: 'Renta del local' },
                { category: 'agua', name: 'Agua', amount: 0, period_type: 'monthly', notes: 'Servicio de agua' },
                { category: 'linea_amarilla', name: 'Línea Amarilla', amount: 10000, period_type: 'monthly', notes: 'Línea Amarilla $10,000 MXN mensual' },
                { category: 'licencias', name: 'Licencias y Permisos', amount: 0, period_type: 'monthly', notes: 'Licencias y permisos' }
            ];

            // Agregar costos fijos para cada sucursal
            for (const branch of [branch1, branch2, branch3, branch4].filter(b => b)) {
                for (const cost of fixedCosts) {
                    initialCosts.push({
                        id: Utils.generateId(),
                        type: 'fijo',
                        category: cost.category,
                        amount: cost.amount,
                        branch_id: branch.id,
                        date: today,
                        period_type: cost.period_type,
                        recurring: true,
                        auto_generate: false,
                        notes: `${cost.name} - ${branch.name}`,
                        created_at: new Date().toISOString(),
                        sync_status: 'pending'
                    });
                }
            }

            // Nota: Los costos variables (luz, pago_llegadas, despensa) no se crean automáticamente
            // porque sus montos varían. Se crean manualmente cuando se registran.

            for (const cost of initialCosts) {
                try {
                    await DB.add('cost_entries', cost);
                    if (typeof SyncManager !== 'undefined') {
                        await SyncManager.addToQueue('cost_entry', cost.id);
                    }
                } catch (e) {
                    console.error('Error creating initial cost:', e);
                }
            }

            console.log(`✅ ${initialCosts.length} costos iniciales precargados`);
        } catch (e) {
            console.error('Error loading initial costs:', e);
        }
    },

    async loadEmployees() {
        // Ya no se crean usuarios/empleados demo automáticamente
        // Los usuarios y empleados se crean manualmente desde el módulo de Empleados
        
        // Create demo inventory items
        await this.loadDemoInventory();

        // Create demo customers
        await this.loadDemoCustomers();
    },

    async loadDemoInventory() {
        const demoItems = [
            {
                id: 'inv1',
                sku: 'AN001',
                barcode: 'AN001',
                name: 'Anillo Oro 18k Diamante',
                metal: 'Oro 18k',
                stone: 'Diamante',
                size: '6',
                weight_g: 5.2,
                measures: '15mm',
                cost: 8000,
                price: 0,
                location: 'Vitrina 1',
                status: 'disponible',
                branch_id: 'branch1',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: 'inv2',
                sku: 'PU002',
                barcode: 'PU002',
                name: 'Pulsera Plata Sterling',
                metal: 'Plata 925',
                stone: 'Sin piedra',
                size: 'Mediana',
                weight_g: 12.5,
                measures: '18cm',
                cost: 2000,
                price: 0,
                location: 'Vitrina 2',
                status: 'disponible',
                branch_id: 'branch1',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: 'inv3',
                sku: 'CO003',
                barcode: 'CO003',
                name: 'Collar Oro 14k Perlas',
                metal: 'Oro 14k',
                stone: 'Perlas',
                size: '45cm',
                weight_g: 8.3,
                measures: '45cm',
                cost: 5000,
                price: 0,
                location: 'Vitrina 1',
                status: 'disponible',
                branch_id: 'branch1',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: 'inv4',
                sku: 'AR004',
                barcode: 'AR004',
                name: 'Aretes Oro 18k Esmeraldas',
                metal: 'Oro 18k',
                stone: 'Esmeraldas',
                size: 'Mediana',
                weight_g: 3.5,
                measures: '2cm',
                cost: 6000,
                price: 0,
                location: 'Vitrina 1',
                status: 'disponible',
                branch_id: 'branch1',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: 'inv5',
                sku: 'AN005',
                barcode: 'AN005',
                name: 'Anillo Plata 925 Zafiro',
                metal: 'Plata 925',
                stone: 'Zafiro',
                size: '7',
                weight_g: 4.8,
                measures: '16mm',
                cost: 3500,
                price: 0,
                location: 'Vitrina 2',
                status: 'disponible',
                branch_id: 'branch1',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        ];

        let created = 0;
        for (const item of demoItems) {
            try {
                // Verificar si ya existe
                const existing = await DB.get('inventory_items', item.id);
                if (!existing) {
                    await DB.put('inventory_items', item);
                    created++;
                }
            } catch (e) {
                console.error(`Error creando item ${item.id}:`, e);
            }
        }
        console.log(`Productos demo creados: ${created} de ${demoItems.length}`);
        return created;
    },

    async loadDemoCustomers() {
        const demoCustomers = [
            {
                id: 'cust1',
                name: 'María González',
                email: 'maria.gonzalez@email.com',
                phone: '5551234567',
                notes: 'Cliente frecuente, prefiere anillos',
                created_at: new Date().toISOString()
            },
            {
                id: 'cust2',
                name: 'Juan Pérez',
                email: 'juan.perez@email.com',
                phone: '5559876543',
                notes: '',
                created_at: new Date().toISOString()
            }
        ];

        for (const customer of demoCustomers) {
            try {
                await DB.put('customers', customer);
            } catch (e) {
                // Already exists
            }
        }
    },

    async verifyAndFixBarcodes() {
        try {
            // Verificar y corregir empleados (con manejo de errores)
            const employees = await DB.getAll('employees') || [];
            for (const emp of employees) {
                if (!emp.barcode || Utils.isBarcodeEmpty(emp.barcode)) {
                    try {
                        emp.barcode = Utils.generateEmployeeBarcode(emp);
                        await DB.put('employees', emp);
                    } catch (error) {
                        if (error.name !== 'ConstraintError') {
                            console.warn('Error guardando barcode de empleado:', error);
                        }
                    }
                }
            }

            // Verificar y corregir vendedores (con manejo de errores)
            const sellers = await DB.getAll('catalog_sellers') || [];
            for (const seller of sellers) {
                if (!seller.barcode || Utils.isBarcodeEmpty(seller.barcode)) {
                    try {
                        seller.barcode = Utils.generateSellerBarcode(seller);
                        await DB.put('catalog_sellers', seller);
                    } catch (error) {
                        if (error.name !== 'ConstraintError') {
                            console.warn('Error guardando barcode de vendedor:', error);
                        }
                    }
                }
            }

            // Verificar y corregir guías (con manejo de errores)
            const guides = await DB.getAll('catalog_guides') || [];
            for (const guide of guides) {
                if (!guide.barcode || Utils.isBarcodeEmpty(guide.barcode)) {
                    try {
                        guide.barcode = Utils.generateGuideBarcode(guide);
                        await DB.put('catalog_guides', guide);
                    } catch (error) {
                        if (error.name !== 'ConstraintError') {
                            console.warn('Error guardando barcode de guía:', error);
                        }
                    }
                }
            }

            // Verificar y corregir agencias (con manejo de errores)
            const agencies = await DB.getAll('catalog_agencies') || [];
            for (const agency of agencies) {
                if (!agency.barcode || Utils.isBarcodeEmpty(agency.barcode)) {
                    try {
                        agency.barcode = Utils.generateAgencyBarcode(agency);
                        await DB.put('catalog_agencies', agency);
                    } catch (error) {
                        if (error.name !== 'ConstraintError') {
                            console.warn('Error guardando barcode de agencia:', error);
                        }
                    }
                }
            }

            // Verificar items de inventario
            const items = await DB.getAll('inventory_items') || [];
            const barcodeMap = new Map(); // Mapa para detectar duplicados
            const itemsToFix = []; // Items que necesitan corrección
            
            // Primera pasada: identificar barcodes únicos y duplicados
            for (const item of items) {
                if (item.barcode && !Utils.isBarcodeEmpty(item.barcode)) {
                    const barcode = item.barcode.trim();
                    if (barcodeMap.has(barcode)) {
                        // Es un duplicado
                        itemsToFix.push(item);
                    } else {
                        // Primer item con este barcode (guardar el primero)
                        barcodeMap.set(barcode, item);
                    }
                }
            }
            
            // Segunda pasada: corregir duplicados
            for (const item of itemsToFix) {
                const originalBarcode = item.barcode.trim();
                let newBarcode = originalBarcode;
                let counter = 1;
                
                // Generar código único
                while (barcodeMap.has(newBarcode)) {
                    newBarcode = `${originalBarcode}_${counter}`;
                    counter++;
                }
                
                item.barcode = newBarcode;
                barcodeMap.set(newBarcode, item);
                
                try {
                    await DB.put('inventory_items', item);
                } catch (putError) {
                    if (putError.name === 'ConstraintError') {
                        console.warn(`⚠️ Error guardando barcode para item ${item.id || item.sku}, omitiendo...`);
                    } else {
                        throw putError;
                    }
                }
            }
            
            // Tercera pasada: generar códigos para items sin barcode
            for (const item of items) {
                if (!item.barcode || Utils.isBarcodeEmpty(item.barcode)) {
                    let newBarcode = item.sku || `ITEM${item.id ? item.id.substring(0, 6).toUpperCase() : Date.now()}`;
                    
                    // Asegurar que el barcode sea único
                    let counter = 1;
                    while (barcodeMap.has(newBarcode)) {
                        newBarcode = `${newBarcode}_${counter}`;
                        counter++;
                    }
                    
                    item.barcode = newBarcode;
                    barcodeMap.set(newBarcode, item);
                    
                    try {
                        await DB.put('inventory_items', item);
                    } catch (putError) {
                        if (putError.name === 'ConstraintError') {
                            console.warn(`⚠️ Error guardando barcode para item ${item.id || item.sku}, omitiendo...`);
                        } else {
                            throw putError;
                        }
                    }
                }
            }

            console.log('✅ Códigos de barras verificados y corregidos');
        } catch (e) {
            console.error('❌ Error verificando códigos de barras:', e);
        }
    },

    async updateTopbarStatus() {
        try {
            if (typeof UI === 'undefined' || !UI.updateSyncStatus) return;
            
            const apiUrl = (await DB.get('settings', 'api_url'))?.value || null;
            
            // Asegurar que API.baseURL esté sincronizado con la base de datos
            if (typeof API !== 'undefined') {
                if (apiUrl && API.baseURL !== apiUrl) {
                    API.baseURL = apiUrl;
                }
                // Si hay URL pero API no está inicializado, inicializarlo
                if (apiUrl && !API.baseURL) {
                    await API.init();
                }
            }
            
            // Verificar conexión real: URL, baseURL, token Y socket conectado
            const hasToken = (typeof API !== 'undefined' && API.token) || !!localStorage.getItem('api_token');
            const hasSocket = typeof API !== 'undefined' && API.socket && API.socket.connected;
            const isConnected = apiUrl && typeof API !== 'undefined' && API.baseURL && hasToken && hasSocket;
            const isSyncing = typeof window.SyncManager !== 'undefined' ? window.SyncManager.isSyncing : false;
            
            // Actualizar estado en el topbar (ahora es async)
            // Pasar apiUrl explícitamente para que updateSyncStatus pueda usarlo
            await UI.updateSyncStatus(isConnected, isSyncing);
        } catch (error) {
            console.error('Error updating topbar status:', error);
        }
    },

    // Sincronizar TROPICAL ADVENTURE específicamente con la API (Railway)
    async syncTropicalAdventureToAPI() {
        if (typeof API === 'undefined' || !API.baseURL || !API.token) {
            return; // No hay API disponible
        }

        try {
            // 1. Verificar si la agencia ya existe en Railway
            const agencies = await API.getAgencies('', true) || [];
            let tropicalAgency = agencies.find(a => 
                a.code === 'TROPICAL_ADVENTURE' || 
                a.name?.toUpperCase() === 'TROPICAL ADVENTURE'
            );

            // 2. Si no existe, crearla
            if (!tropicalAgency) {
                console.log('🔄 Creando agencia TROPICAL ADVENTURE en Railway...');
                try {
                    tropicalAgency = await API.createAgency({
                        code: 'TROPICAL_ADVENTURE',
                        name: 'TROPICAL ADVENTURE',
                        active: true
                    });
                    console.log('✅ Agencia TROPICAL ADVENTURE creada en Railway');
                } catch (createError) {
                    // Si ya existe (error de conflicto), intentar obtenerla
                    if (createError.message?.includes('ya existe') || createError.message?.includes('already exists') || createError.message?.includes('duplicate')) {
                        const allAgencies = await API.getAgencies('', null) || [];
                        tropicalAgency = allAgencies.find(a => 
                            a.code === 'TROPICAL_ADVENTURE' || 
                            a.name?.toUpperCase() === 'TROPICAL ADVENTURE'
                        );
                    } else {
                        throw createError;
                    }
                }
            }

            if (!tropicalAgency || !tropicalAgency.id) {
                console.warn('⚠️ No se pudo obtener/crear la agencia TROPICAL ADVENTURE en Railway');
                return;
            }

            // 3. Verificar y crear los guías
            const tropicalGuides = ['NANCY', 'JAVIER', 'GINA', 'LUKE', 'JULIAN', 'GEOVANNY', 'NEYRA', 'ROGER'];
            const existingGuides = await API.getGuides('', tropicalAgency.id, true) || [];
            
            for (const guideName of tropicalGuides) {
                const existingGuide = existingGuides.find(g => 
                    g.name?.toUpperCase() === guideName.toUpperCase()
                );

                if (!existingGuide) {
                    try {
                        console.log(`🔄 Creando guía ${guideName} en Railway...`);
                        await API.createGuide({
                            code: `TROPICAL_ADVENTURE_${guideName.replace(/\s+/g, '_').toUpperCase()}`,
                            name: guideName,
                            agency_id: tropicalAgency.id,
                            active: true
                        });
                        console.log(`✅ Guía ${guideName} creada en Railway`);
                    } catch (guideError) {
                        // Ignorar errores de guías que ya existen
                        if (!guideError.message?.includes('ya existe') && 
                            !guideError.message?.includes('already exists') && 
                            !guideError.message?.includes('duplicate')) {
                            console.warn(`⚠️ Error creando guía ${guideName}:`, guideError.message);
                        }
                    }
                }
            }

            console.log('✅ TROPICAL ADVENTURE sincronizada correctamente con Railway');
        } catch (error) {
            console.warn('⚠️ Error sincronizando TROPICAL ADVENTURE con API (continuando con modo local):', error);
            // No lanzar error, continuar con modo local
        }
    },

    initGlobalSearch() {
        const globalSearchInput = document.getElementById('global-search');
        if (!globalSearchInput) return;

        let searchTimeout = null;

        globalSearchInput.addEventListener('input', async (e) => {
            const query = e.target.value.trim();
            
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }

            if (query.length < 2) {
                const resultsContainer = document.getElementById('global-search-results');
                if (resultsContainer) resultsContainer.style.display = 'none';
                return;
            }

            searchTimeout = setTimeout(async () => {
                try {
                    const results = await this.performGlobalSearch(query);
                    this.displaySearchResults(results, query);
                } catch (error) {
                    console.error('Error en búsqueda global:', error);
                }
            }, 300);
        });

        // Cerrar resultados al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-global') && !e.target.closest('.global-search-results')) {
                const resultsContainer = document.getElementById('global-search-results');
                if (resultsContainer) {
                    resultsContainer.style.display = 'none';
                }
            }
        });
    },

    async performGlobalSearch(query) {
        const results = {
            inventory: [],
            customers: [],
            suppliers: [],
            sales: []
        };

        const searchLower = query.toLowerCase();

        try {
            // Búsqueda en inventario
            const inventoryItems = await DB.getAll('inventory_items') || [];
            results.inventory = inventoryItems
                .filter(item => 
                    (item.name && item.name.toLowerCase().includes(searchLower)) ||
                    (item.sku && item.sku.toLowerCase().includes(searchLower)) ||
                    (item.barcode && item.barcode.includes(query))
                )
                .slice(0, 5);

            // Búsqueda en clientes
            const customers = await DB.getAll('customers') || [];
            results.customers = customers
                .filter(customer =>
                    (customer.name && customer.name.toLowerCase().includes(searchLower)) ||
                    (customer.email && customer.email.toLowerCase().includes(searchLower)) ||
                    (customer.phone && customer.phone.includes(query))
                )
                .slice(0, 5);

            // Búsqueda en proveedores
            const suppliers = await DB.getAll('suppliers') || [];
            results.suppliers = suppliers
                .filter(supplier =>
                    (supplier.name && supplier.name.toLowerCase().includes(searchLower)) ||
                    (supplier.code && supplier.code.toLowerCase().includes(searchLower)) ||
                    (supplier.barcode && supplier.barcode.includes(query)) ||
                    (supplier.email && supplier.email.toLowerCase().includes(searchLower)) ||
                    (supplier.phone && supplier.phone.includes(query))
                )
                .slice(0, 5);

            // Búsqueda en ventas
            const sales = await DB.getAll('sales') || [];
            results.sales = sales
                .filter(sale =>
                    (sale.id && sale.id.toLowerCase().includes(searchLower)) ||
                    (sale.reference_number && sale.reference_number.toLowerCase().includes(searchLower))
                )
                .slice(0, 5);
        } catch (error) {
            console.error('Error en búsqueda:', error);
        }

        return results;
    },

    displaySearchResults(results, query) {
        let resultsContainer = document.getElementById('global-search-results');
        if (!resultsContainer) {
            resultsContainer = document.createElement('div');
            resultsContainer.id = 'global-search-results';
            resultsContainer.className = 'global-search-results';
            resultsContainer.style.cssText = `
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: white;
                border: 1px solid var(--color-border);
                border-radius: var(--radius-md);
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                max-height: 500px;
                overflow-y: auto;
                z-index: 1000;
                margin-top: 4px;
            `;
            const searchContainer = document.querySelector('.search-global');
            if (searchContainer) {
                searchContainer.style.position = 'relative';
                searchContainer.appendChild(resultsContainer);
            } else {
                return;
            }
        }

        const totalResults = results.inventory.length + results.customers.length + 
                           results.suppliers.length + results.sales.length;

        if (totalResults === 0) {
            resultsContainer.innerHTML = `
                <div style="padding: var(--spacing-md); text-align: center; color: var(--color-text-secondary);">
                    No se encontraron resultados para "${query}"
                </div>
            `;
            resultsContainer.style.display = 'block';
            return;
        }

        let html = '';

        // Inventario
        if (results.inventory.length > 0) {
            html += `
                <div class="search-results-section">
                    <div class="search-results-header">
                        <i class="fas fa-box"></i> Inventario (${results.inventory.length})
                    </div>
                    ${results.inventory.map(item => `
                        <div class="search-result-item" onclick="window.App.navigateToSearchResult('inventory', '${item.id}')">
                            <div class="search-result-title">${item.name || item.sku}</div>
                            <div class="search-result-subtitle">SKU: ${item.sku || 'N/A'} | ${Utils.formatCurrency(item.cost || 0)}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // Clientes
        if (results.customers.length > 0) {
            html += `
                <div class="search-results-section">
                    <div class="search-results-header">
                        <i class="fas fa-users"></i> Clientes (${results.customers.length})
                    </div>
                    ${results.customers.map(customer => `
                        <div class="search-result-item" onclick="window.App.navigateToSearchResult('customers', '${customer.id}')">
                            <div class="search-result-title">${customer.name || 'Sin nombre'}</div>
                            <div class="search-result-subtitle">${customer.email || customer.phone || 'N/A'}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // Proveedores
        if (results.suppliers.length > 0) {
            html += `
                <div class="search-results-section">
                    <div class="search-results-header">
                        <i class="fas fa-truck"></i> Proveedores (${results.suppliers.length})
                    </div>
                    ${results.suppliers.map(supplier => `
                        <div class="search-result-item" onclick="window.App.navigateToSearchResult('suppliers', '${supplier.id}')">
                            <div class="search-result-title">${supplier.code || ''} ${supplier.code && supplier.name ? '- ' : ''}${supplier.name || 'Sin nombre'}</div>
                            <div class="search-result-subtitle">${supplier.email || supplier.phone || 'N/A'}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // Ventas
        if (results.sales.length > 0) {
            html += `
                <div class="search-results-section">
                    <div class="search-results-header">
                        <i class="fas fa-receipt"></i> Ventas (${results.sales.length})
                    </div>
                    ${results.sales.map(sale => `
                        <div class="search-result-item" onclick="window.App.navigateToSearchResult('sales', '${sale.id}')">
                            <div class="search-result-title">${sale.reference_number || sale.id}</div>
                            <div class="search-result-subtitle">${Utils.formatCurrency(sale.total || 0)} | ${Utils.formatDate(sale.created_at)}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        resultsContainer.innerHTML = html;
        resultsContainer.style.display = 'block';
    },

    navigateToSearchResult(type, id) {
        // Ocultar resultados
        const resultsContainer = document.getElementById('global-search-results');
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
        }

        // Limpiar búsqueda
        const searchInput = document.getElementById('global-search');
        if (searchInput) {
            searchInput.value = '';
        }

        // Navegar al módulo correspondiente
        switch(type) {
            case 'inventory':
                if (typeof Inventory !== 'undefined' && Inventory.showItemDetails) {
                    App.loadModule('inventory');
                    setTimeout(() => Inventory.showItemDetails(id), 300);
                }
                break;
            case 'customers':
                if (typeof Customers !== 'undefined' && Customers.showCustomerDetails) {
                    App.loadModule('customers');
                    setTimeout(() => Customers.showCustomerDetails(id), 300);
                }
                break;
            case 'suppliers':
                if (typeof Suppliers !== 'undefined' && Suppliers.showDetails) {
                    App.loadModule('suppliers');
                    setTimeout(() => Suppliers.showDetails(id), 300);
                }
                break;
            case 'sales':
                if (typeof Sales !== 'undefined' && Sales.showSaleDetails) {
                    App.loadModule('sales');
                    setTimeout(() => Sales.showSaleDetails(id), 300);
                }
                break;
        }
    }
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}
