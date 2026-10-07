"use client";
import React, { useState, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ShieldAlert, Zap } from "lucide-react";

/**
 * 🚪 AIRLOCK GATES
 * -------------------------------------------------------------
 * Sits between the boot diagnostics readout and the live cockpit:
 * four titanium blast-door quadrants, meeting dead-center, gated
 * behind an explicit "ACTIVATE DRIVES" press (never an auto-skip —
 * this is the moment the pilot commits). On click, each quadrant is
 * flung outward toward its own viewport corner on a snappy cubic-
 * bezier, a single white lens-flare washes the screen, and once the
 * motion settles `onOpened()` hands control back to BootSequence.
 *
 * Pure presentation/animation state — no routing, no PilotContext,
 * no app logic. `onOpened` is the only thing this talks to outside
 * itself.
 */

const SNAP = [0.85, 0, 0.15, 1]; // snappy, mechanical — not an ease a human hand would draw
const PANEL_DURATION = 0.72;

const QUADRANTS = [
  { id: "tl", edge: "top-0 left-0", seam: "right-0 bottom-0", corner: { x: "-100%", y: "-100%" }, delay: 0 },
  { id: "tr", edge: "top-0 right-0", seam: "left-0 bottom-0", corner: { x: "100%", y: "-100%" }, delay: 0.03 },
  { id: "bl", edge: "bottom-0 left-0", seam: "right-0 top-0", corner: { x: "-100%", y: "100%" }, delay: 0.03 },
  { id: "br", edge: "bottom-0 right-0", seam: "left-0 top-0", corner: { x: "100%", y: "100%" }, delay: 0.06 }
];

export default function AirlockGates({ onOpened }) {
  const [opening, setOpening] = useState(false);
  const settleTimer = useRef(null);
  const reduceMotion = useReducedMotion();

  const activate = () => {
    if (opening) return;
    setOpening(true);
    const total = reduceMotion ? 60 : (PANEL_DURATION + 0.06) * 1000 + 80;
    settleTimer.current = window.setTimeout(() => onOpened(), total);
  };

  return (
    <div className="fixed inset-0 z-[150] overflow-hidden bg-black" role="dialog" aria-label="Reactor airlock — activation required">
      {/* Blast-door quadrant grid — pure Tailwind grid, each cell one titanium leaf */}
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
        {QUADRANTS.map((q) => (
          <motion.div
            key={q.id}
            className="relative overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, #1e293b 0%, #0f172a 38%, #1e293b 55%, #020617 100%)",
              boxShadow: "inset 0 0 60px rgba(0,0,0,0.65)"
            }}
            initial={{ x: 0, y: 0 }}
            animate={opening ? { x: q.corner.x, y: q.corner.y } : { x: 0, y: 0 }}
            transition={{ duration: reduceMotion ? 0.05 : PANEL_DURATION, delay: reduceMotion ? 0 : q.delay, ease: SNAP }}
          >
            {/* Brushed-metal streaks */}
            <div
              className="absolute inset-0 opacity-40 mix-blend-overlay"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(115deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 5px)"
              }}
            />
            {/* Rivets along the outer edges */}
            <div className="absolute inset-3 border border-slate-700/50" />
            <div
              className="absolute inset-3 opacity-60"
              style={{
                backgroundImage:
                  "radial-gradient(circle, rgba(148,163,184,0.35) 1px, transparent 1.4px)",
                backgroundSize: "22px 22px",
                backgroundPosition: "0 0"
              }}
            />
            {/* Neon cyan seam accent — the edge facing the center cross */}
            <div className={`absolute ${q.seam} ${q.id.includes("t") || q.id.includes("b") ? "" : ""}`}>
              {(q.id === "tl" || q.id === "tr") && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-400 shadow-[0_0_12px_2px_rgba(34,211,238,0.85)]" />
              )}
              {(q.id === "tl" || q.id === "bl") && (
                <div className="absolute top-0 bottom-0 right-0 w-[2px] bg-cyan-400 shadow-[0_0_12px_2px_rgba(34,211,238,0.85)]" />
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Amber hazard frame — pulses while awaiting activation, freezes once opening */}
      <div
        className={`pointer-events-none absolute inset-6 border-2 border-amber-500/70 ${opening ? "" : "animate-gate-warn"}`}
        style={{ clipPath: "polygon(24px 0,100% 0,100% calc(100% - 24px),calc(100% - 24px) 100%,0 100%,0 24px)" }}
      />

      {/* Center console — the only interactive surface */}
      {!opening && (
        <div className="absolute inset-0 flex items-center justify-center px-6">
          <div className="scope-frame scope-glow-lg bg-slate-950/90 border border-cyan-500/40 px-8 py-7 sm:px-12 sm:py-9 flex flex-col items-center gap-4 text-center max-w-sm animate-fade-in">
            <ShieldAlert className="w-7 h-7 text-amber-400 animate-breathe" />
            <div className="space-y-1">
              <div className="font-scope text-xs sm:text-sm font-bold uppercase tracking-[0.3em] text-slate-100">
                SYS DETECTED
              </div>
              <div className="font-scope text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400/90">
                Reactor drives idle // awaiting pilot command
              </div>
            </div>
            <button
              onClick={activate}
              className="scope-btn scope-frame scope-frame-sm flex items-center gap-2 px-5 py-2.5 bg-cyan-950/40 border border-cyan-500/60 font-scope text-[11px] sm:text-xs font-bold tracking-[0.2em] uppercase text-cyan-300 hover:bg-cyan-900/50 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              Activate Drives
            </button>
          </div>
        </div>
      )}

      {/* White lens-flare flash — pure CSS/Framer, washes out as the gates clear */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(circle at 50% 50%, #ffffff 0%, rgba(255,255,255,0.4) 28%, transparent 68%)",
          mixBlendMode: "screen"
        }}
        initial={{ opacity: 0 }}
        animate={opening ? { opacity: reduceMotion ? 0 : [0, 1, 0] } : { opacity: 0 }}
        transition={{ duration: 0.55, times: [0, 0.32, 1], delay: 0.1, ease: "easeOut" }}
      />
    </div>
  );
}
