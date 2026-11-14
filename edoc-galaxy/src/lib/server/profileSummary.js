// Plan Day 36: the rest of what the pilot profile shows, worked out on the
// server so the screen gets it in one request instead of one per module.
// Pure: progressStore.js loads the rows and passes them in.

export const MAX_STARS_PER_ENCOUNTER = 3;
export const RECENT_ATTEMPTS = 5;

/**
 * One row per module, in module order: how many of its encounters the
 * player has solved, and when it was completed (from the Completion record,
 * null until then). `modules` come with their encounter ids.
 */
export function moduleProgress(modules, solvedIds, completions) {
  const completedAt = new Map(completions.map((c) => [c.moduleSlug, c.completedAt]));
  return modules.map((m) => {
    const ids = m.encounters.map((e) => e.id);
    const solved = ids.filter((id) => solvedIds.has(id)).length;
    return {
      slug: m.slug,
      planetId: m.planetId,
      title: m.title,
      solved,
      total: ids.length,
      complete: ids.length > 0 && solved === ids.length,
      completedAt: completedAt.get(m.slug) ?? null
    };
  });
}

/**
 * Stars earned: the best rating on each encounter, added up, so retrying a
 * solved encounter can raise its stars but never count it twice. Out of 3
 * per encounter that exists. Attempts saved before ratings were recorded
 * have no stars and count as 0.
 */
export function starTotals(attempts, encounterCount) {
  const best = new Map();
  for (const a of attempts) {
    if (!Number.isInteger(a.stars)) continue;
    best.set(a.encounterId, Math.max(best.get(a.encounterId) ?? 0, a.stars));
  }
  let earned = 0;
  for (const stars of best.values()) earned += stars;
  return { earned, possible: encounterCount * MAX_STARS_PER_ENCOUNTER };
}

/** The newest attempts, with the encounter title when it is indexed. */
export function recentAttempts(attempts, titleById, limit = RECENT_ATTEMPTS) {
  return [...attempts]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit)
    .map((a) => ({
      encounterId: a.encounterId,
      title: titleById.get(a.encounterId) ?? null,
      verdict: a.verdict,
      stars: Number.isInteger(a.stars) ? a.stars : null,
      createdAt: a.createdAt
    }));
}
