import ApproachScene from "../../art/ApproachScene";
import FlightScene from "../../art/FlightScene";

export const metadata = { title: "Art preview · edoc" };

/** Review page for the code-made scenes. */
export default function ArtPreview() {
  return (
    <main style={{ padding: "24px 16px", display: "grid", gap: 24, maxWidth: 1200, margin: "0 auto", height: "100dvh", overflow: "auto", alignContent: "start" }}>
      <h1 className="t-title">Art preview</h1>
      <section aria-label="Approach scene" style={{ aspectRatio: "1376 / 768", position: "relative", borderRadius: 14, overflow: "hidden" }}>
        <ApproachScene />
      </section>
      <section aria-label="Flight scene" style={{ aspectRatio: "1376 / 620", position: "relative", borderRadius: 14, overflow: "hidden" }}>
        <FlightScene />
      </section>
    </main>
  );
}
