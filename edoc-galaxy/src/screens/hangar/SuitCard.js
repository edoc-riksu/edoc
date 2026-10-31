"use client";

import { forwardRef } from "react";
import { Check, Lock } from "lucide-react";

/**
 * One row in the Explorer/Suit list. `state` drives the four looks: equipped
 * (teal glow + badge), selected-for-preview (teal border + check — you can
 * preview a card before saving), available (plain), and locked (amber, shows
 * the unlock condition).
 *
 * The tile icon is drawn with the same per-tab glyph everywhere, not a photo,
 * so there's no art asset to wait on — just like the rest of this app. An
 * explorer card passes `portrait` instead: a snapshot of the actual pilot
 * figure, so picking a person reads differently from picking an outfit.
 */
const SuitCard = forwardRef(function SuitCard(
  { id, name, icon: Icon, portrait, state, unlockDetail, subtitle, tabIndex, onSelect, onKeyDown },
  ref
) {
  const locked = state === "locked";

  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={state === "equipped" || state === "selected"}
      tabIndex={tabIndex}
      className={`hg-card hg-card--${state} ${portrait ? "hg-card--portrait" : ""}`}
      onClick={() => onSelect(id)}
      onKeyDown={onKeyDown}
    >
      <span className="hg-card-tile" aria-hidden="true">
        {portrait || <Icon size={22} />}
      </span>

      <span className="hg-card-body">
        <span className="hg-card-title">
          {locked && <Lock size={13} className="hg-card-lock" aria-hidden="true" />}
          {name}
        </span>

        {state === "equipped" && <span className="hg-badge">Equipped</span>}
        {state === "locked" && (
          <span className="hg-card-unlock">
            <strong>Unlock:</strong> {unlockDetail}
          </span>
        )}
        {state === "available" && <span className="hg-card-subtitle">{subtitle}</span>}
        {state === "selected" && <span className="hg-card-subtitle">Previewing</span>}
      </span>

      {state === "selected" && <Check size={16} className="hg-card-check" aria-hidden="true" />}
    </button>
  );
});

export default SuitCard;
