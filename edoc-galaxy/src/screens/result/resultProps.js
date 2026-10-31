/**
 * Turns a real judging result (contracts/submission-result.schema.json) into what the two scenes show.
 * Pure functions: no fetching, no state. The console reports a result, the approach screen calls these and
 * hands the output to EncounterCleared / HullDepleted.
 *
 * Hidden tests are never named or described: a miss on one only counts ("1 hidden test"). Sample tests are
 * named by their number ("Sample test 2"), which matches the console's own list.
 */

const VERDICT_LINES = {
  WRONG_ANSWER: "Your output did not match what the tests expected.",
  RUNTIME_ERROR: "Your code crashed while it was running.",
  TIME_LIMIT_EXCEEDED: "Your code took too long to finish.",
  COMPILATION_ERROR: "Your code could not be read. Check the syntax."
};

const FALLBACK_LINE = "Every miss is information. Look at what the tests expected, then try again.";

/** The tests that failed, as short labels: named samples first, then one summary line for the hidden ones. */
export function missedTests(tests) {
  const list = Array.isArray(tests) ? tests : [];
  const samples = [];
  let hidden = 0;
  for (const t of list) {
    if (t?.passed) continue;
    const id = String(t?.test_id ?? "");
    const sample = /^sample-(\d+)$/.exec(id);
    if (sample) samples.push(`Sample test ${sample[1]}`);
    else hidden += 1;
  }
  if (hidden > 0) samples.push(hidden === 1 ? "1 hidden test" : `${hidden} hidden tests`);
  return samples;
}

/** Props for <EncounterCleared> after an ACCEPTED result. hullBefore/hullAfter are the console's own numbers. */
export function victoryProps({ encounter, result, attempts, hullBefore, hullAfter, nextLabel }) {
  const after = clampHull(hullAfter);
  const gain = hullBefore == null ? 0 : Math.max(0, after - clampHull(hullBefore));
  return {
    title: encounter?.title ?? "Encounter",
    concept: encounter?.concept?.name,
    hull: after,
    hullGain: gain,
    attempts: attempts ?? undefined,
    runtimeMs: result?.execution?.runtime_ms ?? undefined,
    nextLabel: nextLabel || "Continue"
  };
}

/**
 * Props for <HullDepleted> after the hull ran out. The judging API sends `defeat` with every wrong answer:
 * the main concept that failed ({ id, name, note }) and the explanation written for it. That is what the scene
 * teaches. If the result has none (an older service, a built-in encounter), the encounter's own explanation is
 * used, then a plain line for the verdict.
 */
export function defeatProps({ encounter, result, attempts }) {
  const api = result?.defeat;
  const text = api?.explanation || encounter?.explanation || VERDICT_LINES[result?.verdict] || FALLBACK_LINE;
  return {
    concept: api?.concept?.name || encounter?.concept?.name,
    conceptNote: api?.concept?.note || undefined,
    explanation: text,
    failedTests: missedTests(result?.tests),
    attempts: attempts ?? undefined
  };
}

function clampHull(n) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 100;
}
