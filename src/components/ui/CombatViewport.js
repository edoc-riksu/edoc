"use client";
import React, { useEffect, useRef } from "react";

/**
 * 🛰️ COMBAT VIEWPORT — the "weapon-ready tactical deck" canopy glass panel.
 * -------------------------------------------------------------------------
 * Purely decorative 2D canvas: an allied cockpit silhouette holds the left
 * edge, a slow-drifting wave of hostile drones/a mothership/meteorites
 * cruises across a planet-tinted backdrop, and two integer "signal" props
 * are the ONLY link back to the real compiler/grading state — CodeTerminal
 * increments them read-only, after evaluateSubmission has already decided
 * pass/fail. This component never runs, parses or grades anything itself.
 *
 *   fireSignal  — bump on a verified PASS: player volley + enemy scatter.
 *   hitSignal   — bump on a verified FAIL: enemy cannon fire on the canopy.
 *
 * `mode` only re-tints the ambient scene (asteroid drift for Practice,
 * a harsher red-tinted hazard wash for Proctored) — it never changes what
 * counts as a hit or a kill.
 */

const MODE_TINT = {
  PRACTICE: { fog: "rgba(37,99,235,0.10)", belt: true },
  RANKED: { fog: "rgba(6,182,212,0.08)", belt: false },
  PROCTORED: { fog: "rgba(225,29,72,0.10)", belt: false },
  CAMPUS: { fog: "rgba(5,150,105,0.08)", belt: false }
};

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export default function CombatViewport({ accent = "#22d3ee", mode = "PRACTICE", fireSignal = 0, hitSignal = 0 }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const accentRef = useRef(accent);
  const modeRef = useRef(mode);

  useEffect(() => { accentRef.current = accent; }, [accent]);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // Mount-only scene setup — a fresh deterministic-ish wave of hostiles,
  // a persisted particle pool, and the rAF loop. Signals are read from refs
  // (set below) so a fire/hit bump never tears the canvas down and restarts it.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Hostile roster — a couple of drones, one mothership, a scatter of
    // meteorites, each with a slow independent drift so the wave reads as
    // alive without any real gameplay behind it.
    const makeHostiles = () => {
      const list = [];
      const droneCount = 5;
      for (let i = 0; i < droneCount; i += 1) {
        list.push({
          kind: "drone",
          x: 0.42 + Math.random() * 0.5,
          y: 0.12 + (i / droneCount) * 0.72 + Math.random() * 0.05,
          size: 9 + Math.random() * 4,
          drift: 0.00006 + Math.random() * 0.00004,
          bob: Math.random() * Math.PI * 2,
          alive: true,
          deathT: 0
        });
      }
      list.push({
        kind: "mothership",
        x: 0.86,
        y: 0.5,
        size: 30,
        drift: 0.00002,
        bob: 0,
        alive: true,
        deathT: 0
      });
      for (let i = 0; i < 6; i += 1) {
        list.push({
          kind: "meteor",
          x: 0.3 + Math.random() * 0.65,
          y: Math.random(),
          size: 3 + Math.random() * 5,
          drift: 0.00004 + Math.random() * 0.00005,
          spin: Math.random() * Math.PI * 2,
          spinSpeed: (Math.random() - 0.5) * 0.02,
          alive: true,
          deathT: 0
        });
      }
      return list;
    };

    stateRef.current = {
      t: 0,
      hostiles: makeHostiles(),
      lasers: [], // {x0,y0,x1,y1,life}
      bolts: [], // enemy red bolts {x0,y0,x1,y1,life}
      sparks: [], // explosion particles {x,y,vx,vy,life,color}
      flash: 0, // player weapons-fire screen flash
      redFlash: 0, // incoming-hit screen flash
      belt: Array.from({ length: 40 }, () => ({
        x: Math.random(),
        y: Math.random(),
        r: 0.5 + Math.random() * 1.6,
        s: 0.00002 + Math.random() * 0.00003
      })),
      lastFire: -1,
      lastHit: -1
    };

    let frameId;
    const tick = () => {
      frameId = requestAnimationFrame(tick);
      const st = stateRef.current;
      if (!st || width <= 0 || height <= 0) return;
      st.t += 1;

      const accentRgb = hexToRgb(accentRef.current || "#22d3ee");
      const tint = MODE_TINT[modeRef.current] || MODE_TINT.PRACTICE;

      // Backdrop — deep space wash, then a mode-tinted fog.
      ctx.fillStyle = "#020308";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = tint.fog;
      ctx.fillRect(0, 0, width, height);

      // Ambient starfield (cheap, static-seeming twinkle).
      ctx.save();
      for (let i = 0; i < 46; i += 1) {
        const sx = (i * 97 % 100) / 100 * width;
        const sy = (i * 53 % 100) / 100 * height;
        const tw = 0.35 + 0.35 * Math.sin(st.t * 0.02 + i);
        ctx.globalAlpha = Math.max(0, tw);
        ctx.fillStyle = "#cfeeff";
        ctx.fillRect(sx, sy, 1.4, 1.4);
      }
      ctx.restore();

      // Practice-only tranquil asteroid belt — slow-drifting soft grey rocks.
      if (tint.belt) {
        ctx.save();
        st.belt.forEach((b) => {
          b.x -= b.s * 6;
          if (b.x < -0.05) b.x = 1.05;
          ctx.globalAlpha = 0.28;
          ctx.fillStyle = "#94a3b8";
          ctx.beginPath();
          ctx.arc(b.x * width, b.y * height, b.r * (width / 260), 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }

      // Allied cockpit silhouette — left edge, always present.
      const shipX = width * 0.085;
      const shipY = height * 0.5 + Math.sin(st.t * 0.03) * height * 0.03;
      ctx.save();
      ctx.translate(shipX, shipY);
      ctx.fillStyle = `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.9)`;
      ctx.shadowColor = accentRef.current;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(12, -9);
      ctx.lineTo(6, 0);
      ctx.lineTo(12, 9);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      // Targeting HUD ring in front of the ship.
      ctx.strokeStyle = `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.35)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 22 + Math.sin(st.t * 0.05) * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Hostiles — drift left, bob slightly, render by kind.
      st.hostiles.forEach((h) => {
        if (!h.alive) {
          h.deathT += 1;
          if (h.deathT > 26) return;
        } else {
          h.x -= h.drift * (h.kind === "mothership" ? 0.4 : 1) * 16;
          if (h.x < 0.12) h.x = 0.95 + Math.random() * 0.1;
          if (h.kind === "meteor") h.spin += h.spinSpeed;
        }
        const px = h.x * width;
        const py = h.kind === "drone" ? h.y * height + Math.sin(st.t * 0.04 + h.bob) * 4 : h.y * height;
        const deathFade = h.alive ? 1 : Math.max(0, 1 - h.deathT / 26);
        if (deathFade <= 0) return;

        ctx.save();
        ctx.globalAlpha = deathFade;
        if (h.kind === "drone") {
          ctx.fillStyle = "rgba(244,63,94,0.85)";
          ctx.shadowColor = "#f43f5e";
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(px + h.size, py);
          ctx.lineTo(px - h.size * 0.6, py - h.size * 0.6);
          ctx.lineTo(px - h.size * 0.6, py + h.size * 0.6);
          ctx.closePath();
          ctx.fill();
        } else if (h.kind === "mothership") {
          ctx.fillStyle = "rgba(190,24,93,0.8)";
          ctx.strokeStyle = "rgba(251,113,133,0.6)";
          ctx.lineWidth = 1.5;
          ctx.shadowColor = "#be185d";
          ctx.shadowBlur = 16;
          ctx.beginPath();
          for (let i = 0; i < 6; i += 1) {
            const ang = (Math.PI / 3) * i;
            const vx = px + Math.cos(ang) * h.size;
            const vy = py + Math.sin(ang) * h.size * 0.7;
            if (i === 0) ctx.moveTo(vx, vy);
            else ctx.lineTo(vx, vy);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.translate(px, py);
          ctx.rotate(h.spin);
          ctx.fillStyle = "rgba(120,113,108,0.85)";
          ctx.beginPath();
          ctx.ellipse(0, 0, h.size, h.size * 0.8, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // Player laser bolts — green/cyan, tracking toward wherever they spawned aimed.
      st.lasers = st.lasers.filter((l) => l.life > 0);
      st.lasers.forEach((l) => {
        l.life -= 1;
        const p = 1 - l.life / l.total;
        const cx = l.x0 + (l.x1 - l.x0) * Math.min(1, p * 1.6);
        const cy = l.y0 + (l.y1 - l.y0) * Math.min(1, p * 1.6);
        ctx.save();
        ctx.strokeStyle = "rgba(74,222,128,0.9)";
        ctx.shadowColor = "#4ade80";
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(l.x0, l.y0);
        ctx.lineTo(cx, cy);
        ctx.stroke();
        ctx.restore();
      });

      // Enemy cannon bolts — red, fired toward the canopy/player edge.
      st.bolts = st.bolts.filter((b) => b.life > 0);
      st.bolts.forEach((b) => {
        b.life -= 1;
        const p = 1 - b.life / b.total;
        const cx = b.x0 + (b.x1 - b.x0) * Math.min(1, p * 1.6);
        const cy = b.y0 + (b.y1 - b.y0) * Math.min(1, p * 1.6);
        ctx.save();
        ctx.strokeStyle = "rgba(248,113,113,0.9)";
        ctx.shadowColor = "#f87171";
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(b.x0, b.y0);
        ctx.lineTo(cx, cy);
        ctx.stroke();
        ctx.restore();
      });

      // Explosion scatter particles.
      st.sparks = st.sparks.filter((s) => s.life > 0);
      st.sparks.forEach((s) => {
        s.life -= 1;
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.96;
        s.vy *= 0.96;
        ctx.save();
        ctx.globalAlpha = Math.max(0, s.life / s.total);
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Whole-viewport flashes for extra punch on fire/hit.
      if (st.flash > 0) {
        st.flash -= 1;
        ctx.fillStyle = `rgba(74,222,128,${(st.flash / 8) * 0.12})`;
        ctx.fillRect(0, 0, width, height);
      }
      if (st.redFlash > 0) {
        st.redFlash -= 1;
        ctx.fillStyle = `rgba(248,113,113,${(st.redFlash / 10) * 0.18})`;
        ctx.fillRect(0, 0, width, height);
      }

      // Canopy vignette so the scene reads as viewed through cockpit glass.
      const grad = ctx.createRadialGradient(width * 0.5, height * 0.5, height * 0.2, width * 0.5, height * 0.5, height * 0.95);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    };
    tick();

    return () => {
      cancelAnimationFrame(frameId);
      ro.disconnect();
    };
  }, []);

  // Fire signal → spawn a player volley aimed at a random living hostile,
  // then (after the bolt's travel time) mark it dead and scatter it.
  useEffect(() => {
    const st = stateRef.current;
    const canvas = canvasRef.current;
    if (!st || !canvas || fireSignal === 0 || fireSignal === st.lastFire) return;
    st.lastFire = fireSignal;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const shipX = width * 0.085;
    const shipY = height * 0.5;

    const living = st.hostiles.filter((h) => h.alive);
    const targets = (living.length > 0 ? living : st.hostiles).slice(0, 3);
    st.flash = 8;

    targets.forEach((target, i) => {
      const tx = target.x * width;
      const ty = target.kind === "drone" ? target.y * height : target.y * height;
      st.lasers.push({ x0: shipX + 10, y0: shipY - 4 + i * 3, x1: tx, y1: ty, life: 14, total: 14 });
      window.setTimeout(() => {
        target.alive = false;
        target.deathT = 0;
        const color = ["#4ade80", "#22d3ee", "#facc15", "#f8fafc"][Math.floor(Math.random() * 4)];
        for (let p = 0; p < 10; p += 1) {
          const ang = Math.random() * Math.PI * 2;
          const spd = 0.8 + Math.random() * 2.2;
          st.sparks.push({
            x: tx,
            y: ty,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            life: 20 + Math.random() * 14,
            total: 30,
            size: 1 + Math.random() * 2,
            color
          });
        }
      }, 140 + i * 40);
    });
  }, [fireSignal]);

  // Hit signal → the enemy fleet fires back at the canopy/player position.
  useEffect(() => {
    const st = stateRef.current;
    const canvas = canvasRef.current;
    if (!st || !canvas || hitSignal === 0 || hitSignal === st.lastHit) return;
    st.lastHit = hitSignal;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const shipX = width * 0.085;
    const shipY = height * 0.5;
    const shooters = st.hostiles.filter((h) => h.alive).slice(0, 3);
    st.redFlash = 10;
    shooters.forEach((s, i) => {
      st.bolts.push({
        x0: s.x * width,
        y0: s.y * height,
        x1: shipX + 4,
        y1: shipY + (i - 1) * 6,
        life: 12,
        total: 12
      });
    });
  }, [hitSignal]);

  return (
    <div className="relative w-full h-full overflow-hidden" aria-hidden="true">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
