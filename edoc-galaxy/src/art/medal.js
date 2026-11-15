import { rng, TAU, clamp, lerp, smooth } from "./rng";
import { makeNebula } from "./nebula";
import { makeStars, drawStars, glow } from "./scenes";

/**
 * "Module cleared": a medal floats in space inside a ring of lamps, one lamp for every encounter in the module. The lamps light
 * one after another round the ring; when the last one is on, a pulse leaves the medal, a tick is drawn on it and sparks fly out.
 * Drawn in code (no image files). S = { t, calm, px, py, replayAt, count }; `count` is the number of encounters (lamps).
 * With reduced motion it shows the finished frame: every lamp on, the tick drawn, no sparks.
 *
 * `o.rgb` is the module's light colour ("r,g,b"), teal by default (the Python colour).
 */
const FIRST = 0.55; // seconds before the first lamp lights
const SPAN = 1.7; // seconds the whole ring takes to light, however many lamps there are
const MAX_STEP = 0.16; // a short module does not crawl: at most this long between lamps

/** How many lamps to draw for a module with this many encounters: one each, but never fewer than 3 or more than 24. */
export function lampCount(total) {
  const n = Math.round(Number(total));
  if (!Number.isFinite(n)) return 3;
  return Math.min(24, Math.max(3, n));
}

/** When (seconds after the start) lamp `i` of `n` lights, and when the last one does. */
export function lampTimes(n) {
  const step = Math.min(MAX_STEP, SPAN / n);
  return { at: (i) => FIRST + i * step, done: FIRST + (n - 1) * step + 0.25 };
}

export function makeMedalScene(seed = 8) {
  const r = rng(seed);
  return {
    nebula: makeNebula(seed + 3, 320, 180, [[14, 70, 90], [40, 150, 130], [60, 90, 150]], 0.5, 0.75),
    stars: makeStars(seed + 1, 140),
    sparks: Array.from({ length: 64 }, () => ({ a: r() * TAU, v: 90 + r() * 360, ph: r(), sz: 1 + r() * 2.4, c: r() < 0.35 ? 1 : 0, spin: r() * TAU })),
    motes: Array.from({ length: 30 }, () => ({ x: r(), y: r(), v: 0.01 + r() * 0.03, sz: 0.6 + r() * 1.6, ph: r() * TAU }))
  };
}

/** Wide: the medal stands left of the side panel, in the middle of the screen. Tall: it stands above the bottom sheet. */
export function medalGeometry(W, h) {
  const portrait = W / h < 0.95;
  const R = portrait ? Math.min(W * 0.2, h * 0.13) : Math.min(h * 0.17, W * 0.13);
  return { portrait, R, cx: portrait ? W / 2 : W * 0.36, cy: portrait ? h * 0.27 : h * 0.47 };
}

