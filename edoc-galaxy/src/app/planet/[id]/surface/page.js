import { notFound } from "next/navigation";
import SurfaceScreen from "../../../../screens/landing/SurfaceScreen";
import { summarizeApproach } from "../../../../lib/server/approachData";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const a = await summarizeApproach(id);
  return { title: a ? `${a.name} surface · edoc` : "edoc" };
}

export default async function SurfacePage({ params, searchParams }) {
  const { id } = await params;
  const a = await summarizeApproach(id);
  if (!a) notFound();
  const q = Number((await searchParams)?.hull);
  const hull = Number.isFinite(q) ? Math.min(100, Math.max(0, Math.round(q))) : 100;
  return <SurfaceScreen planetId={id} planetName={a.name} hull={hull} />;
}
