import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { hashPassword } from "../../../../lib/auth";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "../../../../lib/session";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email, password, pilotCallsign } = body || {};
  if (!email || !password || !pilotCallsign) {
    return NextResponse.json(
      { error: "email, password and pilotCallsign are required" },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "password must be at least 8 characters" }, { status: 400 });
  }

  const existing = await db.user.findFirst({ where: { OR: [{ email }, { pilotCallsign }] } });
  if (existing) {
    return NextResponse.json({ error: "email or pilotCallsign already in use" }, { status: 409 });
  }

  const user = await db.user.create({
    data: { email, pilotCallsign, passwordHash: hashPassword(password) }
  });

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
}
