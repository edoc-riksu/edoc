import { NextResponse } from "next/server";
import { findByCallsign, suggestCallsigns } from "../../../../lib/server/pilotStore";
import { isValidCallsign, normalizeCallsign } from "../../../../lib/authValidation";
import { checkLimits, getClientIp } from "../../../../lib/server/rateLimit";
import { LIMITS, tooManyRequests } from "../../../../lib/server/abuseLimits";

export async function GET(request) {
  const raw = new URL(request.url).searchParams.get("callsign") || "";
  const callsign = normalizeCallsign(raw);

  if (!isValidCallsign(callsign)) {
    return NextResponse.json({ available: false });
  }

  // Each check is a database lookup that reveals whether an account exists
  // (plan Day 43), so it is limited per IP.
  const limited = await checkLimits(LIMITS.callsignCheck({ ip: getClientIp(request) }));
  if (!limited.allowed) {
    const { status, body } = tooManyRequests(limited);
    return NextResponse.json(body, { status });
  }

  const taken = Boolean(await findByCallsign(callsign));
  if (!taken) {
    return NextResponse.json({ available: true });
  }
  return NextResponse.json({ available: false, suggestions: await suggestCallsigns(callsign) });
}
