/**
 * 🛠️ PROJECTS — Guided Build catalog (Phase 04)
 * -------------------------------------------------------------
 * Guided builds are curated starter projects, one per language, that
 * unlock once a pilot holds that language's Certificate (see
 * languageCertificateEarned in planetarySystem.js — Core module cleared).
 * Unlocking one seeds a real Workshop project with real starter files;
 * from there it's just a Workshop project like any other.
 *
 * Salvage artifacts (the other Projects deliverable — one per cleared
 * exercise) don't need a catalog: they're generated straight from the
 * lesson + the pilot's own submitted code in CodeTerminal's handleSubmit,
 * and live in PilotContext's `salvageArtifacts`.
 */
import { languageCertificateEarned } from "./planetarySystem";

export const GUIDED_BUILDS = [
  {
    id: "guided_py",
    sectorId: "Python Engine Core",
    short: "PY",
    title: "Salvage Bot Controller",
    brief: "A small bot that watches fuel levels and reacts before they run out.",
    files: [
      {
        name: "bot.py",
        content:
          "# Salvage Bot Controller\n# Guided build — unlocked after certifying in Python.\n\nfuel_level = 82\n\ndef report_status():\n    # TODO: print a status line, and a warning if fuel_level < 20\n    pass\n\nreport_status()\n"
      },
      { name: "README.md", content: "# Salvage Bot Controller\n\nExtend `report_status()` so it warns when `fuel_level` drops below 20.\n" }
    ]
  },
  {
    id: "guided_js",
    sectorId: "JavaScript Engine",
    short: "JS",
    title: "Reactor Alert Dashboard",
    brief: "A tiny event-driven panel that reacts to reactor telemetry ticks.",
    files: [
      {
        name: "dashboard.js",
        content:
          "// Reactor Alert Dashboard\n// Guided build — unlocked after certifying in JavaScript.\n\nconst readings = [];\n\nfunction onTick(value) {\n  // TODO: push value into readings, and log a warning above 90\n}\n\nonTick(42);\n"
      },
      { name: "README.md", content: "# Reactor Alert Dashboard\n\nExtend `onTick` to track readings and flag anything over 90.\n" }
    ]
  },
  {
    id: "guided_ts",
    sectorId: "TypeScript Array",
    short: "TS",
    title: "Crew Manifest Validator",
    brief: "A typed checker that keeps a crew roster shape-correct.",
    files: [
      {
        name: "manifest.ts",
        content:
          "// Crew Manifest Validator\n// Guided build — unlocked after certifying in TypeScript.\n\ninterface CrewMember {\n  callsign: string;\n  role: string;\n}\n\nfunction validate(crew: CrewMember[]): boolean {\n  // TODO: return false if any entry is missing a callsign or role\n  return true;\n}\n"
      },
      { name: "README.md", content: "# Crew Manifest Validator\n\nMake `validate` actually reject malformed crew entries.\n" }
    ]
  },
  {
    id: "guided_go",
    sectorId: "Go Engine Subsystem",
    short: "GO",
    title: "Vent Pressure Worker Pool",
    brief: "A worker-pool pattern for venting multiple geysers concurrently.",
    files: [
      {
        name: "main.go",
        content:
          "// Vent Pressure Worker Pool\n// Guided build — unlocked after certifying in Go.\npackage main\n\nfunc ventGeyser(id int, results chan<- int) {\n\t// TODO: send id back on results once \"vented\"\n}\n\nfunc main() {\n\t// TODO: launch a few goroutines and collect from a channel\n}\n"
      },
      { name: "README.md", content: "# Vent Pressure Worker Pool\n\nLaunch several `ventGeyser` goroutines and collect their results on a channel.\n" }
    ]
  },
  {
    id: "guided_rust",
    sectorId: "Rust Core Defense",
    short: "RS",
    title: "Shield Integrity Tracker",
    brief: "A safe, owned tracker for shield plating across the hull.",
    files: [
      {
        name: "main.rs",
        content:
          "// Shield Integrity Tracker\n// Guided build — unlocked after certifying in Rust.\n\nstruct Plate {\n    integrity: u8,\n}\n\nfn weakest(plates: &Vec<Plate>) -> Option<&Plate> {\n    // TODO: return the plate with the lowest integrity\n    None\n}\n\nfn main() {}\n"
      },
      { name: "README.md", content: "# Shield Integrity Tracker\n\nImplement `weakest` to find the plate that needs attention first.\n" }
    ]
  },
  {
    id: "guided_sql",
    sectorId: "SQL Relational Matrix",
    short: "SQL",
    title: "Archive Query Kit",
    brief: "A small set of queries for the fleet's flight-log archive.",
    files: [
      {
        name: "queries.sql",
        content:
          "-- Archive Query Kit\n-- Guided build — unlocked after certifying in SQL.\n\n-- TODO: every pilot's log count, most-recent first\n-- SELECT ...\n\n-- TODO: flag any log entry missing an orbit_id\n-- SELECT ...\n"
      },
      { name: "README.md", content: "# Archive Query Kit\n\nFill in the two queries described in the file's comments.\n" }
    ]
  }
];

export function findGuidedBuild(id) {
  return GUIDED_BUILDS.find((b) => b.id === id) || null;
}

export function isGuidedBuildUnlocked(build, pilotProgress = {}) {
  return languageCertificateEarned(build.sectorId, pilotProgress);
}
