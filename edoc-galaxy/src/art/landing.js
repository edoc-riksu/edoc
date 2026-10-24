import { rng, TAU, clamp, lerp, smooth } from "./rng";
import { makeWorld } from "./world";
import { grain, glow, drawShip } from "./scenes";
import { makeSurface, geom, drawSky, drawLand, drawForeground, endScroll } from "./surface";
import { FINAL_TILT, SINK, lowest, drawLander, drawSmoke, drawFurrow, makeImpact, drawImpact } from "./lander";

/**
 * The landing: the ship comes down out of orbit, burns through the atmosphere and sets down on the surface.
 * S = { t, calm, px, py, severity (0 smooth, 1 rough, 2 crash), duration (seconds), progress (0..1, optional override) }.
 * With reduced motion it shows the finished frame. The last frame matches drawSurface, so the next screen carries on from it.
 */
export function makeLanding(seed = 31) {
  const r = rng(seed);
  return {
    surface: makeSurface(seed),
    world: makeWorld(seed + 9, 512),
    impact: makeImpact(seed + 4),
    clouds: Array.from({ length: 36 }, () => ({ y: 0.28 + r() * 0.62, len: 0.12 + r() * 0.4, sp: 0.5 + r() * 1.3, ph: r(), a: 0.07 + r() * 0.15, th: 0.004 + r() * 0.016 })),
    plume: Array.from({ length: 22 }, () => ({ y: (r() - 0.5) * 2, len: 0.35 + r() * 0.65, sp: 0.8 + r() * 1.4, ph: r() }))
  };
}

const TOUCH = [0.8, 0.78, 0.76];
const SKID = [0.02, 0.12, 0.14];

