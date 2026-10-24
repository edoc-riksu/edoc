import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readSessionToken, SESSION_COOKIE_NAME } from "../../../../../lib/server/sessionToken";
import { getModuleProgress } from "../../../../../lib/server/progressStore";
import { withErrorLogging } from "../../../../../lib/logger";

// Per-encounter solved state and overall completion for the signed-in
// player, for one module - plan Day 17's module completion logic.
export const GET = withErrorLogging(async function GET(request, { params }) {
  const store = await cookies();
  const userId = readSessionToken(store.get(SESSION_COOKIE_NAME)?.value);
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { slug } = await params;
  const progress = await getModuleProgress(userId, slug);
  if (!progress) {
    return NextResponse.json({ error: "module not found" }, { status: 404 });
  }

  return NextResponse.json({ progress });
}, "GET /api/modules/[slug]/progress");
