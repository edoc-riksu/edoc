"use client";

import { useEffect, useRef } from "react";
import { LogOut } from "lucide-react";
import Button from "../../ui/Button";
import { useFocusTrap } from "../../hooks/useFocusTrap";

/**
 * Confirms sign-out before it happens - progress is saved either way, but
 * leaving mid-session deserves a deliberate second step rather than a
 * stray click on the sign-out icon. Escape or a click on the scrim both
 * count as "Stay"; focus returns to the sign-out button that opened this.
 */
export default function ExitDialog({ onStay, onExit, exiting }) {
  const dialogRef = useRef(null);
  useFocusTrap(dialogRef, true, onStay);

  // Button is a plain component (no forwardRef) - focus its first rendered
  // button ("Stay") through the trapped container instead of a ref on it.
  useEffect(() => {
    dialogRef.current?.querySelector("button")?.focus();
    return () => {
      document.querySelector('[aria-label="Sign out"]')?.focus();
    };
  }, []);

  return (
    <div className="profile-exit-scrim" onClick={onStay}>
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="profile-exit-title"
        aria-describedby="profile-exit-body"
        className="profile-exit-dialog"
        onClick={(ev) => ev.stopPropagation()}
      >
        <span className="profile-exit-icon" aria-hidden="true">
          <LogOut size={20} />
        </span>
        <h2 id="profile-exit-title">Exit edoc?</h2>
        <p id="profile-exit-body">Your progress is saved to your account. You&rsquo;ll pick up exactly where you left off next time.</p>
        <div className="profile-exit-actions">
          <Button variant="secondary" onClick={onStay} disabled={exiting}>
            Stay
          </Button>
          <Button onClick={onExit} loading={exiting}>
            Exit
          </Button>
        </div>
      </div>
    </div>
  );
}
