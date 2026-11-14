import { db } from "../db";
import { completionSnapshot } from "./completion.mjs";
import { masterySummary } from "./mastery";
import { moduleProgress, recentAttempts, starTotals } from "./profileSummary";

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

  const progress = await db.progress.upsert({
    where: { userId_sectorId: { userId, sectorId: planetId } },
    update: { level },
    create: { userId, sectorId: planetId, level }
  });

  await recordModuleCompletion(userId, encounter.module);
  return progress;
}

/**
 * Plan Day 29: once every encounter in the module is solved, save the
 * certificate data for it (see the Completion model). Written once: a later
 * call for an already-completed module leaves the first record untouched.
 */
export async function recordModuleCompletion(userId, module_) {
  const encounters = await db.encounter.findMany({ where: { moduleId: module_.id }, select: { id: true } });
  const encounterIds = encounters.map((e) => e.id);
  const attempts = await db.attempt.findMany({
    where: { userId, encounterId: { in: encounterIds } },
    select: { encounterId: true, verdict: true, hintsUsed: true, elapsedMs: true, createdAt: true }
  });

  const snapshot = completionSnapshot(encounterIds, attempts);
  if (!snapshot) return null;

  return db.completion.upsert({
    where: { userId_moduleSlug: { userId, moduleSlug: module_.slug } },
    update: {},
    create: { userId, moduleSlug: module_.slug, planetId: module_.planetId, ...snapshot }
  });
}

/**
 * One module's encounters, each flagged solved or not, for this player -
 * the module completion logic plan Day 17 asks for. `complete` is true
 * once every encounter in the module has been solved at least once.
 * `attempts` is every attempt regardless of verdict, so the module detail
 * screen (plan Day 30) can tell "never opened" from "tried, not solved
 * yet" instead of just solved/unsolved.
 */
