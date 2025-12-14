import { router, protectedProcedure, adminProcedure, instructorProcedure } from '../init';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  AppointmentStatus,
  AppointmentTypeStatus,
  LocationMode,
  MembershipRole,
} from '@/types/database';
import {
  sanitizeText,
  sanitizeRichText,
  sanitizeUrl,
  sanitizeAddress,
  isValidDuration,
  isValidQuantity,
} from '@/lib/utils/sanitize';

// Common select for appointment with relations
const appointmentSelectWithRelations = `
  *,
  student:organization_memberships!appointments_student_id_fkey (
    *,
    users (first_name, last_name, email)
  ),
  instructor:organization_memberships!appointments_instructor_id_fkey (
    *,
    users (first_name, last_name, email)
  ),
  appointment_types (id, name)
`;

/**
 * Appointments Router
 * Handles student-specific appointment allocations
 */
export const appointmentsRouter = router({
  /**
   * Allocate a new appointment
   * - Admin: can create ad-hoc or from type, assign to any qualified instructor
   * - Instructor: can only create from type and assign to themselves
   */
  allocate: instructorProcedure
    .input(
      z.object({
        studentId: z.string(),
        instructorId: z.string(),

        // Allocation mode - EXACTLY ONE required
        appointmentTypeId: z.string().optional(),
        adhoc: z.boolean().optional(),

        // Fields (required if adhoc, optional if appointmentTypeId)
        title: z.string().min(1).max(200).optional(),
        description: z.string().max(5000).optional(),
        duration: z.number().int().min(5).max(1440).optional(),
        isOnline: z.boolean().optional(),
        videoLink: z.string().url().optional(),
        locationAddress: z.string().max(500).optional(),
        notes: z.string().max(5000).optional(),

        // Bulk allocation
        quantity: z.number().int().min(1).max(100).default(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate allocation mode - exactly one required
      if (!input.appointmentTypeId && !input.adhoc) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Must provide either appointmentTypeId or adhoc=true',
        });
      }

      if (input.appointmentTypeId && input.adhoc) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot provide both appointmentTypeId and adhoc=true',
        });
      }

      // Validate quantity
      if (!isValidQuantity(input.quantity)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Quantity must be between 1 and 100',
        });
      }

      // Self-assignment check for instructors
      if (ctx.role === MembershipRole.INSTRUCTOR && input.instructorId !== ctx.membershipId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Instructors can only assign appointments to themselves',
        });
      }

      // Ad-hoc appointments require admin
      if (input.adhoc && ctx.role !== MembershipRole.SUPER_ADMIN) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can create ad-hoc appointments',
        });
      }

      // Validate student exists in organization
      const { data: student } = await ctx.supabase
        .from('organization_memberships')
        .select('id')
        .eq('id', input.studentId)
        .eq('organization_id', ctx.organizationId)
        .eq('role', MembershipRole.STUDENT)
        .eq('status', 'ACTIVE')
        .single();

      if (!student) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid student ID or student not in this organization',
        });
      }

      // Validate instructor exists in organization
      const { data: instructor } = await ctx.supabase
        .from('organization_memberships')
        .select('id')
        .eq('id', input.instructorId)
        .eq('organization_id', ctx.organizationId)
        .eq('role', MembershipRole.INSTRUCTOR)
        .eq('status', 'ACTIVE')
        .single();

      if (!instructor) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid instructor ID or instructor not in this organization',
        });
      }

      let appointmentData: {
        title: string;
        description: string | null;
        duration: number;
        is_online: boolean;
        video_link: string | null;
        location_address: string | null;
        appointment_type_id: string | null;
      };

      if (input.appointmentTypeId) {
        // Allocate from appointment type
        const { data: appointmentType, error: typeError } = await ctx.supabase
          .from('appointment_types')
          .select(`
            *,
            appointment_type_instructors (instructor_id)
          `)
          .eq('id', input.appointmentTypeId)
          .eq('organization_id', ctx.organizationId)
          .single();

        if (typeError || !appointmentType) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Appointment type not found',
          });
        }

        // Must be published
        if (appointmentType.status !== AppointmentTypeStatus.PUBLISHED) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Can only allocate from PUBLISHED appointment types',
          });
        }

        // Type-safe access to instructor join
        type TypeWithInstructors = typeof appointmentType & {
          appointment_type_instructors: { instructor_id: string }[];
        };
        const typedType = appointmentType as unknown as TypeWithInstructors;
        const instructors = typedType.appointment_type_instructors ?? [];
        const isQualified = instructors.some(
          (i) => i.instructor_id === input.instructorId
        );

        if (!isQualified) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Instructor is not qualified for this appointment type',
          });
        }

        // Determine location settings based on appointment type's locationMode
        const isOnline = input.isOnline ?? (appointmentType.location_mode === LocationMode.ONLINE);

        // Use appointment type defaults, allow overrides
        appointmentData = {
          title: input.title ? sanitizeText(input.title, 200) : appointmentType.name,
          description: input.description
            ? sanitizeRichText(input.description)
            : appointmentType.description,
          duration: input.duration ?? appointmentType.duration,
          is_online: isOnline,
          video_link: input.videoLink ? sanitizeUrl(input.videoLink) : null,
          location_address: input.locationAddress ? sanitizeAddress(input.locationAddress) : null,
          appointment_type_id: input.appointmentTypeId,
        };
      } else {
        // Ad-hoc appointment - all fields required
        if (!input.title) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Title is required for ad-hoc appointments',
          });
        }

        if (!input.duration) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Duration is required for ad-hoc appointments',
          });
        }

        if (input.isOnline === undefined) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'isOnline is required for ad-hoc appointments',
          });
        }

        if (!isValidDuration(input.duration)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Duration must be between 5 and 1440 minutes',
          });
        }

        // Validate location requirements
        if (input.isOnline && !input.videoLink) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Video link is required for online appointments',
          });
        }

        if (!input.isOnline && !input.locationAddress) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Location address is required for in-person appointments',
          });
        }

        // Validate video link
        const sanitizedVideoLink = input.videoLink ? sanitizeUrl(input.videoLink) : null;
        if (input.videoLink && !sanitizedVideoLink) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid video link. Must be HTTPS.',
          });
        }

        appointmentData = {
          title: sanitizeText(input.title, 200),
          description: input.description ? sanitizeRichText(input.description) : null,
          duration: input.duration,
          is_online: input.isOnline,
          video_link: sanitizedVideoLink,
          location_address: input.locationAddress ? sanitizeAddress(input.locationAddress) : null,
          appointment_type_id: null,
        };
      }

      // Create appointments (one by one for bulk)
      const created = [];

      for (let i = 0; i < input.quantity; i++) {
        const { data: appointment, error: createError } = await ctx.supabase
          .from('appointments')
          .insert({
            organization_id: ctx.organizationId!,
            appointment_type_id: appointmentData.appointment_type_id,
            student_id: input.studentId,
            instructor_id: input.instructorId,
            created_by: ctx.membershipId!,
            title: appointmentData.title,
            description: appointmentData.description,
            duration: appointmentData.duration,
            status: AppointmentStatus.UNBOOKED,
            is_online: appointmentData.is_online,
            video_link: appointmentData.video_link,
            location_address: appointmentData.location_address,
            notes: input.notes ? sanitizeRichText(input.notes) : null,
          })
          .select(appointmentSelectWithRelations)
          .single();

        if (createError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: createError.message,
          });
        }

        created.push(appointment);
      }

      return { appointments: created };
    }),

  /**
   * Batch allocate multiple appointments
   * All-or-nothing transaction
   */
  allocateBatch: adminProcedure
    .input(
      z.object({
        studentId: z.string(),
        allocations: z.array(
          z.object({
            appointmentTypeId: z.string(),
            instructorId: z.string(),
            quantity: z.number().int().min(1).max(100),
          })
        ).min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate student
      const { data: student } = await ctx.supabase
        .from('organization_memberships')
        .select('id')
        .eq('id', input.studentId)
        .eq('organization_id', ctx.organizationId)
        .eq('role', MembershipRole.STUDENT)
        .eq('status', 'ACTIVE')
        .single();

      if (!student) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid student ID or student not in this organization',
        });
      }

      // Calculate total quantity
      const totalQuantity = input.allocations.reduce((sum, a) => sum + a.quantity, 0);
      if (totalQuantity > 100) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Total quantity cannot exceed 100 appointments',
        });
      }

      // Validate all allocations first
      const appointmentTypes: Map<string, any> = new Map();

      for (const allocation of input.allocations) {
        // Validate instructor
        const { data: instructor } = await ctx.supabase
          .from('organization_memberships')
          .select('id')
          .eq('id', allocation.instructorId)
          .eq('organization_id', ctx.organizationId)
          .eq('role', MembershipRole.INSTRUCTOR)
          .eq('status', 'ACTIVE')
          .single();

        if (!instructor) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Invalid instructor ID: ${allocation.instructorId}`,
          });
        }

        // Validate appointment type
        const { data: appointmentType } = await ctx.supabase
          .from('appointment_types')
          .select(`
            *,
            appointment_type_instructors (instructor_id)
          `)
          .eq('id', allocation.appointmentTypeId)
          .eq('organization_id', ctx.organizationId)
          .single();

        if (!appointmentType) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Appointment type not found: ${allocation.appointmentTypeId}`,
          });
        }

        if (appointmentType.status !== AppointmentTypeStatus.PUBLISHED) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Appointment type ${appointmentType.name} is not published`,
          });
        }

        // Type-safe access to instructor join
        type BatchTypeWithInstructors = typeof appointmentType & {
          appointment_type_instructors: { instructor_id: string }[];
        };
        const typedType = appointmentType as unknown as BatchTypeWithInstructors;
        const instructors = typedType.appointment_type_instructors ?? [];
        const isQualified = instructors.some(
          (i) => i.instructor_id === allocation.instructorId
        );

        if (!isQualified) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: `Instructor is not qualified for appointment type: ${appointmentType.name}`,
          });
        }

        appointmentTypes.set(allocation.appointmentTypeId, appointmentType);
      }

      // Create all appointments
      const created = [];

      for (const allocation of input.allocations) {
        const appointmentType = appointmentTypes.get(allocation.appointmentTypeId)!;

        for (let i = 0; i < allocation.quantity; i++) {
          const { data: appointment, error: createError } = await ctx.supabase
            .from('appointments')
            .insert({
              organization_id: ctx.organizationId!,
              appointment_type_id: allocation.appointmentTypeId,
              student_id: input.studentId,
              instructor_id: allocation.instructorId,
              created_by: ctx.membershipId!,
              title: appointmentType.name,
              description: appointmentType.description,
              duration: appointmentType.duration,
              status: AppointmentStatus.UNBOOKED,
              is_online: appointmentType.location_mode === LocationMode.ONLINE,
              video_link: null,
              location_address: null,
            })
            .select(appointmentSelectWithRelations)
            .single();

          if (createError) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: createError.message,
            });
          }

          created.push(appointment);
        }
      }

      return created;
    }),

  /**
   * List appointments
   * Filtered by role:
   * - Admin: sees all in organization
   * - Instructor: sees appointments they're assigned to
   * - Student: sees their own appointments
   */
  list: protectedProcedure
    .input(
      z.object({
        studentId: z.string().optional(),
        instructorId: z.string().optional(),
        status: z.nativeEnum(AppointmentStatus).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      // Build query
      let query = ctx.supabase
        .from('appointments')
        .select(appointmentSelectWithRelations)
        .eq('organization_id', ctx.organizationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Role-based filtering
      const membershipId = ctx.membershipId;
      if (ctx.role === MembershipRole.INSTRUCTOR && membershipId) {
        query = query.eq('instructor_id', membershipId);
      } else if (ctx.role === MembershipRole.STUDENT && membershipId) {
        query = query.eq('student_id', membershipId);
      }

      // Apply optional filters
      if (input?.studentId) {
        query = query.eq('student_id', input.studentId);
      }
      if (input?.instructorId) {
        query = query.eq('instructor_id', input.instructorId);
      }
      if (input?.status) {
        query = query.eq('status', input.status);
      }

      const { data: appointments, error } = await query;

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      return appointments ?? [];
    }),

  /**
   * Get a single appointment
   */
  get: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { data: appointment, error } = await ctx.supabase
        .from('appointments')
        .select(`
          ${appointmentSelectWithRelations},
          creator:organization_memberships!appointments_created_by_fkey (
            *,
            users (first_name, last_name, email)
          )
        `)
        .eq('id', input.id)
        .eq('organization_id', ctx.organizationId)
        .single();

      if (error || !appointment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Appointment not found',
        });
      }

      // Check access based on role
      if (ctx.role === MembershipRole.INSTRUCTOR && appointment.instructor_id !== ctx.membershipId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only view your own appointments',
        });
      }

      if (ctx.role === MembershipRole.STUDENT && appointment.student_id !== ctx.membershipId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only view your own appointments',
        });
      }

      return appointment;
    }),

  /**
   * Update an appointment
   * Uses optimistic locking with version field
   */
  update: instructorProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().max(5000).optional().nullable(),
        duration: z.number().int().min(5).max(1440).optional(),
        isOnline: z.boolean().optional(),
        videoLink: z.string().url().optional().nullable(),
        locationAddress: z.string().max(500).optional().nullable(),
        notes: z.string().max(5000).optional().nullable(),
        version: z.number().int(), // Required for optimistic locking
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data: appointment, error: findError } = await ctx.supabase
        .from('appointments')
        .select('*')
        .eq('id', input.id)
        .eq('organization_id', ctx.organizationId)
        .single();

      if (findError || !appointment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Appointment not found',
        });
      }

      // Check permission - creator or admin
      if (
        ctx.role !== MembershipRole.SUPER_ADMIN &&
        appointment.created_by !== ctx.membershipId
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only update appointments you created',
        });
      }

      // Cannot update terminal states
      if (appointment.status === AppointmentStatus.COMPLETED || appointment.status === AppointmentStatus.CANCELLED) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot update completed or cancelled appointments',
        });
      }

      // Optimistic locking check
      if (appointment.version !== input.version) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Appointment was modified by another user. Please refresh and try again.',
        });
      }

      // Validate duration if provided
      if (input.duration !== undefined && !isValidDuration(input.duration)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Duration must be between 5 and 1440 minutes',
        });
      }

      // Determine final location values
      const finalIsOnline = input.isOnline ?? appointment.is_online;
      const finalVideoLink = input.videoLink !== undefined ? input.videoLink : appointment.video_link;
      const finalAddress = input.locationAddress !== undefined ? input.locationAddress : appointment.location_address;

      // Validate location requirements
      if (finalIsOnline && !finalVideoLink) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Video link is required for online appointments',
        });
      }

      if (!finalIsOnline && !finalAddress) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Location address is required for in-person appointments',
        });
      }

      // Validate video link if provided
      let sanitizedVideoLink: string | null | undefined = undefined;
      if (input.videoLink !== undefined) {
        if (input.videoLink) {
          sanitizedVideoLink = sanitizeUrl(input.videoLink);
          if (!sanitizedVideoLink) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Invalid video link. Must be HTTPS.',
            });
          }
        } else {
          sanitizedVideoLink = null;
        }
      }

      // Build update data
      const updateData: Record<string, unknown> = {
        version: appointment.version + 1,
      };

      if (input.title !== undefined) {
        updateData.title = sanitizeText(input.title, 200);
      }
      if (input.description !== undefined) {
        updateData.description = input.description ? sanitizeRichText(input.description) : null;
      }
      if (input.duration !== undefined) {
        updateData.duration = input.duration;
      }
      if (input.isOnline !== undefined) {
        updateData.is_online = input.isOnline;
      }
      if (sanitizedVideoLink !== undefined) {
        updateData.video_link = sanitizedVideoLink;
      }
      if (input.locationAddress !== undefined) {
        updateData.location_address = input.locationAddress ? sanitizeAddress(input.locationAddress) : null;
      }
      if (input.notes !== undefined) {
        updateData.notes = input.notes ? sanitizeRichText(input.notes) : null;
      }

      const { data: updated, error: updateError } = await ctx.supabase
        .from('appointments')
        .update(updateData)
        .eq('id', input.id)
        .select(appointmentSelectWithRelations)
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
   * Cancel an appointment
   * Instructor only - students cannot cancel
   */
  cancel: instructorProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data: appointment, error: findError } = await ctx.supabase
        .from('appointments')
        .select('*')
        .eq('id', input.id)
        .eq('organization_id', ctx.organizationId)
        .single();

      if (findError || !appointment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Appointment not found',
        });
      }

      // Check permission
      if (
        ctx.role !== MembershipRole.SUPER_ADMIN &&
        appointment.instructor_id !== ctx.membershipId
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only cancel your own appointments',
        });
      }

      // Cannot cancel terminal states
      if (appointment.status === AppointmentStatus.COMPLETED || appointment.status === AppointmentStatus.CANCELLED) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot cancel completed or already cancelled appointments',
        });
      }

      const { error: updateError } = await ctx.supabase
        .from('appointments')
        .update({
          status: AppointmentStatus.CANCELLED,
          deleted_at: new Date().toISOString(),
        })
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
   * Mark an appointment as completed
   * Instructor only
   */
  complete: instructorProcedure
    .input(
      z.object({
        id: z.string(),
        notes: z.string().max(5000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data: appointment, error: findError } = await ctx.supabase
        .from('appointments')
        .select('*')
        .eq('id', input.id)
        .eq('organization_id', ctx.organizationId)
        .single();

      if (findError || !appointment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Appointment not found',
        });
      }

      // Check permission
      if (
        ctx.role !== MembershipRole.SUPER_ADMIN &&
        appointment.instructor_id !== ctx.membershipId
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only complete your own appointments',
        });
      }

      // Can only complete BOOKED appointments
      if (appointment.status !== AppointmentStatus.BOOKED) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only booked appointments can be marked as completed',
        });
      }

      const { data: updated, error: updateError } = await ctx.supabase
        .from('appointments')
        .update({
          status: AppointmentStatus.COMPLETED,
          notes: input.notes ? sanitizeRichText(input.notes) : appointment.notes,
        })
        .eq('id', input.id)
        .select(appointmentSelectWithRelations)
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
   * Delete an appointment (soft delete)
   * Only UNBOOKED appointments can be deleted
   */
  delete: instructorProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data: appointment, error: findError } = await ctx.supabase
        .from('appointments')
        .select('*')
        .eq('id', input.id)
        .eq('organization_id', ctx.organizationId)
        .single();

      if (findError || !appointment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Appointment not found',
        });
      }

      // Check permission - creator or admin
      if (
        ctx.role !== MembershipRole.SUPER_ADMIN &&
        appointment.created_by !== ctx.membershipId
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only delete appointments you created',
        });
      }

      // Only UNBOOKED can be deleted
      if (appointment.status !== AppointmentStatus.UNBOOKED) {
        if (appointment.status === AppointmentStatus.BOOKED) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot delete booked appointments. Cancel the booking first.',
          });
        } else {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot delete appointments in terminal states (completed/cancelled)',
          });
        }
      }

      const { error: updateError } = await ctx.supabase
        .from('appointments')
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
});
