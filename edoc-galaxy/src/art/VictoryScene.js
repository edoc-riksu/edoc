"use client";

import { useMemo } from "react";
import ArtCanvas from "./ArtCanvas";
import { makeVictory, drawVictory, hitVictory } from "./victory";

/** The rock breaks and the way opens. Click the rock to watch it again (`onReplay` fires). `calm` shows the finished frame. */
export default function VictoryScene({ seed = 12, calm, onReplay, className }) {
  const make = useMemo(() => () => makeVictory(seed), [seed]);
  return (
    <ArtCanvas
      make={make}
      draw={drawVictory}
      hit={hitVictory}
      calmOverride={calm}
      onPick={(S) => {
        S.replayAt = S.t;
        onReplay?.();
      }}
      className={className}
      label="Your pulse cracks the asteroid and it breaks apart, opening the way ahead"
    />
  );
}
