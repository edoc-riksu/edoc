import OverlayLab from "../../../ui/OverlayLab";

export const metadata = { title: "Dialog and drawer · art preview" };

/** Review page for the shared Dialog and Drawer. */
export default function OverlaysPreview() {
  return (
    <main style={{ padding: "24px 16px", display: "grid", gap: 24, maxWidth: 1000, margin: "0 auto", height: "100dvh", overflow: "auto", alignContent: "start" }}>
      <h1 className="t-title">Dialog and drawer</h1>
      <OverlayLab />
    </main>
  );
}
