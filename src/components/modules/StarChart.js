"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePilot } from "../../context/PilotContext";
import {
  PLANETARY_SYSTEM,
  ORBIT_MIN,
  ORBIT_MAX,
  isSectorUnlocked,
  sectorMastery,
  fleetMastery
} from "../../lib/planetarySystem";
import {
  readOrbitAngle,
  isTelemetryLive,
  telemetryFrameCount
} from "../../lib/orbitalTelemetry";
import { Radar, Lock, Crosshair, Terminal, Radio, Gauge, Unlink } from "lucide-react";

/* ---------------------------------------------------------------
   Radar projection constants. The SVG viewBox is centred on 0,0 so
   the sun sits at the origin and CSS rotations sweep about it.
   --------------------------------------------------------------- */
const VIEW = 520;                 // half-extent of the viewBox
const DISH_RADIUS = 470;          // outer boundary ring
const PLOT_MIN = 112;             // innermost plotted orbit
const PLOT_MAX = 448;             // outermost plotted orbit
const PROGRESS_RING_R = 19;       // mastery arc radius around each contact
const RING_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RING_R;
/** Range labels fan out along this bearing so they never stack into one column. */
const RANGE_LABEL_ANGLE = -Math.PI * 0.72;

/** Map a scene-space orbital radius onto radar plot space. */
function plotRadius(orbitRadius) {
  const t = (orbitRadius - ORBIT_MIN) / (ORBIT_MAX - ORBIT_MIN || 1);
  return PLOT_MIN + t * (PLOT_MAX - PLOT_MIN);
}

/** Contact dot size, derived from the body size used by the WebGL scene. */
function contactRadius(bodySize) {
  return 7 + (bodySize - 8) * 0.85;
}

const BEARINGS = [
  { label: "000", x: 0, y: -DISH_RADIUS - 16 },
  { label: "090", x: DISH_RADIUS + 22, y: 5 },
  { label: "180", x: 0, y: DISH_RADIUS + 26 },
  { label: "270", x: -DISH_RADIUS - 22, y: 5 }
];

/* -----------------------------------------------------------------
   🪐 SCREEN-ADAPTIVE PLANET SECTOR GRAPHICS
   Purely local to this dish's rendering — a bespoke per-language look
   layered on top of the shared PLANETARY_SYSTEM data (sector.hex stays
   the canonical color used for orbit tint / mastery ring / roster
   panel everywhere else in the app; this map only styles the body
   glyph drawn here). Keyed by the real sector ids from planetarySystem.js.
   ----------------------------------------------------------------- */
const PLANET_STYLE = {
  "Python Engine Core": { kind: "emerald-debris", primary: "#059669", secondary: "#6ee7b7" },
  "JavaScript Engine": { kind: "purple-electric", primary: "#7e22ce", secondary: "#e9d5ff" },
  "TypeScript Array": { kind: "cyan-crystal", primary: "#0e7490", secondary: "#a5f3fc" },
  "Go Engine Subsystem": { kind: "gold-ringed", primary: "#b45309", secondary: "#fde68a" },
  "Rust Core Defense": { kind: "crimson-magma", primary: "#7f1d1d", secondary: "#fca5a5" },
  "SQL Relational Matrix": { kind: "azure-grid", primary: "#0369a1", secondary: "#bae6fd" }
};
const DEFAULT_PLANET_STYLE = { kind: "emerald-debris", primary: "#334155", secondary: "#94a3b8" };

/** The sharp, layered per-language body glyph — replaces the old plain
    filled circle. Hit-testing, mastery ring, lock state and the
    designation tag all live one level up in the caller, untouched. */
