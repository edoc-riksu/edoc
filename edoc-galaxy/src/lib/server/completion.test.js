import { describe, it, expect, vi, beforeEach } from "vitest";
import { completionSnapshot } from "./completion.mjs";

const at = (minute) => new Date(Date.UTC(2026, 10, 10, 12, minute));
const attempt = (encounterId, verdict, minute, extra = {}) => ({
  encounterId,
  verdict,
  createdAt: at(minute),
  hintsUsed: 0,
  elapsedMs: 1000,
  ...extra
});

describe("completionSnapshot", () => {
  it("is null while any encounter is unsolved", () => {
    expect(completionSnapshot(["a", "b"], [attempt("a", "ACCEPTED", 1), attempt("b", "WRONG_ANSWER", 2)])).toBeNull();
    expect(completionSnapshot([], [])).toBeNull();
  });

  it("completes when the last encounter is first accepted, and counts only up to then", () => {
    const snap = completionSnapshot(
      ["a", "b"],
      [
        attempt("b", "WRONG_ANSWER", 1, { hintsUsed: 1, elapsedMs: 500 }),
        attempt("a", "ACCEPTED", 2, { elapsedMs: 300 }),
        attempt("b", "ACCEPTED", 3, { hintsUsed: 2, elapsedMs: 700 }),
        // Practice afterwards must not change the certificate.
        attempt("a", "WRONG_ANSWER", 9, { hintsUsed: 3, elapsedMs: 9999 }),
        attempt("b", "ACCEPTED", 10)
      ]
    );
    expect(snap).toEqual({
      encounterCount: 2,
      attemptCount: 3,
      firstTryCount: 1, // a was accepted first try, b was not
      hintsUsed: 3,
      elapsedMs: 1500,
      completedAt: at(3)
    });
  });

  it("ignores attempts on other modules and accepts unsorted input", () => {
    const snap = completionSnapshot(
      ["a"],
      [attempt("zz", "ACCEPTED", 0), attempt("a", "ACCEPTED", 5), attempt("a", "WRONG_ANSWER", 4)]
    );
    expect(snap).toMatchObject({ encounterCount: 1, attemptCount: 2, firstTryCount: 0, completedAt: at(5) });
  });
});

// recordModuleCompletion against a fake database.
const fake = vi.hoisted(() => ({ db: {} }));
vi.mock("../db", () => ({ db: fake.db }));

describe("recordModuleCompletion", () => {
  const module_ = { id: "m1", slug: "python-basics", planetId: "python" };

  beforeEach(() => {
    fake.db.encounter = { findMany: vi.fn(async () => [{ id: "a" }, { id: "b" }]) };
    fake.db.completion = { upsert: vi.fn(async (args) => args) };
  });

  it("writes nothing while the module is incomplete", async () => {
    const { recordModuleCompletion } = await import("./progressStore");
    fake.db.attempt = { findMany: vi.fn(async () => [attempt("a", "ACCEPTED", 1)]) };
    expect(await recordModuleCompletion("u1", module_)).toBeNull();
    expect(fake.db.completion.upsert).not.toHaveBeenCalled();
  });

  it("creates the record once and never overwrites an existing one", async () => {
    const { recordModuleCompletion } = await import("./progressStore");
    fake.db.attempt = { findMany: vi.fn(async () => [attempt("a", "ACCEPTED", 1), attempt("b", "ACCEPTED", 2)]) };
    await recordModuleCompletion("u1", module_);
    const args = fake.db.completion.upsert.mock.calls[0][0];
    expect(args.where).toEqual({ userId_moduleSlug: { userId: "u1", moduleSlug: "python-basics" } });
    expect(args.update).toEqual({});
    expect(args.create).toMatchObject({ userId: "u1", moduleSlug: "python-basics", planetId: "python", encounterCount: 2, completedAt: at(2) });
  });
});
