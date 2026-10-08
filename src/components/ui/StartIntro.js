"use client";
import React, { useCallback, useEffect, useRef } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { usePilot } from "../../context/PilotContext";
import TypedLines from "./TypedText";

const LINES = [
  "Welcome to edoc.",
  "A galaxy of code is waiting for you.",
  "Let's fly."
];

/**
 * ⌨️ START INTRO — the black screen after pressing Start. A few sentences
 * type out one letter at a time, every letter with a keystroke sound, then
 * onDone fires and the pilot is taken to the cockpit. S, Enter or Escape
 * skips. The sound button is here because browsers only play audio after a
 * first interaction, and some pilots keep the cockpit muted.
 */
export default function StartIntro({ onDone }) {
  const { soundEnabled, toggleSound, playSystemSound } = usePilot();
  const finished = useRef(false);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onDone();
  }, [onDone]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "s" || e.key === "S" || e.key === "Enter" || e.key === "Escape") {
        playSystemSound("CLOSE");
        finish();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finish, playSystemSound]);

  return (
    <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center px-6" role="dialog" aria-modal="true" aria-label="Welcome to edoc">
      <div className="absolute top-5 right-6 text-[11px] tracking-[0.2em] uppercase text-slate-400">
        Press <kbd className="px-1.5 py-0.5 rounded border border-white/25 bg-white/10 text-slate-100">S</kbd> to skip
      </div>

      <TypedLines
        lines={LINES}
        speed={52}
        linePause={450}
        onDone={() => setTimeout(finish, 800)}
        className="max-w-2xl text-center font-display text-lg sm:text-2xl leading-relaxed tracking-[0.08em] text-slate-100 space-y-3"
      />

      <button
        onClick={toggleSound}
        aria-label={soundEnabled ? "Mute sound" : "Turn sound on"}
        aria-pressed={soundEnabled}
        className="absolute bottom-6 right-6 w-10 h-10 rounded-md flex items-center justify-center border border-cyan-400/40 bg-slate-900/70 text-cyan-300 hover:bg-cyan-400/20 transition cursor-pointer"
      >
        {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
      </button>
    </div>
  );
}
