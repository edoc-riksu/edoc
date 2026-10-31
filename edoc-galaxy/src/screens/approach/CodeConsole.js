"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, CheckCircle2, ChevronLeft, GraduationCap, Lock, Terminal, VolumeX, X, XCircle } from "lucide-react";
import Button from "../../ui/Button";
import HullBar from "../../ui/HullBar";
import CodeEditor from "../../ui/CodeEditor";
import useResizable from "../../ui/useResizable";
import { runCode, submitCode, getResumeState } from "../../lib/executionApi";
import { runWithInput } from "../../lib/pyDebugRunner";
import { setSoundEnabled, sfx } from "../../galaxy/audio";
import DefeatDialog from "./DefeatDialog";
import "./console.css";

const HULL_DAMAGE = 20;
const HULL_REPAIR = 15;
const HINT_TIERS = ["Nudge", "Clue", "Walkthrough"];

function getSoundPreference() {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem("edoc_galaxy_settings");
    if (raw) return JSON.parse(raw).sound !== false;
  } catch { }
  return true;
}

// Submit doesn't return stdout/stderr (only Run does, per the contract),
// so a verdict needs its own readable message — pass/fail dots alone
// don't say whether the code crashed, timed out, or never compiled, and
// hidden-test content can never be shown even for a plain wrong answer.
const VERDICT_MESSAGES = {
  WRONG_ANSWER: "One or more tests didn't match the expected output.",
  RUNTIME_ERROR: "Your code crashed while running.",
  TIME_LIMIT_EXCEEDED: "Your code took too long to finish.",
  COMPILATION_ERROR: "Your code has a syntax error and couldn't run."
};

function titleCase(s) {
  return (s || "").replace(/\b\w/g, (c) => c.toUpperCase());
}

function backendErrorMessage(status) {
  return status === 404 || status === 422
    ? "This encounter isn't wired up on the judging backend yet."
    : "Couldn't reach the judging backend — check your connection and try again.";
}

// Splits a submission's flat test list into sample/hidden groups using
// the test_id naming convention from contracts/example-submission-*.json
// (e.g. "sample-1", "hidden-1"). Falls back to one ungrouped list for any
// id that doesn't follow it, rather than silently dropping tests.
function groupTests(tests) {
  const sample = tests.filter((t) => t.test_id?.startsWith("sample"));
  const hidden = tests.filter((t) => t.test_id?.startsWith("hidden"));
  const other = tests.filter((t) => !sample.includes(t) && !hidden.includes(t));
  return { sample, hidden, other };
}

function TestRow({ label, passed }) {
  return (
    <li className={`cs-test cs-test--${passed ? "pass" : "fail"}`}>
      {passed ? <CheckCircle2 size={14} aria-hidden="true" /> : <XCircle size={14} aria-hidden="true" />}
      <span>{label}</span>
    </li>
  );
}

/**
 * The code console: type Python against Backend 1's real judging service
 * (see executionApi.js). Run checks sample tests only, with real output,
 * and never touches hull — it's free, for debugging while you work.
 * Submit is the graded attempt: a clean pass repairs hull and unlocks the
 * editorial, a fail damages it. Hull hitting zero is the loss condition —
 * the only way out is Rematch, on this same encounter. A separate Debug
 * console runs custom input entirely in the browser (pyDebugRunner.js),
 * never touching the backend or the score.
 */
