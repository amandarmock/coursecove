import { test, expect } from '../../fixtures';
import { AppointmentsPage } from '../../pages/appointments.page';
import { generateUniqueName } from '../../utils/test-helpers';

test.describe('Appointment Type Status Lifecycle', () => {
  let appointmentsPage: AppointmentsPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    appointmentsPage = new AppointmentsPage(authenticatedPage);
    await appointmentsPage.goto();
  });

  test('should create appointment type in DRAFT status by default', async () => {
    const name = generateUniqueName('Draft Status Test');

    await appointmentsPage.clickAddButton();
    await appointmentsPage.dialog.createAppointmentType({
      name,
      duration: 60,
      locationMode: 'ONLINE',
    });

    await appointmentsPage.expectSuccessToast();
    await appointmentsPage.expectStatus(name, 'Draft');
  });

  test('should publish DRAFT appointment type to PUBLISHED', async () => {
    const name = generateUniqueName('Publish Test');

    // Create a draft
    await appointmentsPage.clickAddButton();
    await appointmentsPage.dialog.createAppointmentType({
      name,
      duration: 60,
      locationMode: 'ONLINE',
    });
    await appointmentsPage.expectSuccessToast();
    await appointmentsPage.waitForToastToDisappear();

    // Publish it
    await appointmentsPage.clickPublish(name);
    await appointmentsPage.alertDialog.confirm();

    await appointmentsPage.expectSuccessToast('published');
    await appointmentsPage.expectStatus(name, 'Published');
  });

  test('should unpublish PUBLISHED appointment type to UNPUBLISHED', async () => {
    const name = generateUniqueName('Unpublish Test');

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

    // Now unpublish
    await appointmentsPage.clickUnpublish(name);
    await appointmentsPage.alertDialog.confirm();

    await appointmentsPage.expectSuccessToast('unpublished');
    await appointmentsPage.expectStatus(name, 'Unpublished');
  });

  test('should re-publish UNPUBLISHED appointment type', async () => {
    const name = generateUniqueName('Republish Test');

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

    // Now re-publish
    await appointmentsPage.clickPublish(name);
    await appointmentsPage.alertDialog.confirm();

    await appointmentsPage.expectSuccessToast('published');
    await appointmentsPage.expectStatus(name, 'Published');
  });

  test('should not show publish option for already published type', async () => {
    const name = generateUniqueName('No Publish Option Test');

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

    // Open actions menu and verify publish is not there, but unpublish is
    await appointmentsPage.openActionsMenu(name);

    const publishOption = appointmentsPage.page.locator('[role="menuitem"]:has-text("Publish")');
    const unpublishOption = appointmentsPage.page.locator('[role="menuitem"]:has-text("Unpublish")');

    await expect(publishOption).not.toBeVisible();
    await expect(unpublishOption).toBeVisible();
  });
});
