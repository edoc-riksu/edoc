"use client";
import React, { useState, useMemo } from "react";
import { usePilot } from "../../context/PilotContext";
import { PLANETARY_SYSTEM, isSectorUnlocked, findSector } from "../../lib/planetarySystem";
import SectorDetail from "./SectorDetail";
import RankedLadder from "./RankedLadder";
import CampusDashboard from "./CampusDashboard";
import { Lock, CheckCircle2, Star, Compass, ChevronRight, Orbit, Search, Rocket, BookOpen, Swords, ShieldCheck, GraduationCap } from "lucide-react";

// 🎯 FLIGHT MODES — a cross-cutting way to work a sector, not a screen of
// its own. Practice is the only fully-ungated mode (the platform's own
// non-negotiable: never gate practice); Ranked, Proctored and Campus each
// change what happens once a pilot is inside a sector.
const MODES = [
  { id: "PRACTICE", label: "Practice", icon: BookOpen, blurb: "Attempt any exercise, any order. No pressure, no lock." },
  { id: "RANKED", label: "Ranked", icon: Swords, blurb: "Duel the ladder. Scored on this device for now." },
  { id: "PROCTORED", label: "Proctored", icon: ShieldCheck, blurb: "Fullscreen, timed, no pasting. Certificate marked unverified." },
  { id: "CAMPUS", label: "Campus", icon: GraduationCap, blurb: "Class roster, assignment, and a live mastery heatmap." }
];

// Each sector's Tailwind palette lives on the shared catalog now (see
// src/lib/planetarySystem.js) — this view just composes it into classNames
// so the radar, the 3D scene and this syllabus grid can never drift apart
// the way the old hardcoded 3-sector list did.
function paletteFor(sector) {
  const t = sector.tailwind;
  return {
    color: `${t.border} ${t.text} bg-slate-950/25 hover:border-current shadow-[0_0_20px_rgba(0,240,255,0.05)]`,
    glowColor: ``,
    barColor: t.bar
  };
}

