import { notFound } from "next/navigation";
import ModuleDetailScreen from "../../../../../screens/modules/ModuleDetailScreen";
import { summarizeApproach } from "../../../../../lib/server/approachData";

export async function generateMetadata({ params }) {
  const { id, slug } = await params;
  const a = await summarizeApproach(id);
  return { title: a ? `${slug} · ${a.name} · edoc` : "edoc" };
}

export default async function ModuleDetailPage({ params }) {
  const { id, slug } = await params;
  const a = await summarizeApproach(id);
  if (!a) notFound();
  return <ModuleDetailScreen planetId={id} planetName={a.name} slug={slug} />;
}
