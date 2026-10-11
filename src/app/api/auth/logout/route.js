import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "../../../../lib/session";
import { withErrorLogging } from "../../../../lib/logger";

export const POST = withErrorLogging(async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", { httpOnly: true, maxAge: 0, path: "/" });
  return response;
}, "POST /api/auth/logout");
