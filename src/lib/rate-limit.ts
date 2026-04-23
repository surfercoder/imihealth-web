/**
 * Simple in-memory rate limiter for serverless API routes.
 *
 * Uses a sliding-window counter keyed by user ID.
 * Entries are lazily evicted, so memory stays bounded
 * by the number of active users in any given window.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitEntry>();

// Lazy eviction: purge expired entries periodically
const EVICT_INTERVAL = 60_000;
let lastEvict = Date.now();

function evictExpired() {
  const now = Date.now();
  if (now - lastEvict < EVICT_INTERVAL) return;
  lastEvict = now;
  for (const [key, entry] of buckets) {
    if (now >= entry.resetAt) buckets.delete(key);
  }
}

interface RateLimitOptions {
  /** Unique prefix for this limiter (e.g. "send-email") */
  key: string;
  /** Max requests allowed in the window */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the window resets */
  retryAfter: number;
}

export function checkRateLimit(
  userId: string,
  { key, limit, windowSeconds }: RateLimitOptions,
): RateLimitResult {
  evictExpired();

  const bucketKey = `${key}:${userId}`;
  const now = Date.now();
  const entry = buckets.get(bucketKey);

  if (!entry || now >= entry.resetAt) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, retryAfter: 0 };
  }

  if (entry.count < limit) {
    entry.count++;
    return { allowed: true, retryAfter: 0 };
  }

  const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
  return { allowed: false, retryAfter };
}
