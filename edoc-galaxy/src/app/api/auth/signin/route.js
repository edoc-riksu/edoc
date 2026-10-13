import { NextResponse } from "next/server";
import { verifyCredentials } from "../../../../lib/server/authStore";
import { createSessionToken, SESSION_COOKIE_NAME, maxAgeForRemember } from "../../../../lib/server/sessionToken";
import { rateLimit, getClientIp } from "../../../../lib/server/rateLimit";
import { normalizeEmail } from "../../../../lib/authValidation";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "invalid_credentials" }, { status: 401 });
  }

  const email = normalizeEmail(body?.email);
  const password = typeof body?.password === "string" ? body.password : "";
  const remember = body?.remember === true;

  const ip = getClientIp(request);
  const limited = rateLimit(`signin:${ip}:${email || "unknown"}`, { limit: 8, windowMs: 10 * 60 * 1000 });
  if (!limited.allowed) {
    return NextResponse.json({ retryAfter: Math.ceil(limited.retryAfterMs / 1000) }, { status: 429 });
  }

  const user = verifyCredentials(email, password);
  if (!user) {
    return NextResponse.json({ code: "invalid_credentials" }, { status: 401 });
  }

  const response = NextResponse.json({ user }, { status: 200 });
  response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(email, { remember }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeForRemember(remember)
  });
  return response;
}
