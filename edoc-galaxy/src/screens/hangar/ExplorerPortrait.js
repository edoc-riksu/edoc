const PORTRAITS = {
  vega: "/art/hangar/pilots/vega-portrait.jpg",
  kael: "/art/hangar/pilots/kael-portrait.jpg",
  taro: "/art/hangar/pilots/taro-portrait.webp",
  mira: "/art/hangar/pilots/mira-portrait.jpg"
};
const FULL_PORTRAITS = {
  vega: "/art/hangar/pilots/vega-full.jpg",
  kael: "/art/hangar/pilots/kael-full.jpg",
  taro: "/art/hangar/pilots/taro-full.jpg",
  mira: "/art/hangar/pilots/mira-full.jpg"
};

/**
 * The real illustrated portrait for an explorer's card, used in place of the
 * generic icon tile — picking a person should feel different from picking an
 * outfit, not use the same small glyph. Always the base-suit art so the
 * portrait doesn't change with the player's current suit pick (see
 * ORIGIN.md for where this art comes from). `variant="full"` swaps in the
 * matching head-to-toe standing shot instead of the close headshot crop.
 */
export default function ExplorerPortrait({ explorer, size = 56, width, height, variant = "portrait", className }) {
  const src = (variant === "full" ? FULL_PORTRAITS : PORTRAITS)[explorer];
  if (!src) return null;
  const w = width ?? size;
  const h = height ?? size;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={`hg-portrait ${className || ""}`.trim()} width={w} height={h} style={{ width: w, height: h, objectFit: "cover" }} />
  );
}
