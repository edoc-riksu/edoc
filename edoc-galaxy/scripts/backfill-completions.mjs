// Plan Day 29. Creates the Completion rows for modules players finished
// before completions were recorded. Uses the same rules as the live
// recording (src/lib/server/completion.mjs), so completedAt is when the
// module was really finished. Never changes an existing row; safe to re-run.
//
//   DATABASE_URL="<direct url>" node scripts/backfill-completions.mjs          # dry run
//   DATABASE_URL="<direct url>" node scripts/backfill-completions.mjs --apply  # write

import { PrismaClient } from "@prisma/client";
import { completionSnapshot } from "../src/lib/server/completion.mjs";

const apply = process.argv.includes("--apply");
const db = new PrismaClient();

try {
  const modules = await db.module.findMany({ include: { encounters: { select: { id: true } } } });
  const users = await db.user.findMany({ select: { id: true, pilotCallsign: true } });
  let found = 0;
  let created = 0;

  for (const m of modules) {
    const encounterIds = m.encounters.map((e) => e.id);
    if (encounterIds.length === 0) continue;
    for (const u of users) {
      const attempts = await db.attempt.findMany({
        where: { userId: u.id, encounterId: { in: encounterIds } },
        select: { encounterId: true, verdict: true, hintsUsed: true, elapsedMs: true, createdAt: true }
      });
      const snapshot = completionSnapshot(encounterIds, attempts);
      if (!snapshot) continue;
      found += 1;

      const existing = await db.completion.findUnique({
        where: { userId_moduleSlug: { userId: u.id, moduleSlug: m.slug } }
      });
      if (existing) continue;

      console.log(`${apply ? "create" : "would create"}  ${u.pilotCallsign}  ${m.slug}  completed ${snapshot.completedAt.toISOString()}`);
      if (apply) {
        await db.completion.create({ data: { userId: u.id, moduleSlug: m.slug, planetId: m.planetId, ...snapshot } });
        created += 1;
      }
    }
  }

  console.log(`\n${found} completed module(s) found, ${apply ? `${created} created` : "dry run, nothing written (add --apply)"}.`);
} finally {
  await db.$disconnect();
}
