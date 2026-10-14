"use client";

import { useEffect, useRef } from "react";
import { RefreshCw, ShieldAlert } from "lucide-react";
import Button from "../../ui/Button";
import { useFocusTrap } from "../../hooks/useFocusTrap";

/**
 * Hull hit zero. Per the product's non-negotiable rule, losing always
 * teaches the concept that beat you, then offers a rematch — there is no
 * other way out of this dialog (no Escape, no overlay click) than Rematch.
 */
export default function DefeatDialog({ defeat, onRematch }) {
  const dialogRef = useRef(null);
  useFocusTrap(dialogRef, true, null);

  // Button is a plain component (no forwardRef), so focus the dialog's
  // own button through the trapped container instead of a ref on it.
  useEffect(() => {
    dialogRef.current?.querySelector("button")?.focus();
  }, []);

  return (
    <>
      <div className="cs-defeat-overlay" aria-hidden="true" />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cs-defeat-title"
        aria-describedby="cs-defeat-body"
        className="cs-defeat"
      >
        <ShieldAlert className="cs-defeat-icon" size={28} aria-hidden="true" />
        <h2 id="cs-defeat-title">Hull breached</h2>
        <p id="cs-defeat-body">
          The concept that beat you: <strong>{defeat.concept}</strong>.<br />
          {defeat.reason}
        </p>
        <Button size="lg" icon={RefreshCw} onClick={onRematch}>
          Rematch
        </Button>
      </div>
    </>
  );
}
