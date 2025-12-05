/**
 * Inngest API Endpoint
 *
 * This endpoint serves the Inngest functions and allows Inngest to:
 * - Discover your functions
 * - Trigger function execution
 * - Stream function results
 *
 * Local Development:
 * - Accessed by `npx inngest-cli@latest dev` at http://localhost:3000/api/inngest
 * - View functions at http://localhost:8288
 *
 * Production:
 * - Accessed by Inngest cloud platform
 * - Requires INNGEST_SIGNING_KEY for security
 * - Functions execute serverlessly on Vercel
 */

import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { processClerkWebhook, cleanupRemovedMemberships } from '@/inngest/functions';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processClerkWebhook,
    cleanupRemovedMemberships, // Daily cleanup of expired soft-deleted memberships
  ],
});
