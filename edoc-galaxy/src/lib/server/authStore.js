import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { hashPassword, verifyPassword } from "./passwordHash";
import { normalizeCallsign, normalizeEmail } from "../authValidation";

// Two storage backends, picked at import time:
//
// 1. Upstash Redis over its REST API (no SDK needed, just fetch), when
//    KV_REST_API_URL/TOKEN or UPSTASH_REDIS_REST_URL/TOKEN are set — these
//    are the env vars Vercel injects automatically once a Redis/KV storage
//    resource is created and connected to the project. This is real,
//    shared, persistent storage: every invocation (any instance, any
//    region) reads and writes the same key.
// 2. A JSON-file mock store, used only when those env vars are absent
//    (plain `next dev` locally). Vercel's serverless functions have a
//    read-only filesystem everywhere except /tmp, and /tmp is NOT shared
//    or guaranteed to persist across invocations — so without a Redis
//    resource connected, accounts created in production can silently
//    disappear before the next sign-in. If you're seeing "password
//    doesn't match" for a real, correctly-typed password right after
//    signing up, this is almost always why: connect a KV/Redis storage
//    resource to the Vercel project and redeploy.
const UPSTASH_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const HAS_REMOTE_STORE = Boolean(UPSTASH_URL && UPSTASH_TOKEN);
const USERS_KEY = "edoc-galaxy:auth-users";

if (process.env.VERCEL && !HAS_REMOTE_STORE) {
  console.warn(
    "[authStore] No KV_REST_API_URL/TOKEN (or UPSTASH_REDIS_REST_URL/TOKEN) found — " +
      "falling back to a /tmp file store that Vercel does not share or persist across " +
      "invocations. Connect a Redis/KV storage resource to this project to fix sign-in " +
      "reliability in production."
  );
}

const DATA_DIR = process.env.VERCEL ? path.join(tmpdir(), "edoc-galaxy-auth") : path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "auth-users.json");

async function upstashCommand(command) {
  const res = await fetch(UPSTASH_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command)
  });
  if (!res.ok) throw new Error(`Upstash command failed with status ${res.status}`);
  const data = await res.json();
  return data.result;
}

function readUsersFromFile() {
  if (!existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(readFileSync(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}

function writeUsersToFile(users) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(users, null, 2), "utf8");
}

async function readUsers() {
  if (!HAS_REMOTE_STORE) return readUsersFromFile();
  const raw = await upstashCommand(["GET", USERS_KEY]);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeUsers(users) {
  if (!HAS_REMOTE_STORE) return writeUsersToFile(users);
  await upstashCommand(["SET", USERS_KEY, JSON.stringify(users)]);
}

export async function findByCallsign(callsign) {
  const target = normalizeCallsign(callsign).toLowerCase();
  const users = await readUsers();
  return users.find((u) => u.callsign.toLowerCase() === target) || null;
}

export async function findByEmail(email) {
  const target = normalizeEmail(email);
  const users = await readUsers();
  return users.find((u) => u.email === target) || null;
}

export async function createUser({ callsign, email, password }) {
  const users = await readUsers();
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
  await writeUsers(users);
  return toPublicUser(user);
}

export async function verifyCredentials(email, password) {
  const user = await findByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) return null;
  return toPublicUser(user);
}

export function toPublicUser(user) {
  return { callsign: user.callsign, email: user.email, createdAt: user.createdAt };
}

/** Up to `count` unused variants of a taken callsign, for the signup form's
 *  suggestion chips. */
export async function suggestCallsigns(base, count = 2) {
  const users = await readUsers();
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
