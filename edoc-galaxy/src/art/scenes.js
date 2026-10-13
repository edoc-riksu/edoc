import { rng, TAU, clamp, lerp, smooth } from "./rng";
import { makeAsteroid } from "./asteroid";
import { makeNebula } from "./nebula";
import { makeWorld } from "./world";

/* ------------------------------------------------------------------ */
/* shared bits                                                         */
/* ------------------------------------------------------------------ */
export function makeStars(seed, n) {
  const r = rng(seed);
  return Array.from({ length: n }, () => {
    const z = 0.15 + r() * 0.85;
    return { x: r(), y: r(), z, tw: r() * TAU, hue: r() < 0.12 ? 1 : r() < 0.2 ? 2 : 0 };
  });
}

export function drawStars(g, w, h, stars, t, drift = 0, ox = 0, oy = 0) {
  for (const s of stars) {
    const x = ((((s.x * w - drift * s.z + ox * s.z * 14) % w) + w) % w);
    const y = s.y * h + oy * s.z * 10;
    const a = (0.3 + 0.7 * s.z) * (0.78 + 0.22 * Math.sin(t * 1.3 + s.tw));
    const sz = 0.5 + s.z * 1.5;
    g.fillStyle = s.hue === 1 ? `rgba(255,226,190,${a})` : s.hue === 2 ? `rgba(190,215,255,${a})` : `rgba(226,236,255,${a})`;
    g.fillRect(x, y, sz, sz);
    if (s.z > 0.94) {
      g.fillStyle = `rgba(226,236,255,${a * 0.25})`;
      g.fillRect(x - 3, y + sz / 2 - 0.4, 7 + sz, 0.8);
      g.fillRect(x + sz / 2 - 0.4, y - 3, 0.8, 7 + sz);
    }
  }
}

let grainTile;
function grain(g, w, h, t, amount = 0.07) {
  if (typeof document === "undefined") return;
  if (!grainTile) {
    grainTile = document.createElement("canvas");
    grainTile.width = grainTile.height = 160;
    const gg = grainTile.getContext("2d");
    const im = gg.createImageData(160, 160);
    const r = rng(99);
    for (let i = 0; i < im.data.length; i += 4) {
      const v = r() * 255;
      im.data[i] = im.data[i + 1] = im.data[i + 2] = v;
      im.data[i + 3] = 255;
    }
    gg.putImageData(im, 0, 0);
  }
  const pat = g.createPattern(grainTile, "repeat");
  g.save();
  g.globalAlpha = amount;
  g.globalCompositeOperation = "overlay";
  g.translate((Math.floor(t * 30) * 37) % 160, (Math.floor(t * 30) * 91) % 160);
  g.fillStyle = pat;
  g.fillRect(-160, -160, w + 320, h + 320);
  g.restore();
}

function glow(g, x, y, rad, rgb, a, mode = "lighter") {
  g.save();
  g.globalCompositeOperation = mode;
  const gr = g.createRadialGradient(x, y, 0, x, y, rad);
  gr.addColorStop(0, `rgba(${rgb},${a})`);
  gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr;
  g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  g.restore();
}

function drawPlanet(g, sprite, x, y, R, glowA = 1) {
  glow(g, x, y, R * 2.6, "110,250,190", 0.2 * glowA);
  glow(g, x, y, R * 1.5, "150,255,210", 0.16 * glowA);
  g.drawImage(sprite, x - R, y - R, R * 2, R * 2);
}

/* ------------------------------------------------------------------ */
/* approach screen: the cockpit                                        */
/* ------------------------------------------------------------------ */
const winPath = (g, w, h, begin = true) => {
  if (begin) g.beginPath();
  g.moveTo(0.235 * w, 0.1 * h);
  g.lineTo(0.765 * w, 0.1 * h);
  g.bezierCurveTo(0.84 * w, 0.1 * h, 0.87 * w, 0.17 * h, 0.872 * w, 0.3 * h);
  g.lineTo(0.848 * w, 0.58 * h);
  g.bezierCurveTo(0.842 * w, 0.655 * h, 0.8 * w, 0.672 * h, 0.75 * w, 0.672 * h);
  g.lineTo(0.25 * w, 0.672 * h);
  g.bezierCurveTo(0.2 * w, 0.672 * h, 0.158 * w, 0.655 * h, 0.152 * w, 0.58 * h);
  g.lineTo(0.128 * w, 0.3 * h);
  g.bezierCurveTo(0.13 * w, 0.17 * h, 0.16 * w, 0.1 * h, 0.235 * w, 0.1 * h);
  g.closePath();
};
const sidePath = (g, w, h, left, begin = true) => {
  const X = (x) => (left ? x : w - x);
  if (begin) g.beginPath();
  g.moveTo(X(-4), 0.17 * h);
  g.lineTo(X(0.098 * w), 0.25 * h);
  g.quadraticCurveTo(X(0.108 * w), 0.4 * h, X(0.1 * w), 0.6 * h);
  g.lineTo(X(-4), 0.72 * h);
  g.closePath();
};

