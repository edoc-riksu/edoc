"use client";

import { useEffect, useRef } from "react";
import { ChevronRight, Check } from "lucide-react";
import VictoryScene from "../../art/VictoryScene";
import Button from "../../ui/Button";
import HullBar from "../../ui/HullBar";
import { sfx } from "../../galaxy/audio";
import "./result.css";

/**
 * "Encounter cleared". Props only: it fetches nothing and saves nothing, so any screen can show it with the numbers it has.
 *
 *   <EncounterCleared title="Sum of Two Integers" concept="Input/Output" hull={95} hullGain={15} attempts={2}
 *     runtimeMs={42} nextLabel="Next obstacle" onContinue={...} onReplay={...} />
 *
 * hull is the pilot's hull after the win (0..100); hullGain is how much the win repaired (shown as "+15", skipped at 0);
 * attempts and runtimeMs are shown when given. Enter continues. `muted` turns the chime off; `calm` is reduced motion.
 */
export default function EncounterCleared({
  title,
  concept,
  hull = 100,
  hullGain = 0,
  attempts,
  runtimeMs,
  nextLabel = "Continue",
  onContinue,
  onReplay,
  muted = false,
  calm = false
}) {
  const btn = useRef(null);
  useEffect(() => {
    if (!muted && !calm) sfx.arrive();
    btn.current?.focus();
  }, [muted, calm]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Enter" && !e.target.closest?.("button, a, input, textarea")) onContinue?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onContinue]);

  const stats = [];
  if (attempts != null) stats.push(["Attempts", String(attempts)]);
  if (runtimeMs != null) stats.push(["Run time", `${Math.round(runtimeMs)} ms`]);

  return (
    <div className="ec">
      <div className="ec-scene">
        <VictoryScene calm={calm} onReplay={() => { if (!muted && !calm) sfx.arrive(); onReplay?.(); }} />
      </div>
      <section className="ec-card" aria-labelledby="ec-title">
        <p className="ec-eyebrow">
          <Check size={14} aria-hidden="true" /> Encounter cleared
        </p>
        <h2 id="ec-title" className="ec-title">
          {title}
        </h2>
        {concept && <p className="ec-concept">You used: <b>{concept}</b></p>}
        <div className="ec-stats">
          <div className="ec-hull">
            <HullBar value={hull} />
            {hullGain > 0 && <span className="ec-gain">+{Math.round(hullGain)} repaired</span>}
          </div>
          {stats.map(([k, v]) => (
            <span key={k} className="ec-stat">
              {k} <b>{v}</b>
            </span>
          ))}
        </div>
        <div className="ec-actions">
          <Button ref={btn} size="lg" onClick={onContinue}>
            {nextLabel}
            <ChevronRight size={16} aria-hidden="true" />
          </Button>
        </div>
        <p className="ec-keys" aria-hidden="true">
          <kbd>Enter</kbd> {nextLabel.toLowerCase()} · click the rock to see it break again
        </p>
      </section>
    </div>
  );
}
