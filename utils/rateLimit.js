/** Simple in-memory rate limiter (per IP). */
const buckets = new Map();

export function rateLimit(ip, { maxAttempts = 5, windowMs = 15 * 60 * 1000 } = {}) {
  const key = ip || 'unknown';
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;

  if (bucket.count > maxAttempts) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  return {
    allowed: true,
    remaining: maxAttempts - bucket.count,
  };
}

export function resetRateLimit(ip) {
  buckets.delete(ip || 'unknown');
}
