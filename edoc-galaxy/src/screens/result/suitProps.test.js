import { describe, it, expect } from "vitest";
import { suitUnlockedProps, SUIT_UNLOCK_MOCK } from "./suitProps";
import { modelsFor } from "./suitModels";

describe("suitUnlockedProps", () => {
  it("turns the mock into scene props", () => {
    const p = suitUnlockedProps(SUIT_UNLOCK_MOCK);
    expect(p.suitName).toBe("Starfarer set");
    expect(p.reason).toBe("You cleared every encounter in Python Basics.");
    expect(p.blurb).toContain("amber");
  });

  it("falls back when the module or the suit has no name", () => {
    const p = suitUnlockedProps({ suit: { id: "x" } });
    expect(p.suitName).toBe("New suit");
    expect(p.reason).toBe("You cleared every encounter in a module.");
    expect(p.blurb).toBeUndefined();
  });

  it("uses the pilot's explorer, or Vega when the hangar does not know it", () => {
    expect(suitUnlockedProps({ ...SUIT_UNLOCK_MOCK, explorer: "mira" })).toMatchObject({ explorerId: "mira", explorerName: "Mira" });
    expect(suitUnlockedProps({ ...SUIT_UNLOCK_MOCK, explorer: "nobody" }).explorerId).toBe("vega");
    expect(suitUnlockedProps(SUIT_UNLOCK_MOCK).explorerId).toBe("vega");
  });

  it("points every explorer at a base and a Starfarer model", () => {
    for (const id of ["vega", "kael", "taro", "mira"]) {
      const m = modelsFor(id);
      expect(m.base).toMatch(/^\/art\/hangar\/models\/avatar-.*\.glb$/);
      expect(m.starfarer).toMatch(/starfarer\.glb$/);
    }
  });

  it("does not throw on nothing at all", () => {
    expect(suitUnlockedProps().suitName).toBe("New suit");
    expect(suitUnlockedProps({ suit: null, moduleName: null }).reason).toMatch(/module/);
  });

  it("trims names and ignores blank text", () => {
    const p = suitUnlockedProps({ suit: { name: "  Ember  ", blurb: "   " }, moduleName: "  Loops " });
    expect(p.suitName).toBe("Ember");
    expect(p.blurb).toBeUndefined();
    expect(p.reason).toBe("You cleared every encounter in Loops.");
  });
});
