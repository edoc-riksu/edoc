"use client";

import { useState } from "react";
import SuitUnlocked from "../screens/result/SuitUnlocked";
import { suitUnlockedProps, SUIT_UNLOCK_MOCK } from "../screens/result/suitProps";

/** Review controls for "New suit unlocked": runs on mock data, so nothing here is saved or fetched. */
export default function SuitLab({ initialCalm = false }) {
  const [calm, setCalm] = useState(initialCalm);
  const [run, setRun] = useState(0);
  const [tall, setTall] = useState(false);
  const [explorer, setExplorer] = useState("vega");
  const [log, setLog] = useState("");
  const props = suitUnlockedProps({ ...SUIT_UNLOCK_MOCK, explorer });
  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <span className="t-label">New suit unlocked (mock data)</span>
        <label className="t-small t-muted">
          Explorer{" "}
          <select value={explorer} onChange={(e) => { setExplorer(e.target.value); setRun((r) => r + 1); }}>
            <option value="vega">Vega</option>
            <option value="kael">Kael</option>
            <option value="taro">Taro</option>
            <option value="mira">Mira</option>
          </select>
        </label>
        <label className="t-small t-muted"><input type="checkbox" checked={calm} onChange={(e) => setCalm(e.target.checked)} /> Reduced motion</label>
        <label className="t-small t-muted"><input type="checkbox" checked={tall} onChange={(e) => setTall(e.target.checked)} /> Phone shape</label>
        <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setRun((r) => r + 1)}>Play again</button>
        <span className="t-small t-muted" role="status">{log}</span>
      </div>
      <section aria-label="New suit unlocked" className="su-lab" style={{ aspectRatio: tall ? "390 / 800" : "1376 / 768", maxWidth: tall ? 390 : undefined, margin: tall ? "0 auto" : undefined, width: "100%", position: "relative", borderRadius: 14, overflow: "hidden", transform: "translateZ(0)" }}>
        <SuitUnlocked
          key={calm}
          {...props}
          replay={run}
          muted
          calm={calm}
          onEquip={() => setLog("Equip pressed")}
          onLater={() => setLog("Later pressed")}
        />
      </section>
    </>
  );
}
