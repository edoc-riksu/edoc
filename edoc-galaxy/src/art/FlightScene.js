"use client";

import ArtCanvas from "./ArtCanvas";
import { makeFlight, drawFlight } from "./scenes";

const make = () => makeFlight(11);
const hitAny = () => true;

/** The "Setting course" scene: the ship under thrust, heading for the planet. */
export default function FlightScene({ className, calm, duration, onPick }) {
  return <ArtCanvas make={make} draw={drawFlight} params={{ duration }} calmOverride={calm} onPick={onPick} hit={duration ? hitAny : undefined} className={className} label="A ship flying toward the planet" />;
}
