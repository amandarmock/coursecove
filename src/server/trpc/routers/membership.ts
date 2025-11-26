import { router, protectedProcedure, instructorProcedure } from '../init';
import { INSTRUCTOR_CAPABLE_ROLES } from '@/lib/utils/roles';

/**
 * Membership Router
 * Handles user membership queries
 */
export const membershipRouter = router({
  /**
   * Get current user's membership in the active organization
   * Returns role and membership info
   */
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.membershipId) {
      return null;
    }

    const membership = await ctx.prisma.organizationMembership.findUnique({
      where: { id: ctx.membershipId },
      select: {
        id: true,
        role: true,
        status: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return membership;
  }),

  /**
   * List all instructor-capable members in the organization
   * Returns members with SUPER_ADMIN or INSTRUCTOR roles
   */
  listInstructors: instructorProcedure.query(async ({ ctx }) => {
    const instructors = await ctx.prisma.organizationMembership.findMany({
      where: {
        organizationId: ctx.organizationId,
        role: { in: INSTRUCTOR_CAPABLE_ROLES },
        status: 'ACTIVE',
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [
        { user: { lastName: 'asc' } },
        { user: { firstName: 'asc' } },
      ],
    });

    return instructors;
  }),
});
