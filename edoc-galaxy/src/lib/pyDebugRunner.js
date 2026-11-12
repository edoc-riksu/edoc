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

// A practice run that takes longer than this is stopped (the scored run on the
// server has its own limit per encounter, usually 2 seconds). Tracing makes
// Python a few times slower, so this is more generous than the server's.
export const TIME_LIMIT_MS = 5000;

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
 * Runs `code` with `stdin` as its standard input. Resolves to
 * `{ unavailable, stdout, stderr, timedOut }` — never rejects.
 */
export async function runWithInput({ code, stdin = "", timeoutMs = 12000, timeLimitMs = TIME_LIMIT_MS }) {
  let pyodide;
  try {
    pyodide = await Promise.race([
      getPyodide(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Pyodide load timed out")), timeoutMs))
    ]);
  } catch {
    return { unavailable: true, stdout: "", stderr: "" };
  }

  const { stdout, stderr, timedOut } = await runOnPyodide(pyodide, { code, stdin, timeLimitMs });
  return { unavailable: false, stdout, stderr, timedOut };
}

/**
 * Plan Day 12 (both run paths give the same result). The part that has to
 * behave like the server's sandbox, on a Pyodide instance you already have, so
 * scripts/check-run-parity.mjs can test it in Node. What the server does, and
 * what this does the same way:
 *  - stdin is the test input as one piece of text, exactly as given (so
 *    input(), sys.stdin.read() and sys.stdin.readlines() all see the same text);
 *  - every run starts with its own empty global namespace, so a variable from
 *    the previous run is never visible;
 *  - everything printed arrives, including text with no newline at the end
 *    (print("x", end="")), and nothing is carried over into the next run;
 *  - a program that never ends is stopped after `timeLimitMs` and reported
 *    with `timedOut: true`, like the server's time limit. The page's own
 *    setTimeout cannot do this: a loop in Pyodide blocks the page, so the
 *    timer never fires. Python's trace hook can stop it from inside.
 * What it cannot do the same way: Python 3.12 here against 3.10 on the server,
 * no memory limit, and one long step inside the interpreter (for example a
 * huge power) cannot be interrupted (see backend/README.md, "Run paths").
 */
export async function runOnPyodide(pyodide, { code, stdin = "", timeLimitMs = TIME_LIMIT_MS }) {
  let stdout = "";
  let stderr = "";
  const outDecoder = new TextDecoder();
  const errDecoder = new TextDecoder();
  pyodide.setStdout({
    write: (bytes) => {
      stdout += outDecoder.decode(bytes, { stream: true });
      return bytes.length;
    }
  });
  pyodide.setStderr({
    write: (bytes) => {
      stderr += errDecoder.decode(bytes, { stream: true });
      return bytes.length;
    }
  });

  let timedOut = false;
  const globals = pyodide.globals.get("dict")();
  try {
    globals.set("__edoc_stdin", stdin);
    globals.set("__edoc_limit", timeLimitMs / 1000);
    pyodide.runPython(TRACE_SETUP, { globals });
    await pyodide.runPythonAsync(code || "", { globals });
  } catch (e) {
    const message = String(e?.message || e);
    timedOut = message.includes("EdocTimeLimitExceeded");
    stderr += message;
  } finally {
    try {
      pyodide.runPython("import sys\nsys.settrace(None)\nsys.stdout.flush()\nsys.stderr.flush()\nsys.stdin = sys.__stdin__", { globals });
    } catch {
      // Nothing to clean up if the player's code replaced sys.stdout.
    }
    stdout += outDecoder.decode();
    stderr += errDecoder.decode();
    pyodide.setStdout({});
    pyodide.setStderr({});
    globals.destroy();
  }
  return { stdout: stdout.trimEnd(), stderr: stderr.trimEnd(), timedOut };
}

// Runs inside Python before the player's code. Not a BaseException subclass
// by accident: "except Exception" in the player's code must not swallow it.
const TRACE_SETUP = `
import io, sys, time
sys.stdin = io.StringIO(__edoc_stdin)
class EdocTimeLimitExceeded(BaseException):
    pass
__edoc_deadline = time.monotonic() + __edoc_limit
def __edoc_trace(frame, event, arg):
    if time.monotonic() > __edoc_deadline:
        sys.settrace(None)
        raise EdocTimeLimitExceeded("Time limit exceeded")
    return __edoc_trace
sys.settrace(__edoc_trace)
`;
