// Plan Day 12: both run paths give the same result.
//
// A player's code can run in two places: the browser (Pyodide, the practice
// console, src/lib/pyDebugRunner.js) and the server (Piston, which also does
// the scored runs). This runs the same programs with the same input in both
// and fails if what they print differs, using the server's comparison rules
// (backend/app/judge/comparator.py): line endings unified, trailing spaces on
// each line and trailing blank lines ignored, everything else exact.
//
// What it runs:
//  1. the reference solution (hint 3) of every encounter, on every sample and
//     hidden test input - it must also print the expected output in both;
//  2. a set of small programs that are easy to get different (text without a
//     newline at the end, reading all of stdin, a variable left over from the
//     previous run, an error after some output, an endless loop).
//
// Usage (from edoc-galaxy/, Node 22 or newer):
//   npm install --no-save pyodide@0.26.2     # same version the console loads
//   PYTHON=python3.10 node scripts/check-run-parity.mjs
// PYTHON is the interpreter that stands in for the server's sandbox (the
// server runs Python 3.10). Without it, "python3" on the path is used and the
// report says which version that is.

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEncounters } from "../src/lib/server/encounterFiles.mjs";
import { runOnPyodide } from "../src/lib/pyDebugRunner.js";

const here = dirname(fileURLToPath(import.meta.url));
const PYTHON = process.env.PYTHON || "python3";

let loadPyodide;
try {
  ({ loadPyodide } = await import("pyodide"));
} catch {
  console.error("Pyodide is not installed here. Run: npm install --no-save pyodide@0.26.2");
  process.exit(2);
}

// Same rules as backend/app/judge/comparator.py.
function normalize(output) {
  const lines = output.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").map((l) => l.trimEnd());
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines.join("\n");
}
const same = (a, b) => normalize(a) === normalize(b);

function runOnServerStandIn(code, stdin) {
  const r = spawnSync(PYTHON, ["-I", "-c", code], { input: stdin, encoding: "utf8", timeout: 10000 });
  return { stdout: r.stdout ?? "", stderr: (r.stderr ?? "").trim(), timedOut: r.error?.code === "ETIMEDOUT" };
}

const lastLine = (text) => text.trim().split("\n").pop() || "";

const version = spawnSync(PYTHON, ["--version"], { encoding: "utf8" }).stdout.trim();
console.log(`Server stand-in: ${PYTHON} (${version})`);
const pyodide = await loadPyodide();
console.log(`Browser: Pyodide, Python ${pyodide.runPython("import sys; sys.version.split()[0]")}\n`);

const problems = [];

// 1. Reference solutions on every test input.
const encounters = loadEncounters(join(here, "..", "..", "backend", "encounters"), "python");
let runs = 0;
for (const e of encounters) {
  const code = e.hints["3"];
  for (const t of [...e.tests.sample, ...e.tests.hidden]) {
    runs += 1;
    const browser = await runOnPyodide(pyodide, { code, stdin: t.input });
    const server = runOnServerStandIn(code, t.input);
    if (!same(browser.stdout, server.stdout))
      problems.push(`${e.id} ${t.id}: browser printed ${JSON.stringify(browser.stdout)}, server printed ${JSON.stringify(server.stdout)}`);
    if (!same(browser.stdout, t.expected_output))
      problems.push(`${e.id} ${t.id}: browser output ${JSON.stringify(browser.stdout)} is not the expected ${JSON.stringify(t.expected_output)}`);
  }
}
console.log(`Reference solutions: ${encounters.length} encounters, ${runs} runs compared.`);

