import { afterEach, describe, expect, it } from "vitest";
import { assertEnv } from "./env";

const saved = { ...process.env };

afterEach(() => {
  process.env = { ...saved };
});

describe("assertEnv", () => {
  it("lets development run with nothing set", () => {
    delete process.env.APP_ENV;
    delete process.env.DATABASE_URL;
    delete process.env.AUTH_SECRET;
    expect(() => assertEnv()).not.toThrow();
  });

  it("names every missing variable in staging", () => {
    process.env.APP_ENV = "staging";
    delete process.env.DATABASE_URL;
    delete process.env.AUTH_SECRET;
    expect(() => assertEnv()).toThrow(/DATABASE_URL, AUTH_SECRET/);
  });

  it("passes in production when both are set", () => {
    process.env.APP_ENV = "production";
    process.env.DATABASE_URL = "postgres://x";
    process.env.AUTH_SECRET = "secret";
    expect(() => assertEnv()).not.toThrow();
  });
});
