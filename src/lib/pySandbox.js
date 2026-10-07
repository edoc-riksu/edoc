/**
 * 🐍 PY SANDBOX — real Python execution for the Non-Negotiables validator
 * (Phase 05), via Pyodide (CPython compiled to WASM, loaded from jsDelivr
 * on first use and cached on `window.__pyodidePromise` after that so a
 * pilot only pays the load cost once per session).
 *
 * Each test gets its own fresh global namespace (`setup` fixtures, then
 * the pilot's real code, then a real boolean `check` expression, all
 * evaluated with genuine Python semantics — actual variable values,
 * actual exceptions, actual file I/O against Pyodide's in-memory FS for
 * the "with open(...)" lesson). If Pyodide can't load (no network route
 * to the CDN, an old browser, a strict org network policy), every caller
 * gets `unavailable: true` back and falls through to the legacy
 * substring check rather than blocking a pilot's submission — a real
 * runtime beats a fake one, but no runtime must never mean no lesson.
 */

const PYODIDE_CDN = "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js";

function loadPyodideScript() {
  return new Promise((resolve, reject) => {
    if (window.loadPyodide) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = PYODIDE_CDN;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Pyodide script failed to load"));
    document.head.appendChild(script);
  });
}

function getPyodide() {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (!window.__pyodidePromise) {
    window.__pyodidePromise = loadPyodideScript()
      .then(() => window.loadPyodide())
      .catch((err) => {
        // Don't cache a failure forever — a transient network blip
        // shouldn't permanently disable real Python checking for the
        // rest of the session.
        window.__pyodidePromise = null;
        throw err;
      });
  }
  return window.__pyodidePromise;
}

/**
 * Runs `tests` (each `{ description, setup?, call?, check }`) against
 * `code`. Every test gets a fresh Python namespace. Resolves to
 * `{ unavailable, allPassed, results, runtimeError }` — never rejects.
 */
export async function runPyTests({ code, tests = [], timeoutMs = 12000 }) {
  let pyodide;
  try {
    pyodide = await Promise.race([
      getPyodide(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Pyodide load timed out")), timeoutMs))
    ]);
  } catch {
    return { unavailable: true, allPassed: false, results: [], runtimeError: null };
  }

  const results = [];
  for (const t of tests) {
    let pass = false;
    let error = null;
    try {
      const namespace = pyodide.globals.get("dict")();
      const script = [
        "import os",
        t.setup || "",
        "# --- pilot submission ---",
        code || "",
        t.call ? `\n${t.call}` : "",
        `__check_result__ = bool(${t.check})`
      ].join("\n");
      await pyodide.runPythonAsync(script, { globals: namespace });
      pass = !!namespace.get("__check_result__");
      namespace.destroy();
    } catch (e) {
      error = e && e.message ? String(e.message).split("\n").pop() : String(e);
    }
    results.push({ description: t.description, pass, error });
  }

  return {
    unavailable: false,
    allPassed: results.length > 0 && results.every((r) => r.pass),
    results,
    runtimeError: null
  };
}
