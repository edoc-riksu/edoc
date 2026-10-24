"use client";

import { useMemo } from "react";
import ArtCanvas from "./ArtCanvas";
import { makeCockpit, drawCockpit } from "./cockpit";

/** The cockpit around the console: canopy, pillars and dash. `hull` (0..100) drives the lamps, the needle and the colour. */
export default function CockpitFrame({ hull = 100, calm, className = "" }) {
  const make = useMemo(() => () => makeCockpit(), []);
  const params = useMemo(() => ({ hull }), [hull]);
  return <ArtCanvas make={make} draw={drawCockpit} params={params} calmOverride={calm} className={`cockpit ${className}`} label="" />;
}
