import HullDepleted from "../../../screens/result/HullDepleted";

export const metadata = { title: "Hull depleted · art preview" };

/** Full-screen review page for "Hull depleted". ?calm=1 for reduced motion, ?plain=1 for no explanation text. */
export default async function DefeatPreview({ searchParams }) {
  const q = (await searchParams) || {};
  const plain = q.plain === "1";
  return (
    <HullDepleted
      concept={plain ? undefined : "Loops"}
      explanation={plain ? undefined : <p>Your loop stopped one step early, so the last number was never added. A <code>range(n)</code> ends before <code>n</code>; to include it, count to <code>n + 1</code>.</p>}
      failedTests={plain ? undefined : ["Sample test 2"]}
      attempts={3}
      muted
      calm={q.calm === "1"}
    />
  );
}
