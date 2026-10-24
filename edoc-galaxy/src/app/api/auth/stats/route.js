import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readSessionToken, SESSION_COOKIE_NAME } from "../../../../lib/server/sessionToken";
import { getProfileStats } from "../../../../lib/server/progressStore";
import { withErrorLogging } from "../../../../lib/logger";

// Real numbers for the pilot profile screen - plan Day 18.
export const GET = withErrorLogging(async function GET() {
  const store = await cookies();
  const userId = readSessionToken(store.get(SESSION_COOKIE_NAME)?.value);
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const stats = await getProfileStats(userId);
  return NextResponse.json({ stats });
}, "GET /api/auth/stats");
