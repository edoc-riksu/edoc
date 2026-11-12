"use client";

import { useState } from "react";
import BoltAvatar, { useBoltState } from "./BoltAvatar";
import HintLevelCard from "./HintLevelCard";
import { HINT_LEVELS } from "./hintLevels";
import "./companion.css";

const HINTS = [
  "Read both numbers from input first, and turn each into an integer.",
  "int(input()) reads one whole number. Do it twice, then add the two values together.",
  "a = int(input()), b = int(input()), then print(a + b)."
];
const COST = 10;

/** Review page for Bolt: the animated avatar in its states, and the three hint levels, in a panel shaped like the console's. */
export default function CompanionLab() {
  const [revealed, setRevealed] = useState(0);
  const [forced, setForced] = useState(null); // "idle" | "talking" | "cheer" | null (follow the hints)
  const [calm, setCalm] = useState(false);
  const auto = useBoltState(revealed);
  const state = forced || auto;
  const stateBtn = (s, label) => (
    <button type="button" className={`ui-btn ui-btn--secondary ${forced === s ? "is-active" : ""}`} aria-pressed={forced === s} onClick={() => setForced(forced === s ? null : s)}>{label}</button>
  );
  return (
    <section aria-label="Bolt, the companion" className="cm-lab">
      <div className="cm-controls">
        <span className="t-label">Bolt, the companion</span>
        {stateBtn("idle", "Idle")}
        {stateBtn("talking", "Talking")}
        {stateBtn("cheer", "Cheer")}
        <label className="t-small t-muted"><input type="checkbox" checked={calm} onChange={(e) => setCalm(e.target.checked)} /> Reduced motion</label>
        <button type="button" className="ui-btn ui-btn--secondary" onClick={() => { setRevealed(0); setForced(null); }}>Reset hints</button>
        <span className="t-small t-muted" role="status">{forced ? `Forced: ${forced}` : "Follows the hints: talks after each reveal"}</span>
      </div>

      <div className="cm-stage">
        <div className="cm-sizes" aria-label="Avatar sizes">
          {[40, 64, 96, 140].map((n) => (
            <figure key={n}>
              <BoltAvatar state={state} size={n} calm={calm} />
              <figcaption className="t-small t-muted">{n}px</figcaption>
            </figure>
          ))}
        </div>

        <aside className="cm-panel" aria-label="Bolt, hint companion">
          <div className="cm-head">
            <BoltAvatar state={state} size={52} calm={calm} />
            <div>
              <p className="cm-name">Bolt</p>
              <p className="cm-role">{state === "talking" ? "Talking" : state === "cheer" ? "Cheering" : "Companion AI"}</p>
            </div>
          </div>
          {HINT_LEVELS.map((lv, i) => (
            <HintLevelCard
              key={lv.id}
              index={i}
              state={revealed > i ? "revealed" : revealed === i ? "ready" : "locked"}
              text={HINTS[i]}
              cost={`−${COST} hull`}
              onReveal={() => setRevealed(i + 1)}
            />
          ))}
          <p className="cm-foot">Hints used: {revealed} of 3 · −{COST} hull each</p>
        </aside>
      </div>
    </section>
  );
}
