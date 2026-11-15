"use client";

import { useMemo } from "react";
import ArtCanvas from "./ArtCanvas";
import { makeMedalScene, drawMedalScene } from "./medal";

/** A medal inside a ring of lamps, one lamp per encounter, lighting up one after another. `overlay` leaves the canvas clear so a painting can sit behind it. `replay` (change the number) plays it again; `calm` shows the finished frame. */
export default function MedalScene({ count = 10, seed = 8, rgb, overlay = false, replay = 0, calm, className, label = "A medal inside a ring of lamps. The lamps light up one by one until the whole ring glows" }) {
  const make = useMemo(() => () => makeMedalScene(seed), [seed]);
  const params = useMemo(() => ({ count, rgb, overlay, replayKey: replay }), [count, rgb, overlay, replay]);
  return <ArtCanvas make={make} draw={drawMedalScene} params={params} calmOverride={calm} className={className} label={label} />;
}
