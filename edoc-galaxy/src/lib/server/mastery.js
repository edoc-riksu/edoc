// Plan Day 30: concept mastery shaped for dashboards (a later campus or
// teacher view, and the profile). Pure: takes getConceptMastery()'s rows,
// [{ concept, solved, total, mastery }], and groups them.

export const MASTERED_AT = 0.8;

export function masterySummary(concepts) {
  const solved = concepts.reduce((sum, c) => sum + c.solved, 0);
  const total = concepts.reduce((sum, c) => sum + c.total, 0);
  const level = (c) => (c.solved === 0 ? "notStarted" : c.mastery >= MASTERED_AT ? "mastered" : "learning");

  const levels = { mastered: [], learning: [], notStarted: [] };
  for (const c of concepts) levels[level(c)].push(c.concept);

  // Ties go to the concept with more encounters, then by name, so the
  // same data always gives the same answer.
  const byMastery = [...concepts]
    .filter((c) => c.total > 0)
    .sort((a, b) => b.mastery - a.mastery || b.total - a.total || a.concept.localeCompare(b.concept));
  const started = byMastery.filter((c) => c.solved > 0);

  return {
    // Share of concept tags solved: an encounter tagged with two concepts
    // counts once for each, as it does in the per-concept rows.
    overall: total === 0 ? 0 : Math.round((solved / total) * 100) / 100,
    masteredAt: MASTERED_AT,
    levels,
    strongest: started[0]?.concept ?? null,
    // The weakest concept the player has started: the one to practise next.
    // Unstarted concepts are listed in levels.notStarted instead.
    weakest: started.length > 1 ? started[started.length - 1].concept : null
  };
}
