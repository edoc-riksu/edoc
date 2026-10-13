"use client";

import ArtCanvas from "./ArtCanvas";
import { makeApproach, drawApproach, hitApproach } from "./scenes";

const make = () => makeApproach(7);

/** The cockpit view: rock field, the scanner lock on the big rock, the planet ahead. `variant` picks which rock is locked. */
export default function ApproachScene({ className, variant = 0, onPick, onHover, calm }) {
  return (
    <ArtCanvas
      make={make}
      draw={drawApproach}
      hit={hitApproach}
      params={{ variant }}
      onPick={onPick}
      onHover={onHover}
      calmOverride={calm}
      className={className}
      label="Cockpit view of an asteroid field with the planet ahead"
    />
  );
}
