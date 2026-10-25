
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

    // Each submission runs the player's code in the sandbox — a real cost,
    // unlike a run. Keyed per user, not per IP, since this route requires auth.
    const limited = rateLimit(`submission:${userId}`, { limit: 15, windowMs: 60 * 1000 });
    if (!limited.allowed) {
        return NextResponse.json(
            {
                error: "Too many submissions — slow down a little.",
                retryAfter: Math.ceil(limited.retryAfterMs / 1000),
            },
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
