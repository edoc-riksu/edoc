/**
 * Original, geometric pilot figure for the Hangar screen — drawn entirely
 * in SVG (no traced/exported art, per edoc-galaxy/CONTRIBUTING.md). Two
 * explorers (helmet shape) x two suits (trim colour), each a simple
 * abstract bust, not a representational face.
 */
export default function ExplorerFigure({ explorer = "vega", suit = "base", size = 140 }) {
  const trim = suit === "starfarer" ? "var(--warn)" : "var(--teal)";
  const suitBody = suit === "starfarer" ? "#2a2f45" : "#1c2436";

  return (
    <svg width={size} height={size} viewBox="0 0 120 140" aria-hidden="true">
      {/* shoulders / suit body */}
      <path d="M20 140 L26 92 Q60 76 94 92 L100 140 Z" fill={suitBody} stroke={trim} strokeWidth="2" />
      <rect x="50" y="94" width="20" height="10" rx="3" fill={trim} opacity="0.85" />

      {explorer === "vega" ? (
        <>
          {/* Vega: round helmet, single visor band */}
          <circle cx="60" cy="52" r="34" fill="#141a2c" stroke={trim} strokeWidth="2.5" />
          <rect x="30" y="44" width="60" height="16" rx="8" fill={trim} opacity="0.9" />
          <circle cx="60" cy="18" r="4" fill={trim} />
        </>
      ) : (
        <>
          {/* Taro: angular helmet, twin fins */}
          <path d="M60 16 L92 40 L84 80 Q60 92 36 80 L28 40 Z" fill="#141a2c" stroke={trim} strokeWidth="2.5" />
          <rect x="34" y="46" width="52" height="14" rx="4" fill={trim} opacity="0.9" />
          <path d="M40 22 L30 8" stroke={trim} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M80 22 L90 8" stroke={trim} strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}

      {suit === "starfarer" && (
        <>
          <path d="M26 92 L20 140 M94 92 L100 140" stroke={trim} strokeWidth="2" opacity="0.7" />
          <circle cx="60" cy="112" r="3" fill={trim} />
        </>
      )}
    </svg>
  );
}
