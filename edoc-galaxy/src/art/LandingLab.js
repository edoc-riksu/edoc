"use client";

import { useState } from "react";
import LandingScene from "./LandingScene";
import SurfaceScene from "./SurfaceScene";

const NAMES = ["Smooth", "Rough", "Crash"];

/** Review controls for the landing and surface scenes: pick a severity, play the descent or scrub it by hand. */
export default function LandingLab({ sev = 0, at = null }) {
  const [severity, setSeverity] = useState(Math.min(2, Math.max(0, sev)));
  const [at_, setAt] = useState(at); // null = play
  const [run, setRun] = useState(0);
  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <span className="t-label">Landing</span>
        {NAMES.map((n, i) => (
          <button key={n} type="button" className="ui-btn ui-btn--secondary" aria-pressed={severity === i} style={{ opacity: severity === i ? 1 : 0.6 }} onClick={() => { setSeverity(i); setRun((r) => r + 1); }}>
            {n}
          </button>
        ))}
        <button type="button" className="ui-btn ui-btn--secondary" onClick={() => { setAt(null); setRun((r) => r + 1); }}>
          Play again
        </button>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="t-small t-muted">Scrub</span>
          <input type="range" min="0" max="1" step="0.005" value={at_ ?? 0} onChange={(e) => setAt(Number(e.target.value))} aria-label="Scrub the landing" />
        </label>
      </div>
      <section aria-label="Landing scene" style={{ aspectRatio: "1376 / 768", position: "relative", borderRadius: 14, overflow: "hidden" }}>
        <LandingScene key={`${severity}-${run}`} severity={severity} progress={at_ ?? undefined} />
      </section>
      <section aria-label="Surface scene" style={{ aspectRatio: "1376 / 768", position: "relative", borderRadius: 14, overflow: "hidden" }}>
        <SurfaceScene severity={severity} />
      </section>
    </>
  );
}
