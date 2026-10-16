/**
 * Client for Backend 1's real judging service (see contracts/README.md).
 * Submit is the graded action — its verdict/score is what the console
 * acts on. Run (POST .../executions/run) is informational only per the
 * contract ("a run result must never be used to award anything") and
 * isn't wired to anything yet.
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

/** `{submission_id, encounter_id, verdict, score, tests:[{test_id,passed}], execution}` on success. */
export function submitCode({ encounterId, code }) {
  return postJson("/api/v1/submissions", { encounter_id: encounterId, code });
}
