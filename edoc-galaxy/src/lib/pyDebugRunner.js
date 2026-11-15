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
    // The raw exception name means nothing to a player, so say what happened
    // and keep the traceback lines that show where it was stuck.
    stderr += timedOut
      ? message.replace(/EdocTimeLimitExceeded: Time limit exceeded\s*$/, "") +
        `Time limit exceeded: your program was still running after ${timeLimitMs / 1000} seconds. ` +
        "Check for a loop that never ends."
      : message;
  } finally {
    try {
      pyodide.runPython(TRACE_CLEANUP, { globals, filename: "<edoc-cleanup>" });
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

// Runs inside Python before the player's code. The stop is a BaseException
// subclass on purpose: "except Exception" in the player's code must not
// swallow it.
//
// It is raised from a line-event hook in sys.monitoring (Python 3.12+, which
// is what Pyodide 0.26 is). The older sys.settrace is not enough: Python
// switches a trace function off after it raises once, so a loop wrapped in a
// bare "except:" (for example a read-until-the-end loop that catches the
// EOFError) would catch the one raise and then run forever. A monitoring
// hook stays on, so every line after the deadline raises again, and the
// player's own except block, which is not protected by the same try, lets it
// out. Only lines of the player's own code (file name "<exec>") are timed;
// Pyodide's and our own cleanup code (named "<edoc-cleanup>") are left alone.
const TRACE_SETUP = `
import io, sys, time
sys.stdin = io.StringIO(__edoc_stdin)
class EdocTimeLimitExceeded(BaseException):
    pass
__edoc_deadline = time.monotonic() + __edoc_limit
if hasattr(sys, "monitoring"):
    __edoc_tool = 3
    sys.monitoring.use_tool_id(__edoc_tool, "edoc-time-limit")
    def __edoc_line(code, line):
        if code.co_filename == "<exec>" and time.monotonic() > __edoc_deadline:
            raise EdocTimeLimitExceeded("Time limit exceeded")
    sys.monitoring.register_callback(__edoc_tool, sys.monitoring.events.LINE, __edoc_line)
    sys.monitoring.set_events(__edoc_tool, sys.monitoring.events.LINE)
else:
    def __edoc_trace(frame, event, arg):
        if frame.f_code.co_filename != "<exec>":
            return None
        if time.monotonic() > __edoc_deadline:
            raise EdocTimeLimitExceeded("Time limit exceeded")
        return __edoc_trace
    sys.settrace(__edoc_trace)
`;

const TRACE_CLEANUP = `
import sys
if hasattr(sys, "monitoring"):
    sys.monitoring.set_events(3, 0)
    sys.monitoring.register_callback(3, sys.monitoring.events.LINE, None)
    sys.monitoring.free_tool_id(3)
sys.settrace(None)
sys.stdout.flush()
sys.stderr.flush()
sys.stdin = sys.__stdin__
`;
