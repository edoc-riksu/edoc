/**
 * The /art review pages hold mock data and tuning switches for the scenes.
 * They stay open while developing and on Vercel preview builds (so a
 * reviewer can open them), and are closed on the live production site.
 * Set SHOW_ART_PREVIEWS=1 to open them anywhere.
 */
export function artPreviewsOpen(env = process.env) {
  if (env.SHOW_ART_PREVIEWS === "1") return true;
  return env.VERCEL_ENV !== "production";
}
