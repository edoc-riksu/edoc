"use client";

import { useState } from "react";
import CockpitFrame from "./CockpitFrame";
import "../screens/approach/approach.css";

/** Review control for the cockpit frame: drag the hull number and watch the lamps, the dial and the colour follow. */
export default function CockpitLab({ hull = 100 }) {
  const [v, setV] = useState(hull);
  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <span className="t-label">Cockpit</span>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="t-small t-muted">Hull {v}%</span>
          <input type="range" min="0" max="100" step="1" value={v} onChange={(e) => setV(Number(e.target.value))} aria-label="Hull" />
        </label>
      </div>
      <section aria-label="Cockpit frame" style={{ aspectRatio: "1376 / 768", position: "relative", borderRadius: 14, overflow: "hidden", transform: "translateZ(0)", background: "#04070d" }}>
        <CockpitFrame hull={v} />
      </section>
    </>
  );
}
