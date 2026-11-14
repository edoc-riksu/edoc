import { NextResponse } from "next/server";
import { assertEnv } from "../../../lib/env";
import { db } from "../../../lib/db";
import { checkHealth } from "../../../lib/server/health";

// Every request must really check the database: a cached "ok" would hide an
// outage from the uptime monitor (DEPLOYMENT.md section 13).
export const dynamic = "force-dynamic";

// Used by the deploy pipeline and the uptime monitor to confirm a deploy is
// serving requests, has the environment it needs and can reach its database.
export async function GET() {
  const { httpStatus, body } = await checkHealth({
    checkEnv: assertEnv,
    pingDb: () => db.$queryRaw`SELECT 1`
  });

  return NextResponse.json(
    {
      ...body,
      env: process.env.APP_ENV || "development",
      time: new Date().toISOString()
    },
    { status: httpStatus, headers: { "Cache-Control": "no-store" } }
  );
}
