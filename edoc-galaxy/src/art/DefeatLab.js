"use client";

import { useState } from "react";
import HullDepleted from "../screens/result/HullDepleted";

/** Review controls for "Hull depleted": change what the screen is given and watch it respond. */
export default function DefeatLab() {
  const [calm, setCalm] = useState(false);
  const [withText, setWithText] = useState(true);
  const [run, setRun] = useState(0);
  const [log, setLog] = useState("");
  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <span className="t-label">Hull depleted</span>
        <label className="t-small t-muted"><input type="checkbox" checked={withText} onChange={(e) => setWithText(e.target.checked)} /> With explanation</label>
        <label className="t-small t-muted"><input type="checkbox" checked={calm} onChange={(e) => setCalm(e.target.checked)} /> Reduced motion</label>
        <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setRun((r) => r + 1)}>Play again</button>
        <span className="t-small t-muted" role="status">{log}</span>
      </div>
      <section aria-label="Hull depleted" className="hd-lab" style={{ aspectRatio: "1376 / 768", position: "relative", borderRadius: 14, overflow: "hidden", transform: "translateZ(0)" }}>
        <HullDepleted
          key={`${run}-${calm}-${withText}`}
          concept={withText ? "Loops" : undefined}
          explanation={withText ? <p>Your loop stopped one step early, so the last number was never added. A <code>range(n)</code> ends before <code>n</code>; to include it, count to <code>n + 1</code>.</p> : undefined}
          failedTests={withText ? ["Sample test 2"] : undefined}
          attempts={3}
          muted
          calm={calm}
          onRematch={() => setLog("Rematch pressed")}
        />
      </section>
    </>
  );
}
