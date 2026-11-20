"use client";

import { useEffect, useRef } from "react";
import { Gift } from "lucide-react";
import MedalScene from "../../art/MedalScene";
import { lampCount, lampTimes } from "../../art/medal";
import Button from "../../ui/Button";
import Panel from "../../ui/Panel";
import useStill from "../../art/useStill";
import { sfx } from "../../galaxy/audio";
import "./module-cleared.css";

/**
 * "Module cleared". Props only: it fetches nothing and saves nothing, so any screen can show it when a pilot solves the last
 * encounter of a module.
 *
 *   <ModuleCleared moduleName="Python Basics" planetName="Python" backdrop="/art/modules/python-surface.jpg"
 *     cleared={10} total={10} reward="New suit unlocked: Starfarer set" nextLabel="Next: Loops" onContinue={...} />
 *
 * It sits where the module map sits: the map's own painting fills the screen (`backdrop`, dimmed; without one, a code-drawn night
 * sky), a medal stands in a ring of lamps, one lamp for every encounter, and a glass panel on the right - the same panel the
 * hangar uses - says what was cleared. The lamps light one after another, then the panel rises. `reward` is one line about what
 * was earned (optional). Enter continues. `muted` turns the chime off; `replay` plays it again when its number changes; `calm`
 * is reduced motion and shows the finished picture.
 */
export default function ModuleCleared({
  moduleName = "This module",
  planetName,
  backdrop,
  cleared,
  total,
  reward,
  nextLabel = "Back to the module map",
  onContinue,
  replay = 0,
  muted = false,
  calm: calmProp = false
}) {
  const btn = useRef(null);
  const calm = useStill(calmProp);
  const lamps = lampCount(total ?? cleared);

  useEffect(() => {
    btn.current?.focus();
  }, []);

  // the chime lands as the last lamp comes on
  useEffect(() => {
    if (muted || calm) return undefined;
    const id = setTimeout(() => sfx.arrive(), lampTimes(lamps).done * 1000);
    return () => clearTimeout(id);
  }, [muted, calm, replay, lamps]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Enter" && !e.target.closest?.("button, a, input, textarea")) onContinue?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onContinue]);

  const count = total != null && total > 0 ? `${cleared ?? total} of ${total} encounters cleared` : null;

  return (
    <div className={`mc ${calm ? "mc--calm" : ""}`}>
      {backdrop && (
        <>
          {/* the painting is decoration: the panel says everything it shows */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="mc-backdrop" src={backdrop} alt="" />
          <div className="mc-veil" aria-hidden="true" />
        </>
      )}
      <div className="mc-scene">
        <MedalScene count={lamps} overlay={!!backdrop} replay={replay} calm={calm} />
      </div>
      <Panel as="section" size="md" className="mc-panel" eyebrow={planetName || "Module"} title="Module cleared" aria-label="Module cleared">
        <div className="mc-info">
          <p className="mc-info-name">{moduleName}</p>
          {count && <p className="mc-info-count">{count}</p>}
          {reward && (
            <p className="mc-info-reward">
              <Gift size={14} aria-hidden="true" /> {reward}
            </p>
          )}
        </div>
        <Button ref={btn} size="lg" full onClick={onContinue}>
          {nextLabel}
        </Button>
      </Panel>
    </div>
  );
}