export function drawLanding(g, W, h, L, S) {
  const { t, calm, px, py } = S;
  const A = L.surface;
  const G = geom(W, h);
  const sev = Math.max(0, Math.min(2, S.severity | 0));
  const dur = S.duration || 9;
  const prog = S.progress != null ? clamp(S.progress, 0, 1) : calm ? 1 : clamp(t / dur, 0, 1);
  const tt = TOUCH[sev];
  const age = Math.max(0, (prog - tt) * dur);
  const e = prog * prog * (3 - 2 * prog);
  const atm = smooth(0.1, 0.5, prog);
  const gnd = smooth(0.46, 0.72, prog);
  const q = clamp((prog - 0.42) / (tt + SKID[sev] - 0.42), 0, 1);
  const scroll = endScroll(h) * (1 - Math.pow(1 - q, 3));
  const heat = smooth(0.12, 0.26, prog) * (1 - smooth(0.5, 0.66, prog)) * [0.85, 1.1, 1.3][sev];

  // camera shake: a rumble through the entry, a jolt on touchdown
  const jolt = prog >= tt ? [0, 7, 18][sev] * G.s * Math.exp(-age * 3.2) : sev * 1.7 * G.s * heat;
  const shx = calm ? 0 : (Math.sin(t * 47) + 0.6 * Math.sin(t * 83)) * jolt;
  const shy = calm ? 0 : (Math.sin(t * 59 + 1) + 0.6 * Math.sin(t * 71)) * jolt;

  g.clearRect(0, 0, W, h);
  g.save();
  const zoom = 1 + ((Math.abs(shx) + Math.abs(shy)) * 2) / h;
  g.translate(W / 2 + shx, h / 2 + shy);
  g.scale(zoom, zoom);
  g.translate(-W / 2, -h / 2);
  g.fillStyle = "#02060d";
  g.fillRect(-20, -20, W + 40, h + 40);

  // space: stars and the world below
  const star = 1 - atm * 0.85;
  g.save();
  g.globalAlpha = star;
  g.translate(G.off, 0);
  g.drawImage(A.nebula, -G.vw * 0.03, -h * 0.02, G.vw * 1.08, h * 0.95);
  g.restore();
  g.save();
  g.globalAlpha = star;
  const stars = A.stars;
  for (const s of stars) {
    const x = s.x * W, y = s.y * h * 0.8;
    const a = (0.3 + 0.7 * s.z) * (0.78 + 0.22 * Math.sin((calm ? 0 : t) * 1.3 + s.tw));
    g.fillStyle = `rgba(226,236,255,${a})`;
    g.fillRect(x, y, 0.5 + s.z * 1.5, 0.5 + s.z * 1.5);
  }
  g.restore();
  {
    const R = lerp(0.9, 4.2, e) * h;
    const top = lerp(0.76, G.hz / h, Math.pow(e, 1.15)) * h;
    const cx = W * 0.56, cyy = top + R;
    glow(g, cx, top + R * 0.02, R * 0.5 + h * 0.2, "110,240,210", 0.22 * (1 - atm * 0.6));
    g.save();
    g.beginPath();
    g.arc(cx, cyy, R, 0, TAU);
    g.clip();
    const body = g.createRadialGradient(cx - R * 0.25, cyy - R * 0.1, R * 0.2, cx, cyy, R);
    body.addColorStop(0, "#1d7f66");
    body.addColorStop(0.75, "#145f52");
    body.addColorStop(0.95, "#2fae94");
    body.addColorStop(1, "#9ff8e6");
    g.fillStyle = body;
    g.fillRect(cx - R, cyy - R, R * 2, R * 2);
    g.globalAlpha = 0.6;
    g.drawImage(L.world, 150, 130, 212, 212, cx - R, cyy - R, R * 2, R * 2);
    g.restore();
    g.save();
    g.strokeStyle = "rgba(140,255,230,0.5)";
    g.lineWidth = lerp(2, 7, e);
    g.shadowColor = "rgba(110,255,220,0.8)";
    g.shadowBlur = 26;
    g.beginPath();
    g.arc(cx, cyy, R, Math.PI * 1.18, Math.PI * 1.82);
    g.stroke();
    g.restore();
  }
  // air thickens into sky
  drawSky(g, W, h, A, S, G, atm, true);

  // cloud streaks rush past while the air is thick
  const cl = smooth(0.2, 0.38, prog) * (1 - smooth(0.62, 0.78, prog));
  if (cl > 0.01) {
    for (const c of L.clouds) {
      const p = calm ? c.ph : (c.ph + t * c.sp * 0.22 * (0.6 + e)) % 1;
      const x = W * (1.25 - p * 1.7), y = c.y * h, len = c.len * W * (0.5 + e), th = c.th * h * 2.4;
      const gr = g.createLinearGradient(x, 0, x + len, 0);
      gr.addColorStop(0, "rgba(220,245,240,0)");
      gr.addColorStop(0.5, `rgba(220,245,240,${c.a * cl})`);
      gr.addColorStop(1, "rgba(220,245,240,0)");
      g.fillStyle = gr;
      g.beginPath();
      g.ellipse(x + len / 2, y, len / 2, th, 0, 0, TAU);
      g.fill();
    }
  }

  drawLand(g, W, h, A, S, G, { scroll, alpha: gnd });

  // the ship
  const fp = clamp(prog / tt, 0, 1);
  const thEnd = FINAL_TILT[sev];
  const flare = smooth(tt - 0.2, tt - 0.03, prog);
  let th = prog >= tt ? thEnd : lerp(0.34, thEnd, flare);
  if (sev > 0 && prog < tt && !calm) th += sev * 0.022 * Math.sin(t * 8) * smooth(0.2, 0.45, prog);
  const sx = lerp(W * (W / h < 0.85 ? 0.3 : 0.14), G.shipX, smooth(0, 1, fp)) + px * W * 0.006;
  const restY = G.gy - (lowest(thEnd) - SINK[sev]) * G.s;
  let cy = lerp(h * 0.16, restY, Math.pow(fp, 1.9));
  if (sev === 1 && age > 0) cy -= Math.abs(Math.sin(age * 7)) * 34 * G.s * Math.exp(-age * 2.2);
  let thrust;
  if (prog < tt - 0.03) thrust = lerp(1, 1.35, flare);
  else if (sev === 2) thrust = prog < tt ? (Math.sin(t * 37) > 0 ? 0.9 : 0.1) : 0;
  else thrust = Math.max(0, 1 - (prog - (tt - 0.03)) / 0.07) * 1.25;
  if (calm) thrust = 0;
  const nose = [sx + Math.cos(th) * 84 * G.s, cy + Math.sin(th) * 84 * G.s];

  // shadow and scars on the ground
  if (prog > 0.4) {
    const sh = smooth(0.4, tt, prog);
    g.fillStyle = `rgba(2,8,12,${0.45 * sh})`;
    g.beginPath();
    g.ellipse(sx, G.gy + 2 * G.s, lerp(50, 100, sh) * G.s, lerp(4, 9, sh) * G.s, 0, 0, TAU);
    g.fill();
  }
  if (sev >= 1) drawFurrow(g, sx - 20 * G.s, G.gy + 3 * G.s, G.s, sev, clamp((prog - tt + 0.02) / (SKID[sev] + 0.03), 0, 1));
  if (sev === 2 && prog >= tt) {
    g.fillStyle = "rgba(20,38,40,0.9)";
    g.beginPath();
    g.ellipse(sx + 80 * G.s, G.gy + 4 * G.s, 38 * G.s * smooth(tt, tt + 0.03, prog), 10 * G.s * smooth(tt, tt + 0.03, prog), 0.05, 0, TAU);
    g.fill();
  }

  // heat: a bright wake behind the nose
  if (heat > 0.01) {
    for (const p of L.plume) {
      const k = calm ? p.ph : (p.ph + t * p.sp) % 1;
      const x0 = nose[0] - 20 * G.s - k * 40 * G.s;
      const len = p.len * W * 0.34 * heat;
      const y = nose[1] + p.y * 46 * G.s * (0.4 + k) - 10 * G.s;
      const gr = g.createLinearGradient(x0, 0, x0 - len, 0);
      gr.addColorStop(0, `rgba(255,${Math.round(220 - k * 90)},${Math.round(150 - k * 100)},${0.7 * heat * (1 - k * 0.6)})`);
      gr.addColorStop(1, "rgba(255,110,40,0)");
      g.strokeStyle = gr;
      g.lineWidth = Math.max(1, (2.6 - k * 1.8) * G.s);
      g.beginPath();
      g.moveTo(x0, y);
      g.lineTo(x0 - len, y - (y - cy) * 0.1);
      g.stroke();
    }
  }
  // damage trail
  if (sev >= 1 && prog > 0.5 && prog < tt + 0.04) {
    const kk = smooth(0.5, 0.58, prog) * (1 - smooth(tt, tt + 0.04, prog)) * (sev === 2 ? 1 : 0.45);
    for (let i = 0; i < 16; i++) {
      const a = i / 16;
      const x = sx - 40 * G.s - a * W * 0.3 - (calm ? 0 : (t * 80 * G.s) % 20);
      const y = cy - 6 * G.s + Math.sin(a * 5 + (calm ? 0 : t * 3)) * 8 * G.s * a - a * 10 * G.s;
      const rad = (8 + a * 36) * G.s;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      const al = (1 - a) * 0.5 * kk;
      gr.addColorStop(0, sev === 2 && a < 0.25 ? `rgba(255,140,60,${al})` : `rgba(30,30,32,${al})`);
      gr.addColorStop(1, "rgba(30,30,32,0)");
      g.fillStyle = gr;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  }
  const soot = [0, 0.55, 1][sev] * smooth(0.3, 0.55, prog);
  drawLander(g, sx, cy, G.s, th, t, calm, { thrust, sev, soot });
  if (heat > 0.01) {
    glow(g, nose[0] + 8 * G.s, nose[1], 150 * G.s * heat, "255,150,60", 0.34 * Math.min(1, heat));
    glow(g, nose[0], nose[1], 60 * G.s * heat, "255,238,200", 0.5 * Math.min(1, heat));
  }
  if (prog >= tt) {
    drawImpact(g, sx - 10 * G.s, G.gy + 2 * G.s, G.s, sev, age, L.impact);
    const sm = smooth(tt, tt + 0.05, prog);
    if (sev >= 1) drawSmoke(g, sx - 52 * G.s, cy - 10 * G.s, G.s, t, calm, (sev === 2 ? 1 : 0.4) * sm, sev === 2 ? 0.85 : 0.25);
  }

  drawForeground(g, W, h, A, S, G, { scroll, alpha: gnd });

  // vignette, the orange wash of re-entry and the flash of impact
  const v = g.createRadialGradient(W / 2, h / 2, h * 0.35, W / 2, h / 2, Math.max(W, h) * 0.72);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.45)");
  g.fillStyle = v;
  g.fillRect(-20, -20, W + 40, h + 40);
  g.restore();
  if (heat > 0.01) {
    g.fillStyle = `rgba(255,120,40,${0.05 * Math.min(1, heat)})`;
    g.fillRect(0, 0, W, h);
  }
  if (sev >= 1 && age > 0 && !calm) {
    const f = [0, 0.35, 0.85][sev] * Math.exp(-age * 9);
    if (f > 0.01) {
      g.fillStyle = `rgba(255,244,225,${f})`;
      g.fillRect(0, 0, W, h);
    }
  }
  grain(g, W, h, calm ? 0 : t, 0.08);
}
