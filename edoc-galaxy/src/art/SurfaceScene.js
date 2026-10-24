"use client";

import { useMemo } from "react";
import ArtCanvas from "./ArtCanvas";
import { makeSurface, drawSurface, hitSurface } from "./surface";

/** The planet's surface at dusk with the ship where it came down. severity: 0 smooth, 1 rough, 2 crashed. */
export default function SurfaceScene({ seed = 21, severity = 0, calm, onPick, onHover, className }) {
  const make = useMemo(() => () => makeSurface(seed), [seed]);
  const params = useMemo(() => ({ severity }), [severity]);
  return <ArtCanvas make={make} draw={drawSurface} hit={hitSurface} params={params} calmOverride={calm} onPick={onPick} onHover={onHover} className={className} label="The planet's surface at dusk, with your ship on the ground" />;
}
