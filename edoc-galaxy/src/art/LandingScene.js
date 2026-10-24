"use client";

import { useMemo } from "react";
import ArtCanvas from "./ArtCanvas";
import { makeLanding, drawLanding } from "./landing";

const hitAny = () => true; // module-level so the canvas is not rebuilt (and the animation restarted) on every render

/** The descent and touchdown. severity: 0 smooth, 1 rough, 2 crash. `progress` (0..1) holds the scene at one moment, for review. */
export default function LandingScene({ seed = 31, severity = 0, duration = 9, progress, calm, onPick, onReady, className }) {
  const make = useMemo(() => () => makeLanding(seed), [seed]);
  const params = useMemo(() => ({ severity, duration, progress }), [severity, duration, progress]);
  return <ArtCanvas make={make} draw={drawLanding} params={params} calmOverride={calm} onPick={onPick} onReady={onReady} defer hit={onPick ? hitAny : undefined} className={className} label="Your ship descends through the atmosphere and lands on the planet" />;
}
