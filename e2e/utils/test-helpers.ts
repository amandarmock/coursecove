import { Page } from '@playwright/test';

let counter = 0;

/**
 * Generate a unique name for test data to avoid conflicts between parallel tests
 */
export function generateUniqueName(prefix: string): string {
  counter++;
  const timestamp = Date.now();
  return `${prefix} ${timestamp}-${counter}`;
}

/**
 * Wait for network to be idle (all requests completed)
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Wait for any visible toast to disappear
 */
export async function waitForToastToDisappear(page: Page): Promise<void> {
  const toast = page.locator('[data-testid="toast"]');
  if (await toast.isVisible()) {
    await toast.waitFor({ state: 'hidden', timeout: 10000 });
  }
}

/**
 * Dismiss a toast notification by clicking its close button
 */
export async function dismissToast(page: Page): Promise<void> {
  const closeButton = page.locator('[data-testid="toast"] button[aria-label="Close"]');
  if (await closeButton.isVisible()) {
    await closeButton.click();
  }
}

/**
 * Generate test data for common entities
 */
export function generateTestData() {
  return {
    appointmentType: {
      name: generateUniqueName('Test Appointment'),
      description: 'E2E test appointment type description',
      duration: 60,
      locationMode: 'ONLINE' as const,
    },
    location: {
      name: generateUniqueName('Test Location'),
      address: '123 Test Street',
      city: 'Test City',
      state: 'TS',
      zipCode: '12345',
    },
  };
}

/**
 * Format duration in minutes to human-readable string (matches app format)
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

/**
 * Retry an action until it succeeds or times out
 */
export async function retryUntil<T>(
  action: () => Promise<T>,
  options: { timeout?: number; interval?: number } = {}
): Promise<T> {
  const { timeout = 10000, interval = 500 } = options;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      return await action();
    } catch {
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }

  // Final attempt
  return action();
}
