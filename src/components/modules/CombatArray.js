"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { usePilot } from "../../context/PilotContext";
import { PLANETARY_SYSTEM } from "../../lib/planetarySystem";
import { hashSeed } from "../../lib/commsFeed";
import { evaluateSubmission } from "../../lib/submissionValidator";
import { ShieldAlert, Swords, Flame, Heart, Trophy, Skull, Clock, ChevronLeft, Zap, Info, GraduationCap } from "lucide-react";

// Distinct NPC roster from Ranked's — Combat is flavor-separate (win/loss
// record, not a rating ladder), but reuses the same deterministic-hash
// pattern for stable per-name behavior across renders.
const RIVAL_NAMES = ["Vector_Ghost", "Byte_Nebula", "Drift_Marlow", "Nova_Kestrel"];
function rivalSpeed(name) {
  return 800 + (hashSeed(`${name}_combat`) % 700); // "combat rating", faster opponents look higher
}

/**
 * A challenge pool pulled from every sector the pilot has actually started
 * (or the fleet's opening lessons, for a brand-new guest) — Battles test
 * what's already been trained on, same principle as Ranked's challenge pick.
 */
function buildChallengePool(pilotProgress) {
  const started = PLANETARY_SYSTEM.filter((s) => (pilotProgress[s.id] || 0) > 0);
  const source = started.length > 0 ? started : PLANETARY_SYSTEM;
  const pool = [];
  source.forEach((sector) => {
    const cap = Math.max(1, pilotProgress[sector.id] || 1);
    sector.lessons.slice(0, cap).forEach((lesson) => pool.push({ sector, lesson }));
  });
  return pool;
}

