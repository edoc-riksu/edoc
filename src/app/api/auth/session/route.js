import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readSessionToken, SESSION_COOKIE_NAME } from "../../../../lib/server/session";

/** Lets the client ask "does a real, unexpired session cookie back this
 *  browser right now?" — used to restore login state on page load instead
 *  of trusting the client-side callsign cache alone. */
export async function GET() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  return NextResponse.json({ callsign: readSessionToken(token) });
}
