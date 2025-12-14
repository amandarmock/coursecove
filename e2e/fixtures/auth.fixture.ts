import { test as base, expect, Page, BrowserContext } from '@playwright/test';
import path from 'path';

/**
 * Test user configuration
 */
export interface TestUser {
  email: string;
  role: 'admin' | 'instructor' | 'student';
  storageStatePath: string;
}

export const TEST_USERS: Record<string, TestUser> = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || 'e2e-admin@test.coursecove.com',
    role: 'admin',
    storageStatePath: path.join(__dirname, '../.auth/admin.json'),
  },
  instructor: {
    email: process.env.E2E_INSTRUCTOR_EMAIL || 'e2e-instructor@test.coursecove.com',
    role: 'instructor',
    storageStatePath: path.join(__dirname, '../.auth/instructor.json'),
  },
  student: {
    email: process.env.E2E_STUDENT_EMAIL || 'e2e-student@test.coursecove.com',
    role: 'student',
    storageStatePath: path.join(__dirname, '../.auth/student.json'),
  },
};

/**
 * Extended test fixtures with authenticated pages for different user roles
 */
interface AuthFixtures {
  /** Page authenticated as admin user */
  adminPage: Page;
  /** Page authenticated as instructor user */
  instructorPage: Page;
  /** Page authenticated as student user */
  studentPage: Page;
  /** Default authenticated page (uses admin by default from config) */
  authenticatedPage: Page;
}

/**
 * Extended test with authentication fixtures
 */
export const test = base.extend<AuthFixtures>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: TEST_USERS.admin.storageStatePath,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  instructorPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: TEST_USERS.instructor.storageStatePath,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  studentPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: TEST_USERS.student.storageStatePath,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  authenticatedPage: async ({ page }, use) => {
    // Uses the default storage state from playwright.config.ts (admin)
    await use(page);
  },
});

export { expect };
