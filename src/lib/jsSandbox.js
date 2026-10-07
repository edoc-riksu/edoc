/**
 * 🧪 JS SANDBOX — real, isolated code execution for the Non-Negotiables
 * validator (Phase 05). Runs a pilot's submitted JavaScript inside an
 * <iframe sandbox="allow-scripts"> with NO `allow-same-origin`: the iframe
 * gets an opaque origin, so it cannot reach this page, its cookies, its
 * localStorage, or the network — a real, browser-enforced sandbox, not a
 * cosmetic one.
 *
 * The pilot's code actually runs. Test assertions are real JS boolean
 * expressions evaluated in the SAME global scope right after it, so they
 * see the pilot's real variables/functions/behavior — not a keyword
 * substring match against the source text. A genuine thrown error (from
 * the pilot's code, or from a failed assertion) comes back as a real
 * message, which is what "damage from failing tests, not syntax" means:
 * a `let` typo'd as `elt` fails with a real ReferenceError, not a vague
 * "missing token" nag.
 */

let sandboxCounter = 0;

function buildSrcDoc({ harnessSetup, code, tests }) {
  const testsJson = JSON.stringify(tests);
  const sandboxId = JSON.stringify(String(sandboxCounter));
  // IMPORTANT: the pilot's `code` must NOT be nested inside any extra
  // `{ }` block (an `if`/`try`/etc.) here — `const`/`let` are block-
  // scoped, so a `try { ${code} }` wrapper would make every top-level
  // binding the pilot declares invisible to the assertions that run
  // right after it (a real bug this exact template hit: `const crew = []`
  // inside a `try` block couldn't be seen by `eval("crew.length === 0")`
  // outside it). Pilot code runs unwrapped, directly in the async IIFE's
  // own body, so its declarations land in that same function scope —
  // which the assertions below share, as plain sibling statements.
  return `<!doctype html><html><body>
<script>
// Spy scaffolding — generic across lessons, so DOM/event/network calls are
// observed as real runtime behavior rather than guessed from source.
window.__addEventListenerCalls = [];
window.__fetchCalls = [];
(function () {
  var _origAdd = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, handler, opts) {
    window.__addEventListenerCalls.push({ type: type, target: this });
    return _origAdd.call(this, type, handler, opts);
  };
  window.fetch = function () {
    var args = Array.prototype.slice.call(arguments);
    window.__fetchCalls.push(args);
    return Promise.resolve({ ok: true, json: function () { return Promise.resolve({ status: "ok" }); } });
  };
})();

(async function () {
  // Harness fixtures (e.g. a pre-seeded "cells" array), the pilot's own
  // submitted buffer, and the test loop below all run as FLAT sibling
  // statements in this one function scope, with no other function or
  // block wrapping any of it — a separate "run the tests" function here
  // would be its own closure, defined at the top of the script rather
  // than nested inside this one, so a direct \`eval\` inside it could
  // never see a \`const\`/\`let\` the pilot's code just declared. Inlining
  // the loop is what makes the assertions genuinely see the pilot's
  // real bindings.
  ${harnessSetup || ""}
  ${code}
  var __tests = ${testsJson};
  var __results = [];
  for (var __i = 0; __i < __tests.length; __i++) {
    var __t = __tests[__i];
    var __pass = false, __err = null;
    try {
      if (__t.call) eval(__t.call);
      __pass = !!eval(__t.check);
    } catch (__e2) {
      __err = (__e2 && __e2.message) ? String(__e2.message) : String(__e2);
    }
    __results.push({ description: __t.description, pass: __pass, error: __err });
  }
  window.parent.postMessage({ __sandboxId: ${sandboxId}, type: "results", results: __results, runtimeError: null }, "*");
})().catch(function (e) {
  var runtimeError = (e && e.message) ? String(e.message) : String(e);
  var results = ${testsJson}.map(function (t) { return { description: t.description, pass: false, error: runtimeError }; });
  window.parent.postMessage({ __sandboxId: ${sandboxId}, type: "results", results: results, runtimeError: runtimeError }, "*");
});
<\/script>
</body></html>`;
}

/**
 * Runs `tests` (each `{ description, check, call? }`) against `code`
 * inside a fresh sandboxed iframe. `harnessSetup` is optional JS source
 * run before the pilot's code (fixtures like a seeded array). Resolves to
 * `{ allPassed, results, runtimeError, timedOut }` — never rejects, so a
 * caller never needs a try/catch around a hung sandbox.
 */
export function runJsTests({ code, harnessSetup = "", tests = [], timeoutMs = 3500 }) {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve({ allPassed: false, results: [], runtimeError: "Sandbox unavailable (no DOM).", timedOut: false });
      return;
    }
    sandboxCounter += 1;
    const sandboxId = String(sandboxCounter);
    const iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", "allow-scripts");
    iframe.style.display = "none";
    let settled = false;

    const cleanup = () => {
      window.removeEventListener("message", handleMessage);
      clearTimeout(timer);
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    };

    const handleMessage = (evt) => {
      if (!evt.data || evt.data.__sandboxId !== sandboxId || evt.data.type !== "results") return;
      if (settled) return;
      settled = true;
      const results = evt.data.results || [];
      cleanup();
      resolve({
        allPassed: results.length > 0 && results.every((r) => r.pass),
        results,
        runtimeError: evt.data.runtimeError || null,
        timedOut: false
      });
    };

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ allPassed: false, results: [], runtimeError: null, timedOut: true });
    }, timeoutMs);

    window.addEventListener("message", handleMessage);
    iframe.srcdoc = buildSrcDoc({ harnessSetup, code, tests });
    document.body.appendChild(iframe);
  });
}
