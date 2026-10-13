/**
 * 🪪 CALLSIGN RULES — shared by the client (BiometricLinkModal) and the
 * server (auth API routes) so "what counts as a valid callsign/password"
 * can never drift between the two. No Node-only APIs here on purpose.
 */
export function normalizeCallsign(raw) {
  const clean = (raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")
    .slice(0, 18);
  return clean || null;
}

export function isValidPassword(password) {
  return typeof password === "string" && password.length >= 6 && password.length <= 72;
}

export function isValidName(name) {
  return typeof name === "string" && name.trim().length >= 1 && name.trim().length <= 60;
}

// Deliberately a loose "does this look like an email" check, not a strict
// RFC 5322 parse — real signup forms reject on deliverability (a bounced
// verification email), not on a regex, and that's a later, backend-only
// concern once email verification itself exists.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email) {
  return typeof email === "string" && email.trim().length <= 254 && EMAIL_RE.test(email.trim());
}

export const EXPERIENCE_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];
export const SPECIALIZATIONS = ["GENERAL", "COMBAT", "NAVIGATION", "ENGINEERING"];
