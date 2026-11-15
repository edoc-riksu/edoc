import { describe, it, expect } from "vitest";
import { moduleClearedProps, backdropFor, MODULE_CLEARED_MOCK } from "./moduleProps";
import { lampCount, lampTimes } from "../../art/medal";

describe("moduleClearedProps", () => {
  it("turns the mock into scene props", () => {
    const p = moduleClearedProps(MODULE_CLEARED_MOCK);
    expect(p).toMatchObject({ moduleName: "Python Basics", planetName: "Python", cleared: 10, total: 10, nextLabel: "Next: Loops" });
    expect(p.reward).toBe("New suit unlocked: Starfarer set");
  });

  it("uses the module map's painting for a planet that has one", () => {
    expect(moduleClearedProps(MODULE_CLEARED_MOCK).backdrop).toBe("/art/modules/python-surface.jpg");
    expect(backdropFor("python")).toBe("/art/modules/python-surface.jpg");
    expect(backdropFor("somewhere-else")).toBeUndefined();
    expect(backdropFor("toString")).toBeUndefined();
    expect(moduleClearedProps({ module: { title: "x" } }).backdrop).toBeUndefined();
  });

  it("goes back to the map when there is no next module", () => {
    expect(moduleClearedProps({ module: { title: "Loops", encounterCount: 10 } }).nextLabel).toBe("Back to the module map");
    expect(moduleClearedProps({ module: { title: "Loops" }, nextTitle: "   " }).nextLabel).toBe("Back to the module map");
  });

  it("takes the total from the module and counts every encounter as cleared by default", () => {
    const p = moduleClearedProps({ module: { title: "Strings", encounterCount: 7 } });
    expect(p.total).toBe(7);
    expect(p.cleared).toBe(7);
  });

  it("never shows more cleared than there are encounters", () => {
    expect(moduleClearedProps({ module: { title: "x" }, cleared: 12, total: 10 }).cleared).toBe(10);
  });

  it("copes with missing or odd input", () => {
    expect(moduleClearedProps().moduleName).toBe("This module");
    expect(moduleClearedProps({ module: { title: "x" }, total: "nope" }).total).toBe(0);
    expect(moduleClearedProps({ module: { title: "x" }, reward: "  " }).reward).toBeUndefined();
  });
});

describe("the lamp ring", () => {
  it("draws one lamp per encounter, between 3 and 24", () => {
    expect(lampCount(10)).toBe(10);
    expect(lampCount(1)).toBe(3);
    expect(lampCount(99)).toBe(24);
    expect(lampCount(undefined)).toBe(3);
    expect(lampCount("12")).toBe(12);
  });

  it("lights the lamps in order and finishes within a couple of seconds", () => {
    for (const n of [3, 10, 24]) {
      const T = lampTimes(n);
      for (let i = 1; i < n; i++) expect(T.at(i)).toBeGreaterThan(T.at(i - 1));
      expect(T.done).toBeGreaterThan(T.at(n - 1));
      expect(T.done).toBeLessThan(2.6);
    }
  });
});
