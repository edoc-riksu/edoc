import { afterEach, describe, expect, it, vi } from "vitest";
import { modulesInOrder } from "./encounterFiles.mjs";
import { createSessionToken, readSessionToken } from "./sessionToken";

// Plan Day 47 bug fixes.

// 1. hasCompletedAnyModule asked Prisma for `select` and `include` at once,
//    which Prisma rejects, so equipping the Starfarer suit always failed.
const fake = vi.hoisted(() => ({ db: {} }));
vi.mock("../db", () => ({ db: fake.db }));

describe("hasCompletedAnyModule", () => {
  const modules = [
    { id: "m1", encounters: [{ id: "a" }, { id: "b" }] },
    { id: "m2", encounters: [{ id: "c" }] },
    { id: "empty", encounters: [] }
  ];
  const setup = (solvedIds) => {
    fake.db.module = {
      findMany: vi.fn(async (args) => {
        // The same rule Prisma enforces before running anything.
        if (args.select && args.include) throw new Error("Please either use `include` or `select`, but not both at the same time.");
        return modules;
      })
    };
    fake.db.attempt = {
      findMany: vi.fn(async ({ where }) => where.encounterId.in.filter((id) => solvedIds.includes(id)).map((encounterId) => ({ encounterId })))
    };
  };

  it("builds a query Prisma accepts", async () => {
    const { hasCompletedAnyModule } = await import("./progressStore");
    setup([]);
    await expect(hasCompletedAnyModule("u1")).resolves.toBe(false);
    const args = fake.db.module.findMany.mock.calls[0][0];
    expect(args.include).toBeUndefined();
    expect(args.select).toEqual({ id: true, encounters: { select: { id: true } } });
  });

  it("is true once every encounter of any one module is solved", async () => {
    const { hasCompletedAnyModule } = await import("./progressStore");
    setup(["a"]);
    await expect(hasCompletedAnyModule("u1")).resolves.toBe(false);
    setup(["c"]);
    await expect(hasCompletedAnyModule("u1")).resolves.toBe(true);
  });
});

// 2. The seed only set a module's order when creating it, and the order came
//    from file-reading order. modulesInOrder makes it explicit and the seed
//    now writes it on every run.
describe("modulesInOrder", () => {
  const e = (id, module, order) => ({ id, module, order });

  it("orders modules by their lowest encounter id and encounters by play order", () => {
    const plan = modulesInOrder([
      e("py-022", "conditions", 2),
      e("py-011", "loops", 5),
      e("py-021", "conditions", 1),
      e("py-002", "python-basics", 2),
      e("py-018", "loops", 1),
      e("py-001", "python-basics", 1)
    ]);
    expect(plan.map((m) => [m.slug, m.order])).toEqual([
      ["python-basics", 0],
      ["loops", 1],
      ["conditions", 2]
    ]);
    expect(plan[1].encounters.map((x) => x.id)).toEqual(["py-018", "py-011"]);
  });

  it("gives the same order whatever order the files are read in", () => {
    const files = [e("py-031", "strings", 1), e("py-001", "python-basics", 1), e("py-041", "lists", 1)];
    const forwards = modulesInOrder(files).map((m) => m.slug);
    const backwards = modulesInOrder([...files].reverse()).map((m) => m.slug);
    expect(forwards).toEqual(["python-basics", "strings", "lists"]);
    expect(backwards).toEqual(forwards);
  });
});

// 3. Outside development, a missing AUTH_SECRET used to fall back to the
//    development secret that is public in this repo.
describe("session secret outside development", () => {
  const saved = { AUTH_SECRET: process.env.AUTH_SECRET, APP_ENV: process.env.APP_ENV };
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("still works in development without AUTH_SECRET", () => {
    delete process.env.AUTH_SECRET;
    delete process.env.APP_ENV;
    expect(readSessionToken(createSessionToken("u1"))).toBe("u1");
  });

  it("refuses to sign, and reads every token as signed out, in staging without AUTH_SECRET", () => {
    delete process.env.AUTH_SECRET;
    delete process.env.APP_ENV;
    const forged = createSessionToken("victim"); // signed with the public development secret
    process.env.APP_ENV = "staging";
    expect(() => createSessionToken("u1")).toThrow(/AUTH_SECRET is not set/);
    expect(readSessionToken(forged)).toBeNull();
  });

  it("uses AUTH_SECRET normally in staging when it is set", () => {
    process.env.APP_ENV = "staging";
    process.env.AUTH_SECRET = "real-staging-secret";
    expect(readSessionToken(createSessionToken("u1"))).toBe("u1");
  });
});
