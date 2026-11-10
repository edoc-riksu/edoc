// Plan Day 19. After restoring a Neon branch (DEPLOYMENT.md section 11),
// checks the restore really holds the data: row counts per table, compared
// with the database it was restored from. Read-only on both databases.
//
//   SOURCE_DATABASE_URL="postgres://...staging..." \
//   RESTORED_DATABASE_URL="postgres://...restore-test..." \
//   node scripts/check-restore.mjs [--exact]
//
// Use the DIRECT (non-pooled) connection strings. --exact means the restore
// should be identical (a restore to "now"); without it, a restore to an
// earlier point may have fewer rows, but never more.

import { PrismaClient } from "@prisma/client";
import { TABLES, compareCounts } from "../src/lib/server/restoreCheck.mjs";

const source = process.env.SOURCE_DATABASE_URL;
const restored = process.env.RESTORED_DATABASE_URL;
const exact = process.argv.includes("--exact");

if (!source || !restored) {
  console.error("Set SOURCE_DATABASE_URL and RESTORED_DATABASE_URL (direct connection strings).");
  process.exit(2);
}
if (source === restored) {
  console.error("SOURCE_DATABASE_URL and RESTORED_DATABASE_URL are the same database.");
  process.exit(2);
}

async function counts(url) {
  const client = new PrismaClient({ datasourceUrl: url });
  const result = {};
  let latestAttempt = null;
  try {
    for (const table of TABLES) {
      try {
        // Table names come from the fixed TABLES list, never from input.
        const [{ n }] = await client.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM "${table}"`);
        result[table] = n;
      } catch {
        result[table] = null;
      }
    }
    try {
      const [{ latest }] = await client.$queryRawUnsafe(`SELECT MAX("createdAt") AS latest FROM "attempts"`);
      latestAttempt = latest;
    } catch {
      latestAttempt = null;
    }
  } finally {
    await client.$disconnect();
  }
  return { result, latestAttempt };
}

const [s, r] = await Promise.all([counts(source), counts(restored)]);
const { ok, rows } = compareCounts(s.result, r.result, { exact });

console.log("table        source  restored  status");
for (const row of rows) {
  console.log(`${row.table.padEnd(12)} ${String(row.source ?? "-").padStart(6)}  ${String(row.restored ?? "-").padStart(8)}  ${row.status}`);
}
console.log(`\nlatest attempt: source ${s.latestAttempt?.toISOString?.() ?? "-"}, restored ${r.latestAttempt?.toISOString?.() ?? "-"}`);
console.log(ok ? "\nRestore check passed." : "\nRestore check FAILED.");
process.exit(ok ? 0 : 1);
