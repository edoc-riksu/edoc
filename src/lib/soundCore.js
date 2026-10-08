"use client";

/**
 * 🔊 MECHANICAL INSTRUMENT PANEL SOUND CORE
 * -------------------------------------------------------------
 * Zero-asset audio: every cue is synthesised at call time from
 * oscillators, filtered noise and a single procedural noise buffer.
 * No mp3 fetch, no decode latency, no bundle weight.
 *
 * Every voice is built as a physical mechanism — a relay clacking,
 * a stepper motor slewing, a bolt seating — rather than a musical
 * pitch sweep. This is a deliberate departure from an earlier
 * arcade-synth pack: the reference brief was a cockpit instrument
 * panel's tactile clicks and servo whirs, not a chiptune.
 *

 * Browsers refuse to start an AudioContext before a user gesture,
 * so the context is created lazily on the first play() and resumed
 * opportunistically. Calls made before that gesture are no-ops
 * rather than errors.
 */

let audioCtx = null;
let masterGain = null;
let noiseBuffer = null;
let masterVolume = 0.4;

/** Per-voice throttle so rapid hover streams do not machine-gun. */
const lastFired = Object.create(null);

function getContext() {
  if (typeof window === "undefined") return null;

  if (!audioCtx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    try {
      audioCtx = new Ctor();
    } catch {
      return null;
    }
    masterGain = audioCtx.createGain();
    masterGain.gain.value = masterVolume;
    masterGain.connect(audioCtx.destination);
  }

  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function getNoiseBuffer(ctx) {
  if (noiseBuffer) return noiseBuffer;
  const frames = Math.floor(ctx.sampleRate * 0.8);
  noiseBuffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const channel = noiseBuffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) channel[i] = Math.random() * 2 - 1;
  return noiseBuffer;
}

/** A single pitched partial with an exponential decay envelope. */
function partial(ctx, { type = "sine", from, to = null, at = 0, dur = 0.12, peak = 0.2 }) {
  const t0 = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(20, from), t0);
  if (to !== null && to !== from) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
  }

  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(peak, t0 + Math.min(0.014, dur * 0.3));
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

