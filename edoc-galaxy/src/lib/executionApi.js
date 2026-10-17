/**
 * Client for Backend 1's real judging service (see contracts/README.md).
 * Run is sample tests only, with real stdout/stderr, for debugging — it
 * must never affect hull or progress. Submit is the graded action, run
 * against sample and hidden tests, and its verdict/score is what the
 * console acts on.
 */
const BASE_URL = process.env.NEXT_PUBLIC_EXECUTION_API_URL || "http://localhost:8001";

async function postJson(path, body) {
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  } catch {
    return { ok: false, status: 0, data: null };
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

/** `{encounter_id, tests:[{test_id,passed,stdout,stderr}], execution}` on success. Sample tests only. */
export function runCode({ encounterId, code }) {
  return postJson("/api/v1/executions/run", { encounter_id: encounterId, code });
}

/** `{submission_id, encounter_id, verdict, score, tests:[{test_id,passed}], execution}` on success. */
export function submitCode({ encounterId, code }) {
  return postJson("/api/v1/submissions", { encounter_id: encounterId, code });
}
