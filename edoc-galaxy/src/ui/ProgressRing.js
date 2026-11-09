import { Check } from "lucide-react";

/**
 * A small circular progress indicator - percent solved for a module card,
 * a checkmark once it's complete. Pure SVG so it stays crisp at any size
 * and respects forced-colors/contrast the same way text does.
 *
 *   <ProgressRing value={43} />
 *   <ProgressRing value={100} complete />
 */
export default function ProgressRing({ value = 0, size = 48, complete = false }) {
  const pct = Math.max(0, Math.min(100, value));
  const stroke = Math.max(3, Math.round(size * 0.09));
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="ui-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="ui-ring-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" />
        <circle
          className="ui-ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="ui-ring-label">
        {complete ? (
          <>
            <Check size={Math.round(size * 0.4)} aria-hidden="true" />
            <span className="ui-sr-only">Complete</span>
          </>
        ) : (
          `${pct}%`
        )}
      </span>
    </div>
  );
}
