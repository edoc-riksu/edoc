"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import Button from "../../ui/Button";
import { runPyTests } from "../../lib/pySandbox";
import { sfx } from "../../galaxy/audio";
import DefeatDialog from "./DefeatDialog";
import "./console.css";

const HULL_DAMAGE = 20;
const HULL_REPAIR = 15;

/**
 * The code console: type Python, hit Run, get real pass/fail from a real
 * interpreter (see pySandbox.js). A failing test costs hull; a clean pass
 * repairs it and clears the obstacle. Hull hitting zero is the loss
 * condition — the only way out is Rematch, on this same encounter.
 */
export default function CodeConsole({ encounter, hull, onHullChange, onPass, onExit, say }) {
  const [code, setCode] = useState(encounter.starterCode || "");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [defeat, setDefeat] = useState(null); // null | { concept, reason }

  // A fresh encounter (after clearing this one) always starts clean.
  useEffect(() => {
    setCode(encounter.starterCode || "");
    setResult(null);
    setHintsRevealed(0);
    setDefeat(null);
  }, [encounter.id, encounter.starterCode]);

  const revealHint = (i) => setHintsRevealed((n) => Math.max(n, i + 1));

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

  return (
    <section className="cs" aria-label={`Code console — ${encounter.title}`} aria-live="polite">
      <div className="cs-head">
        <div>
          <p className="cs-eyebrow">Encounter</p>
          <h2 className="cs-title">{encounter.title}</h2>
        </div>
        <Button variant="secondary" size="sm" onClick={onExit} disabled={!!defeat}>
          Back to obstacle
        </Button>
      </div>
      <p className="cs-blurb">{encounter.blurb}</p>

      <div className="cs-body">
        <textarea
          className="cs-editor"
          value={code}
          onChange={(ev) => setCode(ev.target.value)}
          disabled={!!defeat}
          spellCheck={false}
          aria-label="Python code"
        />
        <div className="cs-side">
          <div className="cs-hints">
            <p className="cs-hints-label">Hints ({hintsRevealed}/3)</p>
            <div className="cs-hint-buttons">
              {[0, 1, 2].map((i) => (
                <button
                  key={i}
                  type="button"
                  className="cs-hint-btn"
                  disabled={hintsRevealed > i || !!defeat}
                  onClick={() => revealHint(i)}
                  aria-label={`Reveal hint ${i + 1}`}
                >
                  <HelpCircle size={13} aria-hidden="true" /> {i + 1}
                </button>
              ))}
            </div>
            {hintsRevealed > 0 && (
              <ul className="cs-hint-list">
                {(encounter.hints || []).slice(0, hintsRevealed).map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            )}
          </div>

          {result && (
            <div className={`cs-result cs-result--${result.status}`} role="status">
              {result.status === "unavailable" && <p>Python sandbox unavailable right now — try again in a moment.</p>}
              {result.status !== "unavailable" &&
                result.results.map((r, i) => (
                  <p key={i} className={r.pass ? "is-pass" : "is-fail"}>
                    {r.pass ? <CheckCircle2 size={13} aria-hidden="true" /> : <XCircle size={13} aria-hidden="true" />}
                    <span>
                      {r.description}
                      {r.error ? ` — ${r.error}` : ""}
                    </span>
                  </p>
                ))}
            </div>
          )}
        </div>
      </div>

      <div className="cs-actions">
        <Button size="lg" loading={running} disabled={!!defeat} onClick={handleRun}>
          Run
        </Button>
      </div>

      {defeat && <DefeatDialog defeat={defeat} onRematch={handleRematch} />}
    </section>
  );
}
