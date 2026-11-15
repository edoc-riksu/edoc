// Plan Day 43: every rate limit and body-size cap in one place, so they can
// be read and tuned together. Each entry lists the limits one request is
// checked against, most specific first (see checkLimits in rateLimit.js).
//
// Why several limits per action: a single "IP + email" limit is easy to get
// round by rotating either one. The account limit stops password guessing
// spread over many IPs; the IP limit stops one machine trying many accounts.

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Plan Day 37 cost control, kept here with the others.
export const DAILY_SUBMISSION_LIMIT = 300;

export const LIMITS = {
  signin: ({ ip, email }) => [
    { key: `signin:${ip}:${email || "unknown"}`, limit: 8, windowMs: 10 * MINUTE },
    // An attacker can use this to lock one account for up to an hour; 20 tries
    // keeps that hard to do by accident and slow to do on purpose.
    ...(email ? [{ key: `signin-account:${email}`, limit: 20, windowMs: HOUR }] : []),
    { key: `signin-ip:${ip}`, limit: 40, windowMs: 10 * MINUTE }
  ],
  signup: ({ ip }) => [
    { key: `signup:${ip}`, limit: 10, windowMs: HOUR },
    { key: `signup-day:${ip}`, limit: 30, windowMs: DAY }
  ],
  // Each check is a database lookup that also tells whether a callsign is
  // taken, so it is capped to stop anyone listing every account.
  callsignCheck: ({ ip }) => [{ key: `callsign-check:${ip}`, limit: 60, windowMs: MINUTE }],
  // Profile saves can carry an avatar image of up to ~300 KB each.
  profile: ({ userId }) => [{ key: `profile:${userId}`, limit: 30, windowMs: 10 * MINUTE }],
  submission: ({ userId, ip }) => [
    { key: `submission:${userId}`, limit: 20, windowMs: 5 * MINUTE },
    { key: `submission-day:${userId}`, limit: DAILY_SUBMISSION_LIMIT, windowMs: DAY },
    // Many accounts from one machine. Generous, because a whole classroom can
    // share one school IP address.
    { key: `submission-ip:${ip}`, limit: 200, windowMs: 5 * MINUTE }
  ]
};

// Largest request body each route accepts, in bytes.
export const BODY_LIMITS = {
  auth: 16 * 1024,
  // An avatar data URL is capped at 300,000 characters by the route itself.
  profile: 400 * 1000,
  // Code is capped at 20,000 characters, but JSON escaping can make it
  // several times larger on the wire.
  submission: 256 * 1024
};

// What the player is told when a limit is reached, by kind of limit.
export const LIMIT_MESSAGES = {
  "submission-day": "You've reached today's submission limit. It resets within 24 hours.",
  submission: "Too many submissions. Please wait a moment.",
  "submission-ip": "Too many submissions from this network. Please wait a moment.",
  profile: "Too many profile changes. Please wait a moment.",
  "callsign-check": "Too many callsign checks. Please wait a moment."
};

export function tooManyRequests(result) {
  return {
    status: 429,
    body: {
      error: LIMIT_MESSAGES[result.scope] || "Too many attempts. Please wait and try again.",
      retryAfter: Math.ceil(result.retryAfterMs / 1000)
    }
  };
}
