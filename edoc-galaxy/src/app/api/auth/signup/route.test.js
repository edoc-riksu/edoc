import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Plan Day 52: the sign-up route with the invite gate on and off. The
// database, rate limits and session signing are faked; the invite rules are
// the real ones from invites.mjs.

const store = vi.hoisted(() => ({
  invites: new Map(),
  users: [],
  createUser: null
}));

vi.mock("../../../../lib/db", () => ({
  db: {
    invite: { findUnique: async ({ where }) => store.invites.get(where.codeHash) ?? null }
  }
}));

vi.mock("../../../../lib/server/rateLimit", () => ({
  checkLimits: async () => ({ allowed: true, retryAfterMs: 0, scope: null }),
  getClientIp: () => "203.0.113.9"
}));

vi.mock("../../../../lib/server/sessionToken", () => ({
  createSessionToken: () => "token",
  SESSION_COOKIE_NAME: "edoc_session",
  maxAgeForRemember: () => 3600
}));

vi.mock("../../../../lib/server/pilotStore", () => ({
  findByCallsign: async (c) => store.users.find((u) => u.callsign.toLowerCase() === c.toLowerCase()) ?? null,
  findByEmail: async (e) => store.users.find((u) => u.email === e) ?? null,
  suggestCallsigns: async () => [],
  createUser: (...args) => store.createUser(...args)
}));

const { GET, POST } = await import("./route.js");
const { hashInviteCode } = await import("../../../../lib/server/invites.mjs");

const CODE = "EDOC-7KQ4-M2XH-9RTP";
const HASH = hashInviteCode("7KQ4M2XH9RTP");
const good = { callsign: "NovaPilot", email: "nova@example.com", password: "a-long-Password-77" };

function post(body) {
  return POST(new Request("http://x/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  }));
}

beforeEach(() => {
  store.invites = new Map([[HASH, { id: "inv1", uses: 0, maxUses: 1, expiresAt: null, revokedAt: null }]]);
  store.users = [{ callsign: "Taken", email: "taken@example.com" }];
  store.createUser = vi.fn(async ({ callsign, email }) => ({ id: "u1", callsign, email }));
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("GET /api/auth/signup", () => {
  it("tells the form whether an invite is needed", async () => {
    vi.stubEnv("INVITE_ONLY", "true");
    expect(await (await GET()).json()).toEqual({ inviteOnly: true });
    vi.stubEnv("INVITE_ONLY", "false");
    expect(await (await GET()).json()).toEqual({ inviteOnly: false });
  });
});

describe("POST /api/auth/signup with the invite gate on", () => {
  beforeEach(() => vi.stubEnv("INVITE_ONLY", "true"));

  it("creates the account with a good invite and passes the code on to be redeemed", async () => {
    const res = await post({ ...good, invite: " edoc 7kq4 m2xh 9rtp " });
    expect(res.status).toBe(201);
    expect(store.createUser).toHaveBeenCalledWith(expect.objectContaining({ inviteCode: "7KQ4M2XH9RTP" }));
  });

  it("asks for the invite when it is missing", async () => {
    const res = await post(good);
    expect(res.status).toBe(422);
    expect((await res.json()).fields.invite).toMatch(/Enter the invite code/);
    expect(store.createUser).not.toHaveBeenCalled();
  });

  it("turns away a code that doesn't exist, is used up, expired or revoked", async () => {
    const cases = [
      ["EDOC-AAAA-BBBB-CCCC", null, /isn't valid/],
      [CODE, { uses: 1 }, /already been used/],
      [CODE, { expiresAt: new Date(Date.now() - 1000) }, /expired/],
      [CODE, { revokedAt: new Date() }, /no longer valid/]
    ];
    for (const [invite, patch, message] of cases) {
      if (patch) store.invites.set(HASH, { id: "inv1", uses: 0, maxUses: 1, expiresAt: null, revokedAt: null, ...patch });
      const res = await post({ ...good, invite });
      expect(res.status).toBe(422);
      expect((await res.json()).fields.invite).toMatch(message);
    }
    expect(store.createUser).not.toHaveBeenCalled();
  });

  it("checks the invite before saying an email is taken, so it can't be used to look up accounts", async () => {
    const res = await post({ ...good, email: "taken@example.com", invite: "EDOC-AAAA-BBBB-CCCC" });
    expect(res.status).toBe(422);
    expect((await res.json()).fields.invite).toBeTruthy();
  });

  it("reports the last place going to someone else as used up", async () => {
    store.createUser = vi.fn(async () => {
      const err = new Error("gone");
      err.code = "INVITE_INVALID";
      throw err;
    });
    const res = await post({ ...good, invite: CODE });
    expect(res.status).toBe(422);
    expect((await res.json()).fields.invite).toMatch(/already been used/);
  });
});

describe("POST /api/auth/signup with the invite gate off", () => {
  beforeEach(() => vi.stubEnv("INVITE_ONLY", "false"));

  it("works without an invite, as before", async () => {
    const res = await post(good);
    expect(res.status).toBe(201);
    expect(store.createUser).toHaveBeenCalledWith(expect.objectContaining({ inviteCode: null }));
  });

  it("ignores an invite field it doesn't need", async () => {
    expect((await post({ ...good, invite: "nonsense" })).status).toBe(201);
  });
});
