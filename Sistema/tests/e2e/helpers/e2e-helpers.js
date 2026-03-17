import { expect } from '@playwright/test';

const COMPANY_CODE = process.env.E2E_COMPANY_CODE || 'OPAL2024';
const USERNAME = process.env.E2E_USERNAME || 'master_admin';
const PIN = process.env.E2E_PIN || '1234';
const LOCAL_API_URL = process.env.LOCAL_API_URL || 'http://127.0.0.1:3001';
const FORCE_LOCAL_LOGIN = process.env.E2E_FORCE_LOCAL_LOGIN !== 'false';

async function seedLocalAdmin(page) {
  await page.evaluate(async () => {
    if (!window.DB || typeof window.DB.init !== 'function') return;

    if (!window.DB.db) {
      await window.DB.init();
    }

    const employee = {
      id: '00000000-0000-0000-0000-000000000002',
      code: 'ADMIN',
      name: 'Administrador Maestro',
      role: 'master_admin',
      branch_id: null,
      active: true
    };

    const user = {
      id: '00000000-0000-0000-0000-000000000001',
      username: 'master_admin',
      pin_hash: null,
      employee_id: employee.id,
      role: 'master_admin',
      permissions: ['all'],
      permissions_by_branch: {},
      active: true
    };

    await window.DB.put('employees', employee);
    await window.DB.put('users', user);
    await window.DB.put('settings', { key: 'api_url', value: '' });

    if (window.API) {
      window.API.baseURL = null;
      window.API.token = null;
    }

    localStorage.removeItem('api_token');
  });
}

async function forceApiUrl(page, apiUrl) {
  await page.evaluate(async (url) => {
    try {
      if (window.API && typeof window.API.setBaseURL === 'function') {
        await window.API.setBaseURL(url);
        return;
      }

      await new Promise((resolve, reject) => {
        const request = indexedDB.open('opal_pos_db', 13);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction(['settings'], 'readwrite');
          const store = tx.objectStore('settings');
          store.put({ key: 'api_url', value: url });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      });
    } catch (error) {
      console.error('No se pudo forzar api_url', error);
    }
  }, apiUrl);
}

export async function login(page) {
  await page.goto('/');

  if (FORCE_LOCAL_LOGIN) {
    await seedLocalAdmin(page);
    await page.evaluate(async () => {
      localStorage.setItem('ENABLE_BYPASS_LOGIN', 'true');
      if (typeof window.bypassLogin === 'function') {
        await window.bypassLogin();
      }

      const testUser = {
        id: '00000000-0000-0000-0000-000000000001',
        username: 'master_admin',
        role: 'master_admin',
        is_master_admin: true,
        isMasterAdmin: true,
        permissions: ['all'],
        permissions_by_branch: {},
        active: true
      };

      const testEmployee = {
        id: '00000000-0000-0000-0000-000000000002',
        name: 'Administrador Maestro',
        role: 'master_admin',
        branch_id: null,
        active: true
      };

      if (typeof UserManager !== 'undefined') {
        UserManager.currentUser = testUser;
        UserManager.currentEmployee = testEmployee;
      }
      if (window.UserManager) {
        window.UserManager.currentUser = testUser;
        window.UserManager.currentEmployee = testEmployee;
      }

      if (typeof PermissionManager !== 'undefined' && !window.__e2eOriginalHasPermission) {
        window.__e2eOriginalHasPermission = PermissionManager.hasPermission?.bind(PermissionManager);
        PermissionManager.hasPermission = () => true;
      }

      localStorage.setItem('current_user', JSON.stringify(testUser));

      const overlays = ['company-code-screen', 'login-screen', 'session-restore-overlay'];
      overlays.forEach((id) => {
        const element = document.getElementById(id);
        if (element) {
          element.style.display = 'none';
          element.style.pointerEvents = 'none';
        }
      });

      document.querySelectorAll('.login-backdrop').forEach((element) => {
        element.style.display = 'none';
        element.style.pointerEvents = 'none';
      });
    });

// Esperar que login-screen desaparezca (poll via JS para evitar falsos positivos CSS)
  await page.waitForFunction(
    () => {
      const el = document.getElementById('login-screen');
      if (!el) return true;
      const s = window.getComputedStyle(el);
      return s.display === 'none' || s.visibility === 'hidden' || el.offsetParent === null;
    },
    { timeout: 30000 }
  );
    await expect(page.locator('.sidebar-nav')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('#content-area')).toBeVisible({ timeout: 30000 });
    return;
  }

  await forceApiUrl(page, LOCAL_API_URL);

  const codeInput = page.locator('#company-code-input');
  if (await codeInput.isVisible().catch(() => false)) {
    await codeInput.fill(COMPANY_CODE);
    await page.click('#company-code-btn');
  }

  await expect(page.locator('#employee-barcode-input')).toBeVisible({ timeout: 30000 });
  await page.fill('#employee-barcode-input', USERNAME);
  await page.fill('#pin-input', PIN);
  await page.getByRole('button', { name: /iniciar sesión/i }).click();

  await expect(page.locator('#login-screen')).toBeHidden({ timeout: 30000 });
  await expect(page.locator('.sidebar-nav')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('#content-area')).toBeVisible({ timeout: 30000 });
}

