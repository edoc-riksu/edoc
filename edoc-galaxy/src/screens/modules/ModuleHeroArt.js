"use client";

/**
 * Hero art for the module detail panel. Keyed by slug so each module gets
 * its own art once it exists; falls back to the Python Basics art (the
 * only art generated so far) if a given slug's file is missing, rather
 * than a broken image icon.
 */
export default function ModuleHeroArt({ slug = "python-basics", className }) {
  const fallback = "/art/modules/python-basics.jpg";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/art/modules/${slug}.jpg`}
      alt={`${slug} module art`}
      className={`ml-hero-art-img ${className || ""}`.trim()}
      onError={(e) => {
        if (e.currentTarget.src.endsWith(fallback)) return;
        e.currentTarget.src = fallback;
      }}
    />
  );
}
