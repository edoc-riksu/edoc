"use client";
import React, { useEffect } from "react";
import Link from "next/link";
import SpaceWindshield from "../components/SpaceWindshield";
import { usePilot } from "../context/PilotContext";
import { Compass, Radio, ArrowDown, ShieldAlert } from "lucide-react";

export default function CosmicJourneyLaunchpad() {
  const { fuelCells, setWarpSpeed, setTargetVirtualScroll, virtualScroll } = usePilot();

  // 🎥 CALIBRATING GLOBAL WINDOW SCROLL VECTOR PATHS
  useEffect(() => {
    const handleJourneyScroll = () => {
      const maxScrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScrollHeight <= 0) return;

      const currentScrollY = window.scrollY;
      const progressRatio = Math.min(1, Math.max(0, currentScrollY / maxScrollHeight));

      // Update global context timeline position. (This previously called a
      // `setScrollProgress` that PilotContext never exported, which threw on
      // the very first scroll — `setTargetVirtualScroll` is the context's
      // actual timeline setter, the same one SpaceWindshield's wheel handler
      // drives.)
      setTargetVirtualScroll(progressRatio * 4); // Maps seamlessly across 4 distinct space sectors

      // Trigger high-velocity warp lines during scrolling passes
            setWarpSpeed(3);
      const settleWarpTimer = setTimeout(() => setWarpSpeed(1), 100);
      return () => clearTimeout(settleWarpTimer);
    };

    window.addEventListener("scroll", handleJourneyScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleJourneyScroll);
  }, [setWarpSpeed, setTargetVirtualScroll]);

  // Determine current active space sector name for header text feedback
  const getActiveSectorName = () => {
    if (virtualScroll < 1) return "SECTOR_01 // SOLAR_CORE_IGNITION";
    if (virtualScroll < 2) return "SECTOR_02 // SYSTEM_SYLLABUS_GRID";
    if (virtualScroll < 3) return "SECTOR_03 // LOOT_INVENTORY_BAY";
    return "SECTOR_04 // ACCESS_CLEARANCE_LOCK";
  };

  return (
    <div className="relative w-full min-h-[400vh] bg-black font-mono text-cyan-400 select-none antialiased">
      
      {/* 🌌 HARDWARE-ACCELERATED HIGH-FIDELITY WEBGL UNIVERSE WINDSHIELD */}
      <div className="fixed inset-0 z-0 w-screen h-screen pointer-events-auto">
        <SpaceWindshield speed={1} interactive={true} />
      </div>

      {/* FIXED PLATFORM TACTICAL OVERLAY HEADER */}
      <div className="fixed inset-x-0 top-0 z-50 p-4 pointer-events-none">
        <header className="scope-frame scope-glow max-w-7xl mx-auto w-full flex items-center justify-between bg-black/40 backdrop-blur-md px-6 py-3.5 border border-cyan-500/20 pointer-events-auto">
          <div className="flex items-center gap-3">
            <Compass className="w-5 h-5 text-cyan-400 animate-spin-slow" />
            <div className="flex flex-col">
              <span className="font-scope text-sm font-semibold tracking-[0.2em] text-slate-100 uppercase leading-none">edoc</span>
              <span className="text-[8px] text-cyan-500/50 font-bold uppercase tracking-wider mt-0.5">JOURNEY TRACK // PLAYLIST_EMULATION</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6 font-scope text-[11px] text-slate-400 font-semibold tracking-wide">
            <div className="flex items-center gap-1.5"><Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" /> Link Active</div>
            <div>Energy <span className="text-amber-400 font-bold">{fuelCells} CLS</span></div>
          </div>
          <Link
            href="/cockpit"
            className="scope-btn scope-frame scope-frame-sm font-scope text-[11px] font-semibold tracking-[0.15em] uppercase bg-cyan-950/50 border border-cyan-500/40 px-4 py-2 text-cyan-400 hover:bg-cyan-400 hover:text-black transition-all duration-300"
          >
            Bridge Deck →
          </Link>
        </header>
      </div>

      {/* ========================================================
          🛰️ FLOATING HUD TEXT NODE LAYERS
         ======================================================== */}
      <div className="relative z-10 w-full flex flex-col pointer-events-none">
        
        {/* VIEWPORT AREA 01: WELCOME MANIFEST */}
        <section className="w-screen h-screen flex flex-col justify-center items-start px-6 md:px-20 relative">
          <div className="max-w-lg space-y-2">
            <div className="text-[9px] text-cyan-400 font-black uppercase tracking-widest flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5" /> HUD_LAUNCHPAD_MATRIX
            </div>
            <h1 className="font-scope text-3xl md:text-5xl font-bold uppercase text-slate-100 tracking-wide leading-none">
              Remap Space. <br />Compile Algorithms.
            </h1>
            <p className="text-[11px] text-slate-400 max-w-sm leading-relaxed font-sans">
              No list menus. Pilot through real cosmic coordinate streams. Scan code anomalies inside high-danger planetary spheres to patch engine grids.
            </p>
            <div className="pt-2 flex items-center gap-3 pointer-events-auto">
              <Link href="/cockpit" className="scope-btn scope-frame scope-frame-sm scope-glow font-scope text-[11px] font-semibold tracking-wide uppercase bg-cyan-600 text-slate-100 px-5 py-2.5 hover:brightness-110 transition">
                Launch Jump Sequence
              </Link>
              <div className="text-[9px] text-slate-500 font-bold uppercase flex items-center gap-1 animate-pulse">
                <span>Scroll down to travel</span> <ArrowDown className="w-3 h-3 text-cyan-400" />
              </div>
            </div>
          </div>
        </section>

        {/* VIEWPORT AREA 02: SYLLABUS DIRECTORY */}
        <section className="w-screen h-screen flex flex-col justify-center items-end px-6 md:px-20 relative">
          <div className="max-w-md text-right space-y-1">
            <div className="text-[9px] text-cyan-400 font-black uppercase tracking-widest">01 // COURSE_ bluePrint_TIERS</div>
            <h2 className="font-scope text-2xl md:text-3xl font-bold text-slate-100 uppercase tracking-wide">6 Language Planets</h2>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Every programming language represents a physical planet with distinct geological properties, nested quests, and compiler validation gates.
            </p>
          </div>
        </section>

        {/* VIEWPORT AREA 03: LECTION ROADMAP */}
        <section className="w-screen h-screen flex flex-col justify-center items-start px-6 md:px-20 relative">
          <div className="max-w-md space-y-1">
            <div className="text-[9px] text-cyan-400 font-black uppercase tracking-widest">02 // INVENTORY_STORAGE</div>
            <h2 className="font-scope text-2xl md:text-3xl font-bold text-slate-100 uppercase tracking-wide">Neural Badge Cores</h2>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Pass active syntax tasks inside the split-screen workstation terminal to unencrypt glowing collectible emblems and unlock high-tier space sectors.
            </p>
          </div>
        </section>

        {/* VIEWPORT AREA 04: GLOBAL FOOTER ZONE */}
        <section className="w-screen h-screen flex flex-col justify-end p-6 md:p-12 relative">
          <div className="scope-frame w-full bg-black/40 backdrop-blur-md p-4 border border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 font-scope text-[10px] text-slate-500 font-semibold tracking-widest uppercase pointer-events-auto">
            <span>© 2026 edoc. Data blueprints mounted clean.</span>
            <div className="flex gap-6 items-center">
              <Link href="/about" className="hover:text-cyan-400 transition">Diagnostics Archive</Link>
              <span>|</span>
              <a href="https://solarsystemscope.com" target="_blank" rel="noreferrer" className="hover:text-cyan-400 transition">Solar Scope Refs</a>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
