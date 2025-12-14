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
import { supabaseAdmin } from '@/lib/db/supabase';
import { subDays } from 'date-fns';
import type {
  UserJSON,
  OrganizationJSON,
  OrganizationMembershipJSON,
  DeletedObjectJSON,
} from '@clerk/backend';

/** Union of all possible Clerk webhook data types */
type ClerkWebhookData =
  | UserJSON
  | OrganizationJSON
  | OrganizationMembershipJSON
  | DeletedObjectJSON;

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
      const { data } = await supabaseAdmin
        .from('webhook_events')
        .select('status, attempts')
        .eq('webhook_id', webhookId)
        .single();
      return data;
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
        await supabaseAdmin
          .from('webhook_events')
          .update({
            status: 'completed',
            processed_at: new Date().toISOString(),
            attempts: (existingEvent?.attempts || 0) + 1,
          })
          .eq('webhook_id', webhookId);
      });

      console.log(`[Inngest] Successfully processed: ${eventType}`);
      return { status: 'success', webhookId, eventType };
    } catch (error) {
      // Update error in database
      await step.run('mark-failed', async () => {
        await supabaseAdmin
          .from('webhook_events')
          .update({
            status: 'failed',
            last_error: error instanceof Error ? error.message : 'Unknown error',
            attempts: (existingEvent?.attempts || 0) + 1,
          })
          .eq('webhook_id', webhookId);
      });

      console.error(`[Inngest] Failed to process ${eventType}:`, error);
      throw error; // Inngest will retry
    }
  }
);

// ============================================
// EVENT PROCESSING LOGIC
// ============================================

async function processWebhookEvent(eventType: string, data: ClerkWebhookData) {
  switch (eventType) {
    // User events
    case 'user.created':
      await handleUserCreated(data as UserJSON);
      break;
    case 'user.updated':
      await handleUserUpdated(data as UserJSON);
      break;
    case 'user.deleted':
      await handleUserDeleted(data as DeletedObjectJSON);
      break;

    // Organization events
    case 'organization.created':
      await handleOrganizationCreated(data as OrganizationJSON);
      break;
    case 'organization.updated':
      await handleOrganizationUpdated(data as OrganizationJSON);
      break;
    case 'organization.deleted':
      await handleOrganizationDeleted(data as DeletedObjectJSON);
      break;

    // Organization membership events
    case 'organizationMembership.created':
      await handleMembershipCreated(data as OrganizationMembershipJSON);
      break;
    case 'organizationMembership.updated':
      await handleMembershipUpdated(data as OrganizationMembershipJSON);
      break;
    case 'organizationMembership.deleted':
      await handleMembershipDeleted(data as OrganizationMembershipJSON);
      break;

    default:
      console.log(`[Inngest] Unhandled event type: ${eventType}`);
  }
}

// ============================================
// USER EVENT HANDLERS
// ============================================

async function handleUserCreated(data: UserJSON) {
  console.log('[Inngest] Creating user:', data.id);

  const primaryEmail = data.email_addresses.find(
    (email) => email.id === data.primary_email_address_id
  );

  if (!primaryEmail) {
    throw new Error(`No primary email found for user ${data.id}`);
  }

  const { error } = await supabaseAdmin
    .from('users')
    .upsert({
      clerk_user_id: data.id,
      email: primaryEmail.email_address,
      first_name: data.first_name || '',
      last_name: data.last_name || '',
      avatar_url: data.image_url,
      status: 'ACTIVE',
    }, {
      onConflict: 'clerk_user_id',
    });

  if (error) throw error;

  console.log('[Inngest] User created in database');
}

async function handleUserUpdated(data: UserJSON) {
  console.log('[Inngest] Updating user:', data.id);

  const primaryEmail = data.email_addresses.find(
    (email) => email.id === data.primary_email_address_id
  );

  if (!primaryEmail) {
    throw new Error(`No primary email found for user ${data.id}`);
  }

  const { error } = await supabaseAdmin
    .from('users')
    .update({
      email: primaryEmail.email_address,
      first_name: data.first_name || '',
      last_name: data.last_name || '',
      avatar_url: data.image_url,
    })
    .eq('clerk_user_id', data.id);

  if (error) throw error;

  console.log('[Inngest] User updated in database');
}

async function handleUserDeleted(data: DeletedObjectJSON) {
  if (!data.id) {
    console.warn('[Inngest] User delete event missing id, skipping');
    return;
  }

  console.log('[Inngest] Soft deleting user:', data.id);

  await supabaseAdmin
    .from('users')
    .update({ status: 'DELETED' })
    .eq('clerk_user_id', data.id);

  console.log('[Inngest] User soft deleted in database');
}

