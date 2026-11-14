// Fixed-window counter, in-memory. Only correct inside one process: under
// concurrent load Vercel runs several instances, each with its own counts
// (DEPLOYMENT.md section 9). Routes use sharedRateLimit() below; this stays
// as its fallback when the database can't be reached.
const buckets = new Map();

export function rateLimit(key, { limit, windowMs }) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (bucket.count < limit) {
    bucket.count += 1;
    return { allowed: true, retryAfterMs: 0 };
  }

  return { allowed: false, retryAfterMs: bucket.resetAt - now };
}

// How often a call also deletes long-expired counters (1 in N calls).
const CLEANUP_EVERY = 200;

/**
 * Plan Day 37: the same fixed-window limit, counted in Postgres
 * (rate_limit_buckets) so every server instance shares one count. One atomic
 * statement per call: it starts a new window if the old one has ended,
 * otherwise adds one, and returns the count and the time left. The database
 * clock decides the window, so instances with skewed clocks still agree.
 *
 * If the database fails, this falls back to the in-memory counter: limits
 * still apply per instance, and a database blip never locks everyone out.
 */
export async function sharedRateLimit(key, { limit, windowMs }, deps = {}) {
  try {
    const client = deps.db || (await import("../db")).db;
    const rows = await client.$queryRaw`
      INSERT INTO "rate_limit_buckets" ("key", "count", "resetAt")
      VALUES (${key}, 1, NOW() + (${windowMs}::double precision * INTERVAL '1 millisecond'))
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "rate_limit_buckets"."resetAt" <= NOW() THEN 1
                       ELSE "rate_limit_buckets"."count" + 1 END,
        "resetAt" = CASE WHEN "rate_limit_buckets"."resetAt" <= NOW() THEN EXCLUDED."resetAt"
                         ELSE "rate_limit_buckets"."resetAt" END
      RETURNING "count", (EXTRACT(EPOCH FROM ("resetAt" - NOW())) * 1000)::double precision AS "msLeft"`;

    if ((deps.random || Math.random)() * CLEANUP_EVERY < 1) {
      client.$executeRaw`DELETE FROM "rate_limit_buckets" WHERE "resetAt" < NOW() - INTERVAL '1 day'`.catch(() => {});
    }
    return decide(rows[0], limit);
  } catch (error) {
    console.error("sharedRateLimit: database unavailable, using the per-instance counter:", error?.message || error);
    return rateLimit(key, { limit, windowMs });
  }
}

/** Allowed while the count in this window is at most `limit`. */
export function decide(row, limit) {
  const count = Number(row?.count ?? 0);
  if (count <= limit) return { allowed: true, retryAfterMs: 0 };
  return { allowed: false, retryAfterMs: Math.max(0, Math.ceil(Number(row?.msLeft ?? 0))) };
}

export function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}
