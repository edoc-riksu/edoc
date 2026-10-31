// The hangar screen's interior, drawn in code with src/art's seeded helpers —
// same approach as every other scene in this app (see public/art/ORIGIN.md).
// No external assets. Reskinned as the ship's observation deck: a calm, cosy
// cabin with a big curved window onto the galaxy, rather than a working bay,
// so it reads as "your ship" and visually connects to the galaxy map.
import { rng, TAU, clamp } from "../../art/rng";
import { glow, grain } from "../../art/scenes";
import { makeNebula } from "../../art/nebula";
import { drawPlanet, makeSkins } from "../../galaxy/planet";

// Mirror the tokens in globals.css (--night, --teal, --teal-deep, --warn, --ink);
// canvas fillStyle can't read CSS custom properties, so these are kept in sync by hand.
const TEAL = "94,234,212";
const WARN = "251,191,36";
const INK = "232,238,246";
// A softer, warmer lamp tone for the cabin's own little lights — distinct from
// the starfarer-suit amber (WARN), which stays reserved for suit accents.
const LAMP = "255,196,130";

// The Python planet's palette, mirroring its entry in src/galaxy/layout.js
// (kept as a local constant rather than importing that data file, the same
// way the colour tokens above mirror globals.css by hand).
const PYTHON_PALETTE = { light: "#c4f7b8", mid: "#45bb7c", dark: "#0e4a40", glow: "#5eead4" };

function explorerTone(explorer) {
  // A per-pilot visor colour, same idea as the ship livery stripes in src/art/scenes.js.
  return explorer === "taro" ? "255,170,60" : TEAL;
}

export function makeHangarScene() {
  const r = rng(601);
  // a little drifting cabin dust, kept sparse — quiet, not busy
  const dust = Array.from({ length: 12 }, () => ({
    x: r(),
    y: 0.45 + r() * 0.45,
    z: 0.3 + r() * 0.7,
    ph: r() * TAU,
    sp: 0.3 + r() * 0.5
  }));
  // the starfield behind the window
  const stars = Array.from({ length: 70 }, () => ({ x: r(), y: r(), z: 0.2 + r() * 0.8, tw: r() * TAU }));
  // slow sparkle motes orbiting the platform
  const motes = Array.from({ length: 8 }, () => ({ a: r() * TAU, rad: 0.72 + r() * 0.5, sp: (r() < 0.5 ? -1 : 1) * (0.15 + r() * 0.18) }));
  // a soft nebula wash seen through the window — a real pre-rendered "photo"
  // of noise (src/art/nebula.js), the same technique the galaxy screen uses,
  // not a licensed or stock image. Recoloured toward navy/teal for a calmer sky.
  const nebula = makeNebula(601, 420, 260, [[8, 16, 36], [30, 70, 90], [60, 140, 140]], 0.5, 0.8);
  // the same planet art the galaxy map uses, reused rather than redrawn —
  // "less new art," per the brief, and it keeps the two screens' palettes identical
  const skins = typeof document === "undefined" ? null : makeSkins();
  const planetCanvas = typeof document === "undefined" ? null : document.createElement("canvas");
  if (planetCanvas) {
    planetCanvas.width = 360;
    planetCanvas.height = 360;
  }
  return { dust, stars, motes, nebula, skins, planetCanvas };
}

