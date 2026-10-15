import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "edoc_galaxy_session";
const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24; // 24h — plain sign-in
const REMEMBER_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30d — "keep me signed in"

// Read fresh on every call, not cached at module load - caching it in a
// module-level constant meant rotating AUTH_SECRET at runtime silently had
// no effect (tokens signed under the old secret kept validating).
// Dev-only fallback so things work out of the box without AUTH_SECRET set;
// a real deployment must set it.
function getSecret() {
  return process.env.AUTH_SECRET || "edoc-galaxy-dev-secret-do-not-use-in-production";
}

function sign(value) {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

export function maxAgeForRemember(remember) {
  return remember ? REMEMBER_MAX_AGE_SECONDS : DEFAULT_MAX_AGE_SECONDS;
}

// Keyed by the real Prisma user id (not email) now that signup/signin are
// backed by the users table - a userId is stable even if someone changes
// their email later, which an email-keyed token wasn't.
export function createSessionToken(userId, { remember = false } = {}) {
  const payload = JSON.stringify({ userId, exp: Date.now() + maxAgeForRemember(remember) * 1000 });
  const encoded = Buffer.from(payload, "utf8").toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function readSessionToken(token) {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const [encoded, signature] = token.split(".");
  const expected = sign(encoded);
  const a = Buffer.from(signature || "", "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!payload.userId || typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload.userId;
  } catch {
    return null;
  }
}
