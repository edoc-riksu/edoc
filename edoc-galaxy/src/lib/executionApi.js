/**
 * Client for Backend 1's real judging service (see contracts/README.md).
 * Run is sample tests only, with real stdout/stderr, for debugging — it
 * must never affect hull or progress. Submit is the graded action, run
 * against sample and hidden tests, and its verdict/score is what the
 * console acts on.
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_EXECUTION_API_URL || "http://localhost:8001";

async function postJson(path, body, baseUrl = BASE_URL) {
  let res;

  try {
    res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
  return postJson(
    "/api/v1/executions/run",
    { encounter_id: encounterId, code },
    BASE_URL
  );
}

/**
 * Routed through our own `/api/approach/submissions` proxy, not straight to
 * the execution service — the proxy is what persists an Attempt row so
 * progress survives a reload (see getResumeState below).
 */
export function submitCode({ encounterId, code }) {
  return postJson(
    "/api/approach/submissions",
    { encounter_id: encounterId, code },
    ""
  );
}

export async function getResumeState(encounterId) {
  try {
    const res = await fetch(
      `/api/approach/resume?encounter_id=${encodeURIComponent(encounterId)}`,
      { method: "GET", cache: "no-store" }
    );

    const data = await res.json().catch(() => null);

    return {
      ok: res.ok,
      status: res.status,
      data,
    };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}
