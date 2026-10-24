import { rng, TAU, clamp, lerp, smooth, fbm } from "./rng";
import { makeAsteroid } from "./asteroid";
import { makeNebula } from "./nebula";
import { makeWorld } from "./world";
import { makeStars, drawStars, grain, glow } from "./scenes";
import { FINAL_TILT, SINK, lowest, drawLander, drawSmoke, drawFurrow } from "./lander";

/**
 * The planet's surface at dusk: a ringed neighbour planet and a low sun over three ridges of mountains,
 * glowing crystal spires, a dusty plain, and the ship where it came down. Everything is drawn in code.
 * S = { t, calm, px, py, hover } plus optional { severity (0..2), scroll (px), drop (0..1) }.
 */
/** How far the land has scrolled when the ship stops: the surface scene starts from here so the landing and the surface match. */
export const endScroll = (h) => (2600 * h) / 768;

export function geom(W, h) {
  const portrait = W / h < 0.85;
  const gy = h * (portrait ? 0.66 : 0.8);
  return {
    W,
    h,
    vw: Math.max(W, h * 1.6),
    off: -(Math.max(W, h * 1.6) - W) * 0.3,
    hz: gy - h * 0.22,
    gy,
    s: (h / 768) * (portrait ? 1.3 : 1.7),
    shipX: portrait ? W * 0.5 : W * 0.2
  };
}

export function makeSurface(seed = 21) {
  const r = rng(seed);
  const ridges = [0, 1, 2].map((k) => {
    const n = 240;
    const a = new Float32Array(n + 1);
    for (let i = 0; i <= n; i++) a[i] = 0.7 * fbm((i / n) * (3 + k * 2.6) + k * 11, k * 3.7 + 0.5, seed + k * 5, 6) + 0.3 * fbm((i / n) * (14 + k * 6), k + 0.2, seed + k * 9, 3);
    return a;
  });
  const crystals = Array.from({ length: 16 }, () => ({
    x: r(),
    s: 0.6 + r() * 1.1,
    ph: r() * TAU,
    shards: Array.from({ length: 3 + Math.floor(r() * 3) }, (_, i) => ({ dx: (i - 1.5) * (7 + r() * 5) + (r() - 0.5) * 6, w: 5 + r() * 5, hgt: 24 + r() * 46 - i * 2, tilt: (r() - 0.5) * 12 }))
  }));
  const dust = Array.from({ length: 70 }, () => ({ x: r(), y: r(), z: 0.3 + r() * 0.7, ph: r() * TAU, sp: 0.2 + r() * 0.6 }));
  let ground = null, rocks = [];
  if (typeof document !== "undefined") {
    ground = makeGround(seed + 9);
    rocks = Array.from({ length: 9 }, (_, i) => {
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      const g = c.getContext("2d");
      g.drawImage(makeAsteroid(seed * 7 + i, 128, i % 3), 0, 0);
      g.globalCompositeOperation = "source-atop";
      g.fillStyle = "rgba(6,22,30,0.5)";
      g.fillRect(0, 0, 128, 128);
      return { img: c, x: r(), y: Math.pow(r(), 1.2), z: 0.5 + r() * 0.7, flip: r() < 0.5 };
    });
  }
  return {
    seed,
    ridges,
    crystals,
    dust,
    ground,
    rocks,
    stars: makeStars(seed + 1, 300),
    nebula: makeNebula(seed + 2, 400, 200, [[10, 52, 70], [34, 120, 120], [64, 56, 120]], 0.5, 0.75),
    moon: makeWorld(seed + 5, 360)
  };
}

