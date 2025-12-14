import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { AppointmentTypeDialogComponent } from './components/appointment-type-dialog.component';
import { AlertDialogComponent } from './components/alert-dialog.component';
import { SELECTORS } from '../utils/selectors';

/**
 * Appointments Page Object
 *
 * Handles the admin appointments management page (/business/appointments).
 * This page lists appointment types with APPOINTMENT category.
 */
export class AppointmentsPage extends BasePage {
  readonly path: string = '/business/appointments';
  readonly dialog: AppointmentTypeDialogComponent;
  readonly alertDialog: AlertDialogComponent;

  constructor(page: Page) {
    super(page);
    this.dialog = new AppointmentTypeDialogComponent(page);
    this.alertDialog = new AlertDialogComponent(page);
  }

  // ==========================================================================
  // Locators
  // ==========================================================================

  get addButton(): Locator {
    return this.page.getByRole('button', { name: /add appointment type/i });
  }

  get searchInput(): Locator {
    return this.page.getByPlaceholder(/search/i);
  }

  get statusFilter(): Locator {
    return this.page.locator('[data-testid="status-filter"]').or(
      this.page.getByRole('combobox').filter({ hasText: /status|all/i })
    );
  }

  get table(): Locator {
    return this.page.locator('table');
  }

  get tableRows(): Locator {
    return this.table.locator('tbody tr');
  }

  get emptyState(): Locator {
    return this.page.locator('text=No appointment types');
  }

  // ==========================================================================
  // Navigation
  // ==========================================================================

  /**
   * Navigate to the appointments page
   */
  async goto(): Promise<void> {
    await this.page.goto(this.path);
    await this.waitForPageLoad();
  }

  // ==========================================================================
  // Actions
  // ==========================================================================

  /**
   * Click the Add Appointment Type button
   */
  async clickAddButton(): Promise<void> {
    await this.addButton.click();
    await expect(this.dialog.root).toBeVisible();
  }

  /**
   * Search for appointment types by name
   */
  async searchFor(query: string): Promise<void> {
    await this.searchInput.clear();
    await this.searchInput.fill(query);
    // Wait for debounced search to apply
    await this.page.waitForTimeout(400);
    await this.waitForPageLoad();
  }

  /**
   * Clear the search input
   */
  async clearSearch(): Promise<void> {
    await this.searchInput.clear();
    await this.page.waitForTimeout(400);
    await this.waitForPageLoad();
  }

  /**
   * Filter appointment types by status
   */
  async filterByStatus(status: 'all' | 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED'): Promise<void> {
    await this.statusFilter.click();
    const optionName = status === 'all' ? 'All Status' : status.charAt(0) + status.slice(1).toLowerCase();
    await this.page.getByRole('option', { name: new RegExp(optionName, 'i') }).click();
    await this.waitForPageLoad();
  }

  /**
   * Get a table row by appointment type name
   */
  getRowByName(name: string): Locator {
    return this.tableRows.filter({ hasText: name });
  }

  /**
   * Get the count of visible table rows
   */
  async getRowCount(): Promise<number> {
    return await this.tableRows.count();
  }

  /**
   * Open the actions dropdown menu for an appointment type
   */
  async openActionsMenu(name: string): Promise<void> {
    const row = this.getRowByName(name);
    await row.locator(SELECTORS.tables.actionsMenuTrigger).click();
  }

  /**
   * Click Edit in the actions menu for an appointment type
   */
  async clickEdit(name: string): Promise<void> {
    await this.openActionsMenu(name);
    await this.page.locator(SELECTORS.actions.edit).click();
    await expect(this.dialog.root).toBeVisible();
  }

  /**
   * Click Publish in the actions menu for an appointment type
   */
  async clickPublish(name: string): Promise<void> {
    await this.openActionsMenu(name);
    await this.page.locator(SELECTORS.actions.publish).click();
    await expect(this.alertDialog.root).toBeVisible();
  }

  /**
   * Click Unpublish in the actions menu for an appointment type
   */
  async clickUnpublish(name: string): Promise<void> {
    await this.openActionsMenu(name);
    await this.page.locator(SELECTORS.actions.unpublish).click();
    await expect(this.alertDialog.root).toBeVisible();
  }

  /**
   * Click Archive in the actions menu for an appointment type
   */
  async clickArchive(name: string): Promise<void> {
    await this.openActionsMenu(name);
    await this.page.locator(SELECTORS.actions.archive).click();
    await expect(this.alertDialog.root).toBeVisible();
  }

  /**
   * Get the status badge text for an appointment type
   */
  async getStatus(name: string): Promise<string> {
    const row = this.getRowByName(name);
    const badge = row.locator('[data-testid="status-badge"]').or(
      row.locator('.inline-flex').filter({ hasText: /draft|published|unpublished/i })
    );
    return (await badge.textContent()) || '';
  }

  /**
   * Get the duration text for an appointment type
   */
  async getDuration(name: string): Promise<string> {
    const row = this.getRowByName(name);
    // Duration is typically in the second column
    const cells = row.locator('td');
    return (await cells.nth(1).textContent()) || '';
  }

  /**
   * Get the booking count for an appointment type
   */
  async getBookingCount(name: string): Promise<number> {
    const row = this.getRowByName(name);
    // Look for the bookings column (typically last before actions)
    const bookingsCell = row.locator('td').filter({ hasText: /^\d+$/ }).last();
    const text = await bookingsCell.textContent();
    return parseInt(text || '0', 10);
  }

  // ==========================================================================
  // Assertions
  // ==========================================================================

  /**
   * Assert that an appointment type exists in the table
   */
  async expectAppointmentTypeExists(name: string): Promise<void> {
    const row = this.getRowByName(name);
    await expect(row).toBeVisible();
  }

  /**
   * Assert that an appointment type does NOT exist in the table
   */
  async expectAppointmentTypeNotExists(name: string): Promise<void> {
    const row = this.getRowByName(name);
    await expect(row).not.toBeVisible();
  }

  /**
   * Assert the empty state is visible
   */
  async expectEmptyState(): Promise<void> {
    await expect(this.emptyState).toBeVisible();
  }

  /**
   * Assert the table has a specific number of rows
   */
  async expectRowCount(count: number): Promise<void> {
    await expect(this.tableRows).toHaveCount(count);
  }

  /**
   * Assert an appointment type has a specific status
   */
  async expectStatus(name: string, status: 'Draft' | 'Published' | 'Unpublished'): Promise<void> {
    const actualStatus = await this.getStatus(name);
    expect(actualStatus.toLowerCase()).toContain(status.toLowerCase());
  }
}
