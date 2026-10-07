"use client";
import React, { useEffect, useRef, useState } from "react";
import { usePilot } from "../../context/PilotContext";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { Fingerprint, ShieldCheck, X, ArrowRight } from "lucide-react";

const SCAN_DURATION_MS = 1400;

/**
 * 🔐 BIOMETRIC LINK — the "Biometric Link" header button used to just
 * flip a boolean with no actual identity behind it. This gives it a real
 * (if entirely client-side, no-backend) sign-in flow: enter a callsign,
 * watch a fake biometric scan animate, land linked. The callsign then
 * flows into The Comm-Link's pilot logs and leaderboard.
 */
export default function BiometricLinkModal() {
  const { biometricModalOpen, setBiometricModalOpen, completeBiometricLink, playSystemSound } = usePilot();
  const [phase, setPhase] = useState("INPUT"); // INPUT -> SCANNING -> LINKED
  const [callsignInput, setCallsignInput] = useState("");
  const [linkedAs, setLinkedAs] = useState("");
  const inputRef = useRef(null);
  const timersRef = useRef([]);
  const dialogRef = useRef(null);

  // Non-Negotiables Pass: keep Tab inside the dialog and let Escape close
  // it (only while a pilot can still cancel — mid-scan and linked states
  // finish on their own).
  useFocusTrap(dialogRef, biometricModalOpen, phase === "INPUT" ? () => { playSystemSound("CLOSE"); setBiometricModalOpen(false); } : null);

  useEffect(() => {
    if (biometricModalOpen) {
      setPhase("INPUT");
      setCallsignInput("");
      const t = window.setTimeout(() => inputRef.current?.focus(), 60);
      timersRef.current.push(t);
    }
    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [biometricModalOpen]);

  if (!biometricModalOpen) return null;

  const close = () => {
    playSystemSound("CLOSE");
    setBiometricModalOpen(false);
  };

  const runScan = (e) => {
    e.preventDefault();
    if (phase !== "INPUT") return;
    setPhase("SCANNING");
    playSystemSound("CLICK");
    const t1 = window.setTimeout(() => {
      const clean = completeBiometricLink(callsignInput);
      setLinkedAs(clean);
      setPhase("LINKED");
      const t2 = window.setTimeout(() => setBiometricModalOpen(false), 1300);
      timersRef.current.push(t2);
    }, SCAN_DURATION_MS);
    timersRef.current.push(t1);
  };

  return (
    <div className="fixed inset-0 z-[140] font-mono" role="dialog" aria-modal="true" aria-label="Biometric authentication">
      <button
        aria-label="Close biometric link dialog"
        onClick={phase === "INPUT" ? close : undefined}
        className={`absolute inset-0 w-full h-full bg-black/75 backdrop-blur-sm ${phase === "INPUT" ? "cursor-none" : "cursor-default"}`}
      />

      <div ref={dialogRef} className="absolute inset-x-0 top-[18vh] mx-auto w-[min(92vw,440px)] animate-palette-in">
        <div className="scope-frame scope-glow-lg border border-cyan-500/30 bg-slate-950/95 backdrop-blur-xl overflow-hidden relative">
          <div className="absolute inset-0 bg-scanlines opacity-[0.02] pointer-events-none" />

          {phase === "INPUT" && (
            <button
              onClick={close}
              aria-label="Cancel biometric link"
              className="absolute top-3 right-3 p-1 text-slate-600 hover:text-slate-300 transition-colors cursor-pointer z-10"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <form onSubmit={runScan} className="p-6 pt-7 space-y-4 text-center">
            {phase === "INPUT" && (
              <>
                <div className="flex justify-center">
                  <div className="p-3 border border-cyan-500/30 rounded-full bg-cyan-950/20 text-cyan-400">
                    <Fingerprint className="w-7 h-7" />
                  </div>
                </div>
                <div>
                  <h2 className="font-scope text-sm font-semibold uppercase tracking-[0.15em] text-slate-100">Biometric Authentication</h2>
                  <p className="text-[11px] text-slate-400 font-sans mt-1 leading-relaxed">
                    Submit a callsign to bind your neural signature to this cockpit. No password required — just your ident.
                  </p>
                </div>
                <input
                  ref={inputRef}
                  value={callsignInput}
                  onChange={(e) => setCallsignInput(e.target.value)}
                  placeholder="e.g. CADET_SOLO_1"
                  maxLength={18}
                  className="w-full text-center bg-slate-900/60 border border-slate-800 focus:border-cyan-500/50 outline-hidden px-3 py-2 text-sm text-slate-100 placeholder-slate-600 font-mono uppercase tracking-wider transition-colors"
                />
                <button
                  type="submit"
                  className="scope-btn scope-frame scope-frame-sm w-full py-2 font-scope text-[11px] font-semibold uppercase tracking-widest border border-cyan-500/40 bg-cyan-950/30 text-cyan-400 hover:bg-cyan-400 hover:text-black transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  Initiate Scan <ArrowRight className="w-3 h-3" />
                </button>
              </>
            )}

            {phase === "SCANNING" && (
              <>
                <div className="flex justify-center">
                  <div className="p-3 border border-cyan-500/30 rounded-full bg-cyan-950/20 text-cyan-400">
                    <Fingerprint className="w-7 h-7 animate-pulse" />
                  </div>
                </div>
                <h2 className="font-scope text-sm font-semibold uppercase tracking-[0.15em] text-cyan-400">Scanning Signature...</h2>
                <p className="text-[11px] text-slate-400 font-sans">Cross-referencing neural pattern against fleet registry.</p>
                <div className="w-full h-1.5 bg-slate-900 border border-slate-800/60 rounded-xs overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-xs bg-cyan-400"
                    style={{ animation: `hud-toast-drain ${SCAN_DURATION_MS}ms linear forwards`, transformOrigin: "left center", animationDirection: "reverse" }}
                  ></div>
                </div>
              </>
            )}

            {phase === "LINKED" && (
              <>
                <div className="flex justify-center">
                  <div className="p-3 border border-emerald-500/30 rounded-full bg-emerald-950/20 text-emerald-400">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                </div>
                <h2 className="font-scope text-sm font-semibold uppercase tracking-[0.15em] text-emerald-400">Link Established</h2>
                <p className="text-[11px] text-slate-400 font-sans">
                  Welcome aboard, <span className="text-slate-200 font-bold">{linkedAs}</span>. Neural signature bound to this cockpit.
                </p>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
