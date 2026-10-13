"use client";

import AppShell from "../shell/AppShell";
import Panel from "../ui/Panel";
import Button from "../ui/Button";

export default function Error({ reset }) {
  return (
    <AppShell section="SYSTEM FAULT">
      <Panel as="section" tone="danger" size="lg" className="shell-card" eyebrow="Something broke" title="Systems offline">
        <p className="t-body">That screen hit a problem. Try again, or head back to the galaxy.</p>
        <div className="shell-actions">
          <Button onClick={() => reset()}>Try again</Button>
          <Button variant="secondary" href="/">
            Back to the galaxy
          </Button>
        </div>
      </Panel>
    </AppShell>
  );
}
