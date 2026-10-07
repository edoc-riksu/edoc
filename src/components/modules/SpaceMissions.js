"use client";
import React, { useState } from "react";
import { usePilot } from "../../context/PilotContext";
import { PLANETARY_SYSTEM } from "../../lib/planetarySystem";
import { Shield, Cpu, Award, Orbit, Skull, Flame, Globe2, Database } from "lucide-react";

const STREAK_GOAL = 30;

// Custom bounty flavor text per planet — one bounty and one sandbox
// simulator entry per language now, instead of the original 2-of-6.
const BOUNTY_COPY = {
  "Python Engine Core": {
    title: "Indentation Gorges Breakdown",
    difficulty: "Novice",
    desc: "A syntax error has locked up the recursive fuel manifolds deep inside the Canyon defiles. Correct the script loops to vent the system pressure bounds.",
    icon: Orbit
  },
  "JavaScript Engine": {
    title: "Asynchronous Lava Tube Collapse",
    difficulty: "Advanced",
    desc: "Stale callback signals are blocking structural core cooling fluid lines inside the Magma Vents. Build a non-blocking execution path before system failure.",
    icon: Skull
  },
  "TypeScript Array": {
    title: "Glacial Interface Fracture",
    difficulty: "Intermediate",
    desc: "An unbound parameter has cracked the Ice Spire's static contract. Re-seal the interface before the fracture propagates through the lattice.",
    icon: Shield
  },
  "Go Engine Subsystem": {
    title: "Concurrent Vent Overload",
    difficulty: "Advanced",
    desc: "Two geyser vents are erupting out of sync and flooding the cryo-system. Route them through proper goroutines before pressure redlines.",
    icon: Cpu
  },
  "Rust Core Defense": {
    title: "Borrow Checker Sandstorm",
    difficulty: "Expert",
    desc: "A sandstorm has exposed an unowned memory dune on the Iron Desert. Reassign ownership before the storm claims the whole allocation.",
    icon: Skull
  },
  "SQL Relational Matrix": {
    title: "Archive Ring Corruption",
    difficulty: "Specialist",
    desc: "A broken join has desynced the outer archive rings from their foreign keys. Restore relational integrity before the ledger drifts further.",
    icon: Database
  }
};

const REWARD_BY_TIER = {
  Beginner: 150,
  Intermediate: 200,
  "Gated Alpha": 200,
  Advanced: 275,
  Expert: 320,
  Specialist: 300
};

