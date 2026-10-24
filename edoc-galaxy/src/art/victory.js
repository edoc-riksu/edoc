import { rng, TAU, clamp, lerp, smooth } from "./rng";
import { makeAsteroid } from "./asteroid";
import { makeNebula } from "./nebula";
import { makeWorld } from "./world";
import { makeStars, drawStars, grainFast, glow, drawShip } from "./scenes";

/**
 * "Encounter cleared": the ship's pulse cracks the rock that was in the way, it breaks into shards and the way ahead opens up.
 * S = { t, calm, px, py, replayAt } — click the rock to watch it again. With reduced motion it shows the finished frame.
 * Everything is drawn in code from a seed.
 */
export function makeVictory(seed = 12) {
  const r = rng(seed);
  // the rock is cut into irregular chunks that fly apart: Voronoi cells round random points, in rock space (radius 1 = half the sprite)
  const seeds = [[(r() - 0.5) * 0.3, (r() - 0.5) * 0.3]];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + r() * 0.5, d = 0.45 + r() * 0.5;
    seeds.push([Math.cos(a) * d, Math.sin(a) * d]);
  }
  const clipHalf = (poly, nx, ny, c) => {
    // keep the side where nx*x + ny*y <= c
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const da = nx * a[0] + ny * a[1] - c, db = nx * b[0] + ny * b[1] - c;
      if (da <= 0) out.push(a);
      if (da * db < 0) {
        const k = da / (da - db);
        out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]);
      }
    }
    return out;
  };
  const disc = Array.from({ length: 14 }, (_, k) => [Math.cos((k / 14) * TAU) * 0.98, Math.sin((k / 14) * TAU) * 0.98]);
  const shards = seeds.map((p, i) => {
    let poly = disc;
    seeds.forEach((q, j) => {
      if (i === j || poly.length < 3) return;
      const nx = q[0] - p[0], ny = q[1] - p[1];
      poly = clipHalf(poly, nx, ny, (q[0] * q[0] + q[1] * q[1] - p[0] * p[0] - p[1] * p[1]) / 2);
    });
    const jag = poly.map(([x, y]) => [x + (r() - 0.5) * 0.06, y + (r() - 0.5) * 0.06]);
    const cx = jag.reduce((a, q) => a + q[0], 0) / jag.length;
    const cy = jag.reduce((a, q) => a + q[1], 0) / jag.length;
    const len = Math.hypot(cx, cy) || 1;
    const dir = i === 0 ? [(r() - 0.5) * 0.4, -0.6] : [cx / len, cy / len];
    return { pts: jag, cx, cy, dir, v: 150 + r() * 330, spin: (r() - 0.5) * 7, ph: r() };
  });
  const rock = makeAsteroid(seed, 256, 0);
  // the same rock glowing from the break, made once: the orange only lands where the rock is
  let hot = null;
  if (rock && typeof document !== "undefined") {
    hot = document.createElement("canvas");
    hot.width = hot.height = rock.width;
    const hg = hot.getContext("2d");
    hg.drawImage(rock, 0, 0);
    hg.globalCompositeOperation = "source-atop";
    hg.fillStyle = "rgba(255,150,70,0.8)";
    hg.fillRect(0, 0, hot.width, hot.height);
  }
  return {
    rock,
    hot,
    nebula: makeNebula(seed + 3, 320, 180, [[16, 80, 92], [50, 160, 130], [70, 80, 140]], 0.5, 0.8),
    world: makeWorld(seed + 7, 384),
    stars: makeStars(seed + 1, 150),
    shards,
    dust: Array.from({ length: 70 }, () => ({ a: r() * TAU, v: 80 + r() * 420, sz: 0.6 + r() * 2.2, ph: r(), c: r() < 0.5 ? 0 : 1 })),
    bits: Array.from({ length: 36 }, () => ({ a: r() * TAU, v: 60 + r() * 300, ph: r() }))
  };
}

const BEAM = 0.55; // seconds of charge before the rock goes

export function geometry(W, h) {
  const portrait = W / h < 0.85;
  const u = h / 768;
  return {
    portrait,
    u,
    rock: { x: portrait ? W * 0.55 : W * 0.64, y: portrait ? h * 0.3 : h * 0.4, size: (portrait ? W * 0.5 : h * 0.46) },
    ship: { x: portrait ? W * 0.2 : W * 0.2, y: portrait ? h * 0.46 : h * 0.52, s: portrait ? W / 560 : u * 0.95 }
  };
}

