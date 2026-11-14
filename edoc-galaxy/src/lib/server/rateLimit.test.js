import { describe, it, expect, vi } from "vitest";
import { decide, rateLimit, sharedRateLimit } from "./rateLimit";

/** Stands in for Postgres: keeps one count per key in a fixed window, like the SQL does. */
function fakeDb({ fail = false } = {}) {
  const rows = new Map();
  let now = 0;
  return {
    advance: (ms) => (now += ms),
    queries: 0,
    $queryRaw(strings, ...values) {
      this.queries += 1;
      if (fail) return Promise.reject(new Error("Can't reach database server"));
      const [key, windowMs] = values;
      const row = rows.get(key);
      if (!row || row.resetAt <= now) rows.set(key, { count: 1, resetAt: now + windowMs });
      else row.count += 1;
      const r = rows.get(key);
      return Promise.resolve([{ count: r.count, msLeft: r.resetAt - now }]);
    },
    $executeRaw: vi.fn(() => Promise.resolve(0))
  };
}

const opts = { limit: 3, windowMs: 60_000 };

describe("decide", () => {
  it("allows up to the limit and reports the time left after that", () => {
    expect(decide({ count: 3, msLeft: 5000 }, 3)).toEqual({ allowed: true, retryAfterMs: 0 });
    expect(decide({ count: 4, msLeft: 4999.2 }, 3)).toEqual({ allowed: false, retryAfterMs: 5000 });
    expect(decide({ count: 4, msLeft: -3 }, 3).retryAfterMs).toBe(0);
  });
});

describe("sharedRateLimit", () => {
  it("counts in the database and blocks past the limit until the window ends", async () => {
    const db = fakeDb();
    const deps = { db, random: () => 0.5 };
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await sharedRateLimit("k", opts, deps));
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false]);
    expect(results[3].retryAfterMs).toBe(60_000);

    db.advance(60_000);
    expect((await sharedRateLimit("k", opts, deps)).allowed).toBe(true);
  });

  it("shares one count across instances, which the in-memory counter could not", async () => {
    const db = fakeDb();
    // Two "instances" calling at the same time, one shared database.
    const calls = Array.from({ length: 6 }, (_, i) => sharedRateLimit("signin:ip", opts, { db, random: () => 0.5 }));
    const results = await Promise.all(calls);
    expect(results.filter((r) => r.allowed)).toHaveLength(3);
  });

  it("keeps keys apart", async () => {
    const db = fakeDb();
    const deps = { db, random: () => 0.5 };
    for (let i = 0; i < 3; i++) await sharedRateLimit("a", opts, deps);
    expect((await sharedRateLimit("b", opts, deps)).allowed).toBe(true);
  });

  it("falls back to the per-instance counter when the database is down", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const deps = { db: fakeDb({ fail: true }) };
    const key = `fallback-${Math.random()}`;
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await sharedRateLimit(key, opts, deps));
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("deletes long-expired counters now and then, never blocking the call", async () => {
    const db = fakeDb();
    await sharedRateLimit("k", opts, { db, random: () => 0 });
    expect(db.$executeRaw).toHaveBeenCalledTimes(1);
    await sharedRateLimit("k", opts, { db, random: () => 0.9 });
    expect(db.$executeRaw).toHaveBeenCalledTimes(1);
  });
});

describe("rateLimit (in-memory fallback)", () => {
  it("still limits within one process", () => {
    const key = `mem-${Math.random()}`;
    const r = [1, 2, 3, 4].map(() => rateLimit(key, opts).allowed);
    expect(r).toEqual([true, true, true, false]);
  });
});
