// Plan Day 52: create, list and revoke invite codes for the closed test.
// A new code is printed once and never stored (only its hash is), so copy it
// into the tester's invite straight away. Lost codes can't be recovered:
// revoke and create a new one.
//
// Usage (use the DIRECT connection string, as for migrations):
//   DATABASE_URL=... node scripts/invites.mjs create "tester 1" ["tester 2" ...] [--uses N] [--days N]
//   DATABASE_URL=... node scripts/invites.mjs list
//   DATABASE_URL=... node scripts/invites.mjs revoke <invite id>
//
// --uses: how many accounts one code can create (default 1; e.g. 30 for a class).
// --days: the code stops working after this many days (default 14; 0 = never).
// Set SITE_URL to print a ready-to-send link, e.g. SITE_URL=https://edoc.example

import { PrismaClient } from "@prisma/client";
import { generateInviteCode, hashInviteCode, inviteState, normalizeInviteCode } from "../src/lib/server/invites.mjs";

const DAY = 24 * 60 * 60 * 1000;

export function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = { uses: 1, days: 14 };
  const positional = [];
  for (let i = 0; i < rest.length; i += 1) {
    if (rest[i] === "--uses" || rest[i] === "--days") {
      const value = Number(rest[i + 1]);
      if (!Number.isInteger(value) || value < 0 || (rest[i] === "--uses" && value < 1)) {
        throw new Error(`${rest[i]} needs a whole number${rest[i] === "--uses" ? " of 1 or more" : ""}`);
      }
      options[rest[i].slice(2)] = value;
      i += 1;
    } else {
      positional.push(rest[i]);
    }
  }
  return { command, options, positional };
}

async function create(db, labels, { uses, days }) {
  if (labels.length === 0) throw new Error('Give each invite a label, e.g. create "tester 1" "tester 2"');
  const expiresAt = days > 0 ? new Date(Date.now() + days * DAY) : null;
  const site = (process.env.SITE_URL || "").replace(/\/+$/, "");
  for (const label of labels) {
    const code = generateInviteCode();
    const invite = await db.invite.create({
      data: { codeHash: hashInviteCode(normalizeInviteCode(code)), label, maxUses: uses, expiresAt }
    });
    const link = site ? `  ${site}/signup?invite=${encodeURIComponent(code)}` : "";
    console.log(`${code}  ${label}  (id ${invite.id}, ${uses} use${uses === 1 ? "" : "s"}, ${expiresAt ? `until ${expiresAt.toISOString().slice(0, 10)}` : "no expiry"})${link}`);
  }
  console.log("\nCopy these now: the codes are not stored and can't be shown again.");
}

async function list(db) {
  const invites = await db.invite.findMany({
    orderBy: { createdAt: "asc" },
    include: { users: { select: { pilotCallsign: true, createdAt: true } } }
  });
  if (invites.length === 0) return console.log("No invites yet.");
  for (const inv of invites) {
    const who = inv.users.map((u) => u.pilotCallsign).join(", ") || "-";
    console.log(
      [inv.id, inv.label, `${inv.uses}/${inv.maxUses} used`, inviteState(inv), inv.expiresAt ? `expires ${inv.expiresAt.toISOString().slice(0, 10)}` : "no expiry", `pilots: ${who}`].join("  |  ")
    );
  }
}

async function revoke(db, ids) {
  if (ids.length === 0) throw new Error("Give the id of the invite to revoke (see list).");
  for (const id of ids) {
    await db.invite.update({ where: { id }, data: { revokedAt: new Date() } });
    console.log(`Revoked ${id}. Accounts already made with it keep working.`);
  }
}

async function main() {
  const { command, options, positional } = parseArgs(process.argv.slice(2));
  const db = new PrismaClient();
  try {
    if (command === "create") await create(db, positional, options);
    else if (command === "list") await list(db);
    else if (command === "revoke") await revoke(db, positional);
    else {
      console.log("Usage: node scripts/invites.mjs create <label...> [--uses N] [--days N] | list | revoke <id...>");
      process.exitCode = 1;
    }
  } finally {
    await db.$disconnect();
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop())) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}
