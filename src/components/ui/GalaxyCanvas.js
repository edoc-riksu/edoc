"use client";
import React, { useEffect, useRef } from "react";

/**
 * 🌌 GALAXY CANVAS — the Star Chart's background rendering layer.
 * -------------------------------------------------------------
 * Pure presentation: a full-bleed <canvas> painted behind the existing
 * radar dish SVG. Nothing here reads or writes pilotProgress, touches
 * selectedLanguage, or owns any click handling — StarChart.js keeps every
 * one of those exactly as they were. This component only decides what
 * gets drawn in the empty space behind the interactive plot.
 *
 * 🌀 DENSE LOGARITHMIC SPIRAL GALAXY
 * 2,000 particles mapped to a two-arm logarithmic spiral:
 *
 *     r = a * e^(b * theta)
 *
 * Each particle gets a randomized radial + angular offset from its arm's
 * exact curve so the arms read as thick, organic dust lanes rather than
 * thin mathematical lines. Color and alpha are both driven strictly by
 * normalized distance from the core (t = r / rMax): a brilliant
 * white-cyan glow at the center (#e0f7fa → #00f0ff), fading outward
 * through interstellar purple and indigo (#7c4dff → #1a237e) with
 * steadily decreasing opacity. `theta` advances every animation frame so
 * the whole structure spins continuously around the bright center mass.
 *
 * An elastic (lerp-smoothed) parallax camera offset — desktop mousemove
 * or mobile deviceorientation — shifts the draw origin, and each
 * particle's own depth (tied to how far out on the arm it sits) makes
 * the outer dust drift further than the dense core, the classic
 * foreground/background pseudo-3D read.
 */

const PARTICLE_COUNT = 2000;
const ARMS = 2;
const THETA_MAX = Math.PI * 4.4; // ~2.2 full turns per arm
const SPIRAL_A = 5.2; // r = a * e^(b*theta) — inner radius constant
const SPIRAL_B = 0.32; // growth rate — larger = looser, faster-flaring arms
const MAX_PARALLAX_PX = 52;
const COLOR_BUCKETS = 20;

// Core → edge gradient stops, keyed by t = distance-from-center / rMax.
const COLOR_STOPS = [
  { t: 0.0, hex: "#e0f7fa" }, // brilliant white-cyan core
  { t: 0.14, hex: "#00f0ff" }, // dense high-opacity cyan core glow
  { t: 0.5, hex: "#7c4dff" }, // interstellar purple mid-arm
  { t: 1.0, hex: "#1a237e" } // deep starlight indigo at the rim
];

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Sample the 4-stop core→edge gradient at normalized distance t (0..1). */
function colorAt(t) {
  const clamped = Math.max(0, Math.min(1, t));
  let lo = COLOR_STOPS[0];
  let hi = COLOR_STOPS[COLOR_STOPS.length - 1];
  for (let i = 0; i < COLOR_STOPS.length - 1; i += 1) {
    if (clamped >= COLOR_STOPS[i].t && clamped <= COLOR_STOPS[i + 1].t) {
      lo = COLOR_STOPS[i];
      hi = COLOR_STOPS[i + 1];
      break;
    }
  }
  const span = hi.t - lo.t || 1;
  const localT = (clamped - lo.t) / span;
  const a = hexToRgb(lo.hex);
  const b = hexToRgb(hi.hex);
  return {
    r: Math.round(lerp(a.r, b.r, localT)),
    g: Math.round(lerp(a.g, b.g, localT)),
    b: Math.round(lerp(a.b, b.b, localT))
  };
}

/** Pre-rendered radial-glow sprites, one per color bucket across the core→edge
    spectrum — cheap to `drawImage` per particle instead of building a fresh
    gradient every frame for every one of the 2,000 dots. */