export function makeApproach(seed = 7) {
  const r = rng(seed);
  const sprites = [0, 1, 2, 3, 4, 5].map((i) => makeAsteroid(seed * 31 + i * 17, 176, i % 3));
  const bigs = [makeAsteroid(seed * 97 + 5, 480, 1), makeAsteroid(seed * 53 + 2, 480, 0)];
  const rocks = Array.from({ length: 64 }, () => {
    const z = r(); // 0 far .. 1 near
    return { along: r(), off: (r() - 0.5) * 0.24 * (0.5 + r()), size: 0.01 + Math.pow(r(), 2.4) * 0.06 + z * 0.02, spr: Math.floor(r() * 6), z, ph: r() * TAU };
  });
  const sideRocks = Array.from({ length: 7 }, () => ({ x: r(), y: r(), size: 0.05 + r() * 0.09, spr: Math.floor(r() * 6), ph: r() * TAU }));
  const grime = makeNebula(seed + 4, 220, 124, [[40, 46, 56], [20, 24, 30], [60, 56, 50]], 0.7, 1);
  return {
    seed, sprites, bigs, rocks, sideRocks, grime,
    nebula: makeNebula(seed + 1, 360, 202, [[10, 70, 84], [46, 150, 126], [58, 60, 130]], 0.46, 0.85),
    planet: makeWorld(seed + 2, 420),
    stars: makeStars(seed + 3, 300)
  };
}

function drawSpace(g, w, h, A, S) {
  const { t, calm, px, py, variant } = S;
  const bg = g.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#050d1a");
  bg.addColorStop(1, "#0a1a24");
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.save();
  g.globalAlpha = 0.9;
  g.drawImage(A.nebula, -w * 0.05 + px * w * 0.012, -h * 0.05 + py * h * 0.012, w * 1.1, h * 1.1);
  g.restore();
  drawStars(g, w, h, A.stars, calm ? 0 : t, calm ? 0 : t * 1.6, px, py);

  drawPlanet(g, A.planet, 0.305 * w + px * w * 0.01, 0.3 * h + py * h * 0.01, 0.052 * w);

  // dust lane the rocks run along
  const x0 = 0.12 * w, y0 = 0.64 * h, x1 = 0.9 * w, y1 = 0.2 * h;
  g.save();
  g.globalCompositeOperation = "lighter";
  const lane = g.createLinearGradient(x0, y0, x1, y1);
  lane.addColorStop(0, "rgba(90,130,140,0)");
  lane.addColorStop(0.5, "rgba(90,130,140,0.07)");
  lane.addColorStop(1, "rgba(90,130,140,0)");
  g.strokeStyle = lane;
  g.lineWidth = h * 0.26;
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.stroke();
  g.restore();

  const big = S.big; // {x, y, s} in canvas px
  const sorted = [...A.rocks].sort((a, b) => a.z - b.z);
  const blur = typeof g.filter === "string";
  for (const k of sorted) {
    const u = (k.along + (calm ? 0 : t * 0.0035 * (0.4 + k.z))) % 1;
    const par = 0.5 + k.z * 1.4;
    const x = lerp(x0, x1, u) + k.off * h * 0.5 + px * w * 0.012 * par + (calm ? 0 : Math.sin(t * 0.35 + k.ph) * 0.003 * w);
    const y = lerp(y0, y1, u) + k.off * h + py * h * 0.012 * par;
    const sz = k.size * w * (0.55 + 0.9 * u);
    if (Math.hypot(x - big.x, y - big.y) < big.s * 0.78) continue;
    g.save();
    g.globalAlpha = 0.45 + 0.55 * k.z;
    if (blur && k.z < 0.3) g.filter = `blur(${((0.3 - k.z) * 3).toFixed(1)}px)`;
    g.drawImage(A.sprites[k.spr], x - sz / 2, y - sz / 2, sz, sz);
    g.restore();
  }

  // the obstacle the card is about
  const bigSprite = A.bigs[variant % A.bigs.length];
  const bob = calm ? 0 : Math.sin(t * 0.5) * 0.005 * h;
  const sc = 1 + S.hover * 0.025;
  g.save();
  glow(g, big.x, big.y + bob, big.s * 1.1, "20,30,40", 0.35, "source-over");
  g.translate(big.x, big.y + bob);
  g.scale(sc, sc);
  g.drawImage(bigSprite, -big.s / 2, -big.s / 2, big.s, big.s);
  g.restore();

  // scanner lock
  const close = calm ? 1 : smooth(0, 1.2, t - S.lockT);
  const pulse = calm ? 1 : 0.88 + 0.12 * Math.sin(t * 2.4);
  const a = (0.55 + 0.45 * S.hover) * pulse;
  const b = big.s * (0.66 + (1 - close) * 0.3 - S.hover * 0.04);
  const l = big.s * 0.2;
  g.save();
  g.translate(big.x, big.y + bob);
  g.strokeStyle = `rgba(94,234,212,${a})`;
  g.shadowColor = "rgba(94,234,212,0.95)";
  g.shadowBlur = 9 + S.hover * 8;
  g.lineWidth = Math.max(1.6, w * 0.0019);
  g.lineCap = "round";
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    g.beginPath();
    g.moveTo(sx * b, sy * (b - l));
    g.lineTo(sx * b, sy * b);
    g.lineTo(sx * (b - l), sy * b);
    g.stroke();
  }
  // a closing contour that traces the rock
  g.globalAlpha = 0.55 * close;
  g.setLineDash([big.s * 0.025, big.s * 0.04]);
  g.lineDashOffset = calm ? 0 : -t * 14;
  g.beginPath();
  g.arc(0, 0, big.s * 0.6, 0, TAU);
  g.stroke();
  g.setLineDash([]);
  g.globalAlpha = 0.8;
  for (let i = 0; i < 4; i++) {
    const an = (i * Math.PI) / 2;
    g.beginPath();
    g.moveTo(Math.cos(an) * big.s * 0.69, Math.sin(an) * big.s * 0.69);
    g.lineTo(Math.cos(an) * big.s * 0.84, Math.sin(an) * big.s * 0.84);
    g.stroke();
  }
  g.restore();
}

