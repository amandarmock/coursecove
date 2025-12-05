/**
 * Inngest Worker Functions
 *
 * These functions are triggered by Inngest events and process webhooks
 * that couldn't be handled synchronously (race conditions, dependencies missing, etc.)
 *
 * Benefits:
 * - Automatic retries with exponential backoff
 * - Built-in monitoring and observability
 * - No timeout limits (unlike API routes)
 * - Guaranteed eventual processing
 */

import { inngest } from './client';
import { prisma } from '@/lib/db/prisma';
import { subDays } from 'date-fns';

const SOFT_DELETE_RETENTION_DAYS = 30;

/**
 * Process Clerk Webhook Event
 *
 * This function is triggered when a webhook is queued due to:
 * - Dependencies not ready (user/org not created yet)
 * - Race conditions
 * - Synchronous processing timeout
 *
 * Inngest handles:
 * - Automatic retries (up to 5 attempts)
 * - Exponential backoff
 * - Error tracking
 * - Monitoring dashboard
 */
export const processClerkWebhook = inngest.createFunction(
  {
    id: 'process-clerk-webhook',
    retries: 5, // Inngest will retry up to 5 times
  },
  { event: 'clerk/webhook.received' },
  async ({ event, step }) => {
    const { webhookId, eventType, payload } = event.data;

    console.log(`[Inngest] Processing webhook: ${eventType} (ID: ${webhookId})`);

    // Step 1: Check if already processed (idempotency)
    const existingEvent = await step.run('check-idempotency', async () => {
      return await prisma.webhookEvent.findUnique({
        where: { webhookId },
      });
    });

    if (existingEvent?.status === 'completed') {
      console.log(`[Inngest] Webhook ${webhookId} already processed, skipping`);
      return { status: 'already_processed', webhookId };
    }

    // Step 2: Process the webhook event
    try {
      await step.run('process-webhook', async () => {
        await processWebhookEvent(eventType, payload);
      });

      // Step 3: Mark as completed
      await step.run('mark-completed', async () => {
        await prisma.webhookEvent.update({
          where: { webhookId },
          data: {
            status: 'completed',
            processedAt: new Date(),
            attempts: { increment: 1 },
          },
        });
      });

      console.log(`[Inngest] Successfully processed: ${eventType}`);
      return { status: 'success', webhookId, eventType };
    } catch (error) {
      // Update error in database
      await step.run('mark-failed', async () => {
        await prisma.webhookEvent.update({
          where: { webhookId },
          data: {
            status: 'failed',
            lastError: error instanceof Error ? error.message : 'Unknown error',
            attempts: { increment: 1 },
          },
        });
      });

      console.error(`[Inngest] Failed to process ${eventType}:`, error);
      throw error; // Inngest will retry
    }
  }
);

// ============================================
// EVENT PROCESSING LOGIC
// ============================================

async function processWebhookEvent(eventType: string, data: any) {
  switch (eventType) {
    // User events
    case 'user.created':
      await handleUserCreated(data);
      break;
    case 'user.updated':
      await handleUserUpdated(data);
      break;
    case 'user.deleted':
      await handleUserDeleted(data);
      break;

    // Organization events
    case 'organization.created':
      await handleOrganizationCreated(data);
      break;
    case 'organization.updated':
      await handleOrganizationUpdated(data);
      break;
    case 'organization.deleted':
      await handleOrganizationDeleted(data);
      break;

    // Organization membership events
    case 'organizationMembership.created':
      await handleMembershipCreated(data);
      break;
    case 'organizationMembership.updated':
      await handleMembershipUpdated(data);
      break;
    case 'organizationMembership.deleted':
      await handleMembershipDeleted(data);
      break;

    default:
      console.log(`[Inngest] Unhandled event type: ${eventType}`);
  }
}

// ============================================
// USER EVENT HANDLERS
// ============================================

async function handleUserCreated(data: any) {
  console.log('[Inngest] Creating user:', data.id);

  const primaryEmail = data.email_addresses.find(
    (email: any) => email.id === data.primary_email_address_id
  );

  await prisma.user.upsert({
    where: { clerkUserId: data.id },
    update: {},
    create: {
      clerkUserId: data.id,
      email: primaryEmail.email_address,
      firstName: data.first_name || '',
      lastName: data.last_name || '',
      avatarUrl: data.image_url,
      status: 'ACTIVE',
    },
  });

  console.log('[Inngest] User created in database');
}

async function handleUserUpdated(data: any) {
  console.log('[Inngest] Updating user:', data.id);

  const primaryEmail = data.email_addresses.find(
    (email: any) => email.id === data.primary_email_address_id
  );

  await prisma.user.update({
    where: { clerkUserId: data.id },
    data: {
      email: primaryEmail.email_address,
      firstName: data.first_name || '',
      lastName: data.last_name || '',
      avatarUrl: data.image_url,
    },
  });

  console.log('[Inngest] User updated in database');
}

async function handleUserDeleted(data: any) {
  console.log('[Inngest] Soft deleting user:', data.id);

  await prisma.user.updateMany({
    where: { clerkUserId: data.id },
    data: { status: 'DELETED' },
  });

  console.log('[Inngest] User soft deleted in database');
}

// ============================================
// ORGANIZATION EVENT HANDLERS
// ============================================

async function handleOrganizationCreated(data: any) {
  console.log('[Inngest] Creating organization:', data.id);

  const subdomain = data.slug.replace(/-/g, '');

  await prisma.organization.upsert({
    where: { clerkOrganizationId: data.id },
    update: {},
    create: {
      clerkOrganizationId: data.id,
      name: data.name,
      slug: data.slug,
      subdomain: subdomain,
      status: 'ACTIVE',
    },
  });

  console.log('[Inngest] Organization created with subdomain:', subdomain);
}

