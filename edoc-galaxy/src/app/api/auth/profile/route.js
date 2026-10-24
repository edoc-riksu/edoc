import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readSessionToken, SESSION_COOKIE_NAME } from "../../../../lib/server/sessionToken";
import { updateUser } from "../../../../lib/server/pilotStore";
import { normalizeCallsign, isValidCallsign, AUTH_MESSAGES } from "../../../../lib/authValidation";

// A small, square avatar JPEG/WebP at modest quality comfortably fits well
// under this — it's a backstop against someone posting a huge data URL,
// not a real target size (resizing happens client-side before upload).
const MAX_AVATAR_LENGTH = 300_000;

export async function PATCH(request) {
  const store = await cookies();
  const userId = readSessionToken(store.get(SESSION_COOKIE_NAME)?.value);
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ fields: { form: "Malformed request body." } }, { status: 422 });
  }

  const patch = {};

  if (body?.callsign !== undefined) {
    const callsign = normalizeCallsign(body.callsign);
    if (!isValidCallsign(callsign)) {
      return NextResponse.json({ fields: { callsign: AUTH_MESSAGES.callsign } }, { status: 422 });
    }
    patch.callsign = callsign;
  }

  if (body?.avatar === null) {
    patch.avatar = null;
  } else if (body?.avatar !== undefined) {
    const isDataUrl = typeof body.avatar === "string" && body.avatar.startsWith("data:image/");
    if (!isDataUrl || body.avatar.length > MAX_AVATAR_LENGTH) {
      return NextResponse.json({ fields: { avatar: "Image must be a small image file." } }, { status: 422 });
    }
    patch.avatar = body.avatar;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ fields: { form: "Nothing to update." } }, { status: 422 });
  }

  try {
    const user = await updateUser(userId, patch);
    if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    return NextResponse.json({ user });
  } catch (err) {
    if (err.code === "CALLSIGN_TAKEN") {
      return NextResponse.json({ code: "callsign_taken" }, { status: 409 });
    }
    throw err;
  }
}
