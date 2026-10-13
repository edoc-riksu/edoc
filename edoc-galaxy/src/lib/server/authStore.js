import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { hashPassword, verifyPassword } from "./passwordHash";
import { normalizeCallsign, normalizeEmail } from "../authValidation";

// JSON-file-backed mock store. Synchronous fs calls are deliberate: this is
// a dev-only, low-concurrency store, and sync I/O makes createUser's
// read-check-write sequence race-proof with no extra locking machinery.
const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "auth-users.json");

function readUsers() {
  if (!existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(readFileSync(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}

function writeUsers(users) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(users, null, 2), "utf8");
}

export function findByCallsign(callsign) {
  const target = normalizeCallsign(callsign).toLowerCase();
  return readUsers().find((u) => u.callsign.toLowerCase() === target) || null;
}

export function findByEmail(email) {
  const target = normalizeEmail(email);
  return readUsers().find((u) => u.email === target) || null;
}

export function createUser({ callsign, email, password }) {
  const users = readUsers();
  const cleanCallsign = normalizeCallsign(callsign);
  const cleanEmail = normalizeEmail(email);

  if (users.some((u) => u.callsign.toLowerCase() === cleanCallsign.toLowerCase())) {
    const err = new Error("Callsign already registered");
    err.code = "CALLSIGN_TAKEN";
    throw err;
  }
  if (users.some((u) => u.email === cleanEmail)) {
    const err = new Error("Email already registered");
    err.code = "EMAIL_TAKEN";
    throw err;
  }

  const user = {
    callsign: cleanCallsign,
    email: cleanEmail,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString()
  };
  users.push(user);
  writeUsers(users);
  return toPublicUser(user);
}

export function verifyCredentials(email, password) {
  const user = findByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) return null;
  return toPublicUser(user);
}

export function toPublicUser(user) {
  return { callsign: user.callsign, email: user.email, createdAt: user.createdAt };
}

/** Up to `count` unused variants of a taken callsign, for the signup form's
 *  suggestion chips. */
export function suggestCallsigns(base, count = 2) {
  const users = readUsers();
  const taken = new Set(users.map((u) => u.callsign.toLowerCase()));
  const clean = normalizeCallsign(base).replace(/[^a-zA-Z0-9_]/g, "") || "pilot";
  const suggestions = [];
  const suffixes = ["_7", "_42", "_x", "99", "_pilot"];
  for (const suffix of suffixes) {
    if (suggestions.length >= count) break;
    const candidate = `${clean}${suffix}`.slice(0, 20);
    if (!taken.has(candidate.toLowerCase()) && candidate.length >= 3) suggestions.push(candidate);
  }
  return suggestions;
}
