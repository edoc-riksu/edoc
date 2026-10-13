/**
 * Small value-noise toolkit. Everything the galaxy paints (planet skins,
 * nebula smoke) comes from this, so there are no image files to load.
 */
function hash(ix, iy, seed) {
  let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 2147483629)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

const smooth = (t) => t * t * (3 - 2 * t);

/** Value noise. With `period` > 0 the x axis wraps, so textures tile sideways. */
function valueNoise(x, y, seed, period) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const wrap = period > 0 ? (ix) => ((ix % period) + period) % period : (ix) => ix;
  const a = hash(wrap(x0), y0, seed);
  const b = hash(wrap(x0 + 1), y0, seed);
  const c = hash(wrap(x0), y0 + 1, seed);
  const d = hash(wrap(x0 + 1), y0 + 1, seed);
  const u = smooth(fx);
  const v = smooth(fy);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Fractal noise: several octaves of value noise, 0..1. */
export function fbm(x, y, seed, octaves, period = 0) {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i += 1) {
    sum += amp * valueNoise(x * freq, y * freq, seed + i * 17, period > 0 ? period * freq : 0);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

/**
 * A grey, sideways-tileable skin for a planet (clouds, craters, bands).
 * `bands` stretches the pattern along the equator for gas-giant stripes.
 */
export function makeSkin(w, h, { seed = 1, octaves = 5, scale = 4, contrast = 1.8, bands = 1 } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(w, h);
  const period = scale;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const nx = (x / w) * scale;
      const ny = (y / h) * scale * 0.5 * bands;
      const warp = fbm(nx * 0.7 + 3.1, ny * 0.7 + 1.7, seed + 99, 3, period) - 0.5;
      let v = fbm(nx + warp * 1.6, ny + warp * 1.2, seed, octaves, period);
      v = Math.min(1, Math.max(0, (v - 0.5) * contrast + 0.5));
      const g = Math.round(v * 255);
      const i = (y * w + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = g;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/**
 * Soft smoke for the sky: a small canvas of blue-grey cloud with its own
 * alpha, meant to be stretched over the whole screen. `clouds` places each
 * patch (centre and radius as fractions of the canvas, stretch makes the
 * smoke streak up or sideways).
 */
export function makeNebula(w, h, clouds, seed = 5) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const u = x / w;
      const v = y / h;
      let alpha = 0;
      let dsum = 0;
      let r = 0;
      let g = 0;
      let b = 0;
      for (let k = 0; k < clouds.length; k += 1) {
        const c = clouds[k];
        const dx = (u - c.cx) / c.rx;
        const dy = (v - c.cy) / c.ry;
        const mask = Math.max(0, 1 - (dx * dx + dy * dy));
        if (mask <= 0) continue;
        const n = fbm(u * c.fx, v * c.fy, seed + k * 31, 5);
        const dens = Math.max(0, (n - c.cut) * c.gain) * mask * mask;
        alpha += dens * c.alpha;
        dsum += dens;
        r += dens * c.color[0];
        g += dens * c.color[1];
        b += dens * c.color[2];
      }
      const i = (y * w + x) * 4;
      if (alpha > 0.001) {
        const k = 1 / Math.max(dsum, 1e-4);
        img.data[i] = Math.min(255, r * k);
        img.data[i + 1] = Math.min(255, g * k);
        img.data[i + 2] = Math.min(255, b * k);
        img.data[i + 3] = Math.min(255, alpha * 255);
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}
