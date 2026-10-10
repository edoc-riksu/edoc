"use client";
import React, { useEffect, useRef, useState } from "react";
import { Bot, HelpCircle, Sparkles } from "lucide-react";

/**
 * 🤖 COMPANION PANEL — COG, the cockpit's onboard guide. Day-1 sketch of
 * the companion the product spec calls for: a named character with an
 * idle/talking state, standing in front of the same progressive 3-tier
 * hint system CodeTerminal already ran (bare, unnamed) in its left panel.
 *
 * Deliberately a thin presentational wrapper — `hints`, `hintsRevealed`
 * and `onReveal` are the exact same props/values CodeTerminal already
 * computed, so this changes how hints are *framed*, never what a hint
 * says or when it's allowed to be asked for.
 *
 * Non-Negotiables Pass: COG never animates or speaks on its own while the
 * pilot is typing — it only reacts to an explicit hint request or a
 * mood change CodeTerminal passes in after a submission resolves, so the
 * "ship goes quiet while coding" rule holds for the companion too.
 */
const TALK_DURATION_MS = 1600;

const IDLE_LINES = [
  "Take your time — I'm reading the manifest right alongside you.",
  "No rush. Flag me the second you want a nudge.",
  "Systems nominal. I'll flag anything off before you submit."
];

export default function CompanionPanel({ hints = [], hintsRevealed = 0, onReveal, mood = "idle", reactionTick = 0 }) {
  const [talking, setTalking] = useState(false);
  const talkTimer = useRef(null);
  const prevTick = useRef(reactionTick);
  const [idleLine] = useState(() => IDLE_LINES[Math.floor(Math.random() * IDLE_LINES.length)]);

  // Reacts to a change in `reactionTick` (bumped by CodeTerminal once per
  // submit outcome), not to `mood`'s value — so two fails in a row still
  // each get their own "talking" beat instead of only the first.
  useEffect(() => {
    if (reactionTick === prevTick.current) return undefined;
    prevTick.current = reactionTick;
    setTalking(true);
    talkTimer.current = window.setTimeout(() => setTalking(false), TALK_DURATION_MS);
    return () => window.clearTimeout(talkTimer.current);
  }, [reactionTick]);

  const handleReveal = (idx) => {
    setTalking(true);
    window.clearTimeout(talkTimer.current);
    talkTimer.current = window.setTimeout(() => setTalking(false), TALK_DURATION_MS);
    onReveal?.(idx);
  };

  useEffect(() => () => window.clearTimeout(talkTimer.current), []);

  const moodRing =
    mood === "cheering" ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-400"
    : mood === "concerned" ? "border-rose-500/40 bg-rose-950/20 text-rose-400"
    : "border-cyan-500/30 bg-cyan-950/20 text-cyan-400";

  return (
    <div className="mt-4 pt-3 border-t border-slate-900/60 space-y-2">
      <div className="flex items-center gap-2.5">
        <div className={`relative p-1.5 rounded-full border shrink-0 transition-colors duration-300 ${moodRing}`}>
          <Bot className={`w-4 h-4 ${talking ? "animate-pulse" : ""}`} />
          {talking && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 animate-ping" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0">
          <div className="font-scope text-[10px] font-bold uppercase tracking-widest text-slate-200">COG // Onboard Guide</div>
          <p className="text-[10px] text-slate-500 font-sans truncate" aria-live="polite">
            {hintsRevealed > 0 ? hints[hintsRevealed - 1] : idleLine}
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center text-[8px] font-black tracking-widest text-slate-500 uppercase pt-1">
        <span>Ask COG for a nudge</span>
        <span>{hintsRevealed}/3 hints used</span>
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <button
            key={i}
            onClick={() => handleReveal(i)}
            disabled={hintsRevealed > i}
            aria-label={`Ask COG for hint ${i + 1}`}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 border font-scope text-[9px] font-bold uppercase tracking-wide transition-all cursor-pointer disabled:cursor-default ${
              hintsRevealed > i
                ? "border-amber-500/30 bg-amber-950/10 text-amber-500/60"
                : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-cyan-500/40 hover:text-cyan-400"
            }`}
          >
            <HelpCircle className="w-3 h-3" /> {i + 1}
          </button>
        ))}
      </div>
      {hintsRevealed > 0 && (
        <div className="space-y-1.5">
          {hints.slice(0, hintsRevealed).map((h, i) => (
            <div key={i} className="flex items-start gap-1.5 px-2 py-1.5 bg-slate-950 border border-dashed border-slate-800 text-[10px] text-amber-200/80 font-sans leading-relaxed">
              <Sparkles className="w-3 h-3 shrink-0 mt-0.5 text-amber-500" />
              <span>{h}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
