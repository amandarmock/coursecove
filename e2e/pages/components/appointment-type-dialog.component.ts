import { Page, Locator, expect } from '@playwright/test';
import { SELECTORS } from '../../utils/selectors';

/**
 * Form data for creating/editing appointment types
 */
export interface AppointmentTypeFormData {
  name?: string;
  description?: string;
  category?: 'PRIVATE_LESSON' | 'APPOINTMENT';
  duration?: number;
  locationMode?: 'BUSINESS_LOCATION' | 'ONLINE' | 'STUDENT_LOCATION';
  businessLocationName?: string;
  instructorNames?: string[];
}

/**
 * Appointment Type Dialog Component
 *
 * Handles the create/edit dialog for appointment types.
 */
export class AppointmentTypeDialogComponent {
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
    return this.root.locator(SELECTORS.appointmentTypeForm.nameInput);
  }

  get descriptionInput(): Locator {
    return this.root.locator(SELECTORS.appointmentTypeForm.descriptionInput);
  }

  get durationInput(): Locator {
    return this.root.locator(SELECTORS.appointmentTypeForm.durationInput);
  }

  get categorySelect(): Locator {
    return this.root.locator(SELECTORS.appointmentTypeForm.categorySelect);
  }

  get locationModeOnline(): Locator {
    return this.root.locator(SELECTORS.appointmentTypeForm.locationModeOnline);
  }

  get locationModeBusinessLocation(): Locator {
    return this.root.locator(SELECTORS.appointmentTypeForm.locationModeBusinessLocation);
  }

  get locationModeStudentLocation(): Locator {
    return this.root.locator(SELECTORS.appointmentTypeForm.locationModeStudentLocation);
  }

  get businessLocationSelect(): Locator {
    return this.root.locator(SELECTORS.appointmentTypeForm.businessLocationSelect);
  }

  get instructorSelect(): Locator {
    return this.root.locator(SELECTORS.appointmentTypeForm.instructorSelect);
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
   * Fill the appointment type form with provided data
   */
  async fillForm(data: AppointmentTypeFormData): Promise<void> {
    if (data.name !== undefined) {
      await this.nameInput.clear();
      await this.nameInput.fill(data.name);
    }

    if (data.description !== undefined) {
      await this.descriptionInput.clear();
      await this.descriptionInput.fill(data.description);
    }

    if (data.duration !== undefined) {
      await this.durationInput.clear();
      await this.durationInput.fill(data.duration.toString());
    }

    if (data.category) {
      await this.categorySelect.click();
      const optionText = data.category === 'PRIVATE_LESSON' ? 'Private Lesson' : 'Appointment';
      await this.page.getByRole('option', { name: optionText }).click();
    }

    if (data.locationMode) {
      switch (data.locationMode) {
        case 'ONLINE':
          await this.locationModeOnline.click();
          break;
        case 'BUSINESS_LOCATION':
          await this.locationModeBusinessLocation.click();
          break;
        case 'STUDENT_LOCATION':
          await this.locationModeStudentLocation.click();
          break;
      }
    }

    if (data.businessLocationName) {
      await this.businessLocationSelect.click();
      await this.page.getByRole('option', { name: data.businessLocationName }).click();
    }

    if (data.instructorNames && data.instructorNames.length > 0) {
      await this.instructorSelect.click();
      for (const name of data.instructorNames) {
        await this.page.getByRole('option', { name }).click();
      }
      // Close the dropdown by clicking elsewhere
      await this.root.click({ position: { x: 10, y: 10 } });
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
   * Create an appointment type (fill form and submit)
   */
  async createAppointmentType(data: AppointmentTypeFormData): Promise<void> {
    await this.fillForm(data);
    await this.submit();
  }

  /**
   * Expect a validation error for a specific field
   */
  async expectValidationError(fieldName: string, message?: string): Promise<void> {
    // Look for error message near the field
    const fieldError = this.root.locator(`[data-field-error="${fieldName}"], #${fieldName}-error, [id$="${fieldName}-error"]`);

    // If specific error locator not found, try generic error messages
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

  /**
   * Get the current value of the name input
   */
  async getNameValue(): Promise<string> {
    return await this.nameInput.inputValue();
  }

  /**
   * Get the current value of the duration input
   */
  async getDurationValue(): Promise<string> {
    return await this.durationInput.inputValue();
  }
}
