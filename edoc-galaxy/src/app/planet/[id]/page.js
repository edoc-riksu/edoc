import { notFound } from "next/navigation";
import AppShell from "../../../shell/AppShell";
import Panel from "../../../ui/Panel";
import Button from "../../../ui/Button";
import { PLANETS } from "../../../galaxy/layout";
import { summarizeApproach } from "../../../lib/server/approachData";

const named = PLANETS.filter((p) => p.name);

// The approach (module and obstacle count) can change without a deploy, so the page refreshes itself.
export const revalidate = 60;
export const dynamicParams = false;

export function generateStaticParams() {
  return named.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const p = named.find((x) => x.id === id);
  return { title: p ? `${p.name} · edoc` : "edoc" };
}

/** Placeholder for the planet screen. Landing and the surface map replace it later. */
export default async function PlanetPage({ params }) {
  const { id } = await params;
  const index = PLANETS.findIndex((p) => p.id === id && p.name);
  if (index < 0) notFound();
  const p = PLANETS[index];
  const approach = await summarizeApproach(id);

  return (
    <AppShell section={p.name.toUpperCase()}>
      <Panel as="section" tone="teal" size="lg" className="shell-card" eyebrow={`Planet ${index + 1}`} title={p.name}>
        <p className="t-body">
          {approach
            ? `${approach.moduleTitle ? `${approach.moduleTitle}: ` : ""}${approach.count} ${approach.count === 1 ? "obstacle" : "obstacles"} on the way in. Clear them, then land.`
            : p.charted
              ? `${p.lessons} modules, ${p.mastery}% charted. Clear the obstacles on the way in, then land.`
              : `${p.lessons} modules, still uncharted. Clear the obstacles on the way in, then land.`}
        </p>
        <div className="shell-actions">
          {approach && <Button href={`/planet/${id}/course`}>Begin approach</Button>}
          {!approach && <p className="t-small t-muted">The approach to {p.name} is not open yet. Its obstacles are still being written.</p>}
          <Button variant="secondary" href="/">Back to the galaxy</Button>
        </div>
      </Panel>
    </AppShell>
  );
}
