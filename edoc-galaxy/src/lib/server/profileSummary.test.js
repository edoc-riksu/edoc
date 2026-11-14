import { describe, it, expect } from "vitest";
import { moduleProgress, starTotals, recentAttempts } from "./profileSummary";

const mod = (slug, ids) => ({ slug, planetId: "python", title: slug, encounters: ids.map((id) => ({ id })) });

describe("moduleProgress", () => {
  it("counts solved encounters per module and adds the completion date", () => {
    const done = new Date("2026-11-12T10:00:00Z");
    const rows = moduleProgress(
      [mod("basics", ["a", "b"]), mod("loops", ["c", "d", "e"]), mod("empty", [])],
      new Set(["a", "b", "c", "zz"]),
      [{ moduleSlug: "basics", completedAt: done }]
    );
    expect(rows).toEqual([
      { slug: "basics", planetId: "python", title: "basics", solved: 2, total: 2, complete: true, completedAt: done },
      { slug: "loops", planetId: "python", title: "loops", solved: 1, total: 3, complete: false, completedAt: null },
      { slug: "empty", planetId: "python", title: "empty", solved: 0, total: 0, complete: false, completedAt: null }
    ]);
  });
});

describe("starTotals", () => {
  it("adds the best rating per encounter, out of 3 per encounter", () => {
    const totals = starTotals(
      [
        { encounterId: "a", stars: 1 },
        { encounterId: "a", stars: 3 }, // a retry raised it
        { encounterId: "a", stars: 2 },
        { encounterId: "b", stars: 0 },
        { encounterId: "c", stars: null } // saved before ratings were recorded
      ],
      10
    );
    expect(totals).toEqual({ earned: 3, possible: 30 });
  });

  it("is zero with no rated attempts", () => {
    expect(starTotals([], 4)).toEqual({ earned: 0, possible: 12 });
  });
});

describe("recentAttempts", () => {
  it("lists the newest first with titles, up to the limit", () => {
    const at = (m) => new Date(Date.UTC(2026, 10, 14, 12, m));
    const list = recentAttempts(
      [
        { encounterId: "a", verdict: "WRONG_ANSWER", stars: 0, createdAt: at(1) },
        { encounterId: "b", verdict: "ACCEPTED", stars: 3, createdAt: at(5) },
        { encounterId: "x", verdict: "ACCEPTED", stars: null, createdAt: at(3) }
      ],
      new Map([["a", "Sum"], ["b", "Loops"]]),
      2
    );
    expect(list).toEqual([
      { encounterId: "b", title: "Loops", verdict: "ACCEPTED", stars: 3, createdAt: at(5) },
      { encounterId: "x", title: null, verdict: "ACCEPTED", stars: null, createdAt: at(3) }
    ]);
  });
});
