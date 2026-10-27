
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { db } from "../../../../lib/db";
import {
    readSessionToken,
    SESSION_COOKIE_NAME,
} from "../../../../lib/server/sessionToken";
import { recordAcceptedAttempt } from "../../../../lib/server/progressStore";
import { rateLimit } from "../../../../lib/server/rateLimit";
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

    // Each submission runs real code on the execution service's sandbox -
    // real cost, not just a database write - so this is limited per
    // signed-in player rather than per IP. 20/5min comfortably covers
    // normal retry-until-it-passes play without leaving the sandbox open
    // to being hammered by a script.
    const limited = rateLimit(`submission:${userId}`, { limit: 20, windowMs: 5 * 60 * 1000 });
    if (!limited.allowed) {
        return NextResponse.json(
            { error: "Too many submissions. Please wait a moment.", retryAfter: Math.ceil(limited.retryAfterMs / 1000) },
            { status: 429 }
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

    // Tell the judge which try this is (earlier saved attempts at this
    // encounter, plus this one) and how long the player took, if the page
    // sent it. The judge repeats both in its result and flags a first-try
    // clear. A failed count must not block judging, so fall back to 1.
    let attemptNumber = 1;
    try {
        attemptNumber = (await db.attempt.count({ where: { userId, encounterId } })) + 1;
    } catch (error) {
        console.error("Failed to count earlier attempts:", error);
    }
    const elapsedMs =
        Number.isInteger(body?.elapsed_ms) && body.elapsed_ms >= 0 ? body.elapsed_ms : undefined;

    const response = await fetch(`${BACKEND_URL}/api/v1/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            encounter_id: encounterId,
            code,
            attempt_number: attemptNumber,
            elapsed_ms: elapsedMs,
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

        if (result.verdict === "ACCEPTED") {
            // Progress is a bonus on top of a saved attempt, not a reason to
            // fail the request - the attempt itself already succeeded above.
            try {
                await recordAcceptedAttempt(userId, result.encounter_id);
            } catch (error) {
                console.error("Failed to update progress after an accepted attempt:", error);
            }
        }
    }

    return NextResponse.json(result, { status: response.status });
}, "POST /api/approach/submissions");
