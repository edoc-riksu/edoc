import { NextResponse } from "next/server";
import { findByCallsign, suggestCallsigns } from "../../../../lib/server/pilotStore";
import { isValidCallsign, normalizeCallsign } from "../../../../lib/authValidation";

export async function GET(request) {
  const raw = new URL(request.url).searchParams.get("callsign") || "";
  const callsign = normalizeCallsign(raw);

  if (!isValidCallsign(callsign)) {
    return NextResponse.json({ available: false });
  }

  const taken = Boolean(await findByCallsign(callsign));
  if (!taken) {
    return NextResponse.json({ available: true });
  }
  return NextResponse.json({ available: false, suggestions: await suggestCallsigns(callsign) });
}
