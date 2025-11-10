/**
 * Inngest Client Configuration
 *
 * This creates the Inngest client instance that's used throughout the app
 * for sending events and defining functions.
 *
 * Environment Variables:
 * - INNGEST_EVENT_KEY: For sending events (optional in dev)
 * - INNGEST_SIGNING_KEY: For receiving events (optional in dev)
 *
 * Local Development:
 * - Use dummy values (test/test) for local development
 * - Run `npx inngest-cli@latest dev` to start local dev server
 * - Access dashboard at http://localhost:8288
 *
 * Production:
 * - Get real keys from Inngest dashboard
 * - Add to Vercel environment variables
 */

import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'coursecove',
  name: 'CourseCove',
});
