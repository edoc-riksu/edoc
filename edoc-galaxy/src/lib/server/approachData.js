import { APPROACH } from "../../data/approach";
import { conceptFor } from "../../data/concepts";
import { PLANETS } from "../../galaxy/layout";

const ROCKS = 3;
const FETCH_TIMEOUT_MS = 2500;

function executionBase() {
  return process.env.EXECUTION_API_URL || process.env.NEXT_PUBLIC_EXECUTION_API_URL || "http://localhost:8000";
}

/** One encounter from Backend 1 (GET /api/v1/encounters/{id}). Null when the service is down or doesn't know it. */
export async function fetchEncounter(id) {
  try {
    const res = await fetch(`${executionBase()}/api/v1/encounters/${encodeURIComponent(id)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/** The planet's first module with its encounters in play order, from Backend 2's index. Null when nothing is seeded or the database is down. */
async function fetchModule(planetId, db) {
  try {
    const client = db || (await import("../db")).db;
    const modules = await client.module.findMany({
      where: { planetId },
      orderBy: { order: "asc" },
      take: 1,
      include: { encounters: { orderBy: { order: "asc" } } }
    });
    const m = modules[0];
    return m && m.encounters.length > 0 ? m : null;
  } catch {
    return null;
  }
}

function oneLine(text, max = 48) {
  const s = String(text ?? "").trim().replace(/\s*\n\s*/g, " ↵ ");
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** The console wants `{description, input, expectedOutput}` per sample test. */
function sampleTests(detail, local) {
  if (Array.isArray(detail?.sample_tests)) {
    return detail.sample_tests.map((t) => ({
      description: `Input ${oneLine(t.input)} should produce ${oneLine(t.expected_output)}`,
      input: t.input,
      expectedOutput: t.expected_output
    }));
  }
  return local?.tests;
}

/**
 * One screen-ready encounter. The index row says it exists, where it sits and what it teaches. Backend 1's
 * encounter says what the problem is. The built-in approach data adds only what no service serves yet
 * (hint text, the explanation, the worked solution, the rock to lock onto).
 */
export function buildEncounter(row, index, detail, local) {
  if (!detail && !local) return null;
  const mainConcept = (row.concepts && row.concepts[0]) || detail?.concepts?.[0];
  return {
    id: row.id,
    title: row.title,
    difficulty: row.difficulty,
    blurb: detail?.problem ?? local?.blurb ?? "",
    concept: conceptFor(mainConcept),
    rock: local?.rock ?? index % ROCKS,
    starterCode: detail?.starter_code ?? local?.starterCode ?? "",
    example: local?.example,
    constraints: local?.constraints,
    tests: sampleTests(detail, local),
    hints: local?.hints,
    explanation: local?.explanation,
    solution: local?.solution
  };
}

function planetName(planetId, local) {
  return PLANETS.find((p) => p.id === planetId && p.name)?.name || local?.name || null;
}

function captions(name, local) {
  return local?.course || [`Setting course for ${name}…`, "Sensors show rocks ahead.", "Brace for the approach."];
}

/**
 * What the planet screen and the course screen need: the name, the captions and how many obstacles lie ahead.
 * Reads the index only (no problem text), so it is cheap. Null when the planet has no approach, live or built in.
 */
export async function summarizeApproach(planetId, deps = {}) {
  const local = (deps.local || APPROACH)[planetId];
  const module_ = await fetchModule(planetId, deps.db);
  const name = planetName(planetId, local);
  if (!name || (!module_ && !local)) return null;
  return {
    planetId,
    name,
    moduleTitle: module_?.title,
    course: captions(name, local),
    count: module_ ? module_.encounters.length : local.encounters.length
  };
}

/**
 * Everything the approach screen needs: the summary plus the encounters, screen-ready.
 * Live first: the module and its encounter order come from the index, the problems from Backend 1. Anything
 * that can't be reached falls back to the built-in data for that same encounter, so a service that is down
 * never empties a screen that has a built-in copy.
 */
export async function loadApproach(planetId, deps = {}) {
  const local = (deps.local || APPROACH)[planetId];
  const get = deps.fetchEncounter || fetchEncounter;
  const module_ = await fetchModule(planetId, deps.db);
  const name = planetName(planetId, local);
  if (!name || (!module_ && !local)) return null;

  let encounters = local ? local.encounters : [];
  let source = "built-in";
  if (module_) {
    const details = await Promise.all(module_.encounters.map((row) => get(row.id)));
    const live = module_.encounters
      .map((row, i) => buildEncounter(row, i, details[i], local?.encounters.find((e) => e.id === row.id)))
      .filter(Boolean);
    if (live.length > 0) {
      encounters = live;
      source = details.some(Boolean) ? "live" : "built-in";
    }
  }
  return { planetId, name, moduleTitle: module_?.title, course: captions(name, local), encounters, source };
}
