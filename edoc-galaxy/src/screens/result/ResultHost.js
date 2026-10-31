"use client";

import EncounterCleared from "./EncounterCleared";
import HullDepleted from "./HullDepleted";
import { victoryProps, defeatProps } from "./resultProps";

/**
 * Shows the right scene for a result the console has reported, full screen over the cockpit.
 *
 *   result = { kind: "victory", result, hullBefore, hullAfter, attempts }
 *          | { kind: "defeat",  result, attempts }
 *
 * `result.result` is the judging result as the API returns it (a defeat carries the concept and explanation in
 * `result.result.defeat`). Nothing is fetched or saved here.
 */
export default function ResultHost({ result, encounter, nextLabel, onContinue, onRematch, muted, calm }) {
  if (!result) return null;
  if (result.kind === "victory") {
    return (
      <div className="ap-result">
        <EncounterCleared
          {...victoryProps({ encounter, result: result.result, attempts: result.attempts, hullBefore: result.hullBefore, hullAfter: result.hullAfter, nextLabel })}
          onContinue={onContinue}
          muted={muted}
          calm={calm}
        />
      </div>
    );
  }
  const p = defeatProps({ encounter, result: result.result, attempts: result.attempts });
  return (
    <div className="ap-result">
      <HullDepleted {...p} explanation={
          <>
            <p>{p.explanation}</p>
            {p.conceptNote && <p className="hd-note">{p.conceptNote}</p>}
          </>
        } onRematch={onRematch} muted={muted} calm={calm} />
    </div>
  );
}
