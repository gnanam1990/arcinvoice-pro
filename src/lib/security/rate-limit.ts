/**
 * Simple in-memory sliding-window rate limiter for public endpoints.
 * Suitable for single-process / dev; replace with Redis for multi-instance prod.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

export function rateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
}): RateLimitResult {
  const now = input.now ?? Date.now();
  const existing = buckets.get(input.key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(input.key, { count: 1, resetAt: now + input.windowMs });
    return {
      allowed: true,
      remaining: input.limit - 1,
      retryAfterMs: 0,
    };
  }

  if (existing.count >= input.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, existing.resetAt - now),
    };
  }

  existing.count += 1;
  buckets.set(input.key, existing);
  return {
    allowed: true,
    remaining: input.limit - existing.count,
    retryAfterMs: 0,
  };
}

/** Test helper — clears all buckets. */
export function resetRateLimitStore() {
  buckets.clear();
}

export const PUBLIC_INVOICE_RATE_LIMIT = {
  limit: 60,
  windowMs: 60_000,
} as const;
