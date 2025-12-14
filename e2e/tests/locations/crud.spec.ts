import { test, expect } from '../../fixtures';
import { LocationsPage } from '../../pages/locations.page';
import { generateUniqueName } from '../../utils/test-helpers';

test.describe('Business Location CRUD Operations', () => {
  let locationsPage: LocationsPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    locationsPage = new LocationsPage(authenticatedPage);
    await locationsPage.goto();
  });

  // ==========================================================================
  // CREATE
  // ==========================================================================

  test('should create a new location with all fields', async () => {
    const name = generateUniqueName('E2E Location');

    await locationsPage.clickAddButton();
    await locationsPage.dialog.fillForm({
      name,
      address: '123 Test Street',
      city: 'Test City',
      state: 'TS',
      zipCode: '12345',
      notes: 'E2E test location notes',
    });
    await locationsPage.dialog.submit();

    await locationsPage.expectSuccessToast();
    await locationsPage.expectLocationExists(name);
  });

  test('should create a location with minimum required fields', async () => {
    const name = generateUniqueName('Minimal Location');

    await locationsPage.clickAddButton();
    await locationsPage.dialog.fillForm({
      name,
      address: '456 Minimal Ave',
      city: 'Minimal City',
      state: 'MC',
      zipCode: '67890',
    });
    await locationsPage.dialog.submit();

    await locationsPage.expectSuccessToast();
    await locationsPage.expectLocationExists(name);
  });

  test('should reject duplicate location name', async () => {
    const name = generateUniqueName('Duplicate Location');

    // Create first location
    await locationsPage.clickAddButton();
    await locationsPage.dialog.createLocation({
      name,
      address: '111 First Ave',
      city: 'First City',
      state: 'FC',
      zipCode: '11111',
    });
    await locationsPage.expectSuccessToast();
    await locationsPage.waitForToastToDisappear();

    // Try to create second with same name
    await locationsPage.clickAddButton();
    await locationsPage.dialog.fillForm({
      name, // Same name
      address: '222 Second Ave',
      city: 'Second City',
      state: 'SC',
      zipCode: '22222',
    });
    await locationsPage.dialog.submit();

    // Should show error about duplicate
    await locationsPage.expectErrorToast('already exists');
  });

  // ==========================================================================
  // UPDATE
  // ==========================================================================

  test('should update location name', async () => {
    const originalName = generateUniqueName('Original Location');
    const updatedName = generateUniqueName('Updated Location');

    // Create location
    await locationsPage.clickAddButton();
    await locationsPage.dialog.createLocation({
      name: originalName,
      address: '123 Original St',
      city: 'Original City',
      state: 'OC',
      zipCode: '00000',
    });
    await locationsPage.expectSuccessToast();
    await locationsPage.waitForToastToDisappear();

    // Edit it
    await locationsPage.clickEdit(originalName);
    await locationsPage.dialog.fillForm({ name: updatedName });
    await locationsPage.dialog.submit();

    await locationsPage.expectSuccessToast();
    await locationsPage.expectLocationExists(updatedName);
    await locationsPage.expectLocationNotExists(originalName);
  });
});
