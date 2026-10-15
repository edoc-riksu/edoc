import { NextResponse } from "next/server";
import { createUser, findByCallsign, findByEmail, suggestCallsigns } from "../../../../lib/server/pilotStore";
import { createSessionToken, SESSION_COOKIE_NAME, maxAgeForRemember } from "../../../../lib/server/sessionToken";
import { rateLimit, getClientIp } from "../../../../lib/server/rateLimit";
import { logger, withErrorLogging } from "../../../../lib/logger";
import {
  normalizeCallsign,
  normalizeEmail,
  isValidCallsign,
  isValidEmail,
  isValidPassword,
  AUTH_MESSAGES
} from "../../../../lib/authValidation";

export const POST = withErrorLogging(async function POST(request) {
  const ip = getClientIp(request);
  const limited = rateLimit(`signup:${ip}`, { limit: 10, windowMs: 60 * 60 * 1000 });
  if (!limited.allowed) {
    return NextResponse.json({ retryAfter: Math.ceil(limited.retryAfterMs / 1000) }, { status: 429 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ fields: { form: "Malformed request body." } }, { status: 422 });
  }

  const callsign = normalizeCallsign(body?.callsign);
  const email = normalizeEmail(body?.email);
  const password = typeof body?.password === "string" ? body.password : "";

  const fields = {};
  if (!isValidCallsign(callsign)) fields.callsign = AUTH_MESSAGES.callsign;
  if (!isValidEmail(email)) fields.email = AUTH_MESSAGES.email;
  if (!isValidPassword(password)) fields.password = AUTH_MESSAGES.password;
  if (Object.keys(fields).length > 0) {
    return NextResponse.json({ fields }, { status: 422 });
  }

  if (await findByCallsign(callsign)) {
    return NextResponse.json(
      { code: "callsign_taken", suggestions: await suggestCallsigns(callsign) },
      { status: 409 }
    );
  }
  if (await findByEmail(email)) {
    return NextResponse.json({ code: "email_taken" }, { status: 409 });
  }

  let user;
  try {
    user = await createUser({ callsign, email, password });
  } catch (err) {
    if (err.code === "CALLSIGN_TAKEN") {
      return NextResponse.json(
        { code: "callsign_taken", suggestions: await suggestCallsigns(callsign) },
        { status: 409 }
      );
    }
    if (err.code === "EMAIL_TAKEN") {
      return NextResponse.json({ code: "email_taken" }, { status: 409 });
    }
    throw err;
  }

  logger.info("pilot account created", { userId: user.id });

  const response = NextResponse.json({ user }, { status: 201 });
  response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(user.id, { remember: true }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeForRemember(true)
  });
  return response;
}, "POST /api/auth/signup");
