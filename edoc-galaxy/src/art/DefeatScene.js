"use client";

import { useMemo } from "react";
import ArtCanvas from "./ArtCanvas";
import { makeDefeat, drawDefeat, hitDefeat } from "./defeat";

/** The ship drifting after the hull is gone. Click the ship to shake loose sparks (`onPoke` fires). `calm` shows one still frame. */
export default function DefeatScene({ seed = 17, calm, onPoke, onHover, className }) {
  const make = useMemo(() => () => makeDefeat(seed), [seed]);
  return (
    <ArtCanvas
      make={make}
      draw={drawDefeat}
      hit={hitDefeat}
      calmOverride={calm}
      onHover={onHover}
      onPick={(S) => {
        S.burstAt = S.t;
        onPoke?.();
      }}
      className={className}
      label="Your damaged ship drifts in the dark, venting, with the asteroid that beat you behind it"
    />
  );
}
