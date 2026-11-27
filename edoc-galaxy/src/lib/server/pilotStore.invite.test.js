import { describe, it, expect, vi } from "vitest";
import { createUser } from "./pilotStore";

// Plan Day 52: an invite's use and the account it creates are saved together.

const input = { callsign: "NovaPilot", email: "Nova@Example.com", password: "a-long-Password-77" };

function fakeDb({ redeemedId = "inv1", createError = null } = {}) {
  const calls = { committed: false };
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue(redeemedId ? [{ id: redeemedId }] : []),
    user: {
      create: vi.fn(async ({ data }) => {
        if (createError) throw createError;
        return { id: "u1", ...data, createdAt: new Date() };
      })
    }
  };
  return {
    calls,
    tx,
    $transaction: vi.fn(async (fn) => {
      const result = await fn(tx); // a throw here means Postgres rolls the use back
      calls.committed = true;
      return result;
    }),
    user: { create: vi.fn(async ({ data }) => ({ id: "u2", ...data, createdAt: new Date() })) }
  };
}

describe("createUser with an invite", () => {
  it("redeems the invite and links it to the new account in one transaction", async () => {
    const db = fakeDb();
    const user = await createUser({ ...input, inviteCode: "7KQ4M2XH9RTP" }, { db });
    expect(user).toMatchObject({ id: "u1", callsign: "NovaPilot", email: "nova@example.com" });
    expect(db.tx.user.create.mock.calls[0][0].data.inviteId).toBe("inv1");
    expect(db.calls.committed).toBe(true);
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it("creates nothing when the invite has no use left", async () => {
    const db = fakeDb({ redeemedId: null });
    await expect(createUser({ ...input, inviteCode: "7KQ4M2XH9RTP" }, { db })).rejects.toMatchObject({ code: "INVITE_INVALID" });
    expect(db.tx.user.create).not.toHaveBeenCalled();
    expect(db.calls.committed).toBe(false);
  });

  it("rolls the use back when the callsign was taken at the last moment", async () => {
    const taken = Object.assign(new Error("unique"), { code: "P2002", meta: { target: ["pilotCallsign"] } });
    const db = fakeDb({ createError: taken });
    await expect(createUser({ ...input, inviteCode: "7KQ4M2XH9RTP" }, { db })).rejects.toMatchObject({ code: "CALLSIGN_TAKEN" });
    expect(db.calls.committed).toBe(false);
  });

  it("skips the transaction while sign-up is open", async () => {
    const db = fakeDb();
    const user = await createUser(input, { db });
    expect(user.id).toBe("u2");
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.user.create.mock.calls[0][0].data.inviteId).toBeUndefined();
  });
});
