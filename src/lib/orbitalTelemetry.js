"use client";

/**
 * 📡 ORBITAL TELEMETRY BUS
 * -------------------------------------------------------------
 * A deliberately un-Reactive shared registry. The Three.js render
 * loop publishes live planetary angles here every frame; 2D HUD
 * surfaces (the Star Chart radar) read them from their own rAF.
 *
 * Nothing here touches React state, so a 60fps telemetry stream
 * costs zero component re-renders.
 */

const registry = {
  angles: Object.create(null),
  frames: 0
};

/** Called from the WebGL tick loop, once per planet per frame. */
export function publishOrbit(id, angle) {
  registry.angles[id] = angle;
}

/** Marks one completed publish pass. Cheap liveness heartbeat. */
export function commitOrbitFrame() {
  registry.frames += 1;
}

/** Returns the live angle in radians, or undefined if never published. */
export function readOrbitAngle(id) {
  return registry.angles[id];
}

/** True once the WebGL scene has published at least one frame. */
export function isTelemetryLive() {
  return registry.frames > 0;
}

/** Total frames published since load — used for the radar link readout. */
export function telemetryFrameCount() {
  return registry.frames;
}
