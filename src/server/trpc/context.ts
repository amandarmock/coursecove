import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';

/**
 * Sets PostgreSQL session variables for RLS policies
 * These variables are used by RLS helper functions to determine access
 */
async function setRLSContext(clerkUserId: string | null, orgId: string | null) {
  // Set Clerk user ID for RLS
  if (clerkUserId) {
    await prisma.$executeRaw`SELECT set_config('app.clerk_user_id', ${clerkUserId}, true)`;
  } else {
    await prisma.$executeRaw`SELECT set_config('app.clerk_user_id', '', true)`;
  }

  // Set organization ID for RLS (internal ID, not Clerk org ID)
  if (orgId) {
    await prisma.$executeRaw`SELECT set_config('app.org_id', ${orgId}, true)`;
  } else {
    await prisma.$executeRaw`SELECT set_config('app.org_id', '', true)`;
  }
}

/**
 * Creates context for tRPC procedures
 * Extracts user and organization info from Clerk
 * Sets PostgreSQL session variables for RLS policies
 */
export async function createContext() {
  const { userId, orgId } = await auth();

  // If no user, return minimal context
  if (!userId) {
    await setRLSContext(null, null);
    return {
      prisma,
      userId: null,
      organizationId: null,
      membershipId: null,
      role: null,
    };
  }

  // If user but no organization, set user context only
  if (!orgId) {
    await setRLSContext(userId, null);
    return {
      prisma,
      userId,
      organizationId: null,
      membershipId: null,
      role: null,
    };
  }

  // Fetch user's membership in the organization
  const membership = await prisma.organizationMembership.findFirst({
    where: {
      user: { clerkUserId: userId },
      organization: { clerkOrganizationId: orgId },
      status: 'ACTIVE',
    },
    select: {
      id: true,
      role: true,
      organizationId: true,
    },
  });

  // Set RLS context with Clerk user ID and internal org ID
  await setRLSContext(userId, membership?.organizationId ?? null);

  return {
    prisma,
    userId,
    organizationId: membership?.organizationId ?? null,
    membershipId: membership?.id ?? null,
    role: membership?.role ?? null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
