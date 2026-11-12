import CompanionLab from "../../../art/CompanionLab";

export const metadata = { title: "Bolt · art preview" };

/** Review page for Bolt the companion: the avatar in its states and the three hint levels. */
export default function CompanionPreview() {
  return (
    <main style={{ padding: "24px 16px", display: "grid", gap: 24, maxWidth: 1000, margin: "0 auto", height: "100dvh", overflow: "auto", alignContent: "start" }}>
      <h1 className="t-title">Bolt, the companion</h1>
      <CompanionLab />
    </main>
  );
}
