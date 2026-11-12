import SuitLab from "../../../art/SuitLab";

export const metadata = { title: "New suit unlocked · art preview" };

/** Review page for the "New suit unlocked" scene, on mock data. `?calm=1` shows reduced motion. */
export default async function SuitPreview({ searchParams }) {
  const q = (await searchParams) || {};
  return (
    <main style={{ padding: "24px 16px", display: "grid", gap: 16, maxWidth: 1100, margin: "0 auto", height: "100dvh", overflow: "auto", alignContent: "start" }}>
      <h1 className="t-title">New suit unlocked</h1>
      <SuitLab initialCalm={q.calm === "1"} />
    </main>
  );
}
