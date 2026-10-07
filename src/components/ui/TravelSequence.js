"use client";
import React, { useEffect, useRef } from "react";
import { usePilot } from "../../context/PilotContext";
import { findSector } from "../../lib/planetarySystem";
import { FastForward } from "lucide-react";

const BOARDING_MS = 1100;
const WARP_MS = 2400;
const LANDING_MS = 1100;
const PHASE_ORDER = ["BOARDING", "WARP", "LANDING"];

/**
 * 🚀 TRAVEL SEQUENCE — boarding → warp-flight → landing, played out on the
 * real 3D viewport (see the hyperspace streak field in SpaceWindshield).
 * This overlay stays out of the way on purpose: no copy, no cards — just
 * a minimal targeting reticle, a tiny corner skip control, and a 3-dot
 * progress read, the way Solar System Scope keeps its own chrome to a
 * handful of small icon buttons and lets the view itself do the talking.
 */
export default function TravelSequence() {
  const { travelSequence, advanceTravelPhase, completeTravelSequence, setSelectedLanguage, setWarpSpeed, playSystemSound } = usePilot();
  const { active, phase, destination } = travelSequence;
  const sector = destination ? findSector(destination) : null;

  useEffect(() => {
    if (!active) return undefined;

    if (phase === "BOARDING") {
      const t = setTimeout(() => {
        // The camera only starts flying once the pilot is "seated" —
        // locking the target here is what makes SpaceWindshield begin its
        // long, slow approach (see landingSequence in that file).
        setSelectedLanguage(destination);
        setWarpSpeed(9);
        playSystemSound("LOCK");
        advanceTravelPhase("WARP");
      }, BOARDING_MS);
      return () => clearTimeout(t);
    }

    if (phase === "WARP") {
      const t = setTimeout(() => {
        setWarpSpeed(2);
        advanceTravelPhase("LANDING");
      }, WARP_MS);
      return () => clearTimeout(t);
    }

    if (phase === "LANDING") {
      const t = setTimeout(() => {
        setWarpSpeed(1);
        playSystemSound("SUCCESS");
        completeTravelSequence();
      }, LANDING_MS);
      return () => clearTimeout(t);
    }

    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, phase, destination]);

  if (!active || !sector) return null;

  const skip = () => {
    playSystemSound("CLOSE");
    completeTravelSequence();
  };

  const phaseIndex = PHASE_ORDER.indexOf(phase);

  return (
    <div className="absolute inset-0 z-[120] pointer-events-auto">
      {/* Screen-reader-only status — the visible UI is icons and shapes only */}
      <span className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0 [clip:rect(0,0,0,0)]" aria-live="polite">
        {phase === "BOARDING" && `Boarding, departing for ${sector.name}`}
        {phase === "WARP" && `In transit to ${sector.name}`}
        {phase === "LANDING" && `Landing at ${sector.name}`}
      </span>

      {/* A faint edge feather so the corner controls stay legible — never a wash over the view */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/25" />

      {/* Minimal targeting reticle — locks on once thrusters engage, tightens on final approach */}
      {(phase === "WARP" || phase === "LANDING") && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`rounded-full border transition-all duration-[900ms] ease-out ${
              phase === "LANDING" ? "w-10 h-10 border-emerald-400/80" : "w-20 h-20 border-cyan-300/40 animate-breathe"
            }`}
          >
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${phase === "LANDING" ? "w-1.5 h-1.5 bg-emerald-400" : "w-1 h-1 bg-cyan-300/70"}`} />
          </div>
        </div>
      )}

      {/* Skip — a single small icon button, corner-parked like Scope's own controls */}
      <button
        onClick={skip}
        aria-label="Skip travel sequence"
        title="Skip"
        className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center border border-white/15 bg-black/30 backdrop-blur-sm text-slate-300/80 hover:text-cyan-300 hover:border-cyan-400/50 transition-all cursor-pointer"
      >
        <FastForward className="w-3.5 h-3.5" />
      </button>

      {/* Progress — three small dots, no label */}
      <div className="absolute bottom-8 inset-x-0 flex justify-center gap-2">
        {PHASE_ORDER.map((ph, idx) => (
          <span
            key={ph}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
              idx === phaseIndex ? "bg-cyan-300 scale-125" : idx < phaseIndex ? "bg-cyan-300/45" : "bg-white/20"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
