// Seeds the module/encounter index from Backend 1's real encounter
// files (../backend/encounters/<language>/<id>/v<n>.json, highest version) - never from
// made-up data, so the index can't drift from what the execution
// service actually serves. Safe to re-run: upserts everything.
//
// Usage: DATABASE_URL=... node scripts/seed.mjs

import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { loadEncounters, modulesInOrder } from "../src/lib/server/encounterFiles.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENCOUNTERS_ROOT = join(__dirname, "..", "..", "backend", "encounters");

// Only "python" has real encounters so far (plan: one playable planet in
// the first two months). Add more entries here as other languages land.
const LANGUAGE_TO_PLANET = { python: "python" };

async function main() {
  const db = new PrismaClient();
  try {
    for (const [language, planetId] of Object.entries(LANGUAGE_TO_PLANET)) {
      const encounters = loadEncounters(ENCOUNTERS_ROOT, language);

      for (const { slug, order: moduleOrder, encounters: moduleEncounters } of modulesInOrder(encounters)) {
        // The order is written on update too, not only on create: otherwise a
        // database seeded before a module reshuffle keeps the old unlock order.
        const module_ = await db.module.upsert({
          where: { slug },
          update: { planetId, title: titleCase(slug), order: moduleOrder },
          create: { slug, planetId, title: titleCase(slug), order: moduleOrder }
        });

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
