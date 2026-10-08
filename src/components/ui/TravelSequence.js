"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { usePilot } from "../../context/PilotContext";
import { findSector } from "../../lib/planetarySystem";
import { FastForward } from "lucide-react";
import TypedLines from "./TypedText";
import AtmosphericEntry from "./AtmosphericEntry";
import Button from "./Button";

// Each phase lasts at least this long (so the 3D flight never gets cut short)
// and until its typed narration has finished, whichever is later.
const MIN_MS = { BOARDING: 1100, WARP: 2400, LANDING: 1400, SURFACE: 1500 };
const PHASE_ORDER = ["BOARDING", "WARP", "LANDING", "SURFACE"];
const SEEN_KEY = "HUD_TRAVEL_SEEN";

// First flight tells the whole story; after that each phase is a single short
// line so repeat lessons don't make the pilot sit through it again.
function narrationFor(phase, sectorName, callsign, seen) {
  const who = callsign || "pilot";
  const full = {
    BOARDING: [`Welcome aboard, ${who}.`, "Flight systems online."],
    WARP: [`Course locked for ${sectorName}.`, "Hyperspace engaged. Stay with the stars."],
    LANDING: ["Entering the atmosphere.", "Brace for touchdown."],
    SURFACE: [`Touchdown on ${sectorName}.`, "Opening your terminal."]
  };
  const short = {
    BOARDING: ["Systems online."],
    WARP: [`Jumping to ${sectorName}.`],
    LANDING: ["Entering the atmosphere."],
    SURFACE: ["Touchdown. Opening terminal."]
  };
  return (seen ? short : full)[phase] || [];
}

/**
 * 🚀 TRAVEL SEQUENCE — boarding → warp through the stars → atmosphere →
 * touchdown on the planet's surface, then the editor opens. It plays out on
 * the real 3D viewport (see the hyperspace streak field in SpaceWindshield);
 * this overlay adds a small typed narration with key-switch sounds, a
 * corner skip control (also the S key) and a 4-dot progress read.
 */
export default function TravelSequence() {
  const { travelSequence, advanceTravelPhase, completeTravelSequence, setSelectedLanguage, setWarpSpeed, playSystemSound, pilotCallsign } = usePilot();
  const { active, phase, destination } = travelSequence;
  const sector = destination ? findSector(destination) : null;
  // Gates are keyed by phase name, so a stale "done" from the previous phase
  // can never advance the next one.
  const [minFor, setMinFor] = useState(null);
  const [doneFor, setDoneFor] = useState(null);

  // Has this pilot flown before? Read once when a flight starts.
  const seen = useMemo(() => {
    if (!active) return false;
    try {
      return localStorage.getItem(SEEN_KEY) === "1";
    } catch {
      return false; // private mode: just play the full version
    }
  }, [active]);

  // Each phase starts its minimum-length timer; between flights the gates clear.
  useEffect(() => {
    if (!active) {
      setMinFor(null);
      setDoneFor(null);
      return undefined;
    }
    const t = setTimeout(() => setMinFor(phase), MIN_MS[phase] || 1000);
    return () => clearTimeout(t);
  }, [active, phase]);

  const ready = active && minFor === phase && doneFor === phase;

  const finish = useCallback(() => {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
    setWarpSpeed(1);
    completeTravelSequence();
  }, [completeTravelSequence, setWarpSpeed]);

  // Move on once the phase has run its minimum time AND finished typing.
  useEffect(() => {
    if (!ready) return;
    if (phase === "BOARDING") {
      // The camera only starts flying once the pilot is "seated" —
      // locking the target here is what makes SpaceWindshield begin its
      // long, slow approach (see landingSequence in that file).
      setSelectedLanguage(destination);
      setWarpSpeed(9);
      playSystemSound("LOCK");
      advanceTravelPhase("WARP");
    } else if (phase === "WARP") {
      setWarpSpeed(2);
      advanceTravelPhase("LANDING");
    } else if (phase === "LANDING") {
      playSystemSound("WARP");
      advanceTravelPhase("SURFACE");
    } else if (phase === "SURFACE") {
      playSystemSound("SUCCESS");
      finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, phase]);

  const skip = useCallback(() => {
    playSystemSound("CLOSE");
    finish();
  }, [finish, playSystemSound]);

  // Press S to skip, same as the corner button.
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => {
      if ((e.key === "s" || e.key === "S") && !e.ctrlKey && !e.metaKey && !e.altKey) skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, skip]);

  if (!active || !sector) return null;

  const lines = narrationFor(phase, sector.name, pilotCallsign, seen);
  const phaseIndex = PHASE_ORDER.indexOf(phase);

  return (
    <div className="absolute inset-0 z-[120] pointer-events-auto">
      {/* Touchdown: the friction-blast arrival plays over the final phase */}
      {phase === "SURFACE" && <AtmosphericEntry />}

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

      {/* Typed narration — sits low on the view, over the stars */}
      <div className="absolute inset-x-0 bottom-24 z-50 flex justify-center px-4 pointer-events-none">
        <div className="hud-panel max-w-xl w-full px-6 py-4 text-center font-display text-sm sm:text-base tracking-[0.12em] text-cyan-100 leading-relaxed" aria-live="polite">
          <TypedLines key={phase} lines={lines} onDone={() => setDoneFor(phase)} />
        </div>
      </div>

      {/* Skip — corner-parked, with the key hint */}
      <div className="absolute top-5 right-5 z-50 flex items-center gap-3">
        <span className="hidden sm:inline text-[10px] tracking-[0.2em] uppercase text-slate-400/80">
          Press <kbd className="px-1.5 py-0.5 rounded border border-white/20 bg-black/30 text-slate-200">S</kbd> to skip
        </span>
        <Button
          iconOnly
          variant="ghost"
          icon={FastForward}
          onClick={skip}
          aria-label="Skip travel sequence"
          title="Skip (S)"
        />
      </div>

      {/* Progress — four small dots, no label */}
      <div className="absolute bottom-8 inset-x-0 z-50 flex justify-center gap-2">
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