// 2. Programs that are easy to get different.
const PROBES = {
  "text with no newline at the end": ['print("a", end="")\nprint("b", end="")', ""],
  "sys.stdout.write without newline": ['import sys\nsys.stdout.write("hi")', ""],
  "output of the previous run does not leak": ['print("only this")', ""],
  "read all of stdin": ["import sys\nprint(repr(sys.stdin.read()))", "a\nb\n"],
  "read all of stdin, no newline at the end": ["import sys\nprint(repr(sys.stdin.read()))", "a b"],
  "readlines": ["import sys\nprint(sys.stdin.readlines())", "a\nb"],
  "two input() calls": ['print(input() + "|" + input())', "x\ny"],
  "input() after the end of the input": ['print(input())\nprint(input())', "only"],
  "a variable is not left over (set)": ["leftover = 5", ""],
  "a variable is not left over (use)": ["print(leftover)", ""],
  "error after some output": ['print("partial")\nraise ValueError("boom")', ""],
  "an undefined name": ["print(undefined_name)", ""],
  "text from stderr stays out of stdout": ['import sys\nprint("e", file=sys.stderr)\nprint("o")', ""],
  "number formatting": ['print(0.1 + 0.2, 10 / 3, round(2.5), round(3.5), 2 ** 200)\nprint(f"{3.14159:.2f} {1234567:,}")', ""],
  "match statement": ['x = 3\nmatch x:\n    case 3:\n        print("three")', ""],
  "non-ASCII text": ['print("caf\\u00e9 \\u2713")', ""],
  "carriage return in the input": ["print(repr(input()))", "ab\r"],
  "trailing spaces and blank lines": ['print("a   ")\nprint()\nprint()', ""],
};
for (const [name, [code, stdin]] of Object.entries(PROBES)) {
  const browser = await runOnPyodide(pyodide, { code, stdin });
  const server = runOnServerStandIn(code, stdin);
  if (!same(browser.stdout, server.stdout))
    problems.push(`probe "${name}": browser printed ${JSON.stringify(browser.stdout)}, server printed ${JSON.stringify(server.stdout)}`);
  if (lastLine(browser.stderr) !== lastLine(server.stderr))
    console.log(`  note, "${name}": the error text differs (browser ${JSON.stringify(lastLine(browser.stderr))}, server ${JSON.stringify(lastLine(server.stderr))})`);
}
console.log(`Edge-case programs: ${Object.keys(PROBES).length} compared.`);

// 3. A program that never ends must be stopped, whatever it is wrapped in, with
// the output printed so far kept and a readable message, and the next run must
// work. (A bare "except:" used to let a loop dodge the limit.)
const ENDLESS = {
  "plain loop": 'print("before")\nwhile True:\n    pass',
  "loop inside a function": 'print("before")\ndef f():\n    while True:\n        x = 1\nf()',
  "read until the end, bare except": 'print("before")\nwhile True:\n    try:\n        x = int(input())\n    except:\n        pass',
  "except BaseException": 'print("before")\nwhile True:\n    try:\n        x = int(input())\n    except BaseException:\n        pass',
  "except Exception": 'print("before")\nwhile True:\n    try:\n        x = int(input())\n    except Exception:\n        pass',
  "nested bare excepts": 'print("before")\nwhile True:\n    try:\n        while True:\n            try:\n                pass\n            except:\n                pass\n    except:\n        pass',
  "try with finally": 'print("before")\nwhile True:\n    try:\n        pass\n    finally:\n        pass',
};
for (const [name, code] of Object.entries(ENDLESS)) {
  const r = await runOnPyodide(pyodide, { code, stdin: "", timeLimitMs: 1000 });
  if (!r.timedOut || r.stdout !== "before" || !r.stderr.includes("Time limit exceeded: your program was still running"))
    problems.push(`endless loop "${name}": expected a stop after printing "before" with a readable message, got ${JSON.stringify(r)}`);
  const after = await runOnPyodide(pyodide, { code: 'print("fine")', stdin: "" });
  if (after.stdout !== "fine") problems.push(`run after the stop of "${name}" printed ${JSON.stringify(after.stdout)}`);
}
console.log(`Endless loops: ${Object.keys(ENDLESS).length} shapes stopped, and the next run works each time.`);

if (problems.length) {
  console.log(`\n${problems.length} difference(s):`);
  for (const p of problems) console.log(` - ${p}`);
  process.exit(1);
}
console.log("\nSame result in both places.");
