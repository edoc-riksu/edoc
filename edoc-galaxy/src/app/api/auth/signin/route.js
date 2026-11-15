import { NextResponse } from "next/server";
import { verifyCredentials } from "../../../../lib/server/pilotStore";
import { createSessionToken, SESSION_COOKIE_NAME, maxAgeForRemember } from "../../../../lib/server/sessionToken";
import { checkLimits, getClientIp } from "../../../../lib/server/rateLimit";
import { BODY_LIMITS, LIMITS, tooManyRequests } from "../../../../lib/server/abuseLimits";
import { readJsonBody } from "../../../../lib/server/requestBody";
import { logger, withErrorLogging } from "../../../../lib/logger";
import { normalizeEmail } from "../../../../lib/authValidation";

export const POST = withErrorLogging(async function POST(request) {
  const parsed = await readJsonBody(request, { maxBytes: BODY_LIMITS.auth });
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }
  const body = parsed.body;

  const email = normalizeEmail(body?.email);
  const password = typeof body?.password === "string" ? body.password : "";
  const remember = body?.remember === true;

  const ip = getClientIp(request);
  // Per IP + email, per account and per IP (abuseLimits.js, plan Day 43).
  const limited = await checkLimits(LIMITS.signin({ ip, email }));
  if (!limited.allowed) {
    return NextResponse.json({ retryAfter: tooManyRequests(limited).body.retryAfter }, { status: 429 });
  }

  const user = await verifyCredentials(email, password);
  if (!user) {
    logger.warn("failed sign-in attempt", { email });
    return NextResponse.json({ code: "invalid_credentials" }, { status: 401 });
  }

  const response = NextResponse.json({ user }, { status: 200 });
  response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(user.id, { remember }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeForRemember(remember)
  });
  return response;
}, "POST /api/auth/signin");
