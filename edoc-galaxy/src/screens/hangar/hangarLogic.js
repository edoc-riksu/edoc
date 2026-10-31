/**
 * Pure helpers for the Hangar panel's card/button states, kept free of
 * React and the DOM so they can run under the project's existing
 * node-environment vitest setup (no jsdom/@testing-library dependency).
 */

export function getUnlockDetail(moduleStats) {
  if (!moduleStats) return "finish a module";
  return `finish a module (${moduleStats.done} of ${moduleStats.total} modules done)`;
}

/** Priority: locked beats equipped beats previewed beats available — a
 * locked suit always shows as locked even while it's being previewed. */
export function getCardVisualState({ locked, isEquipped, isPreviewed }) {
  if (locked) return "locked";
  if (isEquipped) return "equipped";
  if (isPreviewed) return "selected";
  return "available";
}

/** Priority: equipped beats locked — a suit the player already has equipped
 * must never read as "Locked" just because the unlock check hasn't caught
 * up yet (e.g. a starfarer suit re-checking its unlock state right after a
 * reload, before the equipped preview is confirmed still unlocked). */
export function getEquipButtonState({ previewLocked, previewMatchesEquipped }) {
  if (previewMatchesEquipped) return { label: "Equipped", disabled: true, locked: false };
  if (previewLocked) return { label: "Locked", disabled: true, locked: true };
  return { label: "Equip", disabled: false, locked: false };
}
