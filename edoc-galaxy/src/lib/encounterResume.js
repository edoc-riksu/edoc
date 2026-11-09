"use client";

/**
 * Mid-run persistence the backend has no hook for yet: /api/approach/resume
 * only knows about finished attempts (verdict rows), so hull and an
 * in-progress code buffer would otherwise snap back to their starting
 * values on reload. localStorage only, no per-user scoping - same
 * convention as the app's other settings keys (edoc-galaxy-settings).
 * Hull is tracked per planet (it carries across encounters in one approach
 * run); code is tracked per encounter.
 */

const HULL_PREFIX = "edoc_galaxy_hull_";
const CODE_PREFIX = "edoc_galaxy_code_";
const DEFEAT_PREFIX = "edoc_galaxy_defeat_";

function readNumber(key) {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    const n = raw === null ? NaN : Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function loadRunHull(planetId) {
  return readNumber(HULL_PREFIX + planetId);
}

export function saveRunHull(planetId, hull) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HULL_PREFIX + planetId, String(hull));
  } catch { }
}

export function clearRunHull(planetId) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(HULL_PREFIX + planetId);
  } catch { }
}

export function loadEncounterCode(encounterId) {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(CODE_PREFIX + encounterId);
  } catch {
    return null;
  }
}

export function saveEncounterCode(encounterId, code) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CODE_PREFIX + encounterId, code);
  } catch { }
}

// A hull-out mid-encounter locks the console behind the defeat dialog
// until Rematch is clicked. Without this, reloading at exactly 0 hull
// would drop the player back into a normal, unlocked console.
export function loadDefeat(encounterId) {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DEFEAT_PREFIX + encounterId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveDefeat(encounterId, defeat) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DEFEAT_PREFIX + encounterId, JSON.stringify(defeat));
  } catch { }
}

export function clearDefeat(encounterId) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DEFEAT_PREFIX + encounterId);
  } catch { }
}