// Adds one rounded-rect subpath to whatever path is already open — callers that
// want several of these in one fill() must call g.beginPath() themselves first
// (this does NOT, so it can be chained without wiping earlier subpaths).
function roundRect(g, x, y, w, h, r) {
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// The arched outline of the observation window, shared by the frame and the clip.
function windowPath(g, x0, y0, x1, y1, archH) {
  const mid = (x0 + x1) / 2;
  g.beginPath();
  g.moveTo(x0, y1);
  g.lineTo(x0, y0 + archH);
  g.quadraticCurveTo(x0, y0, mid, y0);
  g.quadraticCurveTo(x1, y0, x1, y0 + archH);
  g.lineTo(x1, y1);
  g.closePath();
}

// The big curved window onto the galaxy: the room's centrepiece, and what ties
// this screen back to the galaxy map (same stars, same nebula technique, the
// same planet palette and skin).
function drawObservationWindow(g, w, h, floorY, data, t, calm) {
  const x0 = w * 0.1;
  const x1 = w * 0.9;
  const y0 = h * 0.07;
  const y1 = floorY;
  const archH = (x1 - x0) * 0.42;
  const frameW = Math.max(8, w * 0.016);

  // frame
  windowPath(g, x0 - frameW, y0 - frameW, x1 + frameW, y1, archH + frameW);
  g.fillStyle = "#0c1020";
  g.fill();

  // small warm lights set into the frame — the cabin's own lighting, not the
  // harsh work-lamps a hangar would have
  const lampCount = 6;
  for (let i = 0; i < lampCount; i++) {
    const f = (i + 0.5) / lampCount;
    const lx = x0 + (x1 - x0) * f;
    const ly = y1 + frameW * 0.5;
    glow(g, lx, ly, w * 0.01, LAMP, 0.6, "lighter");
    g.fillStyle = `rgba(${LAMP},0.85)`;
    g.beginPath();
    g.arc(lx, ly, 1.6, 0, TAU);
    g.fill();
  }

  g.save();
  windowPath(g, x0, y0, x1, y1, archH);
  g.clip();

  const ww = x1 - x0;
  const wh = y1 - y0;

  // deep space behind the glass
  const sky = g.createLinearGradient(0, y0, 0, y1);
  sky.addColorStop(0, "#04060f");
  sky.addColorStop(1, "#0a1226");
  g.fillStyle = sky;
  g.fillRect(x0, y0, ww, wh);

  if (data.nebula && typeof data.nebula.getContext === "function") {
    g.save();
    g.globalCompositeOperation = "screen";
    g.globalAlpha = 0.45;
    g.drawImage(data.nebula, x0 - ww * 0.1, y0 - wh * 0.1, ww * 1.2, wh * 1.3);
    g.restore();
  }

  for (const s of data.stars) {
    const x = x0 + s.x * ww;
    const y = y0 + s.y * wh;
    const a = (0.3 + 0.6 * s.z) * (calm ? 0.85 : 0.75 + 0.25 * Math.sin(t * 1.2 + s.tw));
    const sz = 0.6 + s.z * 1.2;
    g.fillStyle = `rgba(${INK},${a})`;
    g.fillRect(x, y, sz, sz);
  }

  // the Python planet, glowing just outside — same art as the galaxy map
  if (data.planetCanvas && data.skins) {
    const pctx = data.planetCanvas.getContext("2d");
    const B = data.planetCanvas.width;
    const rot = calm ? 0.1 : (t * 0.012) % 1;
    drawPlanet(pctx, B, PYTHON_PALETTE, true, data.skins[0], rot);
    const dest = Math.min(ww, wh) * 0.62;
    const px = x0 + ww * 0.64;
    const py = y0 + wh * 0.5;
    g.drawImage(data.planetCanvas, 0, 0, B, B, px - dest / 2, py - dest / 2, dest, dest);
  }

  g.restore();

  // a soft rim catching the cabin's own light on the inside of the glass
  windowPath(g, x0, y0, x1, y1, archH);
  g.strokeStyle = "rgba(190,210,255,0.18)";
  g.lineWidth = 2;
  g.stroke();
}

// The cabin's side walls — smooth and painted, with a gentle perspective fold
// rather than a riveted industrial panel.
function drawCabinWalls(g, w, h, floorY, px) {
  const vanish = w * 0.5 + px * 3;
  for (const side of [-1, 1]) {
    const outer = side < 0 ? 0 : w;
    const innerTop = vanish + side * w * 0.42;
    const innerBot = vanish + side * w * 0.12;

    const grad = g.createLinearGradient(outer, 0, innerTop, 0);
    grad.addColorStop(0, "#161c34");
    grad.addColorStop(1, "#232c4c");
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(outer, 0);
    g.lineTo(innerTop, 0);
    g.lineTo(innerBot, floorY);
    g.lineTo(outer, floorY);
    g.closePath();
    g.fill();

    g.strokeStyle = "rgba(150,170,220,0.14)";
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(innerTop, 0);
    g.lineTo(innerBot, floorY);
    g.stroke();
  }
}

// A lit structural strip across the top of the frame — a piece of the ship's
// own ceiling, so the room reads as enclosed rather than an open dark void,
// and brightens what was otherwise the darkest part of the scene.
function drawCeilingStrip(g, w, h) {
  const y = h * 0.025;
  const beamH = Math.max(4, h * 0.012);
  const grad = g.createLinearGradient(w * 0.08, 0, w * 0.92, 0);
  grad.addColorStop(0, "rgba(190,210,255,0)");
  grad.addColorStop(0.15, "rgba(190,210,255,0.25)");
  grad.addColorStop(0.85, "rgba(190,210,255,0.25)");
  grad.addColorStop(1, "rgba(190,210,255,0)");
  g.fillStyle = grad;
  g.fillRect(w * 0.08, y, w * 0.84, beamH);
  glow(g, w * 0.5, y + beamH / 2, w * 0.45, LAMP, 0.12, "lighter");
}

// A wall-mounted control console — a little screen with a live readout, a row
// of lit buttons, and a couple of toggle switches. Ships have systems, not
// just a view, so this is what fills the side walls flanking the window.
function drawControlPanel(g, x, y, s, t, calm, accent) {
  g.save();
  g.translate(x, y);

  const pw = s * 0.9;
  const ph = s * 1.3;

  // housing
  const body = g.createLinearGradient(0, -ph / 2, 0, ph / 2);
  body.addColorStop(0, "#242d4c");
  body.addColorStop(1, "#141a30");
  g.fillStyle = body;
  g.beginPath();
  roundRect(g, -pw / 2, -ph / 2, pw, ph, s * 0.06);
  g.fill();
  g.strokeStyle = "rgba(150,170,220,0.18)";
  g.lineWidth = 1;
  g.stroke();

  // the screen, with a small animated readout line
  const screenH = ph * 0.46;
  const screenY = -ph / 2 + ph * 0.1;
  g.beginPath();
  roundRect(g, -pw * 0.42, screenY, pw * 0.84, screenH, s * 0.03);
  g.fillStyle = "rgba(6,10,22,0.92)";
  g.fill();
  g.strokeStyle = `rgba(${accent},0.4)`;
  g.lineWidth = 1;
  g.stroke();

  g.save();
  g.beginPath();
  roundRect(g, -pw * 0.42, screenY, pw * 0.84, screenH, s * 0.03);
  g.clip();
  g.strokeStyle = `rgba(${accent},0.85)`;
  g.lineWidth = 1.2;
  g.beginPath();
  const segs = 8;
  const phase = calm ? 0 : t * 1.6;
  for (let i = 0; i <= segs; i++) {
    const fx = -pw * 0.42 + (pw * 0.84) * (i / segs);
    const fy = screenY + screenH * 0.5 + Math.sin(i * 1.3 + phase) * screenH * 0.26;
    if (i === 0) g.moveTo(fx, fy);
    else g.lineTo(fx, fy);
  }
  g.stroke();
  g.restore();

  // a row of lit buttons below the screen
  const btnY = screenY + screenH + ph * 0.14;
  const colours = [TEAL, WARN, INK];
  const activeIdx = calm ? 0 : Math.floor(t * 0.6) % colours.length;
  for (let i = 0; i < 3; i++) {
    const bx = -pw * 0.28 + i * pw * 0.28;
    const lit = i === activeIdx;
    g.fillStyle = lit ? `rgba(${colours[i]},0.95)` : "rgba(150,170,220,0.3)";
    g.beginPath();
    g.arc(bx, btnY, s * 0.045, 0, TAU);
    g.fill();
    if (lit) glow(g, bx, btnY, s * 0.08, colours[i], 0.5, "lighter");
  }

  // a couple of toggle switches near the bottom
  const swY = btnY + ph * 0.17;
  for (let i = 0; i < 2; i++) {
    const sx = -pw * 0.18 + i * pw * 0.36;
    g.fillStyle = "#0e1424";
    g.beginPath();
    roundRect(g, sx - s * 0.05, swY - s * 0.08, s * 0.1, s * 0.16, s * 0.03);
    g.fill();
    g.fillStyle = "rgba(190,210,255,0.55)";
    g.beginPath();
    g.arc(sx, swY - s * 0.04, s * 0.035, 0, TAU);
    g.fill();
  }

  g.restore();
}

// A small wall sconce — one of the cabin's own warm lights.
function drawSconce(g, x, y, s) {
  g.save();
  glow(g, x, y, s * 2.2, LAMP, 0.35, "lighter");
  g.fillStyle = "#1a2138";
  g.beginPath();
  roundRect(g, x - s * 0.5, y - s * 0.35, s, s * 0.7, s * 0.2);
  g.fill();
  g.fillStyle = `rgba(${LAMP},0.9)`;
  g.beginPath();
  g.ellipse(x, y, s * 0.28, s * 0.18, 0, 0, TAU);
  g.fill();
  g.restore();
}

// A two-door wardrobe on the far wall — one of the pilot's own suits hanging
// behind each door, with a lit indicator for whichever is equipped right now.
// Bigger and more detailed than a single locker, so it reads as the pilot's
// actual gear storage rather than a prop.
function drawSuitLocker(g, x, y, s, accent, hoverSuit, hoverAmount) {
  g.save();
  g.translate(x, y);

  // grounding shadow
  g.save();
  g.scale(1, 0.22);
  glow(g, 0, s * 0.05, s * 0.7, "2,4,10", 0.4, "source-over");
  g.restore();

  const lw = s * 0.72;
  const lh = s * 1.15;

  // cabinet body
  const body = g.createLinearGradient(0, -lh, 0, 0);
  body.addColorStop(0, "#2a3252");
  body.addColorStop(1, "#171e36");
  g.fillStyle = body;
  g.beginPath();
  roundRect(g, -lw / 2, -lh, lw, lh, s * 0.05);
  g.fill();

  // the seam between the two doors
  g.strokeStyle = "rgba(10,14,28,0.55)";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, -lh * 0.96);
  g.lineTo(0, -lh * 0.08);
  g.stroke();

  const doorW = lw * 0.42;
  const doorH = lh * 0.8;
  const doorY = -lh * 0.92;
  const suits = [
    { id: "base", dx: -lw * 0.23, tone: TEAL },
    { id: "starfarer", dx: lw * 0.23, tone: WARN }
  ];
  for (const { id, dx, tone } of suits) {
    const lit = id === hoverSuit && hoverAmount > 0.02;
    g.beginPath();
    roundRect(g, dx - doorW / 2, doorY, doorW, doorH, s * 0.04);
    g.fillStyle = lit ? `rgba(8,13,28,${0.82 - hoverAmount * 0.15})` : "rgba(8,13,28,0.82)";
    g.fill();
    if (lit) glow(g, dx, doorY + doorH * 0.5, Math.max(doorW, doorH) * 0.55, tone, 0.3 * hoverAmount, "lighter");
    g.strokeStyle = lit ? `rgba(${tone},${0.4 + hoverAmount * 0.5})` : "rgba(150,170,220,0.2)";
    g.lineWidth = lit ? 1.5 + hoverAmount : 1.5;
    g.stroke();

    // the hanging suit behind the glass, tinted toward its own accent
    g.strokeStyle = "rgba(150,170,220,0.3)";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(dx, doorY + doorH * 0.02);
    g.lineTo(dx, doorY + doorH * 0.16);
    g.stroke();

    g.fillStyle = `rgba(${tone},0.4)`;
    g.beginPath();
    g.arc(dx, doorY + doorH * 0.26, s * 0.06, 0, TAU);
    g.fill();
    g.beginPath();
    roundRect(g, dx - s * 0.065, doorY + doorH * 0.32, s * 0.13, doorH * 0.42, s * 0.03);
    g.fill();
  }

  // a small shelf below the doors with a couple of folded items
  g.fillStyle = `rgba(${TEAL},0.3)`;
  g.fillRect(-lw * 0.3, -lh * 0.1, lw * 0.26, s * 0.04);
  g.fillStyle = `rgba(${WARN},0.3)`;
  g.fillRect(lw * 0.05, -lh * 0.1, lw * 0.26, s * 0.04);

  // a lit indicator for the suit that's actually equipped
  glow(g, 0, -lh * 0.02, s * 0.07, accent, 0.55, "lighter");
  g.fillStyle = `rgba(${accent},0.9)`;
  g.beginPath();
  g.arc(0, -lh * 0.02, s * 0.02, 0, TAU);
  g.fill();

  g.restore();
}

