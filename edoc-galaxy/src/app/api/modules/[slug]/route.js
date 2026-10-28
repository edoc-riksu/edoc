import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "../../../../lib/db";
import { readSessionToken, SESSION_COOKIE_NAME } from "../../../../lib/server/sessionToken";
import { getModuleLockState } from "../../../../lib/server/progressStore";
import { withErrorLogging } from "../../../../lib/logger";

// One module and its ordered encounter list - ids, difficulty, concepts,
// titles only. A client fetches each encounter's actual problem/tests
// from Backend 1's execution service (GET /api/v1/encounters/{id}).
// `locked` is display-only progression (plan Day 22, see getModuleLockState).
export const GET = withErrorLogging(async function GET(request, { params }) {
  const { slug } = await params;

  const module_ = await db.module.findUnique({
    where: { slug },
    include: { encounters: { orderBy: { order: "asc" } } }
  });

  if (!module_) {
    return NextResponse.json({ error: "module not found" }, { status: 404 });
  }

  const store = await cookies();
  const userId = readSessionToken(store.get(SESSION_COOKIE_NAME)?.value);
  const lockBySlug = await getModuleLockState(userId);

  return NextResponse.json({
    module: {
      slug: module_.slug,
      planetId: module_.planetId,
      title: module_.title,
      order: module_.order,
      locked: lockBySlug.get(module_.slug) ?? false,
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