function led(g, x, y, w, h, on, color = "255,170,60") {
  if (on) {
    glow(g, x + w / 2, y + h / 2, Math.max(w, h) * 1.7, color, 0.26);
    g.fillStyle = `rgb(${color})`;
  } else g.fillStyle = "#1c1a1a";
  g.fillRect(x, y, w, h);
  if (on) {
    g.fillStyle = "rgba(255,255,255,0.55)";
    g.fillRect(x, y, w, Math.max(1, h * 0.28));
  }
}

function metal(g, x0, y0, x1, y1, stops) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  return gr;
}

function screw(g, x, y, s) {
  g.fillStyle = "#0b0f15";
  g.beginPath();
  g.arc(x, y, s, 0, TAU);
  g.fill();
  g.fillStyle = "rgba(190,205,225,0.45)";
  g.beginPath();
  g.arc(x - s * 0.25, y - s * 0.3, s * 0.45, 0, TAU);
  g.fill();
}

function drawFrame(g, w, h, A, S) {
  const { t, calm, px, py } = S;
  const r = rng(A.seed + 55);
  const ox = -px * w * 0.004, oy = -py * h * 0.004; // the hull shifts a hair against the view
  g.save();
  g.translate(ox, oy);
  g.scale(1.012, 1.012);
  g.translate(-w * 0.006, -h * 0.006);

  // hull, with the glass cut out
  g.save();
  g.beginPath();
  g.rect(-w * 0.05, -h * 0.05, w * 1.1, h * 1.1);
  winPath(g, w, h, false);
  sidePath(g, w, h, true, false);
  sidePath(g, w, h, false, false);
  g.fillStyle = metal(g, 0, 0, w, h, [[0, "#2f3b48"], [0.5, "#1d2631"], [1, "#0f141b"]]);
  g.fill("evenodd");
  g.clip("evenodd");

  // wear: grime clouds, brushed streaks, scratches
  g.globalAlpha = 0.5;
  g.globalCompositeOperation = "multiply";
  g.drawImage(A.grime, 0, 0, w, h);
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = 1;
  for (let i = 0; i < 520; i++) {
    const x = r() * w, y = r() * h, len = 20 + r() * 120;
    g.strokeStyle = r() < 0.5 ? "rgba(180,200,225,0.035)" : "rgba(0,0,0,0.12)";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + len, y + (r() - 0.5) * 3);
    g.stroke();
  }
  for (let i = 0; i < 26; i++) {
    const x = r() * w, y = r() * 0.7 * h, a = r() * TAU, len = 10 + r() * 50;
    g.strokeStyle = "rgba(200,215,235,0.16)";
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    g.stroke();
  }

  // structural ribs
  const rib = (x0, y0, x1, y1, wd) => {
    g.save();
    g.lineCap = "butt";
    g.strokeStyle = "rgba(6,9,13,0.85)";
    g.lineWidth = wd;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    g.strokeStyle = "rgba(150,175,200,0.16)";
    g.lineWidth = Math.max(1, wd * 0.12);
    g.translate(-wd * 0.28, 0);
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    g.restore();
  };
  rib(0.5 * w, 0, 0.5 * w, 0.1 * h, w * 0.012);
  rib(0.05 * w, 0, 0.13 * w, 0.2 * h, w * 0.01);
  rib(0.95 * w, 0, 0.87 * w, 0.2 * h, w * 0.01);
  rib(0.13 * w, 0.72 * h, 0.17 * w, 0.62 * h, w * 0.012);
  rib(0.87 * w, 0.72 * h, 0.83 * w, 0.62 * h, w * 0.012);
  for (const [x, y] of [[0.06, 0.06], [0.11, 0.18], [0.94, 0.06], [0.89, 0.18], [0.3, 0.05], [0.7, 0.05], [0.04, 0.8], [0.96, 0.8]]) screw(g, x * w, y * h, w * 0.0035);

  // overhead panel
  g.fillStyle = metal(g, 0, 0, 0, 0.1 * h, [[0, "#1a222d"], [1, "#0b1017"]]);
  g.beginPath();
  g.moveTo(0.385 * w, -4);
  g.lineTo(0.615 * w, -4);
  g.lineTo(0.59 * w, 0.082 * h);
  g.lineTo(0.41 * w, 0.082 * h);
  g.closePath();
  g.fill();
  g.strokeStyle = "rgba(150,175,200,0.25)";
  g.lineWidth = 1.2;
  g.stroke();
  g.restore();

  // lights on the overhead panel
  const blink = calm ? 1 : Math.sin(t * 3) > -0.4 ? 1 : 0.2;
  for (let i = 0; i < 4; i++) led(g, 0.43 * w + i * 0.0145 * w, 0.028 * h, 0.0065 * w, 0.03 * h, i < 3 || blink > 0.5);
  led(g, 0.535 * w, 0.022 * h, 0.014 * w, 0.042 * h, true);
  led(g, 0.554 * w, 0.022 * h, 0.014 * w, 0.042 * h, true);

  // bezels: dark band, then a bevel highlight so the glass reads as set back
  const bez = (path, wd) => {
    g.save();
    path();
    g.lineJoin = "round";
    g.strokeStyle = "rgba(5,8,12,0.92)";
    g.lineWidth = wd;
    g.stroke();
    g.strokeStyle = "rgba(160,185,210,0.4)";
    g.lineWidth = Math.max(1.2, wd * 0.16);
    g.translate(0, -wd * 0.34);
    g.stroke();
    g.strokeStyle = "rgba(0,0,0,0.5)";
    g.translate(0, wd * 0.68);
    g.stroke();
    g.restore();
  };
  bez(() => winPath(g, w, h), w * 0.011);
  bez(() => sidePath(g, w, h, true), w * 0.008);
  bez(() => sidePath(g, w, h, false), w * 0.008);

  // cables looped across the upper hull
  g.lineCap = "round";
  for (const [ax, ay, bx, by, cx, cy, wd] of [[0.1, 0.05, 0.17, -0.02, 0.2, 0.14, 0.006], [0.9, -0.02, 0.83, 0.1, 0.86, 0.17, 0.006], [0.29, -0.01, 0.34, 0.08, 0.25, 0.1, 0.004]]) {
    g.strokeStyle = "rgba(7,9,12,0.95)";
    g.lineWidth = w * wd;
    g.beginPath(); g.moveTo(ax * w, ay * h); g.quadraticCurveTo(bx * w, by * h, cx * w, cy * h); g.stroke();
    g.strokeStyle = "rgba(150,120,90,0.4)";
    g.lineWidth = w * wd * 0.22;
    g.translate(-w * wd * 0.15, -w * wd * 0.15);
    g.stroke();
    g.translate(w * wd * 0.15, w * wd * 0.15);
  }

  // console
  g.fillStyle = metal(g, 0, 0.62 * h, 0, h, [[0, "#26313e"], [0.4, "#161d27"], [1, "#0a0e14"]]);
  g.beginPath();
  g.moveTo(-4, 0.72 * h);
  g.lineTo(0.12 * w, 0.628 * h);
  g.bezierCurveTo(0.14 * w, 0.66 * h, 0.2 * w, 0.68 * h, 0.25 * w, 0.68 * h);
  g.lineTo(0.75 * w, 0.68 * h);
  g.bezierCurveTo(0.8 * w, 0.68 * h, 0.86 * w, 0.66 * h, 0.88 * w, 0.628 * h);
  g.lineTo(w + 4, 0.72 * h);
  g.lineTo(w + 4, h + 4);
  g.lineTo(-4, h + 4);
  g.closePath();
  g.fill();
  g.strokeStyle = "rgba(160,185,210,0.35)";
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(0.25 * w, 0.68 * h);
  g.lineTo(0.75 * w, 0.68 * h);
  g.stroke();

  // glare shield with the segmented hull bar
  g.fillStyle = metal(g, 0, 0.655 * h, 0, 0.73 * h, [[0, "#323f4d"], [1, "#161d26"]]);
  g.beginPath();
  g.moveTo(0.33 * w, 0.735 * h);
  g.lineTo(0.375 * w, 0.66 * h);
  g.lineTo(0.625 * w, 0.66 * h);
  g.lineTo(0.67 * w, 0.735 * h);
  g.closePath();
  g.fill();
  g.strokeStyle = "rgba(160,185,210,0.3)";
  g.stroke();
  const lit = calm ? 7 : 7 + Math.round(Math.sin(t * 0.7) * 0.5 + 0.5);
  for (let i = 0; i < 14; i++) led(g, 0.402 * w + i * 0.0153 * w, 0.678 * h, 0.011 * w, 0.015 * h, i < lit);

  // side consoles: insets, toggle banks, light strips, a dial
  for (const left of [true, false]) {
    const X = (x, wd = 0) => (left ? x * w : (1 - x) * w - wd);
    // inset panel
    g.fillStyle = "#0a0e14";
    g.fillRect(X(0.17, 0.2 * w), 0.725 * h, 0.2 * w, 0.2 * h);
    g.strokeStyle = "rgba(150,175,200,0.18)";
    g.strokeRect(X(0.17, 0.2 * w), 0.725 * h, 0.2 * w, 0.2 * h);
    for (let i = 0; i < 3; i++) {
      const tx = X(0.205 + i * 0.037, 0.02 * w);
      g.fillStyle = "#06090d";
      g.fillRect(tx, 0.76 * h, 0.02 * w, 0.085 * h);
      g.fillStyle = metal(g, tx, 0, tx + 0.02 * w, 0, [[0, "#7d8c9c"], [1, "#3b4653"]]);
      g.fillRect(tx + 0.004 * w, 0.775 * h + (i === 1 ? 0.026 * h : 0), 0.012 * w, 0.045 * h);
    }
    led(g, X(0.205, 0.012 * w), 0.738 * h, 0.012 * w, 0.01 * h, true);
    led(g, X(0.245, 0.012 * w), 0.738 * h, 0.012 * w, 0.01 * h, true);
    // dial
    const dx = X(0.09), dy = 0.86 * h, dr = 0.036 * w;
    g.fillStyle = "#06090d";
    g.beginPath(); g.arc(dx, dy, dr, 0, TAU); g.fill();
    g.strokeStyle = "rgba(255,170,60,0.6)";
    g.lineWidth = 2;
    g.beginPath(); g.arc(dx, dy, dr * 0.78, Math.PI * 0.8, Math.PI * 2.15); g.stroke();
    const an = (calm ? 0 : Math.sin(t * 0.6) * 0.1) + (left ? 5.1 : 4.4);
    g.strokeStyle = "rgba(220,235,250,0.9)";
    g.beginPath(); g.moveTo(dx, dy); g.lineTo(dx + Math.cos(an) * dr * 0.7, dy + Math.sin(an) * dr * 0.7); g.stroke();
    // light strip
    for (let i = 0; i < 7; i++) led(g, X(0.135, 0.016 * w), 0.74 * h + i * 0.026 * h, 0.016 * w, 0.014 * h, i > 1, i > 4 ? "255,110,50" : "255,170,60");
  }
  g.restore();
}

