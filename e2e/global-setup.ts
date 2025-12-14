import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const AUTH_DIR = path.join(__dirname, '.auth');

interface AuthUser {
  email: string;
  password: string;
  statePath: string;
}

async function globalSetup(config: FullConfig) {
  // Ensure auth directory exists
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

  // Check if we have test credentials
  if (!process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD) {
    console.log('⚠️  E2E credentials not set. Skipping auth setup.');
    console.log('   Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD in .env.e2e');

    // Create placeholder auth files so tests can still run (they'll fail on auth)
    const placeholderState = { cookies: [], origins: [] };
    fs.writeFileSync(
      path.join(AUTH_DIR, 'admin.json'),
      JSON.stringify(placeholderState, null, 2)
    );
    fs.writeFileSync(
      path.join(AUTH_DIR, 'instructor.json'),
      JSON.stringify(placeholderState, null, 2)
    );
    fs.writeFileSync(
      path.join(AUTH_DIR, 'student.json'),
      JSON.stringify(placeholderState, null, 2)
    );
    return;
  }

  const browser = await chromium.launch();

  const users: AuthUser[] = [
    {
      email: process.env.E2E_ADMIN_EMAIL!,
      password: process.env.E2E_ADMIN_PASSWORD!,
      statePath: path.join(AUTH_DIR, 'admin.json'),
    },
  ];

  // Add instructor if credentials exist
  if (process.env.E2E_INSTRUCTOR_EMAIL && process.env.E2E_INSTRUCTOR_PASSWORD) {
    users.push({
      email: process.env.E2E_INSTRUCTOR_EMAIL,
      password: process.env.E2E_INSTRUCTOR_PASSWORD,
      statePath: path.join(AUTH_DIR, 'instructor.json'),
    });
  }

  // Add student if credentials exist
  if (process.env.E2E_STUDENT_EMAIL && process.env.E2E_STUDENT_PASSWORD) {
    users.push({
      email: process.env.E2E_STUDENT_EMAIL,
      password: process.env.E2E_STUDENT_PASSWORD,
      statePath: path.join(AUTH_DIR, 'student.json'),
    });
  }

  for (const user of users) {
    console.log(`🔐 Setting up auth for ${user.email}...`);
    await setupAuthState(browser, baseURL, user);
  }

  await browser.close();
  console.log('✅ Auth setup complete');
}

async function setupAuthState(
  browser: any,
  baseURL: string,
  user: AuthUser
): Promise<void> {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to sign-in page
    await page.goto(`${baseURL}/sign-in`, { waitUntil: 'networkidle' });

    // Wait for Clerk sign-in form to load
    await page.waitForSelector('input[name="identifier"]', { timeout: 15000 });

    // Enter email
    await page.fill('input[name="identifier"]', user.email);
    await page.click('button[type="submit"]');

    // Wait for password field (Clerk uses multi-step login)
    await page.waitForSelector('input[name="password"]', { timeout: 10000 });

    // Enter password
    await page.fill('input[name="password"]', user.password);
    await page.click('button[type="submit"]');

    // Wait for successful authentication and redirect
    // The app redirects to dashboard or teaching page after login
    await page.waitForURL(/\/(dashboard|teaching|business)/, { timeout: 30000 });

    // Save the authenticated state
    await context.storageState({ path: user.statePath });
    console.log(`   ✓ Auth saved to ${path.basename(user.statePath)}`);
  } catch (error) {
    console.error(`   ✗ Auth failed for ${user.email}:`, error);
    // Create empty state file so tests fail gracefully
    const emptyState = { cookies: [], origins: [] };
    fs.writeFileSync(user.statePath, JSON.stringify(emptyState, null, 2));
  } finally {
    await context.close();
  }
}

export default globalSetup;
