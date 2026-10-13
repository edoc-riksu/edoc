import { makeNebula } from "./noise";

/**
 * The painted sky, drawn on one canvas under everything else:
 * nebula smoke, three layers of stars that drift and slide at different
 * speeds (parallax) when the camera moves or the mouse moves, a few
 * twinkling bright stars, shooting stars, far-away ships and the dotted
 * route. Far stars are pre-drawn into tiles, so a full screen of stars
 * costs a handful of drawImage calls per frame.
 */

function makeTile(size, dpr, count, { rMin, rMax, aMin, aMax }) {
  const c = document.createElement("canvas");
  c.width = Math.round(size * dpr);
  c.height = Math.round(size * dpr);
  const x = c.getContext("2d");
  x.scale(dpr, dpr);
  for (let i = 0; i < count; i += 1) {
    const r = rMin + Math.random() * (rMax - rMin);
    const a = aMin + Math.random() * (aMax - aMin);
    const warm = Math.random();
    x.fillStyle = warm < 0.12 ? `rgba(200,220,255,${a})` : warm < 0.2 ? `rgba(255,236,214,${a})` : `rgba(255,255,255,${a})`;
    const px = Math.random() * size;
    const py = Math.random() * size;
    if (r < 0.6) x.fillRect(px, py, r * 1.6, r * 1.6);
    else {
      x.beginPath();
      x.arc(px, py, r, 0, Math.PI * 2);
      x.fill();
    }
  }
  return c;
}

const TILE = 640;

