import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { setRLSContext } from '@/lib/db/queries/context';
import type { MembershipRole } from '@/types/database';

/**
 * Creates context for tRPC procedures
 * Extracts user and organization info from Clerk
 * Sets PostgreSQL session variables for RLS policies
 */
export async function createContext() {
  const { userId, orgId } = await auth();

  // If no user, return minimal context
  if (!userId) {
    await setRLSContext(supabaseAdmin, null, null);
    return {
      supabase: supabaseAdmin,
      userId: null,
      organizationId: null,
      membershipId: null,
      role: null as MembershipRole | null,
    };
  }

  // If user but no organization, set user context only
  if (!orgId) {
    await setRLSContext(supabaseAdmin, userId, null);
    return {
      supabase: supabaseAdmin,
      userId,
      organizationId: null,
      membershipId: null,
      role: null as MembershipRole | null,
    };
  }

  // Fetch user's membership in the organization
  const { data: membership } = await supabaseAdmin
    .from('organization_memberships')
    .select('id, role, organization_id')
    .eq('status', 'ACTIVE')
    .eq('users.clerk_user_id', userId)
    .eq('organizations.clerk_organization_id', orgId)
    .single();

  // Alternative query if the above join doesn't work:
  // First get the user's internal ID
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  // Then get the organization's internal ID
  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('id')
    .eq('clerk_organization_id', orgId)
    .single();

  // Finally get the membership
  let membershipData = membership;
  if (!membershipData && user && org) {
    const { data } = await supabaseAdmin
      .from('organization_memberships')
      .select('id, role, organization_id')
      .eq('user_id', user.id)
      .eq('organization_id', org.id)
      .eq('status', 'ACTIVE')
      .single();
    membershipData = data;
  }

  // Set RLS context with Clerk user ID and internal org ID
  await setRLSContext(supabaseAdmin, userId, membershipData?.organization_id ?? null);

  return {
    supabase: supabaseAdmin,
    userId,
    organizationId: membershipData?.organization_id ?? null,
    membershipId: membershipData?.id ?? null,
    role: (membershipData?.role as MembershipRole) ?? null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