// A low shelf with a couple of personal touches — the "your ship" detail the
// brief asks for, kept simple and geometric like the rest of this scene.
function drawShelfNook(g, x, y, s) {
  g.save();
  g.translate(x, y);

  // grounding shadow
  g.save();
  g.scale(1, 0.25);
  glow(g, s * 0.5, s * 0.14, s * 0.9, "2,4,10", 0.4, "source-over");
  g.restore();

  // the shelf itself
  const body = g.createLinearGradient(0, -s * 0.22, 0, s * 0.12);
  body.addColorStop(0, "#232c47");
  body.addColorStop(1, "#141a2d");
  g.fillStyle = body;
  g.beginPath();
  roundRect(g, 0, -s * 0.22, s, s * 0.22, s * 0.04);
  g.fill();

  // a small potted plant
  g.fillStyle = "#2a3350";
  g.beginPath();
  g.moveTo(s * 0.16, -s * 0.22);
  g.lineTo(s * 0.3, -s * 0.22);
  g.lineTo(s * 0.27, -s * 0.4);
  g.lineTo(s * 0.19, -s * 0.4);
  g.closePath();
  g.fill();
  g.fillStyle = "rgba(94,234,212,0.55)";
  for (const [dx, dy, r] of [[0.23, -0.46, 0.07], [0.18, -0.43, 0.05], [0.28, -0.43, 0.05]]) {
    g.beginPath();
    g.arc(s * dx, s * dy, s * r, 0, TAU);
    g.fill();
  }

  // a small stack of books
  g.fillStyle = `rgba(${WARN},0.6)`;
  g.fillRect(s * 0.55, -s * 0.3, s * 0.3, s * 0.05);
  g.fillStyle = "rgba(190,210,255,0.5)";
  g.fillRect(s * 0.57, -s * 0.25, s * 0.26, s * 0.045);

  g.restore();
}

