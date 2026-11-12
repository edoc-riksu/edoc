import { knownExplorer, EXPLORER_NAMES } from "./suitModels";

/**
 * What the "New suit unlocked" scene shows. Pure functions: no fetching, no state.
 *
 * Real data will come from the progress check the hangar already uses (a suit unlocks when a pilot has cleared every encounter
 * in a module). Until a screen reports that, the scene runs on SUIT_UNLOCK_MOCK, so it can be built and reviewed on its own.
 */

/** Mock data for the Starfarer set, the one suit that is locked today. */
export const SUIT_UNLOCK_MOCK = {
  suit: { id: "starfarer", name: "Starfarer set", blurb: "Deep navy plating with amber trim, made for the long flights past the first planet." },
  moduleName: "Python Basics"
};

/**
 * Props for <SuitUnlocked>. `suit` is { id, name, blurb? }; `moduleName` is the module whose last encounter was just cleared;
 * `explorer` is the pilot's explorer id from their profile (an id the hangar does not know becomes Vega, its default).
 */
export function suitUnlockedProps({ suit, moduleName, explorer } = {}) {
  const name = String(suit?.name || "").trim() || "New suit";
  const mod = String(moduleName || "").trim();
  const explorerId = knownExplorer(explorer);
  return {
    explorerId,
    explorerName: EXPLORER_NAMES[explorerId],
    suitName: name,
    reason: mod ? `You cleared every encounter in ${mod}.` : "You cleared every encounter in a module.",
    blurb: String(suit?.blurb || "").trim() || undefined
  };
}
