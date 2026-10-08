"use client";

import React from "react";
import { motion } from "framer-motion";
import { Lock, CheckCircle2, Play, ArrowLeft } from "lucide-react";

export default function ArcadeLevelRoadmap({ planetName, lessons, onLaunchMission, onBackToGalaxy }) {
  // Map specific atmospheres for the planetary surface cards dynamically
  const getAtmosphereConfig = () => {
    switch (planetName.toLowerCase()) {
      case "python": return "from-emerald-950/80 to-slate-950 border-emerald-500/30 glow-emerald";
      case "javascript": return "from-purple-950/80 to-slate-950 border-purple-500/30 glow-purple";
      case "typescript": return "from-cyan-950/80 to-slate-950 border-cyan-500/30 glow-cyan";
      default: return "from-slate-900/90 to-slate-950 border-slate-700/30";
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden px-4 py-20 flex flex-col items-center">

      {/* Return Option Panel Custom Sci-fi HUD Navigation Chrome */}
      <div className="w-full max-w-4xl mb-8 flex justify-between items-center z-20">
        <button
          onClick={onBackToGalaxy}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs tracking-wider text-amber-400 bg-slate-900/60 border border-amber-500/30 backdrop-blur-md hover:bg-amber-500/20 transition-all cursor-pointer shadow-[0_0_10px_rgba(255,183,0,0.1)]"
        >
          <ArrowLeft size={14} /> DISENGAGE SECTOR RADAR
        </button>
        <div className="text-right">
          <span className="text-[10px] font-mono tracking-widest text-cyan-500 block">CURRENT SECTOR</span>
          <h2 className="text-2xl font-black text-white tracking-wide uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
            🪐 {planetName} SYSTEM
          </h2>
        </div>
      </div>

      {/* The Candy Crush / Duolingo style winding vertical core structure */}
      <div className={`relative w-full max-w-md min-h-[700px] py-12 rounded-3xl bg-gradient-to-b ${getAtmosphereConfig()} border backdrop-blur-xl flex flex-col items-center gap-16 shadow-[0_0_40px_rgba(0,0,0,0.5)]`}>

        {/* Draw a connecting central energy track line behind the buttons */}
        <div className="absolute top-16 bottom-16 w-3 border-l-4 border-dashed border-cyan-500/20 z-0" />

        {lessons.map((lesson, index) => {
          // Calculate horizontal offset grid mapping to generate the Candy Crush winding wave flow pattern
          const offsetDirection = index % 4 === 0 ? "translate-x-0" : index % 4 === 1 ? "translate-x-16" : index % 4 === 2 ? "translate-x-0" : "-translate-x-16";

          return (
            <div key={lesson.id} className={`relative flex flex-col items-center ${offsetDirection} z-10 w-full`}>
              <motion.button
                whileHover={lesson.isUnlocked ? { scale: 1.15 } : {}}
                whileTap={lesson.isUnlocked ? { scale: 0.95 } : {}}
                disabled={!lesson.isUnlocked}
                onClick={() => onLaunchMission(lesson.id)}
                className={`
                  relative w-20 h-20 rounded-full flex items-center justify-center font-black text-xl transition-all shadow-xl cursor-pointer
                  ${lesson.isCompleted
                    ? "bg-gradient-to-br from-cyan-400 to-blue-600 border-4 border-white text-white drop-shadow-[0_0_15px_rgba(0,240,255,0.4)]"
                    : lesson.isUnlocked
                    ? "bg-gradient-to-br from-amber-400 to-orange-500 border-4 border-white text-white animate-bounce drop-shadow-[0_0_15px_rgba(255,183,0,0.4)]"
                    : "bg-slate-800 border-4 border-slate-700 text-slate-500 cursor-not-allowed"
                  }
                `}
              >
                {/* Visual states embedded inside the nodes */}
                {lesson.isCompleted ? (
                  <CheckCircle2 size={24} className="text-white" />
                ) : !lesson.isUnlocked ? (
                  <Lock size={20} className="text-slate-600" />
                ) : (
                  <span className="drop-shadow-md">{lesson.title}</span>
                )}

                {/* Micro target indicators framing current active lesson milestone */}
                {lesson.isUnlocked && !lesson.isCompleted && (
                  <span className="absolute -inset-3 rounded-full border-2 border-dashed border-amber-400/60 animate-spin" />
                )}
              </motion.button>

              {/* Floating label box pinned directly beneath the milestone capsule node */}
              <div className="mt-2 hud-panel hud-panel-flat px-3 py-1 max-w-[150px] text-center">
                <p className="text-[10px] font-mono font-bold truncate text-slate-300 uppercase tracking-tight">
                  {lesson.name}
                </p>
                {lesson.isUnlocked && !lesson.isCompleted && (
                  <span className="text-[8px] font-mono text-amber-400 font-extrabold tracking-wider flex items-center justify-center gap-1 mt-0.5 animate-pulse">
                    <Play size={8} fill="currentColor" /> LAUNCH MISSION
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
