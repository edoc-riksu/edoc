"use client";
import React, { useState, useEffect, useMemo } from "react";
import { usePilot } from "../context/PilotContext";
import { findSector, LESSON_XP } from "../lib/planetarySystem";
import { evaluateSubmission } from "../lib/submissionValidator";
import CombatViewport from "./ui/CombatViewport";
import {
  ShieldCheck, Cpu, Sliders, Play, AlertCircle, RefreshCw, Layers, Trophy,
  ChevronLeft, ChevronRight, List, X, Lock, CheckCircle2, HelpCircle, Sparkles, SendHorizontal,
  Radar, Swords, GraduationCap, Radio
} from "lucide-react";

/**
 * 💻 CODE TERMINAL — the actual lesson-taking screen, restructured to
 * follow Codédex's own exercise page: instructions on the left, a code
 * buffer + Run/Submit + output on the right, a persistent bottom bar
 * carrying position/XP/Back/Next, and hints that unlock progressively
 * instead of handing over the answer up front.
 *
 * 🛰️ TACTICAL DECK PASS — the same screen restyled as a weapon-ready
 * starship deck, with a combat canopy viewport wired to the *outcome* of
 * `evaluateSubmission` only. `fireSignal`/`hitSignal` are bumped strictly
 * inside the existing pass/fail branches below, after grading has already
 * happened — this never changes what a passing or failing submission is.
 */
const PROCTORED_SECONDS = 600; // 10 minutes per proctored session

// Mode → combat-deck flavor label + icon, purely cosmetic chrome around
// the same `pilotMode` the app already tracks.
const MODE_DECK = {
  PRACTICE: { label: "Practice Run // Asteroid Belt Transit", icon: Radar, accent: "text-blue-400" },
  RANKED: { label: "Ranked Duel // Rival Contact Tracked", icon: Swords, accent: "text-cyan-400" },
  PROCTORED: { label: "Proctored Sortie // Lockdown Active", icon: ShieldCheck, accent: "text-rose-400" },
  CAMPUS: { label: "Campus Telemetry // Instructor Relay", icon: GraduationCap, accent: "text-emerald-400" }
};

