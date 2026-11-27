import { createHash, randomInt } from "node:crypto";

/**
 * Plan Day 52: the invite gate for the closed test. Plain Node (.mjs) so the
 * sign-up route and scripts/invites.mjs share one definition of what a code
 * looks like and when it is still good.
 *
 * A code looks like EDOC-7KQ4-M2XH-9RTP: 12 characters from a 31-letter
 * alphabet with no look-alikes (no 0/O, 1/I/L), about 59 bits of chance.
 * Sign-up is rate limited per IP (abuseLimits.js), so guessing one is not
 * practical. Only its SHA-256 hash is stored.
 */

export const INVITE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 12;
const PREFIX = "EDOC";

export const INVITE_MESSAGES = {
  missing: "Enter the invite code from your invite.",
  invalid: "That invite code isn't valid. Check it against your invite.",
  used_up: "That invite code has already been used.",
  expired: "That invite code has expired. Ask the edoc team for a new one.",
  revoked: "That invite code is no longer valid. Ask the edoc team for a new one."
};

/** A new random code, formatted for people to read and type. */
export function generateInviteCode(random = randomInt) {
  let raw = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) raw += INVITE_ALPHABET[random(INVITE_ALPHABET.length)];
  return formatInviteCode(raw);
}

export function formatInviteCode(raw) {
  return `${PREFIX}-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

/**
 * The 12 code characters from whatever the player typed or pasted, or "" if
 * it can't be a code. Case, spaces, dashes and the EDOC prefix don't matter.
 */
export function normalizeInviteCode(input) {
  if (typeof input !== "string" || input.length > 64) return "";
  let s = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (s.length === CODE_LENGTH + PREFIX.length && s.startsWith(PREFIX)) s = s.slice(PREFIX.length);
  if (s.length !== CODE_LENGTH) return "";
  for (const ch of s) if (!INVITE_ALPHABET.includes(ch)) return "";
  return s;
}

/** What is stored and looked up: never the code itself. */
export function hashInviteCode(normalized) {
  return createHash("sha256").update(normalized).digest("hex");
}

/**
 * Whether sign-up needs an invite. INVITE_ONLY=true/false decides; when it is
 * not set, production is invite-only and every other environment is open, so
 * forgetting the variable can't open production to everyone.
 */
export function isInviteOnly(env = process.env) {
  const flag = String(env.INVITE_ONLY ?? "").trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(flag)) return true;
  if (["false", "0", "no", "off"].includes(flag)) return false;
  return (env.APP_ENV || "development") === "production";
}

/** "ok", or why the invite row can't be used: unknown, revoked, expired, used_up. */
export function inviteState(invite, now = new Date()) {
  if (!invite) return "unknown";
  if (invite.revokedAt) return "revoked";
  if (invite.expiresAt && new Date(invite.expiresAt) <= now) return "expired";
  if (invite.uses >= invite.maxUses) return "used_up";
  return "ok";
}

/** The sign-up form message for an invite state. */
export function inviteMessage(state) {
  if (state === "unknown") return INVITE_MESSAGES.invalid;
  return INVITE_MESSAGES[state] || INVITE_MESSAGES.invalid;
}

/** Read-only check of a normalized code against the invites table. */
export async function checkInvite(db, normalized, now = new Date()) {
  const invite = await db.invite.findUnique({ where: { codeHash: hashInviteCode(normalized) } });
  return { state: inviteState(invite, now), invite };
}

/**
 * Uses up one redemption of the code, atomically: two sign-ups racing for the
 * last use can't both get it. Returns the invite id, or null if the code was
 * no good by the time it got here. Call inside the transaction that creates
 * the account, so a failed sign-up gives the use back.
 */
export async function redeemInvite(tx, normalized) {
  const rows = await tx.$queryRaw`
    UPDATE "invites" SET "uses" = "uses" + 1
    WHERE "codeHash" = ${hashInviteCode(normalized)}
      AND "revokedAt" IS NULL
      AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
      AND "uses" < "maxUses"
    RETURNING "id"`;
  return rows[0]?.id ?? null;
}
