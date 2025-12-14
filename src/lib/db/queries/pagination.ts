import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { TableName } from '@/types/database';

/**
 * Default pagination values
 */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * Pagination input type (matches common tRPC input patterns)
 */
export interface PaginationInput {
  take?: number;
  skip?: number;
}

/**
 * Pagination result with data and metadata
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  hasMore: boolean;
  take: number;
  skip: number;
}

/** Generic Supabase query builder for filtering */
type PostgrestFilterBuilder = ReturnType<ReturnType<SupabaseClient<Database>['from']>['select']>;

/**
 * Apply pagination to a Supabase query
 * Converts take/skip parameters to Supabase range()
 *
 * Note: This utility is currently unused but available for future use.
 *
 * @example
 * const { data } = await paginate(
 *   supabase.from('appointments').select('*'),
 *   { take: 10, skip: 0 }
 * );
 */
export function paginate<T extends { range: (from: number, to: number) => T }>(
  query: T,
  { take = DEFAULT_PAGE_SIZE, skip = 0 }: PaginationInput
): T {
  // Ensure take is within bounds
  const limitedTake = Math.min(take, MAX_PAGE_SIZE);

  // Supabase range is inclusive, so we need to adjust
  // range(0, 9) returns 10 items (0-9 inclusive)
  const from = skip;
  const to = skip + limitedTake - 1;

  return query.range(from, to);
}

/**
 * Get paginated data with count
 * Returns both data and total count for pagination UI
 *
 * Note: This utility is currently unused but available for future use.
 *
 * @example
 * const result = await paginateWithCount(
 *   supabase,
 *   'appointments',
 *   '*',
 *   { take: 10, skip: 0 },
 *   (q) => q.eq('organization_id', orgId)
 * );
 * // result = { data: [...], total: 100, hasMore: true, take: 10, skip: 0 }
 */
export async function paginateWithCount<T>(
  supabase: SupabaseClient<Database>,
  table: TableName,
  select: string,
  pagination: PaginationInput,
  filterFn?: (query: PostgrestFilterBuilder) => PostgrestFilterBuilder
): Promise<PaginatedResult<T>> {
  const { take = DEFAULT_PAGE_SIZE, skip = 0 } = pagination;
  const limitedTake = Math.min(take, MAX_PAGE_SIZE);

  // Build query with count
  let query = supabase
    .from(table)
    .select(select, { count: 'exact' });

  // Apply custom filters if provided
  if (filterFn) {
    query = filterFn(query);
  }

  // Apply pagination
  const from = skip;
  const to = skip + limitedTake - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    throw error;
  }

  const total = count ?? 0;
  const hasMore = skip + limitedTake < total;

  return {
    data: (data ?? []) as T[],
    total,
    hasMore,
    take: limitedTake,
    skip,
  };
}

/**
 * Calculate pagination metadata from results
 */
export function calculatePagination(
  total: number,
  take: number,
  skip: number
): { hasMore: boolean; totalPages: number; currentPage: number } {
  const totalPages = Math.ceil(total / take);
  const currentPage = Math.floor(skip / take) + 1;
  const hasMore = skip + take < total;

  return { hasMore, totalPages, currentPage };
}
