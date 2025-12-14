import { test, expect } from '../../fixtures';
import { LocationsPage } from '../../pages/locations.page';
import { generateUniqueName } from '../../utils/test-helpers';

test.describe('Location Validation', () => {
  let locationsPage: LocationsPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    locationsPage = new LocationsPage(authenticatedPage);
    await locationsPage.goto();
  });

  test('should require name field', async () => {
    await locationsPage.clickAddButton();
    await locationsPage.dialog.fillForm({
      name: '',
      address: '123 Test St',
      city: 'Test City',
      state: 'TS',
      zipCode: '12345',
    });
    await locationsPage.dialog.submit();

    await expect(locationsPage.dialog.root).toBeVisible();
    await locationsPage.dialog.expectValidationError('name');
  });

  test('should require address fields', async () => {
    await locationsPage.clickAddButton();
    await locationsPage.dialog.fillForm({
      name: generateUniqueName('Missing Address'),
      address: '',
      city: '',
      state: '',
      zipCode: '',
    });
    await locationsPage.dialog.submit();

    // Should show validation errors for required fields
    await expect(locationsPage.dialog.root).toBeVisible();
    // At least one of the address fields should have an error
    const hasError =
      (await locationsPage.dialog.root.locator('.text-destructive, [role="alert"]').count()) > 0;
    expect(hasError).toBe(true);
  });

  test('should sanitize XSS in location name', async () => {
    const maliciousName = '<script>alert("xss")</script>Clean Location';
    const expectedCleanName = 'Clean Location';

    await locationsPage.clickAddButton();
    await locationsPage.dialog.fillForm({
      name: maliciousName,
      address: '789 Clean St',
      city: 'Clean City',
      state: 'CC',
      zipCode: '99999',
    });
    await locationsPage.dialog.submit();

    await locationsPage.expectSuccessToast();
    await locationsPage.expectLocationExists(expectedCleanName);

    // Verify no script tag in the DOM
    const row = locationsPage.getRowByName(expectedCleanName);
    const rowText = await row.textContent();
    expect(rowText).not.toContain('<script>');
  });
});
