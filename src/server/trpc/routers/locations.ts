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
import type { Row } from '@/types/database';

/** Transform Supabase snake_case to frontend camelCase */
function transformLocation(loc: Row<'business_locations'>) {
  return {
    id: loc.id,
    name: loc.name,
    address: loc.address,
    city: loc.city,
    state: loc.state,
    zipCode: loc.zip_code,
    notes: loc.notes,
    isActive: loc.is_active,
    organizationId: loc.organization_id,
    createdAt: loc.created_at,
    updatedAt: loc.updated_at,
    deletedAt: loc.deleted_at,
  };
}

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
      const { organizationId, supabase } = ctx;
      const take = input?.take ?? DEFAULT_PAGE_SIZE;
      const skip = input?.skip ?? 0;

      // Build query
      let query = supabase
        .from('business_locations')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .order('is_active', { ascending: false })
        .order('name', { ascending: true })
        .range(skip, skip + take - 1);

      // Filter inactive unless requested
      if (!input?.includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data: locations, count, error } = await query;

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      const total = count ?? 0;

      return {
        items: (locations ?? []).map(transformLocation),
        total,
        take,
        skip,
        hasMore: skip + (locations?.length ?? 0) < total,
      };
    }),

  /**
   * Get a single business location by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { organizationId, supabase } = ctx;

      const { data: location, error } = await supabase
        .from('business_locations')
        .select('*')
        .eq('id', input.id)
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .single();

      if (error || !location) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Location not found',
        });
      }

      return transformLocation(location);
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
      const { organizationId, supabase } = ctx;

      // Check for duplicate name within organization
      const { data: existing } = await supabase
        .from('business_locations')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('name', input.name)
        .is('deleted_at', null)
        .single();

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `A location named "${input.name}" already exists`,
        });
      }

      const { data: location, error } = await supabase
        .from('business_locations')
        .insert({
          name: sanitizeRequiredText(input.name, LOCATION_NAME_MAX_LENGTH, 'Name'),
          address: sanitizeRequiredText(input.address, LOCATION_ADDRESS_MAX_LENGTH, 'Address'),
          city: sanitizeRequiredText(input.city, LOCATION_CITY_MAX_LENGTH, 'City'),
          state: sanitizeRequiredText(input.state, LOCATION_STATE_MAX_LENGTH, 'State'),
          zip_code: sanitizeRequiredText(input.zipCode, LOCATION_ZIP_MAX_LENGTH, 'Zip code'),
          notes: input.notes ? sanitizeRichText(input.notes, LOCATION_NOTES_MAX_LENGTH) : null,
          organization_id: organizationId,
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      return transformLocation(location);
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
      const { organizationId, supabase } = ctx;
      const { id, ...data } = input;

      // Verify location exists and belongs to organization
      const { data: existing, error: existingError } = await supabase
        .from('business_locations')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .single();

      if (existingError || !existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Location not found',
        });
      }

      // Check for duplicate name (if name is changing)
      if (data.name !== existing.name) {
        const { data: duplicate } = await supabase
          .from('business_locations')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('name', data.name)
          .is('deleted_at', null)
          .neq('id', id)
          .single();

        if (duplicate) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `A location named "${data.name}" already exists`,
          });
        }
      }

      const { data: location, error } = await supabase
        .from('business_locations')
        .update({
          name: sanitizeRequiredText(data.name, LOCATION_NAME_MAX_LENGTH, 'Name'),
          address: sanitizeRequiredText(data.address, LOCATION_ADDRESS_MAX_LENGTH, 'Address'),
          city: sanitizeRequiredText(data.city, LOCATION_CITY_MAX_LENGTH, 'City'),
          state: sanitizeRequiredText(data.state, LOCATION_STATE_MAX_LENGTH, 'State'),
          zip_code: sanitizeRequiredText(data.zipCode, LOCATION_ZIP_MAX_LENGTH, 'Zip code'),
          notes: data.notes ? sanitizeRichText(data.notes, LOCATION_NOTES_MAX_LENGTH) : null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      return transformLocation(location);
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
      const { organizationId, supabase } = ctx;

      // Verify location exists and belongs to organization
      const { data: existing, error: existingError } = await supabase
        .from('business_locations')
        .select('id')
        .eq('id', input.id)
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .single();

      if (existingError || !existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Location not found',
        });
      }

      // If deactivating, check if any appointment types use this location
      if (!input.isActive) {
        const { count } = await supabase
          .from('appointment_types')
          .select('*', { count: 'exact', head: true })
          .eq('business_location_id', input.id)
          .eq('organization_id', organizationId)
          .is('deleted_at', null);

        if (count && count > 0) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: `Cannot deactivate location. ${count} appointment type(s) are using this location.`,
          });
        }
      }

      const { data: location, error } = await supabase
        .from('business_locations')
        .update({ is_active: input.isActive })
        .eq('id', input.id)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      return transformLocation(location);
    }),

  /**
   * Soft delete a business location
   * Admin only - Rate limited: 20/min
   */
  delete: rateLimitedDeleteProcedure('locations.delete')
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, supabase } = ctx;

      // Verify location exists and belongs to organization
      const { data: existing, error: existingError } = await supabase
        .from('business_locations')
        .select('id')
        .eq('id', input.id)
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .single();

      if (existingError || !existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Location not found',
        });
      }

      // Check if any appointment types use this location
      const { count } = await supabase
        .from('appointment_types')
        .select('*', { count: 'exact', head: true })
        .eq('business_location_id', input.id)
        .eq('organization_id', organizationId)
        .is('deleted_at', null);

      if (count && count > 0) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `Cannot delete location. ${count} appointment type(s) are using this location.`,
        });
      }

      // Soft delete
      const { data: location, error } = await supabase
        .from('business_locations')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', input.id)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      return transformLocation(location);
    }),
});