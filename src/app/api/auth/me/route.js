import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "../../../../lib/db";
import { verifySessionToken, SESSION_COOKIE_NAME } from "../../../../lib/session";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const userId = verifySessionToken(token);
  if (!userId) return NextResponse.json({ user: null });

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ user: null });

  return NextResponse.json({
    user: { id: user.id, email: user.email, pilotCallsign: user.pilotCallsign }
  });
}
