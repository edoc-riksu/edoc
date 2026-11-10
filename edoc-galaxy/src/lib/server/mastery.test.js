import { describe, it, expect } from "vitest";
import { masterySummary, MASTERED_AT } from "./mastery";

const row = (concept, solved, total) => ({ concept, solved, total, mastery: Math.round((solved / total) * 100) / 100 });

describe("masterySummary", () => {
  it("groups concepts into mastered, learning and not started", () => {
    const s = masterySummary([row("loops", 5, 6), row("arithmetic", 1, 4), row("conditionals", 0, 5), row("input-output", 4, 5)]);
    expect(s.levels).toEqual({
      mastered: ["loops", "input-output"],
      learning: ["arithmetic"],
      notStarted: ["conditionals"]
    });
    expect(s.masteredAt).toBe(MASTERED_AT);
    expect(s.overall).toBe(0.5); // 10 of 20 concept tags
  });

  it("names the strongest and the weakest started concept, with stable ties", () => {
    const s = masterySummary([row("b", 1, 2), row("a", 1, 2), row("c", 2, 2), row("d", 0, 3)]);
    expect(s.strongest).toBe("c");
    expect(s.weakest).toBe("b"); // a and b tie; sorted by name, b comes last
  });

  it("has no weakest with fewer than two started concepts, and handles no data", () => {
    expect(masterySummary([row("loops", 1, 2), row("x", 0, 1)])).toMatchObject({ strongest: "loops", weakest: null });
    expect(masterySummary([])).toEqual({
      overall: 0,
      masteredAt: MASTERED_AT,
      levels: { mastered: [], learning: [], notStarted: [] },
      strongest: null,
      weakest: null
    });
  });
});
