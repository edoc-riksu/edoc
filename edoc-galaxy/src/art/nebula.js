import { fbm, smooth, clamp } from "./rng";

/**
 * Gas clouds as a small pre-rendered canvas (domain-warped noise), scaled up when drawn so the edges stay soft.
 * `stops` are [r,g,b] colours the cloud moves between; `density` is how much of the sky it covers.
 */
export function makeNebula(seed, w = 320, h = 180, stops = [[18, 90, 96], [60, 170, 140], [80, 70, 150]], density = 0.5, strength = 0.8) {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  const img = g.createImageData(w, h);
  const d = img.data;
  const s = 3.2 / Math.max(w, h);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const x = i * s, y = j * s;
      const qx = fbm(x + 0.0, y + 0.0, seed, 4);
      const qy = fbm(x + 5.2, y + 1.3, seed + 1, 4);
      const v = fbm(x + 2.4 * qx, y + 2.4 * qy, seed + 2, 5);
      const dens = smooth(1 - density - 0.12, 1 - density + 0.28, v);
      const m = fbm(x * 1.4 + qy, y * 1.4 + qx, seed + 6, 3);
      const t = clamp(m * 2, 0, 2);
      const a = Math.floor(t), b = Math.min(stops.length - 1, a + 1), f = t - a;
      const ca = stops[Math.min(a, stops.length - 1)], cb = stops[b];
      const k = (i + j * w) * 4;
      d[k] = ca[0] + (cb[0] - ca[0]) * f;
      d[k + 1] = ca[1] + (cb[1] - ca[1]) * f;
      d[k + 2] = ca[2] + (cb[2] - ca[2]) * f;
      d[k + 3] = dens * strength * 255 * (0.55 + 0.45 * fbm(x * 6, y * 6, seed + 9, 3));
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}
