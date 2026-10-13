import AppShell from "../shell/AppShell";
import Panel from "../ui/Panel";
import Button from "../ui/Button";

export const metadata = { title: "Lost in space · edoc" };

export default function NotFound() {
  return (
    <AppShell section="LOST SIGNAL">
      <Panel as="section" size="lg" className="shell-card" eyebrow="404" title="Nothing out here">
        <p className="t-body">That page isn't on the star chart. Head back to the galaxy and pick a planet.</p>
        <div className="shell-actions">
          <Button href="/">Back to the galaxy</Button>
        </div>
      </Panel>
    </AppShell>
  );
}
