"use client";
import { useEffect } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Keeps Tab/Shift+Tab cycling within `containerRef` while `active` is
 *  true, and calls `onEscape` (if given) on the Escape key. */
export function useFocusTrap(containerRef, active, onEscape) {
  useEffect(() => {
    if (!active || !containerRef.current) return undefined;
    const container = containerRef.current;

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && onEscape) {
        onEscape();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (!container.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [containerRef, active, onEscape]);
}