export default function CombatArray() {
  const { pilotProgress, pushToast, creditFuelCells, battleRecord, recordBattleResult } = usePilot();
  const [tab, setTab] = useState("SOLO"); // SOLO | DUEL

  return (
    <div className="flex flex-col h-full gap-4 text-cyan-400 font-mono animate-fade-in">
      <div className="flex items-center justify-between border-b border-slate-900 pb-2">
        <div>
          <h1 className="font-scope text-base font-semibold uppercase tracking-[0.15em] text-cyan-400 text-shadow-cyan flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            Combat Array
          </h1>
          <p className="text-[9px] text-slate-500 font-sans mt-0.5">Timed hazard runs and scripted duels — open to every pilot, no flight hours required.</p>
        </div>
        <div className="cockpit-pill" title="Local combat record">
          <Trophy className="w-3 h-3 text-amber-400" />
          <span className="font-scope text-[10px] font-bold tracking-wide text-slate-400">
            <span className="text-emerald-400">{battleRecord.wins}W</span> / <span className="text-rose-400">{battleRecord.losses}L</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {[{ id: "SOLO", label: "Solo", icon: Flame }, { id: "DUEL", label: "Duel", icon: Swords }].map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`scope-btn scope-frame scope-frame-sm flex items-center justify-center gap-1.5 px-2.5 py-2 font-scope text-[10px] font-bold uppercase tracking-wide border transition-all cursor-pointer ${
                active ? "bg-cyan-950/50 border-cyan-500 text-cyan-400 scope-glow" : "border-slate-900 text-slate-500 hover:bg-slate-900/40"
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-h-0">
        {tab === "SOLO" ? (
          <SoloHazardRun pilotProgress={pilotProgress} pushToast={pushToast} creditFuelCells={creditFuelCells} recordBattleResult={recordBattleResult} bestWave={battleRecord.bestWave} />
        ) : (
          <DuelArena pilotProgress={pilotProgress} pushToast={pushToast} creditFuelCells={creditFuelCells} recordBattleResult={recordBattleResult} />
        )}
      </div>
    </div>
  );
}

const SOLO_START_SECONDS = 40;
const SOLO_MIN_SECONDS = 15;
const SOLO_STEP_SECONDS = 3;
const SOLO_LIVES = 3;

function SoloHazardRun({ pilotProgress, pushToast, creditFuelCells, recordBattleResult, bestWave }) {
  const pool = useMemo(() => buildChallengePool(pilotProgress), [pilotProgress]);
  const [running, setRunning] = useState(false);
  const [wave, setWave] = useState(0);
  const [lives, setLives] = useState(SOLO_LIVES);
  const [challenge, setChallenge] = useState(null);
  const [inputBuffer, setInputBuffer] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(SOLO_START_SECONDS);
  const [over, setOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Non-Negotiables Pass: the wave that actually ended the run, kept for a
  // real "teach the concept" debrief on defeat — not just a bare "you lost".
  const [lastMissed, setLastMissed] = useState(null);
  const usedRef = useRef(new Set());

  const waveSeconds = Math.max(SOLO_MIN_SECONDS, SOLO_START_SECONDS - wave * SOLO_STEP_SECONDS);

  function pickChallenge() {
    const unused = pool.filter((_, idx) => !usedRef.current.has(idx));
    const source = unused.length > 0 ? unused : pool;
    const idx = pool.indexOf(source[Math.floor(Math.random() * source.length)]);
    usedRef.current.add(idx);
    return pool[idx];
  }

  function start() {
    usedRef.current = new Set();
    setWave(0);
    setLives(SOLO_LIVES);
    setOver(false);
    setInputBuffer("");
    const first = pickChallenge();
    setChallenge(first);
    setSecondsLeft(SOLO_START_SECONDS);
    setRunning(true);
  }

  function nextWavePayload() {
    return {
      wave: wave + 1,
      challenge: pickChallenge(),
      seconds: Math.max(SOLO_MIN_SECONDS, SOLO_START_SECONDS - (wave + 1) * SOLO_STEP_SECONDS)
    };
  }

  // A single funnel for "the run just ended vs. the run continues" so a
  // life-loss and a wave-advance can never both fire off a stale read of
  // `lives` — everything the outcome depends on happens inside the one
  // functional updater.
  function handleWaveFailure(reason, missedChallenge) {
    setLives((l) => {
      const next = l - 1;
      if (next <= 0) {
        setRunning(false);
        setOver(true);
        setLastMissed(missedChallenge || challenge);
        recordBattleResult(false, wave);
        pushToast({ title: "Hull breach", body: `Out of lives at wave ${wave + 1}. ${reason}`, tone: "danger", voice: null });
      } else {
        pushToast({ title: "Hit taken", body: `${reason} ${next} ${next === 1 ? "life" : "lives"} left.`, tone: "danger", voice: null });
        const { wave: w, challenge: c, seconds } = nextWavePayload();
        setWave(w);
        setChallenge(c);
        setSecondsLeft(seconds);
        setInputBuffer("");
      }
      return next;
    });
  }

  useEffect(() => {
    if (!running || over) return undefined;
    if (secondsLeft <= 0) {
      handleWaveFailure("Time's up on that wave.");
      return undefined;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, over, secondsLeft]);

  function advanceOnSuccess() {
    if (usedRef.current.size >= pool.length) {
      setRunning(false);
      setOver(true);
      recordBattleResult(true, wave);
      pushToast({ title: "Hazard run cleared", body: `Every wave in the pool cleared. Final wave: ${wave + 1}.`, tone: "reward", voice: null });
      return;
    }
    const { wave: w, challenge: c, seconds } = nextWavePayload();
    setWave(w);
    setChallenge(c);
    setSecondsLeft(seconds);
    setInputBuffer("");
  }

  async function submit() {
    if (!running || over || !challenge || submitting) return;
    setSubmitting(true);
    // Non-Negotiables Pass: real damage from a real failing test for
    // Python/JS challenges — every other language still uses the legacy
    // substring check until it has a real runtime (see submissionValidator.js).
    const outcome = await evaluateSubmission(challenge.sector.id, challenge.sector.lessons.indexOf(challenge.lesson), challenge.lesson, inputBuffer);
    setSubmitting(false);
    if (outcome.passed) {
      creditFuelCells(30);
      pushToast({ title: `Wave ${wave + 1} cleared`, body: "+30 fuel cells. Next wave incoming.", tone: "reward", voice: null });
      advanceOnSuccess();
    } else {
      const failReason =
        outcome.mode === "tests"
          ? outcome.results.find((r) => !r.pass)?.description || "A test failed."
          : "Wrong token — the hazard clock kept running.";
      handleWaveFailure(failReason, challenge);
    }
  }

  if (!running && !over) {
    return (
      <div className="scope-frame p-6 border border-slate-800/60 bg-slate-950/30 h-full flex flex-col items-center justify-center text-center gap-3">
        <Flame className="w-8 h-8 text-amber-400" />
        <h3 className="font-scope text-sm font-bold text-slate-200 uppercase tracking-wide">Solo Hazard Run</h3>
        <p className="text-[11px] text-slate-500 font-sans max-w-sm">Wave after wave, clock shrinking each time. Three lives. Challenges are pulled from sectors you've already trained on.</p>
        {bestWave > 0 && <p className="text-[10px] text-amber-400 font-scope font-bold uppercase tracking-wide">Best wave so far: {bestWave + 1}</p>}
        <button onClick={start} className="scope-btn px-5 py-2 border border-amber-500/40 bg-amber-950/20 text-amber-300 hover:bg-amber-400 hover:text-black transition-all font-scope text-[11px] font-bold uppercase tracking-widest cursor-pointer">
          Launch Run
        </button>
      </div>
    );
  }

  if (over) {
    return (
      <div className="scope-frame p-6 border border-slate-800/60 bg-slate-950/30 h-full flex flex-col items-center justify-center text-center gap-3 overflow-y-auto">
        {lives > 0 ? <Trophy className="w-8 h-8 text-emerald-400" /> : <Skull className="w-8 h-8 text-rose-400" />}
        <h3 className="font-scope text-sm font-bold text-slate-200 uppercase tracking-wide">{lives > 0 ? "Pool Cleared" : "Run Over"}</h3>
        <p className="text-[11px] text-slate-500 font-sans">Reached wave {wave + 1}.</p>

        {/* Non-Negotiables Pass: teach the concept that ended the run before
            offering a rematch — a fresh wave pool, not the same fight. */}
        {lives <= 0 && lastMissed && (
          <div className="scope-frame scope-frame-sm max-w-sm w-full text-left p-3 border border-amber-500/25 bg-amber-950/10 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[9px] font-scope font-bold uppercase tracking-widest text-amber-400">
              <GraduationCap className="w-3.5 h-3.5" /> Debrief — {lastMissed.lesson.concept || "Concept"}
            </div>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{lastMissed.sector.short} // {lastMissed.lesson.title}</div>
            <p className="text-[11px] text-slate-300 font-sans leading-relaxed">{lastMissed.lesson.prompt}</p>
          </div>
        )}

        <button onClick={start} className="scope-btn px-5 py-2 border border-slate-800 text-slate-300 hover:border-amber-500/40 hover:text-amber-400 transition-all font-scope text-[10px] font-bold uppercase tracking-widest cursor-pointer">
          {lives <= 0 ? "Rematch — New Waves" : "Run Again"}
        </button>
      </div>
    );
  }

  return (
    <div className="scope-frame border border-amber-500/20 bg-slate-950/30 h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-900">
        <span className="font-scope text-[10px] font-bold uppercase tracking-widest text-slate-400">Wave {wave + 1}</span>
        <div className="flex items-center gap-2">
          {Array.from({ length: SOLO_LIVES }).map((_, i) => (
            <Heart key={i} className={`w-3.5 h-3.5 ${i < lives ? "text-rose-400 fill-current" : "text-slate-800"}`} />
          ))}
        </div>
        <span className={`font-scope text-[11px] font-bold tabular-nums flex items-center gap-1 ${secondsLeft <= 5 ? "text-rose-400" : "text-amber-400"}`}>
          <Clock className="w-3.5 h-3.5" /> {secondsLeft}s
        </span>
      </div>
      <div className="p-4 space-y-3 flex-1 overflow-y-auto">
        <div>
          <div className="text-[9px] font-black text-slate-600 uppercase tracking-wider">{challenge.sector.short} // {challenge.lesson.title}</div>
          <p className="text-[12px] text-slate-300 font-sans mt-1 leading-relaxed">{challenge.lesson.prompt}</p>
        </div>
        <div className="w-full h-1.5 bg-slate-900 border border-slate-800/40 rounded-xs overflow-hidden">
          <div className="h-full bg-amber-500 transition-all duration-1000" style={{ width: `${(secondsLeft / waveSeconds) * 100}%` }} />
        </div>
        <textarea
          value={inputBuffer}
          onChange={(e) => setInputBuffer(e.target.value)}
          placeholder="// type your solution..."
          className="w-full h-24 bg-slate-950 border border-slate-800 rounded-sm p-2.5 text-[12px] font-mono text-cyan-300 placeholder-slate-700 outline-hidden focus:border-amber-500/50 resize-none"
          autoFocus
        />
        <button
          onClick={submit}
          disabled={submitting}
          className="scope-btn w-full py-2 border border-amber-500/40 bg-amber-950/20 text-amber-300 hover:bg-amber-400 hover:text-black transition-all font-scope text-[11px] font-bold uppercase tracking-widest cursor-pointer disabled:opacity-50 disabled:cursor-wait"
        >
          {submitting ? "Verifying..." : "Submit"}
        </button>
      </div>
    </div>
  );
}

function DuelArena({ pilotProgress, pushToast, creditFuelCells, recordBattleResult }) {
  const rivals = useMemo(() => RIVAL_NAMES.map((name) => ({ callsign: name, speed: rivalSpeed(name) })), []);
  const [format, setFormat] = useState(null); // "RACE" | "GAUNTLET"
  const [rival, setRival] = useState(null);
  const [round, setRound] = useState(0); // for Gauntlet: 0,1,2
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [roundState, setRoundState] = useState(null); // { challenge, opponentSolveMs, status, elapsed }
  const [inputBuffer, setInputBuffer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastMissed, setLastMissed] = useState(null);
  const tickRef = useRef(null);
  const targetRounds = format === "GAUNTLET" ? 3 : 1;
  const winsNeeded = format === "GAUNTLET" ? 2 : 1;

  function pickChallenge() {
    const pool = buildChallengePool(pilotProgress);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    return pick || { sector: PLANETARY_SYSTEM[0], lesson: PLANETARY_SYSTEM[0].lessons[0] };
  }

  function startMatch(fmt, opponent) {
    setFormat(fmt);
    setRival(opponent);
    setRound(0);
    setWins(0);
    setLosses(0);
    startRound(opponent, 0);
  }

  function startRound(opponent, roundIdx) {
    const challenge = pickChallenge();
    const speedFactor = Math.max(0.5, 1.4 - opponent.speed / 1500);
    const solveMs = Math.round((5000 + Math.random() * 7000) * speedFactor);
    setInputBuffer("");
    setRoundState({ challenge, opponentSolveMs: solveMs, status: "running", elapsed: 0 });
  }

  useEffect(() => {
    if (!roundState || roundState.status !== "running") return undefined;
    tickRef.current = setInterval(() => {
      setRoundState((rs) => {
        if (!rs || rs.status !== "running") return rs;
        const nextElapsed = rs.elapsed + 100;
        if (nextElapsed >= rs.opponentSolveMs) {
          return { ...rs, elapsed: nextElapsed, status: "lost" };
        }
        return { ...rs, elapsed: nextElapsed };
      });
    }, 100);
    return () => clearInterval(tickRef.current);
  }, [roundState?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (roundState?.status === "lost") resolveRound(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundState?.status]);

  function resolveRound(won) {
    clearInterval(tickRef.current);
    const nextWins = wins + (won ? 1 : 0);
    const nextLosses = losses + (won ? 0 : 1);
    setWins(nextWins);
    setLosses(nextLosses);

    if (nextWins >= winsNeeded) {
      creditFuelCells(format === "GAUNTLET" ? 120 : 60);
      recordBattleResult(true);
      pushToast({ title: "Duel won", body: `Beat ${rival.callsign} ${nextWins}-${nextLosses}. +${format === "GAUNTLET" ? 120 : 60} fuel cells.`, tone: "reward", voice: null });
      setRoundState((rs) => ({ ...rs, status: won ? "won" : "lost", matchOver: true, matchResult: "won" }));
    } else if (nextLosses >= winsNeeded) {
      recordBattleResult(false);
      setLastMissed(roundState?.challenge || null);
      pushToast({ title: "Duel lost", body: `${rival.callsign} won ${nextLosses}-${nextWins}.`, tone: "danger", voice: null });
      setRoundState((rs) => ({ ...rs, status: "lost", matchOver: true, matchResult: "lost" }));
    } else {
      const nextRound = round + 1;
      setRound(nextRound);
      startRound(rival, nextRound);
    }
  }

  async function submitRound() {
    if (!roundState || roundState.status !== "running" || submitting) return;
    setSubmitting(true);
    const { sector, lesson } = roundState.challenge;
    const outcome = await evaluateSubmission(sector.id, sector.lessons.indexOf(lesson), lesson, inputBuffer);
    setSubmitting(false);
    if (!outcome.passed) {
      const reason = outcome.mode === "tests" ? outcome.results.find((r) => !r.pass)?.description || "A test failed." : "Missing the required token.";
      pushToast({ title: "Not quite", body: reason, tone: "info", voice: null });
      return;
    }
    clearInterval(tickRef.current);
    setRoundState((rs) => ({ ...rs, status: "won" }));
    resolveRound(true);
  }

  function backToPicker() {
    clearInterval(tickRef.current);
    setFormat(null);
    setRival(null);
    setRoundState(null);
  }

  if (!format) {
    return (
      <div className="scope-frame border border-slate-800/60 bg-slate-950/30 h-full flex flex-col overflow-y-auto">
        <div className="scope-frame scope-frame-sm mx-3 mt-3 px-3 py-2 border border-slate-900 bg-slate-950/40 flex items-center gap-2 shrink-0">
          <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <p className="text-[10px] text-slate-500 font-sans">Race: first correct solve wins. Gauntlet: best of three rounds against the same rival.</p>
        </div>
        <div className="p-3 space-y-2">
          {rivals.map((r) => (
            <div key={r.callsign} className="flex items-center justify-between gap-3 px-3 py-2.5 scope-frame scope-frame-sm border border-slate-900 bg-slate-950/40">
              <span className="text-[12px] font-semibold text-slate-300">{r.callsign}</span>
              <div className="flex gap-1.5">
                <button onClick={() => startMatch("RACE", r)} className="scope-btn px-2.5 py-1 border border-cyan-500/30 bg-cyan-950/20 text-cyan-400 hover:bg-cyan-400 hover:text-black transition-all font-scope text-[9px] font-bold uppercase tracking-widest cursor-pointer">Race</button>
                <button onClick={() => startMatch("GAUNTLET", r)} className="scope-btn px-2.5 py-1 border border-amber-500/30 bg-amber-950/20 text-amber-400 hover:bg-amber-400 hover:text-black transition-all font-scope text-[9px] font-bold uppercase tracking-widest cursor-pointer">Gauntlet</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const progressPct = roundState ? Math.min(100, Math.round((roundState.elapsed / roundState.opponentSolveMs) * 100)) : 0;

  return (
    <div className="scope-frame border border-cyan-500/20 bg-slate-950/30 h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-900">
        <button onClick={backToPicker} className="flex items-center gap-1 text-[10px] font-scope font-bold uppercase tracking-widest text-slate-500 hover:text-cyan-400 transition-colors cursor-pointer">
          <ChevronLeft className="w-3.5 h-3.5" /> Rivals
        </button>
        <span className="font-scope text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
          <Swords className="w-3.5 h-3.5 text-cyan-400" /> {format === "GAUNTLET" ? "Gauntlet" : "Race"} vs {rival.callsign} {format === "GAUNTLET" && `(${wins}-${losses})`}
        </span>
      </div>

      {roundState?.matchOver ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4 text-center overflow-y-auto">
          {roundState.matchResult === "won" ? <Trophy className="w-8 h-8 text-emerald-400" /> : <Skull className="w-8 h-8 text-rose-400" />}
          <div className={`font-scope text-sm font-bold uppercase tracking-wide ${roundState.matchResult === "won" ? "text-emerald-400" : "text-rose-400"}`}>
            {roundState.matchResult === "won" ? "Victory" : "Defeat"}
          </div>
          <p className="text-[11px] text-slate-400 font-sans">Final: {wins}-{losses} vs {rival.callsign}</p>

          {/* Non-Negotiables Pass: teach the concept the rival beat you on
              before offering a rematch — a fresh opponent draw, not a repeat. */}
          {roundState.matchResult === "lost" && lastMissed && (
            <div className="scope-frame scope-frame-sm max-w-sm w-full text-left p-3 border border-rose-500/25 bg-rose-950/10 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[9px] font-scope font-bold uppercase tracking-widest text-rose-400">
                <GraduationCap className="w-3.5 h-3.5" /> Debrief — {lastMissed.lesson.concept || "Concept"}
              </div>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{lastMissed.sector.short} // {lastMissed.lesson.title}</div>
              <p className="text-[11px] text-slate-300 font-sans leading-relaxed">{lastMissed.lesson.prompt}</p>
            </div>
          )}

          <div className="flex gap-2">
            {roundState.matchResult === "lost" && (
              <button onClick={() => startMatch(format, rival)} className="scope-btn px-4 py-1.5 border border-rose-500/40 bg-rose-950/20 text-rose-300 hover:bg-rose-400 hover:text-black transition-all font-scope text-[10px] font-bold uppercase tracking-widest cursor-pointer">Rematch</button>
            )}
            <button onClick={backToPicker} className="scope-btn px-4 py-1.5 border border-slate-800 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-400 transition-all font-scope text-[10px] font-bold uppercase tracking-widest cursor-pointer">Back to Rivals</button>
          </div>
        </div>
      ) : roundState ? (
        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
          <div>
            <div className="text-[9px] font-black text-slate-600 uppercase tracking-wider">{roundState.challenge.sector.short} // {roundState.challenge.lesson.title}</div>
            <p className="text-[12px] text-slate-300 font-sans mt-1 leading-relaxed">{roundState.challenge.lesson.prompt}</p>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
              <span className="text-slate-500 flex items-center gap-1"><Zap className="w-3 h-3" /> You</span>
              <span className="text-slate-500">{rival.callsign}</span>
            </div>
            <div className="w-full h-2 bg-slate-900 border border-slate-800/40 rounded-xs overflow-hidden p-0.5">
              <div className="h-full rounded-xs bg-amber-500 transition-all duration-100" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
          <textarea
            value={inputBuffer}
            onChange={(e) => setInputBuffer(e.target.value)}
            placeholder="// type your solution..."
            className="w-full h-24 bg-slate-950 border border-slate-800 rounded-sm p-2.5 text-[12px] font-mono text-cyan-300 placeholder-slate-700 outline-hidden focus:border-cyan-500/50 resize-none"
            autoFocus
          />
          <button
            onClick={submitRound}
            disabled={submitting}
            className="scope-btn w-full py-2 border border-cyan-500/40 bg-cyan-950/30 text-cyan-400 hover:bg-cyan-400 hover:text-black transition-all font-scope text-[11px] font-bold uppercase tracking-widest cursor-pointer disabled:opacity-50 disabled:cursor-wait"
          >
            {submitting ? "Verifying..." : "Submit"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
