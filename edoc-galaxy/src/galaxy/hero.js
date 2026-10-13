import { drawShip } from "./ships";

const TAU = Math.PI * 2;
const IDLE_THETA = Math.PI + 0.45; // nose to the upper left, like the reference picture

const angleDiff = (a, b) => {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
};

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function bezier(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y
  };
}

/**
 * The pilot's own ship, and the dust and sparks around it. It floats at
 * home, leans toward the mouse, trails engine light when it moves, and
 * on launch swoops along a curve to the chosen planet while warp streaks
 * rush past.
 */
export class Hero {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.theta = IDLE_THETA;
    this.size = 110;
    this.scale = 1;
    this.mode = "idle"; // idle | flying | arrived
    this.home = { x: 0, y: 0 };
    this.inited = false;
    this.parts = [];
    this.flight = null;
    this.warp = 0;
    this.emit = 0;
    this.lastX = 0;
    this.lastY = 0;
    this.streaks = Array.from({ length: 110 }, () => ({
      a: Math.random() * TAU,
      r0: 0.08 + Math.random() * 0.5,
      len: 0.12 + Math.random() * 0.5,
      sp: 0.5 + Math.random() * 1.2,
      o: Math.random()
    }));
  }

  setHome(x, y, size) {
    this.home.x = x;
    this.home.y = y;
    this.size = size;
    if (!this.inited) {
      this.x = x;
      this.y = y;
      this.lastX = x;
      this.lastY = y;
      this.inited = true;
    }
  }

  /** a puff of stardust (used for the mouse trail and clicks) */
  spark(x, y, n = 1, spread = 14) {
    for (let i = 0; i < n; i += 1) {
      if (this.parts.length > 220) this.parts.shift();
      const a = Math.random() * TAU;
      const sp = Math.random() * spread;
      this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 6, life: 0, max: 0.6 + Math.random() * 0.7, r: 0.8 + Math.random() * 1.6, dust: true });
    }
  }

  launch(getTarget, onArrive) {
    if (this.mode !== "idle") return;
    this.mode = "flying";
    this.flight = { t: 0, dur: 2.1, from: { x: this.x, y: this.y }, get: getTarget, onArrive };
  }

  /** come back from a planet: appear small at its position and glide home */
  comeBack(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.scale = 0.25;
    this.mode = "idle";
    this.flight = null;
  }

  update(dt, t, ptr, still) {
    if (this.mode === "idle") {
      const tx = this.home.x + (still ? 0 : ptr.x * 32 + Math.sin(t * 0.7) * 10);
      const ty = this.home.y + (still ? 0 : ptr.y * 24 + Math.cos(t * 0.9) * 7);
      const ax = (tx - this.x) * 9 - this.vx * 5.5;
      const ay = (ty - this.y) * 9 - this.vy * 5.5;
      this.vx += ax * dt;
      this.vy += ay * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.scale += (1 - this.scale) * Math.min(1, dt * 2.5);
      const speed = Math.hypot(this.vx, this.vy);
      const want = speed > 70 ? Math.atan2(this.vy, this.vx) : IDLE_THETA;
      this.theta += angleDiff(this.theta, want) * Math.min(1, dt * 3.2);
      this.flare = 0.35 + Math.min(1, speed / 220);
      this.speed = speed;
      this.warp += (0 - this.warp) * Math.min(1, dt * 3);
    } else if (this.mode === "flying") {
      const f = this.flight;
      f.t += dt / f.dur;
      const k = ease(Math.min(1, f.t));
      const p0 = f.from;
      const p1 = f.get();
      const dx = p1.x - p0.x;
      const c1 = { x: p0.x + dx * 0.1, y: p0.y - 230 };
      const c2 = { x: p1.x - dx * 0.22 - 60, y: p1.y - 190 };
      const pos = bezier(p0, c1, c2, p1, k);
      const ahead = bezier(p0, c1, c2, p1, Math.min(1, k + 0.02));
      const px = this.x;
      const py = this.y;
      this.x = pos.x;
      this.y = pos.y;
      this.vx = (this.x - px) / Math.max(dt, 1e-3);
      this.vy = (this.y - py) / Math.max(dt, 1e-3);
      this.theta += angleDiff(this.theta, Math.atan2(ahead.y - pos.y, ahead.x - pos.x)) * Math.min(1, dt * 9);
      this.scale = 1 - 0.78 * Math.pow(k, 1.4);
      this.flare = 1.5;
      this.speed = Math.hypot(this.vx, this.vy);
      this.warp = Math.sin(Math.min(1, f.t) * Math.PI) * 0.95;
      if (f.t >= 1) {
        this.mode = "arrived";
        this.warp = 0;
        f.onArrive?.();
      }
    }

    // engine light left behind the ship: spaced by distance, so a fast ship leaves a smooth ribbon
    if (this.mode !== "arrived") {
      const len = this.size * this.scale * 0.5;
      const speed = this.speed || 0;
      const ex = -Math.cos(this.theta) * len;
      const ey = -Math.sin(this.theta) * len;
      const dist = Math.hypot(this.x - this.lastX, this.y - this.lastY);
      let n = Math.min(40, Math.floor(dist / 5));
      if (this.mode !== "flying") n = 0;
      this.emit += dt * (26 + Math.min(80, speed * 0.4));
      while (this.emit >= 1) {
        this.emit -= 1;
        n += 1;
      }
      for (let i = 0; i < n; i += 1) {
        if (this.parts.length > 260) this.parts.shift();
        const k = this.mode === "flying" ? (i + 1) / n : 1;
        this.parts.push({
          x: this.lastX + (this.x - this.lastX) * k + ex + (Math.random() - 0.5) * 3,
          y: this.lastY + (this.y - this.lastY) * k + ey + (Math.random() - 0.5) * 3,
          vx: -this.vx * 0.05 + (Math.random() - 0.5) * 8,
          vy: -this.vy * 0.05 + (Math.random() - 0.5) * 8,
          life: 0,
          max: 0.45 + Math.random() * 0.5,
          r: (1.2 + Math.random() * 1.8) * Math.max(0.5, this.scale),
          dust: false
        });
      }
    }
    this.lastX = this.x;
    this.lastY = this.y;

    for (let i = this.parts.length - 1; i >= 0; i -= 1) {
      const p = this.parts[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - dt * 1.2;
      p.vy *= 1 - dt * 1.2;
      if (p.life >= p.max) this.parts.splice(i, 1);
    }
  }

  draw(ctx, t, w, h, center) {
    // warp streaks rush outward from the planet
    if (this.warp > 0.02) {
      const cx = center?.x ?? w / 2;
      const cy = center?.y ?? h / 2;
      const reach = Math.hypot(w, h) * 0.7;
      ctx.save();
      ctx.lineCap = "round";
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < this.streaks.length; i += 1) {
        const s = this.streaks[i];
        const f = (s.o + t * s.sp * (0.6 + this.warp)) % 1;
        const r = (s.r0 + f * f * 1.1) * reach;
        const len = s.len * 90 * this.warp * (0.3 + f);
        const x0 = cx + Math.cos(s.a) * r;
        const y0 = cy + Math.sin(s.a) * r;
        ctx.strokeStyle = `rgba(190,225,255,${this.warp * 0.55 * f})`;
        ctx.lineWidth = 0.8 + f * 1.4;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0 + Math.cos(s.a) * len, y0 + Math.sin(s.a) * len);
        ctx.stroke();
      }
      ctx.restore();
    }

    // particles
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < this.parts.length; i += 1) {
      const p = this.parts[i];
      const k = 1 - p.life / p.max;
      const r = p.r * (p.dust ? 1 : 0.5 + k) * 2.6;
      const rgb = p.dust ? "205,225,255" : "150,212,255";
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0, `rgba(${rgb},${k * (p.dust ? 0.8 : 0.6)})`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
    }
    ctx.restore();

    if (this.mode !== "arrived") {
      drawShip(ctx, "shuttle", this.x, this.y, this.size * this.scale, this.theta, this.flare || 0.4, t, 1);
    }
  }
}
