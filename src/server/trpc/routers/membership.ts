import { router, protectedProcedure, instructorProcedure, adminProcedure } from '../init';
import { INSTRUCTOR_CAPABLE_ROLES } from '@/lib/utils/roles';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { differenceInDays } from 'date-fns';
import type {
  MembershipRole,
  OrganizationMembership,
  UserBasicInfo,
  UserWithTimezone,
  OrganizationBasicInfo,
} from '@/types/database';

const SOFT_DELETE_RETENTION_DAYS = 30;

/** Membership with nested user info */
type MembershipWithUserBasic = OrganizationMembership & { users: UserBasicInfo };
type MembershipWithUserFull = OrganizationMembership & { users: UserWithTimezone };
type MembershipWithUserAndOrg = OrganizationMembership & { users: UserBasicInfo; organizations: OrganizationBasicInfo };

/** Transform Supabase snake_case membership to frontend camelCase */
function transformMembership(m: OrganizationMembership) {
  return {
    id: m.id,
    userId: m.user_id,
    organizationId: m.organization_id,
    role: m.role,
    status: m.status,
    clerkMembershipId: m.clerk_membership_id,
    removedAt: m.removed_at,
    removedBy: m.removed_by,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
  };
}

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

    const { data: membership, error } = await ctx.supabase
      .from('organization_memberships')
      .select(`
        id, role, status,
        users (
          id, first_name, last_name, email, avatar_url
        ),
        organizations (
          id, name, slug
        )
      `)
      .eq('id', ctx.membershipId)
      .single();

    if (error || !membership) {
      return null;
    }

    const m = membership as MembershipWithUserAndOrg;

    return {
      id: m.id,
      role: m.role,
      status: m.status,
      user: {
        id: m.users.id,
        firstName: m.users.first_name,
        lastName: m.users.last_name,
        email: m.users.email,
        avatarUrl: m.users.avatar_url,
      },
      organization: {
        id: m.organizations.id,
        name: m.organizations.name,
        slug: m.organizations.slug,
      },
    };
  }),

  /**
   * List all instructor-capable members in the organization
   * Returns members with SUPER_ADMIN or INSTRUCTOR roles
   */
  listInstructors: instructorProcedure.query(async ({ ctx }) => {
    const { data: instructors, error } = await ctx.supabase
      .from('organization_memberships')
      .select(`
        *,
        users (
          first_name, last_name, email, avatar_url
        )
      `)
      .eq('organization_id', ctx.organizationId)
      .in('role', INSTRUCTOR_CAPABLE_ROLES as unknown as MembershipRole[])
      .eq('status', 'ACTIVE');

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }

    // Sort in JS since Supabase doesn't support ordering by nested fields
    const typedInstructors = (instructors ?? []) as MembershipWithUserBasic[];
    const sorted = typedInstructors.sort((a, b) => {
      const lastNameCompare = (a.users.last_name ?? '').localeCompare(b.users.last_name ?? '');
      if (lastNameCompare !== 0) return lastNameCompare;
      return (a.users.first_name ?? '').localeCompare(b.users.first_name ?? '');
    });

    return sorted.map((m) => ({
      ...transformMembership(m),
      user: {
        firstName: m.users.first_name,
        lastName: m.users.last_name,
        email: m.users.email,
        avatarUrl: m.users.avatar_url,
      },
    }));
  }),

  /**
   * List all members in the organization (admin only)
   * Used for team management
   */
  listAll: adminProcedure.query(async ({ ctx }) => {
    const { data: members, error } = await ctx.supabase
      .from('organization_memberships')
      .select(`
        *,
        users (
          id, first_name, last_name, email, avatar_url, timezone
        )
      `)
      .eq('organization_id', ctx.organizationId)
      .eq('status', 'ACTIVE');

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }

    // Sort by role, then lastName, then firstName
    const roleOrder = ['SUPER_ADMIN', 'INSTRUCTOR', 'STUDENT', 'GUARDIAN'];
    const typedMembers = (members ?? []) as MembershipWithUserFull[];
    const sorted = typedMembers.sort((a, b) => {
      const roleCompare = roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role);
      if (roleCompare !== 0) return roleCompare;
      const lastNameCompare = (a.users.last_name ?? '').localeCompare(b.users.last_name ?? '');
      if (lastNameCompare !== 0) return lastNameCompare;
      return (a.users.first_name ?? '').localeCompare(b.users.first_name ?? '');
    });

    return sorted.map((m) => ({
      ...transformMembership(m),
      user: {
        id: m.users.id,
        firstName: m.users.first_name,
        lastName: m.users.last_name,
        email: m.users.email,
        avatarUrl: m.users.avatar_url,
        timezone: m.users.timezone,
      },
    }));
  }),

  /**
   * List removed members in the organization (admin only)
   * Returns soft-deleted members within 30-day restoration window
   */
  listRemoved: adminProcedure.query(async ({ ctx }) => {
    const { data: removedMembers, error } = await ctx.supabase
      .from('organization_memberships')
      .select(`
        *,
        users (
          id, first_name, last_name, email, avatar_url
        )
      `)
      .eq('organization_id', ctx.organizationId)
      .eq('status', 'REMOVED')
      .order('removed_at', { ascending: false });

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }

    // Get counts for each member in parallel
    const typedRemovedMembers = (removedMembers ?? []) as MembershipWithUserBasic[];
    const membersWithCounts = await Promise.all(
      typedRemovedMembers.map(async (member) => {
        const [qualifiedTypes, availability, appointments] = await Promise.all([
          ctx.supabase
            .from('appointment_type_instructors')
            .select('*', { count: 'exact', head: true })
            .eq('instructor_id', member.id),
          ctx.supabase
            .from('instructor_availability')
            .select('*', { count: 'exact', head: true })
            .eq('membership_id', member.id),
          ctx.supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('instructor_membership_id', member.id),
        ]);

        const daysSinceRemoval = member.removed_at
          ? differenceInDays(new Date(), new Date(member.removed_at))
          : 0;
        const daysRemaining = Math.max(0, SOFT_DELETE_RETENTION_DAYS - daysSinceRemoval);

        return {
          ...transformMembership(member),
          user: {
            id: member.users.id,
            firstName: member.users.first_name,
            lastName: member.users.last_name,
            email: member.users.email,
            avatarUrl: member.users.avatar_url,
          },
          _count: {
            qualifiedAppointmentTypes: qualifiedTypes.count ?? 0,
            availability: availability.count ?? 0,
            instructorAppointments: appointments.count ?? 0,
          },
          daysSinceRemoval,
          daysRemaining,
          isExpired: daysRemaining === 0,
        };
      })
    );

    return membersWithCounts;
  }),

  /**
   * Restore a removed member (admin only)
   * Must be within 30-day restoration window
   */
  restore: adminProcedure
    .input(z.object({ membershipId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { data: membership, error: findError } = await ctx.supabase
        .from('organization_memberships')
        .select('*')
        .eq('id', input.membershipId)
        .eq('organization_id', ctx.organizationId)
        .eq('status', 'REMOVED')
        .single();

      if (findError || !membership) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Removed member not found',
        });
      }

      // Check 30-day window
      const daysSinceRemoval = membership.removed_at
        ? differenceInDays(new Date(), new Date(membership.removed_at))
        : 0;

      if (daysSinceRemoval > SOFT_DELETE_RETENTION_DAYS) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Restoration period has expired (30 days)',
        });
      }

      const { error } = await ctx.supabase
        .from('organization_memberships')
        .update({
          status: 'ACTIVE',
          removed_at: null,
          removed_by: null,
        })
        .eq('id', input.membershipId);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      return { success: true };
    }),

  /**
   * Permanently delete a removed member (admin only)
   * Hard deletes the membership - CASCADE handles qualifications/availability
   */
  permanentlyDelete: adminProcedure
    .input(z.object({ membershipId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { data: membership, error: findError } = await ctx.supabase
        .from('organization_memberships')
        .select('id')
        .eq('id', input.membershipId)
        .eq('organization_id', ctx.organizationId)
        .eq('status', 'REMOVED')
        .single();

      if (findError || !membership) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Removed member not found',
        });
      }

      // Hard delete - CASCADE will remove qualifications, availability, etc.
      const { error } = await ctx.supabase
        .from('organization_memberships')
        .delete()
        .eq('id', input.membershipId);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      return { success: true };
    }),
});