function buildGlowSprites() {
  const sprites = [];
  for (let i = 0; i < COLOR_BUCKETS; i += 1) {
    const t = i / (COLOR_BUCKETS - 1);
    const { r, g, b } = colorAt(t);
    const size = 48;
    const sprite = document.createElement("canvas");
    sprite.width = size;
    sprite.height = size;
    const sctx = sprite.getContext("2d");
    const grad = sctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
    grad.addColorStop(0.35, `rgba(${r},${g},${b},0.9)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    sctx.fillStyle = grad;
    sctx.beginPath();
    sctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    sctx.fill();
    sprites.push(sprite);
  }
  return sprites;
}

/** Deterministic-enough pseudo-random so the field looks the same on every mount instead of reshuffling. */
function mulberry32(seed) {
  let a = seed;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildParticles() {
  const rand = mulberry32(7719);
  const raw = new Array(PARTICLE_COUNT);
  let rMax = 0;

  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    const arm = i % ARMS;
    const armOffset = (arm * Math.PI * 2) / ARMS;
    const theta = rand() * THETA_MAX;

    // r = a * e^(b*theta) — the logarithmic spiral proper.
    const rBase = SPIRAL_A * Math.exp(SPIRAL_B * theta);

    // Organic variance: a branch that thickens as it flares outward, plus
    // a touch of angular scatter, so particles form a fat dust lane
    // instead of sitting exactly on the ideal curve.
    const branchThickness = 0.055 + (rBase / 300) * 0.4;
    const radialJitter = (rand() - 0.5) * 2 * branchThickness * rBase;
    const angleJitter = (rand() - 0.5) * (0.06 + branchThickness * 0.35);

    const radius = Math.max(2, rBase + radialJitter);
    const angle = theta + armOffset + angleJitter;
    if (radius > rMax) rMax = radius;

    raw[i] = {
      angle,
      radius,
      size: 0.9 + rand() * 2.5,
      twinkleSeed: rand() * Math.PI * 2,
      variance: 0.75 + rand() * 0.5 // per-particle brightness variance
    };
  }

  // Second pass: now that rMax is known, derive each particle's normalized
  // core-distance t, its color bucket, its alpha (denser+brighter at the
  // core, thinning steadily outward) and its parallax depth (outer arm
  // dust reads as nearer "foreground", the dense core as distant background).
  const particles = raw.map((p) => {
    const t = p.radius / rMax;
    const alpha = Math.max(0.04, (1 - t) ** 1.6 * 0.95) * p.variance;
    const colorIdx = Math.min(COLOR_BUCKETS - 1, Math.floor(t * (COLOR_BUCKETS - 1)));
    const depth = 0.25 + t * 0.9;
    return { ...p, t, alpha, colorIdx, depth };
  });

  return { particles, rMax };
}

export default function GalaxyCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return undefined;
    const ctx = canvas.getContext("2d");

    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const glowSprites = buildGlowSprites();
    const { particles, rMax } = buildParticles();

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(parent);
    window.addEventListener("resize", resize);

    // 🎥 ELASTIC PARALLAX CAMERA — a target set by pointer/orientation, the
    // current value easing toward it every frame (lerp-smoothed) so the
    // drift reads as springy camera momentum rather than a snap-to-cursor
    // jolt. Combined with per-particle `depth` above, this is what gives
    // the scene its pseudo-3D sense of foreground-vs-core depth.
    const parallax = { x: 0, y: 0, targetX: 0, targetY: 0 };

    const onMouseMove = (e) => {
      const rect = parent.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      parallax.targetX = Math.max(-1, Math.min(1, nx)) * MAX_PARALLAX_PX;
      parallax.targetY = Math.max(-1, Math.min(1, ny)) * MAX_PARALLAX_PX;
    };
    const onOrientation = (e) => {
      if (e.gamma === null || e.beta === null) return;
      const nx = Math.max(-1, Math.min(1, e.gamma / 30));
      const ny = Math.max(-1, Math.min(1, (e.beta - 40) / 30));
      parallax.targetX = nx * MAX_PARALLAX_PX;
      parallax.targetY = ny * MAX_PARALLAX_PX;
    };

    if (!reduceMotion) {
      window.addEventListener("mousemove", onMouseMove, { passive: true });
      window.addEventListener("deviceorientation", onOrientation, { passive: true });
    }

    let frameId;
    let theta = 0; // the continuously-advancing rotation angle
    let tick = 0;

    const draw = () => {
      frameId = requestAnimationFrame(draw);
      tick += 1;

      parallax.x += (parallax.targetX - parallax.x) * 0.05;
      parallax.y += (parallax.targetY - parallax.y) * 0.05;

      if (!reduceMotion) theta += 0.0011; // kinetic rotation — the arms spin around the core

      ctx.clearRect(0, 0, width, height);

      const cx = width / 2 + parallax.x * 0.35;
      const cy = height / 2 + parallax.y * 0.35;
      const scale = (Math.min(width, height) * 0.46) / rMax;

      // Deep violet/indigo nebula pool, center-weighted, sitting under the
      // brilliant cyan core glow.
      const nebulaR = Math.min(width, height) * 0.62;
      const nebula = ctx.createRadialGradient(cx, cy, 0, cx, cy, nebulaR);
      nebula.addColorStop(0, "rgba(0, 240, 255, 0.14)");
      nebula.addColorStop(0.28, "rgba(124, 77, 255, 0.16)");
      nebula.addColorStop(0.65, "rgba(26, 35, 126, 0.14)");
      nebula.addColorStop(1, "rgba(10, 8, 30, 0)");
      ctx.fillStyle = nebula;
      ctx.fillRect(0, 0, width, height);

      // The rotating dual-arm particle spiral itself.
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        const a = p.angle + theta;
        const r = p.radius * scale;
        const px = cx + Math.cos(a) * r + parallax.x * p.depth;
        const py = cy + Math.sin(a) * r * 0.6 + parallax.y * p.depth; // flattened ellipse, top-down galaxy tilt
        if (px < -20 || px > width + 20 || py < -20 || py > height + 20) continue;

        const twinkle = reduceMotion ? 1 : 0.78 + 0.22 * Math.sin(tick * 0.021 + p.twinkleSeed);
        const size = p.size * scale * 6.2;
        ctx.globalAlpha = Math.min(1, p.alpha * twinkle);
        const sprite = glowSprites[p.colorIdx];
        ctx.drawImage(sprite, px - size / 2, py - size / 2, size, size);
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    };
    draw();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("deviceorientation", onOrientation);
      if (ro) ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}
