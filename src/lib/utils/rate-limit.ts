/**
 * Simple In-Memory Rate Limiter
 *
 * Provides per-user rate limiting for tRPC mutations.
 * Uses a sliding window algorithm with automatic cleanup.
 *
 * Note: This is suitable for single-server deployments.
 * For multi-server deployments, use Redis-based rate limiting.
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

// Store rate limit entries per user
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.windowStart > CLEANUP_INTERVAL) {
      rateLimitStore.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check if a request should be rate limited
 *
 * @param key - Unique identifier for the rate limit (e.g., `${userId}:${action}`)
 * @param config - Rate limit configuration
 * @returns Result indicating if the request is allowed
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // No previous requests or window expired - start fresh
  if (!entry || now - entry.windowStart >= config.windowMs) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return {
      success: true,
      remaining: config.limit - 1,
      resetAt: now + config.windowMs,
    };
  }

  // Within window - check count
  if (entry.count >= config.limit) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.windowStart + config.windowMs,
    };
  }

  // Increment count
  entry.count++;
  return {
    success: true,
    remaining: config.limit - entry.count,
    resetAt: entry.windowStart + config.windowMs,
  };
}

// =============================================================================
// Pre-configured Rate Limit Profiles
// =============================================================================

/** Rate limits for different operation types */
export const RATE_LIMITS = {
  /** Standard mutations: 30 requests per minute */
  MUTATION: {
    limit: 30,
    windowMs: 60 * 1000, // 1 minute
  },
  /** Create operations: 10 per minute (more restrictive) */
  CREATE: {
    limit: 10,
    windowMs: 60 * 1000,
  },
  /** Bulk operations: 5 per minute */
  BULK: {
    limit: 5,
    windowMs: 60 * 1000,
  },
  /** Archive/delete operations: 20 per minute */
  DELETE: {
    limit: 20,
    windowMs: 60 * 1000,
  },
} as const;

/**
 * Helper to create rate limit key for a user action
 */
export function createRateLimitKey(
  userId: string,
  action: string
): string {
  return `${userId}:${action}`;
}
