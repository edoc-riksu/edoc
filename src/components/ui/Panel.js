import React from "react";

/**
 * The shared glass panel for the HUD. All the styling lives in globals.css
 * (.hud-panel and friends), so plain elements can use the classes directly.
 *
 *   tone:      "default" (Night/Day Vision accent) | "danger" | "warn"
 *   density:   "airy" (default, galaxy shows through) | "dense" (text-heavy)
 *   elevation: "raised" (main surface) | "default" | "flat" (card inside a
 *              panel) | "inset" (a well: code output, readouts)
 *   title / icon / actions: optional header strip (title in Orbitron)
 *   interactive: hover glow + keyboard focus; the panel acts like a button
 *   active:    selected outline        locked: dimmed, not clickable
 *   scan:      slow light line (use on one key panel per screen)
 *   padding:   "md" (default) | "none" (when children bring their own)
 */
const TONE = { danger: "hud-panel-danger", warn: "hud-panel-warn" };
const ELEVATION = { raised: "hud-panel-raised", flat: "hud-panel-flat", inset: "hud-panel-inset" };

export default function Panel({
  as: Tag = "div",
  tone = "default",
  density = "airy",
  elevation = "default",
  title,
  icon: Icon,
  actions,
  interactive = false,
  active = false,
  locked = false,
  scan = false,
  padding = "md",
  className = "",
  children,
  onClick,
  onKeyDown,
  ...rest
}) {
  const clickable = (interactive || Boolean(onClick)) && !locked;
  const isNative = Tag === "button" || Tag === "a";

  const classes = [
    "hud-panel",
    TONE[tone] || "",
    density === "dense" ? "hud-panel-dense" : "",
    ELEVATION[elevation] || "",
    clickable ? "hud-panel-interactive" : "",
    active ? "hud-panel-active" : "",
    locked ? "hud-panel-locked" : "",
    scan ? "hud-panel-scan" : "",
    className
  ]
    .filter(Boolean)
    .join(" ");

  // A div that acts like a button needs a role, focus and Enter/Space.
  const a11y = {};
  if (locked) a11y["aria-disabled"] = true;
  if (clickable && !isNative) {
    a11y.role = "button";
    a11y.tabIndex = 0;
  }
  if (active) a11y["aria-current"] = "true";

  const handleKeyDown = (e) => {
    onKeyDown?.(e);
    if (clickable && !isNative && !e.defaultPrevented && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick?.(e);
    }
  };

  const hasHeader = Boolean(title || Icon || actions);
  const bodyPad = padding === "none" ? "" : "p-4";

  return (
    <Tag
      className={classes}
      onClick={locked ? undefined : onClick}
      onKeyDown={clickable && !isNative ? handleKeyDown : onKeyDown}
      {...a11y}
      {...rest}
    >
      {hasHeader && (
        <div className="hud-panel-header">
          {Icon ? <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: "rgb(var(--panel-rgb))" }} aria-hidden="true" /> : null}
          {title ? <p className="hud-label">{title}</p> : <span className="flex-1" />}
          {actions ? <div className="flex items-center gap-2 shrink-0">{actions}</div> : null}
        </div>
      )}
      {bodyPad ? <div className={bodyPad}>{children}</div> : children}
    </Tag>
  );
}
