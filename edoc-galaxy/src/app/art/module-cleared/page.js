import ModuleClearedLab from "../../../art/ModuleClearedLab";

export const metadata = { title: "Module cleared · art preview" };

/** Review page for the "Module cleared" scene, on mock data. `?calm=1` shows reduced motion. */
export default async function ModuleClearedPreview({ searchParams }) {
  const q = (await searchParams) || {};
  return (
    <main style={{ padding: "24px 16px", display: "grid", gap: 16, maxWidth: 1100, margin: "0 auto", height: "100dvh", overflow: "auto", alignContent: "start" }}>
      <h1 className="t-title">Module cleared</h1>
      <ModuleClearedLab initialCalm={q.calm === "1"} />
    </main>
  );
}
