/**
 * 🧪 LESSON TESTS — real, executable test specs for the Non-Negotiables
 * validator (Phase 05, extended to TypeScript in the "Beyond The Plan"
 * follow-up). Keyed by sector id, then lesson index (matching
 * planetarySystem.js's `lessons` array 1:1). Python, JavaScript and
 * TypeScript carry real tests; Go/Rust/SQL don't have a client-side
 * runtime available yet and keep the legacy substring check (see
 * submissionValidator.js), same disclosed, phased scope the roadmap calls
 * out.
 *
 * JS test shape: { description, check, call? } — `check` is a real JS
 * boolean expression evaluated in the sandboxed iframe right after the
 * pilot's code runs; `call` (optional) is executed first, so a thrown
 * error surfaces as a real failure rather than a silent false.
 *
 * PY test shape: { description, setup?, call?, check } — `setup` is real
 * Python run before the pilot's code (fixtures), `call` after it (e.g.
 * actually instantiating a class), `check` a real boolean expression.
 * Each PY test gets a fresh namespace, so lessons can run multiple
 * independent cases against the same submission.
 *
 * TS test shape: { kind: "ast", description, astCheck(sourceFile, ts) } or
 * { kind: "runtime", description, check, call? }. Half of what a TS lesson
 * teaches (interfaces, type aliases, generic signatures, `unknown` catch
 * types) is erased entirely at compile time — nothing left to execute —
 * so "ast" tests inspect the real parsed TypeScript AST instead of source
 * text, and "runtime" tests run the transpiled JS through the same
 * sandboxed iframe the JS lessons use. See tsSandbox.js.
 */