export default function CodeTerminal() {
  const {
    selectedLanguage, setSelectedLanguage, advanceLesson, creditFuelCells, pilotProgress, playSystemSound, pushToast,
    pilotMode, markPracticeCleared, practiceTargetIndex, setPracticeTargetIndex, addSalvageArtifact
  } = usePilot();

  const sector = findSector(selectedLanguage || "Python Engine Core") || findSector("Python Engine Core");
  const currentChapterIndex = pilotProgress[sector.id] || 0;
  const isSectorMastered = currentChapterIndex >= sector.totalLessons;
  const isPractice = pilotMode === "PRACTICE";
  const isProctored = pilotMode === "PROCTORED";
  const deckMode = MODE_DECK[pilotMode] || MODE_DECK.PRACTICE;

  // 🛰️ COMBAT DECK SIGNALS — purely decorative counters. Each one is bumped
  // exactly once, inside the existing PASSED / FAILED branches of
  // handleSubmit below, strictly after evaluateSubmission has already
  // decided the outcome. Nothing here participates in grading.
  const [fireSignal, setFireSignal] = useState(0);
  const [hitSignal, setHitSignal] = useState(0);
  const [shaking, setShaking] = useState(false);
  useEffect(() => {
    if (!shaking) return undefined;
    const t = window.setTimeout(() => setShaking(false), 420);
    return () => window.clearTimeout(t);
  }, [shaking]);

  // Which exercise is on screen right now — defaults to the live frontier
  // (or, in Practice mode, whichever exercise the pilot picked from
  // SectorDetail — see practiceTargetIndex). Back/Next can walk it across
  // any already-cleared exercise too, the way Codédex lets you revisit a
  // finished exercise from its checkmark row.
  const [viewIndex, setViewIndex] = useState(() => {
    if (isPractice && practiceTargetIndex != null) return Math.min(practiceTargetIndex, sector.totalLessons - 1);
    return Math.min(currentChapterIndex, sector.totalLessons - 1);
  });
  const [inputBuffer, setInputBuffer] = useState("");
  const [terminalLogs, setTerminalLogs] = useState([
    "SYS_LOG // Core validation pipeline linked successfully.",
    "READY // Awaiting system script parsing allocations..."
  ]);
  const [isCompiling, setIsCompiling] = useState(false);
  const [hintsRevealed, setHintsRevealed] = useState(0); // 0..3
  const [drawerOpen, setDrawerOpen] = useState(false);

  // 🔒 PROCTORED LOCKDOWN — fullscreen, paste-blocked, timed. All genuinely
  // client-side; the certificate it leads to is clearly marked unverified
  // (see the toast on sector completion below) until real proctored
  // identity/integrity checking exists on a backend.
  const [proctoredArmed, setProctoredArmed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(PROCTORED_SECONDS);
  const [fullscreenWarning, setFullscreenWarning] = useState(false);
  const proctoredTimeUp = isProctored && proctoredArmed && secondsLeft <= 0;

  // Fresh sector → land on the right exercise; clear the scratch buffer,
  // hints and any proctored session state so a previous lesson's work
  // never bleeds into the next one.
  useEffect(() => {
    if (isPractice && practiceTargetIndex != null) {
      setViewIndex(Math.min(practiceTargetIndex, sector.totalLessons - 1));
      setPracticeTargetIndex(null);
    } else {
      setViewIndex(Math.min(pilotProgress[sector.id] || 0, sector.totalLessons - 1));
    }
    setInputBuffer("");
    setHintsRevealed(0);
    setProctoredArmed(false);
    setSecondsLeft(PROCTORED_SECONDS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sector.id]);

  // Proctored countdown — a real per-second timer, not a decorative label.
  useEffect(() => {
    if (!isProctored || !proctoredArmed || secondsLeft <= 0) return undefined;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [isProctored, proctoredArmed, secondsLeft]);

  // Fullscreen is a hard browser control — Escape always exits it and no
  // page can prevent that. Detect it honestly instead of fighting it.
  useEffect(() => {
    if (!isProctored) return undefined;
    const handler = () => setFullscreenWarning(proctoredArmed && !document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, [isProctored, proctoredArmed]);

  // Leaving Proctored mode (or this screen entirely) always releases fullscreen.
  useEffect(() => {
    if (!isProctored && typeof document !== "undefined" && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, [isProctored]);
  useEffect(() => {
    return () => {
      if (typeof document !== "undefined" && document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);

  const beginProctoredSession = () => {
    setProctoredArmed(true);
    setSecondsLeft(PROCTORED_SECONDS);
    setFullscreenWarning(false);
    playSystemSound("CLICK");
    const el = typeof document !== "undefined" ? document.documentElement : null;
    if (el?.requestFullscreen) {
      el.requestFullscreen().catch(() => {
        pushToast({ title: "Fullscreen blocked", body: "Your browser blocked fullscreen — the timer and paste-block still apply.", tone: "info", voice: null });
      });
    }
  };

  const viewingLive = viewIndex === currentChapterIndex && !isSectorMastered;
  const viewingCleared = viewIndex < currentChapterIndex || isSectorMastered;
  const canAttempt = isPractice || viewingLive;
  const lessonData = sector.lessons[Math.min(viewIndex, sector.lessons.length - 1)];
  const progressPercent = Math.round((Math.min(currentChapterIndex, sector.totalLessons) / sector.totalLessons) * 100);

  const hints = useMemo(() => {
    if (!lessonData) return [];
    const kw = lessonData.requiredKeyword || "";
    return [
      "Re-read the brief above — the answer is a single line of code that matches its description.",
      `The required token has the shape: "${kw.slice(0, Math.max(1, Math.ceil(kw.length * 0.4)))}…"`,
      `Exact required token: "${kw}"`
    ];
  }, [lessonData]);

  const handleRun = () => {
    if (isCompiling) return;
    if (!inputBuffer.trim()) {
      setTerminalLogs((prev) => [...prev, "ERR_CORE >> Buffer is empty — nothing to run."]);
      playSystemSound("ERROR");
      return;
    }
    setIsCompiling(true);
    setTerminalLogs((prev) => [...prev, "EXEC_RUN // Parsing allocation vectors..."]);
    setTimeout(() => {
      setIsCompiling(false);
      setTerminalLogs((prev) => [
        ...prev,
        "STDOUT >> Script parsed — no structural faults detected.",
        "STDOUT >> Ready for submission when you're confident in the result."
      ]);
    }, 650);
  };

  const handleSubmit = async () => {
    if (!canAttempt || isCompiling || !inputBuffer.trim() || proctoredTimeUp || (isProctored && !proctoredArmed)) return;
    setIsCompiling(true);
    setTerminalLogs((prev) => [...prev, "EXEC_SUBMIT // Running verification pass..."]);

    // Non-Negotiables Pass (Phase 05, extended to TypeScript): Python,
    // JavaScript and TypeScript lessons run for real in a sandbox — damage
    // comes from a failing test, not a keyword slip. Go/Rust/SQL still use
    // the legacy substring check (see submissionValidator.js) until each
    // has a real runtime too.
    const outcome = await evaluateSubmission(sector.id, viewIndex, lessonData, inputBuffer);
    {
      const isCorrect = outcome.passed;
      setIsCompiling(false);

      if (outcome.mode === "tests") {
        outcome.results.forEach((r) => {
          setTerminalLogs((prev) => [
            ...prev,
            r.pass ? `TEST_PASS >> ${r.description}` : `TEST_FAIL >> ${r.description}${r.error ? ` — ${r.error}` : ""}`
          ]);
        });
      } else if (outcome.degraded) {
        setTerminalLogs((prev) => [...prev, `SYS_LOG >> ${sector.short} sandbox unavailable this session — falling back to a basic check.`]);
      }

      if (isCorrect) {
        // 🛰️ Combat deck: a verified PASS fires the player volley. Read-only —
        // fires off the same `isCorrect` the real grading path already computed.
        setFireSignal((n) => n + 1);
        if (viewingLive) {
          // Exact frontier clear — real progress, exactly as before.
          const willMasterSector = currentChapterIndex + 1 >= sector.totalLessons;
          setTerminalLogs((prev) => [
            ...prev,
            "STDOUT >> Verification check: PASSED.",
            `STDOUT >> +${LESSON_XP} XP credited to your pilot profile ledger.`,
            "SYS_LOG >> Advancing flight level to next orbital segment."
          ]);
          advanceLesson(selectedLanguage || "Python Engine Core");
          creditFuelCells(100);
          playSystemSound("SUCCESS");
          // Salvage artifact — real proof of the pilot's own submitted code,
          // captured before the buffer gets flushed below.
          addSalvageArtifact({
            sectorId: sector.id,
            sectorName: sector.name,
            lessonTitle: lessonData.title,
            concept: lessonData.concept,
            code: inputBuffer
          });
          pushToast({
            title: "Validation passed",
            body: `+${LESSON_XP} XP earned. Flight level advanced.`,
            tone: "reward",
            voice: null
          });
          if (willMasterSector && isProctored) {
            pushToast({
              title: "Proctored certificate — unverified",
              body: `${sector.short} sector cleared under proctored conditions. This certificate is unverified until real backend issuance exists.`,
              tone: "reward",
              voice: null
            });
          }
        } else if (isPractice && viewIndex > currentChapterIndex) {
          // Out-of-frontier practice clear — never gate practice, but never
          // let it inflate the sequential frontier certificates key off.
          markPracticeCleared(sector.id, viewIndex);
          creditFuelCells(10);
          playSystemSound("SUCCESS");
          setTerminalLogs((prev) => [
            ...prev,
            "STDOUT >> Verification check: PASSED (practice — ahead of your frontier).",
            "STDOUT >> +10 fuel cells credited. No flight level change — reach it in order to log real progress."
          ]);
          pushToast({
            title: "Practice cleared",
            body: "Nice work — this one's ahead of your frontier, so it's not logged as official progress. +10 fuel cells.",
            tone: "reward",
            voice: null
          });
        } else {
          // Re-practicing an already-cleared exercise — positive feedback, no reward.
          playSystemSound("SUCCESS");
          setTerminalLogs((prev) => [...prev, "STDOUT >> Verification check: PASSED (review — already cleared)."]);
          pushToast({ title: "Still correct", body: "Already cleared — good refresher, no extra reward.", tone: "info", voice: null });
        }
        setInputBuffer("");
        setHintsRevealed(0);
        setViewIndex((i) => Math.min(i + 1, sector.totalLessons - 1));
      } else if (outcome.mode === "tests") {
        // Real damage from a real failing test — a syntax slip that
        // doesn't change behavior (whitespace, comments, var order) never
        // fails here; an actual wrong or missing behavior does.
        const failed = outcome.results.filter((r) => !r.pass);
        const firstFail = failed[0];
        playSystemSound("ERROR");
        // 🛰️ Combat deck: a real failing test draws enemy cannon fire + a
        // canopy rumble. Read-only reaction to the outcome above.
        setHitSignal((n) => n + 1);
        setShaking(true);
        pushToast({
          title: `${failed.length} of ${outcome.results.length} test${outcome.results.length === 1 ? "" : "s"} failed`,
          body: firstFail ? `${firstFail.description}${firstFail.error ? ` — ${firstFail.error}` : ""}` : "Verification failed.",
          tone: "danger",
          voice: null
        });
      } else {
        setTerminalLogs((prev) => [
          ...prev,
          "ERR_CORE >> Parameter mismatch error.",
          `ERR_CORE >> Missing required vector descriptor token: "${lessonData.requiredKeyword}"`
        ]);
        playSystemSound("ERROR");
        // 🛰️ Combat deck: a structural/compile fault reads the same as a
        // hostile strike on the canopy — same read-only signal as above.
        setHitSignal((n) => n + 1);
        setShaking(true);
        pushToast({
          title: "Compile fault",
          body: `Buffer is missing the required token "${lessonData.requiredKeyword}".`,
          tone: "danger",
          voice: null
        });
      }
    }
  };

  const goBack = () => setViewIndex((i) => Math.max(0, i - 1));
  // Practice mode never gates browsing ahead; every other mode still caps
  // Next at the real frontier, exactly as before.
  const goNext = () => setViewIndex((i) => Math.min(i + 1, isPractice ? sector.totalLessons - 1 : currentChapterIndex, sector.totalLessons - 1));
  const nextDisabled = isPractice ? viewIndex >= sector.totalLessons - 1 : viewIndex >= currentChapterIndex || isSectorMastered;
  const submitBlocked = isCompiling || !inputBuffer.trim() || (!isPractice && (isSectorMastered || !viewingLive)) || proctoredTimeUp || (isProctored && !proctoredArmed);

  return (
    <div className="flex flex-col h-full gap-3 text-cyan-400 font-mono animate-fade-in">
      {/* BREADCRUMB + SECTOR PROGRESS */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => setSelectedLanguage(null)}
          className="flex items-center gap-1 font-scope text-[10px] font-semibold uppercase tracking-wider text-slate-500 hover:text-cyan-400 transition-colors duration-200 cursor-pointer shrink-0"
        >
          <ChevronLeft className="w-3 h-3" /> Flight Academy
        </button>
        <span className="text-slate-700 text-[10px] shrink-0">/</span>
        <span className="font-scope text-[10px] font-bold uppercase tracking-wider text-slate-300 truncate">{sector.name}</span>
        <div className="flex-1 h-1 bg-slate-900 rounded-full overflow-hidden min-w-[60px]">
          <div className="h-full bg-cyan-400 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
        </div>
        <span className="text-[10px] font-bold text-slate-500 shrink-0">{progressPercent}%</span>
        <div className={`hidden sm:flex items-center gap-1.5 shrink-0 font-scope text-[9px] font-bold uppercase tracking-widest ${deckMode.accent}`} title="Operational layout mode">
          <deckMode.icon className="w-3 h-3" />
          <span className="truncate max-w-[220px]">{deckMode.label}</span>
        </div>
      </div>

      {/* PROCTORED LOCKDOWN STATUS — fullscreen + paste-block + timer, all client-side.
          🛰️ Tactical deck pass: pulsing red hazard border once a session is
          armed, and the countdown blows up into a cockpit emergency digit
          readout — same secondsLeft/proctoredArmed state as before. */}
      {isProctored && (
        <div className={`scope-frame scope-frame-sm shrink-0 relative px-3 py-2 border flex items-center justify-between gap-3 flex-wrap overflow-hidden ${
          proctoredTimeUp ? "border-rose-500/50 bg-rose-950/20" : proctoredArmed ? "border-rose-500/40 bg-rose-950/10 animate-proctored-border" : "border-amber-500/30 bg-amber-950/10"
        }`}>
          <div className="flex items-center gap-2 text-[10px] font-scope font-bold uppercase tracking-wide">
            <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${proctoredTimeUp ? "text-rose-400" : "text-amber-400"}`} />
            {!proctoredArmed ? (
              <span className="text-amber-300">Proctored — fullscreen, no pasting, timed. Certificate marked unverified.</span>
            ) : proctoredTimeUp ? (
              <span className="text-rose-400">Time's up — submissions locked for this session.</span>
            ) : (
              <span className="text-rose-300/90">Session active — lockdown engaged</span>
            )}
          </div>
          {!proctoredArmed ? (
            <button
              onClick={beginProctoredSession}
              className="scope-btn px-3 py-1 border border-amber-500/40 bg-amber-950/20 text-amber-300 hover:bg-amber-400 hover:text-black transition-all font-scope text-[10px] font-bold uppercase tracking-widest cursor-pointer shrink-0"
            >
              Begin Session
            </button>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              {fullscreenWarning && (
                <span className="text-[9px] text-rose-400 font-scope font-bold uppercase">Fullscreen exited — integrity flag raised</span>
              )}
              <span className={`font-mono text-lg font-black tabular-nums leading-none ${proctoredTimeUp ? "text-rose-500" : "text-rose-400 animate-emergency-digits"}`}>
                {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:{String(secondsLeft % 60).padStart(2, "0")}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 🎯 RANKED — decorative split-presence gauge. No live opponent exists
          on this screen (a real duel runs in the Ranked ladder's own view);
          this reads only your real sector progress against an illustrative
          "rival presence" baseline — flavor chrome, not a second scoring path. */}
      {pilotMode === "RANKED" && (
        <div className="scope-frame scope-frame-sm shrink-0 px-3 py-2 border border-cyan-500/25 bg-slate-950/50 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[9px] font-scope font-bold uppercase tracking-widest">
            <span className="text-cyan-400 flex items-center gap-1"><Swords className="w-3 h-3" /> You</span>
            <span className="text-slate-500">Rival Presence Tracked</span>
          </div>
          <div className="relative w-full h-2 bg-slate-900 border border-slate-800/60 rounded-xs overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-cyan-500/70" style={{ width: `${progressPercent}%` }} />
            <div className="absolute inset-y-0 right-0 bg-rose-500/50" style={{ width: `${Math.max(6, 100 - progressPercent)}%` }} />
            <div className="absolute inset-y-0 w-10 bg-white/10 animate-ranked-sheen" />
          </div>
        </div>
      )}

      {/* 🏫 CAMPUS — light telemetry-matrix flavor strip. Roster/heatmap
          logic stays in CampusDashboard.js; this only echoes this sector's
          own already-computed progress, styled as an instructor relay line. */}
      {pilotMode === "CAMPUS" && (
        <div className="scope-frame scope-frame-sm shrink-0 px-3 py-2 border border-emerald-500/25 bg-emerald-950/10 flex items-center gap-3 animate-campus-flicker">
          <GraduationCap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="font-mono text-[10px] text-emerald-300 tracking-wide truncate">
            RELAY // {sector.short} matrix {currentChapterIndex}/{sector.totalLessons} · fleet sync nominal
          </span>
        </div>
      )}

      {/* ⚔️ CINEMATIC ACTION VIEWPORT — canopy glass battle scene, tied to
          the real evaluateSubmission outcome below (fireSignal/hitSignal),
          never to anything that decides that outcome. */}
      <div className="scope-frame scope-frame-lg shrink-0 relative h-40 sm:h-48 lg:h-52 border border-cyan-500/20 bg-black overflow-hidden shadow-2xl">
        <CombatViewport accent={sector.hex} mode={pilotMode} fireSignal={fireSignal} hitSignal={hitSignal} />
        <div className="pointer-events-none absolute top-0 left-0 right-0 px-3 py-1.5 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent">
          <span className="font-scope text-[9px] font-bold uppercase tracking-widest text-cyan-300/90">Canopy Combat Feed // {sector.short}</span>
          <span className="font-scope text-[8px] font-bold uppercase tracking-widest text-slate-400/80">LIVE</span>
        </div>
        <div className="pointer-events-none absolute inset-x-3 bottom-1.5 h-[2px] rounded-full bg-[length:200%_100%] bg-gradient-to-r from-transparent via-amber-400/70 to-transparent animate-tac-scan" />
      </div>

      <div className={`flex flex-col lg:flex-row flex-1 gap-4 min-h-0 ${shaking ? "animate-combat-shake" : ""}`}>
        {/* 📊 LEFT PANEL: LESSON MANIFEST CRITERIA — Tac-Feed dark glass panel */}
        <div className="scope-frame scope-frame-lg w-full lg:w-2/5 bg-slate-950/80 backdrop-blur-md p-4 pt-5 border border-slate-800 flex flex-col justify-between shadow-xl overflow-y-auto">
          <div className="space-y-3">
            <div className="relative font-scope text-[10px] text-amber-500 font-semibold uppercase tracking-widest border-b border-slate-800 pb-1.5 flex justify-between items-center">
              <span>Flight Lesson Manifest</span>
              <Layers className="w-3 h-3" />
              <span className="pointer-events-none absolute -bottom-px left-0 right-0 h-px bg-[length:200%_100%] bg-gradient-to-r from-transparent via-amber-400/80 to-transparent animate-tac-scan" />
            </div>

            {isPractice && (
              <div
                className="scope-frame scope-frame-sm px-2.5 py-2 border border-blue-500/25 bg-blue-950/10 flex items-center gap-2 overflow-hidden"
                title="Continuous help-data feed — Practice mode never gates an attempt"
              >
                <Radio className="w-3 h-3 text-blue-400 shrink-0" />
                <div
                  className="flex-1 h-3 opacity-70 animate-data-line-scroll"
                  style={{
                    backgroundImage: "repeating-linear-gradient(0deg, rgba(96,165,250,0.55) 0px, rgba(96,165,250,0.55) 2px, transparent 2px, transparent 8px)"
                  }}
                />
                <span className="text-[8px] font-scope font-bold uppercase tracking-widest text-blue-400/80 shrink-0">Data Link</span>
              </div>
            )}

            <h2 className="font-scope text-sm font-semibold text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
              {isSectorMastered && !isPractice && <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
              {isSectorMastered && !isPractice ? `${sector.short} // Sector Fully Calibrated` : lessonData.title}
              {(!isSectorMastered || isPractice) && ` (Exercise ${viewIndex + 1}/${sector.totalLessons})`}
            </h2>

            {viewingCleared && !isSectorMastered && (
              <div className="flex items-center gap-1.5 text-[10px] font-scope font-bold uppercase tracking-wide text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Already cleared — reviewing
              </div>
            )}
            {isPractice && !viewingLive && !viewingCleared && (
              <div className="flex items-center gap-1.5 text-[10px] font-scope font-bold uppercase tracking-wide text-amber-400">
                <Sparkles className="w-3.5 h-3.5" /> Practice — ahead of your frontier, won't skip it
              </div>
            )}

            <div className="scope-frame scope-frame-sm p-3 bg-slate-950/40 border border-slate-900/60 text-[11px] text-slate-400 font-sans leading-relaxed">
              {isSectorMastered && !isPractice
                ? "Every flight level in this sector has been cleared. Disengage and select a new coordinate node to continue training."
                : lessonData.prompt}
            </div>
          </div>

          {/* PROGRESSIVE HINT SYSTEM — three tiers, each more direct than the last */}
          {(!isSectorMastered || isPractice) && (
            <div className="mt-4 pt-3 border-t border-slate-900/60 space-y-2">
              <div className="flex justify-between items-center text-[8px] font-black tracking-widest text-slate-500 uppercase">
                <span>Need a nudge?</span>
                <span>{hintsRevealed}/3 hints used</span>
              </div>
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <button
                    key={i}
                    onClick={() => setHintsRevealed((h) => Math.max(h, i + 1))}
                    disabled={hintsRevealed > i}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 border font-scope text-[9px] font-bold uppercase tracking-wide transition-all cursor-pointer disabled:cursor-default ${
                      hintsRevealed > i ? "border-amber-500/30 bg-amber-950/10 text-amber-500/60" : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-cyan-500/40 hover:text-cyan-400"
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
          )}
        </div>

        {/* 💻 CENTER & RIGHT PANEL: SCREEN VISOR & LOGS */}
        <div className="flex-1 flex flex-col gap-4 min-h-[300px] lg:min-h-0">
          <div className="scope-frame scope-frame-lg bg-slate-950/80 backdrop-blur-md border border-slate-800 relative flex flex-col overflow-hidden shadow-2xl group focus-within:border-amber-500/60 transition-colors">
            <div className="absolute inset-0 bg-scanlines pointer-events-none opacity-[0.015]"></div>

            <div className="relative px-3 py-1.5 bg-slate-900/50 border-b border-slate-800 font-mono text-[10px] text-amber-500 font-semibold tracking-widest uppercase flex justify-between items-center">
              <span>Avionics Buffer Entry Port // Main</span>
              <Cpu className="w-3 h-3 text-amber-600/70 group-focus-within:text-amber-400 transition-colors" />
              <span className="pointer-events-none absolute -bottom-px left-0 right-0 h-px bg-[length:200%_100%] bg-gradient-to-r from-transparent via-amber-400/70 to-transparent animate-tac-scan" />
            </div>

            <textarea
              value={inputBuffer}
              onChange={(e) => setInputBuffer(e.target.value)}
              onPaste={(e) => { if (isProctored) e.preventDefault(); }}
              disabled={(isSectorMastered && !isPractice) || (isProctored && (!proctoredArmed || proctoredTimeUp))}
              placeholder={
                isProctored && !proctoredArmed
                  ? "// Begin the proctored session above to unlock this buffer."
                  : proctoredTimeUp
                  ? "// Time's up — this buffer is locked."
                  : isSectorMastered && !isPractice
                  ? "// Sector fully calibrated — no further validation runs required."
                  : "// Input your tracking alignment script formulas directly into this buffer console matrix..."
              }
              className="flex-1 w-full bg-transparent p-4 outline-hidden resize-none font-mono text-xs text-slate-200 placeholder-slate-700 leading-relaxed disabled:opacity-40"
            />

            <div className="px-3 py-2 bg-slate-950/90 border-t border-slate-900 flex justify-between items-center gap-2">
              <button
                onClick={() => setInputBuffer("")}
                className="scope-btn scope-frame scope-frame-sm px-2.5 py-1 font-scope text-[10px] font-semibold border border-slate-900 bg-slate-900/30 text-slate-500 hover:text-slate-300 transition duration-200 cursor-pointer shrink-0"
              >
                <RefreshCw className="w-2.5 h-2.5 inline mr-1" /> Flush Buffer
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRun}
                  disabled={isCompiling || (isSectorMastered && !isPractice)}
                  className="scope-btn scope-frame scope-frame-sm px-3 py-1.5 font-scope text-[11px] font-semibold uppercase tracking-widest border border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-600 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Play className="w-2.5 h-2.5 fill-current" /> Run
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitBlocked}
                  title={!isPractice && !viewingLive && !isSectorMastered ? "Only the current flight level can be submitted" : undefined}
                  className={`scope-btn scope-frame scope-frame-sm px-4 py-1.5 font-scope text-[11px] font-semibold uppercase tracking-widest border transition-all cursor-pointer flex items-center gap-1.5 ${
                    submitBlocked
                      ? "bg-slate-950 border-slate-900 text-slate-700 cursor-not-allowed"
                      : isCompiling
                      ? "bg-slate-900 border-slate-800 text-slate-600 animate-pulse"
                      : "bg-cyan-950/40 border-cyan-500/40 text-cyan-400 hover:bg-cyan-400 hover:text-black hover:border-cyan-400 active:scale-[0.98] scope-glow"
                  }`}
                >
                  <SendHorizontal className="w-2.5 h-2.5" />
                  <span>{proctoredTimeUp ? "Time's Up" : isSectorMastered && !isPractice ? "Sector Complete" : isCompiling ? "Verifying..." : isPractice && viewIndex > currentChapterIndex ? "Submit Practice" : "Submit Answer"}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="scope-frame h-32 relative bg-slate-950/80 backdrop-blur-xs p-3 pt-4 border border-slate-800 flex flex-col justify-between font-mono text-[10px] overflow-hidden shadow-inner">
            <div className="relative font-mono text-[9px] text-amber-500 font-semibold tracking-widest uppercase border-b border-slate-800 pb-1 flex items-center justify-between">
              <span>STDOUT Terminal Telemetry Stream Logs</span>
              <Sliders className="w-2.5 h-2.5 text-amber-600/70" />
              <span className="pointer-events-none absolute -bottom-px left-0 right-0 h-px bg-[length:200%_100%] bg-gradient-to-r from-transparent via-amber-400/70 to-transparent animate-tac-scan" />
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 py-1 pr-1 font-mono text-[10px] leading-relaxed">
              {terminalLogs.map((log, lIdx) => {
                const isError = log.includes("ERR_CORE");
                const isPass = log.includes("PASSED");
                return (
                  <div key={lIdx} className={`flex items-start gap-1.5 truncate ${isError ? "text-rose-500" : isPass ? "text-emerald-400" : "text-amber-500/70"}`}>
                    {isError ? <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" /> : <ShieldCheck className="w-3 h-3 shrink-0 mt-0.5" />}
                    <span>{log}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* PERSISTENT BOTTOM BAR — position, XP, chapter drawer, Back/Next */}
      <div className="scope-frame scope-frame-sm shrink-0 relative bg-slate-950/80 backdrop-blur-md border border-slate-900 px-3 py-2 flex items-center justify-between gap-3">
        {drawerOpen && (
          <div className="absolute bottom-full left-0 mb-2 w-72 scope-frame scope-frame-sm bg-slate-950/97 border border-slate-800 shadow-2xl p-2 space-y-1 z-20">
            <div className="flex items-center justify-between px-1 pb-1 mb-1 border-b border-slate-900">
              <span className="font-scope text-[9px] font-bold uppercase tracking-widest text-slate-500">Core Directives</span>
              <button onClick={() => setDrawerOpen(false)} className="text-slate-600 hover:text-slate-300 cursor-pointer"><X className="w-3 h-3" /></button>
            </div>
            {sector.lessons.map((l, idx) => {
              const state = idx < currentChapterIndex || isSectorMastered
                ? "cleared"
                : idx === currentChapterIndex
                ? "current"
                : isPractice
                ? "practice"
                : "locked";
              return (
                <button
                  key={idx}
                  disabled={state === "locked"}
                  onClick={() => { setViewIndex(idx); setDrawerOpen(false); }}
                  className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 text-left transition-colors cursor-pointer disabled:cursor-not-allowed ${
                    idx === viewIndex ? "bg-cyan-950/30 border border-cyan-500/30" : "border border-transparent hover:bg-slate-900/50"
                  }`}
                >
                  <span className={`text-[10px] font-semibold truncate ${state === "locked" ? "text-slate-700" : "text-slate-300"}`}>{idx + 1}. {l.title}</span>
                  {state === "cleared" && <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />}
                  {state === "practice" && <span className="text-[8px] text-amber-500/80 font-black uppercase shrink-0">Practice</span>}
                  {state === "locked" && <Lock className="w-3 h-3 text-slate-700 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => setDrawerOpen((o) => !o)} className="scope-btn p-1.5 border border-slate-800 bg-slate-900/40 text-slate-400 hover:text-cyan-400 transition cursor-pointer shrink-0" title="Chapter list" aria-label="Chapter list">
            <List className="w-3.5 h-3.5" />
          </button>
          <div className="min-w-0">
            <div className="font-scope text-[11px] font-bold text-slate-200 truncate">{isSectorMastered && !isPractice ? "Sector Calibrated" : lessonData.title}</div>
            <div className="flex items-center gap-2 text-[9px] text-slate-500 font-bold uppercase">
              <span>Exercise {Math.min(viewIndex + 1, sector.totalLessons)} / {sector.totalLessons}</span>
              <span className="px-2 py-0.5 rounded-full border border-amber-500/25 bg-amber-950/20 text-amber-400">{LESSON_XP} XP</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={goBack}
            disabled={viewIndex === 0}
            className="scope-btn scope-frame scope-frame-sm px-3 py-1.5 font-scope text-[10px] font-bold uppercase tracking-wide border border-slate-800 bg-slate-900/40 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <ChevronLeft className="w-3 h-3" /> Back
          </button>
          <button
            onClick={goNext}
            disabled={nextDisabled}
            className="scope-btn scope-frame scope-frame-sm px-3 py-1.5 font-scope text-[10px] font-bold uppercase tracking-wide border border-slate-800 bg-slate-900/40 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
          >
            Next <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
