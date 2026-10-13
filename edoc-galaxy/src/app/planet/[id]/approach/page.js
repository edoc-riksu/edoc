import { notFound } from "next/navigation";
import ApproachScreen from "../../../../screens/approach/ApproachScreen";
import { APPROACH } from "../../../../data/approach";

export async function generateStaticParams() {
  return Object.keys(APPROACH).map((id) => ({ id }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const a = APPROACH[id];
  return { title: a ? `Approach to ${a.name} · edoc` : "edoc" };
}

export default async function ApproachPage({ params, searchParams }) {
  const { id } = await params;
  const a = APPROACH[id];
  if (!a) notFound();
  const q = Number((await searchParams)?.e);
  const start = Number.isFinite(q) && q >= 1 ? q - 1 : 0;
  return <ApproachScreen planetId={id} planetName={a.name} encounters={a.encounters} hull={100} start={start} />;
}
