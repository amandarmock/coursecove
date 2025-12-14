import { test, expect } from '../../fixtures';
import { AppointmentsPage } from '../../pages/appointments.page';
import { generateUniqueName } from '../../utils/test-helpers';

test.describe('Appointment Type Archive Workflow', () => {
  let appointmentsPage: AppointmentsPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    appointmentsPage = new AppointmentsPage(authenticatedPage);
    await appointmentsPage.goto();
  });

  test('should archive DRAFT appointment type', async () => {
    const name = generateUniqueName('Archive Draft Test');

    // Create a draft appointment type
    await appointmentsPage.clickAddButton();
    await appointmentsPage.dialog.createAppointmentType({
      name,
      duration: 60,
      locationMode: 'ONLINE',
    });
    await appointmentsPage.expectSuccessToast();
    await appointmentsPage.waitForToastToDisappear();

    // Archive it
    await appointmentsPage.clickArchive(name);
    await appointmentsPage.alertDialog.confirm();

    await appointmentsPage.expectSuccessToast('archived');
    // Should no longer be visible in the list
    await appointmentsPage.expectAppointmentTypeNotExists(name);
  });

  test('should archive UNPUBLISHED appointment type', async () => {
    const name = generateUniqueName('Archive Unpublished Test');

    // Create -> Publish -> Unpublish
    await appointmentsPage.clickAddButton();
    await appointmentsPage.dialog.createAppointmentType({
      name,
      duration: 60,
      locationMode: 'ONLINE',
    });
    await appointmentsPage.expectSuccessToast();
    await appointmentsPage.waitForToastToDisappear();

    await appointmentsPage.clickPublish(name);
    await appointmentsPage.alertDialog.confirm();
    await appointmentsPage.expectSuccessToast();
    await appointmentsPage.waitForToastToDisappear();

    await appointmentsPage.clickUnpublish(name);
    await appointmentsPage.alertDialog.confirm();
    await appointmentsPage.expectSuccessToast();
    await appointmentsPage.waitForToastToDisappear();

    // Archive the unpublished type
    await appointmentsPage.clickArchive(name);
    await appointmentsPage.alertDialog.confirm();

    await appointmentsPage.expectSuccessToast('archived');
    await appointmentsPage.expectAppointmentTypeNotExists(name);
  });

  test('should NOT allow archiving PUBLISHED appointment type', async () => {
    const name = generateUniqueName('No Archive Published Test');

    // Create and publish
    await appointmentsPage.clickAddButton();
    await appointmentsPage.dialog.createAppointmentType({
      name,
      duration: 60,
      locationMode: 'ONLINE',
    });
    await appointmentsPage.expectSuccessToast();
    await appointmentsPage.waitForToastToDisappear();

    await appointmentsPage.clickPublish(name);
    await appointmentsPage.alertDialog.confirm();
    await appointmentsPage.expectSuccessToast();
    await appointmentsPage.waitForToastToDisappear();

    // Try to archive
    await appointmentsPage.clickArchive(name);
    await appointmentsPage.alertDialog.confirm();

    // Should show error
    await appointmentsPage.expectErrorToast('Cannot archive');
    // Should still exist in the list
    await appointmentsPage.expectAppointmentTypeExists(name);
  });

  test('should cancel archive operation', async () => {
    const name = generateUniqueName('Cancel Archive Test');

    // Create a draft
    await appointmentsPage.clickAddButton();
    await appointmentsPage.dialog.createAppointmentType({
      name,
      duration: 60,
      locationMode: 'ONLINE',
    });
    await appointmentsPage.expectSuccessToast();
    await appointmentsPage.waitForToastToDisappear();

    // Start archive but cancel
    await appointmentsPage.clickArchive(name);
    await appointmentsPage.alertDialog.cancel();

    // Should still exist
    await appointmentsPage.expectAppointmentTypeExists(name);
  });
});
