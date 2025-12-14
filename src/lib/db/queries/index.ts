/**
 * Supabase Query Utilities
 *
 * Common database operation patterns:
 * - Soft delete filtering
 * - Pagination
 * - RLS context setting
 */

// RLS Context
export { setRLSContext } from './context';

// Soft Delete
export {
  withSoftDelete,
  includeSoftDeleted,
  onlySoftDeleted,
  getSoftDeleteData,
  getRestoreData,
  isSoftDeleteTable,
  SOFT_DELETE_TABLES,
  type SoftDeleteTable,
} from './soft-delete';

// Pagination
export {
  paginate,
  paginateWithCount,
  calculatePagination,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  type PaginationInput,
  type PaginatedResult,
} from './pagination';
