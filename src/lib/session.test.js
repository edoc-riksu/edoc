import { beforeEach, describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "./session";

describe("createSessionToken / verifySessionToken", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "test-secret";
  });

  it("round-trips a userId through a valid token", () => {
    const token = createSessionToken("user_123");
    expect(verifySessionToken(token)).toBe("user_123");
  });

  it("rejects a tampered token", () => {
    const token = createSessionToken("user_123");
    const [encoded] = token.split(".");
    const tampered = `${encoded}.not-the-real-signature`;
    expect(verifySessionToken(tampered)).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const token = createSessionToken("user_123");
    process.env.AUTH_SECRET = "a-different-secret";
    expect(verifySessionToken(token)).toBeNull();
  });

  it("rejects missing or malformed tokens", () => {
    expect(verifySessionToken(null)).toBeNull();
    expect(verifySessionToken("")).toBeNull();
    expect(verifySessionToken("no-dot-here")).toBeNull();
  });
});
