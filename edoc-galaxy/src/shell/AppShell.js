import TopBar from "./TopBar";

/**
 * Frame for every screen except the galaxy map (which paints its own sky).
 * A calm static night sky, the shared top bar, and a scrolling content area.
 *
 *   <AppShell section="PYTHON" tools={<Button ... />}>
 *     <Panel>...</Panel>
 *   </AppShell>
 */
export default function AppShell({ section, tools, children }) {
  return (
    <div className="shell">
      <div className="shell-sky" aria-hidden="true" />
      <TopBar section={section}>{tools}</TopBar>
      <main className="shell-main">{children}</main>
    </div>
  );
}
