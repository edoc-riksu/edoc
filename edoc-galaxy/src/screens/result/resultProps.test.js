import { describe, it, expect } from "vitest";
import { missedTests, victoryProps, defeatProps } from "./resultProps";

const ENC = { id: "py-001", title: "Sum of Two Integers", concept: { id: "input-output", name: "input/output" }, explanation: "Convert to integers, then print the sum." };
const ACCEPTED = {
  verdict: "ACCEPTED",
  score: { earned: 100, total: 100 },
  tests: [{ test_id: "sample-1", passed: true }, { test_id: "hidden-1", passed: true }],
  execution: { runtime_ms: 38 }
};
const WRONG = {
  verdict: "WRONG_ANSWER",
  score: { earned: 60, total: 100 },
  tests: [
    { test_id: "sample-1", passed: true },
    { test_id: "sample-2", passed: false },
    { test_id: "hidden-1", passed: true },
    { test_id: "hidden-4", passed: false },
    { test_id: "hidden-5", passed: false }
  ],
  execution: { runtime_ms: 44 }
};

describe("missedTests", () => {
  it("names missed samples and only counts missed hidden tests", () => {
    expect(missedTests(WRONG.tests)).toEqual(["Sample test 2", "2 hidden tests"]);
  });
  it("says '1 hidden test' for one, and nothing for a clean run or missing data", () => {
    expect(missedTests([{ test_id: "hidden-3", passed: false }])).toEqual(["1 hidden test"]);
    expect(missedTests(ACCEPTED.tests)).toEqual([]);
    expect(missedTests(undefined)).toEqual([]);
  });
  it("never leaks a hidden test id", () => {
    expect(missedTests(WRONG.tests).join(" ")).not.toMatch(/hidden-\d/);
  });
});

describe("victoryProps", () => {
  it("fills the scene from the result and the console's hull numbers", () => {
    expect(victoryProps({ encounter: ENC, result: ACCEPTED, attempts: 2, hullBefore: 80, hullAfter: 95, nextLabel: "Next obstacle" })).toEqual({
      title: "Sum of Two Integers",
      concept: "input/output",
      hull: 95,
      hullGain: 15,
      attempts: 2,
      runtimeMs: 38,
      nextLabel: "Next obstacle"
    });
  });
  it("shows no repair when the hull was already full, and survives missing data", () => {
    expect(victoryProps({ encounter: ENC, result: ACCEPTED, hullBefore: 100, hullAfter: 100 }).hullGain).toBe(0);
    const bare = victoryProps({ encounter: undefined, result: undefined, hullAfter: undefined });
    expect(bare).toMatchObject({ title: "Encounter", hull: 100, hullGain: 0, nextLabel: "Continue" });
  });
});

describe("defeatProps", () => {
  // the shape the judging API really returns on a wrong answer (contracts/example-submission-wrong-answer.json)
  const WITH_DEFEAT = {
    ...WRONG,
    defeat: {
      concept: { id: "input-output", name: "input/output", note: "Read input, process values, and print the result." },
      explanation: "Make sure you convert the input to integers before adding them."
    }
  };

  it("teaches what the API's defeat object says: its concept, its note and its explanation", () => {
    expect(defeatProps({ encounter: ENC, result: WITH_DEFEAT, attempts: 3 })).toEqual({
      concept: "input/output",
      conceptNote: "Read input, process values, and print the result.",
      explanation: "Make sure you convert the input to integers before adding them.",
      failedTests: ["Sample test 2", "2 hidden tests"],
      attempts: 3
    });
  });

  it("uses the API's concept even when the screen's encounter names a different one", () => {
    const other = { ...WITH_DEFEAT, defeat: { ...WITH_DEFEAT.defeat, concept: { id: "loops", name: "loops", note: "" } } };
    const p = defeatProps({ encounter: ENC, result: other });
    expect(p.concept).toBe("loops");
    expect(p.conceptNote).toBeUndefined();
  });

  it("falls back to the encounter's explanation, then a line for the verdict, when there is no defeat object", () => {
    expect(defeatProps({ encounter: ENC, result: { ...WRONG, defeat: null } }).explanation).toBe("Convert to integers, then print the sum.");
    expect(defeatProps({ encounter: { ...ENC, explanation: undefined }, result: WRONG }).explanation).toMatch(/did not match/);
    expect(defeatProps({ encounter: { ...ENC, explanation: undefined }, result: { verdict: "TIME_LIMIT_EXCEEDED" } }).explanation).toMatch(/too long/);
    expect(defeatProps({ encounter: { ...ENC, explanation: undefined }, result: undefined }).explanation).toMatch(/Every miss/);
  });

  it("names the concept from the encounter when the result has no defeat object", () => {
    expect(defeatProps({ encounter: ENC, result: WRONG, attempts: 3 })).toMatchObject({ concept: "input/output", failedTests: ["Sample test 2", "2 hidden tests"], attempts: 3 });
  });
});
