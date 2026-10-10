import { NextResponse } from "next/server";
import { createUser, findUser, findUserByEmail } from "../../../../lib/server/userStore";
import { hashPassword } from "../../../../lib/server/passwords";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "../../../../lib/server/session";
import { rateLimit, getClientIp } from "../../../../lib/server/rateLimit";
import {
  normalizeCallsign,
  isValidPassword,
  isValidName,
  isValidEmail,
  EXPERIENCE_LEVELS,
  SPECIALIZATIONS
} from "../../../../lib/callsign";

// Every field is re-validated here even though the form also disables its
// submit button client-side — a disabled button is a UX nicety, never a
// security boundary. A request with a forged body (curl, a modified
// client, Postman) must be rejected on the same terms as a real submit.
export async function POST(request) {
  // Caps automated mass account creation from one source — generous
  // enough that a real pilot signing up twice by mistake never hits it.
  const ip = getClientIp(request);
  const limited = rateLimit(`signup:${ip}`, { limit: 10, windowMs: 60 * 60 * 1000 });
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many signup attempts from this connection. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limited.retryAfterMs / 1000)) } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  const callsign = normalizeCallsign(body?.callsign);
  const password = body?.password;
  const firstName = typeof body?.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body?.lastName === "string" ? body.lastName.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const experienceLevel = EXPERIENCE_LEVELS.includes(body?.experienceLevel) ? body.experienceLevel : null;
  const specialization = SPECIALIZATIONS.includes(body?.specialization) ? body.specialization : null;
  const acceptedTerms = body?.acceptedTerms === true;

  if (!callsign) return NextResponse.json({ error: "Enter a callsign." }, { status: 400 });
  if (!isValidPassword(password)) return NextResponse.json({ error: "Password must be 6-72 characters." }, { status: 400 });
  if (!isValidName(firstName)) return NextResponse.json({ error: "Enter your first name." }, { status: 400 });
  if (!isValidName(lastName)) return NextResponse.json({ error: "Enter your last name." }, { status: 400 });
  if (!isValidEmail(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (!experienceLevel) return NextResponse.json({ error: "Select an experience level." }, { status: 400 });
  if (!specialization) return NextResponse.json({ error: "Select a training track." }, { status: 400 });
  if (!acceptedTerms) return NextResponse.json({ error: "You must accept the terms of service and privacy policy." }, { status: 400 });

  // Friendly early checks — the authoritative, race-proof check is the one
  // inside createUser's write lock below, which is what actually prevents
  // two simultaneous signups for the same callsign.
  if (findUser(callsign)) {
    return NextResponse.json({ error: "That callsign is already registered — try Returning Pilot instead." }, { status: 409 });
  }
  if (findUserByEmail(email)) {
    return NextResponse.json({ error: "That email is already linked to a different callsign." }, { status: 409 });
  }

  try {
    await createUser(callsign, hashPassword(password), { firstName, lastName, email, experienceLevel, specialization });
  } catch (err) {
    if (err.code === "CALLSIGN_TAKEN") {
      return NextResponse.json({ error: "That callsign is already registered — try Returning Pilot instead." }, { status: 409 });
    }
    throw err;
  }

  const response = NextResponse.json({ callsign, firstName, lastName });
  response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(callsign), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS
  });
  return response;
}