export function drawVictory(g, W, h, V, S) {
  const { calm, px, py } = S;
  const G = geometry(W, h);
  const t = calm ? 6 : Math.max(0, S.t - (S.replayAt || 0));
  const age = Math.max(0, t - BEAM); // seconds since the rock went
  const burst = t >= BEAM;
  S.geo = G;

  g.clearRect(0, 0, W, h);
  g.fillStyle = "#02060d";
  g.fillRect(0, 0, W, h);

  // nebula and stars, drifting with the pointer
  g.save();
  g.globalAlpha = 0.85;
  g.drawImage(V.nebula, -W * 0.03 + px * W * 0.012, -h * 0.03 + py * h * 0.01, W * 1.06, h * 1.06);
  g.restore();
  drawStars(g, W, h, V.stars, calm ? 0 : S.t, calm ? 0 : S.t * 2, px, py);

  // the planet ahead brightens once the way is clear
  const open = smooth(0, 1.4, age);
  {
    const R = Math.max(W, h) * (G.portrait ? 0.55 : 0.42);
    const cx = W * (G.portrait ? 0.75 : 0.86) + px * 10, cy = h * 1.0 + py * 6;
    glow(g, cx, cy, R * 1.5, "110,250,190", 0.1 + 0.16 * open);
    g.save();
    g.globalAlpha = 0.65 + 0.35 * open;
    g.drawImage(V.world, cx - R, cy - R, R * 2, R * 2);
    g.restore();
  }

  const rx = G.rock.x + px * 14, ry = G.rock.y + py * 9, sz = G.rock.size;

  // the rock: intact and ringed by the scanner until the pulse hits, then in pieces
  if (!burst) {
    const wob = calm ? 0 : Math.sin(t * 9) * 1.2 * smooth(0.2, BEAM, t);
    const k = smooth(0, BEAM, t);
    g.save();
    g.translate(rx + wob, ry);
    g.rotate(t * 0.08);
    g.drawImage(V.rock, -sz / 2, -sz / 2, sz, sz);
    g.restore();
    // scanner ring closing in
    g.save();
    g.strokeStyle = `rgba(94,234,212,${0.55 + 0.3 * k})`;
    g.lineWidth = 2;
    const rr = sz * (0.78 - 0.18 * k);
    for (let i = 0; i < 4; i++) {
      const a0 = t * 2.2 + (i * TAU) / 4;
      g.beginPath();
      g.arc(rx, ry, rr, a0, a0 + 0.9);
      g.stroke();
    }
    g.restore();
  } else {
    const drift = (1 - Math.exp(-age * 1.9)) / 1.9;
    const fade = 1 - smooth(2.4, 3.8, age);
    for (const sh of V.shards) {
      const dist = sh.v * drift * G.u * (G.portrait ? 0.7 : 1);
      const rot = sh.spin * (1 - Math.exp(-age * 1.4)) + t * 0.05 * sh.spin * 0.4;
      const ox = sh.dir[0] * dist, oy = sh.dir[1] * dist + (calm ? 0 : Math.sin(age * 1.3 + sh.ph * 6) * 4);
      g.save();
      g.globalAlpha = fade;
      g.translate(rx + sh.cx * sz * 0.5 + ox, ry + sh.cy * sz * 0.5 + oy);
      g.rotate(rot);
      g.translate(-sh.cx * sz * 0.5, -sh.cy * sz * 0.5);
      g.beginPath();
      sh.pts.forEach((p, i) => (i ? g.lineTo(p[0] * sz * 0.5, p[1] * sz * 0.5) : g.moveTo(p[0] * sz * 0.5, p[1] * sz * 0.5)));
      g.closePath();
      g.save();
      g.clip();
      g.drawImage(V.rock, -sz / 2, -sz / 2, sz, sz);
      // the fresh break glows, then cools
      const hot = Math.exp(-age * 2.2);
      if (V.hot && hot > 0.02) {
        g.globalAlpha = fade * hot * 0.7;
        g.drawImage(V.hot, -sz / 2, -sz / 2, sz, sz);
      }
      g.restore();
      g.restore();
    }
    // dust and grit
    for (const d of V.dust) {
      const dd = (1 - Math.exp(-age * 1.6)) / 1.6 * d.v * G.u;
      const a = (1 - smooth(0.4 + d.ph * 1.6, 2.6 + d.ph * 1.6, age)) * 0.8;
      if (a <= 0.01) continue;
      g.fillStyle = d.c ? `rgba(170,255,235,${a})` : `rgba(210,200,185,${a * 0.8})`;
      g.fillRect(rx + Math.cos(d.a) * dd, ry + Math.sin(d.a) * dd + age * age * 14, d.sz * G.u, d.sz * G.u);
    }
    // the shock ring, and light from the break
    const ring = (1 - Math.exp(-age * 2.4)) * sz * 2.2;
    g.save();
    g.globalCompositeOperation = "lighter";
    g.strokeStyle = `rgba(150,255,235,${0.7 * Math.exp(-age * 2.2)})`;
    g.lineWidth = 3 + 8 * Math.exp(-age * 3);
    g.beginPath();
    g.arc(rx, ry, ring, 0, TAU);
    g.stroke();
    g.strokeStyle = `rgba(255,255,255,${0.35 * Math.exp(-age * 3.4)})`;
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(rx, ry, ring * 0.7, 0, TAU);
    g.stroke();
    g.restore();
    // slow rays turning behind where the rock was
    const rays = smooth(0.2, 1.1, age) * (0.85 + 0.15 * Math.sin(S.t * 1.1));
    g.save();
    g.globalCompositeOperation = "lighter";
    g.translate(rx, ry);
    g.rotate(calm ? 0.3 : S.t * 0.08);
    for (let i = 0; i < 8; i++) {
      g.rotate(TAU / 8);
      const gr = g.createLinearGradient(0, 0, sz * 1.6, 0);
      gr.addColorStop(0, `rgba(150,255,230,${0.14 * rays})`);
      gr.addColorStop(1, "rgba(150,255,230,0)");
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(sz * 1.6, -sz * 0.07);
      g.lineTo(sz * 1.6, sz * 0.07);
      g.closePath();
      g.fill();
    }
    g.restore();
  }

  // the ship: holds still while it charges, then glides forward
  {
    const glide = smooth(BEAM, BEAM + 2.4, t) * 0.5;
    const bob = calm ? 0 : Math.sin(S.t * 1.4) * 5 * G.u;
    const sx = G.ship.x + G.ship.s * 60 * glide + px * 8;
    const sy = G.ship.y + bob + py * 5;
    drawShip(g, sx, sy, G.ship.s, S.t, calm, 0, { tilt: -0.05, thrust: calm ? 0.6 : 0.9 + glide });
    // the pulse: charges along the line from the nose, then fires
    if (!burst && t > 0.05) {
      const k = smooth(0.05, BEAM, t);
      const nx = sx + 84 * G.ship.s, ny = sy - 4 * G.ship.s;
      const ex = lerp(nx, rx, k), ey = lerp(ny, ry, k);
      g.save();
      g.globalCompositeOperation = "lighter";
      const gr = g.createLinearGradient(nx, ny, ex, ey);
      gr.addColorStop(0, "rgba(94,234,212,0.2)");
      gr.addColorStop(1, "rgba(220,255,250,0.95)");
      g.strokeStyle = gr;
      g.lineWidth = 2 + 4 * k;
      g.beginPath();
      g.moveTo(nx, ny);
      g.lineTo(ex, ey);
      g.stroke();
      glow(g, ex, ey, 40 + 40 * k, "180,255,240", 0.6 * k);
      g.restore();
    }
  }

  // flash of the break
  if (burst && age < 0.7 && !calm) {
    glow(g, rx, ry, sz * 1.2, "255,255,245", 0.9 * Math.exp(-age * 7), "lighter");
  }

  // vignette and grain
  const v = g.createRadialGradient(W / 2, h / 2, h * 0.35, W / 2, h / 2, Math.max(W, h) * 0.72);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.5)");
  g.fillStyle = v;
  g.fillRect(0, 0, W, h);
  grainFast(g, W, h, calm ? 0 : S.t, 0.07);
}

/** Click anywhere near where the rock was to watch it break again. */
export function hitVictory(S, x, y) {
  const G = S.geo;
  if (!G) return false;
  return Math.hypot(x - G.rock.x, y - G.rock.y) < G.rock.size * 0.85;
}
