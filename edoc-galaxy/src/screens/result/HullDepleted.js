"use client";

import { useEffect, useRef } from "react";
import { RefreshCw, ShieldAlert } from "lucide-react";
import DefeatScene from "../../art/DefeatScene";
import Button from "../../ui/Button";
import HullBar from "../../ui/HullBar";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { sfx } from "../../galaxy/audio";
import "./defeat.css";

/**
 * "Hull depleted". Props only: it fetches and saves nothing. Losing always teaches the concept that beat you and then offers a rematch,
 * so Rematch is the only way out (no Escape, no click outside), as in the console's own defeat dialog.
 *
 *   <HullDepleted concept="Loops" explanation="Your loop stopped one step early, so the last number was never added."
 *     failedTests={["Sample test 2"]} attempts={3} onRematch={...} />
 *
 * `explanation` is the slot for the teaching text: a string or any element (it can hold a formatted walkthrough later).
 * `failedTests` and `attempts` are shown when given. `muted` turns the sound off; `calm` is reduced motion.
 */
export default function HullDepleted({
  concept,
  explanation,
  failedTests,
  attempts,
  rematchLabel = "Rematch",
  onRematch,
  muted = false,
  calm = false
}) {
  const ref = useRef(null);
  useFocusTrap(ref, true, null);
  useEffect(() => {
    if (!muted && !calm) sfx.denied();
    ref.current?.querySelector("button")?.focus();
  }, [muted, calm]);

  return (
    <div className="hd">
      <div className="hd-veil" aria-hidden="true" />
      <div className="hd-scene">
        <DefeatScene calm={calm} onPoke={() => { if (!muted && !calm) sfx.denied(); }} />
      </div>
      <section ref={ref} className="hd-card" role="alertdialog" aria-modal="true" aria-labelledby="hd-title" aria-describedby="hd-body">
        <p className="hd-eyebrow">
          <ShieldAlert size={14} aria-hidden="true" /> Hull depleted
        </p>
        <h2 id="hd-title" className="hd-title">
          {concept ? (
            <>
              <span className="hd-small">The concept that beat you</span>
              {concept}
            </>
          ) : (
            "That one got through"
          )}
        </h2>
        <div id="hd-body" className="hd-body">
          {explanation || <p>Every miss is information. Look at what the tests expected, then try again.</p>}
        </div>
        <div className="hd-meta">
          <HullBar value={0} />
          {attempts != null && (
            <span className="hd-stat">
              Attempts <b>{attempts}</b>
            </span>
          )}
          {failedTests?.length > 0 && (
            <span className="hd-stat">
              Missed <b>{failedTests.join(", ")}</b>
            </span>
          )}
        </div>
        <div className="hd-actions">
          <Button size="lg" icon={RefreshCw} onClick={onRematch}>
            {rematchLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}
