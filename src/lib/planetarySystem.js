/**
 * 🪐 PLANETARY SYSTEM — SINGLE SOURCE OF TRUTH
 * -------------------------------------------------------------
 * The 3D scene, the syllabus grid and the radar were each carrying
 * their own partial copy of this list (the scene had six planets,
 * the academy grid only three). Everything new reads from here.
 *
 * `orbitRadius` / `orbitSpeed` / `bodySize` mirror the values used by
 * SpaceWindshield so the 2D radar and the WebGL scene agree on scale.
 *
 * CONTENT MODEL — every sector's `lessons` is one flat, sequential
 * array (this is what CodeTerminal/SectorDetail/FlightAcademy index
 * into and what `pilotProgress[sector.id]` counts against — that
 * contract doesn't change). Each lesson now also carries `module`
 * ("core" | "applied") and a `concept` label, so the same array can
 * be grouped into a fixed-shape Core curriculum (Syntax, Control
 * Flow, Data Structures, Functions, Error Handling, OOP — adapted
 * per language where a concept doesn't map 1:1, e.g. SQL) followed
 * by optional Applied lessons. `TRACKS` below curates sectors into
 * curricula; the certificate helpers derive Language and Stack
 * tiers straight from `pilotProgress`, no new state to persist.
 */

export const PLANETARY_SYSTEM = [
  {
    id: "Python Engine Core",
    name: "Python Propulsion",
    short: "PY",
    designation: "PY-01",
    classification: "Gas Giant",
    tier: "Beginner",
    orbitRadius: 155,
    orbitSpeed: 0.005,
    bodySize: 10,
    hex: "#f59e0b",
    auraHex: "#fbbf24",
    tailwind: {
      text: "text-amber-400",
      bar: "bg-amber-500",
      border: "border-amber-500/40",
      ring: "ring-amber-500/30"
    },
    totalLessons: 8,
    description: "Warm up sub-light thrust manifolds via basic logical script architectures.",
    quests: [
      "01 // Variables Calibration",
      "02 // Conditional Loops",
      "03 // Function Overrides",
      "04 // Cargo Manifest Lists",
      "05 // Reactor Failsafes",
      "06 // Ship Class Blueprints",
      "07 // Flight Log Archives",
      "08 // Fuel Cell Filters"
    ],
    lessons: [
      {
        title: "PY // Propulsion Variables",
        prompt: "Initialize a local throttle factor multiplier parameter. Declare an integer named 'thrustMultiplier' and assign it a vector value of 10.",
        requiredKeyword: "thrustMultiplier",
        module: "core",
        concept: "Variables"
      },
      {
        title: "PY // Conditional Manifolds",
        prompt: "Route reactor power only when the core is stable. Gate the launch sequence with a conditional: 'if fuelLevel > 50:'. Store the result in a variable named 'launch' (True to fire, False to hold).",
        requiredKeyword: "if fuelLevel",
        module: "core",
        concept: "Control Flow"
      },
      {
        title: "PY // Ignition Override",
        prompt: "Override the manual launch circuit with a reusable procedure. Declare a function named 'def ignite():' to trigger it.",
        requiredKeyword: "def ignite",
        module: "core",
        concept: "Functions"
      },
      {
        title: "PY // Cargo Manifest Lists",
        prompt: "Stack the cargo manifest into an ordered list so nothing floats loose in the hold. Declare 'cargoHold = []' to open an empty manifest.",
        requiredKeyword: "cargoHold = []",
        module: "core",
        concept: "Data Structures"
      },
      {
        title: "PY // Reactor Failsafes",
        prompt: "Wrap the ignition call in a failsafe so one misfire can't crash the whole ship. Call the provided 'risky_ignite()' inside 'try:' and catch it with 'except Exception as e:'. Set a variable named 'caught' to True inside the except block.",
        requiredKeyword: "except Exception",
        module: "core",
        concept: "Error Handling"
      },
      {
        title: "PY // Ship Class Blueprints",
        prompt: "Blueprint every vessel in the fleet from a single template. Declare 'class Ship:' to define it.",
        requiredKeyword: "class Ship",
        module: "core",
        concept: "OOP"
      },
      {
        title: "PY // Applied: Flight Log Archive",
        prompt: "Archive today's flight log to disk before you shut the reactor down. Open it with 'with open(\"flightlog.txt\", \"w\") as f:'.",
        requiredKeyword: "with open",
        module: "applied",
        concept: "Applied"
      },
      {
        title: "PY // Applied: Fuel Cell Filter",
        prompt: "Filter only the charged fuel cells in a single line, using the provided 'cells' list. Write '[c for c in cells if c.charged]' and store it in a variable named 'charged_cells'.",
        requiredKeyword: "for c in cells",
        module: "applied",
        concept: "Applied"
      }
    ],
    requires: null
  },
  {
    id: "JavaScript Engine",
    name: "JavaScript Core",
    short: "JS",
    designation: "JS-99",
    classification: "Volcanic Vent",
    tier: "Intermediate",
    orbitRadius: 215,
    orbitSpeed: 0.0038,
    bodySize: 9,
    hex: "#f97316",
    auraHex: "#fb923c",
    tailwind: {
      text: "text-orange-400",
      bar: "bg-orange-500",
      border: "border-orange-500/40",
      ring: "ring-orange-500/30"
    },
    totalLessons: 8,
    description: "Manage asynchronous volcanic runtime loops without blowing your shields.",
    quests: [
      "01 // DOM Interception",
      "02 // Async Promises",
      "03 // Event Listeners",
      "04 // Crew Roster Arrays",
      "05 // Reactor Failsafes",
      "06 // Ship Class Blueprints",
      "07 // Fuel Cell Filters",
      "08 // Telemetry Fetch"
    ],
    lessons: [
      {
        title: "JS // DOM Interception",
        prompt: "Intercept the reactor readout panel from the document tree. Call 'document.querySelector(\"#reactor\")' to grab a live reference and store it in a variable named 'reactorPanel'.",
        requiredKeyword: "querySelector",
        module: "core",
        concept: "Syntax"
      },
      {
        title: "JS // Asynchronous Volcanic Core",
        prompt: "Calibrate a non-blocking asynchronous event loop listener. Re-route 'const fuelLink = async () => {}' and invoke the promise thread.",
        requiredKeyword: "async",
        module: "core",
        concept: "Control Flow"
      },
      {
        title: "JS // Event Listeners",
        prompt: "Wire a click handler onto the eject lever, available in the DOM as '#eject-lever'. Call 'addEventListener(\"click\", eject)' to arm it.",
        requiredKeyword: "addEventListener",
        module: "core",
        concept: "Functions"
      },
      {
        title: "JS // Crew Roster Arrays",
        prompt: "Hold the crew roster in an ordered array so every pilot has a fixed slot. Declare 'const crew = [];' to open the roster.",
        requiredKeyword: "const crew = []",
        module: "core",
        concept: "Data Structures"
      },
      {
        title: "JS // Reactor Failsafes",
        prompt: "Guard the provided 'riskyIgnite()' call so a bad reading doesn't crash the console. Wrap it in 'try { riskyIgnite(); } catch (err) { ... }' and set 'caught = true' inside the catch block.",
        requiredKeyword: "catch (err)",
        module: "core",
        concept: "Error Handling"
      },
      {
        title: "JS // Ship Class Blueprints",
        prompt: "Blueprint every vessel in the fleet from a single template. Declare 'class Ship {}' to define it.",
        requiredKeyword: "class Ship",
        module: "core",
        concept: "OOP"
      },
      {
        title: "JS // Applied: Fuel Cell Filter",
        prompt: "Filter the charged fuel cells (from the provided 'cells' array) and map them to their output levels in one chain. Write 'cells.filter(c => c.charged).map(c => c.output)' and store it in a variable named 'outputs'.",
        requiredKeyword: ".filter(",
        module: "applied",
        concept: "Applied"
      },
      {
        title: "JS // Applied: Telemetry Fetch",
        prompt: "Pull live telemetry from the fleet relay. Call 'await fetch(\"/api/telemetry\")' to request it.",
        requiredKeyword: "fetch(",
        module: "applied",
        concept: "Applied"
      }
    ],
    requires: { id: "Python Engine Core", level: 1 }
  },
  {
    id: "TypeScript Array",
    name: "TypeScript Lattice",
    short: "TS",
    designation: "TS-14",
    classification: "Ice Spire",
    tier: "Gated Alpha",
    orbitRadius: 275,
    orbitSpeed: 0.0028,
    bodySize: 11,
    hex: "#2563eb",
    auraHex: "#60a5fa",
    hasRings: true,
    tailwind: {
      text: "text-blue-400",
      bar: "bg-blue-500",
      border: "border-blue-500/40",
      ring: "ring-blue-500/30"
    },
    totalLessons: 8,
    description: "Enforce static parameter type guards across glacial code allocations.",
    quests: [
      "01 // Interface Bounds",
      "02 // Generics Core",
      "03 // Union Matrices",
      "04 // Typed Fuel Variables",
      "05 // Narrowed Ignition Checks",
      "06 // Typed Reactor Failsafes",
      "07 // Cargo Enum Manifest",
      "08 // Partial Ship Config"
    ],
    lessons: [
      {
        title: "TS // Interface Bounds",
        prompt: "Define a static contract for the crew roster manifest. Declare 'interface Pilot {}' to bound its shape.",
        requiredKeyword: "interface Pilot",
        module: "core",
        concept: "OOP"
      },
      {
        title: "TS // Generics Core",
        prompt: "Build a cargo container that holds any payload type safely. Declare 'function wrap<T>(cargo: T)'.",
        requiredKeyword: "function wrap<T>",
        module: "core",
        concept: "Functions"
      },
      {
        title: "TS // Union Matrices",
        prompt: "Constrain the thruster mode to two valid states. Declare 'type Mode = \"warp\" | \"cruise\"'.",
        requiredKeyword: "type Mode",
        module: "core",
        concept: "Data Structures"
      },
      {
        title: "TS // Typed Fuel Variables",
        prompt: "Declare the fuel gauge with an explicit type so a bad reading can't sneak in. Write 'let fuelLevel: number = 100;'.",
        requiredKeyword: "fuelLevel: number",
        module: "core",
        concept: "Syntax"
      },
      {
        title: "TS // Narrowed Ignition Checks",
        prompt: "Narrow the ignition check so TypeScript proves the type before you fire it. A 'key' variable is provided. Write 'if (typeof key === \"string\") { ignitionArmed = true; }'.",
        requiredKeyword: "typeof key",
        module: "core",
        concept: "Control Flow"
      },
      {
        title: "TS // Typed Reactor Failsafes",
        prompt: "Catch a reactor fault with a typed error guard. Wrap the provided 'riskyIgnite()' call: 'try { riskyIgnite(); } catch (err: unknown) { caught = true; }'.",
        requiredKeyword: "err: unknown",
        module: "core",
        concept: "Error Handling"
      },
      {
        title: "TS // Applied: Cargo Enum Manifest",
        prompt: "Fix the cargo manifest to a closed set of valid bay types. Declare 'enum CargoBay { Fuel, Crew, Freight }'.",
        requiredKeyword: "enum CargoBay",
        module: "applied",
        concept: "Applied"
      },
      {
        title: "TS // Applied: Partial Ship Config",
        prompt: "Let a ship config patch update just a few fields at a time. A 'ShipConfig' interface is already provided. Write 'function patch(cfg: Partial<ShipConfig>)'.",
        requiredKeyword: "Partial<ShipConfig>",
        module: "applied",
        concept: "Applied"
      }
    ],
    requires: { id: "JavaScript Engine", level: 1 }
  },
  {
    id: "Go Engine Subsystem",
    name: "Go Cryo-System",
    short: "GO",
    designation: "GO-07",
    classification: "Cryo Geyser",
    tier: "Advanced",
    orbitRadius: 335,
    orbitSpeed: 0.002,
    bodySize: 8,
    hex: "#06b6d4",
    auraHex: "#22d3ee",
    tailwind: {
      text: "text-cyan-400",
      bar: "bg-cyan-500",
      border: "border-cyan-500/40",
      ring: "ring-cyan-500/30"
    },
    totalLessons: 8,
    description: "Coordinate parallel geyser vents through concurrent worker routines.",
    quests: [
      "01 // Goroutine Vents",
      "02 // Channel Piping",
      "03 // Mutex Seals",
      "04 // Typed Fuel Variables",
      "05 // Reactor Error Returns",
      "06 // Ship Struct Blueprints",
      "07 // Struct Embedding",
      "08 // Deferred Cleanup"
    ],
    lessons: [
      {
        title: "GO // Goroutine Vents",
        prompt: "Vent a geyser concurrently without blocking the main flight loop. Launch it with 'go ventGeyser()'.",
        requiredKeyword: "go ventGeyser",
        module: "core",
        concept: "Control Flow"
      },
      {
        title: "GO // Channel Piping",
        prompt: "Pipe live telemetry between two vent routines. Open a channel with 'make(chan int)'.",
        requiredKeyword: "make(chan",
        module: "core",
        concept: "Data Structures"
      },
      {
        title: "GO // Mutex Seals",
        prompt: "Seal the shared coolant counter so two goroutines can't corrupt it. Guard it with 'var mu sync.Mutex'.",
        requiredKeyword: "sync.Mutex",
        module: "core",
        concept: "Functions"
      },
      {
        title: "GO // Typed Fuel Variables",
        prompt: "Declare the fuel gauge with an explicit type so the compiler holds you to it. Write 'var fuelLevel int = 100'.",
        requiredKeyword: "var fuelLevel int",
        module: "core",
        concept: "Syntax"
      },
      {
        title: "GO // Reactor Error Returns",
        prompt: "Go doesn't throw — it returns errors. Guard the ignition call with 'if err != nil {'.",
        requiredKeyword: "if err != nil",
        module: "core",
        concept: "Error Handling"
      },
      {
        title: "GO // Ship Struct Blueprints",
        prompt: "Blueprint every vessel from a struct with its own methods. Declare 'type Ship struct {}' to define it.",
        requiredKeyword: "type Ship struct",
        module: "core",
        concept: "OOP"
      },
      {
        title: "GO // Applied: Struct Embedding",
        prompt: "Give every fighter craft the base Ship's fields for free. Embed it with 'type Fighter struct { Ship }'.",
        requiredKeyword: "struct { Ship }",
        module: "applied",
        concept: "Applied"
      },
      {
        title: "GO // Applied: Deferred Cleanup",
        prompt: "Guarantee the coolant valve closes no matter how the function exits. Write 'defer closeValve()'.",
        requiredKeyword: "defer closeValve",
        module: "applied",
        concept: "Applied"
      }
    ],
    requires: { id: "TypeScript Array", level: 1 }
  },
  {
    id: "Rust Core Defense",
    name: "Rust Iron Desert",
    short: "RS",
    designation: "RS-31",
    classification: "Iron Desert",
    tier: "Expert",
    orbitRadius: 395,
    orbitSpeed: 0.0014,
    bodySize: 12,
    hex: "#e11d48",
    auraHex: "#f43f5e",
    tailwind: {
      text: "text-rose-400",
      bar: "bg-rose-500",
      border: "border-rose-500/40",
      ring: "ring-rose-500/30"
    },
    totalLessons: 8,
    description: "Survive the borrow checker dunes where every allocation is accounted for.",
    quests: [
      "01 // Ownership Dunes",
      "02 // Lifetime Anchors",
      "03 // Trait Bounds",
      "04 // Dune Match Guards",
      "05 // Cargo Manifest Vectors",
      "06 // Reactor Result Guards",
      "07 // Pattern Matching",
      "08 // Iterator Chains"
    ],
    lessons: [
      {
        title: "RS // Ownership Dunes",
        prompt: "Bind the shield core to a single owner before the dune storm hits. Declare 'let shield = String::from(\"iron\");'.",
        requiredKeyword: "String::from",
        module: "core",
        concept: "Syntax"
      },
      {
        title: "RS // Lifetime Anchors",
        prompt: "Anchor a borrowed reference so it can't outlive its dune. Write a signature like 'fn anchor<'a>(x: &'a str)'.",
        requiredKeyword: "<'a>",
        module: "core",
        concept: "Functions"
      },
      {
        title: "RS // Trait Bounds",
        prompt: "Bound the armor generic to types that implement Armor. Write 'fn reinforce<T: Armor>(x: T)'.",
        requiredKeyword: "T: Armor",
        module: "core",
        concept: "OOP"
      },
      {
        title: "RS // Dune Match Guards",
        prompt: "Route the ignition sequence by matching every possible reactor state. Write 'match state {' to branch on it.",
        requiredKeyword: "match state",
        module: "core",
        concept: "Control Flow"
      },
      {
        title: "RS // Cargo Manifest Vectors",
        prompt: "Hold the cargo manifest in a growable list. Declare 'let mut cargo: Vec<Crate> = Vec::new();'.",
        requiredKeyword: "Vec::new()",
        module: "core",
        concept: "Data Structures"
      },
      {
        title: "RS // Reactor Result Guards",
        prompt: "Rust has no exceptions — it has Result. Guard the ignition call with 'let status: Result<(), Fault> = ignite();'.",
        requiredKeyword: "Result<(), Fault>",
        module: "core",
        concept: "Error Handling"
      },
      {
        title: "RS // Applied: Pattern Matching",
        prompt: "Unpack the reactor reading in one match arm instead of three if-checks. Write 'match reading { Reading::Stable(v) => v, _ => 0 }'.",
        requiredKeyword: "Reading::Stable",
        module: "applied",
        concept: "Applied"
      },
      {
        title: "RS // Applied: Iterator Chains",
        prompt: "Filter and sum the active fuel cells without a manual loop. Write 'cells.iter().filter(|c| c.active).sum()'.",
        requiredKeyword: ".filter(|c|",
        module: "applied",
        concept: "Applied"
      }
    ],
    requires: { id: "Go Engine Subsystem", level: 1 }
  },
  {
    id: "SQL Relational Matrix",
    name: "SQL Relational Matrix",
    short: "SQL",
    designation: "SQ-88",
    classification: "Ringed Archive",
    tier: "Specialist",
    orbitRadius: 455,
    orbitSpeed: 0.0009,
    bodySize: 13,
    hex: "#059669",
    auraHex: "#34d399",
    hasRings: true,
    tailwind: {
      text: "text-emerald-400",
      bar: "bg-emerald-500",
      border: "border-emerald-500/40",
      ring: "ring-emerald-500/30"
    },
    totalLessons: 8,
    description: "Query the outer archive rings where every record orbits a foreign key.",
    quests: [
      "01 // Join Orbits",
      "02 // Index Rings",
      "03 // Transaction Locks",
      "04 // Archive Schema Definitions",
      "05 // Conditional Case Logic",
      "06 // Aggregate Ring Counts",
      "07 // Archive Views",
      "08 // Nested Subqueries"
    ],
    lessons: [
      {
        title: "SQL // Join Orbits",
        prompt: "Join the crew table to the ship table so every pilot orbits their vessel. Write 'SELECT * FROM crew JOIN ships'.",
        requiredKeyword: "JOIN ships",
        module: "core",
        concept: "Syntax"
      },
      {
        title: "SQL // Index Rings",
        prompt: "Speed up lookups across the archive rings. Write 'CREATE INDEX idx_orbit ON logs(orbit_id);'.",
        requiredKeyword: "CREATE INDEX",
        module: "core",
        concept: "Functions"
      },
      {
        title: "SQL // Transaction Locks",
        prompt: "Guard the ledger update so a power cut can't corrupt it. Wrap it in 'BEGIN TRANSACTION; ... COMMIT;'.",
        requiredKeyword: "BEGIN TRANSACTION",
        module: "core",
        concept: "Error Handling"
      },
      {
        title: "SQL // Archive Schema Definitions",
        prompt: "Define the shape of the archive before anything can orbit it. Write 'CREATE TABLE logs (id INT, orbit_id INT);'.",
        requiredKeyword: "CREATE TABLE",
        module: "core",
        concept: "Data Structures"
      },
      {
        title: "SQL // Conditional Case Logic",
        prompt: "Label each log entry by its severity without a separate query. Write 'CASE WHEN severity > 5 THEN \"critical\" END'.",
        requiredKeyword: "CASE WHEN",
        module: "core",
        concept: "Control Flow"
      },
      {
        title: "SQL // Aggregate Ring Counts",
        prompt: "Count how many logs orbit each ring. Write 'SELECT ring_id, COUNT(*) FROM logs GROUP BY ring_id;'.",
        requiredKeyword: "GROUP BY",
        module: "core",
        concept: "OOP"
      },
      {
        title: "SQL // Applied: Archive Views",
        prompt: "Save a reusable lens onto the critical logs. Write 'CREATE VIEW critical_logs AS SELECT * FROM logs WHERE severity > 5;'.",
        requiredKeyword: "CREATE VIEW",
        module: "applied",
        concept: "Applied"
      },
      {
        title: "SQL // Applied: Nested Subqueries",
        prompt: "Find every crew member whose ship has zero fuel, in one statement. Write 'WHERE ship_id IN (SELECT id FROM ships WHERE fuel = 0)'.",
        requiredKeyword: "IN (SELECT",
        module: "applied",
        concept: "Applied"
      }
    ],
    requires: { id: "Rust Core Defense", level: 1 }
  }
];

