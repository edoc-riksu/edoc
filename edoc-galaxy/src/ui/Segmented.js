"use client";

/**
 * A small either-or switch: Motion Full | Reduced, Stars Low | Normal | High.
 *
 *   <Segmented label="Stars" value={v} onChange={setV}
 *     options={[{ value: "low", label: "Low" }, { value: "high", label: "High" }]} />
 */
export default function Segmented({ label, value, onChange, options }) {
  return (
    <div className="ui-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
