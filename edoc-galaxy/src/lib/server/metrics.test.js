import { describe, it, expect } from "vitest";
import { collectMetrics, isAuthorized } from "./metrics";

describe("isAuthorized", () => {
  it("accepts only the exact token, with or without the Bearer prefix", () => {
    expect(isAuthorized("Bearer s3cret-token", "s3cret-token")).toBe(true);
    expect(isAuthorized("s3cret-token", "s3cret-token")).toBe(true);
    expect(isAuthorized("Bearer s3cret-tokeN", "s3cret-token")).toBe(false);
    expect(isAuthorized("Bearer s3cret", "s3cret-token")).toBe(false);
    expect(isAuthorized(null, "s3cret-token")).toBe(false);
  });

  it("is always false when no token is configured", () => {
    expect(isAuthorized("Bearer ", "")).toBe(false);
    expect(isAuthorized("Bearer anything", undefined)).toBe(false);
  });
});

describe("collectMetrics", () => {
  const NOW = Date.UTC(2026, 10, 15, 12, 0);

  function fakeDb() {
    const calls = { userWhere: [] };
    return {
      calls,
      user: {
        count: async (args) => {
          calls.userWhere.push(args?.where?.createdAt?.gte ?? null);
          return args ? (args.where.createdAt.gte.getTime() === NOW - 86_400_000 ? 3 : 9) : 120;
        }
      },
      attempt: {
        count: async () => 640,
        groupBy: async () => [
          { verdict: "ACCEPTED", _count: { _all: 30 } },
          { verdict: "WRONG_ANSWER", _count: { _all: 18 } },
          { verdict: "RUNTIME_ERROR", _count: { _all: 2 } }
        ]
      },
      $queryRaw: async (strings) =>
        strings.join("").includes("percentile_cont")
          ? [{ players: 14, p50: 41.6, p95: 212.2, max: 1980 }]
          : [{ players: 37 }]
    };
  }

  it("summarises players, submissions and sandbox time", async () => {
    const db = fakeDb();
    const m = await collectMetrics(db, { now: () => NOW });
    expect(m).toEqual({
      generatedAt: "2026-11-15T12:00:00.000Z",
      users: { total: 120, new24h: 3, new7d: 9 },
      activePlayers: { last24h: 14, last7d: 37 },
      submissions: {
        last24h: 50,
        last7d: 640,
        byVerdict24h: { ACCEPTED: 30, WRONG_ANSWER: 18, RUNTIME_ERROR: 2 },
        acceptedShare24h: 0.6
      },
      sandboxRuntimeMs24h: { p50: 42, p95: 212, max: 1980 },
      databaseMs: 0
    });
  });

  it("handles a quiet day with no submissions", async () => {
    const db = fakeDb();
    db.attempt.groupBy = async () => [];
    db.attempt.count = async () => 0;
    db.$queryRaw = async (strings) =>
      strings.join("").includes("percentile_cont") ? [{ players: 0, p50: null, p95: null, max: null }] : [{ players: 0 }];
    const m = await collectMetrics(db, { now: () => NOW });
    expect(m.submissions).toEqual({ last24h: 0, last7d: 0, byVerdict24h: {}, acceptedShare24h: null });
    expect(m.sandboxRuntimeMs24h).toEqual({ p50: null, p95: null, max: null });
  });
});
