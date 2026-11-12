/**
 * The three hint levels, and how each one looks. A pilot should be able to tell them apart at a glance, and not by colour alone:
 * each level has its own colour, its own number of filled pips (1, 2, 3), its own icon shape and its own word.
 *
 *   1  Nudge        a small push in the right direction     teal    1 pip   ◦  dot
 *   2  Clue         points at the part that matters         amber   2 pips  ◈  diamond
 *   3  Walkthrough  shows the way, nearly the whole answer  coral   3 pips  ▲  triangle
 *
 * Use with src/art/companion.css: <div className={`hl hl-${level.id}`}> ... see HintLevelCard.js.
 */
export const HINT_LEVELS = [
  { id: 1, key: "nudge", name: "Nudge", pips: 1, color: "#5eead4", rgb: "94,234,212", icon: "dot", blurb: "A small push in the right direction." },
  { id: 2, key: "clue", name: "Clue", pips: 2, color: "#f3b25c", rgb: "243,178,92", icon: "diamond", blurb: "Points at the part that matters." },
  { id: 3, key: "walkthrough", name: "Walkthrough", pips: 3, color: "#ff8f7a", rgb: "255,143,122", icon: "triangle", blurb: "Shows the way, nearly the whole answer." }
];

/** The level for a 0-based index (the order hints are revealed in), or null. */
export const levelAt = (i) => HINT_LEVELS[i] || null;

/** The level reached after `revealed` hints have been shown (0 = none yet). */
export const levelReached = (revealed) => HINT_LEVELS[Math.min(Math.max(revealed, 0), HINT_LEVELS.length) - 1] || null;
