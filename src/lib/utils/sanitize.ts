import DOMPurify from 'isomorphic-dompurify';
import { TRPCError } from '@trpc/server';
import {
  APPOINTMENT_TYPE_NAME_MAX_LENGTH,
  APPOINTMENT_TYPE_DESCRIPTION_MAX_LENGTH,
  LOCATION_ADDRESS_MAX_LENGTH,
  APPOINTMENT_DURATION_MIN,
  APPOINTMENT_DURATION_MAX,
  BULK_QUANTITY_MIN,
  BULK_QUANTITY_MAX,
} from './constants';

/**
 * Sanitization utilities for Appointment Management
 * Uses isomorphic-dompurify for XSS protection
 */

/**
 * Sanitize plain text - strips ALL HTML tags
 * Use for: name, title, locationAddress
 *
 * @param input - The string to sanitize
 * @param maxLength - Maximum allowed length (default: 200)
 * @returns Sanitized string
 */
export function sanitizeText(
  input: string | null | undefined,
  maxLength: number = APPOINTMENT_TYPE_NAME_MAX_LENGTH
): string {
  if (!input) return '';

  // Strip all HTML tags, keep only text content
  const sanitized = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });

  // Trim whitespace and enforce max length
  return sanitized.trim().slice(0, maxLength);
}

/**
 * Sanitize plain text and validate it's not empty
 * Use for required fields like: name, title
 * Throws TRPCError if result is empty (whitespace-only input)
 *
 * @param input - The string to sanitize
 * @param maxLength - Maximum allowed length (default: 200)
 * @param fieldName - Optional field name for error message
 * @returns Sanitized non-empty string
 * @throws TRPCError with BAD_REQUEST if result is empty
 */
export function sanitizeRequiredText(
  input: string,
  maxLength: number = APPOINTMENT_TYPE_NAME_MAX_LENGTH,
  fieldName: string = 'Input'
): string {
  const sanitized = sanitizeText(input, maxLength);

  if (sanitized.length === 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `${fieldName} cannot be empty or whitespace-only`,
    });
  }

  return sanitized;
}

/**
 * Sanitize rich text - allows basic formatting tags
 * Use for: description, notes
 *
 * @param input - The string to sanitize
 * @param maxLength - Maximum allowed length (default: 5000)
 * @returns Sanitized string with allowed HTML tags
 */
export function sanitizeRichText(
  input: string | null | undefined,
  maxLength: number = APPOINTMENT_TYPE_DESCRIPTION_MAX_LENGTH
): string {
  if (!input) return '';

  // Allow only basic formatting tags
  const sanitized = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: [],
  });

  // Trim whitespace and enforce max length
  return sanitized.trim().slice(0, maxLength);
}

/**
 * Sanitize and validate URL - ensures HTTPS and blocks dangerous schemes
 * Use for: videoLink
 *
 * @param url - The URL to sanitize
 * @returns Sanitized URL or null if invalid
 */
export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  // Block dangerous URL schemes
  const dangerousSchemes = ['javascript:', 'data:', 'file:', 'vbscript:'];
  const lowerUrl = trimmed.toLowerCase();

  for (const scheme of dangerousSchemes) {
    if (lowerUrl.startsWith(scheme)) {
      return null;
    }
  }

  // Validate URL format
  try {
    const parsed = new URL(trimmed);

    // Only allow HTTPS (or HTTP for localhost in development)
    if (parsed.protocol === 'https:') {
      return trimmed;
    }

    // Allow HTTP only for localhost (development)
    if (parsed.protocol === 'http:' &&
        (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
      return trimmed;
    }

    // Reject other protocols
    return null;
  } catch {
    // Invalid URL format
    return null;
  }
}

/**
 * Sanitize address field
 * Use for: locationAddress
 *
 * @param input - The address string to sanitize
 * @returns Sanitized address string
 */
export function sanitizeAddress(input: string | null | undefined): string {
  return sanitizeText(input, LOCATION_ADDRESS_MAX_LENGTH);
}

/**
 * Validate duration is within acceptable range
 *
 * @param duration - Duration in minutes
 * @returns True if valid, false otherwise
 */
export function isValidDuration(duration: number): boolean {
  return Number.isInteger(duration) && duration >= APPOINTMENT_DURATION_MIN && duration <= APPOINTMENT_DURATION_MAX;
}

/**
 * Validate quantity for bulk operations
 *
 * @param quantity - Number of items
 * @returns True if valid, false otherwise
 */
export function isValidQuantity(quantity: number): boolean {
  return Number.isInteger(quantity) && quantity >= BULK_QUANTITY_MIN && quantity <= BULK_QUANTITY_MAX;
}
