import { db } from "../db";
import { hashPassword, verifyPassword } from "../auth";
import { normalizeCallsign, normalizeEmail } from "../authValidation";

// Real storage backend (Postgres via Prisma), replacing the old
// file/Redis-backed authStore.js. Same function names and same shapes as
// before on purpose, so the route handlers barely had to change.

export async function findByCallsign(callsign) {
  const target = normalizeCallsign(callsign);
  if (!target) return null;
  return db.user.findFirst({ where: { pilotCallsign: { equals: target, mode: "insensitive" } } });
}

export async function findByEmail(email) {
  const target = normalizeEmail(email);
  if (!target) return null;
  return db.user.findUnique({ where: { email: target } });
}

export async function findById(id) {
  if (!id) return null;
  return db.user.findUnique({ where: { id } });
}

export async function createUser({ callsign, email, password }) {
  const cleanCallsign = normalizeCallsign(callsign);
  const cleanEmail = normalizeEmail(email);

  try {
    const user = await db.user.create({
      data: {
        pilotCallsign: cleanCallsign,
        email: cleanEmail,
        passwordHash: hashPassword(password)
      }
    });
    return toPublicUser(user);
  } catch (error) {
    // P2002 is Prisma's unique-constraint-violation code - this is the
    // race-safe backstop behind the upfront findByCallsign/findByEmail
    // checks the routes already do (two concurrent signups for the same
    // callsign is the case this catches).
    if (error.code === "P2002") {
      const target = error.meta?.target ?? [];
      const err = new Error("Already registered");
      err.code = target.includes("pilotCallsign") ? "CALLSIGN_TAKEN" : "EMAIL_TAKEN";
      throw err;
    }
    throw error;
  }
}

export async function verifyCredentials(email, password) {
  const user = await findByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) return null;
  return toPublicUser(user);
}

export function toPublicUser(user) {
  return { id: user.id, callsign: user.pilotCallsign, email: user.email, createdAt: user.createdAt };
}

/** Up to `count` unused variants of a taken callsign, for the signup form's
 *  suggestion chips. */
export async function suggestCallsigns(base, count = 2) {
  const clean = normalizeCallsign(base).replace(/[^a-zA-Z0-9_]/g, "") || "pilot";
  const suffixes = ["_7", "_42", "_x", "99", "_pilot"];
  const suggestions = [];
  for (const suffix of suffixes) {
    if (suggestions.length >= count) break;
    const candidate = `${clean}${suffix}`.slice(0, 20);
    if (candidate.length < 3) continue;
    if (!(await findByCallsign(candidate))) suggestions.push(candidate);
  }
  return suggestions;
}