/** The medal alone: a rim, a dark face with a small planet, and a tick (`tick` 0..1 is how much of it is drawn). */
export function drawMedal(g, x, y, R, t, calm, o = {}) {
  const rgb = o.rgb || "94,234,212";
  const tick = o.tick ?? 1;
  const bob = calm ? 0 : Math.sin(t * 1.5) * R * 0.03;
  g.save();
  g.translate(x, y + bob);

  // rim
  const rim = g.createLinearGradient(-R, -R, R, R);
  rim.addColorStop(0, "rgba(220,240,240,1)");
  rim.addColorStop(0.45, `rgba(${rgb},1)`);
  rim.addColorStop(1, "rgba(24,60,70,1)");
  g.beginPath();
  g.arc(0, 0, R, 0, TAU);
  g.fillStyle = rim;
  g.fill();
  g.beginPath();
  g.arc(0, 0, R * 0.9, 0, TAU);
  g.fillStyle = "rgba(8,16,30,1)";
  g.fill();
  g.lineWidth = Math.max(1, R * 0.02);
  g.strokeStyle = "rgba(230,250,250,0.55)";
  g.beginPath();
  g.arc(0, 0, R * 0.84, 0, TAU);
  g.stroke();

  // the face: a small planet
  const pr = R * 0.58;
  const pg = g.createRadialGradient(-pr * 0.35, -pr * 0.4, pr * 0.1, 0, 0, pr);
  pg.addColorStop(0, "rgba(150,255,215,1)");
  pg.addColorStop(0.55, `rgba(${Math.round(lerp(60, 94, 0.5))},170,150,1)`);
  pg.addColorStop(1, "rgba(10,50,60,1)");
  g.beginPath();
  g.arc(0, 0, pr, 0, TAU);
  g.fillStyle = pg;
  g.fill();
  // a few continents
  g.save();
  g.beginPath();
  g.arc(0, 0, pr, 0, TAU);
  g.clip();
  g.fillStyle = "rgba(20,90,80,0.55)";
  for (const [dx, dy, rx, ry, rot] of [[-0.25, -0.1, 0.34, 0.2, 0.5], [0.3, 0.22, 0.28, 0.16, -0.4], [0.05, -0.42, 0.2, 0.1, 0.1]]) {
    g.beginPath();
    g.ellipse(dx * pr, dy * pr, rx * pr, ry * pr, rot, 0, TAU);
    g.fill();
  }
  g.restore();

  // the tick, drawn in two strokes
  if (tick > 0) {
    const a = { x: -pr * 0.42, y: pr * 0.02 }, b = { x: -pr * 0.1, y: pr * 0.36 }, c = { x: pr * 0.5, y: -pr * 0.34 };
    const p1 = clamp(tick * 2, 0, 1), p2 = clamp(tick * 2 - 1, 0, 1);
    g.lineCap = "round";
    g.lineJoin = "round";
    g.lineWidth = Math.max(2, R * 0.12);
    g.strokeStyle = "rgba(255,255,255,0.97)";
    g.shadowColor = `rgba(${rgb},0.9)`;
    g.shadowBlur = R * 0.2;
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(lerp(a.x, b.x, p1), lerp(a.y, b.y, p1));
    if (p2 > 0) g.lineTo(lerp(b.x, c.x, p2), lerp(b.y, c.y, p2));
    g.stroke();
    g.shadowBlur = 0;
  }
  g.restore();
}