/** A dusty ground texture, three tiles wide (original, mirrored, original) so it scrolls without a seam. */
function makeGround(seed) {
  const tw = 900, th = 240;
  const hts = new Float32Array(tw * th);
  for (let j = 0; j < th; j++) {
    for (let i = 0; i < tw; i++) {
      const dune = 0.5 + 0.5 * Math.sin(i * 0.011 + fbm(i * 0.004, j * 0.01, seed + 5, 3) * 7);
      hts[i + j * tw] = 0.55 * fbm(i * 0.005, j * 0.012, seed, 5) + 0.25 * fbm(i * 0.02, j * 0.05, seed + 3, 4) + 0.14 * dune;
    }
  }
  const tile = document.createElement("canvas");
  tile.width = tw;
  tile.height = th;
  const tg = tile.getContext("2d");
  const im = tg.createImageData(tw, th);
  const d = im.data;
  for (let j = 0; j < th; j++) {
    for (let i = 0; i < tw; i++) {
      const hh = hts[i + j * tw];
      const hl = hts[Math.max(0, i - 3) + j * tw], hr = hts[Math.min(tw - 1, i + 3) + j * tw];
      const slope = (hl - hr) * 3.4; // light comes from the right, where the sun is
      const shade = clamp(0.74 + slope + (hh - 0.5) * 0.3, 0.36, 1.25);
      const warm = fbm(i * 0.006, j * 0.014, seed + 6, 3);
      const grit = 0.94 + 0.12 * fbm(i * 0.3, j * 0.35, seed + 8, 2);
      const k = (i + j * tw) * 4;
      d[k] = clamp((70 + warm * 70) * shade * grit, 0, 255);
      d[k + 1] = clamp((100 + warm * 40) * shade * grit, 0, 255);
      d[k + 2] = clamp((98 + warm * 6) * shade * grit, 0, 255);
      d[k + 3] = 255;
    }
  }
  tg.putImageData(im, 0, 0);
  // pebbles: a dark shadow on the left, a light top on the right
  const r = rng(seed + 11);
  for (let n = 0; n < 340; n++) {
    const x = r() * tw, y = r() * th, rad = 1 + r() * r() * 5;
    tg.fillStyle = "rgba(14,28,30,0.5)";
    tg.beginPath();
    tg.ellipse(x - rad * 0.6, y + rad * 0.5, rad * 1.2, rad * 0.75, 0, 0, TAU);
    tg.fill();
    tg.fillStyle = `rgba(${150 + r() * 40},${172 + r() * 30},${150 + r() * 20},0.7)`;
    tg.beginPath();
    tg.ellipse(x, y, rad, rad * 0.7, 0, 0, TAU);
    tg.fill();
  }
  const c = document.createElement("canvas");
  c.width = tw * 3;
  c.height = th;
  const g = c.getContext("2d");
  g.drawImage(tile, 0, 0);
  g.save();
  g.translate(tw * 2, 0);
  g.scale(-1, 1);
  g.drawImage(tile, 0, 0);
  g.restore();
  g.drawImage(tile, tw * 2, 0);
  c.tw = tw;
  c.th = th;
  return c;
}

