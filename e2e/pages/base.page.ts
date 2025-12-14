import { Page, Locator, expect } from '@playwright/test';
import { SELECTORS } from '../utils/selectors';

/**
 * Base Page Object
 *
 * Contains common elements and utilities shared across all pages.
 * Extend this class to create page-specific page objects.
 */
export abstract class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ==========================================================================
  // Common Locators
  // ==========================================================================

  get pageHeader(): Locator {
    return this.page.locator(SELECTORS.common.pageHeader);
  }

  get loadingSpinner(): Locator {
    return this.page.locator(SELECTORS.common.loadingSpinner);
  }

  get skeleton(): Locator {
    return this.page.locator(SELECTORS.common.skeleton);
  }

  get toast(): Locator {
    return this.page.locator(SELECTORS.common.toast);
  }

  get toastTitle(): Locator {
    return this.page.locator(SELECTORS.common.toastTitle);
  }

  get toastDescription(): Locator {
    return this.page.locator(SELECTORS.common.toastDescription);
  }

  // ==========================================================================
  // Common Actions
  // ==========================================================================

  /**
   * Wait for the page to finish loading
   */
  async waitForPageLoad(): Promise<void> {
    // Wait for network to be idle
    await this.page.waitForLoadState('networkidle');

    // Wait for loading spinners to disappear
    const spinner = this.loadingSpinner;
    if (await spinner.isVisible({ timeout: 100 }).catch(() => false)) {
      await expect(spinner).not.toBeVisible({ timeout: 10000 });
    }

    // Wait for skeletons to disappear
    const skeletons = this.skeleton;
    const skeletonCount = await skeletons.count();
    if (skeletonCount > 0) {
      await expect(skeletons.first()).not.toBeVisible({ timeout: 10000 });
    }
  }

  /**
   * Expect a success toast notification to appear
   */
  async expectSuccessToast(messageContains?: string): Promise<void> {
    await expect(this.toast).toBeVisible({ timeout: 5000 });

    if (messageContains) {
      await expect(this.toast).toContainText(messageContains, { ignoreCase: true });
    }
  }

  /**
   * Expect an error toast notification to appear
   */
  async expectErrorToast(messageContains?: string): Promise<void> {
    // Error toasts typically have destructive variant
    const errorToast = this.page.locator('[data-testid="toast"][data-variant="destructive"], [data-testid="toast"]:has-text("Error"), [data-testid="toast"]:has-text("error"), [data-testid="toast"]:has-text("Cannot"), [data-testid="toast"]:has-text("failed")');

    await expect(errorToast).toBeVisible({ timeout: 5000 });

    if (messageContains) {
      await expect(errorToast).toContainText(messageContains, { ignoreCase: true });
    }
  }

  /**
   * Dismiss the current toast notification
   */
  async dismissToast(): Promise<void> {
    const closeButton = this.page.locator(SELECTORS.common.toastClose);
    if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await closeButton.click();
      await expect(this.toast).not.toBeVisible();
    }
  }

  /**
   * Wait for any visible toast to disappear
   */
  async waitForToastToDisappear(): Promise<void> {
    if (await this.toast.isVisible({ timeout: 100 }).catch(() => false)) {
      await expect(this.toast).not.toBeVisible({ timeout: 10000 });
    }
  }

  /**
   * Take a screenshot for debugging
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `test-results/screenshots/${name}.png` });
  }
}
