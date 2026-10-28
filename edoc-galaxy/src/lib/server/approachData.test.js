import { describe, it, expect } from "vitest";
import { loadApproach, summarizeApproach, buildEncounter } from "./approachData";

const row = (id, order, concepts = ["loops"], title = `Title ${id}`) => ({ id, order, difficulty: "easy", concepts, title });
const fakeDb = (modules) => ({ module: { findMany: async () => modules } });
const brokenDb = { module: { findMany: async () => { throw new Error("db down"); } } };
const detail = (id) => ({
  id,
  problem: `Problem for ${id}`,
  starter_code: `# starter ${id}\n`,
  concepts: ["loops"],
  sample_tests: [{ id: "s1", input: "3", expected_output: "1\n2\n3" }]
});
const LOCAL = {
  python: {
    name: "Python",
    course: ["a", "b", "c"],
    encounters: [
      { id: "py-001", title: "Local one", blurb: "local blurb", concept: { id: "loops", name: "loops", note: "n" }, rock: 2, starterCode: "# local", tests: [{ description: "d", input: "1", expectedOutput: "1" }], hints: ["h1", "h2", "h3"], explanation: "ex", solution: "sol" }
    ]
  }
};

describe("loadApproach", () => {
  it("builds the approach from the index and Backend 1, in index order", async () => {
    const db = fakeDb([{ title: "Python Basics", encounters: [row("py-002", 0), row("py-001", 1)] }]);
    const a = await loadApproach("python", { db, local: LOCAL, fetchEncounter: async (id) => detail(id) });
    expect(a.source).toBe("live");
    expect(a.moduleTitle).toBe("Python Basics");
    expect(a.encounters.map((e) => e.id)).toEqual(["py-002", "py-001"]);
    const first = a.encounters[0];
    expect(first.blurb).toBe("Problem for py-002");
    expect(first.starterCode).toBe("# starter py-002\n");
    expect(first.tests[0]).toMatchObject({ input: "3", expectedOutput: "1\n2\n3" });
    expect(first.tests[0].description).toBe("Input 3 should produce 1 ↵ 2 ↵ 3");
    expect(first.concept.name).toBe("loops");
  });

  it("keeps the built-in extras for an encounter it also knows, and the built-in rock", async () => {
    const db = fakeDb([{ title: "x", encounters: [row("py-001", 0)] }]);
    const [e] = (await loadApproach("python", { db, local: LOCAL, fetchEncounter: async (id) => detail(id) })).encounters;
    expect(e.hints).toEqual(["h1", "h2", "h3"]);
    expect(e.solution).toBe("sol");
    expect(e.rock).toBe(2);
    expect(e.blurb).toBe("Problem for py-001");
  });

  it("falls back to the built-in copy of an encounter when Backend 1 is down", async () => {
    const db = fakeDb([{ title: "x", encounters: [row("py-001", 0)] }]);
    const a = await loadApproach("python", { db, local: LOCAL, fetchEncounter: async () => null });
    expect(a.source).toBe("built-in");
    expect(a.encounters[0].blurb).toBe("local blurb");
    expect(a.encounters[0].starterCode).toBe("# local");
  });

  it("drops an encounter nobody can describe, but never reorders the rest", async () => {
    const db = fakeDb([{ title: "x", encounters: [row("py-001", 0), row("py-009", 1), row("py-010", 2)] }]);
    const get = async (id) => (id === "py-010" ? detail(id) : null);
    const a = await loadApproach("python", { db, local: LOCAL, fetchEncounter: get });
    expect(a.encounters.map((e) => e.id)).toEqual(["py-001", "py-010"]);
  });

  it("uses the built-in approach when the database is down", async () => {
    const a = await loadApproach("python", { db: brokenDb, local: LOCAL, fetchEncounter: async () => detail("x") });
    expect(a.source).toBe("built-in");
    expect(a.encounters).toBe(LOCAL.python.encounters);
    expect(a.course).toEqual(["a", "b", "c"]);
  });

  it("works for a planet that only exists in the database, with default captions", async () => {
    const db = fakeDb([{ title: "JS Basics", encounters: [row("js-001", 0), row("js-002", 1)] }]);
    const a = await loadApproach("javascript", { db, local: LOCAL, fetchEncounter: async (id) => detail(id) });
    expect(a.name).toBe("JavaScript");
    expect(a.course[0]).toBe("Setting course for JavaScript…");
    expect(a.encounters.map((e) => e.rock)).toEqual([0, 1]);
    expect(a.encounters[0].hints).toBeUndefined();
  });

  it("returns null for a planet with no approach anywhere, and for the unnamed far planets", async () => {
    expect(await loadApproach("javascript", { db: fakeDb([]), local: LOCAL })).toBeNull();
    expect(await loadApproach("far-1", { db: fakeDb([{ title: "x", encounters: [row("zz-001", 0)] }]), local: LOCAL, fetchEncounter: async (id) => detail(id) })).toBeNull();
  });
});

describe("summarizeApproach", () => {
  it("counts the index without fetching any problem", async () => {
    const db = fakeDb([{ title: "Python Basics", encounters: [row("py-001", 0), row("py-002", 1), row("py-003", 2)] }]);
    expect(await summarizeApproach("python", { db, local: LOCAL })).toMatchObject({ name: "Python", count: 3, course: ["a", "b", "c"] });
  });

  it("counts the built-in encounters when the database is down", async () => {
    expect((await summarizeApproach("python", { db: brokenDb, local: LOCAL })).count).toBe(1);
  });
});

describe("buildEncounter", () => {
  it("returns null with neither a live nor a built-in source", () => {
    expect(buildEncounter(row("x-001", 0), 0, null, undefined)).toBeNull();
  });
});
