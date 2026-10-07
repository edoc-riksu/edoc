"use client";
import React, { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * 🕹️ COCKPIT DIAL
 * A minimal circular instrument switch — icon-first, full name kept
 * intact on a hover/focus flyout plate instead of spelled out across
 * its face. The flyout is portalled to <body> and positioned from the
 * button's live bounding box: the sidebar/header/footer chrome all use
 * the chamfered `.scope-frame` clip-path, which silently clips away
 * any child content that overflows the frame's own box — a tooltip
 * positioned the ordinary (absolute, inside the button) way would be
 * invisible outside that frame, which is exactly what was happening.
 */
export default function CockpitDial({
  icon: Icon,
  label,
  active = false,
  onClick,
  size = "md",
  tipSide = "right",
  className = "",
  ...rest
}) {
  const btnRef = useRef(null);
  const [tip, setTip] = useState(null);

  const showTip = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (tipSide === "bottom") {
      setTip({ x: r.left + r.width / 2, y: r.bottom + 9, side: "bottom" });
    } else {
      setTip({ x: r.right + 10, y: r.top + r.height / 2, side: "right" });
    }
  }, [tipSide]);
  const hideTip = useCallback(() => setTip(null), []);

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={onClick}
      onMouseEnter={showTip}
      onMouseLeave={hideTip}
      onFocus={showTip}
      onBlur={hideTip}
      data-active={active ? "true" : "false"}
      aria-label={label}
      aria-pressed={active}
      className={`cockpit-dial ${size === "sm" ? "cockpit-dial-sm" : ""} ${className}`}
      {...rest}
    >
      {Icon && <Icon className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} strokeWidth={2} />}
      {tip &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            className="cockpit-dial-tip-portal"
            style={{
              left: tip.x,
              top: tip.y,
              transform: tip.side === "bottom" ? "translate(-50%, 0)" : "translate(0, -50%)"
            }}
          >
            {label}
          </span>,
          document.body
        )}
    </button>
  );
}
