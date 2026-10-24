
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "../../../../lib/db";
import {
  readSessionToken,
  SESSION_COOKIE_NAME,
} from "../../../../lib/server/sessionToken";
import { withErrorLogging } from "../../../../lib/logger";

export const GET = withErrorLogging(async function GET(request) {
  const cookieStore = await cookies();
  const userId = readSessionToken(
    cookieStore.get(SESSION_COOKIE_NAME)?.value
  );

  if (!userId) {
    return NextResponse.json(
      { error: "Please sign in to restore your progress." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const encounterId = searchParams.get("encounter_id");

  if (
    !encounterId ||
    !/^[a-z]+-\d{3}$/.test(encounterId)
  ) {
    return NextResponse.json(
      { error: "Invalid encounter ID." },
      { status: 400 }
    );
  }

  const attempts = await db.attempt.findMany({
    where: { userId, encounterId },
    orderBy: { createdAt: "desc" },
    select: {
      verdict: true,
      scoreEarned: true,
      scoreTotal: true,
      runtimeMs: true,
      createdAt: true,
    },
  });

  const latest = attempts[0] ?? null;
  const solved = attempts.some(
    (attempt) => attempt.verdict === "ACCEPTED"
  );

  return NextResponse.json({
    encounterId,
    attempts: attempts.length,
    solved,
    latest: latest
      ? {
          verdict: latest.verdict,
          score: {
            earned: latest.scoreEarned,
            total: latest.scoreTotal,
          },
          runtimeMs: latest.runtimeMs,
          createdAt: latest.createdAt,
        }
      : null,
  });
}, "GET /api/approach/resume");
