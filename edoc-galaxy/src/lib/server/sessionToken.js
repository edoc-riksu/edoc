import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "edoc_galaxy_session";
const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24; // 24h — plain sign-in
const REMEMBER_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30d — "keep me signed in"

// Dev-only fallback secret so the mock store works out of the box; a real
// deployment must set AUTH_SECRET.
const SECRET = process.env.AUTH_SECRET || "edoc-galaxy-dev-secret-do-not-use-in-production";

function sign(value) {
  return createHmac("sha256", SECRET).update(value).digest("hex");
}

export function maxAgeForRemember(remember) {
  return remember ? REMEMBER_MAX_AGE_SECONDS : DEFAULT_MAX_AGE_SECONDS;
}

export function createSessionToken(email, { remember = false } = {}) {
  const payload = JSON.stringify({ email, exp: Date.now() + maxAgeForRemember(remember) * 1000 });
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
    if (!payload.email || typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload.email;
  } catch {
    return null;
  }
}
