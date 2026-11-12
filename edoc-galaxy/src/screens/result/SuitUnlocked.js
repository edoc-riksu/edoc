"use client";

import { useEffect, useRef } from "react";
import HangarSuitStage from "./HangarSuitStage";
import Button from "../../ui/Button";
import Panel from "../../ui/Panel";
import { sfx } from "../../galaxy/audio";
import "./suit.css";

/**
 * "New suit unlocked". Props only: it fetches nothing and saves nothing, so any screen can show it when a pilot earns a suit.
 *
 *   <SuitUnlocked suitName="Starfarer set" reason="You cleared every encounter in Python Basics." blurb="..."
 *     onEquip={...} onLater={...} />
 *
 * `explorerId` ("vega", "kael", "taro" or "mira", the pilot's own explorer from the hangar) picks who stands on the podium;
 * they change from the base suit into the new one. `reason` says what earned it; `blurb` is one line about the suit (both optional). "Equip" is the main action (Enter does the
 * same); "Later" (or Escape) closes the scene and leaves the suit in the hangar. `replay` plays the reveal again when its number
 * changes. `muted` turns the chime off; `calm` is reduced motion and shows the finished frame.
 */
export default function SuitUnlocked({
  suitName = "New suit",
  reason,
  blurb,
  equipLabel = "Equip Suit",
  laterLabel = "Later",
  onEquip,
  onLater,
  explorerId,
  replay = 0,
  muted = false,
  calm = false
}) {
  const btn = useRef(null);

  useEffect(() => {
    btn.current?.focus();
  }, []);

  // the chime lands as the explorer changes into the new suit
  const chime = () => {
    if (!muted && !calm) sfx.arrive();
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onLater?.();
      else if (e.key === "Enter" && !e.target.closest?.("button, a, input, textarea")) onEquip?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onEquip, onLater]);

  return (
    <div className={`su ${calm ? "su--calm" : ""}`}>
      <div className="su-scene">
        <HangarSuitStage explorerId={explorerId} replay={replay} calm={calm} onSwap={chime} />
      </div>
      <Panel as="section" size="md" className="su-panel" eyebrow="Loadout" title="Suit unlocked" aria-label="Suit unlocked">
        <div className="su-info">
          <p className="su-info-name">{suitName}</p>
          {reason && <p className="su-info-reason">{reason}</p>}
          {blurb && <p className="su-info-blurb">{blurb}</p>}
        </div>
        <div className="su-actions">
          <Button ref={btn} size="lg" full onClick={onEquip}>
            {equipLabel}
          </Button>
          {onLater && (
            <Button variant="secondary" size="lg" full onClick={onLater}>
              {laterLabel}
            </Button>
          )}
        </div>
      </Panel>
    </div>
  );
}
