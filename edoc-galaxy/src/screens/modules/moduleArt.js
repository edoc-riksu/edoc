// Per-module seed + colour palette, so each module's procedural art is stable across
// reloads but visually distinct from its neighbours - code-generated, not stock art,
// same rule as the rest of src/art.

const PALETTES = [
  { glow: "110,250,190", stops: [[18, 90, 96], [60, 170, 140], [80, 70, 150]] },
  { glow: "120,180,255", stops: [[20, 40, 90], [60, 110, 200], [130, 90, 220]] },
  { glow: "255,170,110", stops: [[60, 30, 20], [200, 110, 60], [230, 170, 90]] },
  { glow: "230,120,200", stops: [[40, 20, 60], [150, 60, 140], [230, 120, 200]] },
  { glow: "160,255,210", stops: [[10, 60, 50], [40, 150, 110], [120, 230, 180]] }
];

function seedFor(slug) {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (Math.imul(h, 31) + slug.charCodeAt(i)) | 0;
  return h >>> 0;
}

export function moduleArtFor(slug) {
  const seed = seedFor(slug || "module");
  return { seed, palette: PALETTES[seed % PALETTES.length] };
}

