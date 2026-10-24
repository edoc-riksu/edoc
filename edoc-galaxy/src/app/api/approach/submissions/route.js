
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { db } from "../../../../lib/db";
import {
    readSessionToken,
    SESSION_COOKIE_NAME,
} from "../../../../lib/server/sessionToken";
import { withErrorLogging } from "../../../../lib/logger";

const BACKEND_URL =
    process.env.EXECUTION_API_URL ||
    process.env.NEXT_PUBLIC_EXECUTION_API_URL ||
    "http://localhost:8000";

export const POST = withErrorLogging(async function POST(request) {
    const cookieStore = await cookies();
    const userId = readSessionToken(
        cookieStore.get(SESSION_COOKIE_NAME)?.value
    );

    if (!userId) {
        return NextResponse.json(
            { error: "Please sign in before submitting." },
            { status: 401 }
        );
    }

    const body = await request.json();
    const encounterId = body?.encounter_id;
    const code = body?.code;

    if (
        typeof encounterId !== "string" ||
        !/^[a-z]+-\d{3}$/.test(encounterId) ||
        typeof code !== "string" ||
        code.length > 20000
    ) {
        return NextResponse.json(
            { error: "Invalid encounter ID or code." },
            { status: 400 }
        );
    }

    const response = await fetch(`${BACKEND_URL}/api/v1/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            encounter_id: encounterId,
            code,
        }),
        cache: "no-store",
    });

    const result = await response.json().catch(() => null);

    if (!response.ok || !result) {
        return NextResponse.json(
            result || { error: "The judging service is unavailable." },
            { status: response.status || 502 }
        );
    }

    // A sandbox outage is not a failed user attempt.
    if (result.verdict !== "SYSTEM_ERROR") {
        try {
            await db.attempt.create({
                data: {
                    id: result.submission_id || randomUUID(),
                    userId,
                    encounterId: result.encounter_id,
                    verdict: result.verdict,
                    scoreEarned: result.score.earned,
                    scoreTotal: result.score.total,
                    runtimeMs: result.execution.runtime_ms,
                },
            });
        } catch (error) {
            console.error("Failed to persist submission attempt:", error);
            return NextResponse.json(
                { error: "Submission was judged, but saving the attempt failed." },
                { status: 500 }
            );
        }
    }

    return NextResponse.json(result, { status: response.status });
}, "POST /api/approach/submissions");
