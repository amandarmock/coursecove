import { test, expect } from '../../fixtures';
import { AppointmentsPage } from '../../pages/appointments.page';
import { generateUniqueName } from '../../utils/test-helpers';

test.describe('Appointment Type Validation', () => {
  let appointmentsPage: AppointmentsPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    appointmentsPage = new AppointmentsPage(authenticatedPage);
    await appointmentsPage.goto();
  });

  test('should reject empty name', async () => {
    await appointmentsPage.clickAddButton();
    await appointmentsPage.dialog.fillForm({
      name: '',
      duration: 60,
      locationMode: 'ONLINE',
    });
    await appointmentsPage.dialog.submit();

    // Should show validation error, not success
    await expect(appointmentsPage.dialog.root).toBeVisible();
    await appointmentsPage.dialog.expectValidationError('name');
  });

  test('should reject whitespace-only name', async () => {
    await appointmentsPage.clickAddButton();
    await appointmentsPage.dialog.fillForm({
      name: '   ',
      duration: 60,
      locationMode: 'ONLINE',
    });
    await appointmentsPage.dialog.submit();

    await expect(appointmentsPage.dialog.root).toBeVisible();
    await appointmentsPage.dialog.expectValidationError('name');
  });

  test('should require business location when mode is BUSINESS_LOCATION', async () => {
    await appointmentsPage.clickAddButton();
    await appointmentsPage.dialog.fillForm({
      name: generateUniqueName('Missing Location Test'),
      duration: 60,
      locationMode: 'BUSINESS_LOCATION',
      // businessLocationName intentionally omitted
    });
    await appointmentsPage.dialog.submit();

    // Should show validation error or toast error
    const dialogStillOpen = await appointmentsPage.dialog.isVisible();
    if (dialogStillOpen) {
      await appointmentsPage.dialog.expectValidationError('businessLocation');
    } else {
      await appointmentsPage.expectErrorToast('location');
    }
  });

  test('should sanitize XSS attempts in name', async () => {
    const maliciousName = '<script>alert("xss")</script>Clean Name';
    const expectedCleanName = 'Clean Name'; // After sanitization

    await appointmentsPage.clickAddButton();
    await appointmentsPage.dialog.fillForm({
      name: maliciousName,
      duration: 60,
      locationMode: 'ONLINE',
    });
    await appointmentsPage.dialog.submit();

    await appointmentsPage.expectSuccessToast();

    // The saved name should be sanitized (script tag removed)
    await appointmentsPage.expectAppointmentTypeExists(expectedCleanName);

    // Should NOT contain the script tag in the DOM
    const row = appointmentsPage.getRowByName(expectedCleanName);
    const rowText = await row.textContent();
    expect(rowText).not.toContain('<script>');
    expect(rowText).not.toContain('alert');
  });

  test('should enforce duration limits', async () => {
    await appointmentsPage.clickAddButton();

    // Try with duration too low (below minimum of 5)
    await appointmentsPage.dialog.fillForm({
      name: generateUniqueName('Invalid Duration Test'),
      duration: 1, // Below minimum
      locationMode: 'ONLINE',
    });
    await appointmentsPage.dialog.submit();

    // Should show validation error
    const dialogStillOpen = await appointmentsPage.dialog.isVisible();
    if (dialogStillOpen) {
      await appointmentsPage.dialog.expectValidationError('duration');
    } else {
      await appointmentsPage.expectErrorToast('duration');
    }
  });
});
