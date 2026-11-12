import { rng, TAU, clamp, lerp, smooth } from "./rng";
import { makeStars, drawStars, glow } from "./scenes";

/**
 * "New suit unlocked": a dim hangar bay, a pedestal under a spotlight, and a space suit that is revealed by a band of light
 * sweeping up it, then rests with a slow shimmer. Drawn in code (no image or model), in the colours of the hangar's Starfarer suit:
 * deep navy plating with amber trim. S = { t, calm, px, py, replayAt }. With reduced motion it shows the finished frame.
 *
 * `o` in drawSuit: { reveal 0..1 (how much of the suit the light has uncovered), shine 0..1, base "r,g,b", trim "r,g,b" }.
 */
const REVEAL_AT = 0.7; // seconds of dark before the light starts
const REVEAL_FOR = 1.7; // seconds the light takes to reach the top

export function makeSuitScene(seed = 5) {
  const r = rng(seed);
  return {
    stars: makeStars(seed + 1, 90),
    motes: Array.from({ length: 46 }, () => ({ x: r(), y: r(), v: 0.02 + r() * 0.06, sz: 0.6 + r() * 1.8, ph: r() * TAU })),
    sparks: Array.from({ length: 28 }, () => ({ a: r() * TAU, v: 60 + r() * 230, ph: r(), sz: 1 + r() * 2.2 }))
  };
}

export function suitGeometry(W, h) {
  const portrait = W / h < 0.85;
  const u = h / 768;
  // wide: the suit stands left of centre, clear of the Loadout panel on the right; tall: it stands above the bottom sheet
  const s = portrait ? Math.min(W / 520, h / 1100) : u * 1.08;
  return { portrait, u, s, cx: portrait ? W / 2 : W * 0.4, floorY: portrait ? h * 0.42 : h * 0.62 };
}

