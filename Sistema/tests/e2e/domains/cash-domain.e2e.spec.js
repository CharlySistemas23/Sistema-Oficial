import { test, expect } from '@playwright/test';
import { login, openModule, trackErrors, expectNoErrors, openAndValidateModal } from '../helpers/e2e-helpers.js';

test.describe('E2E Dominio Caja', () => {
  test('caja + pos + sync sin errores', async ({ page }) => {
    const errors = trackErrors(page);

    await login(page);

    await openModule(page, 'cash');
    await openAndValidateModal(page, 'window.Cash.showMovementForm');

    // pos es estático — usa #module-pos
    await openModule(page, 'pos');
    await expect(page.locator('#module-pos')).toBeVisible();

    await openModule(page, 'sync');
    await expect(page.locator('#module-content')).toBeVisible({ timeout: 15000 });

    expectNoErrors(errors);
  });
});