function PlanetBody({ sectorId, dot, unlocked }) {
  const style = PLANET_STYLE[sectorId] || DEFAULT_PLANET_STYLE;
  const gradId = `pb-grad-${style.kind}`;
  const fill = unlocked ? `url(#${gradId})` : "#0f172a";
  const stroke = unlocked ? style.secondary : "#1e293b";

  switch (style.kind) {
    case "purple-electric":
      return (
        <>
          {unlocked && (
            <circle r={dot * 1.75} fill="none" stroke={style.secondary} strokeOpacity="0.16" strokeWidth="1" strokeDasharray="2 3" />
          )}
          <circle r={dot} fill={fill} stroke={stroke} strokeWidth="1.5" />
          {unlocked && (
            <path
              d={`M ${-dot * 0.85} ${-dot * 0.15} L ${-dot * 0.15} ${dot * 0.1} L ${-dot * 0.45} ${dot * 0.6} L ${dot * 0.1} ${-dot * 0.1} L ${dot * 0.75} ${dot * 0.45}`}
              fill="none"
              stroke={style.secondary}
              strokeWidth="1.1"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.85"
            />
          )}
        </>
      );

    case "cyan-crystal":
      return (
        <>
          <polygon
            points={`0,${-dot * 1.3} ${dot},0 0,${dot * 1.3} ${-dot},0`}
            fill={fill}
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {unlocked && (
            <g stroke={style.secondary} strokeOpacity="0.55" strokeWidth="0.75">
              <line x1="0" y1={-dot * 1.3} x2="0" y2={dot * 1.3} />
              <line x1={-dot} y1="0" x2={dot} y2="0" />
            </g>
          )}
        </>
      );

    case "gold-ringed":
      return (
        <>
          <ellipse
            rx={dot * 2.15}
            ry={dot * 0.6}
            fill="none"
            stroke={style.secondary}
            strokeOpacity={unlocked ? 0.55 : 0.15}
            strokeWidth="1.5"
          />
          {unlocked && (
            <ellipse rx={dot * 2.65} ry={dot * 0.74} fill="none" stroke={style.secondary} strokeOpacity="0.18" strokeWidth="1" strokeDasharray="1 4" />
          )}
          <circle r={dot} fill={fill} stroke={stroke} strokeWidth="1.5" />
        </>
      );

    case "crimson-magma":
      return (
        <>
          <circle r={dot} fill={fill} stroke={stroke} strokeWidth="1.5" />
          {unlocked && (
            <g stroke={style.secondary} strokeWidth="1" opacity="0.7" fill="none" strokeLinecap="round">
              <path d={`M ${-dot * 0.55} ${-dot * 0.5} L ${-dot * 0.1} 0 L ${-dot * 0.4} ${dot * 0.55}`} />
              <path d={`M ${dot * 0.2} ${-dot * 0.55} L ${dot * 0.5} ${-dot * 0.05} L ${dot * 0.15} ${dot * 0.5}`} />
            </g>
          )}
        </>
      );

    case "azure-grid":
      return (
        <>
          <rect
            x={-dot * 0.95}
            y={-dot * 0.95}
            width={dot * 1.9}
            height={dot * 1.9}
            fill={fill}
            stroke={stroke}
            strokeWidth="1.5"
          />
          {unlocked && (
            <g stroke={style.secondary} strokeOpacity="0.55" strokeWidth="0.6">
              <line x1={-dot * 0.32} y1={-dot * 0.95} x2={-dot * 0.32} y2={dot * 0.95} />
              <line x1={dot * 0.32} y1={-dot * 0.95} x2={dot * 0.32} y2={dot * 0.95} />
              <line x1={-dot * 0.95} y1={-dot * 0.32} x2={dot * 0.95} y2={-dot * 0.32} />
              <line x1={-dot * 0.95} y1={dot * 0.32} x2={dot * 0.95} y2={dot * 0.32} />
            </g>
          )}
        </>
      );

    case "emerald-debris":
    default:
      return (
        <>
          <circle r={dot} fill={fill} stroke={stroke} strokeWidth="1.5" />
          {unlocked &&
            [0, 1, 2, 3].map((i) => {
              const a = (i / 4) * Math.PI * 2 + 0.4;
              const r = dot * 1.9;
              return (
                <circle
                  key={i}
                  cx={Math.cos(a) * r}
                  cy={Math.sin(a) * r}
                  r={Math.max(1.2, dot * 0.16)}
                  fill={style.secondary}
                  opacity="0.55"
                />
              );
            })}
        </>
      );
  }
}

