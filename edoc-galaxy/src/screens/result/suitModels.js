/**
 * The explorer models the "New suit unlocked" scene puts on the hangar's podium.
 *
 * These are the same files, and the same pairing, as HangarScreen.js (AVATAR_MODEL and AVATAR_MODEL_STARFARER) - copied
 * rather than imported because that file is Frontend 2's and does not export them. If the hangar gets a new explorer or a new
 * model, add it here too. Credits for the models are in public/art/ORIGIN.md.
 */
export const EXPLORER_NAMES = { vega: "Vega", kael: "Kael", taro: "Taro", mira: "Mira" };

const BASE = {
  vega: "/art/hangar/models/avatar-male.glb",
  kael: "/art/hangar/models/avatar-kael.glb",
  taro: "/art/hangar/models/avatar-taro.glb",
  mira: "/art/hangar/models/avatar-female.glb"
};
const STARFARER = {
  vega: "/art/hangar/models/avatar-male-starfarer.glb",
  kael: "/art/hangar/models/avatar-kael-starfarer.glb",
  taro: "/art/hangar/models/avatar-taro-starfarer.glb",
  mira: "/art/hangar/models/avatar-female-starfarer.glb"
};

/** The explorer id to use: the pilot's own if the hangar knows it, otherwise Vega (the hangar's default). */
export function knownExplorer(id) {
  return Object.prototype.hasOwnProperty.call(BASE, id) ? id : "vega";
}

/** { base, starfarer } model urls for an explorer. Each Starfarer model has the suit baked into its own texture. */
export function modelsFor(id) {
  const k = knownExplorer(id);
  return { base: BASE[k], starfarer: STARFARER[k] };
}
