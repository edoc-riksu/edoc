"use client";

import { useEffect, useRef } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";

/* How many overlays are open at once, so the page only unlocks scrolling
   when the last one closes. */
let openCount = 0;
let savedOverflow = "";

/**
 * The shared behaviour behind Dialog and Drawer: a dimmed scrim, a trapped
 * Tab, Escape and scrim click to dismiss, the page behind locked from
 * scrolling, and focus handed back to whatever opened it.
 *
 * Use <Dialog> or <Drawer>; this is not meant to be rendered on its own.
 *
 * - `dismissible={false}` turns off Escape and the scrim click (a defeat
 *   screen that must be answered, say). Keep a visible button that closes it.
 * - Focus goes to the element matching `initialFocus` (a CSS selector), or
 *   to the first button inside. When it closes, focus returns to the
 *   element that had it before it opened.
 */
export default function Overlay({
  kind,
  role = "dialog",
  labelledBy,
  describedBy,
  label,
  dismissible = true,
  onClose,
  initialFocus,
  panelClassName = "",
  children,
  ...rest
}) {
  const panelRef = useRef(null);
  useFocusTrap(panelRef, true, dismissible ? onClose : null);

  useEffect(() => {
    const opener = document.activeElement;
    if (openCount === 0) {
      savedOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    openCount += 1;

    const panel = panelRef.current;
    const target = (initialFocus && panel?.querySelector(initialFocus)) || panel?.querySelector("button") || panel;
    target?.focus({ preventScroll: true });

    return () => {
      openCount -= 1;
      if (openCount === 0) document.body.style.overflow = savedOverflow;
      if (opener && typeof opener.focus === "function" && document.contains(opener)) {
        opener.focus({ preventScroll: true });
      }
    };
    // Runs once per open: the overlay is mounted only while it is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`ui-overlay ui-overlay--${kind}`}
      onMouseDown={(ev) => {
        // Only a press that starts on the scrim itself closes it, so
        // dragging a text selection out of the panel does not.
        if (dismissible && ev.target === ev.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-label={label}
        aria-labelledby={label ? undefined : labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={`ui-overlay-panel ${panelClassName}`.trim()}
        {...rest}
      >
        {children}
      </div>
    </div>
  );
}
