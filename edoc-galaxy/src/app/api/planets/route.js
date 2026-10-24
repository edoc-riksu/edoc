import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { withErrorLogging } from "../../../lib/logger";

// Planets aren't their own table - a planet is just whatever distinct
// planetId values exist on Module (see galaxy map's PLANETS in
// src/galaxy/layout.js for the matching ids/art). This tells the client
// which planets actually have playable content yet.
export const GET = withErrorLogging(async function GET() {
  const groups = await db.module.groupBy({
    by: ["planetId"],
    _count: { _all: true },
    orderBy: { planetId: "asc" }
  });

  const planets = groups.map((g) => ({ planetId: g.planetId, moduleCount: g._count._all }));
  return NextResponse.json({ planets });
}, "GET /api/planets");