export async function getModuleProgress(userId, slug) {
  const module_ = await db.module.findUnique({
    where: { slug },
    include: { encounters: { orderBy: { order: "asc" } } }
  });
  if (!module_) return null;

  const allAttempts = await db.attempt.findMany({
    where: { userId, encounterId: { in: module_.encounters.map((e) => e.id) } },
    select: { encounterId: true, verdict: true }
  });

  const solved = new Set();
  const attemptCount = new Map();
  for (const a of allAttempts) {
    attemptCount.set(a.encounterId, (attemptCount.get(a.encounterId) || 0) + 1);
    if (a.verdict === "ACCEPTED") solved.add(a.encounterId);
  }

  const encounters = module_.encounters.map((e) => ({
    id: e.id,
    order: e.order,
    difficulty: e.difficulty,
    concepts: e.concepts,
    title: e.title,
    solved: solved.has(e.id),
    attempts: attemptCount.get(e.id) || 0
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

/**
 * The Starfarer suit unlocks once a pilot has fully solved every encounter
 * in at least one module - checked server-side, not just hidden behind a
 * disabled button in the UI, since the Hangar's PATCH could otherwise be
 * called directly to equip it early.
 */
export async function hasCompletedAnyModule(userId) {
  const modules = await db.module.findMany({ select: { id: true }, include: { encounters: { select: { id: true } } } });

  for (const m of modules) {
    if (m.encounters.length === 0) continue;
    const solved = await db.attempt.findMany({
      where: { userId, verdict: "ACCEPTED", encounterId: { in: m.encounters.map((e) => e.id) } },
      select: { encounterId: true },
      distinct: ["encounterId"]
    });
    if (solved.length === m.encounters.length) return true;
  }
  return false;
}

/**
 * Whether each module is locked for this player - plan Day 22. A module
 * unlocks once the previous module on the same planet (by order) is fully
 * complete; the first module on each planet is always unlocked. This is
 * display-only progression, not an access gate - practice is never locked
 * (product spec rule), so nothing here stops a request to play or submit
 * any encounter directly regardless of this flag.
 */
export async function getModuleLockState(userId) {
  const modules = await db.module.findMany({
    orderBy: [{ planetId: "asc" }, { order: "asc" }],
    include: { encounters: { select: { id: true } } }
  });

  const solved = userId
    ? new Set(
        (
          await db.attempt.findMany({
            where: { userId, verdict: "ACCEPTED" },
            select: { encounterId: true },
            distinct: ["encounterId"]
          })
        ).map((a) => a.encounterId)
      )
    : new Set();

  const isComplete = (m) => m.encounters.length > 0 && m.encounters.every((e) => solved.has(e.id));

  const lockBySlug = new Map();
  let previousInPlanet = null;
  let previousPlanetId = null;
  for (const m of modules) {
    if (m.planetId !== previousPlanetId) {
      lockBySlug.set(m.slug, false);
      previousPlanetId = m.planetId;
    } else {
      lockBySlug.set(m.slug, !isComplete(previousInPlanet));
    }
    previousInPlanet = m;
  }
  return lockBySlug;
}

/**
 * Per-concept mastery across all seeded encounters - plan Day 23. `mastery`
 * is just solved/total for encounters tagged with that concept; concepts
 * come from real encounter data (Encounter.concepts), never invented ones.
 */
export async function getConceptMastery(userId) {
  const encounters = await db.encounter.findMany({ select: { id: true, concepts: true } });

  const solved = new Set(
    (
      await db.attempt.findMany({
        where: { userId, verdict: "ACCEPTED" },
        select: { encounterId: true },
        distinct: ["encounterId"]
      })
    ).map((a) => a.encounterId)
  );

  const byConcept = new Map();
  for (const e of encounters) {
    for (const concept of e.concepts) {
      const entry = byConcept.get(concept) || { total: 0, solved: 0 };
      entry.total += 1;
      if (solved.has(e.id)) entry.solved += 1;
      byConcept.set(concept, entry);
    }
  }

  return Array.from(byConcept.entries())
    .map(([concept, { total, solved: solvedCount }]) => ({
      concept,
      solved: solvedCount,
      total,
      mastery: total === 0 ? 0 : Math.round((solvedCount / total) * 100) / 100
    }))
    .sort((a, b) => b.mastery - a.mastery || a.concept.localeCompare(b.concept));
}

/** Real numbers for the pilot profile screen - plan Day 18. */
export async function getProfileStats(userId) {
  const [totalAttempts, allAttempts, solvedGroups, progress, concepts, hintsUsedSum, elapsedMsSum, modulesCompleted, modules, completions] = await Promise.all([
    db.attempt.count({ where: { userId } }),
    // Ordered oldest-first per encounter so the first entry seen for each
    // encounterId below is that encounter's actual first attempt.
    db.attempt.findMany({
      where: { userId },
      select: { encounterId: true, verdict: true, stars: true, createdAt: true },
      orderBy: { createdAt: "asc" }
    }),
    db.attempt.findMany({ where: { userId, verdict: "ACCEPTED" }, select: { encounterId: true }, distinct: ["encounterId"] }),
    db.progress.findMany({ where: { userId }, select: { sectorId: true, level: true } }),
    getConceptMastery(userId),
    db.attempt.aggregate({ where: { userId }, _sum: { hintsUsed: true } }),
    db.attempt.aggregate({ where: { userId }, _sum: { elapsedMs: true } }),
    db.completion.count({ where: { userId } }),
    db.module.findMany({
      orderBy: [{ planetId: "asc" }, { order: "asc" }],
      include: { encounters: { select: { id: true, title: true }, orderBy: { order: "asc" } } }
    }),
    db.completion.findMany({ where: { userId }, select: { moduleSlug: true, completedAt: true } })
  ]);

  const encountersSolved = solvedGroups.length;
  const titleById = new Map(modules.flatMap((m) => m.encounters.map((e) => [e.id, e.title])));

  // First-attempt rate: of the encounters this pilot has ever attempted,
  // what fraction were solved on that very first try (not just eventually).
  const firstAttemptByEncounter = new Map();
  for (const a of allAttempts) {
    if (!firstAttemptByEncounter.has(a.encounterId)) firstAttemptByEncounter.set(a.encounterId, a.verdict);
  }
  const attemptedCount = firstAttemptByEncounter.size;
  const firstTryAccepted = Array.from(firstAttemptByEncounter.values()).filter((v) => v === "ACCEPTED").length;

  return {
    totalAttempts,
    encountersSolved,
    firstAttemptRate: attemptedCount === 0 ? null : Math.round((firstTryAccepted / attemptedCount) * 100) / 100,
    planets: progress.map((p) => ({ planetId: p.sectorId, level: p.level })),
    concepts,
    // Plan Day 30: the same concepts grouped for dashboards.
    mastery: masterySummary(concepts),
    modulesCompleted,
    hintsUsed: hintsUsedSum._sum.hintsUsed ?? 0,
    timeCodingMs: elapsedMsSum._sum.elapsedMs ?? 0,
    // Plan Day 36: per-module progress (so the screen needs no request per
    // module), stars earned from the saved ratings, and the latest attempts.
    modules: moduleProgress(modules, new Set(solvedGroups.map((g) => g.encounterId)), completions),
    stars: starTotals(allAttempts, titleById.size),
    recentAttempts: recentAttempts(allAttempts, titleById)
  };
}