/** Band-passed noise transient — used for clicks, thrusters and warps. */
function transient(ctx, { at = 0, dur = 0.16, peak = 0.1, freq = 1400, sweepTo = null, q = 1.1 }) {
  const t0 = ctx.currentTime + at;
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = q;
  filter.frequency.setValueAtTime(freq, t0);
  if (sweepTo) filter.frequency.exponentialRampToValueAtTime(Math.max(40, sweepTo), t0 + dur);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(peak, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  src.start(t0);
  src.stop(t0 + dur + 0.03);
}

/**
 * A punchy low-frequency contact impact — a relay armature striking its
 * stop, a bolt seating, a switch bottoming out. Pairs a very short sine
 * "thud" (the mass) with a tight noise crack (the contact surface) so it
 * reads as a physical collision rather than a tone.
 */
function clack(ctx, { at = 0, peak = 0.09, freq = 150, crackFreq = 2400, dur = 0.05 }) {
  partial(ctx, { type: "sine", from: freq, to: freq * 0.6, at, dur, peak });
  transient(ctx, { at, dur: dur * 0.6, peak: peak * 0.7, freq: crackFreq, q: 2.2 });
}

/**
 * A short filtered-noise sweep standing in for a stepper/servo winding up
 * or down — the motion cue underneath most of these voices, as distinct
 * from a musical pitch bend as the mechanism's whir is from a chime.
 */
function servo(ctx, { at = 0, dur = 0.14, peak = 0.05, from = 500, to = 1800, q = 5 }) {
  transient(ctx, { at, dur, peak, freq: from, sweepTo: to, q });
}

/**
 * Voice library. Each entry returns nothing and simply schedules
 * partials/transients against the shared master bus. Every voice here is
 * built from impacts (`clack`), motion (`servo`) and raw noise (`transient`)
 * rather than musical pitches — the brief is a physical instrument panel
 * (relays, switches, stepper motors), not a synthesizer.
 * `throttle` is the minimum gap in ms between retriggers.
 */
const VOICES = {
  // Featherweight contact tick — a finger brushing a membrane switch.
  HOVER: {
    throttle: 55,
    render: (ctx) => {
      transient(ctx, { dur: 0.014, peak: 0.03, freq: 3400, q: 3 });
    }
  },

  // Two-stage relay clack: the strike, then a faint contact bounce.
  CLICK: {
    throttle: 40,
    render: (ctx) => {
      clack(ctx, { peak: 0.1, freq: 190, crackFreq: 2800, dur: 0.045 });
      clack(ctx, { at: 0.032, peak: 0.03, freq: 260, crackFreq: 3200, dur: 0.025 });
    }
  },

  // A single dry key-switch tick.
  TYPE: {
    throttle: 18,
    render: (ctx) => {
      transient(ctx, { dur: 0.016, peak: 0.032, freq: 3000, q: 3.2 });
    }
  },

  // A full mechanical-keyboard keystroke for typed text: key-down thud with a
  // bright contact crack, then a faint key-up. Pitch wobbles a little per hit
  // so a run of letters sounds like fingers, not a machine gun.
  KEY: {
    throttle: 10,
    render: (ctx) => {
      const v = 0.9 + Math.random() * 0.25;
      partial(ctx, { type: "sine", from: 190 * v, to: 105 * v, dur: 0.05, peak: 0.13 });
      transient(ctx, { dur: 0.032, peak: 0.2, freq: 2700 * v, q: 2.2 });
      transient(ctx, { at: 0.04, dur: 0.02, peak: 0.05, freq: 1900 * v, q: 3 });
    }
  },

  // Stepper motor slews onto target, then the gimbal clamp seats.
  LOCK: {
    throttle: 90,
    render: (ctx) => {
      servo(ctx, { dur: 0.11, peak: 0.055, from: 700, to: 2200, q: 6 });
      clack(ctx, { at: 0.1, peak: 0.11, freq: 210, crackFreq: 2600, dur: 0.055 });
    }
  },

  // Ratchet: three evenly-spaced, ascending contact clicks — the tactile
  // "counting up" feel of a mechanical counter — closed out by a settle clunk.
  SUCCESS: {
    throttle: 150,
    render: (ctx) => {
      [0, 0.075, 0.15].forEach((at, i) => {
        clack(ctx, { at, peak: 0.07 + i * 0.012, freq: 240 + i * 70, crackFreq: 2800 + i * 300, dur: 0.032 });
      });
      clack(ctx, { at: 0.24, peak: 0.1, freq: 160, crackFreq: 2000, dur: 0.07 });
    }
  },

  // Rejection buzzer: a low relay chattering twice against a bad contact.
  ERROR: {
    throttle: 150,
    render: (ctx) => {
      [0, 0.09].forEach((at) => {
        partial(ctx, { type: "square", from: 132, to: 96, at, dur: 0.08, peak: 0.075 });
        transient(ctx, { at, dur: 0.07, peak: 0.04, freq: 500, q: 1.4 });
      });
    }
  },

  // Heavier bolt-release: a deep thunk, a rising servo whir as the hatch
  // swings, then a soft latch tick on completion.
  UNLOCK: {
    throttle: 200,
    render: (ctx) => {
      clack(ctx, { peak: 0.13, freq: 110, crackFreq: 1800, dur: 0.08 });
      servo(ctx, { at: 0.05, dur: 0.32, peak: 0.05, from: 300, to: 2400, q: 4 });
      clack(ctx, { at: 0.36, peak: 0.05, freq: 320, crackFreq: 3400, dur: 0.03 });
    }
  },

  // Gyro/flywheel spin-up — a resonant noise sweep with real inertia to it.
  WARP: {
    throttle: 260,
    render: (ctx) => {
      transient(ctx, { dur: 0.6, peak: 0.075, freq: 220, sweepTo: 3600, q: 3.5 });
      partial(ctx, { type: "triangle", from: 70, to: 260, dur: 0.55, peak: 0.045 });
    }
  },

  // Electromechanical power-on: contactor closes, capacitor bank whines up,
  // relay bank confirms with a clean click.
  BOOT: {
    throttle: 400,
    render: (ctx) => {
      clack(ctx, { peak: 0.12, freq: 90, crackFreq: 1400, dur: 0.09 });
      servo(ctx, { at: 0.08, dur: 0.9, peak: 0.04, from: 200, to: 1400, q: 5 });
      clack(ctx, { at: 1.0, peak: 0.06, freq: 300, crackFreq: 3000, dur: 0.035 });
    }
  },

  // Soft double-tick — a relay latching gently, not a chime.
  TOAST: {
    throttle: 90,
    render: (ctx) => {
      transient(ctx, { dur: 0.02, peak: 0.045, freq: 2600, q: 2.8 });
      transient(ctx, { at: 0.05, dur: 0.024, peak: 0.03, freq: 3400, q: 2.8 });
    }
  },

  // Panel engaging: short rising servo sweep into a light seating click.
  OPEN: {
    throttle: 90,
    render: (ctx) => {
      servo(ctx, { dur: 0.09, peak: 0.05, from: 600, to: 2000, q: 5 });
      clack(ctx, { at: 0.08, peak: 0.05, freq: 260, crackFreq: 3000, dur: 0.03 });
    }
  },

  // Panel disengaging: the same mechanism reversed.
  CLOSE: {
    throttle: 90,
    render: (ctx) => {
      servo(ctx, { dur: 0.09, peak: 0.045, from: 1800, to: 500, q: 5 });
      clack(ctx, { at: 0.08, peak: 0.04, freq: 200, crackFreq: 2400, dur: 0.03 });
    }
  }
};

/** Fire a named voice. Unknown ids fall back to CLICK. Safe to call anywhere. */
export function playVoice(id) {
  const voice = VOICES[id] || VOICES.CLICK;
  const now = typeof performance !== "undefined" ? performance.now() : 0;
  if (lastFired[id] && now - lastFired[id] < voice.throttle) return;
  lastFired[id] = now;

  const ctx = getContext();
  if (!ctx) return;
  try {
    voice.render(ctx);
  } catch {
    /* An exhausted or blocked audio graph must never break the UI. */
  }
}

/** 0 → 1. Persisted by the caller; applied immediately to the live bus. */
export function setMasterVolume(value) {
  masterVolume = Math.max(0, Math.min(1, value));
  if (masterGain) masterGain.gain.value = masterVolume;
}

/** Call from any first user gesture to warm the context ahead of real cues. */
export function primeAudio() {
  getContext();
}

export const VOICE_IDS = Object.keys(VOICES);
