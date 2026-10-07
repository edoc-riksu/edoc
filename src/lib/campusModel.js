/**
 * 🏫 CAMPUS MODE — DATA MODEL ONLY (Phase 02 scope)
 * -------------------------------------------------------------
 * The spec's Campus mode needs an instructor roster, assignments, and a
 * mastery heatmap across a class — all of which assume a real backend
 * (an instructor account, an LTI/LMS grade-passback integration, a
 * roster that isn't just "this one browser"). None of that exists yet,
 * so this phase intentionally ships the *shape* of that data only: no
 * dashboard UI reads from this file yet. It exists so Phase 02's Modes
 * Framework is honest about what "Campus" means structurally, and so a
 * later phase can build the real dashboard against a model that's
 * already settled instead of inventing one under deadline.
 *
 * Everything here is a plain data shape + a couple of pure functions
 * that operate on mock rosters — nothing is wired to pilotProgress or
 * localStorage, on purpose. Campus is a class-of-many concept; a single
 * browser's pilotProgress is a class of one.
 */

/**
 * @typedef {Object} CampusRosterEntry
 * @property {string} pilotId        - Stable id (would be an account id on a real backend)
 * @property {string} callsign
 * @property {string} sectionId      - Which class section they're enrolled in
 * @property {"active"|"invited"|"inactive"} status
 */

/**
 * @typedef {Object} CampusAssignment
 * @property {string} id
 * @property {string} sectionId
 * @property {string} title
 * @property {string} sectorId       - Maps to a PLANETARY_SYSTEM sector id
 * @property {number} dueAt          - epoch ms
 * @property {"core"|"applied"} moduleScope - matches lesson.module in planetarySystem.js
 */

/**
 * @typedef {Object} CampusMasteryCell
 * @property {string} pilotId
 * @property {string} sectorId
 * @property {number} masteryPercent - 0-100, would mirror sectorMastery() per-pilot on a real backend
 */

/**
 * @typedef {Object} CampusSection
 * @property {string} id
 * @property {string} name           - e.g. "Period 3 — Intro to Flight Systems"
 * @property {string} instructorName
 * @property {string[]} rosterIds    - CampusRosterEntry.pilotId values
 */

/** A mock section + roster, entirely illustrative — not persisted, not real enrollment. */
export function mockCampusSection() {
  return {
    id: "section_demo",
    name: "Period 3 — Intro to Flight Systems",
    instructorName: "Cmdr. Reyes",
    rosterIds: ["pilot_1", "pilot_2", "pilot_3", "pilot_4"]
  };
}

/** A mock roster for the demo section — shape-accurate, not tied to any real pilot data. */
export function mockCampusRoster() {
  return [
    { pilotId: "pilot_1", callsign: "Nova_Kestrel", sectionId: "section_demo", status: "active" },
    { pilotId: "pilot_2", callsign: "Drift_Marlow", sectionId: "section_demo", status: "active" },
    { pilotId: "pilot_3", callsign: "Byte_Nebula", sectionId: "section_demo", status: "invited" },
    { pilotId: "pilot_4", callsign: "Vector_Ghost", sectionId: "section_demo", status: "active" }
  ];
}

/** A mock assignment against the Python sector's Core module. */
export function mockCampusAssignment() {
  return {
    id: "assign_demo",
    sectionId: "section_demo",
    title: "Clear the Python Core module",
    sectorId: "Python Engine Core",
    dueAt: Date.now() + 7 * 86400000,
    moduleScope: "core"
  };
}

/**
 * Build a mastery heatmap shape (pilot x sector -> percent) from a roster
 * and a lookup of per-pilot progress. `progressByPilot` would come from a
 * real backend query; here it's just the shape a real one would return.
 * @param {CampusRosterEntry[]} roster
 * @param {Record<string, Record<string, number>>} progressByPilot - pilotId -> pilotProgress-shaped map
 * @param {(sectorId: string, progress: Record<string, number>) => number} masteryFn - e.g. sectorMastery from planetarySystem.js
 * @param {string[]} sectorIds
 * @returns {CampusMasteryCell[]}
 */
export function buildMasteryHeatmap(roster, progressByPilot, masteryFn, sectorIds) {
  const cells = [];
  for (const entry of roster) {
    const progress = progressByPilot[entry.pilotId] || {};
    for (const sectorId of sectorIds) {
      cells.push({
        pilotId: entry.pilotId,
        sectorId,
        masteryPercent: masteryFn(sectorId, progress)
      });
    }
  }
  return cells;
}