export class Sky {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.w = 0;
    this.h = 0;
    this.dpr = 1;
    this.shooting = [];
    this.shootTimer = 3;
    this.near = [];
    this.ready = false;
  }

  resize(w, h, dpr, density = 1) {
    this.w = w;
    this.h = h;
    this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.tiles = [
      makeTile(TILE, dpr, Math.round(520 * density), { rMin: 0.3, rMax: 0.75, aMin: 0.28, aMax: 0.9 }),
      makeTile(TILE, dpr, Math.round(150 * density), { rMin: 0.6, rMax: 1.1, aMin: 0.5, aMax: 1 })
    ];
    const nearCount = Math.round(((w * h) / (1376 * 768)) * 70 * density);
    this.near = Array.from({ length: nearCount }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.9 + Math.random() * 1.1,
      a: 0.7 + Math.random() * 0.3,
      speed: 0.4 + Math.random() * 1.3,
      phase: Math.random() * 6.28,
      warm: Math.random() < 0.25
    }));
    if (!this.nebula) {
      // a low-res smoke map, stretched over the sky: streaky smoke on the left, haze at the bottom right
      this.nebula = makeNebula(
        240,
        135,
        [
          { cx: 0.22, cy: 0.36, rx: 0.2, ry: 0.5, fx: 7, fy: 2.4, cut: 0.46, gain: 3.2, alpha: 0.85, color: [150, 168, 214] },
          { cx: 0.8, cy: 0.86, rx: 0.34, ry: 0.42, fx: 3.4, fy: 4, cut: 0.4, gain: 2.4, alpha: 0.75, color: [128, 146, 200] },
          { cx: 0.5, cy: 0.5, rx: 0.8, ry: 0.8, fx: 2, fy: 2, cut: 0.5, gain: 1.4, alpha: 0.2, color: [60, 90, 150] }
        ],
        11
      );
    }
    this.ready = true;
  }

  /** draw once per frame. cam = {x, y} camera slide in px; ptr = {x, y} pointer -1..1 */
  draw(t, dt, cam, ptr, { drift, calm, ships, route }) {
    if (!this.ready) return;
    const { ctx, w, h, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // ground colour
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#0a1230");
    g.addColorStop(0.55, "#0b1432");
    g.addColorStop(1, "#070c20");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // teal tint behind the front planet
    const tint = ctx.createRadialGradient(w * 0.3, h * 0.6, 0, w * 0.3, h * 0.6, w * 0.3);
    tint.addColorStop(0, "rgba(45,212,191,0.10)");
    tint.addColorStop(1, "rgba(45,212,191,0)");
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, w, h);

    // nebula: slow breathing drift plus parallax
    const nw = w * 1.3;
    const nh = h * 1.3;
    const nx = -w * 0.15 - cam.x * 0.05 - ptr.x * 16 + Math.sin(t * 0.05) * 14;
    const ny = -h * 0.15 - cam.y * 0.05 - ptr.y * 10 + Math.cos(t * 0.04) * 9;
    ctx.globalAlpha = 0.9;
    ctx.drawImage(this.nebula, nx, ny, nw, nh);
    ctx.globalAlpha = 1;

    // star tiles: far (slow) and mid (faster), wrapped
    const layers = [
      { tile: this.tiles[0], depth: 0.06, vx: -2.2, vy: 0.4, px: 5, alpha: 1 },
      { tile: this.tiles[1], depth: 0.16, vx: -5, vy: 0.9, px: 11, alpha: 0.72 + 0.28 * Math.sin(t * 0.8) }
    ];
    for (const L of layers) {
      const sx = -cam.x * L.depth - ptr.x * L.px + (drift ? t * L.vx : 0);
      const sy = -cam.y * L.depth - ptr.y * L.px * 0.7 + (drift ? t * L.vy : 0);
      const ox = ((sx % TILE) + TILE) % TILE;
      const oy = ((sy % TILE) + TILE) % TILE;
      ctx.globalAlpha = L.alpha;
      for (let x = ox - TILE; x < w; x += TILE) {
        for (let y = oy - TILE; y < h; y += TILE) ctx.drawImage(L.tile, x, y, TILE, TILE);
      }
    }
    ctx.globalAlpha = 1;

    // near stars: bigger, twinkle, drift fastest
    for (let i = 0; i < this.near.length; i += 1) {
      const s = this.near[i];
      const sx = -cam.x * 0.34 - ptr.x * 22 + (drift ? t * -9 : 0);
      const sy = -cam.y * 0.34 - ptr.y * 14 + (drift ? t * 1.5 : 0);
      const x = (((s.x + sx) % w) + w) % w;
      const y = (((s.y + sy) % h) + h) % h;
      const a = s.a * (0.6 + 0.4 * Math.sin(t * s.speed + s.phase));
      const rgb = s.warm ? "255,236,214" : "235,244,255";
      const gl = ctx.createRadialGradient(x, y, 0, x, y, s.r * 4);
      gl.addColorStop(0, `rgba(${rgb},${a * 0.5})`);
      gl.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = gl;
      ctx.fillRect(x - s.r * 4, y - s.r * 4, s.r * 8, s.r * 8);
      ctx.fillStyle = `rgba(${rgb},${a})`;
      ctx.beginPath();
      ctx.arc(x, y, s.r * 0.75, 0, 6.2832);
      ctx.fill();
    }

    // shooting stars
    if (!calm) {
      this.shootTimer -= dt;
      if (this.shootTimer <= 0) {
        this.shootTimer = 4 + Math.random() * 7;
        const fromLeft = Math.random() < 0.5;
        const ang = (fromLeft ? 0.25 : Math.PI - 0.25) + (Math.random() - 0.5) * 0.3;
        this.shooting.push({ x: Math.random() * w * 0.8 + w * 0.1, y: Math.random() * h * 0.45, vx: Math.cos(ang) * 900, vy: Math.sin(ang) * 900, life: 0, max: 0.55 + Math.random() * 0.3 });
      }
    }
    for (let i = this.shooting.length - 1; i >= 0; i -= 1) {
      const s = this.shooting[i];
      s.life += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      const k = 1 - s.life / s.max;
      if (k <= 0) {
        this.shooting.splice(i, 1);
        continue;
      }
      const tx = s.x - s.vx * 0.09;
      const ty = s.y - s.vy * 0.09;
      const lg = ctx.createLinearGradient(s.x, s.y, tx, ty);
      lg.addColorStop(0, `rgba(255,255,255,${0.9 * k})`);
      lg.addColorStop(1, "rgba(160,200,255,0)");
      ctx.strokeStyle = lg;
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
    }

    // far ships, behind the planets
    ships.draw(ctx, "back", (depth) => ({ ox: -cam.x * 0.2 * depth - ptr.x * 14 * depth, oy: -cam.y * 0.2 * depth - ptr.y * 9 * depth }), t);

    // the dotted route: dots march toward the far planets
    if (route && route.length > 1) {
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.setLineDash([0.1, 9]);
      ctx.lineDashOffset = drift ? -t * 6 : 0;
      ctx.strokeStyle = "rgba(196,207,240,0.4)";
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(route[0].x, route[0].y);
      for (let i = 1; i < route.length; i += 1) ctx.lineTo(route[i].x, route[i].y);
      ctx.stroke();
      ctx.restore();
    }

    // soft vignette to keep the corners deep
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.42)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }
}