/* ------------------------------------------------------------------ */
/* sky                                                                 */
/* ------------------------------------------------------------------ */
export function drawSky(g, W, h, A, S, G, alpha = 1, full = false) {
  const { t, calm, px, py } = S;
  const { vw, off, hz } = G;
  g.save();
  g.globalAlpha = alpha;
  const sky = g.createLinearGradient(0, 0, 0, hz + h * 0.06);
  sky.addColorStop(0, "#050b1b");
  sky.addColorStop(0.45, "#0a2338");
  sky.addColorStop(0.8, "#1f5a58");
  sky.addColorStop(1, "#6fae8c");
  g.fillStyle = sky;
  g.fillRect(0, 0, W, hz + h * 0.08);
  if (full) {
    // below the horizon: haze, for the stretch of the descent before the ground comes up
    const hg = g.createLinearGradient(0, hz + h * 0.08, 0, h);
    hg.addColorStop(0, "#6fae8c");
    hg.addColorStop(1, "#2c6e66");
    g.fillStyle = hg;
    g.fillRect(0, hz + h * 0.08, W, h);
  }
  g.translate(off, 0);
  g.save();
  g.globalAlpha = alpha * 0.8;
  g.drawImage(A.nebula, -vw * 0.03 + px * vw * 0.01 - (calm ? 0 : (t * 2) % (vw * 0.03)), -h * 0.02 + py * h * 0.008, vw * 1.08, hz * 1.05);
  g.restore();
  // stars thin out toward the horizon
  g.save();
  g.beginPath();
  g.rect(0, 0, vw, hz * 0.8);
  g.clip();
  drawStars(g, vw, hz, A.stars, calm ? 0 : t, 0, px, py);
  g.restore();
  // the sun, low on the right
  const sx = vw * 0.74 + px * vw * 0.006, sy = hz - h * 0.11;
  glow(g, sx, sy, h * 0.75, "255,226,150", 0.2);
  glow(g, sx, sy, h * 0.3, "255,240,190", 0.34);
  g.fillStyle = "rgba(255,248,214,0.95)";
  g.beginPath();
  g.arc(sx, sy, h * 0.026, 0, TAU);
  g.fill();
  // a ringed neighbour planet in the upper left
  const mx = vw * 0.2 + px * vw * 0.012, my = h * 0.27 + py * h * 0.01, R = h * 0.115;
  const ring = (front) => {
    g.save();
    g.translate(mx, my);
    g.rotate(-0.26);
    g.beginPath();
    g.rect(-R * 3, front ? 0 : -R * 3, R * 6, R * 3);
    g.clip();
    for (const [rad, wd, a, c] of [[1.55, 0.1, 0.5, "236,226,190"], [1.8, 0.2, 0.34, "200,214,200"], [2.1, 0.06, 0.46, "240,232,205"]]) {
      g.strokeStyle = `rgba(${c},${a})`;
      g.lineWidth = R * wd;
      g.beginPath();
      g.ellipse(0, 0, R * rad, R * rad * 0.26, 0, 0, TAU);
      g.stroke();
    }
    g.restore();
  };
  ring(false);
  glow(g, mx, my, R * 2.4, "130,210,255", 0.14);
  if (A.moon) g.drawImage(A.moon, mx - R, my - R, R * 2, R * 2);
  ring(true);
  g.restore();
}

/* ------------------------------------------------------------------ */
/* land: ridges, spires, the plain and the rocks in front of it       */
/* ------------------------------------------------------------------ */
function ridgePath(g, a, vw, y0, amp, shiftX) {
  const n = a.length - 1;
  g.beginPath();
  g.moveTo(-10, y0 + amp + 10);
  for (let i = 0; i <= n; i += 1) {
    const x = (i / n) * vw + shiftX;
    g.lineTo(x, y0 - a[i] * amp);
  }
  g.lineTo(vw + 10, y0 + amp + 10);
  g.closePath();
}