export default function CodeConsole({ encounter, hull, onHullChange, onPass, onExit, say, index = 0, total = 1, language = "Python" }) {
  const [code, setCode] = useState(encounter.starterCode || "");
  const [busy, setBusy] = useState(null); // null | "run" | "submit"
  const [result, setResult] = useState(null);
  const [solved, setSolved] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [bolt, setBolt] = useState(false);
  const [defeat, setDefeat] = useState(null); // null | { concept, reason }
  const [activeTab, setActiveTab] = useState("tests"); // "tests" | "debug" | "editorial"
  const [debugInput, setDebugInput] = useState("");
  const [debugBusy, setDebugBusy] = useState(false);
  const [debugResult, setDebugResult] = useState(null);
  const [isWriting, setIsWriting] = useState(false);
  const writingTimerRef = useRef(null);
  const boltButtonRef = useRef(null);

  const handleWritingChange = (active) => {
    clearTimeout(writingTimerRef.current);
    if (active) {
      setIsWriting(true);
      setSoundEnabled(false);
      // Auto-clear silent state after 3s of idle typing if unfocused
      writingTimerRef.current = setTimeout(() => {
        setIsWriting(false);
        setSoundEnabled(getSoundPreference());
      }, 3000);
    } else {
      setIsWriting(false);
      setSoundEnabled(getSoundPreference());
    }
  };

  useEffect(() => {
    return () => {
      clearTimeout(writingTimerRef.current);
      setSoundEnabled(getSoundPreference());
    };
  }, []);

  // Keyboard-only pilots can open Bolt with Enter but had no way to close
  // it again without a mouse — Escape closes the panel and hands focus
  // back to the toggle button, same as any dismissible popover.
  useEffect(() => {
    if (!bolt) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setBolt(false);
        boltButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [bolt]);

  const mainSplit = useResizable({ axis: "x", initial: 38, min: 25, max: 55 });
  const workspaceSplit = useResizable({ axis: "y", initial: 60, min: 30, max: 80 });

  // A fresh encounter (after clearing this one) always starts clean.
  useEffect(() => {
    setCode(encounter.starterCode || "");
    setResult(null);
    setSolved(false);
    setAttempts(1);
    setHintsRevealed(0);
    setBolt(false);
    setDefeat(null);
    setActiveTab("tests");
    setDebugInput("");
    setDebugResult(null);
  }, [encounter.id, encounter.starterCode]);

  useEffect(() => {
    let cancelled = false;

    async function restoreProgress() {
      const res = await getResumeState(encounter.id);

      if (cancelled || !res.ok || !res.data) return;

      setAttempts(res.data.attempts);

      if (res.data.solved) {
        setSolved(true);
      }
    }

    restoreProgress();

    return () => {
      cancelled = true;
    };
  }, [encounter.id]);

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
    setSolved(false);
    setAttempts(1);
    setHintsRevealed(0);
    setBolt(false);
    setActiveTab("tests");
    setDebugInput("");
    setDebugResult(null);
    onHullChange(100);
  };

  // Free to use while working — sample tests only, with real stdout/
  // stderr, and never touches hull or attempts (contract: a run result
  // must never be used to award anything).
  const handleRunDebug = async () => {
    if (busy || defeat) return;
    clearTimeout(writingTimerRef.current);
    setIsWriting(false);
    setSoundEnabled(getSoundPreference());
    setActiveTab("tests");
    setBusy("run");
    const res = await runCode({ encounterId: encounter.id, code });
    setBusy(null);

    if (!res.ok) {
      setResult({ kind: "unavailable" });
      say?.(backendErrorMessage(res.status));
      return;
    }
    setResult({ kind: "run", tests: res.data?.tests || [], runtimeMs: res.data?.execution?.runtime_ms });
  };

  // The graded attempt: sample + hidden tests, an authoritative verdict,
  // and the thing that actually moves hull and progress.
  const handleSubmit = async () => {
    if (busy || defeat) return;
    clearTimeout(writingTimerRef.current);
    setIsWriting(false);
    setSoundEnabled(getSoundPreference());
    setActiveTab("tests");
    setBusy("submit");
    const res = await submitCode({ encounterId: encounter.id, code, hintsUsed: hintsRevealed });
    setBusy(null);

    if (!res.ok) {
      setResult({ kind: "unavailable" });
      say?.(backendErrorMessage(res.status));
      return;
    }

    const { verdict, tests: testResults, score, execution } = res.data || {};
    // SYSTEM_ERROR means the sandbox itself is down — try again, not a loss.
    if (!verdict || verdict === "SYSTEM_ERROR") {
      setResult({ kind: "unavailable" });
      say?.("The judging sandbox is down right now — try again in a moment.");
      return;
    }

    setAttempts((a) => a + 1);
    const runtimeMs = execution?.runtime_ms;

    if (verdict === "ACCEPTED") {
      setResult({ kind: "submit", status: "pass", tests: testResults || [], score, runtimeMs });
      setSolved(true);
      sfx.select();
      onHullChange(Math.min(100, hull + HULL_REPAIR));
      return; // onPass() waits for "Continue" — see the accepted banner below
    }

    const verdictMessage = VERDICT_MESSAGES[verdict] || "Verification failed.";
    setResult({ kind: "submit", status: "fail", tests: testResults || [], score, runtimeMs, verdictMessage });
    sfx.denied();
    const nextHull = Math.max(0, hull - HULL_DAMAGE);
    onHullChange(nextHull);
    if (nextHull <= 0) {
      setDefeat({ concept: encounter.concept?.name || "this exercise", reason: verdictMessage });
    }
  };

  // Entirely client-side, never touches the backend, score or hull — see
  // pyDebugRunner.js. The real judging API has no way to accept custom
  // stdin today, only its own fixed sample tests.
  const handleDebugRun = async () => {
    if (debugBusy) return;
    setDebugBusy(true);
    const res = await runWithInput({ code, stdin: debugInput });
    setDebugBusy(false);
    setDebugResult(res);
  };

  const conceptLabel = titleCase(encounter.concept?.name);

  return (
    <section className={`cs ${isWriting ? "is-writing" : ""}`} aria-label={`Code console — ${encounter.title}`}>
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
          {isWriting && (
            <span className="cs-quiet-indicator" title="While someone is writing code, the ship goes quiet, visually and audibly">
              <VolumeX size={13} aria-hidden="true" />
              <span>Ship quiet</span>
            </span>
          )}
        </div>
        <div className="cs-bar-right">
          <span className="cs-scored-badge">Scored · judged on the server</span>
          <HullBar value={hull} />
          <span className="cs-attempt">Attempt {attempts}</span>
        </div>
      </header>

      <div className="cs-main" ref={mainSplit.containerRef}>
        <div className="cs-problem" style={{ flexBasis: `${mainSplit.pct}%` }}>
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

        <div
          className="cs-resizer cs-resizer--x"
          aria-label="Resize problem panel"
          {...mainSplit.handleProps}
        />

        <div className="cs-workspace" ref={workspaceSplit.containerRef}>
          <div className="cs-editor-wrap" style={{ flexBasis: `${workspaceSplit.pct}%` }}>
            <div className="cs-tabs">
              <span className="cs-tab is-active">solution.py</span>
            </div>
            <CodeEditor
              className="cs-editor"
              language="python"
              value={code}
              onChange={setCode}
              onRunShortcut={handleRunDebug}
              onSubmitShortcut={handleSubmit}
              onWritingChange={handleWritingChange}
              disabled={!!defeat}
            />
            <div className="cs-editor-actions">
              <Button variant="secondary" onClick={handleReset} disabled={!!defeat}>
                Reset code
              </Button>
              <div className="cs-run-wrap">
                <div className="cs-run-btn-group">
                  <Button variant="secondary" loading={busy === "run"} disabled={!!busy || !!defeat} onClick={handleRunDebug}>
                    Run
                  </Button>
                  <span className="cs-run-hint">Ctrl+Enter</span>
                </div>
                <div className="cs-run-btn-group">
                  <Button size="lg" loading={busy === "submit"} disabled={!!busy || !!defeat} onClick={handleSubmit}>
                    Submit
                  </Button>
                  <span className="cs-run-hint">Ctrl+Shift+Enter</span>
                </div>
              </div>
            </div>
          </div>

          <div
            className="cs-resizer cs-resizer--y"
            aria-label="Resize editor panel"
            {...workspaceSplit.handleProps}
          />

          <div className="cs-tests">
            <div className="cs-panel-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={activeTab === "tests"} className={`cs-panel-tab ${activeTab === "tests" ? "is-active" : ""}`} onClick={() => setActiveTab("tests")}>
                Tests
              </button>
              <button type="button" role="tab" aria-selected={activeTab === "debug"} className={`cs-panel-tab ${activeTab === "debug" ? "is-active" : ""}`} onClick={() => setActiveTab("debug")}>
                <Terminal size={13} aria-hidden="true" /> Debug console
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "editorial"}
                className={`cs-panel-tab ${activeTab === "editorial" ? "is-active" : ""}`}
                onClick={() => solved && setActiveTab("editorial")}
                disabled={!solved}
              >
                <GraduationCap size={13} aria-hidden="true" /> Editorial {!solved && <Lock size={11} aria-hidden="true" />}
              </button>
            </div>

            {result?.kind === "submit" && result.status === "pass" && (
              <div className="cs-accepted-banner">
                <CheckCircle2 size={16} aria-hidden="true" />
                <span>Accepted — hull repaired.</span>
                <Button size="sm" onClick={onPass} autoFocus>
                  Continue
                </Button>
                <span className="cs-run-hint">Enter</span>
              </div>
            )}

            <div className="cs-panel-body">
              {activeTab === "tests" && (
                <>
                  {(result?.kind === "run" || result?.kind === "submit") && (
                    <p className="cs-result-meta">
                      {result.kind === "submit" && result.score && <span>Score: {result.score.earned}/{result.score.total}</span>}
                      {typeof result.runtimeMs === "number" && <span>Ran in {result.runtimeMs}ms</span>}
                    </p>
                  )}

                  {(!result || result.kind === "unavailable") && (
                    <>
                      <p className="cs-tests-group-label">Sample tests</p>
                      <ul className="cs-tests-list">
                        {(encounter.tests || []).map((test, i) => (
                          <li key={i} className="cs-test">
                            <div>
                              <span>Sample test {i + 1}</span>
                              <p>{test.description}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                      {(!encounter.tests || encounter.tests.length === 0) && (
                        <p className="cs-tests-empty">
                          No sample tests are defined for this encounter.
                        </p>
                      )}
                    </>
                  )}

                  {result?.kind === "run" && (
                    <ul className="cs-tests-list">
                      {result.tests.map((t, i) => (
                        <li key={t.test_id || i} className={`cs-test cs-test--${t.passed ? "pass" : "fail"}`}>
                          {t.passed ? <CheckCircle2 size={14} aria-hidden="true" /> : <XCircle size={14} aria-hidden="true" />}
                          <div>
                            <span>Sample test {i + 1}</span>
                            {!t.passed && (t.stderr || t.stdout) && <pre className="cs-test-output">{t.stderr || t.stdout}</pre>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {result?.kind === "submit" &&
                    (() => {
                      const { sample, hidden, other } = groupTests(result.tests);
                      return (
                        <>
                          {sample.length > 0 && (
                            <>
                              <p className="cs-tests-group-label">Sample tests</p>
                              <ul className="cs-tests-list">
                                {sample.map((t, i) => (
                                  <TestRow key={t.test_id} label={`Sample test ${i + 1}`} passed={t.passed} />
                                ))}
                              </ul>
                            </>
                          )}
                          {hidden.length > 0 && (
                            <>
                              <p className="cs-tests-group-label">Hidden tests</p>
                              <ul className="cs-tests-list">
                                {hidden.map((t, i) => (
                                  <TestRow key={t.test_id} label={`Hidden test ${i + 1}`} passed={t.passed} />
                                ))}
                              </ul>
                            </>
                          )}
                          {other.length > 0 && (
                            <ul className="cs-tests-list">
                              {other.map((t, i) => (
                                <TestRow key={t.test_id || i} label={t.test_id || `Test ${i + 1}`} passed={t.passed} />
                              ))}
                            </ul>
                          )}
                        </>
                      );
                    })()}

                  {result?.kind === "unavailable" && (
                    <p className="cs-unavailable">Judging backend unavailable right now — try again in a moment.</p>
                  )}
                  {result?.verdictMessage && <p className="cs-verdict-message">{result.verdictMessage}</p>}
                </>
              )}

              {activeTab === "debug" && (
                <div className="cs-debug">
                  <label className="cs-debug-label" htmlFor="cs-debug-input">
                    Custom input (stdin)
                  </label>
                  <textarea
                    id="cs-debug-input"
                    className="cs-debug-input"
                    value={debugInput}
                    onChange={(e) => setDebugInput(e.target.value)}
                    placeholder="Type input for your program, one value per line..."
                    rows={4}
                  />
                  <Button variant="secondary" loading={debugBusy} disabled={debugBusy} onClick={handleDebugRun}>
                    Run with this input
                  </Button>
                  {debugResult?.unavailable && (
                    <p className="cs-unavailable">Python sandbox unavailable — check your connection and try again.</p>
                  )}
                  {debugResult && !debugResult.unavailable && (
                    <div className="cs-debug-output">
                      <p className="cs-debug-output-label">Output</p>
                      <pre className="cs-test-output">{debugResult.stdout || "(no output)"}</pre>
                      {debugResult.stderr && (
                        <>
                          <p className="cs-debug-output-label">Error</p>
                          <pre className="cs-test-output cs-test-output--error">{debugResult.stderr}</pre>
                        </>
                      )}
                    </div>
                  )}
                  <p className="cs-debug-note">Runs in your browser — doesn't contact the judging backend and never affects hull or score.</p>
                </div>
              )}

              {activeTab === "editorial" && (
                <div className="cs-editorial">
                  {solved ? (
                    <>
                      {encounter.explanation && <p className="cs-editorial-explanation">{encounter.explanation}</p>}
                      {encounter.solution && <pre className="cs-test-output cs-editorial-code">{encounter.solution}</pre>}
                    </>
                  ) : (
                    <p className="cs-editorial-locked">
                      <Lock size={12} aria-hidden="true" /> Solve this encounter to unlock the editorial.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <button type="button" ref={boltButtonRef} className="cs-bolt-tab" onClick={() => setBolt((v) => !v)} aria-expanded={bolt} aria-label="Ask Bolt for a hint">
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
