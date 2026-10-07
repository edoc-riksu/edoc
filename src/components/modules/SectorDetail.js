"use client";
import React, { useEffect, useMemo, useState } from "react";
import { usePilot } from "../../context/PilotContext";
import { isSectorUnlocked, badgeList, LESSON_XP } from "../../lib/planetarySystem";
import AtmosphericEntry from "../ui/AtmosphericEntry";
import { ChevronLeft, Play, Lock, CheckCircle2, Clock, Users, Award, Rocket, Trophy, Sparkles, UserRound } from "lucide-react";

const BADGE_ICONS = { Award, Rocket, Trophy };

// A stable, deterministic "N pilots training" flavor number — no backend,
// but it shouldn't reshuffle on every render either.
function trainingCount(sector) {
  let h = 0;
  for (let i = 0; i < sector.id.length; i += 1) h = (h * 31 + sector.id.charCodeAt(i)) >>> 0;
  return 400 + (h % 3200);
}

/* -----------------------------------------------------------------
   🪐 PARALLAX SURFACE LANDSCAPES
   Purely decorative background layers behind the sector detail view,
   themed per language. Local to this screen only — doesn't touch
   sector.hex/tailwind (still used for the hero border + progress
   bars) or any pilotProgress-driven logic below.
   ----------------------------------------------------------------- */
const SURFACE_THEME = {
  "Python Engine Core": { accent: "#22c55e", kind: "mist" },
  "JavaScript Engine": { accent: "#a855f7", kind: "cityscape" },
  "TypeScript Array": { accent: "#22d3ee", kind: "aurora" },
  "Go Engine Subsystem": { accent: "#eab308", kind: "dunes" },
  "Rust Core Defense": { accent: "#dc2626", kind: "lava" },
  "SQL Relational Matrix": { accent: "#0ea5e9", kind: "waterfall" }
};
const DEFAULT_SURFACE = { accent: "#22d3ee", kind: "mist" };

/** Layered CSS parallax backdrop — three depths, each drifting at its
    own rate so the surface reads as a real landscape behind the glass
    panels rather than a flat tint. */
