/**
 * 🧪 TS SANDBOX — real TypeScript validation for the Non-Negotiables
 * validator, extending Phase 05's "damage from failing tests, not syntax"
 * rule to TypeScript (the "Beyond The Plan" follow-up to the roadmap's
 * disclosed TypeScript/Go/Rust/SQL gap).
 *
 * TypeScript is a strange case for runtime testing: half of what a TS
 * lesson teaches (interfaces, type aliases, generics signatures, `unknown`
 * catch types, `Partial<T>`) is erased entirely by the compiler and leaves
 * no trace at runtime — there is nothing to `eval()` and inspect. So this
 * sandbox checks TWO real things instead of one:
 *
 *  1. A genuine compiler error. `ts.transpileModule` runs the pilot's
 *     actual code through the real TypeScript compiler; a syntax error
 *     comes back as the compiler's own diagnostic message, not a vague
 *     "missing token" nag — same spirit as the JS sandbox's real
 *     ReferenceErrors.
 *  2. Structural checks against the real parsed AST (`ts.createSourceFile`
 *     + `ts.forEachChild`) for anything that's erased at runtime —
 *     "does this actually declare an interface named Pilot", not "does
 *     the source text contain the substring 'interface Pilot'". Parsing
 *     is pure, read-only analysis (no code execution), so it runs safely
 *     in the main thread, unlike the pilot's own code.
 *
 * Whatever DOES survive to runtime (a typed `enum`, a plain typed
 * variable, a function declaration) gets transpiled to real JS and handed
 * to the exact same sandboxed iframe `runJsTests` already uses for
 * JavaScript lessons — one proven, scope-safe execution path, not a
 * second one to get subtly wrong.
 *
 * The TypeScript compiler is a multi-hundred-KB dependency almost nobody
 * visiting the app needs — most pilots never open a TS lesson. It's
 * `import()`'d lazily on first use instead of statically, so it lands in
 * its own on-demand chunk rather than bloating every pilot's initial
 * bundle for a language they may never touch.
 */
import { runJsTests } from "./jsSandbox";

let tsModulePromise = null;
function loadTs() {
  if (!tsModulePromise) tsModulePromise = import("typescript");
  return tsModulePromise;
}

function transpile(ts, source) {
  const out = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2019, module: ts.ModuleKind.None },
    reportDiagnostics: true
  });
  const errors = (out.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  const message = errors.length ? errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, " ")).join("; ") : null;
  return { js: out.outputText, error: message };
}

function parsePilotSource(ts, code) {
  try {
    return { sourceFile: ts.createSourceFile("submission.ts", code, ts.ScriptTarget.ES2019, true, ts.ScriptKind.TS), error: null };
  } catch (e) {
    return { sourceFile: null, error: e && e.message ? String(e.message) : String(e) };
  }
}

/**
 * Runs `tests` (each `{ kind: "ast", description, astCheck(sourceFile, ts) }`
 * or `{ kind: "runtime", description, check, call? }`) against a pilot's TS
 * submission. `tsHarness` is TypeScript-only fixtures (e.g. an interface
 * the pilot's own type annotations reference) merged in for the compiler
 * check only — it's erased at runtime, so it never pollutes the sandbox.
 * `jsHarness` is real JS fixtures (spies, seed variables) that DO need to
 * exist at runtime, passed straight through to the JS sandbox. Resolves to
 * `{ allPassed, results, runtimeError, timedOut, unavailable }` — the same
 * shape `runJsTests`/`runPyTests` use, so the shared validator can treat
 * all three uniformly. `unavailable: true` (compiler chunk failed to load)
 * mirrors Python's own honest degrade-to-substring path.
 */
export async function runTsTests({ code, tsHarness = "", jsHarness = "", tests = [], timeoutMs = 3500 }) {
  let ts;
  try {
    const mod = await loadTs();
    ts = mod.default || mod;
  } catch (e) {
    tsModulePromise = null; // a transient load failure shouldn't wedge the session
    return { allPassed: false, results: [], runtimeError: null, timedOut: false, unavailable: true };
  }

  const combined = `${tsHarness}\n${code}`;
  const { js, error: compileError } = transpile(ts, combined);
  if (compileError) {
    return {
      allPassed: false,
      results: tests.map((t) => ({ description: t.description, pass: false, error: compileError })),
      runtimeError: compileError,
      timedOut: false,
      unavailable: false
    };
  }

  const { sourceFile, error: parseError } = parsePilotSource(ts, code);
  const results = new Array(tests.length);
  const runtimeTests = [];

  tests.forEach((t, idx) => {
    if (t.kind === "ast") {
      if (parseError) {
        results[idx] = { description: t.description, pass: false, error: parseError };
        return;
      }
      let pass = false;
      let err = null;
      try {
        pass = !!t.astCheck(sourceFile, ts);
      } catch (e) {
        err = e && e.message ? String(e.message) : String(e);
      }
      results[idx] = { description: t.description, pass, error: err };
    } else {
      runtimeTests.push({ idx, spec: t });
    }
  });

  if (runtimeTests.length > 0) {
    const runtimeResult = await runJsTests({
      code: js,
      harnessSetup: jsHarness,
      tests: runtimeTests.map((r) => r.spec),
      timeoutMs
    });
    if (runtimeResult.timedOut) {
      runtimeTests.forEach((r) => {
        results[r.idx] = { description: r.spec.description, pass: false, error: null };
      });
      return { allPassed: false, results, runtimeError: null, timedOut: true, unavailable: false };
    }
    runtimeTests.forEach((r, i) => {
      results[r.idx] = runtimeResult.results[i] || { description: r.spec.description, pass: false, error: runtimeResult.runtimeError || "No result" };
    });
  }

  return {
    allPassed: results.length > 0 && results.every((r) => r && r.pass),
    results,
    runtimeError: null,
    timedOut: false,
    unavailable: false
  };
}
