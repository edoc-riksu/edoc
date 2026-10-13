/**
 * Tiny synthesized sounds (no files): a soft tick on hover, a click on
 * select, a rising whoosh for take-off, a chime on landing. Browsers only
 * allow sound after the first tap or key press, so the context is created
 * lazily on the first call.
 */
let ctx = null;
let master = null;
let enabled = true;

function ensure() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

export function setSoundEnabled(on) {
  enabled = on;
}

function tone({ type = "sine", from, to, dur, gain = 0.08, attack = 0.005, delay = 0 }) {
  const c = ensure();
  if (!c || !enabled) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noiseSweep({ from, to, dur, gain = 0.06 }) {
  const c = ensure();
  if (!c || !enabled) return;
  const t0 = c.currentTime;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 2.5;
  filter.frequency.setValueAtTime(from, t0);
  filter.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start(t0);
}

export const sfx = {
  hover: () => tone({ type: "sine", from: 880, to: 1320, dur: 0.06, gain: 0.03 }),
  select: () => tone({ type: "triangle", from: 520, to: 780, dur: 0.12, gain: 0.07 }),
  denied: () => tone({ type: "square", from: 190, to: 130, dur: 0.16, gain: 0.04 }),
  tick: () => tone({ type: "sine", from: 1500, to: 1100, dur: 0.035, gain: 0.02 }),
  launch: () => {
    noiseSweep({ from: 300, to: 3600, dur: 1.6, gain: 0.09 });
    tone({ type: "sawtooth", from: 90, to: 360, dur: 1.5, gain: 0.025 });
  },
  arrive: () => {
    tone({ type: "sine", from: 660, to: 660, dur: 0.9, gain: 0.06 });
    tone({ type: "sine", from: 990, to: 990, dur: 1.1, gain: 0.04, delay: 0.12 });
    tone({ type: "sine", from: 1320, to: 1320, dur: 1.3, gain: 0.03, delay: 0.24 });
  }
};
