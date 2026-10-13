"use client";
import React from "react";
import { ShieldAlert, Shield } from "lucide-react";

/**
 * 🛡️ HULL DISPLAY — Day-1 sketch of an explicit hull-integrity readout for
 * the encounter screen. CombatViewport already reacts to pass/fail with a
 * decorative canopy battle scene; this adds the numeric "damage" the spec
 * calls out — a value CodeTerminal owns and only ever moves in response to
 * an already-decided evaluateSubmission outcome (a failing test lowers it,
 * a pass repairs it). This component is presentation-only: it reads `pct`,
 * it never decides it.
 */
export default function HullDisplay({ pct = 100 }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const critical = clamped <= 30;
  const warning = clamped > 30 && clamped <= 60;

  const barColor = critical ? "bg-rose-500" : warning ? "bg-amber-400" : "bg-emerald-400";
  const textColor = critical ? "text-rose-400" : warning ? "text-amber-400" : "text-emerald-400";
  const Icon = critical ? ShieldAlert : Shield;

  return (
    <div
      className="scope-frame scope-frame-sm shrink-0 px-3 py-2 border border-slate-800 bg-slate-950/60 flex items-center gap-2.5"
      role="status"
      aria-label={`Hull integrity ${clamped} percent`}
    >
      <Icon className={`w-3.5 h-3.5 shrink-0 ${textColor} ${critical ? "animate-pulse" : ""}`} />
      <div className="flex-1 min-w-[80px]">
        <div className="flex justify-between items-center mb-1">
          <span className="font-scope text-[8px] font-black uppercase tracking-widest text-slate-500">Hull Integrity</span>
          <span className={`font-mono text-[10px] font-bold tabular-nums ${textColor}`}>{clamped}%</span>
        </div>
        <div className="w-full h-1.5 bg-slate-900 border border-slate-800/60 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${clamped}%` }} />
        </div>
      </div>
    </div>
  );
}