// The holographic display pad the pilot stands on — a projector ring with a
// couple of fainter echo rings and slow radiating ticks, so it reads as a
// hologram emitter rather than a plain platform.
function drawPad(g, cx, cy, w, h, accent, t, calm, hoverAmount = 0) {
  const rx = w * 0.1;
  const ry = h * 0.022;
  const pulse = calm ? 0.5 : 0.5 + 0.5 * Math.sin(t * 1.2);

  g.save();
  g.scale(1, ry / rx);
  glow(g, cx, cy * (rx / ry), rx * (1.3 + hoverAmount * 0.25), accent, 0.14 + pulse * 0.06 + hoverAmount * 0.12, "lighter");
  g.restore();

  const top = g.createRadialGradient(cx, cy, 0, cx, cy, rx);
  top.addColorStop(0, "rgba(36,44,70,0.85)");
  top.addColorStop(1, "rgba(14,18,34,0.85)");
  g.fillStyle = top;
  g.beginPath();
  g.ellipse(cx, cy, rx, ry, 0, 0, TAU);
  g.fill();

  // two fainter echo rings outside the main one, like a hologram's scan rings
  for (const scale of [1.14, 1.28]) {
    g.strokeStyle = `rgba(${accent},${0.1 + hoverAmount * 0.1})`;
    g.lineWidth = 1;
    g.beginPath();
    g.ellipse(cx, cy, rx * scale, ry * scale, 0, 0, TAU);
    g.stroke();
  }

  // slow radiating tick marks around the main ring, projector-style
  const ticks = 16;
  const spin = calm ? 0 : t * 0.15;
  for (let i = 0; i < ticks; i++) {
    const a = (i / ticks) * TAU + spin;
    const x0 = cx + Math.cos(a) * rx * 1.02;
    const y0 = cy + Math.sin(a) * ry * 1.02;
    const x1 = cx + Math.cos(a) * rx * 1.09;
    const y1 = cy + Math.sin(a) * ry * 1.09;
    g.strokeStyle = `rgba(${accent},${0.18 + hoverAmount * 0.25})`;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.stroke();
  }

  g.strokeStyle = `rgba(${accent},${0.45 + pulse * 0.2 + hoverAmount * 0.3})`;
  g.lineWidth = 2 + hoverAmount * 1.5;
  g.beginPath();
  g.ellipse(cx, cy, rx, ry, 0, 0, TAU);
  g.stroke();
}

