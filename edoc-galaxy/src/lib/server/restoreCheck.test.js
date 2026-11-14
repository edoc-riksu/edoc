import { describe, it, expect } from "vitest";
import { compareCounts, TABLES } from "./restoreCheck.mjs";

const all = (n) => Object.fromEntries(TABLES.map((t) => [t, n]));

describe("compareCounts", () => {
  it("passes an identical restore, exact or not", () => {
    expect(compareCounts(all(5), all(5)).ok).toBe(true);
    expect(compareCounts(all(5), all(5), { exact: true }).ok).toBe(true);
  });

  it("allows fewer rows for an earlier restore point, but not with --exact", () => {
    const restored = { ...all(5), attempts: 3 };
    expect(compareCounts(all(5), restored).ok).toBe(true);
    const exact = compareCounts(all(5), restored, { exact: true });
    expect(exact.ok).toBe(false);
    expect(exact.rows.find((r) => r.table === "attempts").status).toBe("fewer rows");
  });

  it("fails when the restore has more rows than its source", () => {
    const result = compareCounts(all(5), { ...all(5), users: 6 });
    expect(result.ok).toBe(false);
    expect(result.rows.find((r) => r.table === "users").status).toBe("more rows than source");
  });

  it("fails when a table is missing from the restore", () => {
    const restored = { ...all(5), progress: null };
    const result = compareCounts(all(5), restored);
    expect(result.ok).toBe(false);
    expect(result.rows.find((r) => r.table === "progress").status).toBe("missing in restore");
  });

  it("covers every player-data table", () => {
    expect(TABLES).toEqual(expect.arrayContaining(["users", "progress", "attempts"]));
  });
});