/** Paints the approach screen. S = {t, calm, px, py (-1..1 pointer), hover (0..1), variant, lockT}. */
export function drawApproach(g, w, h, A, S) {
  // on tall screens the picture keeps its shape and is cropped to the right side, where the rock is
  if (S._v !== S.variant) { S._v = S.variant; S.lockT = S.t; } // a new rock restarts the scanner lock
  const vw = Math.max(w, h * 1.45);
  const off = -(vw - w) * 0.74;
  S.off = off;
  S.big = { x: 0.69 * vw, y: 0.4 * h, s: 0.17 * vw };
  S.hitBig = { x: S.big.x + off, y: S.big.y, r: S.big.s * 0.62 };
  g.clearRect(0, 0, w, h);
  g.fillStyle = "#04070d";
  g.fillRect(0, 0, w, h);
  g.save();
  g.translate(off, 0);
  g.save();
  g.beginPath();
  winPath(g, vw, h, false);
  sidePath(g, vw, h, true, false);
  sidePath(g, vw, h, false, false);
  g.clip();
  drawSpace(g, vw, h, A, S);
  for (const k of A.sideRocks) {
    const sz = k.size * vw;
    const x = k.x < 0.5 ? 0.012 * vw + k.x * 0.08 * vw : vw - 0.012 * vw - (1 - k.x) * 0.08 * vw;
    const y = 0.2 * h + k.y * 0.45 * h;
    g.drawImage(A.sprites[k.spr], x + S.px * vw * 0.02 - sz / 2, y + (S.calm ? 0 : Math.sin(S.t * 0.3 + k.ph) * 4) - sz / 2, sz, sz);
  }
  const sheen = g.createLinearGradient(0, 0, vw, h * 0.7);
  sheen.addColorStop(0, "rgba(190,225,255,0.09)");
  sheen.addColorStop(0.32, "rgba(190,225,255,0)");
  sheen.addColorStop(0.7, "rgba(190,225,255,0.03)");
  g.fillStyle = sheen;
  g.fillRect(0, 0, vw, h);
  g.restore();
  drawFrame(g, vw, h, A, S);
  g.restore();
  const v = g.createRadialGradient(w / 2, h * 0.45, h * 0.3, w / 2, h * 0.45, Math.max(w, h) * 0.78);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.5)");
  g.fillStyle = v;
  g.fillRect(0, 0, w, h);
  grain(g, w, h, S.calm ? 0 : S.t, 0.1);
}

