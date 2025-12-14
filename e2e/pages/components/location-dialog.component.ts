import { Page, Locator, expect } from '@playwright/test';
import { SELECTORS } from '../../utils/selectors';

/**
 * Form data for creating/editing business locations
 */
export interface LocationFormData {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
}

/**
 * Location Dialog Component
 *
 * Handles the create/edit dialog for business locations.
 */
export class LocationDialogComponent {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ==========================================================================
  // Locators
  // ==========================================================================

  get root(): Locator {
    return this.page.locator(SELECTORS.dialogs.dialog);
  }

  get title(): Locator {
    return this.root.locator('h2, [role="heading"]').first();
  }

  get nameInput(): Locator {
    return this.root.locator(SELECTORS.locationForm.nameInput);
  }

  get addressInput(): Locator {
    return this.root.locator(SELECTORS.locationForm.addressInput);
  }

  get cityInput(): Locator {
    return this.root.locator(SELECTORS.locationForm.cityInput);
  }

  get stateInput(): Locator {
    return this.root.locator(SELECTORS.locationForm.stateInput);
  }

  get zipCodeInput(): Locator {
    return this.root.locator(SELECTORS.locationForm.zipCodeInput);
  }

  get notesInput(): Locator {
    return this.root.locator(SELECTORS.locationForm.notesInput);
  }

  get saveButton(): Locator {
    return this.root.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
  }

  get cancelButton(): Locator {
    return this.root.locator('button:has-text("Cancel")');
  }

  get closeButton(): Locator {
    return this.root.locator('button[aria-label="Close"]');
  }

  // ==========================================================================
  // Actions
  // ==========================================================================

  /**
   * Fill the location form with provided data
   */
  async fillForm(data: LocationFormData): Promise<void> {
    if (data.name !== undefined) {
      await this.nameInput.clear();
      await this.nameInput.fill(data.name);
    }

    if (data.address !== undefined) {
      await this.addressInput.clear();
      await this.addressInput.fill(data.address);
    }

    if (data.city !== undefined) {
      await this.cityInput.clear();
      await this.cityInput.fill(data.city);
    }

    if (data.state !== undefined) {
      await this.stateInput.clear();
      await this.stateInput.fill(data.state);
    }

    if (data.zipCode !== undefined) {
      await this.zipCodeInput.clear();
      await this.zipCodeInput.fill(data.zipCode);
    }

    if (data.notes !== undefined) {
      await this.notesInput.clear();
      await this.notesInput.fill(data.notes);
    }
  }

  /**
   * Submit the form
   */
  async submit(): Promise<void> {
    await this.saveButton.click();
  }

  /**
   * Cancel and close the dialog
   */
  async cancel(): Promise<void> {
    await this.cancelButton.click();
    await expect(this.root).not.toBeVisible();
  }

  /**
   * Close the dialog using the X button
   */
  async close(): Promise<void> {
    await this.closeButton.click();
    await expect(this.root).not.toBeVisible();
  }

  /**
   * Create a location (fill form and submit)
   */
  async createLocation(data: LocationFormData): Promise<void> {
    await this.fillForm(data);
    await this.submit();
  }

  /**
   * Expect a validation error for a specific field
   */
  async expectValidationError(fieldName: string, message?: string): Promise<void> {
    const fieldError = this.root.locator(`[data-field-error="${fieldName}"], #${fieldName}-error, [id$="${fieldName}-error"]`);

    if (await fieldError.count() === 0) {
      const genericError = this.root.locator('.text-destructive, .text-red-500, [role="alert"]');
      await expect(genericError.first()).toBeVisible();
      if (message) {
        await expect(genericError.first()).toContainText(message);
      }
    } else {
      await expect(fieldError.first()).toBeVisible();
      if (message) {
        await expect(fieldError.first()).toContainText(message);
      }
    }
  }

  /**
   * Check if the dialog is visible
   */
  async isVisible(): Promise<boolean> {
    return await this.root.isVisible();
  }

  /**
   * Wait for the dialog to be visible
   */
  async waitForVisible(): Promise<void> {
    await expect(this.root).toBeVisible();
  }
}