// Exported too: the explorer-select cards draw a small static snapshot of
// this same figure (see ExplorerPortrait.js), so picking a person reads as
// a portrait rather than another icon tile.
export function drawPilot(g, cx, cy, s, suit, explorer, t, calm) {
  const accent = suit === "starfarer" ? WARN : TEAL;
  const visor = explorerTone(explorer);
  const bob = calm ? 0 : Math.sin(t * 1.4) * s * 0.012;
  // a slow chest-rise breathing cycle, separate from the bob — together they
  // make the idle pose read as alive rather than a still prop
  const breathe = calm ? 1 : 1 + Math.sin(t * 0.9) * 0.015;
  g.save();
  g.translate(cx, cy - s * 0.66 + bob);
  g.scale(1, breathe);

  // a dark life-support pack, mostly hidden behind the torso so only its
  // edges show past the shoulders — gives the silhouette real depth
  g.fillStyle = "#11162a";
  g.beginPath();
  roundRect(g, -s * 0.13, -0.005 * s, s * 0.26, s * 0.17, s * 0.04);
  g.fill();

  const limb = g.createLinearGradient(0, 0, 0, s * 0.3);
  limb.addColorStop(0, "#2c3752");
  limb.addColorStop(1, "#171f33");

  // legs, a narrow stance planted right under the hips
  g.fillStyle = limb;
  g.beginPath();
  roundRect(g, -s * 0.08, s * 0.28, s * 0.065, s * 0.32, s * 0.03);
  roundRect(g, s * 0.015, s * 0.28, s * 0.065, s * 0.32, s * 0.03);
  g.fill();

  // boots, a darker flare where each leg meets the floor
  g.fillStyle = "#121829";
  g.beginPath();
  roundRect(g, -s * 0.09, s * 0.56, s * 0.085, s * 0.08, s * 0.025);
  roundRect(g, s * 0.005, s * 0.56, s * 0.085, s * 0.08, s * 0.025);
  g.fill();

  // a soft contact glow where the boots meet the platform
  glow(g, 0, s * 0.63, s * 0.22, accent, 0.22, "lighter");

  // arms, attached at the shoulder rather than floating beside the torso
  g.fillStyle = limb;
  g.beginPath();
  roundRect(g, -s * 0.135, s * 0.02, s * 0.05, s * 0.23, s * 0.025);
  roundRect(g, s * 0.085, s * 0.02, s * 0.05, s * 0.23, s * 0.025);
  g.fill();
  g.fillStyle = "#121829";
  g.beginPath();
  roundRect(g, -s * 0.14, s * 0.23, s * 0.06, s * 0.045, s * 0.02);
  roundRect(g, s * 0.08, s * 0.23, s * 0.06, s * 0.045, s * 0.02);
  g.fill();

  // torso: a wider chest tapering to a narrower waist
  const torso = g.createLinearGradient(0, 0, 0, s * 0.3);
  torso.addColorStop(0, "#28334f");
  torso.addColorStop(1, "#161d32");
  g.fillStyle = torso;
  g.beginPath();
  roundRect(g, -s * 0.11, 0, s * 0.22, s * 0.2, s * 0.045);
  roundRect(g, -s * 0.085, s * 0.17, s * 0.17, s * 0.13, s * 0.035);
  g.fill();

  // a waist belt seam
  g.strokeStyle = "rgba(6,10,20,0.4)";
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(-s * 0.09, s * 0.27);
  g.lineTo(s * 0.09, s * 0.27);
  g.stroke();

  // suit accent stripe down the chest
  g.fillStyle = `rgba(${accent},0.9)`;
  g.beginPath();
  roundRect(g, -s * 0.02, s * 0.03, s * 0.04, s * 0.24, s * 0.02);
  g.fill();

  // a small chest control panel with two indicator lights
  g.fillStyle = "#0f1424";
  g.beginPath();
  roundRect(g, -s * 0.045, s * 0.07, s * 0.09, s * 0.06, s * 0.012);
  g.fill();
  g.fillStyle = `rgba(${accent},0.95)`;
  g.beginPath();
  g.arc(-s * 0.02, s * 0.1, s * 0.009, 0, TAU);
  g.fill();
  g.fillStyle = `rgba(${visor},0.95)`;
  g.beginPath();
  g.arc(s * 0.02, s * 0.1, s * 0.009, 0, TAU);
  g.fill();

  // pauldrons on both suits — the starfarer set's are bigger and brighter,
  // plus a chest emblem, so the two still read apart at a glance
  const pauldronScale = suit === "starfarer" ? 1 : 0.68;
  const pauldronAlpha = suit === "starfarer" ? 0.85 : 0.55;
  g.fillStyle = `rgba(${accent},${pauldronAlpha})`;
  g.beginPath();
  roundRect(g, -s * 0.165, -s * 0.015, s * 0.085 * pauldronScale, s * 0.075 * pauldronScale, s * 0.02);
  roundRect(g, s * 0.08, -s * 0.015, s * 0.085 * pauldronScale, s * 0.075 * pauldronScale, s * 0.02);
  g.fill();

  if (suit === "starfarer") {
    g.save();
    g.translate(0, s * 0.12);
    g.rotate(Math.PI / 4);
    g.fillStyle = `rgba(${accent},0.95)`;
    g.fillRect(-s * 0.03, -s * 0.03, s * 0.06, s * 0.06);
    g.restore();
  }

  // neck, connecting the helmet to the torso so nothing looks like it's floating
  g.fillStyle = "#171f33";
  g.fillRect(-s * 0.025, -s * 0.03, s * 0.05, s * 0.04);

  // helmet
  g.fillStyle = "#1a2138";
  g.beginPath();
  g.arc(0, -s * 0.09, s * 0.115, 0, TAU);
  g.fill();
  g.strokeStyle = "rgba(190,210,255,0.22)";
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(0, -s * 0.09, s * 0.115, Math.PI * 1.15, Math.PI * 1.75);
  g.stroke();

  // visor, with a small highlight glint
  g.fillStyle = `rgba(${visor},0.92)`;
  g.beginPath();
  g.ellipse(s * 0.015, -s * 0.09, s * 0.068, s * 0.048, 0, 0, TAU);
  g.fill();
  g.fillStyle = "rgba(255,255,255,0.5)";
  g.beginPath();
  g.ellipse(-s * 0.012, -s * 0.105, s * 0.018, s * 0.01, -0.4, 0, TAU);
  g.fill();

  // a short antenna marks the starfarer set from across the room
  if (suit === "starfarer") {
    g.strokeStyle = "rgba(6,10,20,0.6)";
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(s * 0.06, -s * 0.185);
    g.lineTo(s * 0.09, -s * 0.24);
    g.stroke();
    glow(g, s * 0.09, -s * 0.24, s * 0.02, accent, 0.8, "lighter");
  }

  g.restore();
}

