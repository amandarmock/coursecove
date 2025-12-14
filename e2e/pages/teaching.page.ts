import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { SELECTORS } from '../utils/selectors';

/**
 * Teaching Page Object
 *
 * Handles the instructor teaching page (/teaching).
 * This page shows appointment types the instructor is qualified to teach.
 */
export class TeachingPage extends BasePage {
  readonly path = '/teaching';

  constructor(page: Page) {
    super(page);
  }

  // ==========================================================================
  // Locators
  // ==========================================================================

  get searchInput(): Locator {
    return this.page.getByPlaceholder(/search/i);
  }

  get categoryFilter(): Locator {
    return this.page.locator('[data-testid="category-filter"]').or(
      this.page.getByRole('combobox').filter({ hasText: /category|all/i })
    );
  }

  get appointmentTypeCards(): Locator {
    return this.page.locator('[data-testid="appointment-type-card"]').or(
      this.page.locator('[class*="card"]').filter({ has: this.page.locator('h3, [class*="title"]') })
    );
  }

  get statTotalCard(): Locator {
    return this.page.locator('[data-testid="stat-total"]').or(
      this.page.locator('text=Total Appointment Types').locator('..')
    );
  }

  get statPrivateLessonsCard(): Locator {
    return this.page.locator('[data-testid="stat-private-lessons"]').or(
      this.page.locator('text=Private Lessons').locator('..')
    );
  }

  get statAppointmentsCard(): Locator {
    return this.page.locator('[data-testid="stat-appointments"]').or(
      this.page.locator('text=Appointments').locator('..').first()
    );
  }

  get emptyState(): Locator {
    return this.page.locator('text=not qualified for any appointment types').or(
      this.page.locator('text=No appointment types')
    );
  }

  // ==========================================================================
  // Navigation
  // ==========================================================================

  /**
   * Navigate to the teaching page
   */
  async goto(): Promise<void> {
    await this.page.goto(this.path);
    await this.waitForPageLoad();
  }

  // ==========================================================================
  // Actions
  // ==========================================================================

  /**
   * Search for appointment types by name
   */
  async searchFor(query: string): Promise<void> {
    await this.searchInput.clear();
    await this.searchInput.fill(query);
    // Wait for search to filter results
    await this.page.waitForTimeout(400);
  }

  /**
   * Clear the search input
   */
  async clearSearch(): Promise<void> {
    await this.searchInput.clear();
    await this.page.waitForTimeout(400);
  }

  /**
   * Filter by category
   */
  async filterByCategory(category: 'all' | 'PRIVATE_LESSON' | 'APPOINTMENT'): Promise<void> {
    await this.categoryFilter.click();
    const optionName =
      category === 'all'
        ? 'All Categories'
        : category === 'PRIVATE_LESSON'
        ? 'Private Lessons'
        : 'Appointments';
    await this.page.getByRole('option', { name: optionName }).click();
    await this.waitForPageLoad();
  }

  /**
   * Get the count of visible appointment type cards
   */
  async getCardCount(): Promise<number> {
    return await this.appointmentTypeCards.count();
  }

  /**
   * Get a specific card by appointment type name
   */
  getCardByName(name: string): Locator {
    return this.appointmentTypeCards.filter({ hasText: name });
  }

  /**
   * Get the total count from the statistics
   */
  async getTotalCount(): Promise<number> {
    const text = await this.statTotalCard.locator('.text-2xl, [class*="font-bold"]').textContent();
    return parseInt(text || '0', 10);
  }

  /**
   * Get the private lessons count from the statistics
   */
  async getPrivateLessonsCount(): Promise<number> {
    const text = await this.statPrivateLessonsCard.locator('.text-2xl, [class*="font-bold"]').textContent();
    return parseInt(text || '0', 10);
  }

  /**
   * Get the appointments count from the statistics
   */
  async getAppointmentsCount(): Promise<number> {
    const text = await this.statAppointmentsCard.locator('.text-2xl, [class*="font-bold"]').textContent();
    return parseInt(text || '0', 10);
  }

  // ==========================================================================
  // Assertions
  // ==========================================================================

  /**
   * Assert that a card with the given name exists
   */
  async expectCardExists(name: string): Promise<void> {
    const card = this.getCardByName(name);
    await expect(card).toBeVisible();
  }

  /**
   * Assert that a card with the given name does NOT exist
   */
  async expectCardNotExists(name: string): Promise<void> {
    const card = this.getCardByName(name);
    await expect(card).not.toBeVisible();
  }

  /**
   * Assert the empty state is visible
   */
  async expectEmptyState(): Promise<void> {
    await expect(this.emptyState).toBeVisible();
  }

  /**
   * Assert a specific number of cards are visible
   */
  async expectCardCount(count: number): Promise<void> {
    await expect(this.appointmentTypeCards).toHaveCount(count);
  }

  /**
   * Assert the statistics cards are visible
   */
  async expectStatsVisible(): Promise<void> {
    await expect(this.statTotalCard).toBeVisible();
    await expect(this.statPrivateLessonsCard).toBeVisible();
    await expect(this.statAppointmentsCard).toBeVisible();
  }
}
