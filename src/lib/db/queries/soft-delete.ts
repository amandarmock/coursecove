/**
 * Tables that support soft delete (have deletedAt column)
 */
export const SOFT_DELETE_TABLES = [
  'webhook_events',
  'appointment_types',
  'appointments',
] as const;

export type SoftDeleteTable = (typeof SOFT_DELETE_TABLES)[number];

/** Query type with filter methods */
type FilterableQuery<T> = T & {
  is: (column: string, value: null) => T;
  not: (column: string, operator: string, value: null) => T;
};

/**
 * Add soft delete filter to a query (excludes deleted records)
 * This is the default behavior - only returns records where deleted_at IS NULL
 *
 * @example
 * const { data } = await withSoftDelete(
 *   supabase.from('appointment_types').select('*')
 * );
 */
export function withSoftDelete<T>(query: FilterableQuery<T>): T {
  return query.is('deleted_at', null);
}

/**
 * Include soft-deleted records in a query
 * Returns ALL records regardless of deleted_at status
 *
 * @example
 * const { data } = await includeSoftDeleted(
 *   supabase.from('appointment_types').select('*')
 * );
 */
export function includeSoftDeleted<T>(query: T): T {
  // No filter applied - returns all records
  return query;
}

/**
 * Only return soft-deleted records
 *
 * @example
 * const { data } = await onlySoftDeleted(
 *   supabase.from('appointment_types').select('*')
 * );
 */
export function onlySoftDeleted<T>(query: FilterableQuery<T>): T {
  return query.not('deleted_at', 'is', null);
}

/**
 * Soft delete a record by setting deleted_at to current timestamp
 *
 * @example
 * const { data, error } = await softDelete(
 *   supabase.from('appointment_types').update({ deleted_at: new Date().toISOString() }).eq('id', id)
 * );
 */
export function getSoftDeleteData() {
  return {
    deleted_at: new Date().toISOString(),
  };
}

/**
 * Restore a soft-deleted record by setting deleted_at to null
 */
export function getRestoreData() {
  return {
    deleted_at: null,
  };
}

/**
 * Check if a table supports soft delete
 */
export function isSoftDeleteTable(table: string): table is SoftDeleteTable {
  return SOFT_DELETE_TABLES.includes(table as SoftDeleteTable);
}
