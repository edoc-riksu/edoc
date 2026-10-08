import React from "react";

/**
 * The shared HUD button. All the styling lives in globals.css (.hud-btn and
 * friends), so plain elements can use the classes directly too. It is a plain
 * component (no "use client", no forwardRef; `ref` is a normal prop in React
 * 19), so server files like not-found.js can use it as well.
 *
 *   variant: "secondary" (default, outlined) | "primary" (solid, the one main
 *            action on a screen) | "ghost" (quiet: toolbars, skip, dismiss)
 *   tone:    "default" (follows Night/Day Vision) | "danger" | "success" | "warn"
 *   size:    "sm" | "md" (default) | "lg"
 *   icon / iconRight: a lucide icon component placed before / after the label
 *   iconOnly: square button with just the icon. Always pass aria-label.
 *   pressed: true/false for toggle buttons (sets aria-pressed)
 *   loading: shows a spinner, ignores clicks, sets aria-busy
 *   full:    fill the width of the parent
 *   chamfer: cut corners like the rest of the HUD (default true, not for iconOnly)
 *   as:      "button" (default) | "a" | next/link's Link (pass href)
 */
const TONE = { danger: "hud-btn-danger", success: "hud-btn-success", warn: "hud-btn-warn" };
const VARIANT = { primary: "hud-btn-primary", ghost: "hud-btn-ghost" };
const SIZE = { sm: "hud-btn-sm", lg: "hud-btn-lg" };
const ICON_PX = { sm: 12, md: 14, lg: 16 };

export default function Button({
  as: Tag = "button",
  variant = "secondary",
  tone = "default",
  size = "md",
  icon: Icon,
  iconRight: IconRight,
  iconOnly = false,
  pressed,
  loading = false,
  disabled = false,
  full = false,
  chamfer,
  className = "",
  children,
  onClick,
  type,
  ref,
  ...rest
}) {
  const isNativeButton = Tag === "button";
  const blocked = disabled || loading;
  const useChamfer = chamfer ?? !iconOnly;
  const px = ICON_PX[size] || ICON_PX.md;

  const classes = [
    "hud-btn",
    VARIANT[variant] || "",
    TONE[tone] || "",
    SIZE[size] || "",
    iconOnly ? "hud-btn-icon" : "",
    full ? "hud-btn-full" : "",
    useChamfer ? "scope-frame scope-frame-sm" : "",
    className
  ]
    .filter(Boolean)
    .join(" ");

  const state = {};
  if (pressed !== undefined) state["aria-pressed"] = pressed;
  if (loading) state["aria-busy"] = true;
  if (isNativeButton) {
    state.type = type || "button";
    state.disabled = blocked;
  } else if (blocked) {
    // links and other elements can't be "disabled": mark and take out of tab order
    state["aria-disabled"] = true;
    state.tabIndex = -1;
  }

  const handleClick = (e) => {
    if (blocked) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };

  return (
    <Tag ref={ref} className={classes} onClick={onClick || blocked ? handleClick : undefined} {...state} {...rest}>
      {loading ? (
        <span className="hud-btn-spinner" aria-hidden="true" />
      ) : Icon ? (
        <Icon width={px} height={px} className="shrink-0" aria-hidden="true" />
      ) : null}
      {iconOnly ? null : children}
      {!iconOnly && IconRight && !loading ? <IconRight width={px} height={px} className="shrink-0" aria-hidden="true" /> : null}
      {iconOnly && !Icon && !loading ? children : null}
    </Tag>
  );
}
