/**
 * 🚦 RATE LIMITING — a minimal in-memory fixed-window limiter, scoped to
 * this one Node process. That's a real limitation worth naming plainly:
 * it resets on every restart and isn't shared across server instances, so
 * a horizontally-scaled deployment needs a shared store (Redis) instead —
 * the same single-process ceiling `userStore.js`'s JSON file already has.
 * For one running server it genuinely throttles brute-force attempts.
 */
const buckets = new Map();

export function rateLimit(key, { limit, windowMs }) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  if (bucket.count >= limit) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now };
  }
  bucket.count += 1;
  return { allowed: true };
}

// Periodic sweep so long-lived processes don't accumulate expired entries.
const sweep = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}, 10 * 60 * 1000);
sweep.unref?.();

/** Best-effort client IP from standard proxy headers (set by Vercel/most hosts in production). */
export function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}
