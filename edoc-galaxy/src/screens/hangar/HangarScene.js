"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ArtCanvas from "../../art/ArtCanvas";
import { drawHangarScene, hitHangar, makeHangarScene } from "./hangarArt";
import { sfx } from "../../galaxy/audio";

const EXPLORER_NAME = { vega: "Male", taro: "Female" };
const SUIT_NAME = { base: "Base suit", starfarer: "Starfarer set" };

const make = () => makeHangarScene();

/**
 * The hangar bay: ship, platform and pilot, drawn in code like every other
 * scene in this app. The pilot and the wardrobe doors are clickable — same
 * effect as picking them in the loadout panel, never the only way to do it
 * (the panel stays fully keyboard-operable on its own).
 */
export default function HangarScene({ explorer, suit, onPilotPick, onSuitPick }) {
  const [calm, setCalm] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("edoc-galaxy-settings") || "null");
      setCalm(saved?.motion === "reduced");
    } catch {
      setCalm(false);
    }
  }, []);

  // A brief glow on the pilot right after picking a new explorer — ties the
  // panel list to the bay, not just text changing. Skips the very first
  // render (mounting with a saved explorer isn't "just picked").
  const [pulseAt, setPulseAt] = useState(null);
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) setPulseAt(performance.now());
    mounted.current = true;
  }, [explorer]);

  const params = useMemo(() => ({ explorer, suit, pulseAt }), [explorer, suit, pulseAt]);

  return (
    <ArtCanvas
      make={make}
      draw={drawHangarScene}
      hit={hitHangar}
      onHover={(over) => { if (over) sfx.hover(); }}
      onPick={(S) => {
        if (S.hitKind === "pilot") {
          sfx.select();
          onPilotPick?.();
        } else if (S.hitKind === "suit-base" || S.hitKind === "suit-starfarer") {
          sfx.select();
          onSuitPick?.(S.hitKind === "suit-base" ? "base" : "starfarer");
        }
      }}
      params={params}
      calmOverride={calm}
      defer
      loadingLabel="Opening the hangar"
      className="hg-scene-canvas"
      label={`${EXPLORER_NAME[explorer] || "Pilot"} on the hangar platform, wearing the ${SUIT_NAME[suit] || "base suit"}. Click the pilot to switch explorer, or a wardrobe door to preview a suit.`}
    />
  );
}
