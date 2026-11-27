import { describe, it, expect, vi } from "vitest";
import {
  INVITE_ALPHABET,
  INVITE_MESSAGES,
  checkInvite,
  generateInviteCode,
  hashInviteCode,
  inviteMessage,
  inviteState,
  isInviteOnly,
  normalizeInviteCode,
  redeemInvite
} from "./invites.mjs";

// Plan Day 52: invite gate.

describe("generateInviteCode", () => {
  it("makes EDOC-XXXX-XXXX-XXXX codes from the unambiguous alphabet", () => {
    for (let i = 0; i < 50; i += 1) {
      const code = generateInviteCode();
      expect(code).toMatch(/^EDOC-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      for (const ch of code.slice(5).replace(/-/g, "")) expect(INVITE_ALPHABET).toContain(ch);
    }
  });

  it("never uses look-alike characters", () => {
    for (const ch of "0O1IL") expect(INVITE_ALPHABET).not.toContain(ch);
  });

  it("gives different codes", () => {
    const codes = new Set(Array.from({ length: 200 }, () => generateInviteCode()));
    expect(codes.size).toBe(200);
  });
});

describe("normalizeInviteCode", () => {
  const code = "EDOC-7KQ4-M2XH-9RTP";

  it("accepts the code however it was typed or pasted", () => {
    for (const typed of [code, "edoc-7kq4-m2xh-9rtp", " EDOC 7KQ4 M2XH 9RTP ", "7KQ4M2XH9RTP", "7kq4-m2xh-9rtp"]) {
      expect(normalizeInviteCode(typed)).toBe("7KQ4M2XH9RTP");
    }
  });

  it("turns away anything that can't be a code", () => {
    for (const bad of ["", "EDOC", "7KQ4-M2XH", "7KQ4-M2XH-9RTP-AAAA", "0KQ4-M2XH-9RTP", null, undefined, 42, "x".repeat(100)]) {
      expect(normalizeInviteCode(bad)).toBe("");
    }
  });

  it("hashes the same code to the same value, whatever the formatting", () => {
    expect(hashInviteCode(normalizeInviteCode(code))).toBe(hashInviteCode(normalizeInviteCode("7kq4 m2xh 9rtp")));
    expect(hashInviteCode("7KQ4M2XH9RTP")).not.toContain("7KQ4");
  });
});

describe("isInviteOnly", () => {
  it("is on in production and off elsewhere when INVITE_ONLY isn't set", () => {
    expect(isInviteOnly({ APP_ENV: "production" })).toBe(true);
    expect(isInviteOnly({ APP_ENV: "staging" })).toBe(false);
    expect(isInviteOnly({})).toBe(false);
  });

  it("follows INVITE_ONLY when it is set", () => {
    expect(isInviteOnly({ APP_ENV: "staging", INVITE_ONLY: "true" })).toBe(true);
    expect(isInviteOnly({ APP_ENV: "production", INVITE_ONLY: "false" })).toBe(false);
    expect(isInviteOnly({ APP_ENV: "development", INVITE_ONLY: "1" })).toBe(true);
  });

  it("stays on in production if INVITE_ONLY is set to something unclear", () => {
    expect(isInviteOnly({ APP_ENV: "production", INVITE_ONLY: "maybe" })).toBe(true);
  });
});

describe("inviteState", () => {
  const now = new Date("2026-11-27T12:00:00Z");
  const good = { uses: 0, maxUses: 1, expiresAt: null, revokedAt: null };

  it("is ok for an unused, unexpired, unrevoked invite", () => {
    expect(inviteState(good, now)).toBe("ok");
    expect(inviteState({ ...good, uses: 4, maxUses: 30 }, now)).toBe("ok");
    expect(inviteState({ ...good, expiresAt: "2026-12-01T00:00:00Z" }, now)).toBe("ok");
  });

  it("says why an invite can't be used", () => {
    expect(inviteState(null, now)).toBe("unknown");
    expect(inviteState({ ...good, revokedAt: now }, now)).toBe("revoked");
    expect(inviteState({ ...good, expiresAt: "2026-11-27T11:59:59Z" }, now)).toBe("expired");
    expect(inviteState({ ...good, uses: 1 }, now)).toBe("used_up");
  });

  it("has a message for every state", () => {
    for (const state of ["unknown", "revoked", "expired", "used_up", "anything"]) {
      expect(Object.values(INVITE_MESSAGES)).toContain(inviteMessage(state));
    }
  });
});

describe("checkInvite and redeemInvite", () => {
  it("looks the invite up by hash, never by the code", async () => {
    const findUnique = vi.fn().mockResolvedValue({ id: "inv1", uses: 0, maxUses: 1, expiresAt: null, revokedAt: null });
    const result = await checkInvite({ invite: { findUnique } }, "7KQ4M2XH9RTP");
    expect(result.state).toBe("ok");
    expect(findUnique).toHaveBeenCalledWith({ where: { codeHash: hashInviteCode("7KQ4M2XH9RTP") } });
  });

  it("redeems in one conditional UPDATE and returns the invite id", async () => {
    const $queryRaw = vi.fn().mockResolvedValue([{ id: "inv1" }]);
    expect(await redeemInvite({ $queryRaw }, "7KQ4M2XH9RTP")).toBe("inv1");
    const sql = $queryRaw.mock.calls[0][0].join("?");
    expect(sql).toMatch(/UPDATE "invites" SET "uses" = "uses" \+ 1/);
    expect(sql).toMatch(/"uses" < "maxUses"/);
    expect(sql).toMatch(/"revokedAt" IS NULL/);
    expect($queryRaw.mock.calls[0][1]).toBe(hashInviteCode("7KQ4M2XH9RTP"));
  });

  it("returns null when no use was left", async () => {
    expect(await redeemInvite({ $queryRaw: vi.fn().mockResolvedValue([]) }, "7KQ4M2XH9RTP")).toBeNull();
  });
});
