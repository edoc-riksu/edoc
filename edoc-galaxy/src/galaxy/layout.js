/**
 * Where everything sits.
 *
 * The galaxy is one long route. Planets hang along it, big and close at the
 * front and smaller toward the horizon. Scrolling slides every planet along
 * the route, so the planet in front changes and the others re-scale as they
 * come closer or fall away. Because position and size depend only on how far
 * a planet is from the front (d = index - camera), the first frame matches
 * the reference picture exactly, and every later frame stays consistent.
 */

export const PLANETS = [
  { id: "python", name: "Python", charted: true, mastery: 12, lessons: 8, concept: "Variables", palette: { light: "#c4f7b8", mid: "#45bb7c", dark: "#0e4a40", glow: "#5eead4" }, skin: 0, spin: 0.018 },
  { id: "javascript", name: "JavaScript", charted: false, lessons: 8, palette: { light: "#fde68a", mid: "#e5a323", dark: "#58320a", glow: "#fbbf24" }, skin: 1, spin: 0.024 },
  { id: "typescript", name: "TypeScript", charted: false, lessons: 8, palette: { light: "#bfdbfe", mid: "#3b82f6", dark: "#12265c", glow: "#60a5fa" }, skin: 0, spin: 0.02 },
  { id: "go", name: "Go", charted: false, lessons: 8, palette: { light: "#a5f3fc", mid: "#1fb6d4", dark: "#0b3a52", glow: "#22d3ee" }, skin: 1, spin: 0.03 },
  { id: "rust", name: "Rust", charted: false, lessons: 8, palette: { light: "#fecaca", mid: "#d9503f", dark: "#4a1210", glow: "#f87171" }, skin: 0, spin: 0.016 },
  { id: "sql", name: "SQL", charted: false, lessons: 8, palette: { light: "#ddd6fe", mid: "#8b6cf0", dark: "#2a1860", glow: "#a78bfa" }, skin: 1, spin: 0.022 },
  { id: "far-1", name: null, charted: false, palette: null, skin: 0, spin: 0.02 },
  { id: "far-2", name: null, charted: false, palette: null, skin: 1, spin: 0.026 },
  { id: "far-3", name: null, charted: false, palette: null, skin: 0, spin: 0.018 }
];

/** The grey look of a planet nobody has charted yet. */
export const UNCHARTED = { light: "#9aa1bd", mid: "#59607d", dark: "#232842", glow: "#8892b8" };

/*
 * Route tables: one row per step d = -3 ... 9 from the front planet.
 * Each row is [x, y, radius] in the units of the 1376 x 768 reference
 * picture, measured from the front planet's own position.
 */
const LANDSCAPE = [
  [-520, 420, 190],
  [-380, 290, 130],
  [-200, 150, 100],
  [0, 0, 75],
  [245, -115, 47],
  [453, -182, 41],
  [675, -228, 33],
  [850, -247, 28],
  [1029, -259, 23],
  [1190, -265, 19],
  [1340, -270, 16],
  [1480, -273, 13],
  [1610, -276, 11]
];

/* The same route turned upright for phones: it zig-zags up the screen. */
const PORTRAIT = [
  [-90, 470, 150],
  [-70, 300, 120],
  [-40, 150, 90],
  [0, 0, 70],
  [70, -150, 46],
  [-40, -250, 40],
  [60, -330, 33],
  [-30, -400, 28],
  [50, -460, 23],
  [-10, -510, 19],
  [30, -555, 16],
  [0, -595, 13],
  [20, -630, 11]
];

const D_MIN = -3;
const D_MAX = 9;

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

/** Smoothly sample a route table at distance d from the front planet. */
export function sampleRoute(table, d, out = { x: 0, y: 0, r: 0 }) {
  const k = Math.min(Math.max(d, D_MIN), D_MAX) - D_MIN;
  const i = Math.min(Math.floor(k), table.length - 2);
  const t = k - i;
  const row = (n) => table[Math.min(Math.max(n, 0), table.length - 1)];
  const a = row(i - 1);
  const b = row(i);
  const c = row(i + 1);
  const e = row(i + 2);
  out.x = catmull(a[0], b[0], c[0], e[0], t);
  out.y = catmull(a[1], b[1], c[1], e[1], t);
  // radius changes by ratio, so shrinking looks like distance
  out.r = Math.exp(catmull(Math.log(a[2]), Math.log(b[2]), Math.log(c[2]), Math.log(e[2]), t));
  return out;
}

export const ROUTE_D_MIN = D_MIN;
export const ROUTE_D_MAX = D_MAX;

/**
 * Work out the screen frame for a viewport: orientation, scale, where the
 * front planet sits, and which route table to use.
 */
export function makeFrame(w, h) {
  const portrait = w < 720 || w / h < 0.9;
  if (portrait) {
    const s = Math.min(1.5, Math.max(0.8, w / 420));
    return { portrait, s, table: PORTRAIT, fx: w * 0.5, fy: h * 0.62, step: 150 * s, w, h };
  }
  const s = Math.min(1.8, Math.max(0.5, Math.min(w / 1376, h / 768)));
  return { portrait, s, table: LANDSCAPE, fx: w * (411 / 1376), fy: h * (435 / 768), step: 245 * s, w, h };
}
