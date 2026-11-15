// Plan Day 46. A small load test with no dependencies: sends a fixed number
// of GET requests per route at each concurrency level and reports latency
// and errors. Read-only routes by default, so it is safe to run on staging.
//
//   node scripts/load-test.mjs --url https://edoc-drab.vercel.app
//   node scripts/load-test.mjs --url ... --levels 10,25,50 --requests 60
//   node scripts/load-test.mjs --url ... --signin-burst 15
//
// --signin-burst N sends N sign-ins at once for an address that has no
// account, to check that the rate limit holds under concurrency: with a
// shared limiter only 8 of them may get past it (the rest get 429).
// Results and how to read them: MONITORING.md.

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => {
    if (arg.startsWith("--")) pairs.push([arg.slice(2), all[i + 1]?.startsWith("--") ? true : all[i + 1] ?? true]);
    return pairs;
  }, [])
);

const base = String(args.url || "").replace(/\/$/, "");
if (!base) {
  console.error("Usage: node scripts/load-test.mjs --url <site> [--levels 10,25,50] [--requests 60] [--signin-burst 15]");
  process.exit(2);
}
const levels = String(args.levels || "10,25,50").split(",").map(Number);
const perRoute = Number(args.requests || 60);
const routes = String(
  args.routes || "/api/health,/api/planets,/api/modules?planet=python,/api/modules/python-basics,/api/encounters/py-001"
).split(",");

export function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const i = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, i)];
}

async function timed(url, init) {
  const started = performance.now();
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
    await res.arrayBuffer();
    return { ms: performance.now() - started, status: res.status };
  } catch (error) {
    return { ms: performance.now() - started, status: error?.name === "TimeoutError" ? "timeout" : "error" };
  }
}

async function runPool(total, concurrency, task) {
  const results = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, total) }, async () => {
      while (next < total) {
        next += 1;
        results.push(await task());
      }
    })
  );
  return results;
}

function summarise(results) {
  const ms = results.map((r) => r.ms).sort((a, b) => a - b);
  const statuses = {};
  for (const r of results) statuses[r.status] = (statuses[r.status] || 0) + 1;
  const ok = results.filter((r) => typeof r.status === "number" && r.status < 400).length;
  return {
    ok,
    failed: results.length - ok,
    statuses,
    p50: Math.round(percentile(ms, 50)),
    p95: Math.round(percentile(ms, 95)),
    p99: Math.round(percentile(ms, 99)),
    max: Math.round(ms[ms.length - 1])
  };
}

console.log(`Load test of ${base}, ${perRoute} requests per route per level, ${new Date().toISOString()}\n`);
// One warm-up request per route, so cold starts don't dominate the first level.
for (const route of routes) await timed(base + route);

for (const level of levels) {
  console.log(`Concurrency ${level}`);
  const started = performance.now();
  let total = 0;
  for (const route of routes) {
    const results = await runPool(perRoute, level, () => timed(base + route));
    total += results.length;
    const s = summarise(results);
    const statusText = Object.entries(s.statuses).map(([k, v]) => `${k}x${v}`).join(" ");
    console.log(`  ${route.padEnd(30)} ok ${String(s.ok).padStart(3)}  failed ${String(s.failed).padStart(3)}  p50 ${String(s.p50).padStart(5)} ms  p95 ${String(s.p95).padStart(5)} ms  p99 ${String(s.p99).padStart(5)} ms  max ${String(s.max).padStart(5)} ms  [${statusText}]`);
  }
  const seconds = (performance.now() - started) / 1000;
  console.log(`  ${total} requests in ${seconds.toFixed(1)} s (${(total / seconds).toFixed(1)} per second)\n`);
}

if (args["signin-burst"]) {
  const n = Number(args["signin-burst"]);
  const email = `loadtest-${Date.now()}@example.invalid`;
  const results = await Promise.all(
    Array.from({ length: n }, () =>
      timed(`${base}/api/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "not-a-real-password" })
      })
    )
  );
  const s = summarise(results);
  const limited = s.statuses[429] || 0;
  console.log(`Sign-in burst: ${n} at once for an address with no account`);
  console.log(`  ${Object.entries(s.statuses).map(([k, v]) => `${k}x${v}`).join(" ")}`);
  console.log(`  ${n - limited} got past the limit (8 allowed per 10 minutes): ${n - limited <= 8 ? "limit held" : "LIMIT DID NOT HOLD"}`);
}