function SurfaceLandscape({ sectorId }) {
  const theme = SURFACE_THEME[sectorId] || DEFAULT_SURFACE;
  const { accent, kind } = theme;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Depth 1 — base wash */}
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(ellipse 90% 70% at 50% 15%, ${accent}22, transparent 65%)` }}
      />

      {/* Depth 2 — the per-language texture layer */}
      {kind === "mist" && (
        <div
          className="absolute inset-0 opacity-60 animate-surface-drift"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 30%, ${accent}33, transparent 40%), radial-gradient(circle at 70% 60%, ${accent}26, transparent 45%), radial-gradient(circle at 45% 85%, ${accent}22, transparent 40%)`,
            backgroundSize: "160% 160%",
            filter: "blur(6px)"
          }}
        />
      )}
      {kind === "cityscape" && (
        <div
          className="absolute inset-x-0 bottom-0 h-2/3 animate-surface-pulse"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, ${accent}2e 0px, ${accent}2e 18px, transparent 18px, transparent 34px, ${accent}22 34px, ${accent}22 46px, transparent 46px, transparent 70px)`,
            maskImage: "linear-gradient(to top, black, transparent)",
            WebkitMaskImage: "linear-gradient(to top, black, transparent)"
          }}
        />
      )}
      {kind === "aurora" && (
        <div
          className="absolute inset-0 opacity-50 animate-surface-drift"
          style={{
            backgroundImage: `repeating-linear-gradient(115deg, ${accent}2a 0px, ${accent}2a 2px, transparent 2px, transparent 26px)`,
            backgroundSize: "140% 140%",
            filter: "blur(1px)"
          }}
        />
      )}
      {kind === "dunes" && (
        <div
          className="absolute inset-0 opacity-55 animate-surface-drift"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, ${accent}28 0px, ${accent}28 1.5px, transparent 1.5px, transparent 30px)`,
            backgroundSize: "160% 140%"
          }}
        />
      )}
      {kind === "lava" && (
        <div
          className="absolute inset-0 opacity-60 animate-surface-flow"
          style={{
            backgroundImage: `repeating-linear-gradient(200deg, ${accent}3a 0px, ${accent}3a 3px, transparent 3px, transparent 40px, #f9731633 40px, #f9731633 44px, transparent 44px, transparent 90px)`,
            backgroundSize: "100% 220%"
          }}
        />
      )}
      {kind === "waterfall" && (
        <div
          className="absolute inset-0 opacity-55 animate-surface-flow"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, ${accent}2e 0px, ${accent}2e 1.5px, transparent 1.5px, transparent 24px)`,
            backgroundSize: "100% 260%"
          }}
        />
      )}

      {/* Depth 3 — vignette so the glass panels on top stay legible */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 80% 65% at 50% 40%, transparent 35%, rgba(2,6,23,0.75) 100%)" }}
      />
    </div>
  );
}

/* -----------------------------------------------------------------
   🗿 RITUAL CELESTIAL MONOLITH — the circular hub glyph for one lesson
   milestone. Purely presentational: it takes the *already-computed*
   `state` ("locked" | "cleared" | "current" | "practice") and index,
   nothing more — the caller still owns every bit of the logic that
   produced that state.
   ----------------------------------------------------------------- */
function MonolithNode({ state, index }) {
  const isLive = state === "cleared" || state === "current";
  const pulseClass = state === "practice" ? "animate-monolith-pulse-amber" : "animate-monolith-pulse";
  const ringColor = state === "practice" ? "border-amber-400/70" : "border-cyan-400/70";
  const coreBg =
    state === "locked"
      ? "bg-gradient-to-br from-slate-800 to-slate-950"
      : state === "practice"
      ? "bg-gradient-to-br from-amber-950 to-slate-950"
      : "bg-gradient-to-br from-cyan-950 to-slate-950";

  return (
    <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
      {/* Active targeting box — continuously scaling-in tracking corners, blinking */}
      {state === "current" && (
        <div className="absolute inset-[-10px] animate-track-blink">
          {["-top-0 -left-0 border-t border-l", "-top-0 -right-0 border-t border-r", "-bottom-0 -left-0 border-b border-l", "-bottom-0 -right-0 border-b border-r"].map((pos, i) => (
            <span key={i} className={`absolute w-3 h-3 ${pos} border-cyan-400 animate-track-scale-in`} style={{ animationDelay: `${i * 90}ms` }} />
          ))}
        </div>
      )}

      {/* Locked — amber security laser cage over a dull carbon plate */}
      {state === "locked" ? (
        <div className="relative w-full h-full rounded-full border-2 border-slate-700/80 bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center overflow-hidden shadow-inner">
          <svg viewBox="0 0 64 64" className="absolute inset-0 w-full h-full animate-laser-cage" aria-hidden="true">
            <line x1="6" y1="14" x2="58" y2="30" stroke="#f59e0b" strokeWidth="1.5" opacity="0.85" />
            <line x1="6" y1="34" x2="58" y2="18" stroke="#f59e0b" strokeWidth="1.5" opacity="0.85" />
            <line x1="6" y1="44" x2="58" y2="50" stroke="#f59e0b" strokeWidth="1.5" opacity="0.7" />
            <line x1="6" y1="52" x2="58" y2="42" stroke="#f59e0b" strokeWidth="1.5" opacity="0.7" />
          </svg>
          <Lock className="w-4 h-4 text-slate-500 relative z-10" />
        </div>
      ) : (
        <div className={`relative w-full h-full rounded-full border-2 ${ringColor} ${coreBg} flex items-center justify-center ${isLive ? pulseClass : ""}`}>
          {/* Inner ritual-disc facets */}
          <div className="absolute inset-1.5 rounded-full border border-current opacity-25" />
          <div className="absolute inset-3 rounded-full border border-current opacity-20" />
          {state === "cleared" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 relative z-10" />
          ) : (
            <span className={`font-scope text-[13px] font-bold relative z-10 ${state === "practice" ? "text-amber-300" : "text-cyan-300"}`}>
              {index + 1}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function SectorDetail({ sector, onBack }) {
  const { pilotProgress, beginPlanetTravel, isPilotLoggedIn, pilotCallsign, beginBiometricLink, pilotMode, setPracticeTargetIndex } = usePilot();
  const isPractice = pilotMode === "PRACTICE";

  // 🔥 FRICTION BLAST ARRIVAL — a purely visual, self-timed phase local to
  // this screen. Mounts true (screen still "in atmosphere"), flips false
  // once the entry burn clears. Never reads or writes pilotProgress.
  const [arriving, setArriving] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setArriving(false), 820);
    return () => window.clearTimeout(t);
  }, []);
  const surfaceTheme = SURFACE_THEME[sector.id] || DEFAULT_SURFACE;

  const currentLevel = pilotProgress[sector.id] || 0;
  const isMastered = currentLevel >= sector.totalLessons;
  const isLocked = !isSectorUnlocked(sector.id, pilotProgress);
  const progressPercent = Math.round((currentLevel / sector.totalLessons) * 100);
  const sectorXP = currentLevel * LESSON_XP;
  const sectorXPTotal = sector.totalLessons * LESSON_XP;
  const badges = badgeList(pilotProgress);
  const earnedCount = badges.filter((b) => b.earned).length;
  const etaMinutes = sector.totalLessons * 12;

  const ctaLabel = isLocked
    ? `Requires ${sector.requires?.id || "prior"} clearance`
    : isMastered
    ? "Sector Fully Calibrated"
    : currentLevel > 0
    ? "Resume Training"
    : "Initialize Coordinate Lock";

  return (
    <div className="relative flex flex-col h-full gap-4 text-cyan-400 font-mono animate-fade-in">
      {/* 🌍 Background rendering layer — parallax surface landscape, themed
          per language, sitting behind every panel in this view. */}
      <SurfaceLandscape sectorId={sector.id} />

      {/* 🔥 Friction-blast atmospheric entry — plays once on arrival, then
          unmounts, revealing the surface dashboard underneath. */}
      {arriving && <AtmosphericEntry accent={surfaceTheme.accent} />}

      <button
        onClick={onBack}
        className="relative z-10 flex items-center gap-1 font-scope text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-cyan-400 transition-colors duration-200 cursor-pointer w-fit"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> Return to Syllabus Map
      </button>

      <div className="relative z-10 flex flex-col lg:flex-row gap-4 flex-1 min-h-0 overflow-y-auto pr-1">
        {/* MAIN COLUMN */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* HERO STRIP */}
          <div className={`scope-frame scope-frame-lg p-5 border ${sector.color} bg-slate-950/50 backdrop-blur-md relative overflow-hidden shrink-0`}>
            <div className="absolute inset-0 bg-scanlines pointer-events-none opacity-[0.015]" />
            <div className="flex items-center gap-2 mb-2">
              <span className="cockpit-pill" title="Difficulty tier">
                <Sparkles className="w-3 h-3" />
                <span className="font-scope text-[9px] font-bold uppercase tracking-wide">{sector.tier}</span>
              </span>
              <span className="cockpit-pill" title="Sector classification">
                <span className="font-scope text-[9px] font-bold uppercase tracking-wide text-slate-400">{sector.classification}</span>
              </span>
            </div>
            <h1 className="font-scope text-2xl font-bold uppercase tracking-wide text-slate-100 text-shadow-cyan">{sector.name}</h1>
            <p className="text-[12px] text-slate-400 font-sans leading-relaxed mt-1.5 max-w-xl">{sector.description}</p>

            <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-500 font-scope tracking-wide">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ~{etaMinutes} min to clear</span>
              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> +{trainingCount(sector).toLocaleString()} pilots training</span>
            </div>

            <button
              onClick={() => !isLocked && !isMastered && beginPlanetTravel(sector.id)}
              disabled={isLocked || isMastered}
              className={`mt-4 scope-btn scope-frame scope-frame-sm flex items-center gap-2 px-4 py-2 font-scope text-[12px] font-semibold uppercase tracking-widest border transition-all cursor-pointer ${
                isLocked || isMastered
                  ? "border-slate-900 bg-slate-950/60 text-slate-600 cursor-not-allowed"
                  : "border-cyan-500/40 bg-cyan-950/30 text-cyan-400 hover:bg-cyan-400 hover:text-black hover:border-cyan-400 active:scale-[0.98] scope-glow"
              }`}
            >
              {isLocked ? <Lock className="w-3 h-3" /> : isMastered ? <CheckCircle2 className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
              {ctaLabel}
            </button>
          </div>

          {/* 🗿 RITUAL CELESTIAL MONOLITH ROADWAY — a winding neon flight
              coordinate path across the surface, in place of the old flat
              boxed timeline. `state` and every click handler below are the
              exact same ones the flat version used — only the markup and
              classes around them changed. */}
          <div className="scope-frame flex-1 bg-slate-950/40 border border-slate-900 p-4 sm:p-5 backdrop-blur-md relative overflow-hidden">
            <div className="flex items-center gap-3 mb-5 relative z-10">
              <div className={`w-7 h-7 rounded-full border flex items-center justify-center font-scope text-[11px] font-bold shrink-0 ${isLocked ? "border-slate-800 text-slate-700" : "border-cyan-500/60 text-cyan-400"}`}>1</div>
              <h2 className="font-scope text-[13px] font-semibold uppercase tracking-wide text-slate-200">Core Directives // Flight Coordinate Path</h2>
            </div>

            <div className="relative flex flex-col gap-9 pb-2">
              {/* Central energy spine — the "flight coordinate path" trunk line */}
              <div
                className="absolute left-1/2 top-2 bottom-2 w-[2px] -translate-x-1/2 bg-gradient-to-b from-cyan-500/60 via-cyan-500/25 to-cyan-500/60"
                style={{ boxShadow: "0 0 10px 1px rgba(34,211,238,0.3)" }}
                aria-hidden="true"
              />

              {sector.lessons.map((lesson, idx) => {
                const state = isLocked
                  ? "locked"
                  : idx < currentLevel
                  ? "cleared"
                  : idx === currentLevel
                  ? "current"
                  : isPractice
                  ? "practice"
                  : "locked";
                const rightSide = idx % 2 === 1;
                return (
                  <div key={idx} className={`relative flex ${rightSide ? "justify-end" : "justify-start"}`}>
                    {/* Spur connector from the spine out to this node */}
                    <div
                      className="absolute top-8 h-[2px] bg-cyan-500/35"
                      style={{
                        [rightSide ? "right" : "left"]: "50%",
                        width: "calc(50% - 32px)"
                      }}
                      aria-hidden="true"
                    />

                    <div className={`flex items-center gap-3 w-[86%] sm:w-[64%] ${rightSide ? "flex-row-reverse text-right" : "flex-row text-left"}`}>
                      <MonolithNode state={state} index={idx} />

                      {/* Caption card — same title/tags/action content as before */}
                      <div
                        className={`flex-1 min-w-0 px-3 py-2.5 border rounded-sm transition-colors ${
                          state === "current"
                            ? "border-cyan-500/30 bg-cyan-950/20"
                            : state === "cleared"
                            ? "border-emerald-950 bg-emerald-950/10"
                            : state === "practice"
                            ? "border-amber-900/40 bg-amber-950/10"
                            : "border-slate-900 bg-slate-950/40"
                        }`}
                      >
                        <div className={`flex items-center gap-2 min-w-0 ${rightSide ? "flex-row-reverse" : ""}`}>
                          <span className={`text-[12px] font-semibold truncate ${state === "locked" ? "text-slate-600" : "text-slate-200"}`}>{lesson.title}</span>
                          {lesson.module === "applied" ? (
                            <span className="text-[8px] font-black uppercase tracking-widest text-amber-500/80 border border-amber-500/30 bg-amber-950/20 rounded-xs px-1.5 py-0.5 shrink-0">Applied</span>
                          ) : lesson.concept ? (
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 border border-slate-800 bg-slate-950/40 rounded-xs px-1.5 py-0.5 shrink-0 hidden sm:inline-block">{lesson.concept}</span>
                          ) : null}
                        </div>

                        <div className={`mt-1.5 flex ${rightSide ? "justify-end" : "justify-start"}`}>
                          {state === "cleared" && (
                            <span className="flex items-center gap-1 text-[10px] font-scope font-bold uppercase tracking-wide text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> Cleared</span>
                          )}
                          {state === "current" && (
                            <button
                              onClick={() => beginPlanetTravel(sector.id)}
                              className="scope-btn px-3 py-1 border border-cyan-500/40 bg-cyan-950/30 text-cyan-400 hover:bg-cyan-400 hover:text-black transition-all font-scope text-[10px] font-bold uppercase tracking-widest cursor-pointer"
                            >
                              Start
                            </button>
                          )}
                          {state === "practice" && (
                            <button
                              onClick={() => { setPracticeTargetIndex(idx); beginPlanetTravel(sector.id); }}
                              className="scope-btn px-3 py-1 border border-amber-500/40 bg-amber-950/20 text-amber-400 hover:bg-amber-400 hover:text-black transition-all font-scope text-[10px] font-bold uppercase tracking-widest cursor-pointer"
                            >
                              Practice
                            </button>
                          )}
                          {state === "locked" && (
                            <span className="flex items-center gap-1 text-[10px] font-scope font-bold uppercase tracking-wide text-slate-700"><Lock className="w-3 h-3" /> ???</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* SIDEBAR — PILOT DOSSIER */}
        <div className="w-full lg:w-64 flex flex-col gap-3 shrink-0">
          <div className="scope-frame scope-frame-sm border border-slate-900 bg-slate-950/50 p-3 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full border border-cyan-500/30 bg-cyan-950/30 flex items-center justify-center shrink-0">
              <UserRound className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <div className="font-scope text-[11px] font-bold text-slate-200 truncate">{isPilotLoggedIn && pilotCallsign ? pilotCallsign : "Guest Pilot"}</div>
              {!isPilotLoggedIn && (
                <button onClick={beginBiometricLink} className="text-[9px] text-cyan-400 hover:text-cyan-300 font-scope uppercase tracking-wide cursor-pointer">Link to save progress →</button>
              )}
            </div>
          </div>

          <div className="scope-frame scope-frame-sm border border-slate-900 bg-slate-950/50 p-3 space-y-2.5">
            <div className="font-scope text-[10px] text-slate-500 font-bold uppercase tracking-widest border-b border-slate-900 pb-1.5">Sector Progress</div>
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] text-slate-500 font-bold uppercase"><span>Exercises</span><span>{currentLevel}/{sector.totalLessons}</span></div>
              <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden"><div className="h-full bg-cyan-400 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} /></div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] text-slate-500 font-bold uppercase"><span>XP Earned</span><span>{sectorXP}/{sectorXPTotal}</span></div>
              <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden"><div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} /></div>
            </div>
          </div>

          <div className="scope-frame scope-frame-sm border border-slate-900 bg-slate-950/50 p-3">
            <div className="flex justify-between items-center border-b border-slate-900 pb-1.5 mb-2">
              <span className="font-scope text-[10px] text-slate-500 font-bold uppercase tracking-widest">Commendations</span>
              <span className="text-[9px] text-slate-500 font-bold">{earnedCount}/{badges.length}</span>
            </div>
            <p className="text-[9px] text-slate-600 font-sans leading-relaxed mb-2">Master a sector to earn its commendation — collect the whole fleet.</p>
            <div className="grid grid-cols-4 gap-2">
              {badges.map((b) => {
                const Icon = BADGE_ICONS[b.icon] || Award;
                return (
                  <div
                    key={b.id}
                    title={`${b.label} — ${b.detail}`}
                    className={`aspect-square rounded-full border flex items-center justify-center transition-colors ${
                      b.earned ? "border-amber-400/60 bg-amber-950/20 text-amber-400" : "border-slate-900 bg-slate-950/40 text-slate-700"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
