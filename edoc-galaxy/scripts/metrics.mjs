// Plan Day 44. Prints the platform metrics as a small text dashboard.
//
//   SITE_URL=https://edoc-drab.vercel.app METRICS_TOKEN=... node scripts/metrics.mjs
//
// See MONITORING.md for what normal looks like.

const site = (process.env.SITE_URL || "").replace(/\/$/, "");
const token = process.env.METRICS_TOKEN;
if (!site || !token) {
  console.error("Set SITE_URL and METRICS_TOKEN.");
  process.exit(2);
}

const res = await fetch(`${site}/api/admin/metrics`, {
  headers: { Authorization: `Bearer ${token}` },
  signal: AbortSignal.timeout(20_000)
});
if (!res.ok) {
  console.error(`${res.status} from ${site}/api/admin/metrics${res.status === 404 ? " (METRICS_TOKEN not set there)" : ""}`);
  process.exit(1);
}
const { metrics: m } = await res.json();

const pct = (x) => (x === null ? "-" : `${Math.round(x * 100)}%`);
const rows = [
  ["Players (total / new 24h / new 7d)", `${m.users.total} / ${m.users.new24h} / ${m.users.new7d}`],
  ["Active players (24h / 7d)", `${m.activePlayers.last24h} / ${m.activePlayers.last7d}`],
  ["Submissions (24h / 7d)", `${m.submissions.last24h} / ${m.submissions.last7d}`],
  ["Accepted share (24h)", pct(m.submissions.acceptedShare24h)],
  ...Object.entries(m.submissions.byVerdict24h).map(([verdict, n]) => [`  ${verdict}`, String(n)]),
  ["Sandbox runtime ms (p50 / p95 / max)", `${m.sandboxRuntimeMs24h.p50 ?? "-"} / ${m.sandboxRuntimeMs24h.p95 ?? "-"} / ${m.sandboxRuntimeMs24h.max ?? "-"}`],
  ["Metrics query took", `${m.databaseMs} ms`]
];
const width = Math.max(...rows.map(([k]) => k.length));
console.log(`edoc metrics for ${site} at ${m.generatedAt}\n`);
for (const [k, v] of rows) console.log(`${k.padEnd(width)}  ${v}`);
