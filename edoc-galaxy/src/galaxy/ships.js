/**
 * Spaceships, drawn with canvas paths (no images). Every ship is drawn
 * facing +x with its length about 100 units, then scaled and turned.
 * ShipSystem flies a few of them across the sky at different depths:
 * small slow ones far behind the planets, bigger quick ones in front.
 */

function glow(ctx, x, y, r, rgb, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function hullGradient(ctx, a, b, c) {
  const g = ctx.createLinearGradient(0, -20, 0, 20);
  g.addColorStop(0, a);
  g.addColorStop(0.5, b);
  g.addColorStop(1, c);
  return g;
}

const SHAPES = {
  shuttle(ctx, t) {
    // swept wings
    ctx.fillStyle = hullGradient(ctx, "#475173", "#222942", "#0d1124");
    ctx.strokeStyle = "rgba(150,165,215,0.4)";
    ctx.lineWidth = 0.9;
    for (const m of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(14, m * 9);
      ctx.lineTo(-20, m * 46);
      ctx.lineTo(-36, m * 44);
      ctx.lineTo(-26, m * 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // fuselage
    ctx.fillStyle = hullGradient(ctx, "#5a6590", "#2a3250", "#12172c");
    ctx.beginPath();
    ctx.moveTo(52, 0);
    ctx.bezierCurveTo(32, -9, 2, -12, -30, -11);
    ctx.lineTo(-46, -7);
    ctx.lineTo(-46, 7);
    ctx.lineTo(-30, 11);
    ctx.bezierCurveTo(2, 12, 32, 9, 52, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // spine highlight and glass
    ctx.strokeStyle = "rgba(170,185,235,0.35)";
    ctx.beginPath();
    ctx.moveTo(44, -1.5);
    ctx.lineTo(-24, -4);
    ctx.stroke();
    ctx.fillStyle = "rgba(150,196,245,0.65)";
    ctx.beginPath();
    ctx.ellipse(27, 0, 11, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    // wing-tip lights
    const blink = Math.sin(t * 5) > 0.2 ? 1 : 0.25;
    ctx.fillStyle = `rgba(255,90,90,${blink})`;
    ctx.fillRect(-37, -46, 3, 3);
    ctx.fillStyle = `rgba(90,255,170,${blink})`;
    ctx.fillRect(-37, 43, 3, 3);
  },
  dart(ctx, t) {
    ctx.fillStyle = hullGradient(ctx, "#566087", "#252c48", "#0f1326");
    ctx.strokeStyle = "rgba(150,170,225,0.4)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(54, 0);
    ctx.lineTo(-8, -9);
    ctx.lineTo(-30, -30);
    ctx.lineTo(-34, -8);
    ctx.lineTo(-46, -5);
    ctx.lineTo(-46, 5);
    ctx.lineTo(-34, 8);
    ctx.lineTo(-30, 30);
    ctx.lineTo(-8, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(140,190,255,0.6)";
    ctx.beginPath();
    ctx.ellipse(16, 0, 9, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(120,240,255,${0.6 + 0.4 * Math.sin(t * 7)})`;
    ctx.fillRect(-31, -30, 2.5, 2.5);
    ctx.fillRect(-31, 28, 2.5, 2.5);
  },
  drone(ctx, t) {
    ctx.fillStyle = hullGradient(ctx, "#4d5780", "#262d49", "#10142a");
    ctx.strokeStyle = "rgba(150,170,225,0.4)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.ellipse(0, 0, 40, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(160,205,250,0.55)";
    ctx.beginPath();
    ctx.ellipse(8, -1, 17, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = -2; i <= 2; i += 1) {
      const on = Math.sin(t * 4 + i) > 0;
      ctx.fillStyle = on ? "rgba(255,214,120,0.95)" : "rgba(255,214,120,0.25)";
      ctx.fillRect(i * 12 - 1.5, 11, 3, 2.5);
    }
  },
  freighter(ctx, t) {
    ctx.fillStyle = hullGradient(ctx, "#4a5476", "#232a44", "#0e1226");
    ctx.strokeStyle = "rgba(150,170,225,0.35)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(52, 0);
    ctx.lineTo(40, -12);
    ctx.lineTo(-44, -14);
    ctx.lineTo(-52, -8);
    ctx.lineTo(-52, 8);
    ctx.lineTo(-44, 14);
    ctx.lineTo(40, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(10,14,32,0.7)";
    for (let x = -30; x <= 20; x += 17) {
      ctx.beginPath();
      ctx.moveTo(x, -13);
      ctx.lineTo(x, 13);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(150,196,245,0.6)";
    ctx.fillRect(34, -4, 10, 8);
    ctx.fillStyle = `rgba(255,120,90,${0.5 + 0.5 * Math.sin(t * 3)})`;
    ctx.fillRect(-46, -15.5, 3, 2.5);
  }
};

/** Draw one ship at x,y. `theta` is the heading; ships that fly left are mirrored, not upside-down. */
export function drawShip(ctx, kind, x, y, size, theta, flare, t, alpha = 1) {
  const left = Math.cos(theta) < 0;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  if (left) {
    ctx.rotate(theta - Math.PI);
    ctx.scale(-size / 100, size / 100);
  } else {
    ctx.rotate(theta);
    ctx.scale(size / 100, size / 100);
  }
  // engine bloom first, so the hull sits on top
  ctx.globalCompositeOperation = "lighter";
  glow(ctx, -50, 0, 46 * (0.6 + flare), "150,215,255", 0.55 * Math.min(1, 0.4 + flare));
  ctx.globalCompositeOperation = "source-over";
  glow(ctx, -48, 0, 8, "230,246,255", 0.95);
  (SHAPES[kind] || SHAPES.dart)(ctx, t);
  ctx.restore();
}

const KINDS = ["dart", "dart", "drone", "freighter", "shuttle"];

export class ShipSystem {
  constructor() {
    this.ships = [];
    this.timer = 0.8;
  }

  spawn(w, h) {
    const depth = Math.random() < 0.72 ? 0.35 + Math.random() * 0.5 : 1.1 + Math.random() * 0.5;
    const dirRight = Math.random() < 0.55;
    const speed = (34 + Math.random() * 46) * depth;
    const size = (30 + Math.random() * 26) * depth;
    const y = h * (0.1 + Math.random() * 0.75);
    this.ships.push({
      kind: KINDS[Math.floor(Math.random() * KINDS.length)],
      depth,
      x: dirRight ? -120 : w + 120,
      y,
      heading: dirRight ? 0 : Math.PI,
      speed,
      turn: (Math.random() - 0.5) * 0.12,
      size,
      trail: [],
      tt: 0,
      bornAt: 0,
      seed: Math.random() * 10
    });
  }

  update(dt, w, h, calm) {
    this.timer -= dt;
    if (this.timer <= 0) {
      if (this.ships.length < (calm ? 2 : 6)) this.spawn(w, h);
      this.timer = (calm ? 6 : 2.2) + Math.random() * 4;
    }
    for (let i = this.ships.length - 1; i >= 0; i -= 1) {
      const s = this.ships[i];
      s.heading += s.turn * dt * (Math.cos(s.heading) < 0 ? -1 : 1);
      s.x += Math.cos(s.heading) * s.speed * dt;
      s.y += Math.sin(s.heading) * s.speed * dt;
      s.tt += dt;
      if (s.tt > 0.045) {
        s.tt = 0;
        s.trail.push({ x: s.x, y: s.y });
        if (s.trail.length > 16) s.trail.shift();
      }
      if (s.x < -260 || s.x > w + 260 || s.y < -200 || s.y > h + 200) this.ships.splice(i, 1);
    }
  }

  /** layer "back" draws the far, small ships; "front" the near, big ones. */
  draw(ctx, layer, parallax, t) {
    for (let i = 0; i < this.ships.length; i += 1) {
      const s = this.ships[i];
      const isFront = s.depth >= 1;
      if ((layer === "front") !== isFront) continue;
      const { ox, oy } = parallax(s.depth);
      const alpha = isFront ? 0.95 : 0.5 + 0.4 * s.depth;
      // trail
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      for (let k = 1; k < s.trail.length; k += 1) {
        const a = k / s.trail.length;
        ctx.strokeStyle = `rgba(150,210,255,${a * 0.22 * alpha})`;
        ctx.lineWidth = Math.max(0.6, s.size * 0.05 * a);
        ctx.beginPath();
        ctx.moveTo(s.trail[k - 1].x + ox, s.trail[k - 1].y + oy);
        ctx.lineTo(s.trail[k].x + ox, s.trail[k].y + oy);
        ctx.stroke();
      }
      ctx.restore();
      drawShip(ctx, s.kind, s.x + ox, s.y + oy, s.size, s.heading, 0.5, t + s.seed, alpha);
    }
  }
}
