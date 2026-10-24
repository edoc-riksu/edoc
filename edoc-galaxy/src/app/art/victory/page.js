import EncounterCleared from "../../../screens/result/EncounterCleared";

export const metadata = { title: "Encounter cleared · art preview" };

/** Full-screen review page for "Encounter cleared". ?calm=1 for reduced motion. */
export default async function VictoryPreview({ searchParams }) {
  const q = (await searchParams) || {};
  return <EncounterCleared title="Sum of Two Integers" concept="Input/Output" hull={95} hullGain={15} attempts={2} runtimeMs={42} nextLabel="Next obstacle" muted calm={q.calm === "1"} />;
}
