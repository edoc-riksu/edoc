import { createHmac, timingSafeEqual } from "crypto";

/**
 * 🔑 SESSIONS — a real signed-cookie session, not a client-side boolean.
 * The token is `base64url(payload).hmac-sha256(payload, AUTH_SECRET)`; a
 * tampered payload or a wrong secret both fail `timingSafeEqual` the same
 * way, so there's no signal to an attacker either way.
 */
export const SESSION_COOKIE_NAME = "edoc_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
export const SESSION_MAX_AGE_SECONDS = Math.floor(SESSION_TTL_MS / 1000);

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set. Copy .env.example to .env.local and set a dev value.");
  }
  return secret;
}

function sign(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function verify(token) {
  if (!token) return null;
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expected = createHmac("sha256", getSecret()).update(data).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createSessionToken(callsign) {
  return sign({ callsign, exp: Date.now() + SESSION_TTL_MS });
}

/** Returns the callsign a valid, unexpired token was issued for, or null. */
export function readSessionToken(token) {
  const payload = verify(token);
  return payload?.callsign || null;
}
