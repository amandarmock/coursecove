import { Page, Locator, expect } from '@playwright/test';
import { SELECTORS } from '../../utils/selectors';

/**
 * Alert Dialog Component
 *
 * Handles confirmation dialogs for destructive or important actions
 * (publish, unpublish, archive, delete, etc.)
 */
export class AlertDialogComponent {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ==========================================================================
  // Locators
  // ==========================================================================

  get root(): Locator {
    return this.page.locator(SELECTORS.dialogs.alertDialog);
  }

  get title(): Locator {
    return this.root.locator('h2, [role="heading"]');
  }

  get description(): Locator {
    return this.root.locator('p');
  }

  get confirmButton(): Locator {
    // Match various confirm button texts
    return this.root.locator('button').filter({
      hasText: /^(Confirm|Yes|Archive|Publish|Unpublish|Delete|Continue|OK)$/i,
    });
  }

  get cancelButton(): Locator {
    return this.root.locator('button:has-text("Cancel")');
  }

  // ==========================================================================
  // Actions
  // ==========================================================================

  /**
   * Confirm the action (click the primary action button)
   */
  async confirm(): Promise<void> {
    await expect(this.root).toBeVisible();
    await this.confirmButton.click();
    // Wait for dialog to close
    await expect(this.root).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Cancel the action
   */
  async cancel(): Promise<void> {
    await expect(this.root).toBeVisible();
    await this.cancelButton.click();
    await expect(this.root).not.toBeVisible();
  }

  /**
   * Check if the dialog is currently visible
   */
  async isVisible(): Promise<boolean> {
    return await this.root.isVisible();
  }

  /**
   * Get the dialog title text
   */
  async getTitle(): Promise<string> {
    return (await this.title.textContent()) || '';
  }

  /**
   * Get the dialog description text
   */
  async getDescription(): Promise<string> {
    return (await this.description.textContent()) || '';
  }

  /**
   * Expect the dialog to be visible with specific title
   */
  async expectVisible(titleContains?: string): Promise<void> {
    await expect(this.root).toBeVisible();
    if (titleContains) {
      await expect(this.title).toContainText(titleContains);
    }
  }
}
