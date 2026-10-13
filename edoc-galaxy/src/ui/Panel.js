/**
 * Translucent glass panel: the container for cards, menus and dialogs.
 *
 *   <Panel title="Python" eyebrow="Planet 1">...</Panel>
 *   <Panel tone="teal" as="section" aria-label="Selected planet">...</Panel>
 *
 * Panels are see-through on purpose: the galaxy stays visible behind them,
 * so don't put an opaque background on a panel or on a page wrapper.
 */
export default function Panel({
  as: Tag = "div",
  tone = "default",
  size = "md",
  title,
  eyebrow,
  actions,
  className = "",
  children,
  ...rest
}) {
  const cls = ["ui-panel", `ui-panel--${tone}`, `ui-panel--${size}`, className].filter(Boolean).join(" ");
  const hasHeader = title || eyebrow || actions;
  return (
    <Tag className={cls} {...rest}>
      {hasHeader && (
        <header className="ui-panel-head">
          <div className="ui-panel-titles">
            {eyebrow && <p className="t-label">{eyebrow}</p>}
            {title && <h2 className="t-title">{title}</h2>}
          </div>
          {actions && <div className="ui-panel-actions">{actions}</div>}
        </header>
      )}
      {children}
    </Tag>
  );
}
