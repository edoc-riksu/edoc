import { describe, it, expect, vi } from "vitest";
import { createTtlCache } from "./readCache";

describe("createTtlCache", () => {
  it("serves from memory until the entry expires, then loads again", async () => {
    let t = 0;
    const cache = createTtlCache({ ttlMs: 1000, now: () => t });
    const load = vi.fn(async () => `value at ${t}`);

    expect(await cache.get("k", load)).toBe("value at 0");
    t = 999;
    expect(await cache.get("k", load)).toBe("value at 0");
    expect(load).toHaveBeenCalledTimes(1);

    t = 1000;
    expect(await cache.get("k", load)).toBe("value at 1000");
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("makes one load for many callers asking at once", async () => {
    const cache = createTtlCache({ ttlMs: 1000 });
    let release;
    const load = vi.fn(() => new Promise((resolve) => (release = resolve)));

    const all = Promise.all([cache.get("k", load), cache.get("k", load), cache.get("k", load)]);
    release("shared");
    expect(await all).toEqual(["shared", "shared", "shared"]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("never caches a failed load", async () => {
    const cache = createTtlCache({ ttlMs: 1000 });
    await expect(cache.get("k", async () => { throw new Error("db down"); })).rejects.toThrow("db down");
    expect(await cache.get("k", async () => "ok")).toBe("ok");
  });

  it("caches null (a not-found answer) like any other value", async () => {
    const cache = createTtlCache({ ttlMs: 1000 });
    const load = vi.fn(async () => null);
    await cache.get("missing", load);
    await cache.get("missing", load);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("keeps different keys apart and drops the oldest past maxEntries", async () => {
    const cache = createTtlCache({ ttlMs: 1000, maxEntries: 2 });
    await cache.get("a", async () => 1);
    await cache.get("b", async () => 2);
    await cache.get("c", async () => 3);
    expect(cache.size).toBe(2);
    const reload = vi.fn(async () => "a again");
    expect(await cache.get("a", reload)).toBe("a again");
    expect(await cache.get("c", async () => "unused")).toBe(3);
  });
});
