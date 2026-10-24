import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { withErrorLogging } from "../../../lib/logger";

// Lists modules, optionally filtered to one planet, with an encounter
// count for display - never the encounters' own content (see Encounter
// model's comment in schema.prisma for why).
export const GET = withErrorLogging(async function GET(request) {
  const planetId = new URL(request.url).searchParams.get("planet");

  const modules = await db.module.findMany({
    where: planetId ? { planetId } : undefined,
    orderBy: { order: "asc" },
    include: { _count: { select: { encounters: true } } }
  });

  return NextResponse.json({
    modules: modules.map((m) => ({
      slug: m.slug,
      planetId: m.planetId,
      title: m.title,
      order: m.order,
      encounterCount: m._count.encounters
    }))
  });
}, "GET /api/modules");