export function drawMedalScene(g, W, h, V, S) {
  const { calm } = S;
  if (S._rk !== S.replayKey) {
    S._rk = S.replayKey;
    S.replayAt = S.t; // a new replay key starts the show again
  }
  const n = lampCount(S.count);
  const T = lampTimes(n);
  const G = medalGeometry(W, h);
  const t = calm ? 99 : Math.max(0, S.t - (S.replayAt || 0));
  const rgb = S.rgb || "94,234,212";
  const done = t - T.done; // seconds since the last lamp
  const tick = calm ? 1 : smooth(0, 0.6, done);

  // space (when a painting sits behind the canvas, `overlay` leaves the canvas clear and only the medal and lamps are drawn)
  if (!S.overlay) {
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#04101c");
    bg.addColorStop(1, "#020710");
    g.fillStyle = bg;
    g.fillRect(0, 0, W, h);
    if (V.nebula) {
      g.save();
      g.globalAlpha = 0.5;
      g.drawImage(V.nebula, 0, 0, W, h);
      g.restore();
    }
    drawStars(g, W, h, V.stars, calm ? 0 : S.t, 0.3, S.px * 4, S.py * 3);
  } else {
    g.clearRect(0, 0, W, h);
  }

  // a soft light behind the medal that grows with each lamp
  const lit = calm ? n : Math.min(n, Math.max(0, Math.floor((t - 0.55) / Math.min(MAX_STEP, SPAN / n)) + 1));
  glow(g, G.cx, G.cy, G.R * (3 + lit / n * 1.5), rgb, 0.1 + 0.16 * (lit / n));

  // the ring of lamps
  const ringR = G.R * 1.42;
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI / 2 + (i / n) * TAU;
    const lx = G.cx + Math.cos(ang) * ringR;
    const ly = G.cy + Math.sin(ang) * ringR;
    const since = calm ? 9 : t - T.at(i);
    const on = since >= 0;
    const flare = on ? Math.max(0, 1 - since / 0.35) : 0; // a short bright flash as it lights
    const lr = Math.max(2.4, G.R * 0.07) * (1 + flare * 0.7);
    g.beginPath();
    g.arc(lx, ly, lr, 0, TAU);
    g.fillStyle = on ? "rgba(235,255,250,1)" : "rgba(60,90,110,0.55)";
    g.fill();
    if (on) glow(g, lx, ly, lr * (4 + flare * 4), rgb, 0.55 + flare * 0.3);
  }

  // the pulse that leaves the ring when the last lamp comes on
  if (!calm && done > 0) {
    for (let k = 0; k < 2; k++) {
      const q = clamp((done - k * 0.22) / 1.3, 0, 1);
      if (q <= 0 || q >= 1) continue;
      g.beginPath();
      g.arc(G.cx, G.cy, ringR + q * Math.max(W, h) * 0.5, 0, TAU);
      g.lineWidth = G.R * 0.06 * (1 - q) + 1;
      g.strokeStyle = `rgba(${rgb},${0.6 * (1 - q)})`;
      g.stroke();
    }
  }

  // the medal
  glow(g, G.cx, G.cy, G.R * 1.8, rgb, calm ? 0.2 : 0.14 + 0.12 * Math.sin(S.t * 1.8));
  drawMedal(g, G.cx, G.cy, G.R, S.t, calm, { rgb, tick });

  // a highlight that crosses the medal now and then, after the tick
  if (!calm && done > 0.6) {
    const k = ((S.t * 0.25) % 1.7);
    if (k < 1) {
      const sx = lerp(-G.R, G.R, k);
      g.save();
      g.beginPath();
      g.arc(G.cx, G.cy, G.R * 0.9, 0, TAU);
      g.clip();
      g.globalCompositeOperation = "lighter";
      const sg = g.createLinearGradient(G.cx + sx - G.R * 0.25, 0, G.cx + sx + G.R * 0.25, 0);
      sg.addColorStop(0, "rgba(255,255,255,0)");
      sg.addColorStop(0.5, `rgba(255,255,255,${0.2 * Math.sin(Math.PI * k)})`);
      sg.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = sg;
      g.fillRect(G.cx - G.R, G.cy - G.R, G.R * 2, G.R * 2);
      g.restore();
    }
  }

  // sparks from the medal
  if (!calm && done > 0.2) {
    const age = done - 0.2;
    g.save();
    g.globalCompositeOperation = "lighter";
    for (const p of V.sparks) {
      const a = clamp(age - p.ph * 0.35, 0, 2.6) / 2.6;
      if (a <= 0 || a >= 1) continue;
      const d = p.v * (1 - Math.pow(1 - a, 2)) * (G.R / 120);
      const px = G.cx + Math.cos(p.a) * (ringR + d);
      const py = G.cy + Math.sin(p.a) * (ringR + d) + a * a * G.R * 0.8; // they drift down a little at the end
      g.fillStyle = p.c ? `rgba(255,210,140,${0.9 * (1 - a)})` : `rgba(${rgb},${0.9 * (1 - a)})`;
      g.beginPath();
      g.arc(px, py, p.sz * (1 - a * 0.5), 0, TAU);
      g.fill();
    }
    g.restore();
  }

  // dust motes drifting
  for (const m of S.overlay ? [] : V.motes) {
    const yy = ((m.y - (calm ? 0 : S.t * m.v)) % 1 + 1) % 1;
    const xx = m.x * W + (calm ? 0 : Math.sin(S.t * 0.5 + m.ph) * 8);
    g.fillStyle = `rgba(200,240,235,${calm ? 0.25 : 0.2 + 0.15 * Math.sin(S.t * 1.4 + m.ph)})`;
    g.fillRect(xx, yy * h, m.sz, m.sz);
  }

  // vignette
  if (!S.overlay) {
    const vg = g.createRadialGradient(W / 2, h * 0.4, Math.min(W, h) * 0.35, W / 2, h * 0.4, Math.max(W, h) * 0.8);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.5)");
    g.fillStyle = vg;
    g.fillRect(0, 0, W, h);
  }
}
