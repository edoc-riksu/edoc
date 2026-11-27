/**
 * Plan Days 51, 53 and 54: checks a deployed edoc site from the outside, the
 * way a tester's browser reaches it. Used after every production deploy, as
 * the Day 54 release check, and in watch mode while testers are playing.
 * Read-only except for one sign-up attempt with a made-up invite (which is
 * turned away, so no account is created) and, with an execution URL, one
 * judged submission of py-001.
 *
 * Each result is { name, status: "pass" | "warn" | "fail", detail, ms }.
 * Network access is passed in (`fetchImpl`) so this is testable.
 */

const SLOW_MS = 3000;

export const DEFAULT_EXPECT = {
  env: "production",
  inviteOnly: true,
  // The plan's Day 60 goal: one planet with 40+ encounters.
  minEncounters: 40
};

// py-001 (Sum of Two Integers), the same smoke test as DEPLOYMENT.md section 10.
const PY001_SOLUTION = "a, b = map(int, input().split())\nprint(a + b)";

export async function runReleaseCheck({ baseUrl, executionUrl, expect = {}, fetchImpl = fetch, now = () => Date.now() }) {
  const want = { ...DEFAULT_EXPECT, ...expect };
  const base = String(baseUrl).replace(/\/+$/, "");
  const results = [];

  async function call(path, init = {}, root = base) {
    const started = now();
    try {
      const res = await fetchImpl(`${root}${path}`, { redirect: "follow", ...init, signal: AbortSignal.timeout(45000) });
      const text = await res.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
      return { status: res.status, json, text, ms: now() - started };
    } catch (error) {
      return { status: 0, json: null, text: "", ms: now() - started, error: error?.message || String(error) };
    }
  }

  function record(name, status, detail, ms) {
    const slow = status === "pass" && ms > SLOW_MS;
    results.push({ name, status: slow ? "warn" : status, detail: slow ? `${detail} (slow: ${ms} ms)` : detail, ms });
  }

  const unreachable = (r) => (r.status === 0 ? `no answer: ${r.error}` : `HTTP ${r.status}`);

  // 1. Health: up, right environment, database reachable.
  const health = await call("/api/health");
  if (health.status !== 200 || health.json?.status !== "ok") {
    record("health", "fail", `${unreachable(health)} ${health.json?.message || ""}`.trim(), health.ms);
  } else if (want.env && health.json.env !== want.env) {
    record("health", "fail", `serving APP_ENV=${health.json.env}, expected ${want.env}`, health.ms);
  } else if (!health.json.checks) {
    record("health", "warn", "up, but this build's health check doesn't test the database yet (PR #87)", health.ms);
  } else if (health.json.checks.database !== "ok") {
    record("health", "fail", "database check failing", health.ms);
  } else {
    record("health", "pass", `ok, env ${health.json.env}, database ${health.json.databaseMs ?? "?"} ms`, health.ms);
  }

  // 2. The galaxy map's planet list.
  const planets = await call("/api/planets");
  const python = planets.json?.planets?.find((p) => p.planetId === "python");
  if (planets.status !== 200) record("planets", "fail", unreachable(planets), planets.ms);
  else if (!python) record("planets", "fail", "no python planet: the database hasn't been seeded", planets.ms);
  else record("planets", "pass", `python planet, ${python.moduleCount} module(s)`, planets.ms);

  // 3. Content: all encounters are in the index (a stale seed shows here).
  const modules = await call("/api/modules?planet=python");
  const list = modules.json?.modules || [];
  const encounters = list.reduce((sum, m) => sum + (Number(m.encounterCount) || 0), 0);
  if (modules.status !== 200) record("content", "fail", unreachable(modules), modules.ms);
  else if (encounters < want.minEncounters) {
    record("content", "fail", `${encounters} encounters in ${list.length} module(s), expected ${want.minEncounters}+: re-run npm run db:seed`, modules.ms);
  } else record("content", "pass", `${encounters} encounters in ${list.length} modules`, modules.ms);

  // 4. One encounter's index entry.
  const encounter = await call("/api/encounters/py-001");
  if (encounter.status === 200 && encounter.json?.encounter?.id === "py-001") record("encounter read", "pass", "py-001", encounter.ms);
  else record("encounter read", "fail", unreachable(encounter), encounter.ms);

  // 5. The pages a new tester opens first.
  for (const page of ["/", "/signin", "/signup"]) {
    const r = await call(page);
    if (r.status === 200 && /<html/i.test(r.text)) record(`page ${page}`, "pass", "renders", r.ms);
    else record(`page ${page}`, "fail", unreachable(r), r.ms);
  }

  // 6. Signed-out requests are refused cleanly, not with a 500.
  const me = await call("/api/auth/me");
  if (me.status === 401) record("signed-out guard", "pass", "/api/auth/me is 401 without a session", me.ms);
  else record("signed-out guard", "fail", `/api/auth/me gave ${unreachable(me)} without a session`, me.ms);

  // 7. The invite gate (plan Day 52).
  const gate = await call("/api/auth/signup");
  if (gate.status !== 200 || typeof gate.json?.inviteOnly !== "boolean") {
    record("invite gate", want.inviteOnly ? "fail" : "warn", "not in this build (PR #117)", gate.ms);
  } else if (gate.json.inviteOnly !== want.inviteOnly) {
    record("invite gate", "fail", `inviteOnly is ${gate.json.inviteOnly}, expected ${want.inviteOnly}: check INVITE_ONLY`, gate.ms);
  } else if (gate.json.inviteOnly) {
    const stamp = now().toString(36);
    const probe = await call("/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        callsign: `Check${stamp}`.slice(0, 16),
        email: `release-check-${stamp}@example.invalid`,
        password: `Release-check-${stamp}-x9`,
        invite: "EDOC-AAAA-AAAA-AAAA"
      })
    });
    if (probe.status === 422 && probe.json?.fields?.invite) record("invite gate", "pass", "on, and a made-up invite is turned away", gate.ms + probe.ms);
    else if (probe.status === 429) record("invite gate", "warn", "on; sign-up rate limit reached, so the probe couldn't run", gate.ms + probe.ms);
    else record("invite gate", "fail", `on, but a made-up invite got HTTP ${probe.status}`, gate.ms + probe.ms);
  } else {
    record("invite gate", "pass", "off, as expected here", gate.ms);
  }

  // 8. Admin metrics are never public.
  const metrics = await call("/api/admin/metrics");
  if (metrics.status === 200) record("metrics locked", "fail", "/api/admin/metrics answered without a token", metrics.ms);
  else record("metrics locked", "pass", `HTTP ${metrics.status} without a token`, metrics.ms);

  // 9. Art review pages stay off the live site (plan Day 57, PR #116).
  const art = await call("/art");
  if (art.status === 404 || want.env !== "production") record("art pages closed", "pass", `/art is HTTP ${art.status}`, art.ms);
  else record("art pages closed", "warn", `/art is HTTP ${art.status} in production`, art.ms);

  // 10. The judging service, if given: up, and judges a known-good answer.
  if (executionUrl) {
    const root = String(executionUrl).replace(/\/+$/, "");
    const eh = await call("/health", {}, root);
    if (eh.status === 200 && eh.json?.status === "ok") record("execution health", "pass", "ok", eh.ms);
    else record("execution health", "fail", unreachable(eh), eh.ms);

    const sub = await call(
      "/api/v1/submissions",
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ encounter_id: "py-001", code: PY001_SOLUTION }) },
      root
    );
    const verdict = sub.json?.verdict;
    if (verdict === "ACCEPTED") record("execution judges", "pass", "py-001 sample answer ACCEPTED", sub.ms);
    else if (verdict === "SYSTEM_ERROR") record("execution judges", "fail", "SYSTEM_ERROR: is Python installed in Piston? (DEPLOYMENT.md section 10, step 5)", sub.ms);
    else record("execution judges", "fail", verdict ? `py-001 sample answer got ${verdict}` : unreachable(sub), sub.ms);
  }

  return results;
}

/** "pass" if everything passed, "warn" if only warnings, otherwise "fail". */
export function overall(results) {
  if (results.some((r) => r.status === "fail")) return "fail";
  if (results.some((r) => r.status === "warn")) return "warn";
  return "pass";
}

export function formatResults(results) {
  const mark = { pass: "PASS", warn: "WARN", fail: "FAIL" };
  const width = Math.max(...results.map((r) => r.name.length));
  return results.map((r) => `${mark[r.status]}  ${r.name.padEnd(width)}  ${String(r.ms).padStart(5)} ms  ${r.detail}`).join("\n");
}
