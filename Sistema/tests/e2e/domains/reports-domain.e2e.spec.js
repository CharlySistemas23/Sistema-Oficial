import { test, expect } from '@playwright/test';
import { login, openModule, trackErrors, expectNoErrors, openAndValidateModal } from '../helpers/e2e-helpers.js';

test.describe('E2E Dominio Reportes', () => {
  test('reportes + reparaciones + settings sin errores', async ({ page }) => {
    const errors = trackErrors(page);

    await login(page);

    await openModule(page, 'reports');
    await expect(page.locator('#module-content')).toBeVisible({ timeout: 15000 });
    // Modal opcional — no bloquea si la función no existe
    await openAndValidateModal(page, 'window.Reports.showDateSelectorModal');

    await openModule(page, 'repairs');
    await openAndValidateModal(page, 'window.Repairs.showAddForm');

    await openModule(page, 'settings');
    await expect(page.locator('#module-content')).toBeVisible({ timeout: 15000 });

    expectNoErrors(errors);
  });
});
