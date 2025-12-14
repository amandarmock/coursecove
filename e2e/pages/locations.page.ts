import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { LocationDialogComponent } from './components/location-dialog.component';
import { AlertDialogComponent } from './components/alert-dialog.component';
import { SELECTORS } from '../utils/selectors';

/**
 * Locations Page Object
 *
 * Handles the admin business locations management page (/business/locations).
 */
export class LocationsPage extends BasePage {
  readonly path = '/business/locations';
  readonly dialog: LocationDialogComponent;
  readonly alertDialog: AlertDialogComponent;

  constructor(page: Page) {
    super(page);
    this.dialog = new LocationDialogComponent(page);
    this.alertDialog = new AlertDialogComponent(page);
  }

  // ==========================================================================
  // Locators
  // ==========================================================================

  get addButton(): Locator {
    return this.page.getByRole('button', { name: /add location/i });
  }

  get showInactiveToggle(): Locator {
    return this.page.locator(SELECTORS.locations.showInactiveToggle).or(
      this.page.getByLabel(/show inactive/i)
    );
  }

  get table(): Locator {
    return this.page.locator('table');
  }

  get tableRows(): Locator {
    return this.table.locator('tbody tr');
  }

  get emptyState(): Locator {
    return this.page.locator('text=No locations');
  }

  // ==========================================================================
  // Navigation
  // ==========================================================================

  /**
   * Navigate to the locations page
   */
  async goto(): Promise<void> {
    await this.page.goto(this.path);
    await this.waitForPageLoad();
  }

  // ==========================================================================
  // Actions
  // ==========================================================================

  /**
   * Click the Add Location button
   */
  async clickAddButton(): Promise<void> {
    await this.addButton.click();
    await expect(this.dialog.root).toBeVisible();
  }

  /**
   * Toggle the show inactive locations checkbox
   */
  async toggleShowInactive(): Promise<void> {
    await this.showInactiveToggle.click();
    await this.waitForPageLoad();
  }

  /**
   * Get a table row by location name
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
   * Open the actions dropdown menu for a location
   */
  async openActionsMenu(name: string): Promise<void> {
    const row = this.getRowByName(name);
    await row.locator(SELECTORS.tables.actionsMenuTrigger).click();
  }

  /**
   * Click Edit in the actions menu for a location
   */
  async clickEdit(name: string): Promise<void> {
    await this.openActionsMenu(name);
    await this.page.locator(SELECTORS.actions.edit).click();
    await expect(this.dialog.root).toBeVisible();
  }

  /**
   * Click Deactivate in the actions menu for a location
   */
  async clickDeactivate(name: string): Promise<void> {
    await this.openActionsMenu(name);
    await this.page.locator(SELECTORS.actions.deactivate).click();
    // May or may not have confirmation dialog depending on implementation
  }

  /**
   * Click Activate in the actions menu for a location
   */
  async clickActivate(name: string): Promise<void> {
    await this.openActionsMenu(name);
    await this.page.locator(SELECTORS.actions.activate).click();
  }

  /**
   * Click Delete in the actions menu for a location
   */
  async clickDelete(name: string): Promise<void> {
    await this.openActionsMenu(name);
    await this.page.locator(SELECTORS.actions.delete).click();
    await expect(this.alertDialog.root).toBeVisible();
  }

  /**
   * Get the status (Active/Inactive) for a location
   */
  async getStatus(name: string): Promise<string> {
    const row = this.getRowByName(name);
    const badge = row.locator('[data-testid="status-badge"]').or(
      row.locator('.inline-flex').filter({ hasText: /active|inactive/i })
    );
    return (await badge.textContent()) || '';
  }

  /**
   * Get the full address text for a location
   */
  async getAddress(name: string): Promise<string> {
    const row = this.getRowByName(name);
    // Address is typically in the second column
    const cells = row.locator('td');
    return (await cells.nth(1).textContent()) || '';
  }

  // ==========================================================================
  // Assertions
  // ==========================================================================

  /**
   * Assert that a location exists in the table
   */
  async expectLocationExists(name: string): Promise<void> {
    const row = this.getRowByName(name);
    await expect(row).toBeVisible();
  }

  /**
   * Assert that a location does NOT exist in the table
   */
  async expectLocationNotExists(name: string): Promise<void> {
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
   * Assert a location has a specific status
   */
  async expectStatus(name: string, status: 'Active' | 'Inactive'): Promise<void> {
    const actualStatus = await this.getStatus(name);
    expect(actualStatus.toLowerCase()).toContain(status.toLowerCase());
  }
}
