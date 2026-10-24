// Seeds the module/encounter index from Backend 1's real encounter
// files (../backend/encounters/<language>/<id>/v1.json) - never from
// made-up data, so the index can't drift from what the execution
// service actually serves. Safe to re-run: upserts everything.
//
// Usage: DATABASE_URL=... node scripts/seed.mjs

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENCOUNTERS_ROOT = join(__dirname, "..", "..", "backend", "encounters");

// Only "python" has real encounters so far (plan: one playable planet in
// the first two months). Add more entries here as other languages land.
const LANGUAGE_TO_PLANET = { python: "python" };

function loadEncounters(language) {
  const dir = join(ENCOUNTERS_ROOT, language);
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const raw = readFileSync(join(dir, entry.name, "v1.json"), "utf8");
      return JSON.parse(raw);
    });
}

async function main() {
  const db = new PrismaClient();
  try {
    for (const [language, planetId] of Object.entries(LANGUAGE_TO_PLANET)) {
      const encounters = loadEncounters(language);
      const byModule = new Map();
      for (const e of encounters) {
        if (!byModule.has(e.module)) byModule.set(e.module, []);
        byModule.get(e.module).push(e);
      }

      let moduleOrder = 0;
      for (const [slug, moduleEncounters] of byModule) {
        const module_ = await db.module.upsert({
          where: { slug },
          update: { planetId, title: titleCase(slug) },
          create: { slug, planetId, title: titleCase(slug), order: moduleOrder }
        });
        moduleOrder += 1;

        moduleEncounters.sort((a, b) => a.id.localeCompare(b.id));
        for (const [order, e] of moduleEncounters.entries()) {
          await db.encounter.upsert({
            where: { id: e.id },
            update: {
              moduleId: module_.id,
              order,
              difficulty: e.difficulty,
              concepts: e.concepts,
              title: e.title
            },
            create: {
              id: e.id,
              moduleId: module_.id,
              order,
              difficulty: e.difficulty,
              concepts: e.concepts,
              title: e.title
            }
          });
        }
        console.log(`Seeded module "${slug}" with ${moduleEncounters.length} encounter(s).`);
      }
    }
  } finally {
    await db.$disconnect();
  }
}

function titleCase(slug) {
  return slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