/** The suit, standing with its feet at (x, y) and about 300 * s tall. */
export function drawSuit(g, x, y, s, t, calm, o = {}) {
  const reveal = o.reveal ?? 1;
  const shine = o.shine ?? 0;
  const base = o.base || "30,42,92";
  const trim = o.trim || "255,181,71";
  const body = (k) => `rgba(${base},${k})`;
  const bob = calm ? 0 : Math.sin(t * 1.4) * 2.2 * s;
  const top = -312 * s;

  g.save();
  g.translate(x, y + bob);
  // the light sweeps up: everything above the front of the light is clipped away, a little of it stays as a dark outline
  const edge = lerp(0, top, clamp(reveal, 0, 1));
  const lit = new Path2D();
  lit.rect(-200 * s, Math.min(edge, 0), 400 * s, -edge + 40 * s);

  const dark = (fn) => {
    g.save();
    g.globalAlpha = 0.16;
    fn("rgba(14,20,44,1)", "rgba(40,55,100,1)");
    g.restore();
  };
  const part = (fn) => {
    dark(fn);
    g.save();
    g.clip(lit);
    fn(null, null);
    g.restore();
  };

  const plate = (x0, y0, w, h, rad, fillOverride, strokeOverride) => {
    g.beginPath();
    g.roundRect(x0 * s, y0 * s, w * s, h * s, rad * s);
    const gr = g.createLinearGradient((x0 - 4) * s, 0, (x0 + w + 4) * s, 0);
    gr.addColorStop(0, body(1));
    gr.addColorStop(0.35, `rgba(${lerp(30, 84, 0.6) | 0},${lerp(42, 104, 0.6) | 0},${lerp(92, 170, 0.6) | 0},1)`);
    gr.addColorStop(1, "rgba(14,20,46,1)");
    g.fillStyle = fillOverride || gr;
    g.fill();
    g.lineWidth = 1.2 * s;
    g.strokeStyle = strokeOverride || "rgba(150,175,235,0.45)";
    g.stroke();
  };
  const trimBar = (x0, y0, w, h, rad = 2) => {
    g.beginPath();
    g.roundRect(x0 * s, y0 * s, w * s, h * s, rad * s);
    g.fillStyle = `rgba(${trim},0.95)`;
    g.fill();
  };

  // backpack
  part((f, st) => plate(-50, -226, 100, 108, 14, f, st));
  // legs and boots
  part((f, st) => {
    plate(-38, -112, 32, 84, 12, f, st);
    plate(6, -112, 32, 84, 12, f, st);
    plate(-44, -30, 40, 26, 9, f, st);
    plate(4, -30, 40, 26, 9, f, st);
  });
  part((f) => {
    if (f) return;
    trimBar(-44, -12, 40, 5, 2);
    trimBar(4, -12, 40, 5, 2);
    trimBar(-35, -104, 26, 4);
    trimBar(9, -104, 26, 4);
  });
  // arms and gloves
  part((f, st) => {
    plate(-76, -218, 26, 98, 12, f, st);
    plate(50, -218, 26, 98, 12, f, st);
    g.beginPath();
    g.arc(-63 * s, -112 * s, 13 * s, 0, TAU);
    g.arc(63 * s, -112 * s, 13 * s, 0, TAU);
    g.fillStyle = f || "rgba(20,28,62,1)";
    g.fill();
  });
  // torso
  part((f, st) => {
    g.beginPath();
    g.moveTo(-50 * s, -228 * s);
    g.lineTo(50 * s, -228 * s);
    g.quadraticCurveTo(58 * s, -150 * s, 40 * s, -118 * s);
    g.lineTo(-40 * s, -118 * s);
    g.quadraticCurveTo(-58 * s, -150 * s, -50 * s, -228 * s);
    g.closePath();
    const gr = g.createLinearGradient(-50 * s, 0, 50 * s, 0);
    gr.addColorStop(0, body(1));
    gr.addColorStop(0.4, "rgba(74,98,164,1)");
    gr.addColorStop(1, "rgba(14,20,46,1)");
    g.fillStyle = f || gr;
    g.fill();
    g.lineWidth = 1.2 * s;
    g.strokeStyle = st || "rgba(150,175,235,0.5)";
    g.stroke();
  });
  // shoulders
  part((f, st) => {
    for (const sx of [-1, 1]) {
      g.beginPath();
      g.ellipse(sx * 58 * s, -214 * s, 26 * s, 18 * s, 0, 0, TAU);
      g.fillStyle = f || "rgba(40,56,118,1)";
      g.fill();
      g.lineWidth = 1.4 * s;
      g.strokeStyle = st || `rgba(${trim},0.9)`;
      g.stroke();
    }
  });
  // belt, chest trim and the chest light
  part((f) => {
    if (f) return;
    trimBar(-42, -134, 84, 8, 3);
    trimBar(-30, -204, 60, 4);
    trimBar(-30, -192, 60, 3);
    g.beginPath();
    g.arc(0, -168 * s, 12 * s, 0, TAU);
    g.fillStyle = "rgba(10,14,34,1)";
    g.fill();
    g.lineWidth = 2.2 * s;
    g.strokeStyle = `rgba(${trim},1)`;
    g.stroke();
  });
  // neck ring and helmet
  part((f, st) => {
    plate(-18, -244, 36, 20, 6, f, st);
    g.beginPath();
    g.arc(0, -276 * s, 40 * s, 0, TAU);
    const gr = g.createRadialGradient(-14 * s, -292 * s, 4 * s, 0, -276 * s, 46 * s);
    gr.addColorStop(0, "rgba(96,122,196,1)");
    gr.addColorStop(0.55, body(1));
    gr.addColorStop(1, "rgba(10,14,34,1)");
    g.fillStyle = f || gr;
    g.fill();
    g.lineWidth = 1.4 * s;
    g.strokeStyle = st || "rgba(150,175,235,0.55)";
    g.stroke();
  });
  part((f) => {
    if (f) return;
    // visor: dark glass with an amber rim and one reflection
    g.beginPath();
    g.ellipse(0, -274 * s, 29 * s, 22 * s, 0, 0, TAU);
    const vg = g.createLinearGradient(0, -296 * s, 0, -252 * s);
    vg.addColorStop(0, "rgba(14,22,46,1)");
    vg.addColorStop(1, "rgba(4,8,22,1)");
    g.fillStyle = vg;
    g.fill();
    g.lineWidth = 2 * s;
    g.strokeStyle = `rgba(${trim},0.95)`;
    g.stroke();
    g.beginPath();
    g.ellipse(-9 * s, -283 * s, 11 * s, 4.5 * s, -0.35, 0, TAU);
    g.fillStyle = "rgba(190,215,255,0.34)";
    g.fill();
    // helmet lamps
    for (const sx of [-1, 1]) {
      g.beginPath();
      g.arc(sx * 41 * s, -270 * s, 4 * s, 0, TAU);
      g.fillStyle = `rgba(${trim},1)`;
      g.fill();
    }
  });

  // a warm glow in the chest and on the visor rim, once the light has reached them
  const chest = smooth(0.2, 0.5, reveal);
  if (chest > 0) {
    const pulse = calm ? 0.85 : 0.75 + 0.25 * Math.sin(t * 2.4);
    glow(g, 0, -168 * s, 46 * s, trim, 0.55 * chest * pulse);
  }
  const head = smooth(0.75, 1, reveal);
  if (head > 0) glow(g, 0, -274 * s, 56 * s, trim, 0.16 * head);

  // the front of the sweep: a soft, flat glow of light across the suit
  if (reveal > 0.01 && reveal < 0.995) {
    const a = 0.8 * Math.sin(Math.PI * clamp(reveal, 0, 1));
    g.save();
    g.globalCompositeOperation = "lighter";
    g.translate(0, edge);
    g.scale(1, 0.1);
    const gl = g.createRadialGradient(0, 0, 0, 0, 0, 150 * s);
    gl.addColorStop(0, `rgba(255,238,205,${a})`);
    gl.addColorStop(0.45, `rgba(${trim},${a * 0.45})`);
    gl.addColorStop(1, `rgba(${trim},0)`);
    g.fillStyle = gl;
    g.fillRect(-150 * s, -150 * s, 300 * s, 300 * s);
    g.restore();
  }

  // after the reveal a soft highlight drifts over the plating now and then
  if (shine > 0) {
    const k = (t * 0.22) % 1.6;
    const sx = lerp(-120, 120, clamp(k, 0, 1)) * s;
    const sg = g.createLinearGradient(sx - 30 * s, 0, sx + 30 * s, 0);
    sg.addColorStop(0, "rgba(255,255,255,0)");
    sg.addColorStop(0.5, `rgba(220,235,255,${0.16 * shine * Math.sin(Math.PI * clamp(k, 0, 1))})`);
    sg.addColorStop(1, "rgba(255,255,255,0)");
    g.save();
    g.globalCompositeOperation = "lighter";
    g.fillStyle = sg;
    g.fillRect(sx - 30 * s, top, 60 * s, -top);
    g.restore();
  }
  g.restore();
}

