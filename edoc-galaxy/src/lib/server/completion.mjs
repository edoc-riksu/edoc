/**
 * Plan Day 29: the data behind a module certificate. Pure, so the live
 * recording (progressStore.js) and the backfill script compute exactly the
 * same numbers from the same attempts.
 *
 * `encounterIds` are the module's encounters. `attempts` are this player's
 * attempts on them: { encounterId, verdict, hintsUsed, elapsedMs, createdAt }.
 * Returns null while any encounter is unsolved. Otherwise the module was
 * completed at the moment its last encounter was first ACCEPTED, and every
 * figure counts only attempts up to that moment, so practising afterwards
 * never changes a certificate.
 */
export function completionSnapshot(encounterIds, attempts) {
  if (encounterIds.length === 0) return null;
  const inModule = new Set(encounterIds);
  const ordered = attempts
    .filter((a) => inModule.has(a.encounterId))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const firstAccepted = new Map();
  const firstVerdict = new Map();
  for (const a of ordered) {
    if (!firstVerdict.has(a.encounterId)) firstVerdict.set(a.encounterId, a.verdict);
    if (a.verdict === "ACCEPTED" && !firstAccepted.has(a.encounterId)) {
      firstAccepted.set(a.encounterId, new Date(a.createdAt));
    }
  }
  if (firstAccepted.size < inModule.size) return null;

  const completedAt = new Date(Math.max(...[...firstAccepted.values()].map((d) => d.getTime())));
  const upToCompletion = ordered.filter((a) => new Date(a.createdAt) <= completedAt);

  return {
    encounterCount: inModule.size,
    attemptCount: upToCompletion.length,
    firstTryCount: [...firstVerdict.values()].filter((v) => v === "ACCEPTED").length,
    hintsUsed: upToCompletion.reduce((sum, a) => sum + (a.hintsUsed || 0), 0),
    elapsedMs: upToCompletion.reduce((sum, a) => sum + (a.elapsedMs || 0), 0),
    completedAt
  };
}
