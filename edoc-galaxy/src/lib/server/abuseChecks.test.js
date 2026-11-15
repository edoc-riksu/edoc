import { describe, it, expect, vi } from "vitest";
import { readJsonBody } from "./requestBody";
import { checkLimits, storedKey } from "./rateLimit";
import { BODY_LIMITS, DAILY_SUBMISSION_LIMIT, LIMITS, tooManyRequests } from "./abuseLimits";

// Plan Day 43: rate limits and abuse checks.

const req = (text, headers = {}) => new Request("http://x/api", { method: "POST", body: text, headers });

describe("readJsonBody", () => {
  it("parses a normal body", async () => {
    expect(await readJsonBody(req('{"a":1}'), { maxBytes: 100 })).toEqual({ ok: true, body: { a: 1 } });
  });

  it("turns away a broken body with 400 instead of throwing", async () => {
    expect(await readJsonBody(req("{not json"), { maxBytes: 100 })).toMatchObject({ ok: false, status: 400 });
    expect(await readJsonBody(req(""), { maxBytes: 100 })).toMatchObject({ ok: false, status: 400 });
  });

  it("turns away a body over the cap with 413, by header or by actual size", async () => {
    expect(await readJsonBody(req("{}", { "content-length": "5000" }), { maxBytes: 100 })).toMatchObject({ ok: false, status: 413 });
    const big = JSON.stringify({ code: "x".repeat(500) });
    expect(await readJsonBody(req(big), { maxBytes: 100 })).toMatchObject({ ok: false, status: 413 });
  });

  it("counts bytes, not characters", async () => {
    const text = JSON.stringify({ s: "é".repeat(60) }); // ~128 bytes, ~68 characters
    expect(await readJsonBody(req(text), { maxBytes: 100 })).toMatchObject({ ok: false, status: 413 });
  });
});

describe("storedKey", () => {
  it("keeps the kind of limit readable and hashes the personal part", () => {
    const key = storedKey("signin-account:pilot@example.com");
    expect(key.startsWith("signin-account:")).toBe(true);
    expect(key).not.toContain("pilot");
    expect(key).not.toContain("example.com");
    expect(storedKey("signin-account:pilot@example.com")).toBe(key); // same input, same counter
    expect(storedKey("signin-account:other@example.com")).not.toBe(key);
  });

  it("hides IP addresses in compound keys too", () => {
    expect(storedKey("signin:203.0.113.9:pilot@example.com")).not.toMatch(/203\.0\.113\.9|pilot/);
  });
});

/** A fake database that counts like the real SQL (one fixed window per key). */
function fakeDb() {
  const rows = new Map();
  return {
    keys: rows,
    $queryRaw(strings, ...values) {
      const [key] = values;
      const count = (rows.get(key) || 0) + 1;
      rows.set(key, count);
      return Promise.resolve([{ count, msLeft: 1000 }]);
    },
    $executeRaw: () => Promise.resolve(0)
  };
}

describe("checkLimits", () => {
  it("stops at the first limit that is used up and names its kind", async () => {
    const db = fakeDb();
    const log = vi.fn();
    const limits = [
      { key: "a:1", limit: 5, windowMs: 1000 },
      { key: "b:1", limit: 2, windowMs: 1000 }
    ];
    const results = [];
    for (let i = 0; i < 3; i++) results.push(await checkLimits(limits, { db, log, random: () => 0.5 }));
    expect(results.map((r) => r.allowed)).toEqual([true, true, false]);
    expect(results[2].scope).toBe("b");
    expect(log).toHaveBeenCalledWith("rate limited", { scope: "b", retryAfterMs: 1000 });
  });

  it("never writes an email or IP into the store or the log", async () => {
    const db = fakeDb();
    const log = vi.fn();
    const limits = LIMITS.signin({ ip: "198.51.100.7", email: "pilot@example.com" });
    for (let i = 0; i < 10; i++) await checkLimits(limits, { db, log, random: () => 0.5 });
    const stored = [...db.keys.keys()].join(" ");
    const logged = JSON.stringify(log.mock.calls);
    for (const secret of ["198.51.100.7", "pilot@example.com"]) {
      expect(stored).not.toContain(secret);
      expect(logged).not.toContain(secret);
    }
  });
});

describe("LIMITS", () => {
  it("guards sign-in per IP + email, per account and per IP", () => {
    const kinds = LIMITS.signin({ ip: "1.2.3.4", email: "a@b.c" }).map((l) => l.key.split(":")[0]);
    expect(kinds).toEqual(["signin", "signin-account", "signin-ip"]);
    // Without an email there is no account to count against.
    expect(LIMITS.signin({ ip: "1.2.3.4", email: "" }).map((l) => l.key.split(":")[0])).toEqual(["signin", "signin-ip"]);
  });

  it("keeps the Day 37 submission limits and adds one per IP", () => {
    const sub = LIMITS.submission({ userId: "u1", ip: "1.2.3.4" });
    expect(sub.map((l) => [l.key.split(":")[0], l.limit])).toEqual([
      ["submission", 20],
      ["submission-day", DAILY_SUBMISSION_LIMIT],
      ["submission-ip", 200]
    ]);
  });

  it("caps bodies so an avatar fits but a flood does not", () => {
    expect(BODY_LIMITS.profile).toBeGreaterThan(300_000);
    expect(BODY_LIMITS.submission).toBeGreaterThan(20_000);
    expect(BODY_LIMITS.auth).toBeLessThan(BODY_LIMITS.submission);
  });

  it("tells the player which limit they hit and when to retry", () => {
    expect(tooManyRequests({ scope: "submission-day", retryAfterMs: 1500 })).toEqual({
      status: 429,
      body: { error: "You've reached today's submission limit. It resets within 24 hours.", retryAfter: 2 }
    });
    expect(tooManyRequests({ scope: "unknown", retryAfterMs: 0 }).body.error).toMatch(/Too many attempts/);
  });
});
