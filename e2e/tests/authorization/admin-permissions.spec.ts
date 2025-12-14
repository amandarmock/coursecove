import { test, expect } from '../../fixtures';
import { AppointmentsPage } from '../../pages/appointments.page';
import { LocationsPage } from '../../pages/locations.page';

test.describe('Admin Authorization', () => {
  test('admin can access appointments management page', async ({ adminPage }) => {
    const appointmentsPage = new AppointmentsPage(adminPage);
    await appointmentsPage.goto();

    await expect(appointmentsPage.addButton).toBeVisible();
    await expect(appointmentsPage.table).toBeVisible();
  });

  test('admin can access locations management page', async ({ adminPage }) => {
    const locationsPage = new LocationsPage(adminPage);
    await locationsPage.goto();

    await expect(locationsPage.addButton).toBeVisible();
  });

  test('admin can open create appointment type dialog', async ({ adminPage }) => {
    const appointmentsPage = new AppointmentsPage(adminPage);
    await appointmentsPage.goto();
    await appointmentsPage.clickAddButton();

    await expect(appointmentsPage.dialog.root).toBeVisible();
    await expect(appointmentsPage.dialog.saveButton).toBeVisible();
  });

  test('admin can open create location dialog', async ({ adminPage }) => {
    const locationsPage = new LocationsPage(adminPage);
    await locationsPage.goto();
    await locationsPage.clickAddButton();

    await expect(locationsPage.dialog.root).toBeVisible();
    await expect(locationsPage.dialog.saveButton).toBeVisible();
  });
});
