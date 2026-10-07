"use client";
import React from "react";
import { usePilot } from "../../context/PilotContext";
import { CheckCircle2, AlertTriangle, Info, Zap, X } from "lucide-react";

/**
 * 🛎️ CANOPY ALERT STACK
 * Transient HUD notifications for cell credits, badge unlocks and
 * gimbal locks — feedback that previously only existed as a line in
 * the terminal log buffer.
 */

const TONES = {
  info: {
    icon: Info,
    frame: "border-cyan-500/40 bg-cyan-950/25",
    accent: "text-cyan-400",
    bar: "bg-cyan-400"
  },
  success: {
    icon: CheckCircle2,
    frame: "border-emerald-500/40 bg-emerald-950/25",
    accent: "text-emerald-400",
    bar: "bg-emerald-400"
  },
  danger: {
    icon: AlertTriangle,
    frame: "border-rose-500/40 bg-rose-950/25",
    accent: "text-rose-400",
    bar: "bg-rose-400"
  },
  reward: {
    icon: Zap,
    frame: "border-amber-500/40 bg-amber-950/25",
    accent: "text-amber-400",
    bar: "bg-amber-400"
  }
};

export default function ToastStack() {
  const { toasts, dismissToast } = usePilot();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      className="fixed right-4 bottom-4 z-[120] flex flex-col gap-2 w-[300px] max-w-[calc(100vw-2rem)] pointer-events-none font-mono"
      role="log"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const tone = TONES[toast.tone] || TONES.info;
        const Icon = tone.icon;
        return (
          <div
            key={toast.id}
            className={`scope-frame scope-frame-sm scope-glow relative overflow-hidden border backdrop-blur-md pointer-events-auto animate-toast-in ${tone.frame}`}
          >
            <div className="absolute inset-0 bg-scanlines opacity-[0.02] pointer-events-none" />

            <div className="flex items-start gap-2.5 p-3 pt-4 pr-8 pl-5">
              <Icon className={`w-4 h-4 shrink-0 mt-px ${tone.accent}`} />
              <div className="min-w-0 space-y-0.5">
                <div className="font-scope text-[12px] font-semibold uppercase tracking-wider text-slate-100 leading-tight">
                  {toast.title}
                </div>
                {toast.body && (
                  <p className="text-[10px] text-slate-400 font-sans leading-snug">{toast.body}</p>
                )}
              </div>
            </div>

            <button
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss alert"
              className="absolute top-2 right-2 p-0.5 rounded text-slate-600 hover:text-slate-200 transition-colors cursor-none"
            >
              <X className="w-3 h-3" />
            </button>

            <div className="h-0.5 w-full bg-slate-900/60">
              <div
                className={`h-full animate-toast-drain ${tone.bar}`}
                style={{ animationDuration: `${toast.ttl}ms` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
