import React from "react";

/**
 * The shared glass panel for the HUD. Style lives in globals.css (.hud-panel)
 * so plain elements can use the class directly too.
 *   tone: "default" (cyan / Night-Vision accent) | "danger" | "warn"
 *   title: optional small uppercase header in Orbitron
 */
export default function Panel({ as: Tag = "div", tone = "default", title, className = "", children, ...rest }) {
  const toneClass = tone === "danger" ? "hud-panel-danger" : tone === "warn" ? "hud-panel-warn" : "";
  return (
    <Tag className={`hud-panel ${toneClass} ${className}`.trim()} {...rest}>
      {title ? <p className="hud-label px-4 pt-3">{title}</p> : null}
      {children}
    </Tag>
  );
}
