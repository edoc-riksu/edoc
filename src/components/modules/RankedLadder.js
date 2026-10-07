"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { usePilot } from "../../context/PilotContext";
import { PLANETARY_SYSTEM, findSector } from "../../lib/planetarySystem";
import { hashSeed } from "../../lib/commsFeed";
import { evaluateSubmission } from "../../lib/submissionValidator";
import { Swords, Trophy, Zap, Clock, ChevronLeft, Info, GraduationCap } from "lucide-react";

// Deterministic-per-name NPC ladder — same pattern as CommLink's fullRoster,
// just with a rating instead of fuel cells. Ratings sit in a plausible
// competitive band (900-1600) so the pilot's own 1000 starting rating
// lands them somewhere in the middle of the pack, not at the bottom.
const NPC_NAMES = ["Commander_Py", "Star_Compiler", "Vector_Ghost", "Byte_Nebula", "Nova_Kestrel", "Drift_Marlow"];
function npcRating(name) {
  return 900 + (hashSeed(`${name}_rating`) % 700);
}

/**
 * Ranked's duel screen — a seasonal ladder plus a live head-to-head against
 * a scripted opponent. Scoring (an Elo-lite rating stored in
 * localStorage via PilotContext) is entirely client-side: real server
 * authority is a later, backend-dependent upgrade, flagged honestly below
 * rather than pretended into existence.
 */
