// Plan Day 32. Fails (exit 1) if any Prisma migration can destroy or rewrite
// saved player data without being marked as reviewed. Needs no database. CI
// enforces the same rule through npm test (migrationSafety.test.js); this
// script prints the readable report:
//
//   node scripts/check-migration-safety.mjs
//
// See DEPLOYMENT.md section 12 for how to write a migration that passes.

import { readdirSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { checkMigrations } from "../src/lib/server/migrationSafety.mjs";

const MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), "..", "prisma", "migrations");

const migrations = readdirSync(MIGRATIONS, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(MIGRATIONS, d.name, "migration.sql")))
  .map((d) => ({ name: d.name, sql: readFileSync(join(MIGRATIONS, d.name, "migration.sql"), "utf8") }))
  .sort((a, b) => a.name.localeCompare(b.name));

const { ok, results } = checkMigrations(migrations);

for (const r of results) {
  if (r.findings.length === 0) {
    console.log(`OK        ${r.name}`);
    continue;
  }
  const accepted = r.reviewed && r.reviewNote;
  console.log(`${accepted ? "REVIEWED" : "UNSAFE  "}  ${r.name}${accepted ? `  (${r.reviewNote})` : ""}`);
  for (const f of r.findings) console.log(`            line ${f.line}: ${f.rule} - ${f.why}\n              ${f.statement}`);
}

if (!ok) {
  console.error(
    "\nA migration can lose or rewrite player data. Make it additive, or add\n" +
      "  -- migration-safety: reviewed <why, and the backup branch you made>\n" +
      "after following DEPLOYMENT.md section 12."
  );
  process.exit(1);
}
console.log(`\n${results.length} migrations checked, none unsafe.`);
