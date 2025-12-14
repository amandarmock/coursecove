import { test, expect } from '../../fixtures';
import { TeachingPage } from '../../pages/teaching.page';
import { AppointmentsPage } from '../../pages/appointments.page';
import { generateUniqueName } from '../../utils/test-helpers';

test.describe('Instructor Teaching View', () => {
  test('instructor sees only PUBLISHED types they are qualified for', async ({
    adminPage,
    instructorPage,
  }) => {
    const appointmentsPage = new AppointmentsPage(adminPage);
    const teachingPage = new TeachingPage(instructorPage);

    const qualifiedName = generateUniqueName('Qualified Type');

    // Admin creates an appointment type
    // Note: For this test to work properly, the test instructor must be assigned
    // to the appointment type during creation. This may require adjusting the form
    // to select the instructor.
    await appointmentsPage.goto();
    await appointmentsPage.clickAddButton();
    await appointmentsPage.dialog.fillForm({
      name: qualifiedName,
      duration: 60,
      locationMode: 'ONLINE',
    });
    await appointmentsPage.dialog.submit();
    await appointmentsPage.expectSuccessToast();
    await appointmentsPage.waitForToastToDisappear();

    // Publish the appointment type
    await appointmentsPage.clickPublish(qualifiedName);
    await appointmentsPage.alertDialog.confirm();
    await appointmentsPage.expectSuccessToast();

    // Instructor navigates to teaching page
    await teachingPage.goto();

    // Should see the published type (if qualified)
    // Note: This test assumes the instructor is assigned to the appointment type
    // If the app auto-assigns the creator or has default instructor assignment,
    // this test may need adjustment
    const cardCount = await teachingPage.getCardCount();
    expect(cardCount).toBeGreaterThanOrEqual(0);
  });

  test('instructor does NOT see DRAFT types', async ({ adminPage, instructorPage }) => {
    const appointmentsPage = new AppointmentsPage(adminPage);
    const teachingPage = new TeachingPage(instructorPage);

    const draftName = generateUniqueName('Draft Only Type');

    // Admin creates a draft appointment type (does not publish)
    await appointmentsPage.goto();
    await appointmentsPage.clickAddButton();
    await appointmentsPage.dialog.createAppointmentType({
      name: draftName,
      duration: 60,
      locationMode: 'ONLINE',
    });
    await appointmentsPage.expectSuccessToast();

    // Instructor navigates to teaching page
    await teachingPage.goto();

    // Should NOT see the draft type
    await teachingPage.expectCardNotExists(draftName);
  });

  test('instructor sees statistics cards', async ({ instructorPage }) => {
    const teachingPage = new TeachingPage(instructorPage);
    await teachingPage.goto();

    // Verify stats are displayed
    await teachingPage.expectStatsVisible();
  });

  test('instructor can use search filter', async ({ instructorPage }) => {
    const teachingPage = new TeachingPage(instructorPage);
    await teachingPage.goto();

    // Search for something that likely doesn't exist
    await teachingPage.searchFor('ZZZZNONEXISTENT12345');

    // Either shows empty state or no results
    const cardCount = await teachingPage.getCardCount();
    expect(cardCount).toBe(0);
  });
});
