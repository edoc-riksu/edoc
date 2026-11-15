/**
 * What the "Module cleared" scene shows. Pure functions: no fetching, no state.
 *
 * A module is cleared when every one of its encounters has been solved (the same rule the progress check and the hangar use).
 * Until a screen reports that, the scene runs on MODULE_CLEARED_MOCK, so it can be built and reviewed on its own.
 */

/**
 * The module-map painting for each planet (the same file the module map shows; credits in public/art/ORIGIN.md). A planet
 * without one gets the code-drawn night sky behind the medal instead.
 */
const BACKDROPS = { python: "/art/modules/python-surface.jpg" };

/** The painting to show behind the scene for this planet id, or undefined. */
export function backdropFor(planetId) {
  return Object.prototype.hasOwnProperty.call(BACKDROPS, planetId) ? BACKDROPS[planetId] : undefined;
}

/** Mock data: Python Basics, all ten encounters solved, the Starfarer set earned, Loops next. */
export const MODULE_CLEARED_MOCK = {
  module: { slug: "python-basics", title: "Python Basics", encounterCount: 10 },
  planetId: "python",
  planetName: "Python",
  cleared: 10,
  total: 10,
  reward: "New suit unlocked: Starfarer set",
  nextTitle: "Loops"
};

/**
 * Props for <ModuleCleared>.
 *   module      { title, encounterCount? }  the module just finished
 *   cleared     encounters solved (defaults to all of them)
 *   total       encounters in the module (defaults to module.encounterCount)
 *   planetId    picks the painting behind the scene (the module map's own); planetName is shown above the title
 *   reward      one line about what was earned (a suit, say); left out when empty
 *   nextTitle   the next module on the planet, if there is one
 */
export function moduleClearedProps({ module, cleared, total, planetId, planetName, reward, nextTitle } = {}) {
  const count = whole(total ?? module?.encounterCount, 0);
  const done = whole(cleared ?? count, 0);
  const next = String(nextTitle || "").trim();
  return {
    moduleName: String(module?.title || "").trim() || "This module",
    backdrop: backdropFor(planetId),
    planetName: String(planetName || "").trim() || undefined,
    cleared: Math.min(done, count || done),
    total: count,
    reward: String(reward || "").trim() || undefined,
    nextLabel: next ? `Next: ${next}` : "Back to the module map"
  };
}

function whole(n, fallback) {
  const v = Math.round(Number(n));
  return Number.isFinite(v) && v >= 0 ? v : fallback;
}
