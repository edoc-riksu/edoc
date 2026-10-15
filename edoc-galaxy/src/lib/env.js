// Fails loud on boot in staging/production when a required variable is
// missing, instead of letting the app start and break on first request.
const REQUIRED_IN_DEPLOYED_ENVS = ["DATABASE_URL", "AUTH_SECRET"];

export function assertEnv() {
  const appEnv = process.env.APP_ENV || "development";
  if (appEnv === "development") return;

  const missing = REQUIRED_IN_DEPLOYED_ENVS.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s) for APP_ENV=${appEnv}: ${missing.join(", ")}`
    );
  }
}
