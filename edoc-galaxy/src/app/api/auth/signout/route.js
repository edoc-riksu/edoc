import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "../../../../lib/server/sessionToken";

export async function POST() {
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(SESSION_COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
