import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CONCEPTS, conceptFor } from "./concepts";

describe("concepts", () => {
  it("matches backend/encounters/concepts.json when the backend folder is present", () => {
    const file = join(process.cwd(), "..", "backend", "encounters", "concepts.json");
    if (!existsSync(file)) return;
    const backend = JSON.parse(readFileSync(file, "utf8")).concepts;
    expect(Object.values(CONCEPTS)).toEqual(backend);
  });

  it("names an unknown concept readably instead of failing", () => {
    expect(conceptFor("string-slicing")).toEqual({ id: "string-slicing", name: "string slicing", note: "" });
    expect(conceptFor(undefined).name).toBe("this exercise");
  });
});