// ============================================
// ORGANIZATION EVENT HANDLERS
// ============================================

async function handleOrganizationCreated(data: OrganizationJSON) {
  console.log('[Inngest] Creating organization:', data.id);

  const subdomain = data.slug.replace(/-/g, '');

  const { error } = await supabaseAdmin
    .from('organizations')
    .upsert({
      clerk_organization_id: data.id,
      name: data.name,
      slug: data.slug,
      subdomain: subdomain,
      status: 'ACTIVE',
    }, {
      onConflict: 'clerk_organization_id',
    });

  if (error) throw error;

  console.log('[Inngest] Organization created with subdomain:', subdomain);
}

async function handleOrganizationUpdated(data: OrganizationJSON) {
  console.log('[Inngest] Updating organization:', data.id);

  const { error } = await supabaseAdmin
    .from('organizations')
    .update({
      name: data.name,
      slug: data.slug,
    })
    .eq('clerk_organization_id', data.id);

  if (error) throw error;

  console.log('[Inngest] Organization updated in database');
}

async function handleOrganizationDeleted(data: DeletedObjectJSON) {
  if (!data.id) {
    console.warn('[Inngest] Organization delete event missing id, skipping');
    return;
  }

  console.log('[Inngest] Deleting organization:', data.id);

  await supabaseAdmin
    .from('organizations')
    .delete()
    .eq('clerk_organization_id', data.id);

  console.log('[Inngest] Organization deleted from database');
}

// ============================================
// ORGANIZATION MEMBERSHIP EVENT HANDLERS
// ============================================