export default function FlightAcademy() {
  const { pilotProgress, fuelCells, beginPlanetTravel, pilotMode, setPilotMode, pushToast, playSystemSound } = usePilot();
  const [hoveredNode, setHoveredNode] = useState(null);
  const [query, setQuery] = useState("");
  const [tierFilter, setTierFilter] = useState("ALL");
  // Codédex-style drill-down: a catalog card opens a dedicated syllabus
  // page (hero + numbered exercise timeline + pilot dossier) instead of
  // jumping straight into the travel sequence — same two-step flow as
  // their own course catalog → course page → exercise page.
  const [previewSectorId, setPreviewSectorId] = useState(null);

  // 🪐 Single source of truth — every sector the 3D scene and radar know
  // about now shows up here too (previously this grid only carried 3 of
  // the 6 catalog entries, so half the fleet was invisible from Learn).
  const academySectors = PLANETARY_SYSTEM.map((sector) => ({
    ...sector,
    classification: `${sector.classification} // ${sector.tier}`,
    ...paletteFor(sector)
  }));

  const tiers = useMemo(() => ["ALL", ...Array.from(new Set(PLANETARY_SYSTEM.map((s) => s.tier)))], []);

  const filteredSectors = academySectors.filter((sector) => {
    const matchesTier = tierFilter === "ALL" || sector.tier === tierFilter;
    const matchesQuery =
      query.trim() === "" ||
      sector.name.toLowerCase().includes(query.trim().toLowerCase()) ||
      sector.description.toLowerCase().includes(query.trim().toLowerCase());
    return matchesTier && matchesQuery;
  });

  // "Continue training" — surfaces whichever unlocked sector is mid-flight
  // (progress started but not finished), the way a "continue" rail would.
  const continueSector = academySectors.find((s) => {
    const level = pilotProgress[s.id] || 0;
    return level > 0 && level < s.totalLessons;
  });

  const handleLaunchVector = (sectorId) => {
    // Board the shuttle and fly there first — the terminal only opens once
    // the travel sequence lands (see PilotContext.beginPlanetTravel).
    beginPlanetTravel(sectorId);
  };

  if (previewSectorId) {
    const rawSector = findSector(previewSectorId);
    if (rawSector) {
      const previewSector = { ...rawSector, ...paletteFor(rawSector) };
      return <SectorDetail key={previewSector.id} sector={previewSector} onBack={() => setPreviewSectorId(null)} />;
    }
  }

  return (
    <div className="flex flex-col h-full gap-4 text-cyan-400 font-mono animate-fade-in">
      
      {/* HUD HEADER SEGMENT */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-2">
        <div>
          <h1 className="font-scope text-base font-semibold uppercase tracking-[0.15em] text-cyan-400 text-shadow-cyan flex items-center gap-2">
            <Orbit className="w-4 h-4 text-cyan-400 animate-spin-slow" />
            Planetary Syllabus Map // Directory
          </h1>
          <p className="text-[9px] text-slate-500 font-sans mt-0.5">Select a target coordinate node to lock your camera gimbal onto that world.</p>
        </div>
        <div className="cockpit-pill" title="Compiler Status">
          <span className="relative flex w-1.5 h-1.5">
            <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
            <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </span>
          <span className="font-scope text-[10px] font-bold tracking-wide text-slate-400">COMPILER <span className="text-emerald-400">READY</span></span>
        </div>
      </div>

      {/* FLIGHT MODE SWITCHER — Practice / Ranked / Proctored / Campus */}
      <div className="flex flex-col gap-1.5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {MODES.map((mode) => {
            const Icon = mode.icon;
            const active = pilotMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setPilotMode(mode.id)}
                className={`scope-btn scope-frame scope-frame-sm flex items-center justify-center gap-1.5 px-2.5 py-2 font-scope text-[10px] font-bold uppercase tracking-wide border transition-all cursor-pointer ${
                  active ? "bg-cyan-950/50 border-cyan-500 text-cyan-400 scope-glow" : "border-slate-900 text-slate-500 hover:bg-slate-900/40"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {mode.label}
              </button>
            );
          })}
        </div>
        <p className="text-[9px] text-slate-500 font-sans px-0.5">{MODES.find((m) => m.id === pilotMode)?.blurb}</p>
      </div>

      {/* CAMPUS — real dashboard reading src/lib/campusModel.js's data shapes;
          the roster is illustrative (no instructor account/LMS exists), but
          a linked pilot's own row is real, and every mastery number is
          computed live, not hardcoded. See CampusDashboard.js. */}
      {pilotMode === "CAMPUS" && <CampusDashboard />}

      {pilotMode === "PROCTORED" && (
        <div className="scope-frame scope-frame-sm px-3 py-2 border border-amber-500/30 bg-amber-950/10 flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <p className="text-[10px] text-amber-300/90 font-sans">Opening a sector now locks the terminal fullscreen, blocks pasting, and starts a timer. Any certificate you earn is marked <span className="font-bold">unverified</span> until real proctoring exists.</p>
        </div>
      )}

      {pilotMode === "RANKED" ? (
        <RankedLadder />
      ) : pilotMode !== "CAMPUS" ? (
      <>
      {/* CONTINUE TRAINING CALLOUT — surfaces whichever sector is mid-flight */}
      {continueSector && (
        <button
          onClick={() => handleLaunchVector(continueSector.id)}
          className="scope-frame scope-frame-sm w-full flex items-center justify-between gap-3 px-4 py-2.5 border border-cyan-500/30 bg-cyan-950/15 hover:bg-cyan-950/30 hover:border-cyan-400/50 transition-all text-left cursor-pointer group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Rocket className="w-4 h-4 text-cyan-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            <div className="min-w-0">
              <div className="font-scope text-[10px] font-semibold uppercase tracking-widest text-cyan-400">Continue Training</div>
              <div className="text-[11px] text-slate-400 truncate">
                Resume <span className="text-slate-200 font-semibold">{continueSector.name}</span> — {pilotProgress[continueSector.id] || 0}/{continueSector.totalLessons} flight levels cleared
              </div>
            </div>
          </div>
          <span className="font-scope text-[10px] font-semibold uppercase tracking-wide text-cyan-400 shrink-0">Resume →</span>
        </button>
      )}

      {/* SEARCH + TIER FILTER ROW */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="scope-frame scope-frame-sm flex items-center gap-2 px-3 py-1.5 hud-panel flex-1">
          <Search className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sectors..."
            className="flex-1 bg-transparent outline-hidden text-[11px] text-slate-200 placeholder-slate-600 font-sans"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 sm:pb-0">
          {tiers.map((tier) => (
            <button
              key={tier}
              onClick={() => setTierFilter(tier)}
              className={`scope-btn scope-frame scope-frame-sm shrink-0 px-2.5 py-1.5 font-scope text-[10px] font-semibold uppercase tracking-wide border transition-all cursor-pointer ${
                tierFilter === tier ? "bg-cyan-950/50 border-cyan-500 text-cyan-400 scope-glow" : "border-slate-900 text-slate-500 hover:bg-slate-900/40"
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      {/* TACTICAL SECTOR NODE CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 overflow-y-auto pr-1 auto-rows-min">
        {filteredSectors.length === 0 && (
          <div className="col-span-full text-center text-[11px] text-slate-600 font-sans py-8">
            No sectors match that search.
          </div>
        )}
        {filteredSectors.map((sector) => {
          const currentLevel = pilotProgress[sector.id] || 0;
          const progressPercent = Math.floor((currentLevel / sector.totalLessons) * 100);
          const isLocked = !isSectorUnlocked(sector.id, pilotProgress);

          // Non-Negotiables Pass (Phase 05): a locked card used to render
          // with no role/tabIndex at all, so keyboard and screen-reader
          // pilots couldn't even discover it existed. It's now always
          // reachable — locked ones announce why, rather than acting on
          // Enter/Space.
          const lockedLabel = `${sector.name}, locked${sector.requires ? `, requires ${sector.requires.id} clearance` : ""}`;
          const handleActivate = () => {
            if (isLocked) {
              playSystemSound("ERROR");
              pushToast({
                title: "Sector locked",
                body: sector.requires ? `Requires ${sector.requires.id} clearance first.` : "Not yet available.",
                tone: "info",
                voice: null
              });
              return;
            }
            setPreviewSectorId(sector.id);
          };
          return (
            <div
              key={sector.id}
              onMouseEnter={() => setHoveredNode(sector.id)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={handleActivate}
              role="button"
              tabIndex={0}
              aria-disabled={isLocked || undefined}
              aria-label={isLocked ? lockedLabel : undefined}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleActivate(); } }}
              className={`scope-frame p-4 pt-5 border flex flex-col justify-between transition-all duration-300 relative overflow-hidden group shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 ${
                isLocked
                  ? "bg-slate-950/25 backdrop-blur-md border-cyan-500/20 text-slate-600 shadow-none opacity-40 cursor-pointer"
                  : `${sector.color} ${sector.glowColor} backdrop-blur-md hover:scale-[1.01] scope-glow cursor-pointer`
              }`}
            >
              {/* Sci-fi background grids scanline overlay */}
              <div className="absolute inset-0 bg-scanlines pointer-events-none opacity-[0.01]"></div>

              {/* HUD VECTOR-FRAME KIT — targeting-display chrome laid over the
                  existing scope-frame panel: corner crosshairs, a scan sweep,
                  and a scrolling telemetry ticker. Purely decorative — no
                  handler, aria attribute, or data derivation below is touched. */}
              {!isLocked && (
                <>
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-10 bg-linear-to-b from-cyan-300/25 to-transparent animate-card-scan" />
                  </div>
                  {[
                    "top-1.5 left-1.5",
                    "top-1.5 right-1.5",
                    "bottom-1.5 left-1.5",
                    "bottom-1.5 right-1.5"
                  ].map((pos) => (
                    <span
                      key={pos}
                      aria-hidden="true"
                      className={`absolute ${pos} w-2.5 h-2.5 pointer-events-none text-current opacity-40`}
                    >
                      <span className="absolute left-1/2 top-0 -translate-x-1/2 w-px h-full bg-current" />
                      <span className="absolute top-1/2 left-0 -translate-y-1/2 h-px w-full bg-current" />
                    </span>
                  ))}
                </>
              )}

              <div className="space-y-3">
                {/* Node Classification Label */}
                <div className="flex justify-between items-center border-b border-slate-900/60 pb-1.5">
                  <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider">{sector.classification}</span>
                  {isLocked ? (
                    <Lock className="w-3 h-3 text-slate-700" />
                  ) : progressPercent === 100 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Compass className={`w-3.5 h-3.5 text-current ${hoveredNode === sector.id ? "animate-spin-slow" : ""}`} />
                  )}
                </div>

                {/* Sector Title */}
                <div>
                  <h3 className={`font-scope text-sm font-semibold uppercase tracking-wide ${isLocked ? "text-slate-600" : "text-slate-100 group-hover:text-cyan-400 transition-colors"}`}>
                    {sector.name}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-sans leading-relaxed mt-1">{sector.description}</p>
                  {isLocked && sector.requires && (
                    <p className="text-[9px] text-slate-600 font-sans mt-1 uppercase tracking-wide">
                      Requires {sector.requires.id} clearance
                    </p>
                  )}
                </div>

                {/* Sub-Quest Milestone Node Path Trackers */}
                <div className="space-y-1.5 pt-1">
                  {sector.quests.map((quest, qIdx) => {
                    const isQuestDone = currentLevel > qIdx;
                    return (
                      <div 
                        key={qIdx} 
                        className={`text-[9px] px-2 py-1 rounded-sm border flex items-center justify-between font-mono ${
                          isLocked 
                            ? "border-slate-950 bg-slate-950/20" 
                            : isQuestDone 
                              ? "border-emerald-950 bg-emerald-950/10 text-emerald-400" 
                              : "border-slate-900 bg-slate-950/40 text-slate-400"
                        }`}
                      >
                        <span className="truncate">{quest}</span>
                        {isQuestDone && <Star className="w-2.5 h-2.5 fill-current shrink-0 ml-1" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Progress Bar & Vector Engagement Button */}
              <div className="mt-4 pt-3 border-t border-slate-900/60 space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-[8px] font-black tracking-widest text-slate-500 uppercase">
                    <span>SECTOR_PROGRESS</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-xs overflow-hidden p-0.5 border border-slate-900">
                    <div
                      className={`h-full rounded-xs transition-all duration-500 ${sector.barColor}`}
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                  {!isLocked && (
                    <div
                      aria-hidden="true"
                      className="animate-telemetry-tick text-[7px] font-mono tracking-wider text-emerald-400/70 pt-0.5 truncate"
                    >
                      {`ALT: ${(sector.orbitRadius ?? 0).toFixed(1)} // RADAR: ACTV // LVL ${currentLevel}/${sector.totalLessons}`}
                    </div>
                  )}
                </div>

                {!isLocked && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setPreviewSectorId(sector.id); }}
                    className="scope-btn scope-frame scope-frame-sm w-full flex items-center justify-center gap-1.5 py-1.5 font-scope text-[11px] font-semibold uppercase tracking-widest border border-cyan-500/30 bg-cyan-950/20 text-cyan-400 hover:bg-cyan-400 hover:text-black hover:border-cyan-400 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    View Flight Plan <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      </>
      ) : null}
    </div>
  );
}
