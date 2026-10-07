"use client";
import React from "react";
import Link from "next/link";
import SpaceWindshield from "../../components/SpaceWindshield";
import { usePilot } from "../../context/PilotContext";
import { HelpCircle, ChevronLeft, Cpu, Globe } from "lucide-react";

export default function AboutSystemPage() {
  const { playSystemSound } = usePilot();

  return (
    <div className="relative w-screen min-h-screen text-cyan-400 font-mono select-none overflow-hidden flex flex-col bg-black p-3">
      {/* BACKGROUND VIEWPORT CANVASES */}
      <SpaceWindshield speed={0.2} interactive={false} />

      {/* TACTICAL CANOPY COCKPIT OVERLAY WRAPPER */}
      <div className="absolute inset-0 z-10 border-[16px] border-slate-950 pointer-events-none flex flex-col justify-between p-4 bg-gradient-to-b from-cyan-950/5 via-transparent to-black/60">
        
        <header className="scope-frame scope-glow w-full flex items-center justify-between border-b border-slate-900 pb-3 pt-1 bg-slate-950/70 backdrop-blur-xl px-5 pointer-events-auto">
          <Link
            href="/"
            onMouseEnter={() => playSystemSound("HOVER")}
            onClick={() => playSystemSound("CLICK")}
            className="flex items-center gap-1 font-scope text-[11px] font-semibold uppercase tracking-wide text-slate-400 hover:text-cyan-400 transition cursor-none"
          >
            <ChevronLeft className="w-4 h-4" /> Return to launchpad
          </Link>
          <span className="font-scope text-[10px] font-semibold uppercase tracking-widest text-slate-600">Specification // Directory</span>
        </header>

        {/* Card frame is scope-frame'd, so its own diagonal corner accents
            replace the two hand-drawn tick marks this used to draw itself. */}
        <main className="scope-frame scope-frame-lg scope-glow my-10 space-y-4 bg-slate-950/70 backdrop-blur-xl p-6 md:p-8 pt-8 border border-cyan-500/20 pointer-events-auto max-w-3xl mx-auto relative">
          <div className="absolute inset-0 bg-scanlines pointer-events-none opacity-[0.015]"></div>

          <h1 className="font-scope text-lg font-semibold uppercase tracking-widest text-slate-100 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-cyan-500 animate-pulse" /> Core Architecture Spec
          </h1>
          <div className="border-t border-slate-900/60 my-2"></div>
          
          <p className="text-xs text-slate-400 font-sans leading-relaxed">
            edoc is a next-generation gamified learning environment configured to bridge structural multi-page client routing networks with native WebGL 3D pixel pipelines.
          </p>

          <div className="space-y-3 pt-2">
            <div onMouseEnter={() => playSystemSound("HOVER")} className="scope-frame scope-frame-sm flex gap-3 items-start p-3 border border-slate-900 bg-slate-950/40 transition hover:border-cyan-500/20">
              <Cpu className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-scope text-[12px] font-semibold uppercase tracking-wide text-slate-200">Polyphonic Sound Generation</h3>
                <p className="text-[10px] text-slate-400 font-sans mt-0.5 leading-relaxed">
                  Bypasses compressed mp3 files using immediate mathematical Web Audio wave triggers, ensuring lag-free audio feedback responses during high-speed coordinate warping runs.
                </p>
              </div>
            </div>

            <div onMouseEnter={() => playSystemSound("HOVER")} className="scope-frame scope-frame-sm flex gap-3 items-start p-3 border border-slate-900 bg-slate-950/40 transition hover:border-cyan-500/20">
              <Globe className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-scope text-[12px] font-semibold uppercase tracking-wide text-slate-200">Reticle Vector Head Tracking</h3>
                <p className="text-[10px] text-slate-400 font-sans mt-0.5 leading-relaxed">
                  Maps cursor inputs into floating 3D perspective camera matrix offsets, blending standard text blocks smoothly into moving galaxy dust configurations.
                </p>
              </div>
            </div>
          </div>
        </main>

        <footer className="scope-frame w-full text-center font-scope text-[10px] text-slate-600 font-semibold uppercase tracking-widest py-3 border-t border-slate-900 bg-slate-950/70 p-2">
          System Health: Excellent // End Manifest Data
        </footer>

      </div>
    </div>
  );
}
