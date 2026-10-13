import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * The HUD bar every screen shares: "edoc > SECTION" on the left, tools on the right.
 *
 *   <TopBar section="GALAXY">{tools}</TopBar>
 *
 * `children` are the tool buttons. `overlay` is for anything that hangs off
 * the bar, such as a settings menu. Extra props (like data-nodrag) go on the
 * <header>.
 */
export default function TopBar({ section, children, overlay, ...rest }) {
  return (
    <header className="shell-top" {...rest}>
      <div className="shell-brand">
        <Link href="/" className="shell-wordmark t-display" aria-label="edoc, back to the galaxy">
          edoc
        </Link>
        <ChevronRight size={16} strokeWidth={2.4} aria-hidden="true" className="shell-crumb" />
        <h1 className="shell-section">{section}</h1>
      </div>
      {children && <div className="shell-tools">{children}</div>}
      {overlay}
    </header>
  );
}
