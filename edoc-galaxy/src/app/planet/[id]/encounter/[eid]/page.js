import { notFound } from "next/navigation";
import ApproachScreen from "../../../../../screens/approach/ApproachScreen";
import { loadApproach } from "../../../../../lib/server/approachData";

export async function generateMetadata({ params }) {
  const { id, eid } = await params;
  const a = await loadApproach(id);
  const e = a?.encounters.find((x) => x.id === eid);
  return { title: e ? `${e.title} · ${a.name} · edoc` : "edoc" };
}

/**
 * One encounter, addressed by its own URL. It is the approach screen with the console already open on
 * this encounter (Engage pushes this address, so reload, share and Back all land here).
 */
export default async function EncounterPage({ params }) {
  const { id, eid } = await params;
  const a = await loadApproach(id);
  if (!a) notFound();
  const index = a.encounters.findIndex((x) => x.id === eid);
  if (index < 0) notFound();
  return <ApproachScreen planetId={id} planetName={a.name} encounters={a.encounters} hull={100} start={index} startEngaged />;
}
