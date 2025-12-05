import DOMPurify from 'isomorphic-dompurify';

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
  maxLength: number = 200
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
 * Sanitize rich text - allows basic formatting tags
 * Use for: description, notes
 *
 * @param input - The string to sanitize
 * @param maxLength - Maximum allowed length (default: 5000)
 * @returns Sanitized string with allowed HTML tags
 */
export function sanitizeRichText(
  input: string | null | undefined,
  maxLength: number = 5000
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
  return sanitizeText(input, 500);
}

/**
 * Validate duration is within acceptable range
 *
 * @param duration - Duration in minutes
 * @returns True if valid, false otherwise
 */
export function isValidDuration(duration: number): boolean {
  return Number.isInteger(duration) && duration >= 5 && duration <= 1440;
}

/**
 * Validate quantity for bulk operations
 *
 * @param quantity - Number of items
 * @returns True if valid, false otherwise
 */
export function isValidQuantity(quantity: number): boolean {
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= 100;
}