export const ORBIT_MIN = PLANETARY_SYSTEM[0].orbitRadius;
export const ORBIT_MAX = PLANETARY_SYSTEM[PLANETARY_SYSTEM.length - 1].orbitRadius;

/** Look a sector up by its canonical progress key. */
export function findSector(id) {
  return PLANETARY_SYSTEM.find((sector) => sector.id === id) || null;
}

/** Clearance gate: a sector opens once its prerequisite hits the required level. */
export function isSectorUnlocked(id, progress = {}) {
  const sector = findSector(id);
  if (!sector) return false;
  if (!sector.requires) return true;
  return (progress[sector.requires.id] || 0) >= sector.requires.level;
}

/** 0 → 100 mastery for a sector. */
export function sectorMastery(id, progress = {}) {
  const sector = findSector(id);
  if (!sector) return 0;
  const level = Math.min(progress[id] || 0, sector.totalLessons);
  return Math.round((level / sector.totalLessons) * 100);
}

/** Whole-fleet completion across every sector. */
export function fleetMastery(progress = {}) {
  const total = PLANETARY_SYSTEM.reduce((sum, s) => sum + s.totalLessons, 0);
  const done = PLANETARY_SYSTEM.reduce(
    (sum, s) => sum + Math.min(progress[s.id] || 0, s.totalLessons),
    0
  );
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

/* ==========================================================
   🏅 PROGRESSION — flight levels cleared, XP earned, badges
   won. A frontend-only gamification layer (like Codédex's own
   "Course Progress" / "Course Badges" widgets): every value here
   derives from `pilotProgress`, nothing new to persist.
   ========================================================== */

export const LESSON_XP = 100;

/** Total exercises across the whole fleet (6 sectors × 3 lessons = 18). */
export function totalExerciseCount() {
  return PLANETARY_SYSTEM.reduce((sum, s) => sum + s.totalLessons, 0);
}

/** Exercises actually cleared so far, across every sector. */
export function clearedExerciseCount(progress = {}) {
  return PLANETARY_SYSTEM.reduce((sum, s) => sum + Math.min(progress[s.id] || 0, s.totalLessons), 0);
}

/** Total XP available across the whole fleet. */
export function totalXP() {
  return totalExerciseCount() * LESSON_XP;
}

/** XP earned so far, across every sector. */
export function xpEarned(progress = {}) {
  return clearedExerciseCount(progress) * LESSON_XP;
}

/** One badge per sector, plus two fleet-wide milestones — 8 total,
    mirroring Codédex's own "0 / 8" course-badge tally. */
export const BADGES = [
  ...PLANETARY_SYSTEM.map((s) => ({
    id: `${s.id}::mastery`,
    label: `${s.short} Mastery`,
    detail: `Clear every flight level in ${s.name}.`,
    icon: "Award",
    earned: (progress = {}) => (progress[s.id] || 0) >= s.totalLessons
  })),
  {
    id: "rookie-pilot",
    label: "Rookie Pilot",
    detail: "Clear your first flight level, in any sector.",
    icon: "Rocket",
    earned: (progress = {}) => Object.values(progress).some((v) => (v || 0) > 0)
  },
  {
    id: "fleet-commander",
    label: "Fleet Commander",
    detail: "Master every sector in the fleet.",
    icon: "Trophy",
    earned: (progress = {}) => PLANETARY_SYSTEM.every((s) => (progress[s.id] || 0) >= s.totalLessons)
  }
];

/** Full badge catalog with each entry's earned state resolved for `progress`. */
export function badgeList(progress = {}) {
  return BADGES.map((b) => ({ ...b, earned: b.earned(progress) }));
}

/** How many badges are currently earned, out of the total catalog. */
export function earnedBadgeCount(progress = {}) {
  return BADGES.reduce((sum, b) => sum + (b.earned(progress) ? 1 : 0), 0);
}

/* ==========================================================
   🎓 TRACKS & CERTIFICATES — curated language sequences and
   the two certificate tiers spec'd for them: a per-language
   Language cert, and a per-track Stack cert once every language
   on that track is certified. Frontend-only, derived entirely
   from `pilotProgress` — nothing new to persist.
   ========================================================== */

export const TRACKS = [
  {
    id: "frontend",
    label: "Frontend Track",
    description: "Build interfaces pilots actually see — from the DOM up to a typed component layer.",
    sectorIds: ["JavaScript Engine", "TypeScript Array"]
  },
  {
    id: "backend",
    label: "Backend Track",
    description: "Run the systems nobody sees: server logic, safe memory, concurrent workers.",
    sectorIds: ["Python Engine Core", "Go Engine Subsystem", "Rust Core Defense"]
  },
  {
    id: "data",
    label: "Data Track",
    description: "Move and query data cleanly, from a script to a real relational store.",
    sectorIds: ["Python Engine Core", "SQL Relational Matrix"]
  },
  {
    id: "mobile",
    label: "Mobile Track",
    description: "Ship cross-platform apps on the same JS/TS engine that powers the web.",
    sectorIds: ["JavaScript Engine", "TypeScript Array"]
  }
];

/** Look a track up by its id. */
export function findTrack(id) {
  return TRACKS.find((t) => t.id === id) || null;
}

/** Core-only lesson count — the part a Language certificate actually requires. Applied lessons are optional depth beyond it. */
export function coreLessonCount(sector) {
  return sector.lessons.filter((l) => l.module === "core").length;
}

/** A Language certificate is earned once every Core lesson (not necessarily Applied) is cleared. */
export function languageCertificateEarned(id, progress = {}) {
  const sector = findSector(id);
  if (!sector) return false;
  return (progress[id] || 0) >= coreLessonCount(sector);
}

/**
 * A Stack certificate is earned once every language on a track holds its own
 * Language certificate. `projectIds` upgrades it to the visually distinct
 * Stack+Project tier once the Workshop (a later phase) can supply real
 * published project ids — until then every Stack cert reports
 * withProject: false, which is the correct state for a platform with no
 * project system live yet.
 */
export function trackCertificate(trackId, progress = {}, projectIds = []) {
  const track = findTrack(trackId);
  if (!track) return { earned: false, withProject: false };
  const earned = track.sectorIds.every((id) => languageCertificateEarned(id, progress));
  return { earned, withProject: earned && projectIds.length > 0 };
}

/** Every certificate a pilot currently holds — Language tier per certified sector, Stack tier per completed track. */
export function certificateList(progress = {}, projectIds = []) {
  const languageCerts = PLANETARY_SYSTEM.filter((s) => languageCertificateEarned(s.id, progress)).map((s) => ({
    tier: "language",
    id: `lang::${s.id}`,
    label: `${s.short} Certified`,
    sectorId: s.id
  }));
  const stackCerts = TRACKS.filter((t) => trackCertificate(t.id, progress, projectIds).earned).map((t) => {
    const { withProject } = trackCertificate(t.id, progress, projectIds);
    return {
      tier: withProject ? "stack-project" : "stack",
      id: `stack::${t.id}`,
      label: `${t.label.replace(" Track", "")} Stack Certified`,
      trackId: t.id
    };
  });
  return [...languageCerts, ...stackCerts];
}
