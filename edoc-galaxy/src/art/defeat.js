import { rng, TAU, clamp, lerp, smooth } from "./rng";
import { makeAsteroid } from "./asteroid";
import { makeNebula } from "./nebula";
import { makeStars, drawStars, grainFast, glow } from "./scenes";
import { drawLander, drawSmoke } from "./lander";

/**
 * "Hull depleted": the rock that beat you still looms, and the ship drifts, venting, with the emergency lights on.
 * S = { t, calm, px, py, hover, burstAt } — click the ship to shake loose a burst of sparks. With reduced motion: one still frame.
 * Drawn in code from a seed. Everything moves slowly; nothing strobes.
 */
export function makeDefeat(seed = 17) {
  const r = rng(seed);
  return {
    rock: makeAsteroid(seed, 256, 1),
    nebula: makeNebula(seed + 3, 320, 180, [[58, 18, 30], [118, 44, 52], [52, 34, 96]], 0.5, 0.75),
    stars: makeStars(seed + 1, 130),
    plates: Array.from({ length: 16 }, () => ({
      x: r(), y: r(), z: 0.3 + r() * 0.7, rot: r() * TAU, spin: (r() - 0.5) * 1.1, w: 6 + r() * 16, h: 3 + r() * 8, sk: r() - 0.5, vx: 6 + r() * 18
    })),
    sparks: Array.from({ length: 26 }, () => ({ ph: r(), a: -Math.PI * (0.15 + r() * 0.7), v: 60 + r() * 150, life: 0.7 + r() * 1.1 })),
    bursts: Array.from({ length: 34 }, () => ({ a: r() * TAU, v: 80 + r() * 320, ph: r() }))
  };
}

export function geometry(W, h) {
  const portrait = W / h < 0.85;
  const u = h / 768;
  return {
    portrait,
    u,
    ship: { x: portrait ? W * 0.36 : W * 0.31, y: portrait ? h * 0.3 : h * 0.4, s: portrait ? W / 620 : u * 1.05 },
    rock: { x: portrait ? W * 0.86 : W * 0.82, y: portrait ? h * 0.15 : h * 0.3, size: portrait ? W * 0.62 : h * 0.72 }
  };
}

