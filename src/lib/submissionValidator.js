/**
 * ✅ SUBMISSION VALIDATOR — the single place every submission surface
 * (CodeTerminal, Combat Array Solo/Duel, Ranked duels) goes through to
 * decide pass/fail (Phase 05's Non-Negotiables Pass: "damage from failing
 * tests, not syntax"). Python, JavaScript and TypeScript lessons run for
 * real (see jsSandbox.js / pySandbox.js / tsSandbox.js); Go, Rust and SQL
 * keep the original keyword-substring check until each has a real
 * client-side runtime too — that's an honest, visible `mode`, not a
 * silent gap.
 */
import { getLessonTests, getJsHarnessSetup, getTsTypeHarness, getTsRuntimeHarness } from "./lessonTests";
import { runJsTests } from "./jsSandbox";
import { runPyTests } from "./pySandbox";
import { runTsTests } from "./tsSandbox";

function substringResult(lesson, code) {
  return {
    mode: "substring",
    passed: (code || "").includes(lesson.requiredKeyword),
    results: [],
    runtimeError: null,
    degraded: false
  };
}

/**
 * Resolves to `{ mode, passed, results, runtimeError, degraded }`.
 * `mode` is "tests" (real sandboxed execution) or "substring" (legacy
 * keyword check — either because this language has no runtime yet, or
 * `degraded: true` because Python's runtime couldn't load this session).
 */
export async function evaluateSubmission(sectorId, lessonIdx, lesson, code) {
  const tests = getLessonTests(sectorId, lessonIdx);
  if (!tests || !lesson) return substringResult(lesson, code);

  if (sectorId === "JavaScript Engine") {
    const harnessSetup = getJsHarnessSetup(sectorId, lessonIdx);
    const outcome = await runJsTests({ code, harnessSetup, tests });
    if (outcome.timedOut) {
      return { mode: "tests", passed: false, results: [], runtimeError: "Timed out — check for an infinite loop.", degraded: false };
    }
    return { mode: "tests", passed: outcome.allPassed, results: outcome.results, runtimeError: outcome.runtimeError, degraded: false };
  }

  if (sectorId === "Python Engine Core") {
    const outcome = await runPyTests({ code, tests });
    if (outcome.unavailable) {
      const fallback = substringResult(lesson, code);
      return { ...fallback, degraded: true };
    }
    return { mode: "tests", passed: outcome.allPassed, results: outcome.results, runtimeError: outcome.runtimeError, degraded: false };
  }

  if (sectorId === "TypeScript Array") {
    const tsHarness = getTsTypeHarness(sectorId, lessonIdx);
    const jsHarness = getTsRuntimeHarness(sectorId, lessonIdx);
    const outcome = await runTsTests({ code, tsHarness, jsHarness, tests });
    if (outcome.unavailable) {
      const fallback = substringResult(lesson, code);
      return { ...fallback, degraded: true };
    }
    if (outcome.timedOut) {
      return { mode: "tests", passed: false, results: [], runtimeError: "Timed out — check for an infinite loop.", degraded: false };
    }
    return { mode: "tests", passed: outcome.allPassed, results: outcome.results, runtimeError: outcome.runtimeError, degraded: false };
  }

  return substringResult(lesson, code);
}