export function drawHangarScene(g, w, h, data, S) {
  const suit = S.suit || "base";
  const explorer = S.explorer || "vega";
  const t = S.t;
  const calm = S.calm;
  const accent = suit === "starfarer" ? WARN : TEAL;
  const px = calm ? 0 : S.px;
  const py = calm ? 0 : S.py;
  // A brief glow on the pad right after the player picks an explorer or
  // suit in the panel — makes the link between the list and the pilot in
  // the bay unmistakable, not just a figure quietly changing. Uses wall-clock
  // time directly rather than S.t, since S.pulseAt comes from React's own
  // performance.now(), not the canvas's own time-since-boot.
  const pulseAge = S.pulseAt ? (performance.now() - S.pulseAt) / 1000 : Infinity;
  const pulseGlow = calm || pulseAge > 0.9 ? 0 : (1 - pulseAge / 0.9) ** 2;

  g.clearRect(0, 0, w, h);

  const floorY = h * 0.62;

  // back wall, lit well enough to read as a cabin rather than a dark void
  const wall = g.createLinearGradient(0, 0, 0, floorY);
  wall.addColorStop(0, "#131930");
  wall.addColorStop(1, "#1c2340");
  g.fillStyle = wall;
  g.fillRect(0, 0, w, floorY);

  // a lit strip of ceiling overhead — the room has a roof, not open sky
  drawCeilingStrip(g, w, h);

  drawCabinWalls(g, w, h, floorY, px);
  drawObservationWindow(g, w, h, floorY, data, t, calm);

  // a couple of warm sconces either side of the window
  drawSconce(g, w * 0.06 + px * 2, h * 0.3, Math.min(w, h) * 0.03);
  drawSconce(g, w * 0.94 + px * 2, h * 0.3, Math.min(w, h) * 0.03);

  // wall control consoles flanking the window — the ship's own systems, not
  // just a view out of it
  drawControlPanel(g, w * 0.035 + px * 1.5, h * 0.42, Math.min(w, h) * 0.1, t, calm, accent);
  drawControlPanel(g, w * 0.965 + px * 1.5, h * 0.42, Math.min(w, h) * 0.1, t, calm, accent);

  // a soft wash of the window's own light into the room
  glow(g, w * 0.5 + px * 4, floorY * 0.6, Math.max(w, h) * 0.55, accent, 0.13, "lighter");

  // where the wall meets the floor — a crisp structural seam
  g.strokeStyle = "rgba(190,210,255,0.22)";
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(0, floorY);
  g.lineTo(w, floorY);
  g.stroke();

  // floor, lit rather than fading to near-black
  const floor = g.createLinearGradient(0, floorY, 0, h);
  floor.addColorStop(0, "rgba(28,34,58,0.92)");
  floor.addColorStop(1, "#11152a");
  g.fillStyle = floor;
  g.fillRect(0, floorY, w, h - floorY);
  g.strokeStyle = "rgba(150,170,220,0.14)";
  g.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const y = floorY + (h - floorY) * (i / 4);
    g.beginPath();
    g.moveTo(w * 0.5 - w * 0.5 * (i / 4) * 1.2 - px * 10, y);
    g.lineTo(w * 0.5 + w * 0.5 * (i / 4) * 1.2 - px * 10, y);
    g.stroke();
  }

  // a small personal touch along the left wall — makes this feel like a lived-in cabin
  drawShelfNook(g, w * 0.08 + px * 5, floorY + h * 0.02, Math.min(w, h) * 0.16);

  // the pilot's own wardrobe on the far wall — both suits hanging, with a lit
  // indicator for whichever is equipped right now. Clickable: each door
  // previews that suit, same as picking it in the loadout panel.
  const wardrobeX = w * 0.66 + px * 4;
  const wardrobeY = floorY + h * 0.02;
  const wardrobeS = Math.min(w, h) * 0.19;
  const hoverSuit = S.hitKind === "suit-base" ? "base" : S.hitKind === "suit-starfarer" ? "starfarer" : null;
  drawSuitLocker(g, wardrobeX, wardrobeY, wardrobeS, accent, hoverSuit, S.hover);
  const lockerW = wardrobeS * 0.72;
  const lockerH = wardrobeS * 1.15;
  S.hitWardrobe = { x: wardrobeX - lockerW / 2, y: wardrobeY - lockerH, w: lockerW, h: lockerH };

  // the display pad and pilot, centred in the room rather than offset for the
  // loadout panel (the panel floats on top with its own glass background, so
  // the scene underneath stays centred). Clickable: swaps to the other explorer.
  const cx = w * 0.5 + px * 6;
  const cy = h * 0.8;
  const pilotSize = Math.min(w, h) * 0.52;
  drawPad(g, cx, cy, w, h, accent, t, calm, Math.max(S.hitKind === "pilot" ? S.hover : 0, pulseGlow));

  // sparkle motes drifting around the pad
  for (const m of data.motes) {
    const ang = m.a + (calm ? 0 : t * m.sp);
    const mx = cx + Math.cos(ang) * w * 0.1 * m.rad;
    const my = cy + Math.sin(ang) * h * 0.022 * m.rad;
    glow(g, mx, my, w * 0.01, accent, 0.4, "lighter");
  }

  // a faint reflection on the pad, grounding the pilot in the scene
  g.save();
  g.globalAlpha = 0.26;
  g.translate(cx, cy);
  g.scale(1, -0.36);
  drawPilot(g, 0, 0, pilotSize, suit, explorer, t, calm);
  g.restore();

  if (pulseGlow > 0.02) {
    glow(g, cx, cy - pilotSize * 0.3, pilotSize * (0.6 + pulseGlow * 0.3), accent, pulseGlow * 0.4, "lighter");
  }
  // a brief "pop" on entrance right after picking a new explorer — the glow
  // fades at the same rate, so the whole thing reads as one arrival beat
  g.save();
  if (pulseGlow > 0.02 && !calm) {
    const pop = 1 + pulseGlow * 0.07;
    g.translate(cx, cy);
    g.scale(pop, pop);
    g.translate(-cx, -cy);
  }
  drawPilot(g, cx, cy, pilotSize, suit, explorer, t, calm);
  g.restore();
  // pilot hit region — a generous circle around the whole figure, clicking
  // it swaps to the other explorer (same effect as the loadout panel's cards).
  S.hitPilot = { x: cx, y: cy - pilotSize * 0.3, r: pilotSize * 0.55 };

  // a little drifting dust, lit softly by the window and the pad
  for (const d of data.dust) {
    const x = (((d.x * w + (calm ? 0 : t * 4 * d.sp)) % w) + w) % w;
    const y = floorY + d.y * (h - floorY) * 0.6 - (calm ? 0 : (t * 6 * d.sp) % (h * 0.15));
    const a = clamp(0.08 + 0.07 * Math.sin((calm ? 0 : t) * 2 + d.ph), 0, 0.2);
    g.fillStyle = `rgba(${INK},${a})`;
    g.fillRect(x, y, 1.3 * d.z, 1.3 * d.z);
  }

  // the vignette briefly deepens right after picking an explorer, dimming
  // the rest of the room half a beat to put the pilot forward
  const v = g.createRadialGradient(w / 2, h * 0.5, h * 0.35, w / 2, h * 0.5, Math.max(w, h) * 0.85);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, `rgba(0,0,0,${0.32 + pulseGlow * 0.14})`);
  g.fillStyle = v;
  g.fillRect(0, 0, w, h);
  grain(g, w, h, calm ? 0 : t, 0.07);
}

// Is the canvas point (x, y) on the pilot or one of the wardrobe doors? Sets
// S.hitKind to say which one, read back by HangarScene's onPick/onHover —
// same pattern as hitApproach/hitSurface elsewhere in src/art.
export function hitHangar(S, x, y) {
  const p = S.hitPilot;
  if (p && Math.hypot(x - p.x, y - p.y) < p.r) {
    S.hitKind = "pilot";
    return true;
  }
  const wardrobe = S.hitWardrobe;
  if (wardrobe && x >= wardrobe.x && x <= wardrobe.x + wardrobe.w && y >= wardrobe.y && y <= wardrobe.y + wardrobe.h) {
    S.hitKind = x < wardrobe.x + wardrobe.w / 2 ? "suit-base" : "suit-starfarer";
    return true;
  }
  S.hitKind = null;
  return false;
}
