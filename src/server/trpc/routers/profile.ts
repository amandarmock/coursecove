import { router, userOnlyProcedure, adminProcedure } from '../init';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

/**
 * Validate IANA timezone identifier
 * Uses Intl API to check if timezone is valid
 */
function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Profile Router
 * Handles user profile settings including timezone
 */
export const profileRouter = router({
  /**
   * Get current user's profile
   */
  get: userOnlyProcedure.query(async ({ ctx }) => {
    const { data: user, error } = await ctx.supabase
      .from('users')
      .select('id, email, first_name, last_name, avatar_url, timezone, status, created_at')
      .eq('clerk_user_id', ctx.userId)
      .single();

    if (error || !user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      avatarUrl: user.avatar_url,
      timezone: user.timezone,
      status: user.status,
      createdAt: user.created_at,
    };
  }),

  /**
   * Update current user's timezone
   */
  updateTimezone: userOnlyProcedure
    .input(
      z.object({
        timezone: z.string().min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate timezone
      if (!isValidTimezone(input.timezone)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid timezone. Must be a valid IANA timezone identifier (e.g., America/New_York)',
        });
      }

      const { data: user, error } = await ctx.supabase
        .from('users')
        .update({ timezone: input.timezone })
        .eq('clerk_user_id', ctx.userId)
        .select('id, timezone')
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      return user;
    }),

  /**
   * Get a specific user's profile (admin only)
   * Used for team management
   */
  getById: adminProcedure
    .input(
      z.object({
        membershipId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get membership with user data
      const { data: membership, error } = await ctx.supabase
        .from('organization_memberships')
        .select(`
          id, role, status, created_at,
          users (
            id, email, first_name, last_name, avatar_url, timezone, status, created_at
          )
        `)
        .eq('id', input.membershipId)
        .eq('organization_id', ctx.organizationId)
        .single();

      if (error || !membership) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Member not found in this organization',
        });
      }

      // Type-safe access to joined user data
      type MembershipWithUser = typeof membership & {
        users: {
          id: string;
          email: string;
          first_name: string | null;
          last_name: string | null;
          avatar_url: string | null;
          timezone: string | null;
          status: string;
          created_at: string;
        } | null;
      };
      const typedMembership = membership as unknown as MembershipWithUser;
      const user = typedMembership.users;

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User data not found',
        });
      }

      return {
        membership: {
          id: membership.id,
          role: membership.role,
          status: membership.status,
          createdAt: membership.created_at,
        },
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          avatarUrl: user.avatar_url,
          timezone: user.timezone,
          status: user.status,
          createdAt: user.created_at,
        },
      };
    }),

  /**
   * Update a user's timezone (admin only)
   * Used for team management
   */
  updateTimezoneById: adminProcedure
    .input(
      z.object({
        membershipId: z.string(),
        timezone: z.string().min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate timezone
      if (!isValidTimezone(input.timezone)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid timezone. Must be a valid IANA timezone identifier (e.g., America/New_York)',
        });
      }

      // Get membership to verify org access and get userId
      const { data: membership, error: membershipError } = await ctx.supabase
        .from('organization_memberships')
        .select('user_id')
        .eq('id', input.membershipId)
        .eq('organization_id', ctx.organizationId)
        .single();

      if (membershipError || !membership) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Member not found in this organization',
        });
      }

      const { data: user, error } = await ctx.supabase
        .from('users')
        .update({ timezone: input.timezone })
        .eq('id', membership.user_id)
        .select('id, timezone')
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      return user;
    }),

  /**
   * Get list of all valid IANA timezones
   * Grouped by region for easier selection
   */
  getTimezones: userOnlyProcedure.query(() => {
    // Get all supported timezones
    const timezones = Intl.supportedValuesOf('timeZone');

    // Group by region (first part of timezone)
    const grouped: Record<string, string[]> = {};

    for (const tz of timezones) {
      const [region] = tz.split('/');
      if (!grouped[region]) {
        grouped[region] = [];
      }
      grouped[region].push(tz);
    }

    // Sort each region's timezones
    for (const region of Object.keys(grouped)) {
      grouped[region].sort();
    }

    return {
      timezones,
      grouped,
      // Common US timezones at the top
      popular: [
        'America/New_York',
        'America/Chicago',
        'America/Denver',
        'America/Los_Angeles',
        'America/Phoenix',
        'Pacific/Honolulu',
        'America/Anchorage',
        'Europe/London',
        'Europe/Paris',
        'Europe/Berlin',
        'Asia/Tokyo',
        'Asia/Shanghai',
        'Australia/Sydney',
      ],
    };
  }),
});
