import Link from "next/link";

/**
 * The one button for the whole app.
 *
 *   <Button>Fly to Python</Button>                       teal, the main action
 *   <Button variant="secondary" icon={Settings} />       glass, for HUD controls
 *   <Button variant="ghost">Skip</Button>                text only
 *   <Button href="/">Back to the galaxy</Button>         renders a link, looks the same
 *
 * It is a plain component (no "use client"), so server pages can render it
 * too. Pass event handlers only from client components.
 */
export default function Button({
  variant = "primary",
  size = "md",
  icon: Icon,
  iconOnly = false,
  loading = false,
  full = false,
  pressed,
  href,
  className = "",
  children,
  type = "button",
  disabled,
  ...rest
}) {
  const cls = [
    "ui-btn",
    `ui-btn--${variant}`,
    `ui-btn--${size}`,
    iconOnly && "ui-btn--icon",
    full && "ui-btn--full",
    loading && "is-loading",
    className
  ]
    .filter(Boolean)
    .join(" ");

  const inner = (
    <>
      {Icon && <Icon size={size === "sm" ? 15 : iconOnly ? 18 : 16} aria-hidden="true" />}
      {!iconOnly && children != null && <span>{children}</span>}
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={cls} {...rest}>
        {inner}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={cls}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-pressed={pressed}
      {...rest}
    >
      {inner}
    </button>
  );
}
