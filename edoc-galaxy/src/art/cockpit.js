import { TAU, clamp } from "./rng";
import { glow } from "./scenes";

/**
 * The cockpit frame around the encounter screen: four mitred panels (canopy bar, two window pillars, the dash)
 * that surround the console, with lamps, gauges and a travelling light that all read the same hull number.
 * Drawn in code. S = { t, calm, px, py, hull (0..100), dpr, frame }.
 * `insets(W, h)` says how much room the frame takes; the console's CSS uses the same numbers (see --fr-* in approach.css).
 */
export function insets(W, h) {
  if (W <= 700 || h <= 640) return { t: 12, s: 8, b: 12, compact: true };
  return { t: clamp(h * 0.065, 30, 56), s: clamp(W * 0.03, 10, 46), b: clamp(h * 0.07, 30, 60), compact: false };
}

export function makeCockpit() {
  return { cache: null };
}

const TONES = { ok: "94,234,212", warn: "255,190,90", low: "255,96,96" };
export const toneFor = (hull) => (hull > 40 ? "ok" : hull > 20 ? "warn" : "low");

function rr(g, x, y, w, h, r) {
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** Everything that never changes: the metal, the seams, the rivets, the dial faces. Painted once per size. */
function paintStatic(g, W, h, I) {
  const { t, s, b, compact } = I;
  const px = s, py = t, pw = W - s * 2, ph = h - t - b;

  const panel = (poly, c0, c1, vertical) => {
    const gr = vertical ? g.createLinearGradient(0, 0, 0, h) : g.createLinearGradient(0, poly[0][1], 0, poly[2][1]);
    gr.addColorStop(0, c0);
    gr.addColorStop(1, c1);
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(poly[0][0], poly[0][1]);
    for (let i = 1; i < poly.length; i++) g.lineTo(poly[i][0], poly[i][1]);
    g.closePath();
    g.fill();
  };
  // four panels, mitred at the corners
  panel([[0, 0], [W, 0], [W - s, t], [s, t]], "#1b2740", "#0d1527"); // canopy bar
  panel([[0, h], [W, h], [W - s, h - b], [s, h - b]], "#0c1426", "#080d1a"); // dash
  panel([[0, 0], [s, t], [s, h - b], [0, h]], "#111b2f", "#0a1020", true); // left pillar
  panel([[W, 0], [W - s, t], [W - s, h - b], [W, h]], "#111b2f", "#0a1020", true); // right pillar

  // mitre lines catch the light
  g.lineWidth = 1;
  g.strokeStyle = "rgba(170,200,255,0.2)";
  g.beginPath();
  g.moveTo(0, 0); g.lineTo(s, t);
  g.moveTo(W, 0); g.lineTo(W - s, t);
  g.stroke();
  g.strokeStyle = "rgba(0,0,0,0.6)";
  g.beginPath();
  g.moveTo(0, h); g.lineTo(s, h - b);
  g.moveTo(W, h); g.lineTo(W - s, h - b);
  g.stroke();

  // bevel round the opening
  g.save();
  g.strokeStyle = "rgba(0,0,0,0.7)";
  g.lineWidth = 3;
  g.beginPath();
  rr(g, px - 1.5, py - 1.5, pw + 3, ph + 3, 17);
  g.stroke();
  g.strokeStyle = "rgba(150,180,235,0.3)";
  g.lineWidth = 1;
  g.beginPath();
  rr(g, px - 3.5, py - 3.5, pw + 7, ph + 7, 19);
  g.stroke();
  g.restore();

  // outer edge
  g.strokeStyle = "rgba(255,255,255,0.07)";
  g.lineWidth = 1;
  g.strokeRect(0.5, 0.5, W - 1, h - 1);

  if (compact) return;

  // seams and rivets down the pillars
  const rivet = (x, y) => {
    g.fillStyle = "rgba(0,0,0,0.55)";
    g.beginPath();
    g.arc(x + 0.6, y + 0.8, 1.6, 0, TAU);
    g.fill();
    g.fillStyle = "rgba(170,195,240,0.5)";
    g.beginPath();
    g.arc(x, y, 1.3, 0, TAU);
    g.fill();
  };
  if (s >= 24) {
    for (let y = t + 70; y < h - b - 30; y += 86) {
      for (const [x0, x1] of [[4, s - 5], [W - s + 5, W - 4]]) {
        g.strokeStyle = "rgba(0,0,0,0.5)";
        g.beginPath();
        g.moveTo(x0, y); g.lineTo(x1, y);
        g.stroke();
        g.strokeStyle = "rgba(160,190,240,0.12)";
        g.beginPath();
        g.moveTo(x0, y + 1); g.lineTo(x1, y + 1);
        g.stroke();
        rivet(x0 + 3, y - 6);
        rivet(x1 - 3, y - 6);
      }
    }
    // the groove the pillar light runs in
    for (const x of [s / 2, W - s / 2]) {
      g.fillStyle = "rgba(0,0,0,0.55)";
      g.fillRect(x - 2, t + 24, 4, h - t - b - 48);
    }
  }

  // the groove for the canopy strip
  const sw = Math.min(W * 0.36, 560);
  g.fillStyle = "rgba(0,0,0,0.55)";
  g.beginPath();
  rr(g, W / 2 - sw / 2 - 2, t / 2 - 4, sw + 4, 8, 4);
  g.fill();

  // dials on the dash: three faces with ticks, and labels
  const gr = Math.min(b * 0.32, 18);
  const gy = h - b / 2;
  const labels = ["ATT", "PWR", "HULL"];
  g.textAlign = "left";
  g.font = `600 8px Orbitron, system-ui, sans-serif`;
  [-1, 0, 1].forEach((k, i) => {
    const gx = W / 2 + k * 120 - 14;
    g.fillStyle = "rgba(2,6,14,0.9)";
    g.beginPath();
    g.arc(gx, gy, gr + 3, 0, TAU);
    g.fill();
    g.strokeStyle = "rgba(160,190,240,0.3)";
    g.lineWidth = 1;
    g.beginPath();
    g.arc(gx, gy, gr + 3, 0, TAU);
    g.stroke();
    for (let n = 0; n <= 8; n++) {
      const a = Math.PI * (1.1 + (n / 8) * 0.8);
      g.strokeStyle = n > 6 ? "rgba(255,120,110,0.7)" : "rgba(180,205,245,0.5)";
      g.beginPath();
      g.moveTo(gx + Math.cos(a) * (gr - 1), gy + Math.sin(a) * (gr - 1));
      g.lineTo(gx + Math.cos(a) * (gr - 5), gy + Math.sin(a) * (gr - 5));
      g.stroke();
    }
    g.fillStyle = "rgba(150,180,220,0.5)";
    g.fillText(labels[i], gx + gr + 8, gy + 3);
  });

  // switches on the right of the dash
  for (let i = 0; i < 4; i++) {
    const x = W - s - 40 - i * 22, y = h - b / 2;
    g.fillStyle = "rgba(0,0,0,0.6)";
    g.beginPath();
    rr(g, x - 6, y - 9, 12, 18, 3);
    g.fill();
    g.fillStyle = "rgba(170,195,240,0.35)";
    g.beginPath();
    rr(g, x - 4, y - (i % 2 ? 7 : -1), 8, 6, 2);
    g.fill();
  }
}

export function drawCockpit(g, W, h, C, S) {
  const { t, calm, px } = S;
  const I = insets(W, h);
  const dpr = S.dpr || 1;
  const hull = clamp(Number.isFinite(S.hull) ? S.hull : 100, 0, 100);
  const tone = toneFor(hull);
  const rgb = TONES[tone];
  const key = `${W}x${h}@${dpr.toFixed(2)}`;
  g.clearRect(0, 0, W, h);

  if (typeof document !== "undefined") {
    if (!C.cache || C.cache.key !== key) {
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(W * dpr));
      c.height = Math.max(1, Math.round(h * dpr));
      const og = c.getContext("2d");
      og.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintStatic(og, W, h, I);
      C.cache = { key, c };
    }
    g.drawImage(C.cache.c, 0, 0, W, h);
  } else {
    paintStatic(g, W, h, I);
  }

  const { t: it, s, b, compact } = I;
  const pulse = (k, sp = 2, ph = 0) => (calm ? 1 : 0.55 + 0.45 * Math.sin(t * sp + ph + k));

  // a glint that follows the pointer along the metal
  if (!calm) {
    g.save();
    g.beginPath();
    g.rect(0, 0, W, h);
    g.rect(s, it, W - s * 2, h - it - b);
    g.clip("evenodd");
    const gx = W * (0.5 + px * 0.45);
    const gr = g.createLinearGradient(gx - 160, 0, gx + 160, 0);
    gr.addColorStop(0, "rgba(180,210,255,0)");
    gr.addColorStop(0.5, "rgba(180,210,255,0.07)");
    gr.addColorStop(1, "rgba(180,210,255,0)");
    g.fillStyle = gr;
    g.fillRect(gx - 160, 0, 320, h);
    g.restore();
  }

  // the canopy strip, and the lamps either side of it
  const sw = Math.min(W * 0.36, 560);
  const cy = it / 2;
  const strip = g.createLinearGradient(W / 2 - sw / 2, 0, W / 2 + sw / 2, 0);
  strip.addColorStop(0, `rgba(${rgb},0)`);
  strip.addColorStop(0.2, `rgba(${rgb},0.75)`);
  strip.addColorStop(0.8, `rgba(${rgb},0.75)`);
  strip.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = strip;
  g.fillRect(W / 2 - sw / 2, cy - 1.5, sw, 3);
  glow(g, W / 2, cy, sw * 0.45, rgb, 0.13 * pulse(0, 1.2));
  if (!compact) {
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 5; i++) {
        const x = W / 2 + side * (sw / 2 + 22 + i * 18);
        if (x < s + 30 || x > W - s - 30) continue;
        const lit = tone === "low" ? (calm ? 1 : Math.sin(t * 7 - i * 0.9) > 0 ? 1 : 0.15) : pulse(i, 1.7, side);
        const on = i < (tone === "ok" ? 5 : tone === "warn" ? 3 : 2);
        const a = on ? 0.9 * lit : 0.12;
        g.fillStyle = `rgba(${on ? rgb : "120,150,200"},${a})`;
        g.beginPath();
        g.arc(x, cy, 3, 0, TAU);
        g.fill();
        if (on && a > 0.4) glow(g, x, cy, 10, rgb, 0.3 * a);
      }
    }
  }

  if (!compact) {
    // the light that travels down each pillar
    if (s >= 24) {
      const span = h - it - b - 48;
      for (const x of [s / 2, W - s / 2]) {
        g.fillStyle = `rgba(${rgb},0.22)`;
        g.fillRect(x - 1, it + 24, 2, span);
        const k = calm ? 0.5 : ((t * 0.18 + (x > W / 2 ? 0.5 : 0)) % 1 + 1) % 1;
        const y = it + 24 + k * span;
        const lg = g.createLinearGradient(0, y - 50, 0, y + 6);
        lg.addColorStop(0, `rgba(${rgb},0)`);
        lg.addColorStop(1, `rgba(${rgb},0.85)`);
        g.fillStyle = lg;
        g.fillRect(x - 1, y - 50, 2, 56);
        glow(g, x, y, 14, rgb, 0.3);
      }
    }

    // dash: needles read the hull number, the LED row breathes
    const gr = Math.min(b * 0.32, 18);
    const gy = h - b / 2;
    const readings = [0.55 + (calm ? 0 : 0.06 * Math.sin(t * 0.9)), 0.7 + (calm ? 0 : 0.05 * Math.sin(t * 1.3 + 1)), hull / 100];
    [-1, 0, 1].forEach((k, i) => {
      const gx = W / 2 + k * 120 - 14;
      const a = Math.PI * (1.1 + clamp(readings[i], 0, 1) * 0.8);
      const hot = i === 2 ? rgb : "94,234,212";
      g.strokeStyle = `rgba(${hot},0.95)`;
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(gx, gy);
      g.lineTo(gx + Math.cos(a) * (gr - 3), gy + Math.sin(a) * (gr - 3));
      g.stroke();
      g.fillStyle = "rgba(210,225,250,0.9)";
      g.beginPath();
      g.arc(gx, gy, 2, 0, TAU);
      g.fill();
      if (i === 2) glow(g, gx, gy, gr + 8, rgb, 0.12);
    });
    const lx = s + 24;
    for (let i = 0; i < 14; i++) {
      const lit = tone === "low" ? (i + Math.floor(calm ? 0 : t * 6)) % 3 === 0 : 0.5 + 0.5 * Math.sin((calm ? 0 : t * 2.4) - i * 0.5) > 0.3;
      g.fillStyle = lit ? `rgba(${rgb},0.85)` : "rgba(120,150,200,0.16)";
      g.fillRect(lx + i * 9, h - b / 2 - 3, 5, 6);
    }
  }

  // red edge round the opening when the hull is nearly gone
  if (tone === "low") {
    g.save();
    g.strokeStyle = `rgba(255,90,90,${calm ? 0.35 : 0.2 + 0.2 * Math.sin(t * 5)})`;
    g.lineWidth = 2;
    g.beginPath();
    rr(g, s - 3, it - 3, W - s * 2 + 6, h - it - b + 6, 19);
    g.stroke();
    g.restore();
  }
}
