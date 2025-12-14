import { Page } from '@playwright/test';
import { AppointmentsPage } from './appointments.page';

/**
 * Private Lessons Page Object
 *
 * Handles the admin private lessons management page (/business/private-lessons).
 * This page is similar to appointments but for PRIVATE_LESSON category.
 *
 * Extends AppointmentsPage since the UI and functionality are nearly identical.
 */
export class PrivateLessonsPage extends AppointmentsPage {
  readonly path = '/business/private-lessons';

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to the private lessons page
   */
  async goto(): Promise<void> {
    await this.page.goto(this.path);
    await this.waitForPageLoad();
  }
}
