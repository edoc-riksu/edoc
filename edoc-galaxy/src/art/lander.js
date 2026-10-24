import { rng, TAU, lerp } from "./rng";
import { glow, drawShip } from "./scenes";

/**
 * The ship on the ground, and everything that happens around it when it arrives.
 * Severity 0 = smooth touchdown, 1 = rough (skid, sparks, thin smoke), 2 = crash (furrow, fire, black smoke).
 * Tilt is in radians, nose down is positive. All of it is drawn in code.
 */
export const FINAL_TILT = [0, 0.055, 0.16];
export const SINK = [0, 1, 7]; // how far the hull settles into the ground, in ship units

/** How far below the ship's centre its lowest point sits (ship units) when tilted by th. */
export function lowest(th) {
  return Math.max(84 * Math.sin(th), -40 * Math.sin(th) + 52 * Math.cos(th));
}

/** Severity from hull percent. */
export function severityFor(hull) {
  const h = Number.isFinite(hull) ? hull : 100;
  return h >= 70 ? 0 : h >= 35 ? 1 : 2;
}

/** The ship at rest (or mid-descent): hull, scorch marks, a fire if it crashed. cy is the ship's centre. */
export function drawLander(g, x, cy, s, th, t, calm, o = {}) {
  const { thrust = 0, sev = 0, soot = 0, hover = 0 } = o;
  if (hover > 0.01) {
    glow(g, x, cy, 150 * s, "94,234,212", 0.22 * hover);
  }
  drawShip(g, x, cy, s, t, calm, 0, { tilt: th, thrust });
  if (soot > 0.01) {
    g.save();
    g.translate(x, cy);
    g.scale(s, s);
    g.rotate(th);
    const sc = (cx, cyy, rx, ry, a) => {
      const gr = g.createRadialGradient(cx, cyy, 0, cx, cyy, Math.max(rx, ry));
      gr.addColorStop(0, `rgba(10,8,8,${a * soot})`);
      gr.addColorStop(1, "rgba(10,8,8,0)");
      g.fillStyle = gr;
      g.save();
      g.translate(cx, cyy);
      g.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry));
      g.translate(-cx, -cyy);
      g.fillRect(cx - Math.max(rx, ry), cyy - Math.max(rx, ry), Math.max(rx, ry) * 2, Math.max(rx, ry) * 2);
      g.restore();
    };
    sc(-50, 0, 30, 20, 0.7);
    sc(-26, -10, 24, 8, 0.45);
    sc(14, 12, 28, 7, 0.4);
    sc(52, -4, 16, 9, 0.28);
    if (sev >= 2) {
      // a torn seam and a dented plate
      g.strokeStyle = `rgba(8,10,12,${0.8 * soot})`;
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(-8, -22);
      g.lineTo(-3, -12);
      g.lineTo(-11, -5);
      g.lineTo(-4, 4);
      g.lineTo(-12, 12);
      g.stroke();
      g.strokeStyle = `rgba(255,170,70,${0.55 * soot * (calm ? 1 : 0.7 + 0.3 * Math.sin(t * 9))})`;
      g.lineWidth = 0.8;
      g.beginPath();
      g.moveTo(-3, -12);
      g.lineTo(-11, -5);
      g.lineTo(-4, 4);
      g.stroke();
    }
    g.restore();
  }
  if (sev >= 2 && soot > 0.01) {
    // fire at the tail
    const fl = calm ? 1 : 0.75 + 0.25 * Math.sin(t * 11) + 0.12 * Math.sin(t * 27);
    const fx = x - Math.cos(th) * 52 * s, fy = cy - Math.sin(th) * 52 * s - 4 * s;
    glow(g, fx, fy, 70 * s * fl, "255,150,60", 0.55 * soot);
    glow(g, fx, fy, 34 * s * fl, "255,230,170", 0.6 * soot);
  }
}

/** A rising column of smoke from (x, y). k is its strength 0..1, dark = how black it is (0..1), s the scale. */
export function drawSmoke(g, x, y, s, t, calm, k, dark = 0.5, sway = 1) {
  if (k <= 0.01) return;
  const n = 16;
  for (let i = 0; i < n; i++) {
    const age = calm ? (i + 0.5) / n : (((t * 0.16 + i / n) % 1) + 1) % 1;
    const up = age * 330 * s * (0.55 + 0.45 * k);
    const wob = Math.sin(age * 6 + i * 1.9) * 16 * s * age * sway;
    const r = (8 + age * 46) * s;
    const a = (1 - age) * (1 - age) * (0.34 + 0.2 * dark) * k;
    const v = Math.round(lerp(150, 26, dark) - age * 18);
    const warm = (1 - age) * 70 * dark;
    const gr = g.createRadialGradient(x + wob, y - up, 0, x + wob, y - up, r);
    gr.addColorStop(0, `rgba(${Math.min(255, v + warm)},${v + warm * 0.4},${v},${a})`);
    gr.addColorStop(1, `rgba(${v},${v},${v},0)`);
    g.fillStyle = gr;
    g.fillRect(x + wob - r, y - up - r, r * 2, r * 2);
  }
}

