/**
 * Application Constants
 * Single source of truth for validation limits and configuration values
 */

// =============================================================================
// Appointment Type Limits
// =============================================================================

/** Minimum duration for appointments in minutes */
export const APPOINTMENT_DURATION_MIN = 5;

/** Maximum duration for appointments in minutes (24 hours) */
export const APPOINTMENT_DURATION_MAX = 1440;

/** Maximum length for appointment type names */
export const APPOINTMENT_TYPE_NAME_MAX_LENGTH = 200;

/** Maximum length for appointment type descriptions */
export const APPOINTMENT_TYPE_DESCRIPTION_MAX_LENGTH = 5000;

// =============================================================================
// Business Location Limits
// =============================================================================

/** Maximum length for business location names */
export const LOCATION_NAME_MAX_LENGTH = 100;

/** Maximum length for address fields */
export const LOCATION_ADDRESS_MAX_LENGTH = 200;

/** Maximum length for city names */
export const LOCATION_CITY_MAX_LENGTH = 100;

/** Maximum length for state/province names */
export const LOCATION_STATE_MAX_LENGTH = 50;

/** Maximum length for postal/zip codes */
export const LOCATION_ZIP_MAX_LENGTH = 20;

/** Maximum length for location notes */
export const LOCATION_NOTES_MAX_LENGTH = 500;

// =============================================================================
// Pagination Defaults
// =============================================================================

/** Default number of items per page */
export const DEFAULT_PAGE_SIZE = 25;

/** Maximum number of items per page */
export const MAX_PAGE_SIZE = 100;

// =============================================================================
// Bulk Operation Limits
// =============================================================================

/** Minimum quantity for bulk operations */
export const BULK_QUANTITY_MIN = 1;

/** Maximum quantity for bulk operations */
export const BULK_QUANTITY_MAX = 100;

// =============================================================================
// Membership Soft Delete
// =============================================================================

/** Number of days before removed memberships are permanently deleted */
export const MEMBERSHIP_RETENTION_DAYS = 30;

/** Urgency threshold (days remaining) for red warning banner */
export const MEMBERSHIP_WARNING_URGENT_DAYS = 3;

/** Urgency threshold (days remaining) for orange warning banner */
export const MEMBERSHIP_WARNING_CAUTION_DAYS = 7;
