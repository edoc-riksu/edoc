import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readSessionToken, SESSION_COOKIE_NAME } from "../../../../lib/server/sessionToken";
import { findByEmail, toPublicUser } from "../../../../lib/server/authStore";

export async function GET() {
  const store = await cookies();
  const email = readSessionToken(store.get(SESSION_COOKIE_NAME)?.value);
  if (!email) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const user = findByEmail(email);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  return NextResponse.json({ user: toPublicUser(user) });
}
