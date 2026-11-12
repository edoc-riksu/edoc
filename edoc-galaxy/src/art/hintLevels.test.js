import { describe, it, expect } from "vitest";
import { HINT_LEVELS, levelAt, levelReached } from "./hintLevels";

describe("hint levels", () => {
  it("has three levels in the order they are revealed, numbered 1 to 3", () => {
    expect(HINT_LEVELS.map((l) => l.id)).toEqual([1, 2, 3]);
    expect(HINT_LEVELS.map((l) => l.name)).toEqual(["Nudge", "Clue", "Walkthrough"]);
  });
  it("tells the levels apart by more than colour: pips, icon shape and word all differ", () => {
    expect(new Set(HINT_LEVELS.map((l) => l.color)).size).toBe(3);
    expect(new Set(HINT_LEVELS.map((l) => l.icon)).size).toBe(3);
    expect(HINT_LEVELS.map((l) => l.pips)).toEqual([1, 2, 3]);
  });
  it("keeps each rgb triple in step with its hex colour", () => {
    for (const l of HINT_LEVELS) {
      const [r, g, b] = l.rgb.split(",").map(Number);
      expect(l.color.toLowerCase()).toBe(`#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`);
    }
  });
  it("finds a level by index and by how many hints are revealed", () => {
    expect(levelAt(0).key).toBe("nudge");
    expect(levelAt(3)).toBeNull();
    expect(levelReached(0)).toBeNull();
    expect(levelReached(2).key).toBe("clue");
    expect(levelReached(9).key).toBe("walkthrough");
  });
});
