import { test, expect } from '../../fixtures';
import { AppointmentsPage } from '../../pages/appointments.page';
import { generateUniqueName } from '../../utils/test-helpers';

test.describe('Concurrent Editing (Optimistic Locking)', () => {
  test('should show conflict error when version mismatch occurs', async ({ browser }) => {
    // Create two browser contexts (simulating two admin users)
    const context1 = await browser.newContext({
      storageState: 'e2e/.auth/admin.json',
    });
    const context2 = await browser.newContext({
      storageState: 'e2e/.auth/admin.json',
    });

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    const appointmentsPage1 = new AppointmentsPage(page1);
    const appointmentsPage2 = new AppointmentsPage(page2);

    try {
      // First user creates an appointment type
      const name = generateUniqueName('Concurrent Edit Test');

      await appointmentsPage1.goto();
      await appointmentsPage1.clickAddButton();
      await appointmentsPage1.dialog.createAppointmentType({
        name,
        duration: 60,
        locationMode: 'ONLINE',
      });
      await appointmentsPage1.expectSuccessToast();
      await appointmentsPage1.waitForToastToDisappear();

      // Both users open the edit dialog for the same appointment type
      await appointmentsPage1.clickEdit(name);

      await appointmentsPage2.goto();
      await appointmentsPage2.clickEdit(name);

      // First user saves their edit
      await appointmentsPage1.dialog.fillForm({ name: name + ' - User 1 Edit' });
      await appointmentsPage1.dialog.submit();
      await appointmentsPage1.expectSuccessToast();

      // Second user tries to save their edit (with stale version)
      await appointmentsPage2.dialog.fillForm({ name: name + ' - User 2 Edit' });
      await appointmentsPage2.dialog.submit();

      // Should show conflict/version mismatch error
      await appointmentsPage2.expectErrorToast('modified by another user');
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});
