"use client";
import React, { useEffect, useRef, useState } from "react";
import { usePilot } from "../../context/PilotContext";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { X, UserRound, Mail, GraduationCap, Compass, CalendarDays, AlertTriangle, LogOut } from "lucide-react";

const EXPERIENCE_LABEL = { BEGINNER: "Beginner", INTERMEDIATE: "Intermediate", ADVANCED: "Advanced" };
const TRACK_LABEL = { GENERAL: "General", COMBAT: "Combat", NAVIGATION: "Navigation", ENGINEERING: "Engineering" };

/**
 * 🪪 PILOT PROFILE — Day 4's "pilot profile page shell," real instead of a
 * mock-up: it fetches GET /api/profile (session-identified server-side,
 * see src/app/api/profile/route.js) and renders whatever comes back, with
 * genuine loading/error states instead of placeholder numbers.
 */
export default function PilotProfilePanel({ open, onClose }) {
  const { disconnectPilot, playSystemSound } = usePilot();
  const [status, setStatus] = useState("loading"); // loading | loaded | error
  const [profile, setProfile] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const dialogRef = useRef(null);

  useFocusTrap(dialogRef, open, () => { playSystemSound("CLOSE"); onClose(); });

  useEffect(() => {
    if (!open) return;
    setStatus("loading");
    setErrorMsg("");
    fetch("/api/profile")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || "Couldn't load your profile.");
        return data;
      })
      .then((data) => {
        setProfile(data);
        setStatus("loaded");
      })
      .catch((err) => {
        setErrorMsg(err.message || "Couldn't load your profile.");
        setStatus("error");
      });
  }, [open]);

  if (!open) return null;

  const close = () => {
    playSystemSound("CLOSE");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[140] font-mono flex items-start sm:items-center justify-center overflow-y-auto py-8 px-4" role="dialog" aria-modal="true" aria-label="Pilot profile">
      <button aria-label="Close pilot profile" onClick={close} className="fixed inset-0 w-full h-full bg-black/75 backdrop-blur-sm cursor-default" />

      <div ref={dialogRef} className="relative w-full max-w-[420px] my-auto animate-palette-in">
        <div className="scope-frame scope-glow-lg border border-cyan-500/30 bg-slate-950/95 backdrop-blur-xl overflow-hidden relative">
          <div className="absolute inset-0 bg-scanlines opacity-[0.02] pointer-events-none" />

          <button onClick={close} aria-label="Close" className="absolute top-4 right-4 p-1 text-slate-600 hover:text-slate-300 transition-colors cursor-pointer z-10">
            <X className="w-4 h-4" />
          </button>

          <div className="p-7 sm:p-8 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-400/10 to-blue-500/5">
                <UserRound className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <p className="text-[9px] text-cyan-500 tracking-[0.35em] uppercase">Pilot Dossier</p>
                <h2 className="font-scope text-base font-bold tracking-wide text-white uppercase">
                  {status === "loaded" ? profile.callsign : "Pilot Profile"}
                </h2>
              </div>
            </div>

            {status === "loading" && (
              <div className="space-y-3 animate-pulse" aria-live="polite" aria-busy="true">
                <div className="h-3 bg-slate-800/80 rounded w-3/4" />
                <div className="h-3 bg-slate-800/80 rounded w-1/2" />
                <div className="h-3 bg-slate-800/80 rounded w-2/3" />
                <div className="h-3 bg-slate-800/80 rounded w-1/3" />
              </div>
            )}

            {status === "error" && (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-950/30 px-3 py-2.5 text-xs text-rose-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            {status === "loaded" && profile && (
              <div className="space-y-3 text-left">
                <ProfileRow icon={UserRound} label="Name" value={`${profile.firstName} ${profile.lastName}`} />
                <ProfileRow icon={Mail} label="Email" value={profile.email} />
                <ProfileRow icon={GraduationCap} label="Experience" value={EXPERIENCE_LABEL[profile.experienceLevel] || profile.experienceLevel} />
                <ProfileRow icon={Compass} label="Training Track" value={TRACK_LABEL[profile.specialization] || profile.specialization} />
                <ProfileRow
                  icon={CalendarDays}
                  label="Member Since"
                  value={new Date(profile.memberSince).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                />
              </div>
            )}

            <button
              onClick={() => { disconnectPilot(); close(); }}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Disconnect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-900 pb-2.5">
      <Icon className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[9px] uppercase tracking-[0.15em] text-slate-500">{label}</div>
        <div className="text-sm text-slate-200 truncate">{value}</div>
      </div>
    </div>
  );
}
