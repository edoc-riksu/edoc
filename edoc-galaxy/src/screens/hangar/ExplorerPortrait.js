const PORTRAITS = {
  vega: "/art/hangar/pilots/vega-portrait.jpg",
  kael: "/art/hangar/pilots/kael-portrait.jpg",
  taro: "/art/hangar/pilots/taro-portrait.webp",
  mira: "/art/hangar/pilots/mira-portrait.jpg"
};

/**
 * The real illustrated portrait for an explorer's card, used in place of the
 * generic icon tile — picking a person should feel different from picking an
 * outfit, not use the same small glyph. Always the base-suit art so the
 * portrait doesn't change with the player's current suit pick (see
 * ORIGIN.md for where this art comes from).
 */
export default function ExplorerPortrait({ explorer, size = 56 }) {
  const src = PORTRAITS[explorer];
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="hg-portrait" width={size} height={size} style={{ width: size, height: size, objectFit: "cover" }} />
  );
}
