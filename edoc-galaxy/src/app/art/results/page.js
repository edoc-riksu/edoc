import ResultsLab from "../../../art/ResultsLab";

export const metadata = { title: "Result scenes · art preview" };

export default async function ResultsPreview({ searchParams }) {
  const q = (await searchParams) || {};
  return <ResultsLab initial={q.scene} calm={q.calm === "1"} />;
}
