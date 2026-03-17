import { test, expect } from '@playwright/test';
import { login, openModule, trackErrors, expectNoErrors, openAndValidateModal } from '../helpers/e2e-helpers.js';

test.describe('E2E Dominio Inventario', () => {
  test('inventario + catálogos + sucursales sin errores', async ({ page }) => {
    const errors = trackErrors(page);

    await login(page);

    // inventory es estático — usa #module-inventory
    await openModule(page, 'inventory');
    await expect(page.locator('#module-inventory')).toBeVisible();
    await openAndValidateModal(page, 'window.Inventory.showAddForm');

    await openModule(page, 'catalogs');
    await expect(page.locator('#module-content')).toBeVisible({ timeout: 15000 });

    await openModule(page, 'branches');
    await openAndValidateModal(page, 'window.Branches.showAddBranchForm');

    expectNoErrors(errors);
  });
});
