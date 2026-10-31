import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import ApproachScreen from "../../../../screens/approach/ApproachScreen";
import { loadApproach, summarizeApproach } from "../../../../lib/server/approachData";
import { db } from "../../../../lib/db";
import { readSessionToken, SESSION_COOKIE_NAME } from "../../../../lib/server/sessionToken";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const a = await summarizeApproach(id);
  return { title: a ? `Approach to ${a.name} · edoc` : "edoc" };
}

// A reload with no ?e= used to always land back on the first encounter,
// even for a pilot who had already solved it — this screen never checked
// solved state at all, unlike CodeConsole's own per-encounter resume.
// Falls back to the first encounter whenever there's no session or solved
// data to go on, same as before.
async function firstUnsolvedIndex(encounters) {
  try {
    const userId = readSessionToken((await cookies()).get(SESSION_COOKIE_NAME)?.value);
    if (!userId) return 0;

    const solved = await db.attempt.findMany({
      where: { userId, verdict: "ACCEPTED", encounterId: { in: encounters.map((e) => e.id) } },
      select: { encounterId: true },
      distinct: ["encounterId"]
    });
    const solvedIds = new Set(solved.map((a) => a.encounterId));

    const next = encounters.findIndex((e) => !solvedIds.has(e.id));
    return next === -1 ? encounters.length - 1 : next;
  } catch {
    return 0;
  }
}

export default async function ApproachPage({ params, searchParams }) {
  const { id } = await params;
  const a = await loadApproach(id);
  if (!a) notFound();
  const q = Number((await searchParams)?.e);
  const start = Number.isFinite(q) && q >= 1 ? q - 1 : await firstUnsolvedIndex(a.encounters);
  return <ApproachScreen planetId={id} planetName={a.name} encounters={a.encounters} hull={100} start={start} />;
}
