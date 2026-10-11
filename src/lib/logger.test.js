import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logger, withErrorLogging } from "./logger";

describe("logger", () => {
  let logSpy;
  let errorSpy;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    delete process.env.APP_ENV;
  });

  it("prints readable output in development", () => {
    process.env.APP_ENV = "development";
    logger.info("hello", { foo: "bar" });
    expect(logSpy).toHaveBeenCalledWith("[INFO] hello", { foo: "bar" });
  });

  it("prints structured JSON outside development", () => {
    process.env.APP_ENV = "production";
    logger.warn("careful", { foo: "bar" });
    const [line] = logSpy.mock.calls[0];
    const parsed = JSON.parse(line);
    expect(parsed).toMatchObject({ level: "warn", message: "careful", foo: "bar" });
    expect(parsed.time).toBeTruthy();
  });

  it("routes errors through console.error", () => {
    process.env.APP_ENV = "production";
    logger.error("boom");
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});

describe("withErrorLogging", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes through a successful handler's response", async () => {
    const handler = withErrorLogging(async () => new Response("ok", { status: 200 }), "test-route");
    const response = await handler();
    expect(response.status).toBe(200);
  });

  it("catches a thrown error and returns a generic 500", async () => {
    const handler = withErrorLogging(async () => {
      throw new Error("something broke internally");
    }, "test-route");
    const response = await handler();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "internal server error" });
  });
});
