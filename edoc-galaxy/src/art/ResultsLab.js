"use client";

import { useState } from "react";
import ResultHost from "../screens/result/ResultHost";
import "../screens/approach/approach.css";

// Copies of contracts/example-submission-*.json, so this page can show what the scenes do with a real result.
const ACCEPTED = {
  verdict: "ACCEPTED",
  score: { earned: 100, total: 100 },
  tests: [
    { test_id: "sample-1", passed: true },
    { test_id: "sample-2", passed: true },
    { test_id: "hidden-1", passed: true },
    { test_id: "hidden-2", passed: true }
  ],
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
const ENCOUNTER = {
  id: "py-001",
  title: "Sum of Two Integers",
  concept: { id: "input-output", name: "input/output" },
  explanation: "Make sure you convert the input to integers before adding them. Adding the raw strings joins them instead of summing, and the result must be printed, not just computed."
};

const SCENARIOS = {
  win: { kind: "victory", result: ACCEPTED, attempts: 2, hullBefore: 80, hullAfter: 95 },
  winFull: { kind: "victory", result: ACCEPTED, attempts: 1, hullBefore: 100, hullAfter: 100 },
  lose: { kind: "defeat", result: WRONG, attempts: 5 },
  loseApi: { kind: "defeat", result: { ...WRONG, verdict: "TIME_LIMIT_EXCEEDED" }, attempts: 3, explanation: "Your loop never ends when N is zero, so the program keeps running until it is stopped." }
};

/** Review page: feed the scenes a real-shaped result. ?scene=win|winFull|lose|loseApi opens one straight away. */
export default function ResultsLab({ initial, calm }) {
  const [key, setKey] = useState(SCENARIOS[initial] ? initial : null);
  const [count, setCount] = useState(0);
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeContent: "center", gap: 16, padding: 24, background: "#04070d", color: "#cfe" }}>
      <h1 style={{ font: "600 18px var(--display, sans-serif)" }}>Result scenes</h1>
      <p style={{ maxWidth: 420, opacity: 0.75 }}>Each button hands the scene a result shaped like the judging API's. Continue or Rematch closes it.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {Object.keys(SCENARIOS).map((k) => (
          <button key={k} type="button" data-scene={k} onClick={() => { setKey(k); setCount((n) => n + 1); }} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #3a5", background: "#0a1a14", color: "#cfe" }}>
            {k}
          </button>
        ))}
      </div>
      <p data-testid="log">{count > 0 ? `opened ${count}` : ""}</p>
      <ResultHost
        key={`${key}-${count}`}
        result={key ? SCENARIOS[key] : null}
        encounter={ENCOUNTER}
        nextLabel="Next obstacle"
        onContinue={() => setKey(null)}
        onRematch={() => setKey(null)}
        muted
        calm={calm}
      />
    </main>
  );
}
