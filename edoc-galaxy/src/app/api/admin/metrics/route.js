import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { withErrorLogging } from "../../../../lib/logger";
import { collectMetrics, isAuthorized } from "../../../../lib/server/metrics";

// Platform numbers for the monitoring dashboard (plan Day 44, MONITORING.md).
// Needs `Authorization: Bearer <METRICS_TOKEN>`. Without METRICS_TOKEN set
// for the environment the endpoint answers 404, as if it didn't exist.
export const dynamic = "force-dynamic";

export const GET = withErrorLogging(async function GET(request) {
  const token = process.env.METRICS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (!isAuthorized(request.headers.get("authorization"), token)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "WWW-Authenticate": "Bearer" } });
  }

  const metrics = await collectMetrics(db);
  return NextResponse.json({ metrics }, { headers: { "Cache-Control": "no-store" } });
}, "GET /api/admin/metrics");
