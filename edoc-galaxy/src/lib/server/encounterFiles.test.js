import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inPlayOrder, latestVersionFile, loadEncounters } from "./encounterFiles.mjs";

describe("latestVersionFile", () => {
  it("compares version numbers, not text", () => {
    expect(latestVersionFile(["v1.json", "v2.json", "v10.json", "v9.json"])).toBe("v10.json");
  });

  it("ignores files that are not version files", () => {
    expect(latestVersionFile(["notes.txt", "v1.json.bak", "v3.json"])).toBe("v3.json");
    expect(latestVersionFile(["notes.txt"])).toBeNull();
  });
});

describe("loadEncounters and inPlayOrder", () => {
  let root;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "enc-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  function write(language, id, version, data) {
    const dir = join(root, language, id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `v${version}.json`), JSON.stringify({ id, version, ...data }));
  }

  it("takes the highest version of each encounter", () => {
    write("python", "py-011", 1, { order: 11, title: "old" });
    write("python", "py-011", 2, { order: 13, title: "new" });
    const [e] = loadEncounters(root, "python");
    expect(e.version).toBe(2);
    expect(e.order).toBe(13);
  });

  it("plays encounters by their own order, not by id", () => {
    write("python", "py-011", 2, { order: 13 });
    write("python", "py-012", 1, { order: 11 });
    write("python", "py-013", 1, { order: 12 });
    const ids = inPlayOrder(loadEncounters(root, "python")).map((e) => e.id);
    expect(ids).toEqual(["py-012", "py-013", "py-011"]);
  });
});

describe("the real backend encounter files", () => {
  const backend = join(process.cwd(), "..", "backend", "encounters");
  it("come out in the same order the backend serves them", () => {
    if (!existsSync(join(backend, "python"))) return;
    const byModule = new Map();
    for (const e of loadEncounters(backend, "python")) {
      byModule.set(e.module, [...(byModule.get(e.module) ?? []), e]);
    }
    for (const list of byModule.values()) {
      const orders = inPlayOrder(list).map((e) => e.order);
      expect(orders).toEqual([...orders].sort((a, b) => a - b));
      expect(new Set(orders).size).toBe(orders.length);
    }
  });
});