/** Is the canvas point (x, y) on the big rock? */
export function hitApproach(S, x, y) {
  const b = S.hitBig;
  return !!b && Math.hypot(x - b.x, y - b.y) < b.r;
}

/* ------------------------------------------------------------------ */
/* flight scene                                                        */
/* ------------------------------------------------------------------ */
function drawShip(g, x, y, s, t, calm, bank) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.rotate(-0.1 + bank * 0.06);
  const f = calm ? 1 : 0.88 + 0.12 * Math.sin(t * 24) + 0.05 * Math.sin(t * 61);

  // engine plumes
  for (const [ey, el, wd] of [[-16, 110, 7], [0, 160, 9], [16, 110, 7]]) {
    glow(g, -52, ey, 46 * f, "120,235,255", 0.55);
    const gr = g.createLinearGradient(-50, ey, -50 - el * f, ey);
    gr.addColorStop(0, "rgba(235,255,255,0.98)");
    gr.addColorStop(0.18, "rgba(130,235,255,0.7)");
    gr.addColorStop(0.6, "rgba(70,170,230,0.22)");
    gr.addColorStop(1, "rgba(70,170,230,0)");
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(-48, ey - wd);
    g.quadraticCurveTo(-50 - el * 0.4 * f, ey - wd * 0.5, -50 - el * f, ey);
    g.quadraticCurveTo(-50 - el * 0.4 * f, ey + wd * 0.5, -48, ey + wd);
    g.fill();
  }
  // lower wing, drawn first so the hull overlaps it
  const wing = (m) => {
    g.fillStyle = metal(g, 0, 0, 0, m * 50, [[0, "#4a5b6e"], [1, "#222d3a"]]);
    g.beginPath();
    g.moveTo(14, m * 11);
    g.lineTo(-30, m * 54);
    g.lineTo(-52, m * 50);
    g.lineTo(-36, m * 10);
    g.closePath();
    g.fill();
    g.strokeStyle = "rgba(180,205,230,0.35)";
    g.lineWidth = 1;
    g.stroke();
    g.fillStyle = "rgba(94,234,212,0.85)";
    g.fillRect(-48, m * 46 - 1.5, 10, 3);
  };
  wing(1);
  wing(-1);
  // hull
  g.fillStyle = metal(g, 0, -24, 0, 24, [[0, "#dfe8f1"], [0.35, "#9eb0c3"], [0.7, "#566678"], [1, "#222d3a"]]);
  g.beginPath();
  g.moveTo(84, 0);
  g.bezierCurveTo(60, -17, 24, -24, -22, -22);
  g.lineTo(-54, -15);
  g.lineTo(-54, 15);
  g.lineTo(-22, 22);
  g.bezierCurveTo(24, 24, 60, 17, 84, 0);
  g.closePath();
  g.fill();
  g.strokeStyle = "rgba(8,14,22,0.75)";
  g.lineWidth = 1.3;
  g.stroke();
  // panel seams and plating
  g.strokeStyle = "rgba(8,14,22,0.4)";
  g.lineWidth = 1;
  g.beginPath();
  for (const px of [-6, -26, 40]) { g.moveTo(px, -21); g.lineTo(px, 21); }
  g.moveTo(-54, 0); g.lineTo(60, 0);
  g.stroke();
  g.fillStyle = "rgba(255,255,255,0.18)";
  g.beginPath();
  g.moveTo(80, -1);
  g.bezierCurveTo(56, -14, 22, -20, -20, -19);
  g.lineTo(-20, -15);
  g.bezierCurveTo(22, -16, 56, -9, 80, -1);
  g.fill();
  // shading: the belly falls into shadow, the top catches the planet's green light
  g.save();
  g.beginPath();
  g.moveTo(84, 0);
  g.bezierCurveTo(60, -17, 24, -24, -22, -22);
  g.lineTo(-54, -15);
  g.lineTo(-54, 15);
  g.lineTo(-22, 22);
  g.bezierCurveTo(24, 24, 60, 17, 84, 0);
  g.closePath();
  g.clip();
  const belly = g.createLinearGradient(0, -2, 0, 24);
  belly.addColorStop(0, "rgba(6,12,20,0)");
  belly.addColorStop(1, "rgba(6,12,20,0.7)");
  g.fillStyle = belly;
  g.fillRect(-60, -2, 150, 28);
  const rim = g.createLinearGradient(0, -24, 0, -8);
  rim.addColorStop(0, "rgba(120,255,190,0.5)");
  rim.addColorStop(1, "rgba(120,255,190,0)");
  g.fillStyle = rim;
  g.fillRect(-60, -24, 150, 16);
  // plating insets and vents
  g.fillStyle = "rgba(8,14,22,0.28)";
  g.fillRect(-48, -12, 18, 7);
  g.fillRect(-48, 6, 18, 7);
  g.fillRect(14, 8, 22, 6);
  g.fillStyle = "rgba(8,14,22,0.5)";
  for (let i = 0; i < 5; i++) g.fillRect(44 + i * 4, 9, 2, 6);
  g.restore();
  // livery stripe
  g.fillStyle = "rgba(94,234,212,0.9)";
  g.fillRect(-26, 5, 30, 3);
  g.fillStyle = "rgba(255,170,60,0.9)";
  g.fillRect(8, 5, 12, 3);
  // canopy
  g.fillStyle = metal(g, 14, -12, 56, 6, [[0, "#c8fff6"], [0.4, "#3fb4b8"], [1, "#0f3f55"]]);
  g.beginPath();
  g.moveTo(58, -2);
  g.bezierCurveTo(44, -15, 16, -15, 6, -6);
  g.bezierCurveTo(22, 2, 44, 3, 58, -2);
  g.fill();
  g.strokeStyle = "rgba(8,14,22,0.6)";
  g.stroke();
  g.fillStyle = "rgba(255,255,255,0.45)";
  g.beginPath();
  g.ellipse(30, -9, 14, 2.2, -0.12, 0, TAU);
  g.fill();
  // nozzles
  g.fillStyle = "#0e141b";
  for (const ey of [-16, 0, 16]) {
    g.fillRect(-58, ey - 7, 9, 14);
    g.strokeStyle = "rgba(180,205,230,0.3)";
    g.strokeRect(-58, ey - 7, 9, 14);
  }
  g.restore();
}

