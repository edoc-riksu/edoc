import { fbm, smooth, clamp } from "./rng";

/** A lit planet sprite: banded green land and cloud, a soft terminator and a thin atmosphere on the limb. */
export function makeWorld(seed, size = 512, hue = 0) {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const img = g.createImageData(size, size);
  const d = img.data;
  const half = size / 2;
  const L = [-0.55, -0.5, 0.67];
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = (i - half) / (half * 0.96), y = (j - half) / (half * 0.96);
      const rr = Math.hypot(x, y);
      if (rr > 1.02) continue;
      const cov = 1 - smooth(0.995, 1.0, rr);
      const nz = Math.sqrt(Math.max(0, 1 - Math.min(1, rr * rr)));
      // sphere-mapped coordinates so the pattern bends around the limb
      const u = Math.asin(clamp(x, -1, 1)) * 1.6, v = Math.asin(clamp(y, -1, 1)) * 1.6;
      const warp = fbm(u * 1.6, v * 1.6, seed, 4);
      const land = fbm(u * 2.2 + warp * 1.6, v * 2.2 - warp, seed + 3, 5);
      const cloud = smooth(0.5, 0.85, fbm(u * 3.2 + warp * 2.2, v * 6 + warp * 3, seed + 8, 5));
      // colours: deep teal sea, green land, pale cloud
      let r = 14 + land * 40, gC = 70 + land * 120, b = 70 + land * 46;
      if (land > 0.55) { r += (land - 0.55) * 160; gC += (land - 0.55) * 90; b -= (land - 0.55) * 40; }
      r = r + (232 - r) * cloud * 0.55; gC = gC + (246 - gC) * cloud * 0.55; b = b + (238 - b) * cloud * 0.55;
      const dif = clamp(x * L[0] + y * L[1] + nz * L[2], 0, 1);
      const shade = 0.12 + Math.pow(dif, 0.85) * 1.0;
      const atm = Math.pow(1 - nz, 2.6);
      const k = (i + j * size) * 4;
      d[k] = clamp(r * shade + atm * 70 * (0.3 + dif), 0, 255);
      d[k + 1] = clamp(gC * shade + atm * 235 * (0.3 + dif), 0, 255);
      d[k + 2] = clamp(b * shade + atm * 200 * (0.3 + dif), 0, 255);
      d[k + 3] = cov * 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}
