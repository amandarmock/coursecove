import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db/prisma';
import { MembershipRole } from '@prisma/client';

/**
 * Creates context for tRPC procedures
 * Extracts user and organization info from Clerk
 */
export async function createContext() {
  const { userId, orgId } = await auth();

  // If no user, return minimal context
  if (!userId) {
    return {
      prisma,
      userId: null,
      organizationId: null,
      membershipId: null,
      role: null,
    };
  }

  // If user but no organization, return user context only
  if (!orgId) {
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

  return {
    prisma,
    userId,
    organizationId: membership?.organizationId ?? null,
    membershipId: membership?.id ?? null,
    role: membership?.role ?? null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
