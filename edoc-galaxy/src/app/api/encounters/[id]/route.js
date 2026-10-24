import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { withErrorLogging } from "../../../../lib/logger";

// Index-only lookup for one encounter - which module it's in, its order,
// difficulty, concepts and title. For the actual problem/tests, call
// Backend 1's execution service directly (GET /api/v1/encounters/{id});
// this route never returns problem text or test cases.
export const GET = withErrorLogging(async function GET(request, { params }) {
  const { id } = await params;

  const encounter = await db.encounter.findUnique({
    where: { id },
    include: { module: true }
  });

  if (!encounter) {
    return NextResponse.json({ error: "encounter not found" }, { status: 404 });
  }

  return NextResponse.json({
    encounter: {
      id: encounter.id,
      module: encounter.module.slug,
      planetId: encounter.module.planetId,
      order: encounter.order,
      difficulty: encounter.difficulty,
      concepts: encounter.concepts,
      title: encounter.title
    }
  });
}, "GET /api/encounters/[id]");
