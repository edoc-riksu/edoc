"use client";
import React from "react";
import BootSequence from "./BootSequence";
import CommandPalette from "./CommandPalette";
import ToastStack from "./ToastStack";
import { usePilot } from "../../context/PilotContext";
import { Command } from "lucide-react";

/**
 * 🧰 SYSTEM CHROME
 * The persistent canopy overlay layer: power-on sequence, command
 * palette, alert stack and the palette affordance chip. Mounted once
 * from the root layout so every route inherits it.
 */
export default function SystemChrome() {
  const { togglePalette, bootComplete, paletteOpen } = usePilot();

  return (
    <>
      <BootSequence />
      <CommandPalette />
      <ToastStack />

      {/* Palette affordance — hidden while booting or while the palette is open */}
      {bootComplete && !paletteOpen && (
        <button
          onClick={togglePalette}
          aria-label="Open command palette"
          className="scope-btn scope-frame scope-frame-sm hidden md:flex fixed bottom-4 left-4 z-[110] items-center gap-1.5 px-2.5 py-1.5 border border-slate-800/80 bg-slate-950/70 backdrop-blur-md font-scope text-[10px] font-semibold uppercase tracking-widest text-slate-500 hover:text-cyan-400 hover:border-cyan-500/40 transition-colors cursor-none shadow-2xl"
        >
          <Command className="w-3 h-3" />
          <span>K</span>
          <span className="text-slate-700">// Command</span>
        </button>
      )}
    </>
  );
}
