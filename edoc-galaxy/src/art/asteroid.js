import { rng, loopNoise, fbm, smooth, TAU, clamp } from "./rng";

/**
 * One rock, lit per pixel: a lumpy outline, a bumpy height map with craters, and a light from the upper left.
 * Computed once from a seed; scenes just draw the finished sprite. `tint` shifts the rock colour (0 grey, 1 warm, 2 cool).
 */
export function makeAsteroid(seed, size = 256, tint = 0) {
  if (typeof document === "undefined") return null;
  const r = rng(seed);
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const img = g.createImageData(size, size);
  const px = img.data;

  const f1 = loopNoise(r, 4);
  const f2 = loopNoise(r, 3);
  const half = size / 2;
  const R = size * 0.4;
  const stretch = 0.82 + r() * 0.3; // some rocks are longer than they are wide
  const craters = Array.from({ length: 6 + Math.floor(r() * 6) }, () => {
    const a = r() * TAU, d = Math.sqrt(r()) * 0.8;
    return { x: Math.cos(a) * d, y: Math.sin(a) * d, rad: 0.07 + r() * 0.2, depth: 0.25 + r() * 0.5 };
  });
  const ox = r() * 50, oy = r() * 50;

  // height at a point in rock space (-1..1)
  const height = (x, y, edge) => {
    const rr = Math.hypot(x, y);
    let z = Math.sqrt(Math.max(0, 1 - Math.min(1, rr / edge) ** 2)) * 0.9; // dome
    z += (fbm(x * 3.2 + ox, y * 3.2 + oy, seed, 5) - 0.5) * 0.7; // lumps and ridges
    z += (fbm(x * 12 + ox, y * 12 + oy, seed + 9, 3) - 0.5) * 0.12; // fine grit
    for (const k of craters) {
      const d = Math.hypot(x - k.x, y - k.y) / k.rad;
      if (d < 1.35) z += d < 1 ? -k.depth * (1 - d * d) * 0.45 : 0;
      z += Math.exp(-((d - 1.05) ** 2) * 14) * 0.07; // raised rim
    }
    return z;
  };

  const L = [-0.52, -0.58, 0.63];
  const ln = Math.hypot(...L);
  L[0] /= ln; L[1] /= ln; L[2] /= ln;
  const warm = [1, 0.9, 0.78][tint % 3] ?? 1;
  const cool = [1, 0.94, 1.08][tint % 3] ?? 1;

  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = (i - half) / R, y = (j - half) / R;
      const th = Math.atan2(y / stretch, x);
      const edge = 1 + 0.2 * f1(th) + 0.06 * f2(th * 3);
      const rr = Math.hypot(x, y / stretch);
      const cov = 1 - smooth(edge - 1.5 / R, edge + 1.5 / R, rr);
      if (cov <= 0) continue;
      const e = 0.012;
      const h0 = height(x, y, edge);
      const nx = -(height(x + e, y, edge) - height(x - e, y, edge)) / (2 * e) * 0.16;
      const ny = -(height(x, y + e, edge) - height(x, y - e, edge)) / (2 * e) * 0.16;
      const nz = 1;
      const nl = Math.hypot(nx, ny, nz);
      const dif = clamp((nx * L[0] + ny * L[1] + nz * L[2]) / nl, 0, 1);
      // ambient occlusion from how deep a point sits, and darkening toward the limb
      const ao = clamp(0.55 + h0 * 0.55, 0.25, 1.05);
      const limb = 1 - smooth(0.55, 1.05, rr / edge) * 0.55;
      const albedo = 0.55 + (fbm(x * 5 + oy, y * 5 + ox, seed + 3, 4) - 0.5) * 0.55;
      const lit = (0.1 + dif * 1.05) * ao * limb * albedo;
      const rim = smooth(0.82, 1, rr / edge) * clamp(-x * L[0] - y * L[1], 0, 1) * 0.12; // cool back light on the lit edge
      const k = (i + j * size) * 4;
      px[k] = clamp((lit * 205 * warm + rim * 80) , 0, 255);
      px[k + 1] = clamp(lit * 200 + rim * 120, 0, 255);
      px[k + 2] = clamp(lit * 198 * cool + rim * 160, 0, 255);
      px[k + 3] = cov * 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}
