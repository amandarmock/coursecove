import {
  router,
  instructorProcedure,
  rateLimitedCreateProcedure,
  rateLimitedAdminProcedure,
  rateLimitedDeleteProcedure,
} from '../init';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  AppointmentTypeStatus,
  AppointmentTypeCategory,
  LocationMode,
  MembershipStatus,
  MembershipRole,
} from '@/types/database';
import {
  sanitizeRequiredText,
  sanitizeRichText,
  isValidDuration,
} from '@/lib/utils/sanitize';
import {
  APPOINTMENT_TYPE_NAME_MAX_LENGTH,
  APPOINTMENT_TYPE_DESCRIPTION_MAX_LENGTH,
  APPOINTMENT_DURATION_MIN,
  APPOINTMENT_DURATION_MAX,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '@/lib/utils/constants';
import { INSTRUCTOR_CAPABLE_ROLES } from '@/lib/utils/roles';

/**
 * Appointment Types Router
 * Handles organization-wide appointment type templates
 */
export const appointmentTypesRouter = router({
  /**
   * Create a new appointment type
   * Admin only - Rate limited: 10/min
   */
  create: rateLimitedCreateProcedure('appointmentTypes.create')
    .input(
      z.object({
        name: z.string().min(1).max(APPOINTMENT_TYPE_NAME_MAX_LENGTH),
        description: z.string().max(APPOINTMENT_TYPE_DESCRIPTION_MAX_LENGTH).optional(),
        duration: z.number().int().min(APPOINTMENT_DURATION_MIN).max(APPOINTMENT_DURATION_MAX),
        category: z.nativeEnum(AppointmentTypeCategory).default(AppointmentTypeCategory.APPOINTMENT),
        locationMode: z.nativeEnum(LocationMode),
        businessLocationId: z.string().optional(),
        qualifiedInstructorIds: z.array(z.string()).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate duration
      if (!isValidDuration(input.duration)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Duration must be between ${APPOINTMENT_DURATION_MIN} and ${APPOINTMENT_DURATION_MAX} minutes`,
        });
      }

      // Validate location requirements
      if (input.locationMode === LocationMode.BUSINESS_LOCATION && !input.businessLocationId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Business location is required when location mode is BUSINESS_LOCATION',
        });
      }

      // If business location is provided, verify it exists and belongs to the organization
      if (input.businessLocationId) {
        const { data: businessLocation } = await ctx.supabase
          .from('business_locations')
          .select('id')
          .eq('id', input.businessLocationId)
          .eq('organization_id', ctx.organizationId)
          .eq('is_active', true)
          .is('deleted_at', null)
          .single();

        if (!businessLocation) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid or inactive business location',
          });
        }
      }

      // Validate all instructor IDs have instructor capabilities in the same organization
      const { data: instructors } = await ctx.supabase
        .from('organization_memberships')
        .select('id')
        .in('id', input.qualifiedInstructorIds)
        .eq('organization_id', ctx.organizationId)
        .in('role', INSTRUCTOR_CAPABLE_ROLES as unknown as MembershipRole[])
        .eq('status', MembershipStatus.ACTIVE);

      if ((instructors?.length ?? 0) !== input.qualifiedInstructorIds.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'One or more instructor IDs are invalid or do not have instructor capabilities in this organization',
        });
      }

      // Create appointment type
      const { data: appointmentType, error: createError } = await ctx.supabase
        .from('appointment_types')
        .insert({
          organization_id: ctx.organizationId!,
          name: sanitizeRequiredText(input.name, APPOINTMENT_TYPE_NAME_MAX_LENGTH, 'Name'),
          description: input.description ? sanitizeRichText(input.description) : null,
          duration: input.duration,
          status: AppointmentTypeStatus.DRAFT,
          category: input.category,
          location_mode: input.locationMode,
          business_location_id: input.businessLocationId || null,
        })
        .select(`
          *,
          business_locations (*)
        `)
        .single();

      if (createError || !appointmentType) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: createError?.message ?? 'Failed to create appointment type',
        });
      }

      // Create instructor assignments
      const { error: instructorError } = await ctx.supabase
        .from('appointment_type_instructors')
        .insert(
          input.qualifiedInstructorIds.map((instructorId) => ({
            appointment_type_id: appointmentType.id,
            instructor_id: instructorId,
            organization_id: ctx.organizationId!,
          }))
        );

      if (instructorError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: instructorError.message,
        });
      }

      return appointmentType;
    }),

  /**
   * List appointment types for the organization
   * Instructor+ can view
   * Supports pagination with take/skip parameters
   */
  list: instructorProcedure
    .input(
      z.object({
        includeArchived: z.boolean().default(false),
        category: z.nativeEnum(AppointmentTypeCategory).optional(),
        take: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
        skip: z.number().int().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const take = input?.take ?? DEFAULT_PAGE_SIZE;
      const skip = input?.skip ?? 0;

      // Build query
      let query = ctx.supabase
        .from('appointment_types')
        .select(`
          *,
          business_locations (*),
          appointment_type_instructors (
            *,
            organization_memberships (
              *,
              users (*)
            )
          )
        `, { count: 'exact' })
        .eq('organization_id', ctx.organizationId)
        .order('name', { ascending: true })
        .range(skip, skip + take - 1);

      // Filter archived unless requested
      if (!input?.includeArchived) {
        query = query.is('deleted_at', null);
      }

      // Filter by category if specified
      if (input?.category) {
        query = query.eq('category', input.category);
      }

      const { data: appointmentTypes, count, error } = await query;

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      const total = count ?? 0;

      return {
        items: appointmentTypes ?? [],
        total,
        take,
        skip,
        hasMore: skip + (appointmentTypes?.length ?? 0) < total,
      };
    }),

  /**
   * Get a single appointment type by ID
   * Instructor+ can view
   */
  get: instructorProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { data: appointmentType, error } = await ctx.supabase
        .from('appointment_types')
        .select(`
          *,
          business_locations (*),
          appointment_type_instructors (
            *,
            organization_memberships (
              *,
              users (*)
            )
          )
        `)
        .eq('id', input.id)
        .eq('organization_id', ctx.organizationId)
        .single();

      if (error || !appointmentType) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Appointment type not found',
        });
      }

      // Get appointment count
      const { count: appointmentCount } = await ctx.supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('appointment_type_id', input.id)
        .is('deleted_at', null);

      return {
        ...appointmentType,
        _count: {
          appointments: appointmentCount ?? 0,
        },
      };
    }),

  /**
   * Update an appointment type
   * Admin only - Rate limited: 30/min
   */
  update: rateLimitedAdminProcedure('appointmentTypes.update')
    .input(
      z.object({
        id: z.string(),
        version: z.number().int(), // Required for optimistic locking
        name: z.string().min(1).max(APPOINTMENT_TYPE_NAME_MAX_LENGTH).optional(),
        description: z.string().max(APPOINTMENT_TYPE_DESCRIPTION_MAX_LENGTH).optional().nullable(),
        duration: z.number().int().min(APPOINTMENT_DURATION_MIN).max(APPOINTMENT_DURATION_MAX).optional(),
        category: z.nativeEnum(AppointmentTypeCategory).optional(),
        locationMode: z.nativeEnum(LocationMode).optional(),
        businessLocationId: z.string().optional().nullable(),
        qualifiedInstructorIds: z.array(z.string()).min(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify appointment type exists and belongs to organization
      const { data: existing, error: existingError } = await ctx.supabase
        .from('appointment_types')
        .select('*')
        .eq('id', input.id)
        .eq('organization_id', ctx.organizationId)
        .single();

      if (existingError || !existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Appointment type not found',
        });
      }

      // Optimistic locking - check version hasn't changed
      if (existing.version !== input.version) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'This appointment type was modified by another user. Please refresh and try again.',
        });
      }

      // Validate instructor count - appointment types must have at least one instructor
      if (input.qualifiedInstructorIds !== undefined && input.qualifiedInstructorIds.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Appointment types must have at least one qualified instructor',
        });
      }

      // Validate duration if provided
      if (input.duration !== undefined && !isValidDuration(input.duration)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Duration must be between ${APPOINTMENT_DURATION_MIN} and ${APPOINTMENT_DURATION_MAX} minutes`,
        });
      }

      // Determine final location mode
      const finalLocationMode = input.locationMode ?? existing.location_mode;
      const finalBusinessLocationId = input.businessLocationId !== undefined
        ? input.businessLocationId
        : existing.business_location_id;

      // Validate location requirements
      if (finalLocationMode === LocationMode.BUSINESS_LOCATION && !finalBusinessLocationId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Business location is required when location mode is BUSINESS_LOCATION',
        });
      }

      // If business location is provided, verify it exists and belongs to the organization
      if (finalBusinessLocationId) {
        const { data: businessLocation } = await ctx.supabase
          .from('business_locations')
          .select('id')
          .eq('id', finalBusinessLocationId)
          .eq('organization_id', ctx.organizationId)
          .eq('is_active', true)
          .is('deleted_at', null)
          .single();

        if (!businessLocation) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid or inactive business location',
          });
        }
      }

      // Validate instructor IDs if provided
      if (input.qualifiedInstructorIds) {
        const { data: instructors } = await ctx.supabase
          .from('organization_memberships')
          .select('id')
          .in('id', input.qualifiedInstructorIds)
          .eq('organization_id', ctx.organizationId)
          .in('role', INSTRUCTOR_CAPABLE_ROLES as unknown as MembershipRole[])
          .eq('status', MembershipStatus.ACTIVE);

        if ((instructors?.length ?? 0) !== input.qualifiedInstructorIds.length) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'One or more instructor IDs are invalid or do not have instructor capabilities in this organization',
          });
        }
      }

      // Build update data
      const updateData: Record<string, unknown> = {
        version: existing.version + 1, // Increment version for optimistic locking
      };

      if (input.name !== undefined) {
        updateData.name = sanitizeRequiredText(input.name, APPOINTMENT_TYPE_NAME_MAX_LENGTH, 'Name');
      }
      if (input.description !== undefined) {
        updateData.description = input.description ? sanitizeRichText(input.description) : null;
      }
      if (input.duration !== undefined) {
        updateData.duration = input.duration;
      }
      if (input.category !== undefined) {
        updateData.category = input.category;
      }
      if (input.locationMode !== undefined) {
        updateData.location_mode = input.locationMode;
      }
      if (input.businessLocationId !== undefined) {
        updateData.business_location_id = input.businessLocationId ?? null;
      }

      // Update instructors if provided
      if (input.qualifiedInstructorIds) {
        // Delete existing instructor assignments
        const { error: deleteError } = await ctx.supabase
          .from('appointment_type_instructors')
          .delete()
          .eq('appointment_type_id', input.id);

        if (deleteError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: deleteError.message,
          });
        }

        // Create new instructor assignments
        const { error: insertError } = await ctx.supabase
          .from('appointment_type_instructors')
          .insert(
            input.qualifiedInstructorIds.map((instructorId) => ({
              appointment_type_id: input.id,
              instructor_id: instructorId,
              organization_id: ctx.organizationId!,
            }))
          );

        if (insertError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: insertError.message,
          });
        }
      }

      // Update appointment type
      const { data: appointmentType, error: updateError } = await ctx.supabase
        .from('appointment_types')
        .update(updateData)
        .eq('id', input.id)
        .select(`
          *,
          business_locations (*)
        `)
        .single();

      if (updateError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: updateError.message,
        });
      }

      return appointmentType;
    }),

  /**
   * Publish an appointment type
   * Admin only - DRAFT/UNPUBLISHED -> PUBLISHED - Rate limited: 30/min
   */
  publish: rateLimitedAdminProcedure('appointmentTypes.publish')
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data: appointmentType, error: findError } = await ctx.supabase
        .from('appointment_types')
        .select('*')
        .eq('id', input.id)
        .eq('organization_id', ctx.organizationId)
        .single();

      if (findError || !appointmentType) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Appointment type not found',
        });
      }

      if (appointmentType.status === AppointmentTypeStatus.PUBLISHED) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Appointment type is already published',
        });
      }

      const { data: updated, error: updateError } = await ctx.supabase
        .from('appointment_types')
        .update({ status: AppointmentTypeStatus.PUBLISHED })
        .eq('id', input.id)
        .select(`
          *,
          appointment_type_instructors (
            *,
            organization_memberships (
              *,
              users (*)
            )
          )
        `)
        .single();

      if (updateError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: updateError.message,
        });
      }

      return updated;
    }),

  /**
   * Unpublish an appointment type
   * Admin only - PUBLISHED -> UNPUBLISHED - Rate limited: 30/min
   */
  unpublish: rateLimitedAdminProcedure('appointmentTypes.unpublish')
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data: appointmentType, error: findError } = await ctx.supabase
        .from('appointment_types')
        .select('*')
        .eq('id', input.id)
        .eq('organization_id', ctx.organizationId)
        .single();

      if (findError || !appointmentType) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Appointment type not found',
        });
      }

      if (appointmentType.status !== AppointmentTypeStatus.PUBLISHED) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only published appointment types can be unpublished',
        });
      }

      const { data: updated, error: updateError } = await ctx.supabase
        .from('appointment_types')
        .update({ status: AppointmentTypeStatus.UNPUBLISHED })
        .eq('id', input.id)
        .select(`
          *,
          appointment_type_instructors (
            *,
            organization_memberships (
              *,
              users (*)
            )
          )
        `)
        .single();

      if (updateError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: updateError.message,
        });
      }

      return updated;
    }),

  /**
   * Archive (soft delete) an appointment type
   * Admin only - Cannot archive PUBLISHED types - Rate limited: 20/min
   */
  archive: rateLimitedDeleteProcedure('appointmentTypes.archive')
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data: appointmentType, error: findError } = await ctx.supabase
        .from('appointment_types')
        .select('*')
        .eq('id', input.id)
        .eq('organization_id', ctx.organizationId)
        .single();

      if (findError || !appointmentType) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Appointment type not found',
        });
      }

      // Check for active appointments before allowing archive
      const { count: activeAppointments } = await ctx.supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('appointment_type_id', input.id)
        .in('status', ['BOOKED', 'SCHEDULED', 'IN_PROGRESS'])
        .is('deleted_at', null);

      if (activeAppointments && activeAppointments > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot archive: ${activeAppointments} active appointment(s) exist. Cancel or complete them first.`,
        });
      }

      if (appointmentType.status === AppointmentTypeStatus.PUBLISHED) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot archive a published appointment type. Unpublish it first.',
        });
      }

      if (appointmentType.deleted_at) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Appointment type is already archived',
        });
      }

      const { error: updateError } = await ctx.supabase
        .from('appointment_types')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', input.id);

      if (updateError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: updateError.message,
        });
      }

      return { success: true };
    }),

  /**
   * Unarchive (restore) an archived appointment type
   * Admin only - Sets deletedAt to null, status returns to DRAFT - Rate limited: 20/min
   */
  unarchive: rateLimitedDeleteProcedure('appointmentTypes.unarchive')
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data: appointmentType, error: findError } = await ctx.supabase
        .from('appointment_types')
        .select('*')
        .eq('id', input.id)
        .eq('organization_id', ctx.organizationId)
        .single();

      if (findError || !appointmentType) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Appointment type not found',
        });
      }

      if (!appointmentType.deleted_at) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Appointment type is not archived',
        });
      }

      // Verify business location is still valid if this type uses one
      if (appointmentType.business_location_id) {
        const { data: businessLocation } = await ctx.supabase
          .from('business_locations')
          .select('id')
          .eq('id', appointmentType.business_location_id)
          .eq('organization_id', ctx.organizationId)
          .eq('is_active', true)
          .is('deleted_at', null)
          .single();

        if (!businessLocation) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot restore: the associated business location is no longer active or has been deleted',
          });
        }
      }

      // Restore the appointment type with DRAFT status
      const { data: updated, error: updateError } = await ctx.supabase
        .from('appointment_types')
        .update({
          deleted_at: null,
          status: AppointmentTypeStatus.DRAFT, // Reset to DRAFT on unarchive
        })
        .eq('id', input.id)
        .select(`
          *,
          business_locations (*)
        `)
        .single();

      if (updateError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: updateError.message,
        });
      }

      return updated;
    }),
});