export function drawDefeat(g, W, h, D, S) {
  const { calm, px, py } = S;
  const G = geometry(W, h);
  const t = calm ? 5 : S.t;
  const settle = calm ? 1 : smooth(0, 1.4, t);
  S.geo = G;

  g.clearRect(0, 0, W, h);
  g.fillStyle = "#06020a";
  g.fillRect(0, 0, W, h);

  // dim, bruised nebula and stars
  g.save();
  g.globalAlpha = 0.9;
  g.drawImage(D.nebula, -W * 0.03 + px * W * 0.01, -h * 0.03 + py * h * 0.008, W * 1.06, h * 1.06);
  g.restore();
  drawStars(g, W, h, D.stars, calm ? 0 : t, 0, px, py);

  // wreckage drifting past, nearer pieces faster
  for (const p of D.plates) {
    const x = (((p.x * W - (calm ? 0 : t) * p.vx * p.z * G.u + px * 16 * p.z) % (W + 60)) + W + 60) % (W + 60) - 30;
    const y = p.y * h + py * 10 * p.z;
    g.save();
    g.translate(x, y);
    g.rotate(p.rot + (calm ? 0 : t * p.spin));
    g.globalAlpha = 0.25 + 0.5 * p.z;
    g.fillStyle = "#1c2430";
    g.beginPath();
    g.moveTo(-p.w * G.u * p.z, -p.h * G.u * p.z);
    g.lineTo(p.w * G.u * p.z, -p.h * G.u * p.z * (0.5 + p.sk));
    g.lineTo(p.w * G.u * p.z * 0.7, p.h * G.u * p.z);
    g.lineTo(-p.w * G.u * p.z, p.h * G.u * p.z * 0.6);
    g.closePath();
    g.fill();
    g.fillStyle = "rgba(170,195,215,0.4)";
    g.fillRect(-p.w * G.u * p.z, -p.h * G.u * p.z, p.w * G.u * p.z * 1.6, 1);
    g.restore();
  }

  // the rock that did it, big and unbroken, slowly turning, lit red from the alarm
  {
    const rx = G.rock.x + px * 20, ry = G.rock.y + py * 12, sz = G.rock.size;
    const k = lerp(1.25, 1, settle);
    g.save();
    g.translate(rx, ry);
    g.rotate(calm ? 0.3 : t * 0.03);
    g.scale(k, k);
    g.drawImage(D.rock, -sz / 2, -sz / 2, sz, sz);
    g.restore();
  }

  // the ship: tumbled in, now drifting and listing, engines coughing
  const sx = G.ship.x + px * 14 + (calm ? 0 : Math.sin(t * 0.6) * 8 * G.u) + (1 - settle) * -W * 0.25;
  const sy = G.ship.y + py * 8 + (calm ? 0 : Math.sin(t * 0.9 + 1) * 10 * G.u) + (1 - settle) * -h * 0.1;
  const tilt = lerp(-0.9, 0.3, settle) + (calm ? 0 : Math.sin(t * 0.7) * 0.04);
  const cough = calm ? 0 : Math.max(0, Math.sin(t * 2.6) * Math.sin(t * 1.3 + 2)) * 0.5;
  drawLander(g, sx, sy, G.ship.s, tilt, t, calm, { thrust: cough, sev: 2, soot: 1, hover: S.hover });
  // venting
  drawSmoke(g, sx - Math.cos(tilt) * 40 * G.ship.s, sy - Math.sin(tilt) * 40 * G.ship.s - 8 * G.ship.s, G.ship.s * 0.9, t, calm, 0.8, 0.9, 1.2);

  // sparks from the tear in the hull, falling off in the dark
  const hx = sx + Math.cos(tilt) * -6 * G.ship.s - Math.sin(tilt) * -4 * G.ship.s;
  const hy = sy + Math.sin(tilt) * -6 * G.ship.s + Math.cos(tilt) * -4 * G.ship.s;
  g.save();
  g.globalCompositeOperation = "lighter";
  g.lineWidth = Math.max(1, 1.5 * G.ship.s);
  for (const sp of D.sparks) {
    const age = calm ? sp.ph * 0.8 : (((t * 0.55 + sp.ph) % 1) + 1) % 1;
    const a = age * sp.life;
    if (age > 0.8) continue;
    const x = hx + Math.cos(sp.a) * sp.v * a * G.ship.s, y = hy + Math.sin(sp.a) * sp.v * a * G.ship.s + 160 * a * a * G.ship.s;
    const al = 1 - age / 0.8;
    g.strokeStyle = `rgba(255,${Math.round(210 - age * 120)},${Math.round(130 - age * 90)},${al})`;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x - Math.cos(sp.a) * 6 * G.ship.s, y - (Math.sin(sp.a) * 6 + 22 * a) * G.ship.s);
    g.stroke();
  }
  // a click or a hover shakes loose a burst
  const since = S.burstAt == null ? 9 : t - S.burstAt;
  if (since < 1.1 && !calm) {
    for (const b of D.bursts) {
      const a = since * (0.6 + b.ph * 0.5);
      const x = hx + Math.cos(b.a) * b.v * a * G.ship.s * 0.6, y = hy + Math.sin(b.a) * b.v * a * G.ship.s * 0.6 + 260 * a * a * G.ship.s;
      const al = 1 - since / 1.1;
      g.strokeStyle = `rgba(255,${Math.round(230 - since * 100)},${Math.round(150 - since * 100)},${al})`;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x - Math.cos(b.a) * 7 * G.ship.s, y - Math.sin(b.a) * 7 * G.ship.s);
      g.stroke();
    }
    glow(g, hx, hy, 70 * G.ship.s, "255,160,80", 0.5 * (1 - since / 1.1));
  }
  g.restore();

  // the emergency lights breathe slowly (never a strobe)
  const alarm = calm ? 0.55 : 0.5 + 0.5 * Math.sin(t * 1.5);
  g.save();
  g.globalCompositeOperation = "lighter";
  glow(g, sx, sy, 220 * G.ship.s, "255,40,40", 0.1 + 0.1 * alarm);
  g.restore();
  const v = g.createRadialGradient(W / 2, h / 2, h * 0.3, W / 2, h / 2, Math.max(W, h) * 0.72);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, `rgba(40,0,6,${0.55 + 0.1 * alarm})`);
  g.fillStyle = v;
  g.fillRect(0, 0, W, h);
  // red wash as the hull goes
  if (!calm && t < 1.2) {
    g.fillStyle = `rgba(255,50,40,${0.35 * Math.exp(-t * 4)})`;
    g.fillRect(0, 0, W, h);
  }

  // a few scan lines drifting down, like the display is struggling
  if (!calm) {
    const y = ((t * 60) % (h + 40)) - 20;
    g.fillStyle = "rgba(255,120,110,0.04)";
    g.fillRect(0, y, W, 14);
  }
  grainFast(g, W, h, calm ? 0 : t, 0.05);
}

/** The ship is clickable: it throws off sparks and the hit is also the hover target. */
export function hitDefeat(S, x, y) {
  const G = S.geo;
  if (!G) return false;
  return Math.hypot(x - G.ship.x, y - G.ship.y) < 110 * G.ship.s;
}
