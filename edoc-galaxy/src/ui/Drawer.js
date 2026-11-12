"use client";

import { useId } from "react";
import { X } from "lucide-react";
import Overlay from "./Overlay";
import Button from "./Button";
import "./overlay.css";

/**
 * The one drawer for the whole app: a panel that slides in from an edge
 * for something longer than a dialog - a list, a detail view, settings.
 *
 *   {open && (
 *     <Drawer title="Module details" eyebrow="Python" onClose={() => setOpen(false)}
 *             footer={<Button onClick={start}>Start</Button>}>
 *       ...content, scrolls when it is long...
 *     </Drawer>
 *   )}
 *
 * Render it only while it is open. Props:
 *   side     "right" (default) | "left" | "bottom"  - "bottom" is a sheet
 *   width    a CSS width for left/right, e.g. "420px" (default min(420px, 100%))
 *   eyebrow  a small label above the title
 *   footer   pinned below the scrolling content (the main action)
 *   dismissible, initialFocus - as for Dialog
 * It always has a close button in the header, so it can be closed by
 * keyboard, pointer and touch even when `dismissible` is false.
 */
export default function Drawer({
  title,
  eyebrow,
  side = "right",
  width,
  dismissible = true,
  onClose,
  footer,
  initialFocus,
  className = "",
  children,
}) {
  const uid = useId();
  const titleId = `${uid}-title`;
  return (
    <Overlay
      kind={`drawer ui-overlay--${side}`}
      labelledBy={titleId}
      dismissible={dismissible}
      onClose={onClose}
      initialFocus={initialFocus}
      panelClassName={`ui-drawer ${className}`.trim()}
      style={width && side !== "bottom" ? { width } : undefined}
    >
      <header className="ui-drawer-head">
        <div className="ui-drawer-titles">
          {eyebrow && <p className="t-label">{eyebrow}</p>}
          <h2 id={titleId} className="ui-drawer-title">
            {title}
          </h2>
        </div>
        <Button variant="ghost" size="sm" iconOnly icon={X} aria-label="Close" onClick={onClose} />
      </header>
      <div className="ui-drawer-body">{children}</div>
      {footer && <footer className="ui-drawer-foot">{footer}</footer>}
    </Overlay>
  );
}
