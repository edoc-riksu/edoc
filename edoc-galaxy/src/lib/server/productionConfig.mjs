/**
 * Plan Day 50: is this set of environment variables fit to run production?
 * Used by scripts/check-production-env.mjs against the values Vercel will
 * use (`vercel env pull`), before the first production deploy and after any
 * change. Plain Node, no database, and it never returns a secret's value,
 * only what is wrong with it.
 *
 * Each finding is { name, level, problem }: "error" blocks the release,
 * "warn" should be fixed or knowingly accepted.
 */

const PLACEHOLDER_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0", "placeholder", "host.docker.internal"];
const WEAK_SECRETS = ["changeme", "secret", "password", "dev", "development", "test", "edoc"];

function parseUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isPlaceholderHost(hostname) {
  return PLACEHOLDER_HOSTS.includes(String(hostname).toLowerCase());
}

export function checkProductionConfig(env) {
  const findings = [];
  const error = (name, problem) => findings.push({ name, level: "error", problem });
  const warn = (name, problem) => findings.push({ name, level: "warn", problem });

  // APP_ENV decides logging, connection caching and the invite default.
  if (env.APP_ENV !== "production") {
    error("APP_ENV", `must be "production" (is ${env.APP_ENV ? `"${env.APP_ENV}"` : "not set"})`);
  }

  // DATABASE_URL: the production Neon project, never staging or a local one.
  const db = parseUrl(env.DATABASE_URL || "");
  if (!env.DATABASE_URL) {
    error("DATABASE_URL", "not set");
  } else if (!db || !/^postgres(ql)?:$/.test(db.protocol)) {
    error("DATABASE_URL", "is not a postgres:// connection string");
  } else {
    if (isPlaceholderHost(db.hostname)) error("DATABASE_URL", `points at ${db.hostname}, not the production database`);
    if (!db.password) error("DATABASE_URL", "has no password");
    if (db.hostname.endsWith(".neon.tech") && db.searchParams.get("sslmode") !== "require") {
      warn("DATABASE_URL", "Neon needs sslmode=require");
    }
    if (!db.searchParams.get("connect_timeout")) {
      warn("DATABASE_URL", "add connect_timeout=30 (DEPLOYMENT.md section 7: the first connection after idle can time out)");
    }
    if (env.STAGING_DATABASE_URL && sameDatabase(env.DATABASE_URL, env.STAGING_DATABASE_URL)) {
      error("DATABASE_URL", "is the same database as STAGING_DATABASE_URL");
    }
  }

  // AUTH_SECRET signs every session cookie; a weak one lets anyone forge a login.
  const secret = env.AUTH_SECRET || "";
  if (!secret) {
    error("AUTH_SECRET", "not set");
  } else if (secret.length < 32) {
    error("AUTH_SECRET", `is ${secret.length} characters; use at least 32 (openssl rand -base64 32)`);
  } else if (WEAK_SECRETS.some((w) => secret.toLowerCase().includes(w)) && new Set(secret).size < 16) {
    error("AUTH_SECRET", "looks hand-typed; generate a random one");
  }
  if (secret && env.STAGING_AUTH_SECRET && secret === env.STAGING_AUTH_SECRET) {
    error("AUTH_SECRET", "is the same as staging's; a staging cookie would work in production");
  }

  // The judging service: the server uses EXECUTION_API_URL for Submit, the
  // browser uses NEXT_PUBLIC_EXECUTION_API_URL for Run. Both must be the
  // production service over HTTPS.
  for (const name of ["EXECUTION_API_URL", "NEXT_PUBLIC_EXECUTION_API_URL"]) {
    const url = parseUrl(env[name] || "");
    if (!env[name]) error(name, "not set; Run/Submit would fall back to a local mock");
    else if (!url) error(name, "is not a URL");
    else {
      if (url.protocol !== "https:") error(name, "must use https://");
      if (isPlaceholderHost(url.hostname)) error(name, `points at ${url.hostname}`);
      if (url.pathname !== "/" || url.search) warn(name, "should be just the origin, e.g. https://api.example.com");
    }
  }
  const server = parseUrl(env.EXECUTION_API_URL || "");
  const browser = parseUrl(env.NEXT_PUBLIC_EXECUTION_API_URL || "");
  if (server && browser && server.origin !== browser.origin) {
    warn("EXECUTION_API_URL", "differs from NEXT_PUBLIC_EXECUTION_API_URL; Run and Submit would be judged by different services");
  }

  // Plan Day 52: the closed test. Unset is fine (production defaults to invite-only).
  const invite = String(env.INVITE_ONLY ?? "").trim().toLowerCase();
  if (["false", "0", "no", "off"].includes(invite)) {
    warn("INVITE_ONLY", "is off: anyone with the link can sign up. Intended only after the closed test");
  }

  // Plan Day 44: the metrics endpoint is off without a token.
  if (!env.METRICS_TOKEN) warn("METRICS_TOKEN", "not set; /api/admin/metrics and scripts/metrics.mjs won't work");
  else if (env.METRICS_TOKEN.length < 24) warn("METRICS_TOKEN", "is short; use at least 24 random characters");

  return findings;
}

function sameDatabase(a, b) {
  const x = parseUrl(a);
  const y = parseUrl(b);
  if (!x || !y) return false;
  // Neon's pooled and direct hosts differ only by "-pooler".
  const host = (u) => u.hostname.replace("-pooler", "");
  return host(x) === host(y) && x.pathname === y.pathname;
}

/**
 * Reads KEY=value lines as written by `vercel env pull` (quotes optional,
 * # comments and blank lines skipped). Deliberately tiny: no expansion.
 */
export function parseEnvFile(text) {
  const out = {};
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[match[1]] = value.replace(/\\n/g, "\n");
  }
  return out;
}
