import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readSessionToken, SESSION_COOKIE_NAME } from "../../../../lib/server/sessionToken";
import { findById, toPublicUser } from "../../../../lib/server/pilotStore";
import { withErrorLogging } from "../../../../lib/logger";

export const GET = withErrorLogging(async function GET() {
  const store = await cookies();
  const userId = readSessionToken(store.get(SESSION_COOKIE_NAME)?.value);
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const user = await findById(userId);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  return NextResponse.json({ user: toPublicUser(user) });
}, "GET /api/auth/me");
