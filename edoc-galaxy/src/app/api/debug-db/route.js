import { NextResponse } from "next/server";
import { db } from "../../../lib/db";

// TEMPORARY diagnostic route - delete once the P2021 "table does not exist"
// mystery on live deploys is resolved. Reports exactly which database/host
// the live Lambda is actually connected to, and whether it can see the
// users table, bypassing all guesswork about which env var value is live.
export async function GET() {
  try {
    const info = await db.$queryRaw`
      SELECT current_database() AS database,
             current_schema() AS schema,
             inet_server_addr()::text AS server_ip
    `;
    const tables = await db.$queryRaw`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
    `;
    return NextResponse.json({ info: info[0], tables });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
