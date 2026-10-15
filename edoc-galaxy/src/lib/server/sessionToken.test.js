import { beforeEach, describe, expect, it } from "vitest";
import { createSessionToken, readSessionToken, maxAgeForRemember } from "./sessionToken";

describe("createSessionToken / readSessionToken", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "test-secret";
  });

  it("round-trips a userId through a valid token", () => {
    const token = createSessionToken("user_123");
    expect(readSessionToken(token)).toBe("user_123");
  });

  it("rejects a tampered token", () => {
    const token = createSessionToken("user_123");
    const [encoded] = token.split(".");
    const tampered = `${encoded}.not-the-real-signature`;
    expect(readSessionToken(tampered)).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const token = createSessionToken("user_123");
    process.env.AUTH_SECRET = "a-different-secret";
    expect(readSessionToken(token)).toBeNull();
  });

  it("rejects missing or malformed tokens", () => {
    expect(readSessionToken(null)).toBeNull();
    expect(readSessionToken("")).toBeNull();
    expect(readSessionToken("no-dot-here")).toBeNull();
  });

  it("remember=true lasts longer than a plain sign-in", () => {
    expect(maxAgeForRemember(true)).toBeGreaterThan(maxAgeForRemember(false));
  });
});
