// Reads Backend 1's encounter files for the module/encounter index
// (scripts/seed.mjs). Kept apart from the seed script so it can be tested
// without a database.
//
// Two rules the backend follows, and the index must follow too:
//  - the highest version file wins (v10 beats v9 and v2, compared as numbers);
//  - play order is the encounter file's own `order` field, not its id.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const VERSION_FILE = /^v(\d+)\.json$/;

export function latestVersionFile(fileNames) {
  let best = null;
  for (const name of fileNames) {
    const match = VERSION_FILE.exec(name);
    if (!match) continue;
    const version = Number(match[1]);
    if (!best || version > best.version) best = { name, version };
  }
  return best ? best.name : null;
}

// The latest version of every encounter of one language.
export function loadEncounters(encountersRoot, language) {
  const dir = join(encountersRoot, language);
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = latestVersionFile(readdirSync(join(dir, entry.name)));
    if (!file) continue;
    found.push(JSON.parse(readFileSync(join(dir, entry.name, file), "utf8")));
  }
  return found;
}

// Encounters of one module in play order. The frontend counts from 0
// ("Encounter " + (order + 1)), so the stored order is the position in this
// list, which stays correct even when the files' own orders have gaps.
export function inPlayOrder(moduleEncounters) {
  return [...moduleEncounters].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}