export function drawSuitScene(g, W, h, V, S) {
  const { calm } = S;
  if (S._rk !== S.replayKey) {
    S._rk = S.replayKey;
    S.replayAt = S.t; // a new replay key starts the reveal again
  }
  const G = suitGeometry(W, h);
  const t = calm ? 6 : Math.max(0, S.t - (S.replayAt || 0));
  const rev = calm ? 1 : smooth(0, 1, clamp((t - REVEAL_AT) / REVEAL_FOR, 0, 1));
  const lightOn = calm ? 1 : smooth(0, 0.7, t);
  const after = clamp((t - (REVEAL_AT + REVEAL_FOR)) / 1.2, 0, 1);

  // the bay: dark, a little blue at the top
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#0a1230");
  bg.addColorStop(0.6, "#050913");
  bg.addColorStop(1, "#03060d");
  g.fillStyle = bg;
  g.fillRect(0, 0, W, h);
  drawStars(g, W, h, V.stars, calm ? 0 : S.t, 0.2, S.px * 4, S.py * 3);

  // far wall: two rows of soft panel lights, so the bay reads as a room
  g.save();
  g.globalAlpha = 0.5;
  for (let i = 0; i < 9; i++) {
    const px = (i + 0.5) * (W / 9);
    g.fillStyle = "rgba(60,90,160,0.12)";
    g.fillRect(px - W * 0.04, h * 0.14, W * 0.08, h * 0.3);
    g.fillStyle = "rgba(120,160,255,0.22)";
    g.fillRect(px - W * 0.04, h * 0.14, W * 0.08, 2);
  }
  g.restore();

  // spotlight cone from above
  g.save();
  g.globalCompositeOperation = "lighter";
  const cone = g.createLinearGradient(0, 0, 0, G.floorY);
  cone.addColorStop(0, `rgba(255,214,150,${0.02 * lightOn})`);
  cone.addColorStop(1, `rgba(255,190,110,${0.2 * lightOn})`);
  g.fillStyle = cone;
  g.beginPath();
  g.moveTo(G.cx - 18 * G.s, 0);
  g.lineTo(G.cx + 18 * G.s, 0);
  g.lineTo(G.cx + 150 * G.s, G.floorY);
  g.lineTo(G.cx - 150 * G.s, G.floorY);
  g.closePath();
  g.fill();
  g.restore();

  // the floor and pedestal
  const fl = g.createLinearGradient(0, G.floorY - 10, 0, h);
  fl.addColorStop(0, "rgba(20,30,66,0.9)");
  fl.addColorStop(1, "rgba(3,6,14,1)");
  g.fillStyle = fl;
  g.fillRect(0, G.floorY, W, h - G.floorY);
  glow(g, G.cx, G.floorY, 200 * G.s, "255,181,71", 0.22 * lightOn);
  for (let k = 0; k < 3; k++) {
    g.beginPath();
    g.ellipse(G.cx, G.floorY, (96 + k * 34) * G.s, (22 + k * 8) * G.s, 0, 0, TAU);
    g.lineWidth = 1.5 * G.s;
    g.strokeStyle = `rgba(255,190,110,${(0.5 - k * 0.14) * lightOn})`;
    g.stroke();
  }
  // rings that leave the pedestal when the suit is fully lit
  if (!calm) {
    for (let k = 0; k < 3; k++) {
      const q = ((t - REVEAL_AT - REVEAL_FOR + k * 0.55) % 1.65) / 1.65;
      if (t < REVEAL_AT + REVEAL_FOR || q < 0) continue;
      g.beginPath();
      g.ellipse(G.cx, G.floorY, (100 + q * 200) * G.s, (24 + q * 48) * G.s, 0, 0, TAU);
      g.lineWidth = 2 * G.s;
      g.strokeStyle = `rgba(255,200,130,${0.45 * (1 - q) * after})`;
      g.stroke();
    }
  }

  // dust motes in the light
  for (const m of V.motes) {
    const yy = (m.y + (calm ? 0 : S.t * m.v)) % 1;
    const xx = G.cx + (m.x - 0.5) * 320 * G.s + (calm ? 0 : Math.sin(S.t * 0.6 + m.ph) * 8);
    const tw = calm ? 0.6 : 0.35 + 0.35 * Math.sin(S.t * 1.7 + m.ph);
    g.fillStyle = `rgba(255,220,170,${0.5 * tw * lightOn})`;
    g.fillRect(xx, yy * G.floorY, m.sz, m.sz);
  }

  // the suit
  drawSuit(g, G.cx, G.floorY - 4 * G.s, G.s, S.t, calm, { reveal: rev, shine: after });

  // sparks leave the suit as the light reaches the top
  if (!calm && t > REVEAL_AT + REVEAL_FOR * 0.7) {
    const age = t - (REVEAL_AT + REVEAL_FOR * 0.7);
    g.save();
    g.globalCompositeOperation = "lighter";
    for (const p of V.sparks) {
      const a = clamp(age - p.ph * 0.4, 0, 2.4) / 2.4;
      if (a <= 0 || a >= 1) continue;
      const d = p.v * (1 - Math.pow(1 - a, 2)) * G.s;
      const px = G.cx + Math.cos(p.a) * d * 0.9;
      const py = G.floorY - 170 * G.s + Math.sin(p.a) * d * 0.7 - a * 30 * G.s;
      g.fillStyle = `rgba(255,200,120,${0.9 * (1 - a)})`;
      g.beginPath();
      g.arc(px, py, p.sz * (1 - a * 0.5), 0, TAU);
      g.fill();
    }
    g.restore();
  }

  // a soft vignette keeps the eye on the middle
  const vg = g.createRadialGradient(W / 2, h * 0.5, Math.min(W, h) * 0.35, W / 2, h * 0.5, Math.max(W, h) * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.55)");
  g.fillStyle = vg;
  g.fillRect(0, 0, W, h);
}
