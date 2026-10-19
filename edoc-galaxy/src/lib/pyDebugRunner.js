/**
 * DEBUG CONSOLE — run arbitrary code against custom stdin, entirely
 * client-side via Pyodide (CPython compiled to WASM, loaded from jsDelivr
 * on first use and cached on `window.__pyodidePromise`).
 *
 * This is separate from grading: the real backend (executionApi.js) has
 * no way to accept a custom stdin value today, only its own fixed sample
 * tests. This never contacts the backend and never affects hull,
 * attempts or score — it's just a scratchpad to see your own output.
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
        window.__pyodidePromise = null;
        throw err;
      });
  }
  return window.__pyodidePromise;
}

/**
 * Runs `code` with `stdin` fed to input(), one line per call. Resolves to
 * `{ unavailable, stdout, stderr }` — never rejects.
 */
export async function runWithInput({ code, stdin = "", timeoutMs = 12000 }) {
  let pyodide;
  try {
    pyodide = await Promise.race([
      getPyodide(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Pyodide load timed out")), timeoutMs))
    ]);
  } catch {
    return { unavailable: true, stdout: "", stderr: "" };
  }

  const lines = stdin.split("\n");
  let lineIndex = 0;
  let stdout = "";
  let stderr = "";

  pyodide.setStdin({ stdin: () => (lineIndex < lines.length ? lines[lineIndex++] : undefined) });
  pyodide.setStdout({ batched: (msg) => { stdout += `${msg}\n`; } });
  pyodide.setStderr({ batched: (msg) => { stderr += `${msg}\n`; } });

  try {
    await Promise.race([
      pyodide.runPythonAsync(code || ""),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timed out")), timeoutMs))
    ]);
  } catch (e) {
    stderr += String(e?.message || e);
  } finally {
    pyodide.setStdin({});
    pyodide.setStdout({});
    pyodide.setStderr({});
  }

  return { unavailable: false, stdout: stdout.trimEnd(), stderr: stderr.trimEnd() };
}
