/**
 * Plan Day 34: what /api/health reports, so an uptime monitor can alert on
 * it. Checks the environment and that the database answers within
 * `timeoutMs`. Anything failing makes the whole check fail (503), because a
 * site that can't reach its database can't sign anyone in or save progress.
 * Dependencies are passed in so this is testable without a database.
 */
export async function checkHealth({ checkEnv, pingDb, timeoutMs = 3000, now = () => Date.now() }) {
  const checks = { env: "ok", database: "ok" };
  let message;

  try {
    checkEnv();
  } catch (error) {
    checks.env = "error";
    message = error.message;
  }

  const started = now();
  try {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`no answer within ${timeoutMs}ms`)), timeoutMs);
    });
    await Promise.race([pingDb(), timeout]).finally(() => clearTimeout(timer));
  } catch (error) {
    checks.database = "error";
    // The real error can hold the connection host, so it goes to the logs only.
    console.error("health check: database unreachable:", error?.message || error);
    message = message || "Database unreachable.";
  }
  const databaseMs = now() - started;

  const ok = checks.env === "ok" && checks.database === "ok";
  return {
    httpStatus: ok ? 200 : 503,
    body: { status: ok ? "ok" : "error", checks, databaseMs, ...(message ? { message } : {}) }
  };
}