export function drawLand(g, W, h, A, S, G, o = {}) {
  const { t, calm, px, py } = S;
  const { vw, off, hz, gy } = G;
  const scroll = o.scroll || 0;
  const alpha = o.alpha == null ? 1 : o.alpha;
  const drop = (1 - alpha) * h * 0.45;
  if (alpha <= 0.002) return;
  g.save();
  g.globalAlpha = alpha;
  g.translate(off, drop);
  const haze = [[40, 92, 104], [22, 58, 74], [11, 34, 48]];
  const amps = [h * 0.3, h * 0.2, h * 0.12];
  const base = [hz + h * 0.01, hz + h * 0.03, hz + h * 0.06];
  const par = [0.04, 0.1, 0.22];
  for (let k = 0; k < 3; k++) {
    const sh = px * vw * 0.01 * (k + 1) - scroll * par[k];
    g.save();
    ridgePath(g, A.ridges[k], vw * 1.1, base[k], amps[k], sh - vw * 0.05);
    const gr = g.createLinearGradient(0, base[k] - amps[k], 0, base[k] + 8);
    const c = haze[k];
    gr.addColorStop(0, `rgb(${c[0] + 18},${c[1] + 24},${c[2] + 24})`);
    gr.addColorStop(1, `rgb(${c[0]},${c[1]},${c[2]})`);
    g.fillStyle = gr;
    g.fill();
    g.clip();
    // light catching the slopes that face the sun
    g.strokeStyle = `rgba(190,245,215,${0.16 + k * 0.05})`;
    g.lineWidth = 1.4;
    g.stroke();
    // the haze at the foot of each ridge
    const hg = g.createLinearGradient(0, base[k] - amps[k] * 0.1, 0, base[k] + 14);
    hg.addColorStop(0, "rgba(120,190,160,0)");
    hg.addColorStop(1, `rgba(130,200,170,${0.5 - k * 0.14})`);
    g.fillStyle = hg;
    g.fillRect(0, base[k] - amps[k] * 0.1, vw * 1.2, amps[k] * 0.1 + 20);
    g.restore();
  }

  // crystal spires on the plain's far edge
  for (const c of A.crystals) {
    const cx = ((((c.x * vw * 1.2 - scroll * 0.5 + px * vw * 0.018) % (vw * 1.2)) + vw * 1.2) % (vw * 1.2)) - vw * 0.1;
    const cy = hz + h * (0.07 + (c.x * 7 % 1) * 0.07);
    const sc = (h / 768) * c.s;
    const pulse = calm ? 0.6 : 0.55 + 0.4 * Math.sin(t * 1.3 + c.ph);
    glow(g, cx, cy - 20 * sc, 78 * sc, "90,240,215", 0.12 + 0.14 * pulse);
    for (const sd of c.shards) {
      const bx = cx + sd.dx * sc, hh = sd.hgt * sc, w = sd.w * sc, tp = sd.tilt * sc;
      const lit = g.createLinearGradient(bx - w, 0, bx + w, 0);
      lit.addColorStop(0, "rgba(150,255,235,0.95)");
      lit.addColorStop(0.5, "rgba(60,200,200,0.9)");
      lit.addColorStop(0.51, "rgba(18,110,128,0.95)");
      lit.addColorStop(1, "rgba(10,60,86,0.98)");
      g.fillStyle = lit;
      g.beginPath();
      g.moveTo(bx - w, cy);
      g.lineTo(bx + tp - w * 0.2, cy - hh);
      g.lineTo(bx + tp + w * 0.2, cy - hh);
      g.lineTo(bx + w, cy);
      g.closePath();
      g.fill();
      g.fillStyle = `rgba(220,255,248,${0.4 + 0.4 * pulse})`;
      g.beginPath();
      g.arc(bx + tp, cy - hh, 1.6 * sc + 0.6, 0, TAU);
      g.fill();
    }
  }

  // the plain
  const gt = hz + h * 0.07;
  if (A.ground) {
    g.imageSmoothingQuality = "high";
    const N = 26;
    const tw = A.ground.tw, th = A.ground.th;
    for (let i = 0; i < N; i++) {
      const d0 = i / N, d1 = (i + 1) / N;
      const y0 = lerp(gt, h, Math.pow(d0, 1.18)), y1 = lerp(gt, h, Math.pow(d1, 1.18));
      const dm = (d0 + d1) / 2;
      const sv = Math.max(0.35, (y1 - y0) / (th / N)); // how much this strip is stretched vertically; stretch sideways by the same amount
      const sw = Math.min(tw, (vw + 40) / sv);
      const shift = (scroll * lerp(0.28, 1.5, dm) + px * vw * 0.03 * dm) / sv;
      const sx = ((shift % (tw * 2)) + tw * 2) % (tw * 2);
      g.drawImage(A.ground, sx, (i / N) * th, sw, th / N + 1, -20, y0, vw + 40, y1 - y0 + 1.5);
    }
  } else {
    g.fillStyle = "#2a4a4c";
    g.fillRect(0, gt, vw, h);
  }
  const fog = g.createLinearGradient(0, gt - 4, 0, gt + h * 0.2);
  fog.addColorStop(0, "rgba(120,190,160,0.75)");
  fog.addColorStop(1, "rgba(120,190,160,0)");
  g.fillStyle = fog;
  g.fillRect(0, gt - 4, vw, h * 0.22);
  // evening light across the plain from the sun
  glow(g, vw * 0.74, gt + h * 0.02, h * 0.9, "255,224,150", 0.16);
  const dark = g.createLinearGradient(0, h * 0.7, 0, h);
  dark.addColorStop(0, "rgba(4,12,20,0)");
  dark.addColorStop(1, "rgba(4,12,20,0.5)");
  g.fillStyle = dark;
  g.fillRect(0, h * 0.7, vw, h * 0.3);
  g.restore();
}