async function handleOrganizationUpdated(data: any) {
  console.log('[Inngest] Updating organization:', data.id);

  await prisma.organization.update({
    where: { clerkOrganizationId: data.id },
    data: {
      name: data.name,
      slug: data.slug,
    },
  });

  console.log('[Inngest] Organization updated in database');
}

async function handleOrganizationDeleted(data: any) {
  console.log('[Inngest] Deleting organization:', data.id);

  await prisma.organization.deleteMany({
    where: { clerkOrganizationId: data.id },
  });

  console.log('[Inngest] Organization deleted from database');
}

// ============================================
// ORGANIZATION MEMBERSHIP EVENT HANDLERS
// ============================================

async function handleMembershipCreated(data: any) {
  console.log('[Inngest] Creating membership:', data.id);

  // Retry logic for dependencies with exponential backoff
  const maxAttempts = 5;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const user = await prisma.user.findUnique({
        where: { clerkUserId: data.public_user_data.user_id },
      });

      const org = await prisma.organization.findUnique({
        where: { clerkOrganizationId: data.organization.id },
      });

      if (!user || !org) {
        const missing = [];
        if (!user) missing.push('user');
        if (!org) missing.push('organization');

        throw new Error(
          `Dependencies not ready: ${missing.join(', ')} - ` +
          `User: ${data.public_user_data.user_id}, Org: ${data.organization.id}`
        );
      }

      const role = data.role === 'org:admin' ? 'SUPER_ADMIN' : 'STUDENT';

      await prisma.organizationMembership.upsert({
        where: { clerkMembershipId: data.id },
        update: {},
        create: {
          organizationId: org.id,
          userId: user.id,
          role: role,
          clerkMembershipId: data.id,
          status: 'ACTIVE',
        },
      });

      console.log('[Inngest] Membership created:', user.email, '→', org.name, `(${role})`);
      return; // Success!

    } catch (error) {
      lastError = error as Error;

      if (attempt < maxAttempts) {
        const delay = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s, 8s, 16s
        console.log(`[Inngest] Membership creation failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error('[Inngest] Membership creation failed after', maxAttempts, 'attempts');
  throw lastError;
}

async function handleMembershipUpdated(data: any) {
  console.log('[Inngest] Updating membership:', data.id);

  const role = data.role === 'org:admin' ? 'SUPER_ADMIN' : 'STUDENT';

  await prisma.organizationMembership.update({
    where: { clerkMembershipId: data.id },
    data: { role },
  });

  console.log('[Inngest] Membership updated with role:', role);
}

async function handleMembershipDeleted(data: any) {
  console.log('[Inngest] Soft-deleting membership:', data.id);

  // Soft delete: mark as REMOVED instead of hard delete
  // Preserves qualifications and availability for 30-day restoration window
  const result = await prisma.organizationMembership.updateMany({
    where: { clerkMembershipId: data.id },
    data: {
      status: 'REMOVED',
      removedAt: new Date(),
      removedBy: 'clerk_webhook',
    },
  });

  if (result.count > 0) {
    console.log('[Inngest] Membership soft-deleted (30-day grace period)');
  } else {
    console.log('[Inngest] Membership already processed or not found');
  }
}

// ============================================
// SCHEDULED CLEANUP JOBS
// ============================================

/**
 * Cleanup Removed Memberships
 *
 * Runs daily at 2am UTC to permanently delete memberships that have been
 * in REMOVED status for more than 30 days.
 *
 * CASCADE delete handles:
 * - AppointmentTypeInstructor (qualifications)
 * - InstructorAvailability (availability blocks)
 *
 * Note: Appointments use onDelete: Restrict, so they won't be deleted.
 * Instructors with active appointments should be handled before this runs.
 */
export const cleanupRemovedMemberships = inngest.createFunction(
  {
    id: 'cleanup-removed-memberships',
    retries: 3,
  },
  { cron: '0 2 * * *' }, // Daily at 2am UTC
  async ({ step }) => {
    console.log('[Inngest] Starting removed memberships cleanup...');

    const cutoffDate = subDays(new Date(), SOFT_DELETE_RETENTION_DAYS);

    // Step 1: Find expired memberships
    const expiredMemberships = await step.run('find-expired', async () => {
      return await prisma.organizationMembership.findMany({
        where: {
          status: 'REMOVED',
          removedAt: { lt: cutoffDate },
        },
        select: {
          id: true,
          removedAt: true,
          user: {
            select: {
              email: true,
            },
          },
          organization: {
            select: {
              name: true,
            },
          },
        },
      });
    });

    if (expiredMemberships.length === 0) {
      console.log('[Inngest] No expired memberships to cleanup');
      return { deleted: 0 };
    }

    console.log(`[Inngest] Found ${expiredMemberships.length} expired memberships`);

    // Step 2: Delete each expired membership
    let deletedCount = 0;
    for (const membership of expiredMemberships) {
      try {
        await step.run(`delete-${membership.id}`, async () => {
          await prisma.organizationMembership.delete({
            where: { id: membership.id },
          });
        });
        console.log(
          `[Inngest] Permanently deleted membership: ${membership.user.email} from ${membership.organization.name}`
        );
        deletedCount++;
      } catch (error) {
        // Log but continue - might be blocked by Restrict constraint (active appointments)
        console.error(
          `[Inngest] Failed to delete membership ${membership.id}:`,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    }

    console.log(`[Inngest] Cleanup complete: ${deletedCount}/${expiredMemberships.length} memberships deleted`);

    return { deleted: deletedCount, total: expiredMemberships.length };
  }
);
