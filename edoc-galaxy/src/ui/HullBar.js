/**
 * The hull meter every in-flight screen shows: "Hull 100%" and a bar of segments.
 *
 *   <HullBar value={85} />
 *
 * One number drives everything. Green above 40, amber to 20, red below.
 */
export default function HullBar({ value = 100, segments = 12, className = "" }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const lit = Math.ceil((v / 100) * segments);
  const tone = v > 40 ? "ok" : v > 20 ? "warn" : "low";
  return (
    <div className={`ui-hull ui-hull--${tone} ${className}`} role="meter" aria-label="Hull" aria-valuemin={0} aria-valuemax={100} aria-valuenow={v}>
      <span className="ui-hull-label">
        Hull <b>{v}%</b>
      </span>
      <span className="ui-hull-bar" aria-hidden="true">
        {Array.from({ length: segments }, (_, i) => (
          <i key={i} className={i < lit ? "is-on" : ""} />
        ))}
      </span>
    </div>
  );
}