export const LESSON_TESTS = {
  "Python Engine Core": [
    // 1. Propulsion Variables
    [{ description: "thrustMultiplier is defined and equals 10", check: "'thrustMultiplier' in globals() and thrustMultiplier == 10" }],
    // 2. Conditional Manifolds
    [
      { description: "fuelLevel 60 (above 50) → launch is True", setup: "fuelLevel = 60", check: "'launch' in globals() and launch == True" },
      { description: "fuelLevel 30 (below 50) → launch is False", setup: "fuelLevel = 30", check: "'launch' in globals() and launch == False" }
    ],
    // 3. Ignition Override
    [
      { description: "ignite is defined and callable", check: "'ignite' in globals() and callable(ignite)" },
      { description: "calling ignite() runs without raising", call: "ignite()", check: "True" }
    ],
    // 4. Cargo Manifest Lists
    [{ description: "cargoHold is an empty list", check: "'cargoHold' in globals() and cargoHold == []" }],
    // 5. Reactor Failsafes
    [
      {
        description: "risky_ignite()'s exception is caught, not raised",
        setup: "def risky_ignite():\n    raise Exception('reactor spike')\ncaught = False",
        check: "'caught' in globals() and caught == True"
      }
    ],
    // 6. Ship Class Blueprints
    [
      { description: "Ship is defined as a class", check: "'Ship' in globals() and isinstance(Ship, type)" },
      { description: "Ship() can be instantiated", call: "__probe = Ship()", check: "__probe is not None" }
    ],
    // 7. Applied: Flight Log Archive
    [{ description: "flightlog.txt was actually written to disk", check: "os.path.exists('flightlog.txt')" }],
    // 8. Applied: Fuel Cell Filter
    [
      {
        description: "charged_cells keeps only the charged fuel cells, in order",
        setup: "from types import SimpleNamespace\ncells = [SimpleNamespace(charged=True, id=1), SimpleNamespace(charged=False, id=2), SimpleNamespace(charged=True, id=3)]",
        check: "'charged_cells' in globals() and [c.id for c in charged_cells] == [1, 3]"
      }
    ]
  ],

  "JavaScript Engine": [
    // 1. DOM Interception
    [
      {
        description: "reactorPanel is the real #reactor element",
        check: "typeof reactorPanel !== 'undefined' && reactorPanel !== null && reactorPanel.id === 'reactor'"
      }
    ],
    // 2. Asynchronous Volcanic Core
    [
      { description: "fuelLink is declared as an async function", check: "typeof fuelLink === 'function' && fuelLink.constructor.name === 'AsyncFunction'" },
      { description: "calling fuelLink() returns a real Promise", check: "typeof fuelLink().then === 'function'" }
    ],
    // 3. Event Listeners
    [
      {
        description: "a click listener was armed on #eject-lever",
        check: "window.__addEventListenerCalls.some((c) => c.type === 'click' && c.target && c.target.id === 'eject-lever')"
      }
    ],
    // 4. Crew Roster Arrays
    [{ description: "crew is an empty array", check: "typeof crew !== 'undefined' && Array.isArray(crew) && crew.length === 0" }],
    // 5. Reactor Failsafes
    [
      {
        description: "riskyIgnite()'s throw is caught, not propagated",
        check: "typeof caught !== 'undefined' && caught === true"
      }
    ],
    // 6. Ship Class Blueprints
    [
      { description: "Ship is declared as a class", check: "typeof Ship === 'function' && /^class[\\s{]/.test(Ship.toString())" },
      { description: "new Ship() can be instantiated", check: "(new Ship()) !== undefined" }
    ],
    // 7. Applied: Fuel Cell Filter
    [
      {
        description: "outputs holds only the charged cells' output levels, in order",
        check: "typeof outputs !== 'undefined' && JSON.stringify(outputs) === JSON.stringify([5, 9])"
      }
    ],
    // 8. Applied: Telemetry Fetch
    [
      {
        description: "fetch was called against a telemetry endpoint",
        check: "window.__fetchCalls.length > 0 && String(window.__fetchCalls[0][0]).includes('telemetry')"
      }
    ]
  ],

  "TypeScript Array": [
    // 1. Interface Bounds
    [
      {
        kind: "ast",
        description: "declares an interface named Pilot",
        astCheck: (sf, ts) => {
          let found = false;
          const visit = (n) => {
            if (ts.isInterfaceDeclaration(n) && n.name.text === "Pilot") found = true;
            ts.forEachChild(n, visit);
          };
          visit(sf);
          return found;
        }
      }
    ],
    // 2. Generics Core
    [
      {
        kind: "ast",
        description: "wrap is declared as a generic function with a type parameter",
        astCheck: (sf, ts) => {
          let found = false;
          const visit = (n) => {
            if (ts.isFunctionDeclaration(n) && n.name && n.name.text === "wrap" && n.typeParameters && n.typeParameters.length > 0 && n.parameters.length >= 1) {
              found = true;
            }
            ts.forEachChild(n, visit);
          };
          visit(sf);
          return found;
        }
      },
      { kind: "runtime", description: "wrap is callable at runtime", check: "typeof wrap === 'function'" }
    ],
    // 3. Union Matrices
    [
      {
        kind: "ast",
        description: 'Mode is a union type of "warp" and "cruise"',
        astCheck: (sf, ts) => {
          let ok = false;
          const visit = (n) => {
            if (ts.isTypeAliasDeclaration(n) && n.name.text === "Mode" && ts.isUnionTypeNode(n.type)) {
              const texts = n.type.types.map((t) => (ts.isLiteralTypeNode(t) && ts.isStringLiteral(t.literal) ? t.literal.text : null));
              if (texts.includes("warp") && texts.includes("cruise")) ok = true;
            }
            ts.forEachChild(n, visit);
          };
          visit(sf);
          return ok;
        }
      }
    ],
    // 4. Typed Fuel Variables
    [
      {
        kind: "ast",
        description: "fuelLevel has an explicit ': number' type annotation",
        astCheck: (sf, ts) => {
          let ok = false;
          const visit = (n) => {
            if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === "fuelLevel" && n.type && n.type.kind === ts.SyntaxKind.NumberKeyword) ok = true;
            ts.forEachChild(n, visit);
          };
          visit(sf);
          return ok;
        }
      },
      { kind: "runtime", description: "fuelLevel equals 100 at runtime", check: "typeof fuelLevel !== 'undefined' && fuelLevel === 100" }
    ],
    // 5. Narrowed Ignition Checks
    [
      {
        kind: "ast",
        description: 'narrows with a real "typeof key === string" check',
        astCheck: (sf, ts) => {
          const isTypeofKey = (n) => ts.isTypeOfExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "key";
          const isStringLit = (n) => ts.isStringLiteral(n) && n.text === "string";
          let ok = false;
          const visit = (n) => {
            if (ts.isIfStatement(n) && ts.isBinaryExpression(n.expression)) {
              const { left, right, operatorToken } = n.expression;
              const eq = operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken || operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken;
              if (eq && ((isTypeofKey(left) && isStringLit(right)) || (isTypeofKey(right) && isStringLit(left)))) ok = true;
            }
            ts.forEachChild(n, visit);
          };
          visit(sf);
          return ok;
        }
      },
      { kind: "runtime", description: "ignitionArmed is true after the narrowed check runs", check: "ignitionArmed === true" }
    ],
    // 6. Typed Reactor Failsafes
    [
      {
        kind: "ast",
        description: "the catch clause types the error as 'unknown'",
        astCheck: (sf, ts) => {
          let ok = false;
          const visit = (n) => {
            if (ts.isCatchClause(n) && n.variableDeclaration && n.variableDeclaration.type && n.variableDeclaration.type.kind === ts.SyntaxKind.UnknownKeyword) ok = true;
            ts.forEachChild(n, visit);
          };
          visit(sf);
          return ok;
        }
      },
      { kind: "runtime", description: "caught is true after riskyIgnite()'s throw is handled", check: "caught === true" }
    ],
    // 7. Applied: Cargo Enum Manifest
    [
      {
        kind: "ast",
        description: "declares a real CargoBay enum with Fuel, Crew, Freight",
        astCheck: (sf, ts) => {
          let ok = false;
          const visit = (n) => {
            if (ts.isEnumDeclaration(n) && n.name.text === "CargoBay") {
              const names = n.members.map((m) => (m.name && ts.isIdentifier(m.name) ? m.name.text : null));
              if (["Fuel", "Crew", "Freight"].every((x) => names.includes(x))) ok = true;
            }
            ts.forEachChild(n, visit);
          };
          visit(sf);
          return ok;
        }
      },
      {
        kind: "runtime",
        description: "CargoBay.Fuel/Crew/Freight resolve to 0/1/2 at runtime",
        check: "typeof CargoBay !== 'undefined' && CargoBay.Fuel === 0 && CargoBay.Crew === 1 && CargoBay.Freight === 2"
      }
    ],
    // 8. Applied: Partial Ship Config
    [
      {
        kind: "ast",
        description: "patch takes a Partial<ShipConfig> parameter",
        astCheck: (sf, ts) => {
          let ok = false;
          const visit = (n) => {
            if (ts.isFunctionDeclaration(n) && n.name && n.name.text === "patch" && n.parameters.length >= 1) {
              const p = n.parameters[0];
              if (p.type && ts.isTypeReferenceNode(p.type) && ts.isIdentifier(p.type.typeName) && p.type.typeName.text === "Partial") {
                const args = p.type.typeArguments;
                if (args && args.length === 1 && ts.isTypeReferenceNode(args[0]) && ts.isIdentifier(args[0].typeName) && args[0].typeName.text === "ShipConfig") ok = true;
              }
            }
            ts.forEachChild(n, visit);
          };
          visit(sf);
          return ok;
        }
      },
      { kind: "runtime", description: "patch is declared as a callable function", check: "typeof patch === 'function'" }
    ]
  ]
};

