import { notFound } from "next/navigation";
import SurfaceScreen from "../../../../screens/landing/SurfaceScreen";
import { APPROACH } from "../../../../data/approach";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const a = APPROACH[id];
  return { title: a ? `${a.name} surface · edoc` : "edoc" };
}

export default async function SurfacePage({ params, searchParams }) {
  const { id } = await params;
  const a = APPROACH[id];
  if (!a) notFound();
  const q = Number((await searchParams)?.hull);
  const hull = Number.isFinite(q) ? Math.min(100, Math.max(0, Math.round(q))) : 100;
  return <SurfaceScreen planetId={id} planetName={a.name} hull={hull} />;
}
