import { notFound } from "next/navigation";
import ModuleListScreen from "../../../../screens/modules/ModuleListScreen";
import { summarizeApproach } from "../../../../lib/server/approachData";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const a = await summarizeApproach(id);
  return { title: a ? `${a.name} modules · edoc` : "edoc" };
}

export default async function ModulesPage({ params }) {
  const { id } = await params;
  const a = await summarizeApproach(id);
  if (!a) notFound();
  return <ModuleListScreen planetId={id} planetName={a.name} />;
}