export default function StarChart({ onEngageWarp } = {}) {
  const {
    pilotProgress,
    selectedLanguage,
    setSelectedLanguage,
    routeToScreen,
    playSystemSound,
    pushToast
  } = usePilot();

  const [hovered, setHovered] = useState(null);
  const [linkLive, setLinkLive] = useState(false);

  const nodeRefs = useRef(Object.create(null));
  const lockRef = useRef(null);
  const linkLineRef = useRef(null);
  const bearingRef = useRef(null);
  const frameCountRef = useRef(null);
  const simAngles = useRef(Object.create(null));
  const selectedRef = useRef(selectedLanguage);

  useEffect(() => {
    selectedRef.current = selectedLanguage;
  }, [selectedLanguage]);

  const roster = useMemo(
    () =>
      PLANETARY_SYSTEM.map((sector) => ({
        ...sector,
        plot: plotRadius(sector.orbitRadius),
        dot: contactRadius(sector.bodySize),
        unlocked: isSectorUnlocked(sector.id, pilotProgress),
        mastery: sectorMastery(sector.id, pilotProgress)
      })),
    [pilotProgress]
  );

  const lockedSector = roster.find((s) => s.id === selectedLanguage) || null;
  const inspected = roster.find((s) => s.id === hovered) || lockedSector;
  const fleet = fleetMastery(pilotProgress);
  const contactsUnlocked = roster.filter((s) => s.unlocked).length;

  /* -------------------------------------------------------------
     Live plotting loop.

     This deliberately mutates SVG attributes directly instead of
     driving React state — the WebGL scene publishes new angles every
     frame, and routing that through setState would re-render the
     whole cockpit 60 times a second.
     ------------------------------------------------------------- */
  useEffect(() => {
    let frameId;
    let lastReadout = -Infinity;

    const paint = (now = 0) => {
      frameId = requestAnimationFrame(paint);

      const lockedId = selectedRef.current;
      let lockedPoint = null;

      for (let i = 0; i < roster.length; i += 1) {
        const sector = roster[i];
        let angle = readOrbitAngle(sector.id);

        if (typeof angle !== "number") {
          // No WebGL scene mounted (or not yet publishing) — run a local
          // simulation at the same orbital speed so the radar still lives.
          if (simAngles.current[sector.id] === undefined) {
            simAngles.current[sector.id] = i * 1.04;
          }
          simAngles.current[sector.id] += sector.orbitSpeed * 0.16;
          angle = simAngles.current[sector.id];
        }

        const x = Math.cos(angle) * sector.plot;
        const y = Math.sin(angle) * sector.plot;

        const group = nodeRefs.current[sector.id];
        if (group) group.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)})`);

        if (sector.id === lockedId) lockedPoint = { x, y, angle };
      }

      if (lockedPoint) {
        if (lockRef.current) {
          lockRef.current.setAttribute(
            "transform",
            `translate(${lockedPoint.x.toFixed(2)} ${lockedPoint.y.toFixed(2)})`
          );
          lockRef.current.style.opacity = "1";
        }
        if (linkLineRef.current) {
          linkLineRef.current.setAttribute("x2", lockedPoint.x.toFixed(2));
          linkLineRef.current.setAttribute("y2", lockedPoint.y.toFixed(2));
          linkLineRef.current.style.opacity = "1";
        }
      } else {
        if (lockRef.current) lockRef.current.style.opacity = "0";
        if (linkLineRef.current) linkLineRef.current.style.opacity = "0";
      }

      // Textual readouts refresh ~5x/sec. Throttling on elapsed time rather
      // than a frame count keeps the cadence honest on weak GPUs, where the
      // whole loop may only get a handful of frames per second.
      if (now - lastReadout >= 200) {
        lastReadout = now;
        if (bearingRef.current) {
          const deg = lockedPoint
            ? ((((lockedPoint.angle * 180) / Math.PI) % 360) + 360) % 360
            : null;
          bearingRef.current.textContent =
            deg === null ? "---.-°" : `${deg.toFixed(1).padStart(5, "0")}°`;
        }
        if (frameCountRef.current) {
          frameCountRef.current.textContent = isTelemetryLive()
            ? `${telemetryFrameCount().toLocaleString()} F`
            : "SIMULATED";
        }
      }
    };

    paint();
    return () => cancelAnimationFrame(frameId);
  }, [roster]);

  // One-shot check so the header badge can say whether the 3D bus is up.
  useEffect(() => {
    const probe = setTimeout(() => setLinkLive(isTelemetryLive()), 700);
    return () => clearTimeout(probe);
  }, []);

  const handleContact = (sector) => {
    if (!sector.unlocked) {
      playSystemSound("ERROR");
      pushToast({
        title: "Clearance denied",
        body: `${sector.designation} requires prior mastery of ${sector.requires.id}.`,
        tone: "danger",
        voice: null
      });
      return;
    }

    if (selectedLanguage === sector.id) {
      setSelectedLanguage(null);
      playSystemSound("CLOSE");
      return;
    }

    setSelectedLanguage(sector.id);
    playSystemSound("LOCK");
    pushToast({
      title: `Gimbal locked // ${sector.designation}`,
      body: `${sector.name} — ${sector.classification}. Camera vector slaved to target.`,
      tone: "info",
      voice: null
    });
  };

  const handleDisengage = () => {
    setSelectedLanguage(null);
    playSystemSound("CLOSE");
  };

  const handleEngageTerminal = () => {
    if (!lockedSector) return;
    playSystemSound("WARP");
    // The new warp cinematic + arcade mission-select roadmap (wired up one
    // level above, in HudScreens) takes over from here when it's mounted;
    // falls back to the original direct jump if StarChart is ever used
    // without that hook.
    if (onEngageWarp) {
      onEngageWarp(lockedSector.id);
    } else {
      routeToScreen("ACADEMY", lockedSector.id);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4 font-mono text-cyan-400 animate-fade-in">
      {/* ══════════════════════════════════════════════════
          📡 PRIMARY RADAR DISH
         ══════════════════════════════════════════════════ */}
      <div className="flex-1 min-h-0 flex flex-col gap-3">
        <div className="flex items-start justify-between border-b border-slate-900 pb-2 shrink-0">
          <div>
            <h1 className="font-scope text-base font-semibold uppercase tracking-[0.15em] text-cyan-400 text-shadow-cyan flex items-center gap-2">
              <Radar className="w-4 h-4 animate-spin-slow" />
              Star Chart // Orbital Contact Plot
            </h1>
            <p className="text-[9px] text-slate-500 font-sans mt-0.5">
              Top-down projection of the local arm. Select a contact to slave the camera gimbal to it.
            </p>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-1 shrink-0 pl-3">
            <div className="text-[9px] bg-slate-950/60 border border-slate-900 px-2 py-1 rounded text-slate-400 flex items-center gap-1.5">
              <Radio className={`w-3 h-3 ${linkLive ? "text-emerald-400 animate-pulse" : "text-amber-500"}`} />
              {linkLive ? "WEBGL BUS LINKED" : "LOCAL SIM"}
            </div>
            <div className="text-[8px] text-slate-600 font-black tracking-widest uppercase">
              FRAMES: <span ref={frameCountRef} className="text-slate-400">--</span>
            </div>
          </div>
        </div>

        <div className="relative flex-1 min-h-[320px] rounded-md overflow-hidden bg-slate-950/25 backdrop-blur-md border border-cyan-500/20 shadow-[0_0_20px_rgba(0,240,255,0.05)]">
          {/* 🌌 The permanent cinematic galaxy background (mounted once at the
              root layout) now shows straight through this glass viewport —
              no local canvas needed here any more. */}
          <div className="absolute inset-0 bg-tactical-grid opacity-60 pointer-events-none" />
          <div className="absolute inset-0 bg-scanlines pointer-events-none opacity-[0.02] z-20" />

          <svg
            viewBox={`${-VIEW} ${-VIEW} ${VIEW * 2} ${VIEW * 2}`}
            className="absolute inset-0 w-full h-full"
            role="img"
            aria-label="Orbital radar plot of six language planets"
          >
            <defs>
              <radialGradient id="sc-sun" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="45%" stopColor="#fef08a" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </radialGradient>

              {/* Wider, softer corona behind the sun disc — Scope's own star
                  render leans hard on this outer bloom halo. */}
              <radialGradient id="sc-corona" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fef9c3" stopOpacity="0.4" />
                <stop offset="55%" stopColor="#fbbf24" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
              </radialGradient>

              <linearGradient id="sc-sweep" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
              </linearGradient>

              <radialGradient id="sc-vignette" cx="50%" cy="50%" r="50%">
                <stop offset="60%" stopColor="#020617" stopOpacity="0" />
                <stop offset="100%" stopColor="#020617" stopOpacity="0.85" />
              </radialGradient>

              <filter id="sc-glow" x="-70%" y="-70%" width="240%" height="240%">
                <feGaussianBlur stdDeviation="7" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Per-language planet body gradients — see PLANET_STYLE above */}
              <radialGradient id="pb-grad-emerald-debris" cx="35%" cy="32%" r="65%">
                <stop offset="0%" stopColor="#6ee7b7" />
                <stop offset="55%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#065f46" />
              </radialGradient>
              <radialGradient id="pb-grad-purple-electric" cx="35%" cy="32%" r="65%">
                <stop offset="0%" stopColor="#e9d5ff" />
                <stop offset="50%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#581c87" />
              </radialGradient>
              <radialGradient id="pb-grad-cyan-crystal" cx="35%" cy="32%" r="65%">
                <stop offset="0%" stopColor="#cffafe" />
                <stop offset="55%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#0e7490" />
              </radialGradient>
              <radialGradient id="pb-grad-gold-ringed" cx="35%" cy="32%" r="65%">
                <stop offset="0%" stopColor="#fef9c3" />
                <stop offset="50%" stopColor="#facc15" />
                <stop offset="100%" stopColor="#92400e" />
              </radialGradient>
              <radialGradient id="pb-grad-crimson-magma" cx="35%" cy="32%" r="65%">
                <stop offset="0%" stopColor="#fca5a5" />
                <stop offset="45%" stopColor="#dc2626" />
                <stop offset="100%" stopColor="#450a0a" />
              </radialGradient>
              <radialGradient id="pb-grad-azure-grid" cx="35%" cy="32%" r="65%">
                <stop offset="0%" stopColor="#e0f2fe" />
                <stop offset="55%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0c4a6e" />
              </radialGradient>
            </defs>

            {/* Dish backdrop — the WebGL galaxy sits directly behind this panel,
                so the plot needs its own ground to stay legible. */}
            <circle r={DISH_RADIUS} fill="rgba(2,6,23,0.55)" />

            {/* Dish boundary + graticule */}
            <circle r={DISH_RADIUS} fill="none" stroke="rgba(34,211,238,0.3)" strokeWidth="1.5" />
            <circle
              r={DISH_RADIUS - 12}
              fill="none"
              stroke="rgba(34,211,238,0.16)"
              strokeWidth="1"
              strokeDasharray="3 9"
            />
            {Array.from({ length: 24 }).map((_, i) => {
              const a = (i * Math.PI) / 12;
              const major = i % 6 === 0;
              const inner = DISH_RADIUS - (major ? 22 : 10);
              return (
                <line
                  key={`tick-${i}`}
                  x1={Math.cos(a) * inner}
                  y1={Math.sin(a) * inner}
                  x2={Math.cos(a) * DISH_RADIUS}
                  y2={Math.sin(a) * DISH_RADIUS}
                  stroke={major ? "rgba(34,211,238,0.6)" : "rgba(34,211,238,0.28)"}
                  strokeWidth={major ? 2 : 1}
                />
              );
            })}
            <line x1={-DISH_RADIUS} y1="0" x2={DISH_RADIUS} y2="0" stroke="rgba(34,211,238,0.13)" strokeWidth="1" />
            <line x1="0" y1={-DISH_RADIUS} x2="0" y2={DISH_RADIUS} stroke="rgba(34,211,238,0.13)" strokeWidth="1" />

            {BEARINGS.map((b) => (
              <text
                key={b.label}
                x={b.x}
                y={b.y}
                textAnchor="middle"
                fill="#94a3b8"
                style={{
                  fontSize: 19,
                  fontWeight: 900,
                  letterSpacing: 2,
                  paintOrder: "stroke",
                  stroke: "rgba(2,6,23,0.9)",
                  strokeWidth: 5
                }}
              >
                {b.label}
              </text>
            ))}

            {/* Orbit tracks, tinted per sector */}
            {roster.map((sector) => {
              const isActive = sector.id === selectedLanguage || sector.id === hovered;
              return (
                <g key={`orbit-${sector.id}`}>
                  <circle
                    r={sector.plot}
                    fill="none"
                    stroke={sector.unlocked ? sector.hex : "#64748b"}
                    strokeOpacity={isActive ? 0.7 : sector.unlocked ? 0.34 : 0.22}
                    strokeWidth={isActive ? 2 : 1}
                    strokeDasharray={sector.unlocked ? "1 7" : "4 8"}
                    style={{ transition: "stroke-opacity 240ms ease, stroke-width 240ms ease" }}
                  />
                  <text
                    x={Math.cos(RANGE_LABEL_ANGLE) * sector.plot + 8}
                    y={Math.sin(RANGE_LABEL_ANGLE) * sector.plot - 6}
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      letterSpacing: 1.4,
                      paintOrder: "stroke",
                      stroke: "rgba(2,6,23,0.85)",
                      strokeWidth: 4
                    }}
                    fill={isActive ? "#94a3b8" : "#64748b"}
                  >
                    {(sector.orbitRadius / 100).toFixed(2)} AU
                  </text>
                </g>
              );
            })}

            {/* Rotating sweep wedge */}
            <g className="radar-sweep">
              <path
                d={`M 0 0 L ${DISH_RADIUS} 0 A ${DISH_RADIUS} ${DISH_RADIUS} 0 0 0 ${
                  Math.cos(-Math.PI / 5) * DISH_RADIUS
                } ${Math.sin(-Math.PI / 5) * DISH_RADIUS} Z`}
                fill="url(#sc-sweep)"
              />
              <line x1="0" y1="0" x2={DISH_RADIUS} y2="0" stroke="rgba(34,211,238,0.5)" strokeWidth="2" />
            </g>

            {/* Gimbal link line from the sun to the locked contact */}
            <line
              ref={linkLineRef}
              x1="0"
              y1="0"
              x2="0"
              y2="0"
              stroke="rgba(34,211,238,0.45)"
              strokeWidth="1.5"
              strokeDasharray="7 6"
              style={{ opacity: 0, transition: "opacity 300ms ease" }}
            />

            {/* Local star — corona, disc, hot core, then a couple of faint
                off-axis lens-flare ghosts (a Scope screen-space signature). */}
            <circle r="130" fill="url(#sc-corona)" />
            <circle r="58" fill="url(#sc-sun)" />
            <circle r="15" fill="#fffbeb" filter="url(#sc-glow)" />
            <circle r="24" fill="none" stroke="rgba(254,240,138,0.35)" strokeWidth="1" />
            <circle cx="150" cy="-95" r="7" fill="#fef08a" opacity="0.1" />
            <circle cx="230" cy="-146" r="3.5" fill="#22d3ee" opacity="0.12" />
            <circle cx="-190" cy="121" r="10" fill="#fef08a" opacity="0.07" />

            {/* Lock reticle — position driven by the rAF loop */}
            <g ref={lockRef} style={{ opacity: 0, transition: "opacity 260ms ease" }} pointerEvents="none">
              <circle
                className="radar-ping"
                r="21"
                fill="none"
                stroke="rgba(34,211,238,0.8)"
                strokeWidth="2"
              />
              <g className="radar-reticle">
                {/* Target lock — the bracket set cross-fades cyan/red so the
                    locked contact reads as an actively tracked hostile-grade
                    target, not a static UI outline. Same bracket geometry,
                    two color groups alternating via the CSS keyframes. */}
                <g className="animate-reticle-flash-cyan">
                  {[
                    "M -26 -15 L -26 -26 L -15 -26",
                    "M 15 -26 L 26 -26 L 26 -15",
                    "M 26 15 L 26 26 L 15 26",
                    "M -15 26 L -26 26 L -26 15"
                  ].map((d) => (
                    <path key={d} d={d} fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="square" />
                  ))}
                </g>
                <g className="animate-reticle-flash-red">
                  {[
                    "M -26 -15 L -26 -26 L -15 -26",
                    "M 15 -26 L 26 -26 L 26 -15",
                    "M 26 15 L 26 26 L 15 26",
                    "M -15 26 L -26 26 L -26 15"
                  ].map((d) => (
                    <path key={d} d={d} fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="square" />
                  ))}
                </g>
              </g>
            </g>

            {/* Contacts */}
            {roster.map((sector) => {
              const isLocked = sector.id === selectedLanguage;
              const isHover = sector.id === hovered;
              const dash = (sector.mastery / 100) * RING_CIRCUMFERENCE;

              return (
                <g
                  key={sector.id}
                  ref={(el) => {
                    nodeRefs.current[sector.id] = el;
                  }}
                  style={{ cursor: "none" }}
                >
                  {/* Generous invisible hit target */}
                  <circle
                    r="34"
                    fill="transparent"
                    onClick={() => handleContact(sector)}
                    onMouseEnter={() => {
                      setHovered(sector.id);
                      if (sector.unlocked) playSystemSound("HOVER");
                    }}
                    onMouseLeave={() => setHovered(null)}
                    style={{ pointerEvents: "all" }}
                  />

                  {/* Mastery arc */}
                  <circle
                    r={PROGRESS_RING_R}
                    fill="none"
                    stroke="rgba(148,163,184,0.16)"
                    strokeWidth="3"
                    pointerEvents="none"
                  />
                  {sector.mastery > 0 && (
                    <circle
                      r={PROGRESS_RING_R}
                      fill="none"
                      stroke={sector.hex}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeDasharray={`${dash} ${RING_CIRCUMFERENCE}`}
                      transform="rotate(-90)"
                      pointerEvents="none"
                      style={{ transition: "stroke-dasharray 600ms cubic-bezier(0.16,1,0.3,1)" }}
                    />
                  )}

                  {/* Always-on targeting reticle — every unlocked contact gets a
                      small glowing box (the bigger 4-bracket reticle from lockRef
                      still takes over once this one is actually selected). */}
                  {sector.unlocked && !isLocked && (
                    <g opacity={isHover ? 0.85 : 0.4} pointerEvents="none" style={{ transition: "opacity 200ms ease" }}>
                      {(() => {
                        const rr = sector.dot + 11;
                        const c = 4;
                        return [
                          `M ${-rr} ${-rr + c} L ${-rr} ${-rr} L ${-rr + c} ${-rr}`,
                          `M ${rr - c} ${-rr} L ${rr} ${-rr} L ${rr} ${-rr + c}`,
                          `M ${rr} ${rr - c} L ${rr} ${rr} L ${rr - c} ${rr}`,
                          `M ${-rr + c} ${rr} L ${-rr} ${rr} L ${-rr} ${rr - c}`
                        ].map((d) => (
                          <path key={d} d={d} fill="none" stroke={sector.hex} strokeWidth="1.5" strokeLinecap="square" />
                        ));
                      })()}
                    </g>
                  )}

                  {/* Solar-matrix orbital rings — a purely decorative disc frame
                      spinning behind each unlocked body glyph, additive only:
                      the PlanetBody glyph beneath is untouched. */}
                  {sector.unlocked && (
                    <g pointerEvents="none" opacity={isHover || isLocked ? 0.85 : 0.5}>
                      <circle
                        className="animate-solar-disc"
                        r={sector.dot + 9}
                        fill="none"
                        stroke={sector.hex}
                        strokeWidth="1"
                        strokeDasharray="2 5"
                      />
                      <circle
                        className="animate-solar-disc-reverse"
                        r={sector.dot + 15}
                        fill="none"
                        stroke={sector.hex}
                        strokeOpacity="0.55"
                        strokeWidth="1"
                        strokeDasharray="1 9"
                      />
                    </g>
                  )}

                  {/* Screen-adaptive per-language body glyph (see PLANET_STYLE) */}
                  <g
                    filter={sector.unlocked && (isHover || isLocked) ? "url(#sc-glow)" : undefined}
                    pointerEvents="none"
                    style={{ transform: isHover || isLocked ? "scale(1.12)" : "scale(1)", transformOrigin: "0 0", transition: "transform 200ms ease" }}
                  >
                    <PlanetBody sectorId={sector.id} dot={sector.dot} unlocked={sector.unlocked} />
                  </g>

                  {!sector.unlocked && (
                    <text
                      y="5"
                      textAnchor="middle"
                      className="fill-slate-600"
                      style={{ fontSize: 14, fontWeight: 900 }}
                      pointerEvents="none"
                    >
                      ✕
                    </text>
                  )}

                  {/* Designation tag */}
                  <text
                    y={PROGRESS_RING_R + 21}
                    textAnchor="middle"
                    style={{
                      fontSize: 16,
                      fontWeight: 900,
                      letterSpacing: 1.5,
                      paintOrder: "stroke",
                      stroke: "rgba(2,6,23,0.9)",
                      strokeWidth: 5
                    }}
                    fill={isLocked ? "#22d3ee" : sector.unlocked ? "#cbd5e1" : "#475569"}
                    pointerEvents="none"
                  >
                    {sector.designation}
                  </text>

                  {/* Status indicator label — total pilot mastery for this sector */}
                  <text
                    y={PROGRESS_RING_R + 35}
                    textAnchor="middle"
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 1,
                      paintOrder: "stroke",
                      stroke: "rgba(2,6,23,0.85)",
                      strokeWidth: 4
                    }}
                    fill={sector.unlocked ? sector.hex : "#475569"}
                    pointerEvents="none"
                  >
                    {sector.unlocked ? `${sector.mastery}% MASTERY` : "LOCKED"}
                  </text>
                </g>
              );
            })}

            <circle r={DISH_RADIUS} fill="url(#sc-vignette)" pointerEvents="none" />
          </svg>

          {/* Floating inspector card over the dish */}
          <div className="absolute left-3 bottom-3 z-30 pointer-events-none max-w-[62%]">
            {inspected ? (
              <div className="bg-slate-950/85 backdrop-blur-md border border-cyan-500/25 rounded p-2.5 shadow-2xl animate-fade-in">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: inspected.hex, boxShadow: `0 0 8px ${inspected.hex}` }}
                  />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-100">
                    {inspected.name}
                  </span>
                  <span className="text-[8px] text-slate-500 font-black uppercase">{inspected.designation}</span>
                </div>
                <div className="text-[9px] text-slate-500 font-black uppercase tracking-wider mt-1">
                  {inspected.classification} // {inspected.tier}
                </div>
                <p className="text-[10px] text-slate-400 font-sans leading-snug mt-1">
                  {inspected.unlocked
                    ? inspected.description
                    : `Sealed. Requires level ${inspected.requires.level} clearance on ${inspected.requires.id}.`}
                </p>
              </div>
            ) : (
              <div className="text-[9px] text-slate-600 font-black uppercase tracking-widest">
                Sweep active // hover a contact for its manifest
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          📋 TELEMETRY COLUMN
         ══════════════════════════════════════════════════ */}
      <div className="w-full lg:w-72 shrink-0 flex flex-col gap-3 min-h-0">
        {/* Fleet summary */}
        <div className="scope-frame scope-frame-sm p-3 pt-4 bg-slate-950/25 backdrop-blur-md border border-cyan-500/20 shadow-[0_0_20px_rgba(0,240,255,0.05)] space-y-2 shrink-0">
          <div className="font-scope text-[10px] text-slate-500 font-semibold uppercase tracking-widest border-b border-slate-900 pb-1 flex items-center justify-between">
            <span>Fleet Survey Index</span>
            <Gauge className="w-3 h-3" />
          </div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-black text-slate-100 leading-none tracking-tight">{fleet}%</div>
            <div className="text-[9px] text-slate-500 font-black uppercase text-right leading-tight">
              {contactsUnlocked}/{roster.length}
              <br />
              contacts open
            </div>
          </div>
          <div className="w-full h-1.5 bg-slate-900 rounded-xs overflow-hidden border border-slate-800/60 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-xs transition-all duration-700"
              style={{ width: `${fleet}%` }}
            />
          </div>
        </div>

        {/* Locked target readout */}
        <div
          className={`scope-frame scope-frame-sm p-3 pt-4 border space-y-2 shrink-0 transition-colors duration-300 ${
            lockedSector
              ? "border-cyan-500/40 bg-cyan-950/10 scope-glow"
              : "border-slate-800/60 bg-slate-950/40 bg-hazard"
          }`}
        >
          <div className="font-scope text-[10px] text-slate-500 font-semibold uppercase tracking-widest border-b border-slate-900 pb-1 flex items-center justify-between">
            <span>Gimbal Lock Status</span>
            <Crosshair className={`w-3 h-3 ${lockedSector ? "text-cyan-400 animate-spin-slow" : ""}`} />
          </div>

          {lockedSector ? (
            <>
              <div>
                <div className="font-scope text-[13px] font-semibold uppercase text-slate-100 tracking-wide">
                  {lockedSector.name}
                </div>
                <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: lockedSector.hex }}>
                  {lockedSector.designation} // {lockedSector.classification}
                </div>
              </div>

              <dl className="text-[10px] space-y-1 pt-1">
                <div className="flex justify-between">
                  <dt className="text-slate-500 uppercase tracking-wide">Bearing</dt>
                  <dd ref={bearingRef} className="text-cyan-400 font-bold tabular-nums">---.-°</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500 uppercase tracking-wide">Orbit radius</dt>
                  <dd className="text-slate-300 font-bold tabular-nums">
                    {(lockedSector.orbitRadius / 100).toFixed(2)} AU
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500 uppercase tracking-wide">Angular vel.</dt>
                  <dd className="text-slate-300 font-bold tabular-nums">
                    {(lockedSector.orbitSpeed * 1000).toFixed(2)} °/cyc
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500 uppercase tracking-wide">Mastery</dt>
                  <dd className="text-slate-300 font-bold tabular-nums">{lockedSector.mastery}%</dd>
                </div>
              </dl>

              <div className="flex gap-1.5 pt-1.5">
                <button
                  onClick={handleEngageTerminal}
                  onMouseEnter={() => playSystemSound("HOVER")}
                  className="scope-btn scope-frame scope-frame-sm flex-1 flex items-center justify-center gap-1.5 py-1.5 font-scope text-[10px] font-semibold uppercase tracking-widest border border-cyan-500/40 bg-cyan-950/30 text-cyan-400 hover:bg-cyan-400 hover:text-black hover:border-cyan-400 active:scale-[0.98] transition-all cursor-none"
                >
                  <Terminal className="w-2.5 h-2.5" /> Engage Terminal
                </button>
                <button
                  onClick={handleDisengage}
                  aria-label="Disengage gimbal lock"
                  className="scope-frame scope-frame-sm px-2 py-1.5 border border-slate-800 bg-slate-900/40 text-slate-500 hover:text-rose-400 hover:border-rose-500/40 transition-colors cursor-none"
                >
                  <Unlink className="w-3 h-3" />
                </button>
              </div>
            </>
          ) : (
            <p className="text-[10px] text-slate-500 font-sans leading-snug py-1">
              No target locked. Select a contact on the plot to slave the camera gimbal and open its
              flight syllabus.
            </p>
          )}
        </div>

        {/* Contact roster */}
        <div className="scope-frame scope-frame-sm flex-1 min-h-0 bg-slate-950/25 backdrop-blur-md border border-cyan-500/20 shadow-[0_0_20px_rgba(0,240,255,0.05)] flex flex-col overflow-hidden">
          <div className="px-3 py-1.5 pt-2.5 font-scope text-[10px] text-slate-500 font-semibold uppercase tracking-widest border-b border-slate-900 bg-slate-900/30 shrink-0">
            Contact Roster // {roster.length} Bodies
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-900/70">
            {roster.map((sector) => {
              const isLocked = sector.id === selectedLanguage;
              return (
                <button
                  key={sector.id}
                  onClick={() => handleContact(sector)}
                  onMouseEnter={() => {
                    setHovered(sector.id);
                    if (sector.unlocked) playSystemSound("HOVER");
                  }}
                  onMouseLeave={() => setHovered(null)}
                  aria-pressed={isLocked}
                  className={`w-full text-left px-3 py-2 transition-colors duration-200 cursor-none ${
                    isLocked
                      ? "bg-cyan-950/25"
                      : sector.unlocked
                        ? "hover:bg-slate-900/40"
                        : "opacity-45 bg-hazard"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{
                        background: sector.unlocked ? sector.hex : "#334155",
                        boxShadow: sector.unlocked ? `0 0 6px ${sector.hex}` : "none"
                      }}
                    />
                    <span
                      className={`text-[10px] font-black uppercase tracking-wide truncate flex-1 ${
                        isLocked ? "text-cyan-400" : "text-slate-300"
                      }`}
                    >
                      {sector.name}
                    </span>
                    {sector.unlocked ? (
                      <span className="text-[9px] text-slate-500 font-bold tabular-nums shrink-0">
                        {sector.mastery}%
                      </span>
                    ) : (
                      <Lock className="w-2.5 h-2.5 text-slate-600 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 pl-3.5">
                    <span className="text-[8px] text-slate-600 font-black uppercase tracking-wider shrink-0 w-10">
                      {sector.designation}
                    </span>
                    <div className="flex-1 h-1 bg-slate-900 rounded-xs overflow-hidden">
                      <div
                        className={`h-full rounded-xs transition-all duration-500 ${sector.tailwind.bar}`}
                        style={{ width: `${sector.mastery}%` }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
