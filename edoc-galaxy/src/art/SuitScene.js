"use client";

import { useMemo } from "react";
import ArtCanvas from "./ArtCanvas";
import { makeSuitScene, drawSuitScene } from "./suit";

/** A suit is revealed on its pedestal. `replay` (change the number) plays the reveal again. `calm` shows the finished frame. */
export default function SuitScene({ seed = 5, replay = 0, calm, className, label = "A new space suit is lit up on its pedestal in the hangar" }) {
  const make = useMemo(() => () => makeSuitScene(seed), [seed]);
  const params = useMemo(() => ({ replayKey: replay }), [replay]);
  return <ArtCanvas make={make} draw={drawSuitScene} params={params} calmOverride={calm} className={className} label={label} />;
}
