import { test, expect } from '@playwright/test';
import { login, openModule, trackErrors, expectNoErrors, openAndValidateModal } from '../helpers/e2e-helpers.js';

test.describe('E2E Dominio Ventas', () => {
  test('dashboard + pos + clientes + reportes sin errores', async ({ page }) => {
    const errors = trackErrors(page);

    await login(page);

    await openModule(page, 'dashboard');
    await expect(page.locator('#module-dashboard')).toContainText(/ventas|utilidad|resumen|dashboard/i, { timeout: 15000 });

    // pos es estático — usa #module-pos, no #module-content
    await openModule(page, 'pos');
    await expect(page.locator('#module-pos')).toBeVisible();

    await openModule(page, 'customers');
    await openAndValidateModal(page, 'window.Customers.showAddForm');

    await openModule(page, 'reports');
    await expect(page.locator('#module-content')).toBeVisible({ timeout: 15000 });

    expectNoErrors(errors);
  });
});