export default function SpaceMissions() {
  const { beginPlanetTravel, flightStreak } = usePilot();
  const [missionFilter, setMissionFilter] = useState("BOUNTIES");

  // Every sector in the catalog now gets a real bounty AND a free-practice
  // sandbox entry, generated from the same single source of truth the
  // radar and 3D scene already read from.
  const systemMissions = PLANETARY_SYSTEM.flatMap((sector) => {
    const bounty = BOUNTY_COPY[sector.id];
    const entries = [];
    if (bounty) {
      entries.push({
        id: `BNTY-${sector.designation}`,
        title: bounty.title,
        planet: sector.id,
        type: "BOUNTIES",
        reward: REWARD_BY_TIER[sector.tier] || 200,
        difficulty: bounty.difficulty,
        desc: bounty.desc,
        icon: bounty.icon
      });
    }
    entries.push({
      id: `SIM-${sector.designation}`,
      title: `${sector.name} Sandbox Arena`,
      planet: sector.id,
      type: "SIMULATOR",
      reward: 50,
      difficulty: "All Ranks",
      desc: `Boot up an isolated, completely blank ${sector.short} workspace profile to experiment freely without structural system constraints.`,
      icon: Globe2
    });
    return entries;
  });

  const handleLaunchMission = (planetName) => {
    // Board and fly to the mission's destination sector — same boarding →
    // warp → landing sequence as launching from Flight Academy.
    beginPlanetTravel(planetName);
  };

  const streakPercent = Math.min(100, Math.round((flightStreak / STREAK_GOAL) * 100));

  return (
    <div className="flex flex-col h-full gap-4 bg-transparent animate-fade-in font-mono">
      {/* SECTION HEADER */}
      <div>
        <h1 className="font-scope text-base font-semibold uppercase tracking-[0.15em] mb-1 flex items-center gap-2 text-cyan-400 text-shadow-cyan">
          <Shield className="w-4 h-4 text-cyan-400" />
          Deep Space Missions // System Bounties
        </h1>
        <p className="text-[11px] text-slate-400">Intercept real-time structural anomalies requiring manual code patches in deep sectors.</p>
      </div>

      {/* MATRIX SELECTOR TABS */}
      <div className="flex gap-2 border-b border-slate-900 pb-2 pointer-events-auto">
        <button
          onClick={() => setMissionFilter("BOUNTIES")}
          className={`scope-btn scope-frame scope-frame-sm flex items-center gap-2 px-3 py-1.5 font-scope text-[11px] font-semibold uppercase border transition-all duration-300 cursor-pointer ${
            missionFilter === "BOUNTIES" ? "bg-cyan-950/50 border-cyan-500 text-cyan-400 scope-glow" : "border-transparent text-slate-400 hover:bg-slate-900/40"
          }`}
        >
          <Shield className="w-3.5 h-3.5" /> Bounties & Anomalies
        </button>
        <button
          onClick={() => setMissionFilter("SIMULATOR")}
          className={`scope-btn scope-frame scope-frame-sm flex items-center gap-2 px-3 py-1.5 font-scope text-[11px] font-semibold uppercase border transition-all duration-300 cursor-pointer ${
            missionFilter === "SIMULATOR" ? "bg-cyan-950/50 border-cyan-500 text-cyan-400 scope-glow" : "border-transparent text-slate-400 hover:bg-slate-900/40"
          }`}
        >
          <Cpu className="w-3.5 h-3.5" /> Flight Simulator
        </button>
        <button
          onClick={() => setMissionFilter("RELAY")}
          className={`scope-btn scope-frame scope-frame-sm flex items-center gap-2 px-3 py-1.5 font-scope text-[11px] font-semibold uppercase border transition-all duration-300 cursor-pointer ${
            missionFilter === "RELAY" ? "bg-cyan-950/50 border-cyan-500 text-cyan-400 scope-glow" : "border-transparent text-slate-400 hover:bg-slate-900/40"
          }`}
        >
          <Flame className="w-3.5 h-3.5" /> Relay Log
        </button>
      </div>

      {/* RELAY STREAK PANEL — the recurring daily-challenge tab */}
      {missionFilter === "RELAY" && (
        <div className="scope-frame scope-frame-lg p-5 border border-amber-500/20 bg-slate-950/40 backdrop-blur-xs space-y-4 pointer-events-auto">
          <div className="flex items-center gap-3">
            <div className="p-2.5 border border-amber-500/30 rounded bg-amber-950/20 text-amber-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-scope text-sm font-semibold text-slate-100 uppercase tracking-wide">#30CyclesOfCode Relay</h3>
              <p className="text-[11px] text-slate-400 font-sans">Log in and run a validation each orbital cycle to keep the relay alive.</p>
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="font-scope text-3xl font-bold text-amber-400 tabular-nums">{flightStreak}</span>
            <span className="text-[11px] text-slate-500 uppercase tracking-widest">cycle{flightStreak === 1 ? "" : "s"} strong</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[9px] font-black tracking-widest text-slate-500 uppercase">
              <span>Relay Progress</span>
              <span>{Math.min(flightStreak, STREAK_GOAL)}/{STREAK_GOAL}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-900 rounded-xs overflow-hidden p-0.5 border border-slate-900">
              <div className="h-full rounded-xs bg-amber-500 transition-all duration-500" style={{ width: `${streakPercent}%` }}></div>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 font-sans leading-relaxed">
            {flightStreak >= STREAK_GOAL
              ? "Relay complete — full fleet commendation earned. The counter keeps climbing."
              : "Miss a cycle and the relay resets to 1 — come back tomorrow to keep it going."}
          </p>
        </div>
      )}

      {/* CHALLENGE DECK SCROLL CONTAINER */}
      {missionFilter !== "RELAY" && (
      <div className="flex-1 overflow-y-auto pr-1 space-y-3 pointer-events-auto">
        {systemMissions
          .filter((m) => m.type === missionFilter)
          .map((mission) => {
            const Icon = mission.icon;
            return (
              <div 
                key={mission.id}
                className="scope-frame p-4 pt-5 border border-slate-800/80 bg-slate-950/40 backdrop-blur-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-cyan-500/30 hover:scope-glow transition-all duration-300 group"
              >
                <div className="flex gap-3 items-start flex-1">
                  <div className="p-2 border border-slate-800 rounded bg-slate-900/50 text-slate-500 group-hover:text-cyan-400 transition-colors mt-1">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider bg-slate-900 px-1.5 py-0.5 border border-slate-800 rounded">{mission.id}</span>
                      <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wide">{mission.planet}</span>
                    </div>
                    <h3 className="font-scope text-sm font-semibold text-slate-200 uppercase tracking-wide">{mission.title}</h3>
                    <p className="text-[11px] text-slate-400 leading-relaxed max-w-2xl font-sans">{mission.desc}</p>
                  </div>
                </div>

                {/* MISSION METRIC BOX */}
                <div className="flex md:flex-col items-end justify-between w-full md:w-auto border-t md:border-t-0 border-slate-900/60 pt-3 md:pt-0 gap-2 shrink-0">
                  <div className="text-right">
                    <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest">BOUNTY VAL</div>
                    <div className="text-xs font-black text-amber-400 flex items-center gap-1 justify-end font-mono">
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      {mission.reward} CELLS
                    </div>
                  </div>
                  <button
                    onClick={() => handleLaunchMission(mission.planet)}
                    className="scope-btn scope-frame scope-frame-sm px-3 py-1.5 bg-slate-900 border border-slate-700 font-scope text-[11px] font-semibold uppercase tracking-wide text-slate-300 hover:bg-cyan-950 hover:text-cyan-400 hover:border-cyan-500/50 transition duration-300 cursor-pointer"
                  >
                    Launch Vector →
                  </button>
                </div>
              </div>
            );
          })}
      </div>
      )}
    </div>
  );
}
