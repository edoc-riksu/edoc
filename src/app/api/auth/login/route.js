import { NextResponse } from "next/server";
import { findUser } from "../../../../lib/server/userStore";
import { verifyPassword } from "../../../../lib/server/passwords";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "../../../../lib/server/session";
import { rateLimit, getClientIp } from "../../../../lib/server/rateLimit";
import { normalizeCallsign } from "../../../../lib/callsign";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  const callsign = normalizeCallsign(body?.callsign);
  const password = typeof body?.password === "string" ? body.password : "";

  // Brute-force protection keyed on IP+callsign — an attacker spraying
  // many callsigns from one IP, or many passwords at one callsign, both
  // hit this; a real pilot mistyping their own password a few times
  // never gets near the limit.
  const ip = getClientIp(request);
  const limited = rateLimit(`login:${ip}:${callsign || "unknown"}`, { limit: 8, windowMs: 10 * 60 * 1000 });
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limited.retryAfterMs / 1000)) } }
    );
  }

  const user = callsign ? findUser(callsign) : null;

  // Same error either way — a real login never reveals whether the
  // callsign exists, only whether the pair was right.
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Callsign or password doesn't match." }, { status: 401 });
  }

  const response = NextResponse.json({ callsign, firstName: user.firstName });
  response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(callsign), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS
  });
  return response;
}