async function handleMembershipCreated(data: OrganizationMembershipJSON) {
  console.log('[Inngest] Creating membership:', data.id);

  // Retry logic for dependencies with exponential backoff
  const maxAttempts = 5;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .eq('clerk_user_id', data.public_user_data.user_id)
        .single();

      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('id, name')
        .eq('clerk_organization_id', data.organization.id)
        .single();

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

      const { error } = await supabaseAdmin
        .from('organization_memberships')
        .upsert({
          clerk_membership_id: data.id,
          organization_id: org.id,
          user_id: user.id,
          role: role,
          status: 'ACTIVE',
        }, {
          onConflict: 'clerk_membership_id',
        });

      if (error) throw error;

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

async function handleMembershipUpdated(data: OrganizationMembershipJSON) {
  console.log('[Inngest] Updating membership:', data.id);

  const role = data.role === 'org:admin' ? 'SUPER_ADMIN' : 'STUDENT';

  const { error } = await supabaseAdmin
    .from('organization_memberships')
    .update({ role })
    .eq('clerk_membership_id', data.id);

  if (error) throw error;

  console.log('[Inngest] Membership updated with role:', role);
}

async function handleMembershipDeleted(data: OrganizationMembershipJSON) {
  console.log('[Inngest] Soft-deleting membership:', data.id);

  // Soft delete: mark as REMOVED instead of hard delete
  // Preserves qualifications and availability for 30-day restoration window
  const { data: result } = await supabaseAdmin
    .from('organization_memberships')
    .update({
      status: 'REMOVED',
      removed_at: new Date().toISOString(),
      removed_by: 'clerk_webhook',
    })
    .eq('clerk_membership_id', data.id)
    .select();

  if (result && result.length > 0) {
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

    // Type for the joined query result
    type MembershipWithJoins = {
      id: string;
      removed_at: string | null;
      users: { email: string } | null;
      organizations: { name: string } | null;
    };

    // Step 1: Find expired memberships
    const expiredMemberships = await step.run('find-expired', async () => {
      const { data } = await supabaseAdmin
        .from('organization_memberships')
        .select(`
          id,
          removed_at,
          users (email),
          organizations (name)
        `)
        .eq('status', 'REMOVED')
        .lt('removed_at', cutoffDate.toISOString());
      return (data || []) as MembershipWithJoins[];
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
          await supabaseAdmin
            .from('organization_memberships')
            .delete()
            .eq('id', membership.id);
        });
        console.log(
          `[Inngest] Permanently deleted membership: ${membership.users?.email} from ${membership.organizations?.name}`
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

/**
 * Cleanup Archived Appointment Types
 *
 * Runs daily at 3am UTC to permanently delete appointment types that have been
 * soft-deleted (archived) for more than 30 days.
 *
 * GDPR Compliance: Ensures data is not retained indefinitely after deletion.
 *
 * CASCADE delete handles:
 * - AppointmentTypeInstructor (instructor qualifications)
 *
 * Note: Appointments reference AppointmentType with onDelete: SetNull,
 * so historical appointments are preserved with null appointmentTypeId.
 */
export const cleanupArchivedAppointmentTypes = inngest.createFunction(
  {
    id: 'cleanup-archived-appointment-types',
    retries: 3,
  },
  { cron: '0 3 * * *' }, // Daily at 3am UTC
  async ({ step }) => {
    console.log('[Inngest] Starting archived appointment types cleanup...');

    const cutoffDate = subDays(new Date(), SOFT_DELETE_RETENTION_DAYS);

    // Type for the joined query result
    type TypeWithOrg = {
      id: string;
      name: string;
      deleted_at: string | null;
      organizations: { name: string } | null;
    };

    // Step 1: Find expired archived types
    const expiredTypes = await step.run('find-expired-types', async () => {
      const { data } = await supabaseAdmin
        .from('appointment_types')
        .select(`
          id,
          name,
          deleted_at,
          organizations (name)
        `)
        .lt('deleted_at', cutoffDate.toISOString())
        .not('deleted_at', 'is', null);
      return (data || []) as TypeWithOrg[];
    });

    if (expiredTypes.length === 0) {
      console.log('[Inngest] No expired appointment types to cleanup');
      return { deleted: 0 };
    }

    console.log(`[Inngest] Found ${expiredTypes.length} expired appointment types`);

    // Step 2: Delete each expired type
    let deletedCount = 0;
    for (const type of expiredTypes) {
      try {
        await step.run(`delete-type-${type.id}`, async () => {
          await supabaseAdmin
            .from('appointment_types')
            .delete()
            .eq('id', type.id);
        });
        console.log(
          `[Inngest] Permanently deleted appointment type: "${type.name}" from ${type.organizations?.name}`
        );
        deletedCount++;
      } catch (error) {
        console.error(
          `[Inngest] Failed to delete appointment type ${type.id}:`,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    }

    console.log(`[Inngest] Cleanup complete: ${deletedCount}/${expiredTypes.length} appointment types deleted`);

    return { deleted: deletedCount, total: expiredTypes.length };
  }
);

/**
 * Cleanup Deleted Business Locations
 *
 * Runs daily at 3:30am UTC to permanently delete business locations that have been
 * soft-deleted for more than 30 days.
 *
 * GDPR Compliance: Ensures data is not retained indefinitely after deletion.
 *
 * Note: Business locations can only be soft-deleted if no appointment types use them,
 * so this is safe to hard delete.
 */
export const cleanupDeletedBusinessLocations = inngest.createFunction(
  {
    id: 'cleanup-deleted-business-locations',
    retries: 3,
  },
  { cron: '30 3 * * *' }, // Daily at 3:30am UTC
  async ({ step }) => {
    console.log('[Inngest] Starting deleted business locations cleanup...');

    const cutoffDate = subDays(new Date(), SOFT_DELETE_RETENTION_DAYS);

    // Type for the joined query result
    type LocationWithOrg = {
      id: string;
      name: string;
      deleted_at: string | null;
      organizations: { name: string } | null;
    };

    // Step 1: Find expired deleted locations
    const expiredLocations = await step.run('find-expired-locations', async () => {
      const { data } = await supabaseAdmin
        .from('business_locations')
        .select(`
          id,
          name,
          deleted_at,
          organizations (name)
        `)
        .lt('deleted_at', cutoffDate.toISOString())
        .not('deleted_at', 'is', null);
      return (data || []) as LocationWithOrg[];
    });

    if (expiredLocations.length === 0) {
      console.log('[Inngest] No expired business locations to cleanup');
      return { deleted: 0 };
    }

    console.log(`[Inngest] Found ${expiredLocations.length} expired business locations`);

    // Step 2: Delete each expired location
    let deletedCount = 0;
    for (const location of expiredLocations) {
      try {
        await step.run(`delete-location-${location.id}`, async () => {
          await supabaseAdmin
            .from('business_locations')
            .delete()
            .eq('id', location.id);
        });
        console.log(
          `[Inngest] Permanently deleted business location: "${location.name}" from ${location.organizations?.name}`
        );
        deletedCount++;
      } catch (error) {
        console.error(
          `[Inngest] Failed to delete business location ${location.id}:`,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    }

    console.log(`[Inngest] Cleanup complete: ${deletedCount}/${expiredLocations.length} business locations deleted`);

    return { deleted: deletedCount, total: expiredLocations.length };
  }
);