/** Dust, sparks and debris thrown up by touchdown. age is seconds since impact; (x, y) is the contact point. */
export function makeImpact(seed = 5) {
  const r = rng(seed);
  return {
    dust: Array.from({ length: 46 }, () => ({ a: -Math.PI * (0.05 + r() * 0.9), v: 0.3 + r() * 0.7, sz: 0.5 + r(), ph: r(), dir: r() < 0.5 ? -1 : 1 })),
    sparks: Array.from({ length: 26 }, () => ({ a: -Math.PI * (0.1 + r() * 0.8), v: 0.5 + r() * 1, ph: r() })),
    chunks: Array.from({ length: 10 }, () => ({ a: -Math.PI * (0.15 + r() * 0.7), v: 0.5 + r() * 0.8, sz: 2 + r() * 4, rot: r() * TAU, spin: (r() - 0.5) * 10 }))
  };
}

export function drawImpact(g, x, y, s, sev, age, M) {
  if (age <= 0) return;
  const power = [0.45, 0.95, 1.7][sev];
  // dust: a low, fast ring along the ground that settles
  for (const d of M.dust) {
    const life = 2.4 + d.ph * 1.6;
    const q = age / life;
    if (q >= 1) continue;
    const dist = (1 - Math.pow(1 - Math.min(1, age * 1.4), 2)) * 200 * s * power * d.v;
    const lift = Math.sin(Math.min(1, age * 1.2) * Math.PI * 0.55) * 46 * s * power * d.v * (0.4 + d.ph * 0.6);
    const px = x + d.dir * Math.abs(Math.cos(d.a)) * dist;
    const py = y - lift;
    const rad = (10 + q * 46) * s * d.sz * (0.5 + power * 0.5);
    const a = (1 - q) * 0.4 * Math.min(1, power);
    const gr = g.createRadialGradient(px, py, 0, px, py, rad);
    gr.addColorStop(0, `rgba(150,170,150,${a})`);
    gr.addColorStop(1, "rgba(150,170,150,0)");
    g.fillStyle = gr;
    g.fillRect(px - rad, py - rad, rad * 2, rad * 2);
  }
  if (sev >= 1) {
    // sparks: short bright lines on a parabola
    for (const sp of M.sparks) {
      const life = 0.9 + sp.ph * 0.6;
      if (age > life) continue;
      const q = age / life;
      const v = 360 * s * sp.v * (sev === 2 ? 1.2 : 0.7);
      const px = x + Math.cos(sp.a) * v * age * (sp.ph < 0.5 ? -1 : 1);
      const py = y + Math.sin(sp.a) * v * age + 520 * s * age * age;
      g.strokeStyle = `rgba(255,${Math.round(210 - q * 100)},${Math.round(120 - q * 80)},${1 - q})`;
      g.lineWidth = Math.max(1, 1.8 * s);
      g.beginPath();
      g.moveTo(px, py);
      g.lineTo(px - Math.cos(sp.a) * 7 * s * (sp.ph < 0.5 ? -1 : 1), py - Math.sin(sp.a) * 7 * s);
      g.stroke();
    }
  }
  if (sev >= 2) {
    // debris
    for (const c of M.chunks) {
      const life = 1.8;
      if (age > life) continue;
      const q = age / life;
      const v = 330 * s * c.v;
      const px = x + Math.cos(c.a) * v * age * (c.rot < 3 ? -1 : 1);
      const py = Math.min(y, y + Math.sin(c.a) * v * age + 560 * s * age * age);
      g.save();
      g.translate(px, py);
      g.rotate(c.rot + c.spin * age);
      g.globalAlpha = 1 - q * q;
      g.fillStyle = "#1c2430";
      g.fillRect(-c.sz * s, -c.sz * 0.5 * s, c.sz * 2 * s, c.sz * s);
      g.fillStyle = "rgba(160,190,215,0.5)";
      g.fillRect(-c.sz * s, -c.sz * 0.5 * s, c.sz * 2 * s, 1);
      g.restore();
    }
  }
}

/** A scar in the ground behind the ship: a shallow scuff after a rough landing, a deep furrow after a crash. */
export function drawFurrow(g, x, y, s, sev, k = 1) {
  if (sev < 1 || k <= 0) return;
  const len = [0, 170, 380][sev] * s * k;
  const wd = [0, 5, 13][sev] * s;
  const gr = g.createLinearGradient(x, 0, x - len, 0);
  gr.addColorStop(0, `rgba(8,12,14,${0.75 * (sev === 2 ? 1 : 0.6)})`);
  gr.addColorStop(1, "rgba(8,12,14,0)");
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(x + 10 * s, y - wd * 0.2);
  g.quadraticCurveTo(x - len * 0.5, y - wd * 0.9, x - len, y - wd * 0.15);
  g.lineTo(x - len, y + wd * 0.35);
  g.quadraticCurveTo(x - len * 0.5, y + wd * 1.1, x + 10 * s, y + wd * 0.6);
  g.closePath();
  g.fill();
  if (sev === 2) {
    // a ridge of thrown earth on the far side of the furrow
    g.strokeStyle = `rgba(120,150,140,${0.3 * k})`;
    g.lineWidth = Math.max(1, 2 * s);
    g.beginPath();
    g.moveTo(x, y - wd * 0.9);
    g.quadraticCurveTo(x - len * 0.5, y - wd * 1.7, x - len * 0.9, y - wd * 0.6);
    g.stroke();
  }
}

