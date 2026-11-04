"use client";

/**
 * Thumbnail badge for the module card on the module list page. Keyed by
 * slug so each module gets its own art once it exists; falls back to the
 * Python Basics badge (the only art generated so far) if a given slug's
 * file is missing, rather than a broken image icon.
 */
export default function ModuleBadge({ slug = "python-basics", className }) {
  const fallback = "/art/modules/python-basics-badge.jpg";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/art/modules/${slug}-badge.jpg`}
      alt={`${slug} badge`}
      className={`ml-card-icon-img ${className || ""}`.trim()}
      onError={(e) => {
        if (e.currentTarget.src.endsWith(fallback)) return;
        e.currentTarget.src = fallback;
      }}
    />
  );
}
