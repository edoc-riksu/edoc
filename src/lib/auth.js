import crypto from "crypto";

const SCRYPT_KEYLEN = 64;

// `salt:hash`, both hex. scrypt is in Node's built-in crypto, so this needs
// no extra dependency (bcrypt/argon2) for a one-table, Day-3-scoped login.
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = (stored || "").split(":");
  if (!salt || !hash) return false;

  const hashBuffer = Buffer.from(hash, "hex");
  const candidateBuffer = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  if (hashBuffer.length !== candidateBuffer.length) return false;
  return crypto.timingSafeEqual(hashBuffer, candidateBuffer);
}
