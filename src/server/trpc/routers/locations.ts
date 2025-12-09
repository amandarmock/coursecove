import { z } from 'zod';
import {
  router,
  protectedProcedure,
  rateLimitedCreateProcedure,
  rateLimitedAdminProcedure,
  rateLimitedDeleteProcedure,
} from '../init';
import { TRPCError } from '@trpc/server';
import {
  LOCATION_NAME_MAX_LENGTH,
  LOCATION_ADDRESS_MAX_LENGTH,
  LOCATION_CITY_MAX_LENGTH,
  LOCATION_STATE_MAX_LENGTH,
  LOCATION_ZIP_MAX_LENGTH,
  LOCATION_NOTES_MAX_LENGTH,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '@/lib/utils/constants';
import {
  sanitizeRequiredText,
  sanitizeRichText,
} from '@/lib/utils/sanitize';

/**
 * Business Locations Router
 * Handles CRUD operations for business location addresses
 */
export const locationsRouter = router({
  /**
   * List all business locations for the organization
   * Supports pagination with take/skip parameters
   */
  list: protectedProcedure
    .input(
      z.object({
        includeInactive: z.boolean().optional().default(false),
        take: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
        skip: z.number().int().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { organizationId, prisma } = ctx;
      const take = input?.take ?? DEFAULT_PAGE_SIZE;
      const skip = input?.skip ?? 0;

      const where = {
        organizationId,
        deletedAt: null,
        ...(input?.includeInactive ? {} : { isActive: true }),
      };

      const [locations, total] = await prisma.$transaction([
        prisma.businessLocation.findMany({
          where,
          orderBy: [
            { isActive: 'desc' },
            { name: 'asc' },
          ],
          take,
          skip,
        }),
        prisma.businessLocation.count({ where }),
      ]);

      return {
        items: locations,
        total,
        take,
        skip,
        hasMore: skip + locations.length < total,
      };
    }),

  /**
   * Get a single business location by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { organizationId, prisma } = ctx;

      const location = await prisma.businessLocation.findFirst({
        where: {
          id: input.id,
          organizationId,
          deletedAt: null,
        },
      });

      if (!location) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Location not found',
        });
      }

      return location;
    }),

  /**
   * Create a new business location
   * Admin only - Rate limited: 10/min
   */
  create: rateLimitedCreateProcedure('locations.create')
    .input(
      z.object({
        name: z.string().min(1, 'Name is required').max(LOCATION_NAME_MAX_LENGTH),
        address: z.string().min(1, 'Address is required').max(LOCATION_ADDRESS_MAX_LENGTH),
        city: z.string().min(1, 'City is required').max(LOCATION_CITY_MAX_LENGTH),
        state: z.string().min(1, 'State is required').max(LOCATION_STATE_MAX_LENGTH),
        zipCode: z.string().min(1, 'Zip code is required').max(LOCATION_ZIP_MAX_LENGTH),
        notes: z.string().max(LOCATION_NOTES_MAX_LENGTH).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, prisma } = ctx;

      // Check for duplicate name within organization
      const existing = await prisma.businessLocation.findFirst({
        where: {
          organizationId,
          name: input.name,
          deletedAt: null,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `A location named "${input.name}" already exists`,
        });
      }

      const location = await prisma.businessLocation.create({
        data: {
          name: sanitizeRequiredText(input.name, LOCATION_NAME_MAX_LENGTH, 'Name'),
          address: sanitizeRequiredText(input.address, LOCATION_ADDRESS_MAX_LENGTH, 'Address'),
          city: sanitizeRequiredText(input.city, LOCATION_CITY_MAX_LENGTH, 'City'),
          state: sanitizeRequiredText(input.state, LOCATION_STATE_MAX_LENGTH, 'State'),
          zipCode: sanitizeRequiredText(input.zipCode, LOCATION_ZIP_MAX_LENGTH, 'Zip code'),
          notes: input.notes ? sanitizeRichText(input.notes, LOCATION_NOTES_MAX_LENGTH) : null,
          organizationId,
        },
      });

      return location;
    }),

  /**
   * Update a business location
   * Admin only - Rate limited: 30/min
   */
  update: rateLimitedAdminProcedure('locations.update')
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, 'Name is required').max(LOCATION_NAME_MAX_LENGTH),
        address: z.string().min(1, 'Address is required').max(LOCATION_ADDRESS_MAX_LENGTH),
        city: z.string().min(1, 'City is required').max(LOCATION_CITY_MAX_LENGTH),
        state: z.string().min(1, 'State is required').max(LOCATION_STATE_MAX_LENGTH),
        zipCode: z.string().min(1, 'Zip code is required').max(LOCATION_ZIP_MAX_LENGTH),
        notes: z.string().max(LOCATION_NOTES_MAX_LENGTH).optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, prisma } = ctx;
      const { id, ...data } = input;

      // Verify location exists and belongs to organization
      const existing = await prisma.businessLocation.findFirst({
        where: {
          id,
          organizationId,
          deletedAt: null,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Location not found',
        });
      }

      // Check for duplicate name (if name is changing)
      if (data.name !== existing.name) {
        const duplicate = await prisma.businessLocation.findFirst({
          where: {
            organizationId,
            name: data.name,
            deletedAt: null,
            id: { not: id },
          },
        });

        if (duplicate) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `A location named "${data.name}" already exists`,
          });
        }
      }

      const location = await prisma.businessLocation.update({
        where: { id },
        data: {
          name: sanitizeRequiredText(data.name, LOCATION_NAME_MAX_LENGTH, 'Name'),
          address: sanitizeRequiredText(data.address, LOCATION_ADDRESS_MAX_LENGTH, 'Address'),
          city: sanitizeRequiredText(data.city, LOCATION_CITY_MAX_LENGTH, 'City'),
          state: sanitizeRequiredText(data.state, LOCATION_STATE_MAX_LENGTH, 'State'),
          zipCode: sanitizeRequiredText(data.zipCode, LOCATION_ZIP_MAX_LENGTH, 'Zip code'),
          notes: data.notes ? sanitizeRichText(data.notes, LOCATION_NOTES_MAX_LENGTH) : null,
        },
      });

      return location;
    }),

  /**
   * Toggle active status of a business location
   * Admin only - Rate limited: 30/min
   */
  toggleActive: rateLimitedAdminProcedure('locations.toggleActive')
    .input(
      z.object({
        id: z.string(),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, prisma } = ctx;

      // Verify location exists and belongs to organization
      const existing = await prisma.businessLocation.findFirst({
        where: {
          id: input.id,
          organizationId,
          deletedAt: null,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Location not found',
        });
      }

      // If deactivating, check if any appointment types use this location
      if (!input.isActive) {
        const appointmentTypesUsingLocation = await prisma.appointmentType.count({
          where: {
            businessLocationId: input.id,
            organizationId,
            deletedAt: null,
            // Check ALL non-archived types, not just PUBLISHED
          },
        });

        if (appointmentTypesUsingLocation > 0) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: `Cannot deactivate location. ${appointmentTypesUsingLocation} appointment type(s) are using this location.`,
          });
        }
      }

      const location = await prisma.businessLocation.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      });

      return location;
    }),

  /**
   * Soft delete a business location
   * Admin only - Rate limited: 20/min
   */
  delete: rateLimitedDeleteProcedure('locations.delete')
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, prisma } = ctx;

      // Verify location exists and belongs to organization
      const existing = await prisma.businessLocation.findFirst({
        where: {
          id: input.id,
          organizationId,
          deletedAt: null,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Location not found',
        });
      }

      // Check if any appointment types use this location
      const appointmentTypesUsingLocation = await prisma.appointmentType.count({
        where: {
          businessLocationId: input.id,
          organizationId,
          deletedAt: null,
        },
      });

      if (appointmentTypesUsingLocation > 0) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `Cannot delete location. ${appointmentTypesUsingLocation} appointment type(s) are using this location.`,
        });
      }

      // Soft delete
      const location = await prisma.businessLocation.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });

      return location;
    }),
});