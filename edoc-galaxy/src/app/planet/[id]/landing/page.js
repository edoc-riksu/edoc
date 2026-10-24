import { notFound } from "next/navigation";
import LandingScreen from "../../../../screens/landing/LandingScreen";
import { APPROACH } from "../../../../data/approach";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const a = APPROACH[id];
  return { title: a ? `Landing on ${a.name} · edoc` : "edoc" };
}

/** ?hull=NN is the hull the pilot arrives with (0 to 100). It decides how rough the landing is. */
export default async function LandingPage({ params, searchParams }) {
  const { id } = await params;
  const a = APPROACH[id];
  if (!a) notFound();
  const q = Number((await searchParams)?.hull);
  const hull = Number.isFinite(q) ? Math.min(100, Math.max(0, Math.round(q))) : 100;
  return <LandingScreen planetId={id} hull={hull} next={`/planet/${id}/surface?hull=${hull}`} />;
}
