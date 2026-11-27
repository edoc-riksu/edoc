// Plan Day 50: check production's environment variables before deploying.
// Prints what is wrong with each one, never the values themselves.
//
// Pull the values Vercel will use, check them, then delete the file:
//   npx vercel env pull .env.production.check --environment=production
//   node scripts/check-production-env.mjs .env.production.check
//   del .env.production.check        (rm on macOS/Linux; never commit it)
//
// Optional: also pass staging's values to make sure production doesn't share
// its database or AUTH_SECRET:
//   node scripts/check-production-env.mjs .env.production.check --staging .env.staging.check
//
// With no file, it checks the current process environment.
// Exit code: 0 ready, 1 something must be fixed, 2 warnings only.

import { readFileSync } from "node:fs";
import { checkProductionConfig, parseEnvFile } from "../src/lib/server/productionConfig.mjs";

const argv = process.argv.slice(2);
const stagingAt = argv.indexOf("--staging");
const stagingFile = stagingAt >= 0 ? argv[stagingAt + 1] : null;
const file = argv.find((a, i) => !a.startsWith("--") && i !== stagingAt + 1);

const env = file ? parseEnvFile(readFileSync(file, "utf8")) : { ...process.env };
if (stagingFile) {
  const staging = parseEnvFile(readFileSync(stagingFile, "utf8"));
  env.STAGING_DATABASE_URL = staging.DATABASE_URL;
  env.STAGING_AUTH_SECRET = staging.AUTH_SECRET;
}

const findings = checkProductionConfig(env);
console.log(`Checked ${file || "the current environment"}${stagingFile ? ` against ${stagingFile}` : ""}.\n`);
if (findings.length === 0) {
  console.log("READY: every production variable looks right.");
  process.exit(0);
}
for (const f of findings) console.log(`${f.level === "error" ? "FIX " : "WARN"}  ${f.name}: ${f.problem}`);
const errors = findings.filter((f) => f.level === "error").length;
console.log(`\n${errors ? "NOT READY" : "READY WITH WARNINGS"}: ${errors} to fix, ${findings.length - errors} warnings.`);
process.exit(errors ? 1 : 2);