// Fixtures + spies each JS lesson needs, run BEFORE the pilot's code in
// the same sandboxed scope. Kept lesson-specific (rather than always-on)
// so a lesson's harness never leaks state into an unrelated one.
export const JS_HARNESS_SETUP = {
  "JavaScript Engine": [
    'document.body.innerHTML = \'<div id="reactor"></div>\';',
    "",
    'document.body.innerHTML = \'<button id="eject-lever"></button>\'; function eject(){ window.__ejected = true; }',
    "",
    "function riskyIgnite(){ throw new Error('reactor spike'); } var caught = false;",
    "",
    "var cells = [{charged:true,output:5},{charged:false,output:2},{charged:true,output:9}];",
    ""
  ]
};

// TypeScript-only fixtures (types the pilot's own annotations reference,
// e.g. a ShipConfig interface for the Partial<ShipConfig> lesson) — merged
// in for the real compiler check, then erased entirely at transpile time,
// so they never leak into the runtime sandbox.
export const TS_TYPE_HARNESS = {
  "TypeScript Array": ["", "", "", "", "", "", "", "interface ShipConfig { hull: number; shields: number; callsign: string; }"]
};

// Real JS fixtures a TS lesson's transpiled code needs at runtime (spies,
// seed variables, a provided function to call) — same role as
// JS_HARNESS_SETUP, just for the lessons whose behavior survives erasure.
export const TS_RUNTIME_HARNESS = {
  "TypeScript Array": [
    "",
    "",
    "",
    "",
    'var key = "IGNITE_7"; var ignitionArmed = false;',
    "function riskyIgnite(){ throw new Error('reactor fault'); } var caught = false;",
    "",
    ""
  ]
};

export function getLessonTests(sectorId, lessonIdx) {
  return LESSON_TESTS[sectorId]?.[lessonIdx] || null;
}

export function getJsHarnessSetup(sectorId, lessonIdx) {
  return JS_HARNESS_SETUP[sectorId]?.[lessonIdx] || "";
}

export function getTsTypeHarness(sectorId, lessonIdx) {
  return TS_TYPE_HARNESS[sectorId]?.[lessonIdx] || "";
}

export function getTsRuntimeHarness(sectorId, lessonIdx) {
  return TS_RUNTIME_HARNESS[sectorId]?.[lessonIdx] || "";
}
