import { test, expect } from '../../fixtures';
import { AppointmentsPage } from '../../pages/appointments.page';
import { generateUniqueName } from '../../utils/test-helpers';

test.describe('Appointment Type CRUD Operations', () => {
  let appointmentsPage: AppointmentsPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    appointmentsPage = new AppointmentsPage(authenticatedPage);
    await appointmentsPage.goto();
  });

  // ==========================================================================
  // CREATE
  // ==========================================================================

  test('should create appointment type with minimum required fields', async () => {
    const name = generateUniqueName('E2E Appointment');

    await appointmentsPage.clickAddButton();
    await appointmentsPage.dialog.fillForm({
      name,
      duration: 60,
      locationMode: 'ONLINE',
    });
    await appointmentsPage.dialog.submit();

    await appointmentsPage.expectSuccessToast();
    await appointmentsPage.expectAppointmentTypeExists(name);
    await appointmentsPage.expectStatus(name, 'Draft');
  });

  test('should create appointment type with all fields populated', async () => {
    const name = generateUniqueName('Full E2E Appointment');

    await appointmentsPage.clickAddButton();
    await appointmentsPage.dialog.fillForm({
      name,
      description: 'A comprehensive appointment type for E2E testing with full details',
      category: 'APPOINTMENT',
      duration: 90,
      locationMode: 'ONLINE',
    });
    await appointmentsPage.dialog.submit();

    await appointmentsPage.expectSuccessToast();
    await appointmentsPage.expectAppointmentTypeExists(name);
  });

  test('should show validation error for empty name', async () => {
    await appointmentsPage.clickAddButton();
    await appointmentsPage.dialog.fillForm({
      name: '',
      duration: 60,
      locationMode: 'ONLINE',
    });
    await appointmentsPage.dialog.submit();

    // Should stay on dialog with validation error
    await expect(appointmentsPage.dialog.root).toBeVisible();
    await appointmentsPage.dialog.expectValidationError('name');
  });

  test('should cancel creation and not save data', async () => {
    const name = generateUniqueName('Cancelled Appointment');

    await appointmentsPage.clickAddButton();
    await appointmentsPage.dialog.fillForm({
      name,
      duration: 60,
      locationMode: 'ONLINE',
    });
    await appointmentsPage.dialog.cancel();

    await appointmentsPage.expectAppointmentTypeNotExists(name);
  });

  // ==========================================================================
  // READ / LIST
  // ==========================================================================

  test('should filter appointment types by search query', async () => {
    // First create a known appointment type
    const uniqueName = generateUniqueName('Searchable Type');

    await appointmentsPage.clickAddButton();
    await appointmentsPage.dialog.createAppointmentType({
      name: uniqueName,
      duration: 60,
      locationMode: 'ONLINE',
    });
    await appointmentsPage.expectSuccessToast();
    await appointmentsPage.waitForToastToDisappear();

    // Now search for it
    await appointmentsPage.searchFor(uniqueName.split(' ')[0]); // Search by first word

    await appointmentsPage.expectAppointmentTypeExists(uniqueName);
  });

  // ==========================================================================
  // UPDATE
  // ==========================================================================

  test('should update appointment type name', async () => {
    // Create an appointment type first
    const originalName = generateUniqueName('Original Name');
    const updatedName = generateUniqueName('Updated Name');

    await appointmentsPage.clickAddButton();
    await appointmentsPage.dialog.createAppointmentType({
      name: originalName,
      duration: 60,
      locationMode: 'ONLINE',
    });
    await appointmentsPage.expectSuccessToast();
    await appointmentsPage.waitForToastToDisappear();

    // Now edit it
    await appointmentsPage.clickEdit(originalName);
    await appointmentsPage.dialog.fillForm({ name: updatedName });
    await appointmentsPage.dialog.submit();

    await appointmentsPage.expectSuccessToast();
    await appointmentsPage.expectAppointmentTypeExists(updatedName);
    await appointmentsPage.expectAppointmentTypeNotExists(originalName);
  });
});
