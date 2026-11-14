/**
 * Plan Day 19: is a restored database a faithful copy? Compares row counts
 * per table between the live database and a restore of it. Plain Node so
 * scripts/check-restore.mjs can use it; the counting happens in the script.
 */

// Player data first: losing any of these loses someone's progress.
export const TABLES = ["users", "progress", "attempts", "modules", "encounters"];

/**
 * `source` and `restored` map table name -> row count (null if the table is
 * missing). A restore taken from an earlier point in time may legitimately
 * have fewer rows, never more; pass `exact: true` when it should match.
 */
export function compareCounts(source, restored, { exact = false } = {}) {
  const rows = TABLES.map((table) => {
    const s = source[table] ?? null;
    const r = restored[table] ?? null;
    let status;
    if (s === null) status = "missing in source";
    else if (r === null) status = "missing in restore";
    else if (r === s) status = "match";
    else if (r > s) status = "more rows than source";
    else status = exact ? "fewer rows" : "fewer rows (older restore point)";
    const ok = status === "match" || (!exact && status === "fewer rows (older restore point)");
    return { table, source: s, restored: r, status, ok };
  });
  return { ok: rows.every((row) => row.ok), rows };
}
