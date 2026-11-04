import { describe, expect, it } from "vitest";
import { findContinueTarget } from "./moduleResume";

describe("findContinueTarget", () => {
  it("returns null with no modules", () => {
    expect(findContinueTarget([])).toBeNull();
    expect(findContinueTarget(undefined)).toBeNull();
  });

  it("returns the first unsolved encounter in the first incomplete module", () => {
    const modules = [
      {
        slug: "python-basics",
        title: "Python Basics",
        encounters: [
          { id: "py-001", title: "Sum of Two Integers", solved: true },
          { id: "py-002", title: "Print Numbers 1 to N", solved: false },
          { id: "py-003", title: "Even or Odd", solved: false }
        ]
      }
    ];
    expect(findContinueTarget(modules)).toEqual({
      moduleSlug: "python-basics",
      moduleTitle: "Python Basics",
      encounterId: "py-002",
      encounterTitle: "Print Numbers 1 to N"
    });
  });

  it("skips a fully solved module to find the next one with work left", () => {
    const modules = [
      {
        slug: "python-basics",
        title: "Python Basics",
        encounters: [{ id: "py-001", title: "Sum of Two Integers", solved: true }]
      },
      {
        slug: "python-loops",
        title: "Python Loops",
        encounters: [{ id: "py-010", title: "Prime Check", solved: false }]
      }
    ];
    expect(findContinueTarget(modules)?.encounterId).toBe("py-010");
  });

  it("returns null once every encounter in every module is solved", () => {
    const modules = [
      {
        slug: "python-basics",
        title: "Python Basics",
        encounters: [{ id: "py-001", title: "Sum of Two Integers", solved: true }]
      }
    ];
    expect(findContinueTarget(modules)).toBeNull();
  });
});
