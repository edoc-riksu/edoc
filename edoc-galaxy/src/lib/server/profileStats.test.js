import { describe, it, expect, vi } from "vitest";

// getProfileStats against a fake database, to check the Day 36 fields are
// wired through end to end.
const at = (m) => new Date(Date.UTC(2026, 10, 14, 12, m));
const attempts = [
  { encounterId: "py-001", verdict: "WRONG_ANSWER", stars: 0, createdAt: at(1), hintsUsed: 1, elapsedMs: 100 },
  { encounterId: "py-001", verdict: "ACCEPTED", stars: 1, createdAt: at(2), hintsUsed: 0, elapsedMs: 200 },
  { encounterId: "py-002", verdict: "ACCEPTED", stars: 3, createdAt: at(3), hintsUsed: 0, elapsedMs: 300 }
];
const modules = [
  { slug: "python-basics", planetId: "python", title: "Python Basics", order: 0, encounters: [{ id: "py-001", title: "Sum" }, { id: "py-002", title: "Loop" }] },
  { slug: "lists", planetId: "python", title: "Lists", order: 1, encounters: [{ id: "py-041", title: "Reverse" }] }
];
const done = at(3);

vi.mock("../db", () => ({
  db: {
    attempt: {
      count: async () => attempts.length,
      findMany: async ({ where, distinct }) => {
        const rows = attempts.filter((a) => !where.verdict || a.verdict === where.verdict);
        if (!distinct) return rows;
        return [...new Map(rows.map((r) => [r.encounterId, r])).values()];
      },
      aggregate: async ({ _sum }) => ({
        _sum: Object.fromEntries(Object.keys(_sum).map((k) => [k, attempts.reduce((s, a) => s + a[k], 0)]))
      })
    },
    progress: { findMany: async () => [{ sectorId: "python", level: 2 }] },
    encounter: {
      findMany: async () => [
        { id: "py-001", concepts: ["input-output"] },
        { id: "py-002", concepts: ["loops"] },
        { id: "py-041", concepts: ["lists"] }
      ]
    },
    completion: {
      count: async () => 1,
      findMany: async () => [{ moduleSlug: "python-basics", completedAt: done }]
    },
    module: { findMany: async () => modules }
  }
}));

describe("getProfileStats", () => {
  it("returns per-module progress, stars and recent attempts with the older fields", async () => {
    const { getProfileStats } = await import("./progressStore");
    const stats = await getProfileStats("u1");

    expect(stats).toMatchObject({ totalAttempts: 3, encountersSolved: 2, firstAttemptRate: 0.5, modulesCompleted: 1 });
    expect(stats.modules).toEqual([
      { slug: "python-basics", planetId: "python", title: "Python Basics", solved: 2, total: 2, complete: true, completedAt: done },
      { slug: "lists", planetId: "python", title: "Lists", solved: 0, total: 1, complete: false, completedAt: null }
    ]);
    expect(stats.stars).toEqual({ earned: 4, possible: 9 });
    expect(stats.recentAttempts.map((a) => [a.encounterId, a.title, a.verdict, a.stars])).toEqual([
      ["py-002", "Loop", "ACCEPTED", 3],
      ["py-001", "Sum", "ACCEPTED", 1],
      ["py-001", "Sum", "WRONG_ANSWER", 0]
    ]);
    expect(stats.mastery.levels.mastered).toEqual(expect.arrayContaining(["input-output", "loops"]));
  });
});
