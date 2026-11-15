"use client";

import { useState } from "react";
import ModuleCleared from "../screens/result/ModuleCleared";
import { moduleClearedProps, MODULE_CLEARED_MOCK } from "../screens/result/moduleProps";

/** Review controls for "Module cleared": runs on mock data, so nothing here is saved or fetched. */
export default function ModuleClearedLab({ initialCalm = false }) {
  const [calm, setCalm] = useState(initialCalm);
  const [count, setCount] = useState(10);
  const [reward, setReward] = useState(true);
  const [last, setLast] = useState(false);
  const [tall, setTall] = useState(false);
  const [painting, setPainting] = useState(true);
  const [run, setRun] = useState(0);
  const [log, setLog] = useState("");
  const props = moduleClearedProps({
    ...MODULE_CLEARED_MOCK,
    module: { ...MODULE_CLEARED_MOCK.module, encounterCount: count },
    total: count,
    cleared: count,
    reward: reward ? MODULE_CLEARED_MOCK.reward : "",
    nextTitle: last ? "" : MODULE_CLEARED_MOCK.nextTitle
  });
  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <span className="t-label">Module cleared (mock data)</span>
        <label className="t-small t-muted">
          Encounters{" "}
          <input type="number" min={1} max={30} value={count} onChange={(e) => { setCount(Number(e.target.value) || 1); setRun((r) => r + 1); }} style={{ width: 56 }} />
        </label>
        <label className="t-small t-muted"><input type="checkbox" checked={reward} onChange={(e) => setReward(e.target.checked)} /> Reward line</label>
        <label className="t-small t-muted"><input type="checkbox" checked={last} onChange={(e) => setLast(e.target.checked)} /> Last module</label>
        <label className="t-small t-muted"><input type="checkbox" checked={painting} onChange={(e) => setPainting(e.target.checked)} /> Module map painting</label>
        <label className="t-small t-muted"><input type="checkbox" checked={calm} onChange={(e) => setCalm(e.target.checked)} /> Reduced motion</label>
        <label className="t-small t-muted"><input type="checkbox" checked={tall} onChange={(e) => setTall(e.target.checked)} /> Phone shape</label>
        <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setRun((r) => r + 1)}>Play again</button>
        <span className="t-small t-muted" role="status">{log}</span>
      </div>
      <section
        aria-label="Module cleared"
        className={`mc-lab ${tall ? "mc-lab--tall" : ""}`}
        style={{ aspectRatio: tall ? "390 / 800" : "1376 / 768", maxWidth: tall ? 390 : undefined, margin: tall ? "0 auto" : undefined, width: "100%", position: "relative", borderRadius: 14, overflow: "hidden", transform: "translateZ(0)" }}
      >
        <ModuleCleared key={`${calm}-${painting}`} {...props} backdrop={painting ? props.backdrop : undefined} replay={run} muted calm={calm} onContinue={() => setLog("Continue pressed")} />
      </section>
    </>
  );
}
