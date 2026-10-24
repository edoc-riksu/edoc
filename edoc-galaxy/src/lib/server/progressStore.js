import { db } from "../db";

// Progress.sectorId is a planet id (e.g. "python" - matches Module.planetId
// and the galaxy map's PLANETS ids in src/galaxy/layout.js). `level` is how
// many distinct encounters on that planet the player has ever gotten
// ACCEPTED on, out of however many encounters exist there right now.

/**
 * Call after a submission comes back ACCEPTED. Recomputes and saves the
 * player's progress on that encounter's planet. Safe to call for repeat
 * solves - level reflects distinct encounters solved, not attempt count.
 */
export async function recordAcceptedAttempt(userId, encounterId) {
  const encounter = await db.encounter.findUnique({ where: { id: encounterId }, include: { module: true } });
  if (!encounter) return null; // encounter not indexed yet - nothing to credit toward

  const planetId = encounter.module.planetId;

  const solvedEncounterIds = await db.attempt.findMany({
    where: { userId, verdict: "ACCEPTED" },
    select: { encounterId: true },
    distinct: ["encounterId"]
  });

  const planetEncounterIds = new Set(
    (await db.encounter.findMany({ where: { module: { planetId } }, select: { id: true } })).map((e) => e.id)
  );
  const level = solvedEncounterIds.filter((a) => planetEncounterIds.has(a.encounterId)).length;

  return db.progress.upsert({
    where: { userId_sectorId: { userId, sectorId: planetId } },
    update: { level },
    create: { userId, sectorId: planetId, level }
  });
}

/**
 * One module's encounters, each flagged solved or not, for this player -
 * the module completion logic plan Day 17 asks for. `complete` is true
 * once every encounter in the module has been solved at least once.
 */
export async function getModuleProgress(userId, slug) {
  const module_ = await db.module.findUnique({
    where: { slug },
    include: { encounters: { orderBy: { order: "asc" } } }
  });
  if (!module_) return null;

  const solved = new Set(
    (
      await db.attempt.findMany({
        where: { userId, verdict: "ACCEPTED", encounterId: { in: module_.encounters.map((e) => e.id) } },
        select: { encounterId: true },
        distinct: ["encounterId"]
      })
    ).map((a) => a.encounterId)
  );

  const encounters = module_.encounters.map((e) => ({
    id: e.id,
    order: e.order,
    difficulty: e.difficulty,
    concepts: e.concepts,
    title: e.title,
    solved: solved.has(e.id)
  }));

  return {
    slug: module_.slug,
    planetId: module_.planetId,
    title: module_.title,
    encounters,
    solvedCount: solved.size,
    totalCount: encounters.length,
    complete: encounters.length > 0 && solved.size === encounters.length
  };
}

/** Real numbers for the pilot profile screen - plan Day 18. */
export async function getProfileStats(userId) {
  const [totalAttempts, solvedGroups, progress] = await Promise.all([
    db.attempt.count({ where: { userId } }),
    db.attempt.findMany({ where: { userId, verdict: "ACCEPTED" }, select: { encounterId: true }, distinct: ["encounterId"] }),
    db.progress.findMany({ where: { userId }, select: { sectorId: true, level: true } })
  ]);

  const encountersSolved = solvedGroups.length;

  return {
    totalAttempts,
    encountersSolved,
    accuracy: totalAttempts === 0 ? null : Math.round((encountersSolved / totalAttempts) * 100) / 100,
    planets: progress.map((p) => ({ planetId: p.sectorId, level: p.level }))
  };
}
