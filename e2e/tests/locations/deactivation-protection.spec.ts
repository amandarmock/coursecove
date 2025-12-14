import { test, expect } from '../../fixtures';
import { LocationsPage } from '../../pages/locations.page';
import { AppointmentsPage } from '../../pages/appointments.page';
import { generateUniqueName } from '../../utils/test-helpers';

test.describe('Location Deactivation Protection', () => {
  test('should prevent deactivating location used by appointment types', async ({ authenticatedPage }) => {
    const locationsPage = new LocationsPage(authenticatedPage);
    const appointmentsPage = new AppointmentsPage(authenticatedPage);

    const locationName = generateUniqueName('Protected Location');
    const appointmentName = generateUniqueName('Uses Protected Location');

    // Create a location
    await locationsPage.goto();
    await locationsPage.clickAddButton();
    await locationsPage.dialog.createLocation({
      name: locationName,
      address: '123 Protected St',
      city: 'Protected City',
      state: 'PC',
      zipCode: '12345',
    });
    await locationsPage.expectSuccessToast();
    await locationsPage.waitForToastToDisappear();

    // Create an appointment type using this location
    await appointmentsPage.goto();
    await appointmentsPage.clickAddButton();
    await appointmentsPage.dialog.fillForm({
      name: appointmentName,
      duration: 60,
      locationMode: 'BUSINESS_LOCATION',
      businessLocationName: locationName,
    });
    await appointmentsPage.dialog.submit();
    await appointmentsPage.expectSuccessToast();
    await appointmentsPage.waitForToastToDisappear();

    // Try to deactivate the location
    await locationsPage.goto();
    await locationsPage.clickDeactivate(locationName);

    // Should show error about location being in use
    await locationsPage.expectErrorToast('appointment type');
    // Location should still be active
    await locationsPage.expectStatus(locationName, 'Active');
  });

  test('should allow deactivating unused location', async ({ authenticatedPage }) => {
    const locationsPage = new LocationsPage(authenticatedPage);

    const locationName = generateUniqueName('Unused Location');

    // Create a location
    await locationsPage.goto();
    await locationsPage.clickAddButton();
    await locationsPage.dialog.createLocation({
      name: locationName,
      address: '456 Unused Ave',
      city: 'Unused City',
      state: 'UC',
      zipCode: '67890',
    });
    await locationsPage.expectSuccessToast();
    await locationsPage.waitForToastToDisappear();

    // Deactivate it (no appointment types using it)
    await locationsPage.clickDeactivate(locationName);

    await locationsPage.expectSuccessToast();

    // Toggle to show inactive and verify
    await locationsPage.toggleShowInactive();
    await locationsPage.expectStatus(locationName, 'Inactive');
  });
});
