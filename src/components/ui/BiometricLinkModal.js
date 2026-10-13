"use client";
import React, { useEffect, useRef, useState } from "react";
import { usePilot } from "../../context/PilotContext";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { Fingerprint, ShieldCheck, X, ArrowRight, UserCheck, UserPlus, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { isValidEmail, isValidName } from "../../lib/callsign";

const SCAN_DURATION_MS = 1400;

// Copy that differs between the two flows below — the request each one
// sends (POST /api/auth/login vs /api/auth/signup) is genuinely different
// now (see handleSubmit), not just relabeled.
const MODE_COPY = {
  SIGNIN: {
    heading: "Returning Pilot — Biometric Link",
    body: "Relink your neural signature to resume training. Enter the callsign and password you registered with.",
    placeholder: "e.g. CADET_SOLO_1",
    cta: "Resume Link",
    endpoint: "/api/auth/login"
  },
  SIGNUP: {
    heading: "New Pilot — Biometric Registration",
    body: "Create a fresh neural signature for this cockpit. Pick a callsign and a password (6+ characters).",
    placeholder: "e.g. ROOKIE_PILOT",
    cta: "Create Link",
    endpoint: "/api/auth/signup"
  }
};

/**
 * 🔐 BIOMETRIC LINK — real sign-in/sign-up, not a client-side boolean.
 * Submits to /api/auth/login or /api/auth/signup (see src/app/api/auth/),
 * which hash/verify the password server-side and set a real signed
 * session cookie. `completeBiometricLink` still runs on success to sync
 * the rest of the app's local, device-only state (progress, fuel cells
 * etc. aren't server-backed yet — only identity is real so far).
 *
 * 🪪 SIGN-IN / SIGN-UP PASS — two explicitly named flows (Returning
 * Pilot / New Pilot), defaulting to whichever one this device's saved
 * progress suggests.
 */
export default function BiometricLinkModal() {
  const { biometricModalOpen, setBiometricModalOpen, completeBiometricLink, playSystemSound } = usePilot();
  const [phase, setPhase] = useState("INPUT"); // INPUT -> SCANNING -> LINKED
  const [authMode, setAuthMode] = useState("SIGNIN");
  const [callsignInput, setCallsignInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [linkedAs, setLinkedAs] = useState("");
  const [linkedFirstName, setLinkedFirstName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("BEGINNER");
  const [specialization, setSpecialization] = useState("GENERAL");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      setPasswordInput("");
      setConfirmPassword("");
      setFirstName("");
      setLastName("");
      setEmail("");
      setExperienceLevel("BEGINNER");
      setSpecialization("GENERAL");
      setAcceptedTerms(false);
      setShowPassword(false);
      setShowConfirmPassword(false);
      setErrorMsg("");
      // A device with saved progress has probably flown here before —
      // default to Returning Pilot; a clean device defaults to New Pilot.
      try {
        setAuthMode(localStorage.getItem("HUD_PILOT_PROGRESS") ? "SIGNIN" : "SIGNUP");
      } catch {
        setAuthMode("SIGNIN");
      }
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

  const runScan = async (e) => {
    e.preventDefault();
    if (phase !== "INPUT") return;
    setErrorMsg("");
    setPhase("SCANNING");
    playSystemSound("CLICK");

    // Real request + the scan animation's minimum runtime, in parallel —
    // the cockpit flavor never has to wait longer than the slower of the
    // two, and a fast local response still reads as a deliberate scan.
    const minDelay = new Promise((resolve) => {
      const t = window.setTimeout(resolve, SCAN_DURATION_MS);
      timersRef.current.push(t);
    });

    let result;
    try {
      const [response] = await Promise.all([
        fetch(MODE_COPY[authMode].endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            authMode === "SIGNUP"
              ? {
                callsign: callsignInput.trim(),
                password: passwordInput,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim(),
                experienceLevel,
                specialization,
                acceptedTerms
              }
              : {
                callsign: callsignInput.trim(),
                password: passwordInput
              }
          )
        }),
        minDelay
      ]);
      result = await response.json();
      if (!response.ok) throw new Error(result?.error || "Link failed — try again.");
    } catch (err) {
      setPhase("INPUT");
      setPasswordInput("");
      setErrorMsg(err.message || "Link failed — check your connection and try again.");
      playSystemSound("ERROR");
      const t = window.setTimeout(() => inputRef.current?.focus(), 60);
      timersRef.current.push(t);
      return;
    }

    const clean = completeBiometricLink(result.callsign);
    setLinkedAs(clean);
    setLinkedFirstName(result.firstName || "");
    setPhase("LINKED");
    const t2 = window.setTimeout(() => setBiometricModalOpen(false), 1300);
    timersRef.current.push(t2);
  };

  return (
    <div
      className="fixed inset-0 z-[140] font-mono flex items-start sm:items-center justify-center overflow-y-auto py-8 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Biometric authentication"
    >
      <button
        aria-label="Close biometric link dialog"
        onClick={phase === "INPUT" ? close : undefined}
        className={`fixed inset-0 w-full h-full bg-black/75 backdrop-blur-sm ${phase === "INPUT" ? "cursor-none" : "cursor-default"}`}
      />

      <div ref={dialogRef} className="relative w-full max-w-[460px] my-auto animate-palette-in">
        <div className="scope-frame scope-glow-lg border border-cyan-500/30 bg-slate-950/95 backdrop-blur-xl overflow-hidden relative">
          <div className="absolute inset-0 bg-scanlines opacity-[0.02] pointer-events-none" />

          {phase === "INPUT" && (
            <button
              onClick={close}
              aria-label="Cancel biometric link"
              className="absolute top-4 right-4 p-1 text-slate-600 hover:text-slate-300 transition-colors cursor-pointer z-10"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <form onSubmit={runScan} className="p-7 sm:p-8 space-y-4 text-center">
            {phase === "INPUT" && (
              <div className="space-y-5 text-left">

                {/* Header */}
                <div className="text-center space-y-3">
                  <div className="flex justify-center">
                    <div className="p-4 rounded-2xl border border-cyan-400/30
                      bg-gradient-to-br from-cyan-400/10 to-blue-500/5
                      shadow-[0_0_30px_rgba(34,211,238,0.08)]">
                      <Fingerprint className="w-8 h-8 text-cyan-400" />
                    </div>
                  </div>

                  <div>
                    <p className="text-[9px] text-cyan-500 tracking-[0.35em] uppercase mb-2">
                      Pilot Authentication System
                    </p>

                    <h2 className="font-scope text-lg font-bold tracking-wider
                      text-white uppercase">
                      {authMode === "SIGNIN"
                        ? "Welcome Back, Pilot"
                        : "Initialize Your Profile"}
                    </h2>

                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      {authMode === "SIGNIN"
                        ? "Authenticate your identity to continue your training."
                        : "Create your pilot identity and configure your training profile."}
                    </p>
                  </div>
                </div>

                {/* Mode selector */}
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl
                  bg-slate-900/80 border border-slate-800">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={authMode === "SIGNIN"}
                    onClick={() => {
                      setAuthMode("SIGNIN");
                      setErrorMsg("");
                    }}
                    className={`flex items-center justify-center gap-2 rounded-lg
                      py-2.5 text-[10px] font-bold uppercase tracking-wider
                      transition-all ${authMode === "SIGNIN"
                        ? "bg-cyan-400/10 text-cyan-300 border border-cyan-400/20"
                        : "text-slate-500 hover:text-slate-300"
                      }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    Sign In
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={authMode === "SIGNUP"}
                    onClick={() => {
                      setAuthMode("SIGNUP");
                      setErrorMsg("");
                    }}
                    className={`flex items-center justify-center gap-2 rounded-lg
                      py-2.5 text-[10px] font-bold uppercase tracking-wider
                      transition-all ${authMode === "SIGNUP"
                        ? "bg-cyan-400/10 text-cyan-300 border border-cyan-400/20"
                        : "text-slate-500 hover:text-slate-300"
                      }`}
                  >
                    <UserPlus className="w-4 h-4" />
                    New Pilot
                  </button>
                </div>

                {/* Registration fields */}
                {authMode === "SIGNUP" && (
                  <div className="space-y-4">

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase
                          tracking-[0.15em] text-slate-400 mb-2">
                          First Name
                        </label>
                        <input
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="Jane"
                          autoComplete="given-name"
                          maxLength={60}
                          required
                          className="w-full rounded-lg bg-slate-900/70
                            border border-slate-800 focus:border-cyan-400/60
                            outline-none px-4 py-3 text-sm text-white
                            placeholder:text-slate-600 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase
                          tracking-[0.15em] text-slate-400 mb-2">
                          Last Name
                        </label>
                        <input
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Doe"
                          autoComplete="family-name"
                          maxLength={60}
                          required
                          className="w-full rounded-lg bg-slate-900/70
                            border border-slate-800 focus:border-cyan-400/60
                            outline-none px-4 py-3 text-sm text-white
                            placeholder:text-slate-600 transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase
                        tracking-[0.15em] text-slate-400 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="pilot@example.com"
                        autoComplete="email"
                        maxLength={254}
                        required
                        className="w-full rounded-lg bg-slate-900/70
                          border border-slate-800 focus:border-cyan-400/60
                          outline-none px-4 py-3 text-sm text-white
                          placeholder:text-slate-600 transition-colors"
                      />
                    </div>
                  </div>
                )}

                {/* Callsign */}
                <div>
                  <label className="block text-[10px] uppercase
                    tracking-[0.15em] text-slate-400 mb-2">
                    Pilot Callsign
                  </label>
                  <input
                    value={callsignInput}
                    onChange={(e) =>
                      setCallsignInput(e.target.value.toUpperCase())
                    }
                    placeholder="E.G. CADET_SOLO_1"
                    autoComplete="username"
                    maxLength={18}
                    required
                    className="w-full rounded-lg bg-slate-900/70
                      border border-slate-800 focus:border-cyan-400/60
                      outline-none px-4 py-3 text-sm text-white
                      placeholder:text-slate-600 tracking-wider
                      transition-colors"
                  />
                  <p className="text-[9px] text-slate-600 mt-1.5">
                    Your unique identity in the fleet.
                  </p>
                </div>

                {/* Experience and specialization */}
                {authMode === "SIGNUP" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase
                        tracking-wider text-slate-400 mb-2">
                        Experience
                      </label>
                      <select
                        value={experienceLevel}
                        onChange={(e) => setExperienceLevel(e.target.value)}
                        className="w-full rounded-lg bg-slate-900
                          border border-slate-800 focus:border-cyan-400/60
                          outline-none px-3 py-3 text-xs text-slate-200"
                      >
                        <option value="BEGINNER">Beginner</option>
                        <option value="INTERMEDIATE">Intermediate</option>
                        <option value="ADVANCED">Advanced</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase
                        tracking-wider text-slate-400 mb-2">
                        Training Track
                      </label>
                      <select
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        className="w-full rounded-lg bg-slate-900
                          border border-slate-800 focus:border-cyan-400/60
                          outline-none px-3 py-3 text-xs text-slate-200"
                      >
                        <option value="GENERAL">General</option>
                        <option value="COMBAT">Combat</option>
                        <option value="NAVIGATION">Navigation</option>
                        <option value="ENGINEERING">Engineering</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Password */}
                <div>
                  <label className="block text-[10px] uppercase
                    tracking-[0.15em] text-slate-400 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Minimum 6 characters"
                      autoComplete={
                        authMode === "SIGNIN"
                          ? "current-password"
                          : "new-password"
                      }
                      maxLength={72}
                      minLength={6}
                      required
                      className="w-full rounded-lg bg-slate-900/70
                        border border-slate-800 focus:border-cyan-400/60
                        outline-none pl-4 pr-11 py-3 text-sm text-white
                        placeholder:text-slate-600 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-500 hover:text-cyan-400 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {authMode === "SIGNUP" && (
                  <>
                    <div>
                      <label className="block text-[10px] uppercase
                        tracking-[0.15em] text-slate-400 mb-2">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter your password"
                          autoComplete="new-password"
                          maxLength={72}
                          minLength={6}
                          required
                          className="w-full rounded-lg bg-slate-900/70
                            border border-slate-800 focus:border-cyan-400/60
                            outline-none pl-4 pr-11 py-3 text-sm text-white
                            placeholder:text-slate-600 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((v) => !v)}
                          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                          className="absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-500 hover:text-cyan-400 transition-colors cursor-pointer"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {confirmPassword && passwordInput !== confirmPassword && (
                        <p className="text-[9px] text-rose-400 mt-1.5">Passwords don't match.</p>
                      )}
                    </div>

                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        required
                        className="mt-0.5 accent-cyan-400"
                      />
                      <span className="text-[10px] text-slate-400 leading-relaxed">
                        I agree to the terms of service and privacy policy.
                      </span>
                    </label>
                  </>
                )}

                {/* Error feedback */}
                {errorMsg && (
                  <div role="alert" className="flex items-start gap-2
                    rounded-lg border border-rose-500/30 bg-rose-950/30
                    px-3 py-2.5 text-xs text-rose-300">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {errorMsg}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={
                    !callsignInput.trim() ||
                    !passwordInput ||
                    (authMode === "SIGNUP" &&
                      (
                        !isValidName(firstName) ||
                        !isValidName(lastName) ||
                        !isValidEmail(email) ||
                        !confirmPassword ||
                        passwordInput !== confirmPassword ||
                        !acceptedTerms
                      ))
                  }
                  className="w-full flex items-center justify-center gap-2
                    rounded-lg bg-cyan-400 px-4 py-3.5
                    text-xs font-bold uppercase tracking-[0.2em]
                    text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.12)]
                    hover:bg-cyan-300 transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {authMode === "SIGNIN"
                    ? "Resume Mission"
                    : "Create Pilot Profile"}
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="flex items-center justify-center gap-2
                  text-[9px] text-slate-600 uppercase tracking-widest">
                  <ShieldCheck className="w-3 h-3 text-cyan-500" />
                  Secure Pilot Authentication
                </div>

              </div>
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
                  Welcome aboard, <span className="text-slate-200 font-bold">{linkedFirstName || linkedAs}</span>. Neural signature bound to this cockpit.
                </p>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
