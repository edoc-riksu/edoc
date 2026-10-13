"use client";
import React from "react";
import { passwordStrength } from "../../lib/passwordStrength";

export default function StrengthMeter({ password }) {
  if (!password) return null;
  const { score, label } = passwordStrength(password);
  const pct = Math.round(((score + 1) / 4) * 100);

  return (
    <div className="gx-auth-row" style={{ gap: 10 }}>
      <div className="gx-meter" role="img" aria-label={`Password strength: ${label}`} style={{ flex: 1 }}>
        <span style={{ width: `${pct}%` }} />
      </div>
      <span className="gx-auth-helper" aria-live="polite">
        {label}
      </span>
    </div>
  );
}
