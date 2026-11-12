"use client";

import { useId } from "react";
import Overlay from "./Overlay";
import "./overlay.css";

/**
 * The one dialog for the whole app: a small centred panel over a dimmed
 * scrim, for a question or a message that needs an answer.
 *
 *   {open && (
 *     <Dialog
 *       icon={LogOut}
 *       title="Exit edoc?"
 *       onClose={() => setOpen(false)}
 *       actions={<>
 *         <Button variant="secondary" onClick={stay}>Stay</Button>
 *         <Button onClick={exit}>Exit</Button>
 *       </>}
 *     >
 *       Your progress is saved to your account.
 *     </Dialog>
 *   )}
 *
 * Render it only while it is open (it is mounted, not hidden). Props:
 *   tone         "default" | "teal" | "danger"  - the border and icon colour
 *   alert        true for a message that must be answered: role="alertdialog"
 *   dismissible  false turns off Escape and the scrim click
 *   align        "start" (default) | "center"   - text and icon alignment
 *   actions      the buttons, laid out in a row at the bottom
 *   initialFocus a CSS selector for the element to focus first
 * Children are the body text. Keep it to a sentence or two.
 */
export default function Dialog({
  title,
  icon: Icon,
  tone = "default",
  alert = false,
  align = "start",
  dismissible = true,
  onClose,
  actions,
  initialFocus,
  className = "",
  children,
}) {
  const uid = useId();
  const titleId = `${uid}-title`;
  const bodyId = `${uid}-body`;
  return (
    <Overlay
      kind="dialog"
      role={alert ? "alertdialog" : "dialog"}
      labelledBy={titleId}
      describedBy={children ? bodyId : undefined}
      dismissible={dismissible}
      onClose={onClose}
      initialFocus={initialFocus}
      panelClassName={`ui-dialog ui-dialog--${tone} ui-dialog--${align} ${className}`.trim()}
    >
      {Icon && (
        <span className="ui-dialog-icon" aria-hidden="true">
          <Icon size={20} />
        </span>
      )}
      <h2 id={titleId} className="ui-dialog-title">
        {title}
      </h2>
      {children && (
        <div id={bodyId} className="ui-dialog-body">
          {children}
        </div>
      )}
      {actions && <div className="ui-dialog-actions">{actions}</div>}
    </Overlay>
  );
}
