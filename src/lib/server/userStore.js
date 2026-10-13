import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

/**
 * 👤 USER STORE — a real persistence boundary with a deliberately fake
 * backing store. `.env.example` already stubs `DATABASE_URL` for the real
 * Postgres table Backend 2 owns (plan day 3); until that lands, this reads
 * and writes a single JSON file instead. Every other layer (API routes,
 * hashing, sessions) is the real thing and doesn't change when this file
 * is swapped for a `pg`/Prisma-backed version later — that's the point of
 * keeping storage behind this narrow findUser/createUser interface.
 *
 * Writes are serialized (see `withWriteLock` below) so two requests
 * landing in the same instant can't both read the pre-write file and
 * clobber each other — a real race two concurrent signups would otherwise
 * hit. That guarantee only holds within one Node process, though: a real
 * multi-instance deployment still needs the real database this file
 * stands in for, same as any single-file store would.
 */
const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "users.json");

// A promise chain used as a mutex — each write waits for the previous one
// to finish (success or failure) before it reads the file, so read-modify
// -write stays atomic relative to other writes from this process.
let writeQueue = Promise.resolve();
function withWriteLock(fn) {
  const result = writeQueue.then(fn, fn);
  writeQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

function readAll() {
  if (!existsSync(DATA_FILE)) return {};
  try {
    return JSON.parse(readFileSync(DATA_FILE, "utf8"));
  } catch {
    // A corrupt local dev file shouldn't crash the server — treat it as empty.
    return {};
  }
}

function writeAll(users) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(users, null, 2), "utf8");
}

export function findUser(callsign) {
  if (!callsign) return null;
  return readAll()[callsign] || null;
}

export function findUserByEmail(email) {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  return Object.values(readAll()).find((u) => u.email?.toLowerCase() === normalized) || null;
}

/**
 * Throws `CALLSIGN_TAKEN` if the callsign is already registered.
 * `profile` is the real registration data a signup form collects —
 * firstName/lastName/email/experienceLevel/specialization/acceptedTerms —
 * stored alongside the password hash, not discarded after the request.
 */
export function createUser(callsign, passwordHash, profile) {
  return withWriteLock(() => {
    const users = readAll();
    if (users[callsign]) {
      const err = new Error("CALLSIGN_TAKEN");
      err.code = "CALLSIGN_TAKEN";
      throw err;
    }
    users[callsign] = {
      callsign,
      passwordHash,
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      experienceLevel: profile.experienceLevel,
      specialization: profile.specialization,
      acceptedTermsAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    writeAll(users);
    return users[callsign];
  });
}
