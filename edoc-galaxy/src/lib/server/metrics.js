import { timingSafeEqual } from "node:crypto";

// Plan Day 44: the numbers the monitoring dashboard needs that no hosting
// dashboard can show, because they live in our own tables: players,
// submissions and how they went, and how long the sandbox takes.
// See MONITORING.md for what normal looks like and when to worry.

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * Only a caller holding METRICS_TOKEN may read the metrics. With no token
 * configured the endpoint is off. Compared in constant time.
 */
export function isAuthorized(authorizationHeader, token) {
  if (!token) return false;
  const given = String(authorizationHeader || "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(given, "utf8");
  const b = Buffer.from(token, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

const share = (part, whole) => (whole === 0 ? null : Math.round((part / whole) * 1000) / 1000);
const ms = (value) => (value === null || value === undefined ? null : Math.round(Number(value)));

/** One snapshot of the platform. `db` is the Prisma client (or a fake in tests). */
export async function collectMetrics(db, { now = () => Date.now() } = {}) {
  const started = now();
  const since24h = new Date(started - DAY);
  const since7d = new Date(started - 7 * DAY);

  const [usersTotal, usersNew24h, usersNew7d, attempts7d, verdicts24h, window24h, players7d] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: since24h } } }),
    db.user.count({ where: { createdAt: { gte: since7d } } }),
    db.attempt.count({ where: { createdAt: { gte: since7d } } }),
    db.attempt.groupBy({ by: ["verdict"], where: { createdAt: { gte: since24h } }, _count: { _all: true } }),
    db.$queryRaw`
      SELECT COUNT(DISTINCT "userId")::int AS "players",
             percentile_cont(0.5) WITHIN GROUP (ORDER BY "runtimeMs") AS "p50",
             percentile_cont(0.95) WITHIN GROUP (ORDER BY "runtimeMs") AS "p95",
             MAX("runtimeMs") AS "max"
      FROM "attempts" WHERE "createdAt" >= ${since24h}`,
    db.$queryRaw`SELECT COUNT(DISTINCT "userId")::int AS "players" FROM "attempts" WHERE "createdAt" >= ${since7d}`
  ]);

  const byVerdict = Object.fromEntries(verdicts24h.map((v) => [v.verdict, v._count._all]));
  const attempts24h = Object.values(byVerdict).reduce((sum, n) => sum + n, 0);
  const runtime = window24h[0] || {};

  return {
    generatedAt: new Date(started).toISOString(),
    users: { total: usersTotal, new24h: usersNew24h, new7d: usersNew7d },
    activePlayers: { last24h: Number(runtime.players ?? 0), last7d: Number(players7d[0]?.players ?? 0) },
    submissions: {
      last24h: attempts24h,
      last7d: attempts7d,
      byVerdict24h: byVerdict,
      acceptedShare24h: share(byVerdict.ACCEPTED || 0, attempts24h)
    },
    // Slowest test per judged submission, as the execution service reports it.
    // SYSTEM_ERROR submissions are not saved, so outages show up as a drop in
    // submissions, not here (watch the execution service's own health check).
    sandboxRuntimeMs24h: { p50: ms(runtime.p50), p95: ms(runtime.p95), max: ms(runtime.max) },
    databaseMs: now() - started
  };
}
