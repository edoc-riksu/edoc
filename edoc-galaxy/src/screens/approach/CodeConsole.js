"use client";

import { useEffect, useState } from "react";
import { Bot, CheckCircle2, ChevronLeft, Clock, Lock, X, XCircle } from "lucide-react";
import Button from "../../ui/Button";
import HullBar from "../../ui/HullBar";
import CodeEditor from "../../ui/CodeEditor";
import { runPyTests } from "../../lib/pySandbox";
import { sfx } from "../../galaxy/audio";
import DefeatDialog from "./DefeatDialog";
import "./console.css";

const HULL_DAMAGE = 20;
const HULL_REPAIR = 15;
const HINT_TIERS = ["Nudge", "Clue", "Walkthrough"];

function titleCase(s) {
  return (s || "").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * The code console: type Python, hit Run, get real pass/fail from a real
 * interpreter (see pySandbox.js). A failing test costs hull; a clean pass
 * repairs it and clears the obstacle. Hull hitting zero is the loss
 * condition — the only way out is Rematch, on this same encounter.
 */
export default function CodeConsole({ encounter, hull, onHullChange, onPass, onExit, say, index = 0, total = 1, language = "Python" }) {
  const [code, setCode] = useState(encounter.starterCode || "");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [attempts, setAttempts] = useState(1);
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [bolt, setBolt] = useState(false);
  const [defeat, setDefeat] = useState(null); // null | { concept, reason }

  // A fresh encounter (after clearing this one) always starts clean.
  useEffect(() => {
    setCode(encounter.starterCode || "");
    setResult(null);
    setAttempts(1);
    setHintsRevealed(0);
    setBolt(false);
    setDefeat(null);
  }, [encounter.id, encounter.starterCode]);

  // Hints unlock one at a time — asking for a later tier before an
  // earlier one isn't allowed.
  const revealHint = (i) => {
    if (defeat || hintsRevealed !== i) return;
    setHintsRevealed(i + 1);
  };

  const handleReset = () => {
    if (defeat) return;
    setCode(encounter.starterCode || "");
    setResult(null);
  };

  const handleRematch = () => {
    setDefeat(null);
    setCode(encounter.starterCode || "");
    setResult(null);
    onHullChange(100);
  };

  const handleRun = async () => {
    if (running || defeat) return;
    setRunning(true);
    const outcome = await runPyTests({ code, tests: encounter.tests || [] });
    setRunning(false);

    if (outcome.unavailable) {
      setResult({ status: "unavailable" });
      say?.("The Python sandbox couldn't load — check your connection and try again.");
      return;
    }

    setAttempts((a) => a + 1);

    if (outcome.allPassed) {
      setResult({ status: "pass", results: outcome.results });
      sfx.select();
      onHullChange(Math.min(100, hull + HULL_REPAIR));
      onPass();
      return;
    }

    setResult({ status: "fail", results: outcome.results });
    sfx.denied();
    const failed = outcome.results.filter((r) => !r.pass);
    const firstFail = failed[0];
    const nextHull = Math.max(0, hull - HULL_DAMAGE);
    onHullChange(nextHull);
    if (nextHull <= 0) {
      setDefeat({
        concept: encounter.concept?.name || "this exercise",
        reason: firstFail ? `${firstFail.description}${firstFail.error ? ` — ${firstFail.error}` : ""}` : "Verification failed."
      });
    }
  };

  const conceptLabel = titleCase(encounter.concept?.name);

  return (
    <section className="cs" aria-label={`Code console — ${encounter.title}`}>
      <header className="cs-bar">
        <div className="cs-bar-left">
          <button type="button" className="cs-back" onClick={onExit} disabled={!!defeat} aria-label="Back to obstacle">
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <span className="cs-logo">edoc</span>
          <nav className="cs-crumb" aria-label="Where you are">
            <span>{language}</span>
            <span className="cs-crumb-sep">/</span>
            <span>{conceptLabel}</span>
            <span className="cs-crumb-sep">/</span>
            <span className="cs-crumb-now">{encounter.title}</span>
          </nav>
        </div>
        <div className="cs-bar-right">
          <span className="cs-scored-badge">Scored · runs in your browser</span>
          <HullBar value={hull} />
          <span className="cs-attempt">Attempt {attempts}</span>
        </div>
      </header>

      <div className="cs-main">
        <div className="cs-problem">
          <p className="cs-eyebrow">Encounter {index + 1} of {total}</p>
          <h2 className="cs-title">{encounter.title}</h2>
          <span className="cs-tag">{conceptLabel}</span>
          <p className="cs-desc">{encounter.blurb}</p>
          {encounter.example && (
            <div className="cs-example">
              <code>{encounter.example}</code>
            </div>
          )}
          {encounter.constraints?.length > 0 && (
            <div className="cs-constraints">
              <p className="cs-constraints-label">Constraints</p>
              <ul>
                {encounter.constraints.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="cs-workspace">
          <div className="cs-editor-wrap">
            <div className="cs-tabs">
              <span className="cs-tab is-active">solution.py</span>
            </div>
            <CodeEditor className="cs-editor" language="python" value={code} onChange={setCode} onRunShortcut={handleRun} disabled={!!defeat} />
            <div className="cs-editor-actions">
              <Button variant="secondary" onClick={handleReset} disabled={!!defeat}>
                Reset code
              </Button>
              <div className="cs-run-wrap">
                <Button size="lg" loading={running} disabled={!!defeat} onClick={handleRun}>
                  Run tests
                </Button>
                <span className="cs-run-hint">Ctrl+Enter</span>
              </div>
            </div>
          </div>

          <div className="cs-tests">
            <p className="cs-tests-label">Tests</p>
            <ul className="cs-tests-list">
              {(encounter.tests || []).map((t, i) => {
                const r = result?.results?.[i];
                const state = !result || result.status === "unavailable" ? "pending" : r?.pass ? "pass" : "fail";
                return (
                  <li key={i} className={`cs-test cs-test--${state}`}>
                    {state === "pending" && <Clock size={14} aria-hidden="true" />}
                    {state === "pass" && <CheckCircle2 size={14} aria-hidden="true" />}
                    {state === "fail" && <XCircle size={14} aria-hidden="true" />}
                    <span>
                      {t.description}
                      {r && !r.pass && r.error ? ` — ${r.error}` : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
            {result?.status === "unavailable" && (
              <p className="cs-unavailable">Python sandbox unavailable right now — try again in a moment.</p>
            )}
          </div>
        </div>
      </div>

      <button type="button" className="cs-bolt-tab" onClick={() => setBolt((v) => !v)} aria-expanded={bolt} aria-label="Ask Bolt for a hint">
        <Bot size={16} aria-hidden="true" />
        <span>Ask Bolt</span>
      </button>

      {bolt && (
        <div className="cs-bolt-panel" role="complementary" aria-label="Bolt, hint companion">
          <div className="cs-bolt-head">
            <Bot size={22} aria-hidden="true" />
            <div className="cs-bolt-id">
              <p className="cs-bolt-name">Bolt</p>
              <p className="cs-bolt-role">Companion AI</p>
            </div>
            <button type="button" className="cs-bolt-close" onClick={() => setBolt(false)} aria-label="Close">
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          {HINT_TIERS.map((tier, i) => {
            const unlocked = hintsRevealed > i;
            const canReveal = hintsRevealed === i && !defeat;
            return (
              <div key={i} className={`cs-bolt-tier ${unlocked ? "is-unlocked" : ""}`}>
                <p className="cs-bolt-tier-label">
                  {i + 1}. {tier}
                </p>
                {unlocked ? (
                  <p className="cs-bolt-tier-text">{encounter.hints?.[i]}</p>
                ) : canReveal ? (
                  <button type="button" className="cs-bolt-reveal" onClick={() => revealHint(i)}>
                    Reveal {tier.toLowerCase()}
                  </button>
                ) : (
                  <p className="cs-bolt-tier-locked">
                    <Lock size={12} aria-hidden="true" /> Ask for hint {i} first
                  </p>
                )}
              </div>
            );
          })}
          <p className="cs-bolt-footer">Hints used: {hintsRevealed} of 3</p>
        </div>
      )}

      {defeat && <DefeatDialog defeat={defeat} onRematch={handleRematch} />}
    </section>
  );
}
