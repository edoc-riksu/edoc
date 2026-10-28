/**
 * The agreed concept list, mirrored from backend/encounters/concepts.json (Backend 1 owns it).
 * Defeat and approach screens name a concept by its `name` and explain it with its `note`.
 * concepts.test.js fails if this drifts from the backend file, so add concepts there first.
 */
export const CONCEPTS = {
  "input-output": { id: "input-output", name: "input/output", note: "Read input, process values, and print the result." },
  arithmetic: { id: "arithmetic", name: "arithmetic", note: "Calculate with numbers using operators like + - * / and %." },
  loops: { id: "loops", name: "loops", note: "Repeat an action for a sequence of values." },
  conditionals: { id: "conditionals", name: "conditionals", note: "Choose an action based on a condition." }
};

/** A concept the list doesn't know yet still gets a readable name, with no note. */
export function conceptFor(id) {
  if (!id) return { id: "", name: "this exercise", note: "" };
  return CONCEPTS[id] || { id, name: String(id).replace(/-/g, " "), note: "" };
}
