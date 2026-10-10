import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readSessionToken, SESSION_COOKIE_NAME } from "../../../lib/server/session";
import { findUser } from "../../../lib/server/userStore";

/** Real, session-backed profile data for whoever's signed in right now —
 *  never a client-supplied callsign, so one pilot can never read another's
 *  profile by passing a different value in. */
export async function GET() {
  const store = await cookies();
  const callsign = readSessionToken(store.get(SESSION_COOKIE_NAME)?.value);
  if (!callsign) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const user = findUser(callsign);
  if (!user) {
    // A valid session token for a user record that no longer exists —
    // shouldn't happen outside manual .data/users.json edits, but fail
    // closed rather than fabricate a profile.
    return NextResponse.json({ error: "Pilot record not found." }, { status: 404 });
  }

  return NextResponse.json({
    callsign: user.callsign,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    experienceLevel: user.experienceLevel,
    specialization: user.specialization,
    memberSince: user.createdAt
  });
}
