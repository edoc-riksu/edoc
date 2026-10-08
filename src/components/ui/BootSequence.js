"use client";
import React, { useEffect, useRef, useState } from "react";
import { usePilot } from "../../context/PilotContext";
import { Rocket, ChevronsRight } from "lucide-react";
import { TypedText } from "./TypedText";

/**
 * 🚀 CANOPY POWER-ON SEQUENCE
 * -------------------------------------------------------------
 * Masks the cold start of the 65k-star WebGL scene behind a
 * diagnostics readout, then retracts two canopy shutters.
 *
 * Runs once per browser tab (sessionStorage) so client-side route
 * changes never replay it. Any key or click skips straight to the
 * iris retraction.
 *
 * Each diagnostic line is typed out one character at a time, with a
 * key-switch tick for every letter (see TypedText). A line finishes
 * typing, its status lands, then the next line starts.
 */

const DIAGNOSTIC_LINES = [
  { label: "Mounting avionics kernel", detail: "OK" },
  { label: "Calibrating reticle vector matrix", detail: "OK" },
  { label: "Spooling 65,000 star luminance buffers", detail: "OK" },
  { label: "Linking orbital telemetry bus", detail: "LIVE" },
  { label: "Arming polyphonic audio bus", detail: "READY" },
  { label: "Pressurising cockpit canopy", detail: "SEALED" },
  { label: "Handshake with Orion arm node 4", detail: "ACK" }
];

const STORAGE_KEY = "HUD_BOOT_SEQUENCE_DONE";
// Key-switch voice is throttled to 18ms, so stay above that for a tick per letter.
const TYPE_MS = 22;
const LINE_PAUSE = 180;

export default function BootSequence() {
  const { completeBoot, playSystemSound } = usePilot();

  // `null` = undecided during hydration, so nothing renders on the server pass.
  const [phase, setPhase] = useState(null);
  const [lineIndex, setLineIndex] = useState(0);
  const finished = useRef(false);

  const finish = useRef(() => {});
  finish.current = () => {
    if (finished.current) return;
    finished.current = true;
    try {
      sessionStorage.setItem(STORAGE_KEY, "true");
    } catch {
      /* Private-mode storage refusals must not strand the canopy shut. */
    }
    setPhase("iris");
    playSystemSound("BOOT");
    window.setTimeout(() => {
      setPhase("done");
      completeBoot();
    }, 1000);
  };

  // Decide whether this tab has already booted.
  useEffect(() => {
    let alreadyBooted = false;
    try {
      alreadyBooted = sessionStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      alreadyBooted = false;
    }
    if (alreadyBooted) {
      finished.current = true;
      setPhase("done");
      completeBoot();
    } else {
      setPhase("running");
    }
  }, [completeBoot]);

  // Once every line has typed, hold a beat and open the canopy.
  useEffect(() => {
    if (phase !== "running" || lineIndex < DIAGNOSTIC_LINES.length) return undefined;
    const hold = window.setTimeout(() => finish.current(), 420);
    return () => window.clearTimeout(hold);
  }, [phase, lineIndex]);

  // The line being typed calls this when its last letter lands.
  const lineTimer = useRef(null);
  const onLineTyped = () => {
    window.clearTimeout(lineTimer.current);
    lineTimer.current = window.setTimeout(() => setLineIndex((i) => i + 1), LINE_PAUSE);
  };
  useEffect(() => () => window.clearTimeout(lineTimer.current), []);

  // Any input skips ahead.
  useEffect(() => {
    if (phase !== "running") return undefined;
    const skip = () => finish.current();
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => {
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, [phase]);

  if (phase === null || phase === "done") return null;

  const progress = Math.round((Math.min(lineIndex, DIAGNOSTIC_LINES.length) / DIAGNOSTIC_LINES.length) * 100);
  const retracting = phase === "iris";

  return (
    <div
      className="fixed inset-0 z-[150] overflow-hidden font-mono"
      role="status"
      aria-live="polite"
      aria-label="Cockpit power-on sequence"
    >
      {/* ── Upper canopy shutter ── */}
      <div
        className={`absolute inset-x-0 top-0 h-1/2 bg-[#020617] border-b border-cyan-500/20 ${
          retracting ? "animate-iris-up" : ""
        }`}
      >
        <div className="absolute inset-0 bg-tactical-grid opacity-40" />
        <div className="absolute inset-0 bg-scanlines opacity-[0.04]" />
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-6 text-center">
          <Rocket className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
          <div className="font-scope text-sm font-semibold uppercase tracking-[0.3em] text-slate-100">
            edoc
          </div>
          <div className="font-scope text-[9px] font-semibold uppercase tracking-[0.25em] text-cyan-500/60 mt-1">
            Avionics cold-start // Orion arm node 4
          </div>
        </div>
      </div>

      {/* ── Lower canopy shutter ── */}
      <div
        className={`absolute inset-x-0 bottom-0 h-1/2 bg-[#020617] border-t border-cyan-500/20 ${
          retracting ? "animate-iris-down" : ""
        }`}
      >
        <div className="absolute inset-0 bg-tactical-grid opacity-40" />
        <div className="absolute inset-0 bg-scanlines opacity-[0.04]" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

        <div className="absolute top-7 left-1/2 -translate-x-1/2 w-full max-w-md px-6">
          {/* Diagnostics readout */}
          <div className="h-[132px] overflow-hidden space-y-1">
            {DIAGNOSTIC_LINES.slice(0, lineIndex).map((line, i) => (
              <div
                key={line.label}
                className="flex items-baseline gap-2 text-[10px] animate-fade-in"
                style={{ animationDelay: `${i * 12}ms` }}
              >
                <ChevronsRight className="w-2.5 h-2.5 text-cyan-500/70 shrink-0 translate-y-px" />
                <span className="text-slate-400 truncate">{line.label}</span>
                <span className="flex-1 border-b border-dotted border-slate-800 translate-y-[-3px]" />
                <span className="text-emerald-400 font-black shrink-0">{line.detail}</span>
              </div>
            ))}
            {lineIndex < DIAGNOSTIC_LINES.length && (
              <div className="flex items-center gap-2 text-[10px] text-cyan-400">
                <ChevronsRight className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">
                  <TypedText key={lineIndex} text={DIAGNOSTIC_LINES[lineIndex].label} speed={TYPE_MS} onDone={onLineTyped} />
                </span>
              </div>
            )}
          </div>

          {/* Load bar */}
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between font-scope text-[10px] font-semibold uppercase tracking-widest text-slate-600">
              <span>Systems Integrity</span>
              <span className="text-cyan-400 tabular-nums">{progress}%</span>
            </div>
            <div className="h-1 w-full bg-slate-900 rounded-xs overflow-hidden border border-slate-800/60">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-[width] duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-center text-[8px] font-black uppercase tracking-[0.25em] text-slate-700 pt-2">
              Press any key to skip pre-flight
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
