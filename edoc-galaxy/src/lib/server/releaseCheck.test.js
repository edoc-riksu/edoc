import { describe, it, expect } from "vitest";
import { formatResults, overall, runReleaseCheck } from "./releaseCheck.mjs";

// Plan Days 51, 53, 54: release check against a fake site.

const html = "<!DOCTYPE html><html><body>edoc</body></html>";

function fakeSite(overrides = {}) {
  const routes = {
    "GET /api/health": [200, { status: "ok", env: "production", checks: { env: "ok", database: "ok" }, databaseMs: 40 }],
    "GET /api/planets": [200, { planets: [{ planetId: "python", moduleCount: 5 }] }],
    "GET /api/modules?planet=python": [200, { modules: [10, 10, 10, 10, 8].map((n, i) => ({ slug: `m${i}`, encounterCount: n })) }],
    "GET /api/encounters/py-001": [200, { encounter: { id: "py-001" } }],
    "GET /": [200, html],
    "GET /signin": [200, html],
    "GET /signup": [200, html],
    "GET /api/auth/me": [401, { error: "Not signed in." }],
    "GET /api/auth/signup": [200, { inviteOnly: true }],
    "POST /api/auth/signup": [422, { fields: { invite: "That invite code isn't valid." } }],
    "GET /api/admin/metrics": [401, { error: "unauthorized" }],
    "GET /art": [404, html],
    "GET exec/health": [200, { status: "ok" }],
    "POST exec/api/v1/submissions": [200, { verdict: "ACCEPTED" }],
    ...overrides
  };
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const isExec = url.startsWith("https://exec.test");
    const path = url.replace(/^https:\/\/(site|exec)\.test/, "") || "/";
    const key = `${init.method || "GET"} ${isExec ? "exec" : ""}${path}`;
    calls.push({ key, body: init.body });
    if (!(key in routes)) return new Response("not found", { status: 404 });
    const [status, body] = routes[key];
    if (status === 0) throw new Error("connect ECONNREFUSED");
    return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
  };
  return { fetchImpl, calls };
}

const run = (site, extra = {}) =>
  runReleaseCheck({ baseUrl: "https://site.test/", executionUrl: "https://exec.test", fetchImpl: site.fetchImpl, ...extra });

const byName = (results) => Object.fromEntries(results.map((r) => [r.name, r]));

describe("runReleaseCheck", () => {
  it("passes a healthy, seeded, invite-only production site", async () => {
    const results = await run(fakeSite());
    expect(results.filter((r) => r.status !== "pass")).toEqual([]);
    expect(overall(results)).toBe("pass");
    expect(results.length).toBe(13);
  });

  it("fails a stale seed (staging on 27 November: 3 encounters in 1 module)", async () => {
    const site = fakeSite({ "GET /api/modules?planet=python": [200, { modules: [{ slug: "python-basics", encounterCount: 3 }] }] });
    const r = byName(await run(site)).content;
    expect(r.status).toBe("fail");
    expect(r.detail).toMatch(/3 encounters in 1 module.*db:seed/);
  });

  it("fails when the site serves the wrong environment or its database is down", async () => {
    expect(byName(await run(fakeSite({ "GET /api/health": [200, { status: "ok", env: "staging", checks: {} }] })))).toHaveProperty("health.status", "fail");
    expect(byName(await run(fakeSite({ "GET /api/health": [503, { status: "error", message: "Database unreachable." }] })))).toHaveProperty("health.status", "fail");
  });

  it("only warns when the health check predates the database check", async () => {
    const r = byName(await run(fakeSite({ "GET /api/health": [200, { status: "ok", env: "production" }] }))).health;
    expect(r.status).toBe("warn");
  });

  it("fails production when the invite gate is missing, off, or lets a made-up invite through", async () => {
    expect(byName(await run(fakeSite({ "GET /api/auth/signup": [405, ""] }))))
      .toHaveProperty("invite gate.status", "fail");
    expect(byName(await run(fakeSite({ "GET /api/auth/signup": [200, { inviteOnly: false }] }))))
      .toHaveProperty("invite gate.status", "fail");
    expect(byName(await run(fakeSite({ "POST /api/auth/signup": [201, { user: {} }] }))))
      .toHaveProperty("invite gate.status", "fail");
  });

  it("expects an open sign-up on staging when told so, and doesn't probe it", async () => {
    const site = fakeSite({ "GET /api/auth/signup": [200, { inviteOnly: false }] });
    const results = await run(site, { expect: { inviteOnly: false, env: "production" } });
    expect(byName(results)["invite gate"].status).toBe("pass");
    expect(site.calls.some((c) => c.key === "POST /api/auth/signup")).toBe(false);
  });

  it("probes the gate with a made-up invite and an unroutable email", async () => {
    const site = fakeSite();
    await run(site);
    const probe = JSON.parse(site.calls.find((c) => c.key === "POST /api/auth/signup").body);
    expect(probe.invite).toBe("EDOC-AAAA-AAAA-AAAA");
    expect(probe.email).toMatch(/@example\.invalid$/);
  });

  it("fails when metrics answer without a token or signed-out requests aren't refused", async () => {
    const r = byName(await run(fakeSite({ "GET /api/admin/metrics": [200, {}], "GET /api/auth/me": [500, {}] })));
    expect(r["metrics locked"].status).toBe("fail");
    expect(r["signed-out guard"].status).toBe("fail");
  });

  it("explains a judging service that can't run Python", async () => {
    const r = byName(await run(fakeSite({ "POST exec/api/v1/submissions": [200, { verdict: "SYSTEM_ERROR" }] })));
    expect(r["execution judges"].status).toBe("fail");
    expect(r["execution judges"].detail).toMatch(/Piston/);
  });

  it("reports an unreachable site instead of throwing", async () => {
    const results = await runReleaseCheck({ baseUrl: "https://site.test", fetchImpl: async () => { throw new Error("getaddrinfo ENOTFOUND"); } });
    expect(overall(results)).toBe("fail");
    expect(results[0].detail).toMatch(/no answer: getaddrinfo ENOTFOUND/);
  });

  it("turns a slow pass into a warning", async () => {
    let t = 0;
    const now = () => (t += 2000);
    const results = await run(fakeSite(), { now });
    expect(results.some((r) => r.status === "warn" && /slow/.test(r.detail))).toBe(true);
  });

  it("skips the judging service when no URL is given", async () => {
    const results = await runReleaseCheck({ baseUrl: "https://site.test", fetchImpl: fakeSite().fetchImpl });
    expect(results.some((r) => r.name.startsWith("execution"))).toBe(false);
  });
});

describe("formatResults", () => {
  it("prints one aligned line per check", () => {
    const text = formatResults([
      { name: "health", status: "pass", detail: "ok", ms: 120 },
      { name: "content", status: "fail", detail: "3 encounters", ms: 2400 }
    ]);
    expect(text.split("\n")).toEqual(["PASS  health     120 ms  ok", "FAIL  content   2400 ms  3 encounters"]);
  });
});
