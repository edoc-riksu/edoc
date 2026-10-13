"use client";
import React, { useEffect, useRef } from "react";

export default function ErrorSummary({ errors, onFocusField, completionText = "continue" }) {
  const ref = useRef(null);
  const entries = Object.entries(errors || {}).filter(([, message]) => message);
  const count = entries.length;

  useEffect(() => {
    if (count > 0) ref.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(errors)]);

  if (count === 0) return null;

  return (
    <div ref={ref} tabIndex={-1} role="alert" aria-live="polite" aria-label="Error summary" className="gx-auth-summary">
      <p>
        {count} {count === 1 ? "thing needs" : "things need"} fixing before we can {completionText}.
      </p>
      {entries.map(([field, message]) => (
        <button key={field} type="button" onClick={() => onFocusField?.(field)} style={{ display: "block", textAlign: "left" }}>
          {message}
        </button>
      ))}
    </div>
  );
}
