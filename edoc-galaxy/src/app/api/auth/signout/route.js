import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "../../../../lib/server/sessionToken";
import { withErrorLogging } from "../../../../lib/logger";

export const POST = withErrorLogging(async function POST() {
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
  return response;
}, "POST /api/auth/signout");
