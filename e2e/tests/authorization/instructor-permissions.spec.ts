import { test, expect } from '../../fixtures';
import { TeachingPage } from '../../pages/teaching.page';

test.describe('Instructor Authorization', () => {
  test('instructor cannot access appointments management page', async ({ instructorPage }) => {
    await instructorPage.goto('/business/appointments');

    // Should either redirect away or show forbidden/unauthorized
    // Wait a moment for potential redirect
    await instructorPage.waitForTimeout(1000);

    const currentUrl = instructorPage.url();

    // Should NOT be on the appointments page
    expect(currentUrl).not.toContain('/business/appointments');
  });

  test('instructor cannot access locations management page', async ({ instructorPage }) => {
    await instructorPage.goto('/business/locations');

    await instructorPage.waitForTimeout(1000);

    const currentUrl = instructorPage.url();
    expect(currentUrl).not.toContain('/business/locations');
  });

  test('instructor CAN access teaching page', async ({ instructorPage }) => {
    const teachingPage = new TeachingPage(instructorPage);
    await teachingPage.goto();

    // Should be on the teaching page
    await expect(instructorPage).toHaveURL(/\/teaching/);
    await expect(teachingPage.searchInput).toBeVisible();
  });

  test('student cannot access teaching page', async ({ studentPage }) => {
    await studentPage.goto('/teaching');

    await studentPage.waitForTimeout(1000);

    const currentUrl = studentPage.url();

    // Student should not have access to teaching page
    // They should be redirected somewhere else
    expect(currentUrl).not.toContain('/teaching');
  });
});
