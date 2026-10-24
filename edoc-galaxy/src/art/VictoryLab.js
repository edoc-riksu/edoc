"use client";

import { useState } from "react";
import EncounterCleared from "../screens/result/EncounterCleared";

/** Review controls for "Encounter cleared": change what the screen is given and watch it respond. */
export default function VictoryLab() {
  const [hull, setHull] = useState(95);
  const [gain, setGain] = useState(15);
  const [attempts, setAttempts] = useState(2);
  const [calm, setCalm] = useState(false);
  const [run, setRun] = useState(0);
  const [log, setLog] = useState("");
  const num = (v, set) => <input type="number" value={v} onChange={(e) => set(Number(e.target.value))} style={{ width: 64 }} />;
  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <span className="t-label">Encounter cleared</span>
        <label className="t-small t-muted">Hull {num(hull, setHull)}</label>
        <label className="t-small t-muted">Repaired {num(gain, setGain)}</label>
        <label className="t-small t-muted">Attempts {num(attempts, setAttempts)}</label>
        <label className="t-small t-muted"><input type="checkbox" checked={calm} onChange={(e) => setCalm(e.target.checked)} /> Reduced motion</label>
        <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setRun((r) => r + 1)}>Play again</button>
        <span className="t-small t-muted" role="status">{log}</span>
      </div>
      <section aria-label="Encounter cleared" className="ec-lab" style={{ aspectRatio: "1376 / 768", position: "relative", borderRadius: 14, overflow: "hidden", transform: "translateZ(0)" }}>
        <EncounterCleared
          key={`${run}-${calm}`}
          title="Sum of Two Integers"
          concept="Input/Output"
          hull={hull}
          hullGain={gain}
          attempts={attempts}
          runtimeMs={42}
          nextLabel="Next obstacle"
          muted
          calm={calm}
          onContinue={() => setLog("Continue pressed")}
          onReplay={() => setLog("Replayed")}
        />
      </section>
    </>
  );
}
