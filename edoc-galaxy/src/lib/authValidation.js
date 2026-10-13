// Isomorphic (no Node-only APIs) — shared by both the client forms
// (on-blur validation) and the API routes (authoritative, re-validated
// server-side).
export const CALLSIGN_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 10;

export const AUTH_MESSAGES = {
  callsign: "Use 3–20 letters, numbers or underscores.",
  callsignTaken: "That callsign is taken.",
  email: "Enter a full email address, like name@college.edu",
  password: `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
  confirmPassword: "Passwords don't match.",
  acceptedTerms: "Please accept the Terms to continue.",
  invalidCredentials: "Email or password doesn't match. Try again."
};

export function isValidCallsign(value) {
  return typeof value === "string" && CALLSIGN_PATTERN.test(value);
}

export function isValidEmail(value) {
  return typeof value === "string" && EMAIL_PATTERN.test(value.trim());
}

export function isValidPassword(value) {
  return typeof value === "string" && value.length >= MIN_PASSWORD_LENGTH;
}

export function normalizeCallsign(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}
