/**
 * Plan Day 32: progress data migrations made safe. Flags SQL in a Prisma
 * migration that can destroy or rewrite saved player data (drops, renames,
 * type changes, deletes, a new NOT NULL column with no default). Plain
 * Node so scripts/check-migration-safety.mjs and CI can use it without a
 * database.
 *
 * A migration that really needs one of these must say so on its own line:
 *   -- migration-safety: reviewed <why it is safe, and the backup branch used>
 * That marker turns every finding in that file into an accepted one.
 */

export const REVIEWED_MARKER = /^[ \t]*--[ \t]*migration-safety:[ \t]*reviewed\b[ \t]*(.*)$/im;

const RULES = [
  { id: "drop-table", why: "drops a table and all its rows", test: /\bDROP\s+TABLE\b/i },
  { id: "drop-column", why: "drops a column and its data", test: /\bDROP\s+COLUMN\b/i },
  { id: "drop-schema", why: "drops a whole schema", test: /\bDROP\s+SCHEMA\b/i },
  { id: "truncate", why: "empties a table", test: /\bTRUNCATE\b/i },
  { id: "delete", why: "deletes rows", test: /^\s*DELETE\s+FROM\b/i },
  { id: "update", why: "rewrites existing rows", test: /^\s*UPDATE\s+\S+\s+SET\b/i },
  { id: "rename", why: "renames a table or column, which breaks running code that uses the old name", test: /\bRENAME\b/i },
  { id: "column-type", why: "changes a column type, which can fail or lose data on existing rows", test: /\bALTER\s+COLUMN\s+\S+\s+(SET\s+DATA\s+)?TYPE\b/i },
  { id: "set-not-null", why: "makes a column required, which fails if any existing row is empty", test: /\bALTER\s+COLUMN\s+\S+\s+SET\s+NOT\s+NULL\b/i },
  {
    id: "not-null-without-default",
    why: "adds a required column with no default, which fails on a table that already has rows",
    test: (s) => /\bADD\s+COLUMN\b/i.test(s) && /\bNOT\s+NULL\b/i.test(s) && !/\bDEFAULT\b/i.test(s)
  }
];

/** SQL statements with `--` comments removed, each with the line it starts on. */
function statements(sql) {
  const out = [];
  let current = "";
  let startLine = 0;
  sql.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.replace(/--.*$/, "");
    if (!current.trim() && line.trim()) startLine = i + 1;
    current += `${line}\n`;
    if (line.includes(";")) {
      for (const part of current.split(";").slice(0, -1)) {
        if (part.trim()) out.push({ line: startLine, text: part.trim().replace(/\s+/g, " ") });
      }
      current = current.split(";").pop();
      startLine = i + 1;
    }
  });
  if (current.trim()) out.push({ line: startLine, text: current.trim().replace(/\s+/g, " ") });
  return out;
}

/** Every unsafe statement in one migration file, and whether the file marks them reviewed. */
export function checkMigrationSql(sql) {
  const findings = [];
  for (const { line, text } of statements(sql)) {
    for (const rule of RULES) {
      const hit = typeof rule.test === "function" ? rule.test(text) : rule.test.test(text);
      if (hit) findings.push({ line, rule: rule.id, why: rule.why, statement: text.slice(0, 120) });
    }
  }
  const marker = sql.match(REVIEWED_MARKER);
  return { findings, reviewed: Boolean(marker), reviewNote: marker ? marker[1].trim() : null };
}

/** Results for many migrations ({ name, sql }); `ok` is false if any finding is not reviewed. */
export function checkMigrations(migrations) {
  const results = migrations.map(({ name, sql }) => ({ name, ...checkMigrationSql(sql) }));
  return { ok: results.every((r) => r.findings.length === 0 || (r.reviewed && r.reviewNote)), results };
}
