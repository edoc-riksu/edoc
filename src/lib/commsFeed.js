/**
 * 📡 COMMS FEED — SEED TRANSMISSIONS
 * -------------------------------------------------------------
 * Frontend-only mock data for The Comm-Link's social feed (the
 * "Cap Log" tab). No backend — everything here is seed content
 * merged with whatever a pilot posts locally, persisted to
 * localStorage under HUD_COMM_FEED so it survives a reload.
 *
 * Channels reuse the same sector catalog everything else in the
 * app reads from (see planetarySystem.js) so a #PY tag here means
 * the same thing it means in Flight Academy.
 */
import { PLANETARY_SYSTEM } from "./planetarySystem";

export const CHANNELS = ["General", ...PLANETARY_SYSTEM.map((s) => s.short), "Memes", "Career"];

/** Deterministic (non-random) hash for stable avatar hues / flavor numbers. */
export function hashSeed(str = "") {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

/** Stable hue (0-360) for a callsign's avatar chip. */
export function avatarHue(callsign = "") {
  return hashSeed(callsign) % 360;
}

/** Compact relative-time label, matching the community feed's own "2h" / "1d" style. */
export function timeAgo(ts) {
  const diffMs = Date.now() - ts;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d`;
  const mo = Math.floor(day / 30);
  return `${mo}mo`;
}

/** Sector-themed gradient "flight log captures" — an Instagram-style photo
    attachment a pilot can pin to a transmission, without needing a real
    image asset. Each preset rides the same hex/auraHex pair the 3D scene
    and the syllabus map already use for that sector, so #RS always looks
    like the Iron Desert everywhere in the app. */
export const IMAGE_PRESETS = PLANETARY_SYSTEM.map((s) => ({
  id: s.id,
  channel: s.short,
  label: `${s.short}_photo.jpg`,
  from: s.hex,
  to: s.auraHex
}));

const PILOT_BIOS = {
  Commander_Py: "Loves Python. Always learning.",
  Star_Compiler: "JavaScript fan. Building cool things.",
  Vector_Ghost: "Rust developer. Debugging is my hobby.",
  Byte_Nebula: "SQL and databases. Ask me anything.",
  Nova_Kestrel: "New here! Learning to code.",
  Drift_Marlow: "Memes and code. Mostly memes."
};

/** Flavor bio for a pilot's dossier card — falls back gracefully for any
    callsign not in the seed roster (including the local pilot's own). */
export function bioFor(callsign) {
  return PILOT_BIOS[callsign] || "New member of the community.";
}

/** Deterministic (not live, not random) follower / following counts so
    every pilot's dossier card feels populated without a real social graph. */
export function followerCount(callsign) {
  return 60 + (hashSeed(`${callsign}_followers`) % 900);
}
export function followingCount(callsign) {
  return 10 + (hashSeed(`${callsign}_following`) % 120);
}

const now = Date.now();
const H = 3600000;
const D = 86400000;

/** Seed transmissions — enough variety across channels/authors to feel like a live fleet, not a stub. */
export const SEED_POSTS = [
  {
    id: "seed_1",
    author: "Commander_Py",
    channel: "PY",
    createdAt: now - 2 * H,
    title: "Cleared the Ignition Override on the first pass",
    body: "Wired def ignite(): straight through without a single reactor stall. The trick was gating fuelLevel before touching the throttle at all.",
    image: "Python Engine Core",
    likes: 14,
    likedByMe: false,
    comments: [
      { id: "c1", author: "Star_Compiler", text: "That gate saved me twice already, solid callout.", createdAt: now - 90 * 60000, likes: 2, likedByMe: false },
      { id: "c2", author: "Byte_Nebula", text: "How many reactor stalls before you figured that out lol", createdAt: now - 60 * 60000, likes: 1, likedByMe: false }
    ]
  },
  {
    id: "seed_2",
    author: "Star_Compiler",
    channel: "JS",
    createdAt: now - 5 * H,
    title: "Async vent loop finally stopped freezing telemetry",
    body: "Rewired the fuel link with async/await instead of nested callbacks. Volcanic Vent JS-99 is a whole lot calmer now.",
    likes: 22,
    likedByMe: false,
    comments: [
      { id: "c3", author: "Vector_Ghost", text: "Callback pyramids are the real final boss of that sector.", createdAt: now - 4 * H, likes: 3, likedByMe: false }
    ]
  },
  {
    id: "seed_3",
    author: "Vector_Ghost",
    channel: "RS",
    createdAt: now - 1 * D,
    title: "Iron Desert survived without a single unsafe block",
    body: "Borrow checker gave me three sandstorms in a row but the ownership dunes finally clicked. String::from was the whole fix.",
    image: "Rust Core Defense",
    likes: 31,
    likedByMe: false,
    comments: [
      { id: "c4", author: "Byte_Nebula", text: "Zero unsafe on your first clear? Respect.", createdAt: now - 22 * H, likes: 5, likedByMe: false },
      { id: "c5", author: "Commander_Py", text: "Screenshot the compiler output, that never happens for me first try", createdAt: now - 20 * H, likes: 2, likedByMe: false }
    ]
  },
  {
    id: "seed_4",
    author: "Byte_Nebula",
    channel: "SQL",
    createdAt: now - 2 * D,
    title: null,
    body: "PSA: BEGIN TRANSACTION / COMMIT around your archive ledger writes is not optional. Learned that one the expensive way.",
    likes: 9,
    likedByMe: false,
    comments: []
  },
  {
    id: "seed_5",
    author: "Nova_Kestrel",
    channel: "General",
    createdAt: now - 3 * D,
    title: "New pilot, reporting for duty 🚀",
    body: "Just linked my biometric ID. Six sectors ahead of me and I already can't stop staring at the Ice Spire's ring texture.",
    image: "TypeScript Array",
    likes: 18,
    likedByMe: false,
    comments: [
      { id: "c6", author: "Star_Compiler", text: "Welcome aboard! Python Propulsion first, trust the process.", createdAt: now - 70 * H, likes: 4, likedByMe: false }
    ]
  },
  {
    id: "seed_6",
    author: "Drift_Marlow",
    channel: "Memes",
    createdAt: now - 4 * D,
    title: "the borrow checker, probably",
    body: "me: just let me have two mutable references real quick\nrust: absolutely not",
    likes: 47,
    likedByMe: false,
    comments: [
      { id: "c7", author: "Vector_Ghost", text: "this is unreasonably accurate", createdAt: now - 90 * H, likes: 6, likedByMe: false },
      { id: "c8", author: "Nova_Kestrel", text: "felt this in my core", createdAt: now - 88 * H, likes: 3, likedByMe: false }
    ]
  },
  {
    id: "seed_7",
    author: "Commander_Py",
    channel: "TS",
    createdAt: now - 6 * D,
    title: "Interface bounds saved a whole crew manifest refactor",
    body: "Declared interface Pilot {} early and every downstream module just... stayed correct. Wish I'd done this from lesson one.",
    likes: 12,
    likedByMe: false,
    comments: []
  }
];
