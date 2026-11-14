import { describe, it, expect, vi } from "vitest";
import { checkHealth } from "./health";

const ok = () => {};
const up = async () => [{ "?column?": 1 }];

describe("checkHealth", () => {
  it("is ok when the env is set and the database answers", async () => {
    const { httpStatus, body } = await checkHealth({ checkEnv: ok, pingDb: up });
    expect(httpStatus).toBe(200);
    expect(body).toMatchObject({ status: "ok", checks: { env: "ok", database: "ok" } });
    expect(body.message).toBeUndefined();
    expect(body.databaseMs).toBeGreaterThanOrEqual(0);
  });

  it("is 503 when the database is down, without leaking the connection error", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { httpStatus, body } = await checkHealth({
      checkEnv: ok,
      pingDb: async () => {
        throw new Error("Can't reach database server at secret-host.neon.tech:5432");
      }
    });
    expect(httpStatus).toBe(503);
    expect(body).toMatchObject({ status: "error", checks: { database: "error" }, message: "Database unreachable." });
    expect(JSON.stringify(body)).not.toContain("secret-host");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("is 503 when the database hangs past the timeout", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { httpStatus, body } = await checkHealth({
      checkEnv: ok,
      pingDb: () => new Promise(() => {}),
      timeoutMs: 20
    });
    expect(httpStatus).toBe(503);
    expect(body.checks.database).toBe("error");
    spy.mockRestore();
  });

  it("reports a missing environment variable by name", async () => {
    const { httpStatus, body } = await checkHealth({
      checkEnv: () => {
        throw new Error("Missing required environment variable(s) for APP_ENV=staging: AUTH_SECRET");
      },
      pingDb: up
    });
    expect(httpStatus).toBe(503);
    expect(body.checks).toEqual({ env: "error", database: "ok" });
    expect(body.message).toContain("AUTH_SECRET");
  });
});
