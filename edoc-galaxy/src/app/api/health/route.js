import { NextResponse } from "next/server";
import { assertEnv } from "../../../lib/env";

// Used by the deploy pipeline / uptime checks to confirm a new deploy is
// actually serving requests and has the environment it needs.
export async function GET() {
  try {
    assertEnv();
  } catch (error) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    status: "ok",
    env: process.env.APP_ENV || "development",
    time: new Date().toISOString()
  });
}
