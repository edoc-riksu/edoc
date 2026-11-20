import { geom } from "../../art/surface";

/**
 * Where the explorer stands on the surface, in screen pixels, for a window W x h.
 *
 * The ship's place comes from the surface scene itself (art/surface.js `geom`), so the explorer always stands on the same ground
 * as the ship: just behind its tail on wide windows (the card sits in the middle, so the left is free), and just in front of its
 * nose on a phone. { left, top, width, height } is the box the figure is drawn in; its feet are at the bottom of the box.
 * `toward` is how far the figure turns (radians) so it looks at the ship.
 */
export function explorerSpot(W, h) {
  const G = geom(W, h);
  const portrait = G.W / G.h < 0.85;
  const height = Math.round(150 * G.s);
  const width = Math.round(height * 0.56);
  const feet = Math.round(G.gy + h * (portrait ? 0.045 : 0.03));
  const raw = portrait ? G.shipX + 84 * G.s + width * 0.5 : G.shipX - 101 * G.s;
  const cx = Math.min(W - width / 2 - 8, Math.max(width / 2 + 8, raw));
  return { left: Math.round(cx - width / 2), top: feet - height, width, height, toward: portrait ? -0.35 : 0.35 };
}
