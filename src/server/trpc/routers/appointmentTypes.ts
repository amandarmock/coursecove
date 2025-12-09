import {
  router,
  adminProcedure,
  instructorProcedure,
  rateLimitedCreateProcedure,
  rateLimitedAdminProcedure,
  rateLimitedDeleteProcedure,
} from '../init';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { AppointmentTypeStatus, AppointmentTypeCategory, LocationMode, MembershipStatus, Prisma } from '@prisma/client';
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
import {
  instructorInclude,
  appointmentTypeIncludeWithLocation,
  appointmentTypeIncludeWithCount,
  appointmentTypeIncludeFull,
} from '../includes/appointmentType';

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
        const businessLocation = await ctx.prisma.businessLocation.findFirst({
          where: {
            id: input.businessLocationId,
            organizationId: ctx.organizationId,
            isActive: true,
            deletedAt: null,
          },
        });

        if (!businessLocation) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid or inactive business location',
          });
        }
      }

      // Validate all instructor IDs have instructor capabilities in the same organization
      const instructors = await ctx.prisma.organizationMembership.findMany({
        where: {
          id: { in: input.qualifiedInstructorIds },
          organizationId: ctx.organizationId,
          role: { in: INSTRUCTOR_CAPABLE_ROLES },
          status: MembershipStatus.ACTIVE,
        },
        select: { id: true },
      });

      if (instructors.length !== input.qualifiedInstructorIds.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'One or more instructor IDs are invalid or do not have instructor capabilities in this organization',
        });
      }

      // Create appointment type with qualified instructors
      const appointmentType = await ctx.prisma.appointmentType.create({
        data: {
          organizationId: ctx.organizationId!,
          name: sanitizeRequiredText(input.name, APPOINTMENT_TYPE_NAME_MAX_LENGTH, 'Name'),
          description: input.description ? sanitizeRichText(input.description) : null,
          duration: input.duration,
          status: AppointmentTypeStatus.DRAFT,
          category: input.category,
          locationMode: input.locationMode,
          businessLocationId: input.businessLocationId || null,
          instructors: {
            create: input.qualifiedInstructorIds.map((instructorId) => ({
              instructorId,
              organizationId: ctx.organizationId!,
            })),
          },
        },
        include: appointmentTypeIncludeWithLocation,
      });

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

      const where = {
        organizationId: ctx.organizationId,
        ...(input?.includeArchived ? {} : { deletedAt: null }),
        ...(input?.category ? { category: input.category } : {}),
      };

      const [appointmentTypes, total] = await ctx.prisma.$transaction([
        ctx.prisma.appointmentType.findMany({
          where,
          include: appointmentTypeIncludeFull,
          orderBy: {
            name: 'asc',
          },
          take,
          skip,
        }),
        ctx.prisma.appointmentType.count({ where }),
      ]);

      return {
        items: appointmentTypes,
        total,
        take,
        skip,
        hasMore: skip + appointmentTypes.length < total,
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
      const appointmentType = await ctx.prisma.appointmentType.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
        include: appointmentTypeIncludeWithCount,
      });

      if (!appointmentType) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Appointment type not found',
        });
      }

      return appointmentType;
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
      const existing = await ctx.prisma.appointmentType.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
      });

      if (!existing) {
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
      const finalLocationMode = input.locationMode ?? existing.locationMode;
      const finalBusinessLocationId = input.businessLocationId !== undefined
        ? input.businessLocationId
        : existing.businessLocationId;

      // Validate location requirements
      if (finalLocationMode === LocationMode.BUSINESS_LOCATION && !finalBusinessLocationId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Business location is required when location mode is BUSINESS_LOCATION',
        });
      }

      // If business location is provided, verify it exists and belongs to the organization
      if (finalBusinessLocationId) {
        const businessLocation = await ctx.prisma.businessLocation.findFirst({
          where: {
            id: finalBusinessLocationId,
            organizationId: ctx.organizationId,
            isActive: true,
            deletedAt: null,
          },
        });

        if (!businessLocation) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid or inactive business location',
          });
        }
      }

      // Validate instructor IDs if provided
      if (input.qualifiedInstructorIds) {
        const instructors = await ctx.prisma.organizationMembership.findMany({
          where: {
            id: { in: input.qualifiedInstructorIds },
            organizationId: ctx.organizationId,
            role: { in: INSTRUCTOR_CAPABLE_ROLES },
            status: MembershipStatus.ACTIVE,
          },
          select: { id: true },
        });

        if (instructors.length !== input.qualifiedInstructorIds.length) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'One or more instructor IDs are invalid or do not have instructor capabilities in this organization',
          });
        }
      }

      // Build update data
      const updateData: Prisma.AppointmentTypeUpdateInput = {};

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
        updateData.locationMode = input.locationMode;
      }
      if (input.businessLocationId !== undefined) {
        updateData.businessLocation = input.businessLocationId
          ? { connect: { id: input.businessLocationId } }
          : { disconnect: true };
      }

      // Always increment version on update (optimistic locking)
      updateData.version = { increment: 1 };

      // Update appointment type and instructors in transaction
      const appointmentType = await ctx.prisma.$transaction(async (tx) => {
        // Update instructors if provided
        if (input.qualifiedInstructorIds) {
          // Delete existing instructor assignments
          await tx.appointmentTypeInstructor.deleteMany({
            where: { appointmentTypeId: input.id },
          });

          // Create new instructor assignments
          await tx.appointmentTypeInstructor.createMany({
            data: input.qualifiedInstructorIds.map((instructorId) => ({
              appointmentTypeId: input.id,
              instructorId,
              organizationId: ctx.organizationId!,
            })),
          });
        }

        // Update appointment type
        return tx.appointmentType.update({
          where: { id: input.id },
          data: updateData,
          include: appointmentTypeIncludeWithLocation,
        });
      });

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
      const appointmentType = await ctx.prisma.appointmentType.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
      });

      if (!appointmentType) {
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

      const updated = await ctx.prisma.appointmentType.update({
        where: { id: input.id },
        data: { status: AppointmentTypeStatus.PUBLISHED },
        include: instructorInclude,
      });

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
      const appointmentType = await ctx.prisma.appointmentType.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
      });

      if (!appointmentType) {
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

      const updated = await ctx.prisma.appointmentType.update({
        where: { id: input.id },
        data: { status: AppointmentTypeStatus.UNPUBLISHED },
        include: instructorInclude,
      });

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
      const appointmentType = await ctx.prisma.appointmentType.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
      });

      if (!appointmentType) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Appointment type not found',
        });
      }

      // Check for active appointments before allowing archive
      const activeAppointments = await ctx.prisma.appointment.count({
        where: {
          appointmentTypeId: input.id,
          status: { in: ['BOOKED', 'SCHEDULED', 'IN_PROGRESS'] },
          deletedAt: null,
        },
      });

      if (activeAppointments > 0) {
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

      if (appointmentType.deletedAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Appointment type is already archived',
        });
      }

      await ctx.prisma.appointmentType.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });

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
      const appointmentType = await ctx.prisma.appointmentType.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
      });

      if (!appointmentType) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Appointment type not found',
        });
      }

      if (!appointmentType.deletedAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Appointment type is not archived',
        });
      }

      // Verify business location is still valid if this type uses one
      if (appointmentType.businessLocationId) {
        const businessLocation = await ctx.prisma.businessLocation.findFirst({
          where: {
            id: appointmentType.businessLocationId,
            organizationId: ctx.organizationId,
            isActive: true,
            deletedAt: null,
          },
        });

        if (!businessLocation) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot restore: the associated business location is no longer active or has been deleted',
          });
        }
      }

      // Restore the appointment type with DRAFT status
      const updated = await ctx.prisma.appointmentType.update({
        where: { id: input.id },
        data: {
          deletedAt: null,
          status: AppointmentTypeStatus.DRAFT, // Reset to DRAFT on unarchive
        },
        include: appointmentTypeIncludeWithLocation,
      });

      return updated;
    }),
});