export function makeFlight(seed = 11) {
  const r = rng(seed);
  return {
    seed,
    stars: makeStars(seed + 1, 360),
    nebula: makeNebula(seed + 2, 420, 236, [[8, 60, 76], [40, 140, 118], [70, 60, 140]], 0.55, 0.9),
    planet: makeWorld(seed + 3, 480),
    rocks: Array.from({ length: 30 }, () => ({ x: 0.52 + r() * 0.48, y: r(), size: 0.004 + Math.pow(r(), 2) * 0.016, ph: r() * TAU, spr: Math.floor(r() * 3), z: r() })),
    streaks: Array.from({ length: 28 }, () => ({ y: 0.25 + r() * 0.55, len: 0.08 + r() * 0.22, sp: 0.4 + r() * 0.9, ph: r() })),
    dust: Array.from({ length: 90 }, () => ({ y: 0.32 + r() * 0.4, ph: r(), sp: 0.15 + r() * 0.4, sz: 0.6 + r() * 1.8, j: r() })),
    sprites: [0, 1, 2].map((i) => makeAsteroid(seed * 13 + i, 128, i))
  };
}

/** S = {t, calm, px, py}. */
export function drawFlight(g, W, h, F, S) {
  const { t, calm, px, py } = S;
  const w = Math.max(W, h * 1.25);
  g.clearRect(0, 0, W, h);
  g.save();
  g.translate(-(w - W) * 0.45, 0);
  const bg = g.createLinearGradient(0, 0, w, 0);
  bg.addColorStop(0, "#040a12");
  bg.addColorStop(1, "#071a22");
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.drawImage(F.nebula, -w * 0.04 + px * w * 0.01 - (calm ? 0 : (t * 4) % (w * 0.04)), -h * 0.04 + py * h * 0.01, w * 1.12, h * 1.1);
  drawStars(g, w, h, F.stars, calm ? 0 : t, calm ? 0 : t * 14, px, py);
  drawPlanet(g, F.planet, 0.79 * w + px * w * 0.012, 0.42 * h + py * h * 0.012, 0.115 * w);

  for (const k of F.rocks) {
    const sz = k.size * w * (1 + k.z);
    g.save();
    g.globalAlpha = 0.5 + 0.5 * k.z;
    g.drawImage(F.sprites[k.spr], k.x * w + px * w * 0.014 * (0.5 + k.z) + (calm ? 0 : Math.sin(t * 0.4 + k.ph) * 4) - sz, (0.12 + k.y * 0.76) * h - sz, sz * 2, sz * 2);
    g.restore();
  }

  const sx = 0.27 * w + px * w * 0.012;
  const sy = 0.48 * h + (calm ? 0 : Math.sin(t * 1.2) * 0.009 * h) + py * h * 0.015;
  const sc = (w / 1000) * 1.2;
  for (const k of F.streaks) {
    const p = calm ? k.ph : (k.ph + t * k.sp * 0.5) % 1;
    const x = sx - 55 * sc - p * 0.36 * w;
    const y = k.y * h + (sy - 0.5 * h) * 0.5;
    const len = k.len * w * (0.4 + p);
    const gr = g.createLinearGradient(x, 0, x - len, 0);
    gr.addColorStop(0, `rgba(215,242,255,${0.55 * (1 - p)})`);
    gr.addColorStop(1, "rgba(215,242,255,0)");
    g.strokeStyle = gr;
    g.lineWidth = 1 + (1 - p) * 1.3;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x - len, y);
    g.stroke();
  }
  for (const d of F.dust) {
    const p = calm ? d.ph : (d.ph + t * d.sp) % 1;
    const x = sx - 60 * sc - p * 0.4 * w;
    const y = d.y * h + (d.j - 0.5) * 10 + (sy - 0.5 * h) * 0.5;
    g.fillStyle = `rgba(170,180,170,${0.55 * (1 - p)})`;
    g.fillRect(x, y, d.sz, d.sz);
  }

  drawShip(g, sx, sy, sc, t, calm, px);
  g.restore();
  const v = g.createRadialGradient(W / 2, h / 2, h * 0.3, W / 2, h / 2, Math.max(W, h) * 0.7);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.45)");
  g.fillStyle = v;
  g.fillRect(0, 0, W, h);
  grain(g, W, h, calm ? 0 : t, 0.09);
}
