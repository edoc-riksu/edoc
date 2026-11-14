import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { withErrorLogging } from "../../../lib/logger";
import { indexCache, PUBLIC_CACHE_HEADERS } from "../../../lib/server/readCache";

// Planets aren't their own table - a planet is just whatever distinct
// planetId values exist on Module (see galaxy map's PLANETS in
// src/galaxy/layout.js for the matching ids/art). This tells the client
// which planets actually have playable content yet.
export const GET = withErrorLogging(async function GET() {
  // Same for every visitor and only changes on a re-seed (plan Day 39).
  const planets = await indexCache.get("planets", async () => {
    const groups = await db.module.groupBy({
      by: ["planetId"],
      _count: { _all: true },
      orderBy: { planetId: "asc" }
    });
    return groups.map((g) => ({ planetId: g.planetId, moduleCount: g._count._all }));
  });
  return NextResponse.json({ planets }, { headers: PUBLIC_CACHE_HEADERS });
}, "GET /api/planets");