/** Rocks in front of everything, and drifting dust. Drawn after the ship. */
export function drawForeground(g, W, h, A, S, G, o = {}) {
  const { t, calm, px, py } = S;
  const { vw, off, gy } = G;
  const scroll = o.scroll || 0;
  const alpha = o.alpha == null ? 1 : o.alpha;
  if (alpha <= 0.002) return;
  g.save();
  g.globalAlpha = alpha;
  g.translate(off, (1 - alpha) * h * 0.45);
  for (const k of A.rocks) {
    const y = gy + h * 0.12 + k.y * Math.max(0, h - gy - h * 0.13);
    const size = (h / 768) * (22 + k.y * 80) * k.z;
    const x = ((((k.x * vw * 1.3 - scroll * (0.9 + k.y * 0.9) + px * vw * 0.04 * (0.4 + k.y)) % (vw * 1.3)) + vw * 1.3) % (vw * 1.3)) - vw * 0.15;
    g.save();
    g.translate(x, y);
    if (k.flip) g.scale(-1, 1);
    g.drawImage(k.img, -size, -size * 1.25, size * 2, size * 2);
    g.restore();
  }
  for (const d of A.dust) {
    const x = ((((d.x * vw - (calm ? 0 : t * 12 * d.sp) - scroll * 0.7 * d.z) % vw) + vw) % vw);
    const y = gy - h * 0.2 + d.y * h * 0.5 + (calm ? 0 : Math.sin(t * d.sp + d.ph) * 6);
    g.fillStyle = `rgba(210,235,215,${0.12 + 0.2 * d.z})`;
    g.fillRect(x, y, 1 + d.z * 1.4, 1 + d.z * 1.4);
  }
  g.restore();
}

/* ------------------------------------------------------------------ */
/* the whole surface scene                                             */
/* ------------------------------------------------------------------ */
export function drawSurface(g, W, h, A, S) {
  const { t, calm, px, py } = S;
  const G = geom(W, h);
  const sev = S.severity | 0;
  g.clearRect(0, 0, W, h);
  drawSky(g, W, h, A, S, G);
  const sc = endScroll(h);
  drawLand(g, W, h, A, S, G, { scroll: sc });

  const th = FINAL_TILT[sev];
  const cy = G.gy - (lowest(th) - SINK[sev]) * G.s;
  const sx = G.shipX + px * W * 0.008;
  const gyy = G.gy + py * h * 0.006;
  // contact shadow
  g.save();
  g.fillStyle = "rgba(2,8,12,0.45)";
  g.beginPath();
  g.ellipse(sx, gyy + 2 * G.s, 100 * G.s, 9 * G.s, 0, 0, TAU);
  g.fill();
  g.restore();
  drawFurrow(g, sx - 20 * G.s, gyy + 3 * G.s, G.s, sev, 1);
  if (sev === 2) {
    // earth heaped against the nose
    g.fillStyle = "rgba(20,38,40,0.9)";
    g.beginPath();
    g.ellipse(sx + 80 * G.s, gyy + 4 * G.s, 38 * G.s, 10 * G.s, 0.05, 0, TAU);
    g.fill();
  }
  drawLander(g, sx, cy + (gyy - G.gy), G.s, th, t, calm, { thrust: 0, sev, soot: sev === 0 ? 0 : sev === 1 ? 0.55 : 1, hover: S.hover });
  S.shipBox = { x: sx - 20 * G.s, y: cy - 30 * G.s, rx: 100 * G.s, ry: 62 * G.s };
  if (sev >= 1) drawSmoke(g, sx - 52 * G.s, cy - 10 * G.s, G.s, t, calm, sev === 2 ? 1 : 0.4, sev === 2 ? 0.85 : 0.25);

  drawForeground(g, W, h, A, S, G, { scroll: sc });
  const v = g.createRadialGradient(W / 2, h / 2, h * 0.35, W / 2, h / 2, Math.max(W, h) * 0.72);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.45)");
  g.fillStyle = v;
  g.fillRect(0, 0, W, h);
  grain(g, W, h, calm ? 0 : t, 0.08);
}

export function hitSurface(S, x, y) {
  const b = S.shipBox;
  if (!b) return false;
  const dx = (x - b.x) / b.rx, dy = (y - b.y) / b.ry;
  return dx * dx + dy * dy <= 1;
}