// Módulos con div propio; el resto usan #module-placeholder + #module-content
const STATIC_MODULES = new Set(['dashboard', 'pos', 'inventory', 'barcodes', 'qa']);

export async function openModule(page, moduleName) {
  // Descartar cualquier modal que bloquee la navegación
  await page.keyboard.press('Escape').catch(() => {});
  await page.evaluate(() => {
    // Forzar cierre de modales si hay alguno bloqueando
    document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
    if (window.UI && typeof window.UI.closeModal === 'function') {
      try { window.UI.closeModal(); } catch (_) {}
    }
  }).catch(() => {});
  await page.waitForTimeout(300);

  const navItem = page.locator(`[data-module="${moduleName}"]`).first();
  await expect(navItem).toBeVisible({ timeout: 20000 });
  await navItem.click();
  await page.waitForTimeout(1200);

  await expect(page.locator('#content-area')).toBeVisible({ timeout: 15000 });

  if (STATIC_MODULES.has(moduleName)) {
    await expect(page.locator(`#module-${moduleName}`)).toBeVisible({ timeout: 20000 });
  } else {
    await expect(page.locator('#module-placeholder')).toBeVisible({ timeout: 20000 });
    // Solo checar errores cuando el contenido ya cargó
    await page.waitForTimeout(800);
    const content = page.locator('#module-content');
    const html = await content.innerHTML().catch(() => '');
    if (html.includes('Error al cargar módulo') || html.includes('módulo no disponible')) {
      throw new Error(`Módulo ${moduleName} cargó con error: ${html.substring(0, 200)}`);
    }
  }
}

export async function closeAnyModal(page) {
  const cancelButton = page.getByRole('button', { name: /cancelar/i }).first();
  if (await cancelButton.isVisible().catch(() => false)) {
    await cancelButton.click();
  } else {
    const closeButton = page.locator('.modal-close').first();
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click();
    } else {
      await page.evaluate(() => {
        if (window.UI && typeof window.UI.closeModal === 'function') {
          window.UI.closeModal();
        }
        const overlay = document.querySelector('.modal-overlay');
        if (overlay && overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      });
    }
  }

  await expect(page.locator('.modal-overlay')).toHaveCount(0, { timeout: 10000 });
}

export async function openAndValidateModal(page, actionName) {
  const opened = await page.evaluate(async (action) => {
    try {
      const fn = action.split('.').reduce((acc, key) => (acc ? acc[key] : null), window);
      if (typeof fn !== 'function') return false;
      const result = fn.call(action.startsWith('window.') ? window : undefined);
      if (result && typeof result.then === 'function') {
        // Timeout de 4s para no bloquear el test
        await Promise.race([result, new Promise(r => setTimeout(r, 4000))]);
      }
      return true;
    } catch {
      return false;
    }
  }, actionName);

  if (!opened) return false;

  const isVisible = await page.locator('.modal-overlay').isVisible().catch(() => false);
  if (!isVisible) return false;

  await closeAnyModal(page);
  return true;
}

export function trackErrors(page) {
  const jsErrors = [];
  const serverErrors = [];

  page.on('pageerror', (error) => {
    jsErrors.push(String(error));
  });

  page.on('response', (response) => {
    const url = response.url();
    if (url.includes('/api/') && response.status() >= 500) {
      serverErrors.push(`${response.status()} ${url}`);
    }
  });

  return { jsErrors, serverErrors };
}

export function expectNoErrors({ jsErrors, serverErrors }) {
  expect(jsErrors, `Errores JS detectados:\n${jsErrors.join('\n')}`).toEqual([]);
  expect(serverErrors, `Respuestas 5xx detectadas:\n${serverErrors.join('\n')}`).toEqual([]);
}
