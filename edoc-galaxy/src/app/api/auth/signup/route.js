import { NextResponse } from "next/server";
import { createUser, findByCallsign, findByEmail, suggestCallsigns } from "../../../../lib/server/pilotStore";
import { createSessionToken, SESSION_COOKIE_NAME, maxAgeForRemember } from "../../../../lib/server/sessionToken";
import { checkLimits, getClientIp } from "../../../../lib/server/rateLimit";
import { BODY_LIMITS, LIMITS, tooManyRequests } from "../../../../lib/server/abuseLimits";
import { readJsonBody } from "../../../../lib/server/requestBody";
import { logger, withErrorLogging } from "../../../../lib/logger";
import { db } from "../../../../lib/db";
import {
  INVITE_MESSAGES,
  checkInvite,
  inviteMessage,
  isInviteOnly,
  normalizeInviteCode
} from "../../../../lib/server/invites.mjs";
import {
  normalizeCallsign,
  normalizeEmail,
  isValidCallsign,
  isValidEmail,
  isValidPassword,
  AUTH_MESSAGES
} from "../../../../lib/authValidation";

// The sign-up form asks this whether to show the invite code field
// (plan Day 52). Must not be cached: the answer follows INVITE_ONLY.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ inviteOnly: isInviteOnly() }, { headers: { "Cache-Control": "no-store" } });
}

export const POST = withErrorLogging(async function POST(request) {
  const ip = getClientIp(request);
  const limited = await checkLimits(LIMITS.signup({ ip }));
  if (!limited.allowed) {
    return NextResponse.json({ retryAfter: tooManyRequests(limited).body.retryAfter }, { status: 429 });
  }

  const parsed = await readJsonBody(request, { maxBytes: BODY_LIMITS.auth });
  if (!parsed.ok) {
    return NextResponse.json({ fields: { form: parsed.error } }, { status: parsed.status === 413 ? 413 : 422 });
  }
  const body = parsed.body;

  const callsign = normalizeCallsign(body?.callsign);
  const email = normalizeEmail(body?.email);
  const password = typeof body?.password === "string" ? body.password : "";

  const fields = {};
  if (!isValidCallsign(callsign)) fields.callsign = AUTH_MESSAGES.callsign;
  if (!isValidEmail(email)) fields.email = AUTH_MESSAGES.email;
  if (!isValidPassword(password)) fields.password = AUTH_MESSAGES.password;

  // Plan Day 52: while the test is closed, a valid invite is needed. Checked
  // before "callsign/email taken", so without an invite sign-up can't be
  // used to find out which emails have accounts.
  const inviteOnly = isInviteOnly();
  const inviteCode = inviteOnly ? normalizeInviteCode(body?.invite) : null;
  if (inviteOnly && !inviteCode) {
    fields.invite = typeof body?.invite === "string" && body.invite.trim() ? INVITE_MESSAGES.invalid : INVITE_MESSAGES.missing;
  }
  if (Object.keys(fields).length > 0) {
    return NextResponse.json({ fields }, { status: 422 });
  }

  if (inviteOnly) {
    const { state } = await checkInvite(db, inviteCode);
    if (state !== "ok") {
      logger.info("sign-up turned away by invite gate", { reason: state });
      return NextResponse.json({ fields: { invite: inviteMessage(state) } }, { status: 422 });
    }
  }

  if (await findByCallsign(callsign)) {
    return NextResponse.json(
      { code: "callsign_taken", suggestions: await suggestCallsigns(callsign) },
      { status: 409 }
    );
  }
  if (await findByEmail(email)) {
    return NextResponse.json({ code: "email_taken" }, { status: 409 });
  }

  let user;
  try {
    user = await createUser({ callsign, email, password, inviteCode });
  } catch (err) {
    if (err.code === "INVITE_INVALID") {
      // Someone else used the last place on this invite a moment ago.
      return NextResponse.json({ fields: { invite: INVITE_MESSAGES.used_up } }, { status: 422 });
    }
    if (err.code === "CALLSIGN_TAKEN") {
      return NextResponse.json(
        { code: "callsign_taken", suggestions: await suggestCallsigns(callsign) },
        { status: 409 }
      );
    }
    if (err.code === "EMAIL_TAKEN") {
      return NextResponse.json({ code: "email_taken" }, { status: 409 });
    }
    throw err;
  }

  logger.info("pilot account created", { userId: user.id, invited: Boolean(inviteCode) });

  const response = NextResponse.json({ user }, { status: 201 });
  response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(user.id, { remember: true }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeForRemember(true)
  });
  return response;
}, "POST /api/auth/signup");