export default function RankedLadder() {
  const { pilotCallsign, isPilotLoggedIn, rankedRating, setRankedRating, pilotProgress, pushToast, creditFuelCells } = usePilot();
  const myName = isPilotLoggedIn && pilotCallsign ? pilotCallsign : "Guest Pilot";

  const ladder = useMemo(() => {
    const npcs = NPC_NAMES.map((name) => ({ callsign: name, rating: npcRating(name), isMe: false }));
    const me = { callsign: myName, rating: rankedRating, isMe: true };
    return [...npcs, me].sort((a, b) => b.rating - a.rating).map((row, idx) => ({ ...row, rank: idx + 1 }));
  }, [myName, rankedRating]);

  const [opponent, setOpponent] = useState(null); // NPC row
  const [duel, setDuel] = useState(null); // { sector, lesson, startedAt, opponentSolveMs, status: "running"|"won"|"lost" }
  const [inputBuffer, setInputBuffer] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const tickRef = useRef(null);

  // A challenge is pulled from whichever sector the pilot has actually
  // reached — Ranked tests what you've already trained on, not a random
  // sector you've never opened.
  function pickChallenge() {
    const inProgress = PLANETARY_SYSTEM.find((s) => (pilotProgress[s.id] || 0) > 0 && (pilotProgress[s.id] || 0) < s.totalLessons);
    const sector = inProgress || PLANETARY_SYSTEM[0];
    const idx = Math.min(pilotProgress[sector.id] || 0, sector.lessons.length - 1);
    return { sector, lesson: sector.lessons[idx] };
  }

  function startDuel(npc) {
    const { sector, lesson } = pickChallenge();
    // Faster opponents at higher rating, with enough spread that a duel is
    // genuinely winnable either way — this is a scripted stand-in for a
    // real opponent, not a fair-fight simulator.
    const speedFactor = Math.max(0.5, 1.4 - npc.rating / 1600);
    const solveMs = Math.round((5000 + Math.random() * 7000) * speedFactor);
    setOpponent(npc);
    setInputBuffer("");
    setElapsedMs(0);
    setDuel({ sector, lesson, opponentSolveMs: solveMs, status: "running", startedAt: Date.now() });
  }

  useEffect(() => {
    if (!duel || duel.status !== "running") return undefined;
    tickRef.current = setInterval(() => {
      setElapsedMs((prev) => {
        const next = prev + 100;
        if (next >= duel.opponentSolveMs) {
          setDuel((d) => (d && d.status === "running" ? { ...d, status: "lost" } : d));
        }
        return next;
      });
    }, 100);
    return () => clearInterval(tickRef.current);
  }, [duel?.opponentSolveMs, duel?.status]);

  // Resolve a loss the instant the timer crosses over, exactly once.
  useEffect(() => {
    if (duel?.status === "lost" && !duel.resolved) {
      setRankedRating((r) => r - 15);
      pushToast({ title: "Defeat", body: `${opponent?.callsign} solved it first. -15 rating.`, tone: "danger", voice: null });
      setDuel((d) => (d ? { ...d, resolved: true } : d));
    }
  }, [duel?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submitDuel() {
    if (!duel || duel.status !== "running" || submitting) return;
    setSubmitting(true);
    const outcome = await evaluateSubmission(duel.sector.id, duel.sector.lessons.indexOf(duel.lesson), duel.lesson, inputBuffer);
    setSubmitting(false);
    if (!outcome.passed) {
      const reason = outcome.mode === "tests" ? outcome.results.find((r) => !r.pass)?.description || "A test failed." : "Missing the required token — the clock's still running.";
      pushToast({ title: "Not quite", body: reason, tone: "info", voice: null });
      return;
    }
    clearInterval(tickRef.current);
    setDuel((d) => ({ ...d, status: "won" }));
    setRankedRating((r) => r + 25);
    creditFuelCells(50);
    pushToast({ title: "Victory", body: `Beat ${opponent?.callsign} to the solve. +25 rating, +50 fuel cells.`, tone: "reward", voice: null });
  }

  function backToLadder() {
    clearInterval(tickRef.current);
    setDuel(null);
    setOpponent(null);
  }

  const progressPct = duel ? Math.min(100, Math.round((elapsedMs / duel.opponentSolveMs) * 100)) : 0;

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0 animate-fade-in">
      <div className="scope-frame scope-frame-sm px-3 py-2 border border-slate-900 bg-slate-950/40 flex items-center gap-2">
        <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <p className="text-[10px] text-slate-500 font-sans">Local scoring — this ladder lives on your device, not a shared server yet. Rating resets if you clear this browser's data.</p>
      </div>

      {!duel && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4 flex-1 min-h-0">
          {/* LADDER */}
          <div className="scope-frame border border-slate-800/60 bg-slate-950/30 backdrop-blur-xs overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-900 font-scope text-[10px] font-black uppercase tracking-widest text-slate-500">Seasonal Ladder</div>
            <div className="divide-y divide-slate-900/60">
              {ladder.map((row) => (
                <div key={row.callsign} className={`flex items-center gap-3 px-4 py-2.5 ${row.isMe ? "bg-cyan-950/15" : ""}`}>
                  <span className={`w-7 text-center font-scope text-xs font-bold ${row.rank <= 3 ? "text-amber-400" : "text-slate-500"}`}>#{row.rank}</span>
                  <span className={`flex-1 text-[12px] font-semibold truncate ${row.isMe ? "text-cyan-400" : "text-slate-300"}`}>{row.callsign}{row.isMe && " (you)"}</span>
                  <span className="font-mono text-[11px] text-slate-400 tabular-nums">{row.rating} RTG</span>
                  {!row.isMe && (
                    <button
                      onClick={() => startDuel(row)}
                      className="scope-btn px-2.5 py-1 border border-cyan-500/30 bg-cyan-950/20 text-cyan-400 hover:bg-cyan-400 hover:text-black transition-all font-scope text-[9px] font-bold uppercase tracking-widest cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <Swords className="w-3 h-3" /> Duel
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* MY RATING CARD */}
          <div className="scope-frame p-4 border border-slate-800/60 bg-slate-950/30 backdrop-blur-xs flex flex-col gap-3 h-fit">
            <div className="flex items-center gap-2 text-amber-400">
              <Trophy className="w-4 h-4" />
              <span className="font-scope text-[10px] font-black uppercase tracking-widest">Your Rating</span>
            </div>
            <div className="font-scope text-3xl font-bold text-slate-100 tabular-nums">{rankedRating}</div>
            <p className="text-[10px] text-slate-500 font-sans">Win a duel: +25. Lose one: -15. Challenges pull from whatever sector you're already training.</p>
          </div>
        </div>
      )}

      {duel && (
        <div className="scope-frame border border-cyan-500/20 bg-slate-950/30 backdrop-blur-xs flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-900">
            <button onClick={backToLadder} className="flex items-center gap-1 text-[10px] font-scope font-bold uppercase tracking-widest text-slate-500 hover:text-cyan-400 transition-colors cursor-pointer">
              <ChevronLeft className="w-3.5 h-3.5" /> Ladder
            </button>
            <span className="font-scope text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <Swords className="w-3.5 h-3.5 text-cyan-400" /> vs {opponent?.callsign}
            </span>
          </div>

          <div className="p-4 space-y-3 flex-1 overflow-y-auto">
            <div>
              <div className="text-[9px] font-black text-slate-600 uppercase tracking-wider">{duel.sector.short} // {duel.lesson.title}</div>
              <p className="text-[12px] text-slate-300 font-sans mt-1 leading-relaxed">{duel.lesson.prompt}</p>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                <span className="text-slate-500 flex items-center gap-1"><Zap className="w-3 h-3" /> You</span>
                <span className={duel.status === "lost" ? "text-rose-400" : "text-slate-500"}>{opponent?.callsign}</span>
              </div>
              <div className="w-full h-2 bg-slate-900 border border-slate-800/40 rounded-xs overflow-hidden p-0.5">
                <div className={`h-full rounded-xs transition-all duration-100 ${duel.status === "lost" ? "bg-rose-500" : "bg-amber-500"}`} style={{ width: `${progressPct}%` }}></div>
              </div>
              <div className="text-right text-[9px] font-mono text-slate-600 flex items-center justify-end gap-1"><Clock className="w-2.5 h-2.5" /> opponent solving...</div>
            </div>

            {duel.status === "running" && (
              <>
                <textarea
                  value={inputBuffer}
                  onChange={(e) => setInputBuffer(e.target.value)}
                  placeholder="// type your solution..."
                  className="w-full h-24 bg-slate-950 border border-slate-800 rounded-sm p-2.5 text-[12px] font-mono text-cyan-300 placeholder-slate-700 outline-hidden focus:border-cyan-500/50 resize-none"
                  autoFocus
                />
                <button
                  onClick={submitDuel}
                  disabled={submitting}
                  className="scope-btn w-full py-2 border border-cyan-500/40 bg-cyan-950/30 text-cyan-400 hover:bg-cyan-400 hover:text-black transition-all font-scope text-[11px] font-bold uppercase tracking-widest cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                >
                  {submitting ? "Verifying..." : "Submit"}
                </button>
              </>
            )}

            {duel.status === "won" && (
              <div className="scope-frame p-4 border border-emerald-500/30 bg-emerald-950/15 text-center space-y-2">
                <Trophy className="w-6 h-6 text-emerald-400 mx-auto" />
                <div className="font-scope text-sm font-bold text-emerald-400 uppercase tracking-wide">Victory</div>
                <p className="text-[11px] text-slate-400 font-sans">+25 rating &middot; +50 fuel cells</p>
                <button onClick={backToLadder} className="scope-btn px-4 py-1.5 border border-slate-800 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-400 transition-all font-scope text-[10px] font-bold uppercase tracking-widest cursor-pointer">Back to Ladder</button>
              </div>
            )}

            {duel.status === "lost" && (
              <div className="scope-frame p-4 border border-rose-500/30 bg-rose-950/15 text-center space-y-3">
                <div className="font-scope text-sm font-bold text-rose-400 uppercase tracking-wide">Defeat</div>
                <p className="text-[11px] text-slate-400 font-sans">{opponent?.callsign} solved it first. -15 rating.</p>

                {/* Non-Negotiables Pass: teach the concept before a rematch. */}
                <div className="scope-frame scope-frame-sm text-left p-3 border border-rose-500/20 bg-rose-950/10 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[9px] font-scope font-bold uppercase tracking-widest text-rose-300">
                    <GraduationCap className="w-3.5 h-3.5" /> Debrief — {duel.lesson.concept || "Concept"}
                  </div>
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{duel.sector.short} // {duel.lesson.title}</div>
                  <p className="text-[11px] text-slate-300 font-sans leading-relaxed">{duel.lesson.prompt}</p>
                </div>

                <div className="flex gap-2 justify-center">
                  <button onClick={() => opponent && startDuel(opponent)} className="scope-btn px-4 py-1.5 border border-rose-500/40 bg-rose-950/20 text-rose-300 hover:bg-rose-400 hover:text-black transition-all font-scope text-[10px] font-bold uppercase tracking-widest cursor-pointer">Rematch</button>
                  <button onClick={backToLadder} className="scope-btn px-4 py-1.5 border border-slate-800 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-400 transition-all font-scope text-[10px] font-bold uppercase tracking-widest cursor-pointer">Back to Ladder</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
