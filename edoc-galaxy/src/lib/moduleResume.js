/**
 * "Resume where you left off" (plan Day 31): given a planet's modules in
 * play order, each with its per-encounter solved state (the shape GET
 * /api/modules/{slug}/progress returns), finds the next encounter the
 * player hasn't solved yet. Pure and synchronous so both the module list
 * and the profile screen can reuse it against data they already fetched,
 * rather than each doing their own "what's next" fetch.
 *
 * Returns null once there's nothing left to resume - no modules, or
 * every encounter in every module is already solved.
 */
export function findContinueTarget(moduleProgressList) {
  for (const m of moduleProgressList || []) {
    const next = (m.encounters || []).find((e) => !e.solved);
    if (next) {
      return {
        moduleSlug: m.slug,
        moduleTitle: m.title,
        encounterId: next.id,
        encounterTitle: next.title
      };
    }
  }
  return null;
}
