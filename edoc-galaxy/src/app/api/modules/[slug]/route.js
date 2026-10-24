import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { withErrorLogging } from "../../../../lib/logger";

// One module and its ordered encounter list - ids, difficulty, concepts,
// titles only. A client fetches each encounter's actual problem/tests
// from Backend 1's execution service (GET /api/v1/encounters/{id}).
export const GET = withErrorLogging(async function GET(request, { params }) {
  const { slug } = await params;

  const module_ = await db.module.findUnique({
    where: { slug },
    include: { encounters: { orderBy: { order: "asc" } } }
  });

  if (!module_) {
    return NextResponse.json({ error: "module not found" }, { status: 404 });
  }

  return NextResponse.json({
    module: {
      slug: module_.slug,
      planetId: module_.planetId,
      title: module_.title,
      order: module_.order,
      encounters: module_.encounters.map((e) => ({
        id: e.id,
        order: e.order,
        difficulty: e.difficulty,
        concepts: e.concepts,
        title: e.title
      }))
    }
  });
}, "GET /api/modules/[slug]");
