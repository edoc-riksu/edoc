// Fixed-window counter, in-memory. Only correct inside one process: under
// concurrent load Vercel runs several instances, each with its own counts
// (DEPLOYMENT.md section 9). Routes use sharedRateLimit() below; this stays
// as its fallback when the database can't be reached.
import { createHash } from "node:crypto";

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
  const stored = storedKey(key);
  try {
    const client = deps.db || (await import("../db")).db;
    const rows = await client.$queryRaw`
      INSERT INTO "rate_limit_buckets" ("key", "count", "resetAt")
      VALUES (${stored}, 1, NOW() + (${windowMs}::double precision * INTERVAL '1 millisecond'))
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
    return rateLimit(stored, { limit, windowMs });
  }
}

/**
 * Plan Day 43: keys hold emails and IP addresses, so only the part before the
 * first ":" (the kind of limit, e.g. "signin-account") is stored as written;
 * the rest is replaced by a hash. The table then holds no personal data, and
 * the same input still always lands in the same counter.
 */
export function storedKey(key) {
  const cut = key.indexOf(":");
  if (cut < 0) return key;
  const digest = createHash("sha256").update(key.slice(cut + 1)).digest("base64url").slice(0, 32);
  return `${key.slice(0, cut)}:${digest}`;
}

/**
 * Checks several limits for one request, in order, and stops at the first
 * one that is used up. Every limit that is checked counts the request. A
 * block is logged with the limit's kind only (never the email or IP), so
 * monitoring can count abuse by kind (MONITORING.md).
 * `limits` is a list of { key, limit, windowMs }.
 */
export async function checkLimits(limits, deps = {}) {
  for (const { key, limit, windowMs } of limits) {
    const result = await sharedRateLimit(key, { limit, windowMs }, deps);
    if (!result.allowed) {
      const scope = key.split(":")[0];
      (deps.log || defaultLog)("rate limited", { scope, retryAfterMs: result.retryAfterMs });
      return { ...result, scope };
    }
  }
  return { allowed: true, retryAfterMs: 0, scope: null };
}

function defaultLog(message, meta) {
  console.warn(JSON.stringify({ level: "warn", message, time: new Date().toISOString(), ...meta }));
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
