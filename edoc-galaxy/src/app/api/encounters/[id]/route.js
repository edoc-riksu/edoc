import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { withErrorLogging } from "../../../../lib/logger";
import { indexCache, PUBLIC_CACHE_HEADERS } from "../../../../lib/server/readCache";

// Index-only lookup for one encounter - which module it's in, its order,
// difficulty, concepts and title. For the actual problem/tests, call
// Backend 1's execution service directly (GET /api/v1/encounters/{id});
// this route never returns problem text or test cases.
export const GET = withErrorLogging(async function GET(request, { params }) {
  const { id } = await params;

  // Index data, the same for every visitor (plan Day 39). An unknown id is
  // cached too, so repeated bad ids don't each cost a query.
  const encounter = await indexCache.get(`encounter:${id}`, () =>
    db.encounter.findUnique({ where: { id }, include: { module: true } })
  );

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
  }, { headers: PUBLIC_CACHE_HEADERS });
}, "GET /api/encounters/[id]");
