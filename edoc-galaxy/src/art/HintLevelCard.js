import { Lock } from "lucide-react";
import { levelAt } from "./hintLevels";

/** The glyph for a level: a dot, a diamond or a triangle, so the three differ in shape and not only in colour. */
export function LevelGlyph({ icon, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" className="hl-glyph">
      {icon === "dot" && <circle cx="8" cy="8" r="3.6" fill="currentColor" />}
      {icon === "diamond" && <path d="M8 1.8 14.2 8 8 14.2 1.8 8Z" fill="currentColor" />}
      {icon === "triangle" && <path d="M8 2 14.6 13.4H1.4Z" fill="currentColor" />}
    </svg>
  );
}

/** One, two or three filled pips: how strong the hint is. */
export function Pips({ n }) {
  return (
    <span className="hl-pips" aria-hidden="true">
      {[1, 2, 3].map((i) => <i key={i} className={i <= n ? "is-on" : ""} />)}
    </span>
  );
}

/**
 * One hint level in the companion panel. `state` is "locked" (an earlier hint comes first), "ready" (can be revealed now)
 * or "revealed". `text` is the hint itself once revealed; `cost` is shown on the reveal button (e.g. "-10 hull").
 */
export default function HintLevelCard({ index, state, text, cost, onReveal }) {
  const level = levelAt(index);
  if (!level) return null;
  return (
    <div className={`hl hl-${level.id} is-${state}`}>
      <div className="hl-head">
        <span className="hl-badge">
          <LevelGlyph icon={level.icon} />
          <span className="hl-name">{level.id}. {level.name}</span>
        </span>
        <Pips n={level.pips} />
      </div>
      {state === "revealed" && <p className="hl-text">{text}</p>}
      {state === "ready" && (
        <>
          <p className="hl-blurb">{level.blurb}</p>
          <button type="button" className="hl-reveal" onClick={onReveal}>
            Reveal {level.name.toLowerCase()}{cost ? <span className="hl-cost">{cost}</span> : null}
          </button>
        </>
      )}
      {state === "locked" && (
        <p className="hl-locked"><Lock size={12} aria-hidden="true" /> Ask for hint {index} first</p>
      )}
    </div>
  );
}
