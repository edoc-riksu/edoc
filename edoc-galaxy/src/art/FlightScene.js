"use client";

import ArtCanvas from "./ArtCanvas";
import { makeFlight, drawFlight } from "./scenes";

const make = () => makeFlight(11);

/** The "Setting course" scene: the ship under thrust, heading for the planet. */
export default function FlightScene({ className, calm }) {
  return <ArtCanvas make={make} draw={drawFlight} calmOverride={calm} className={className} label="A ship flying toward the planet" />;
}
