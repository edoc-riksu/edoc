import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { verifyPassword } from "../../../../lib/auth";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "../../../../lib/session";
import { logger, withErrorLogging } from "../../../../lib/logger";

export const POST = withErrorLogging(async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email, password } = body || {};
  if (!email || !password) {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    logger.warn("failed login attempt", { email });
    return NextResponse.json({ error: "invalid email or password" }, { status: 401 });
  }

  const token = createSessionToken(user.id);
  const response = NextResponse.json({
    id: user.id,
    email: user.email,
    pilotCallsign: user.pilotCallsign
  });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.APP_ENV !== "development",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/"
  });
  return response;
}, "POST /api/auth/login");
