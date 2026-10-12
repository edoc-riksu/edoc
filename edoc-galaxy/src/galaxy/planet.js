import { makeSkin } from "./noise";

const TAU = Math.PI * 2;

/**
 * Three grey skins, each twice as wide as it needs to be (so a turning
 * planet never has to wrap): soft clouds, gas-giant bands, rough craters.
 */
export function makeSkins() {
  const specs = [
    { seed: 3, octaves: 5, scale: 4, contrast: 1.7, bands: 1 },
    { seed: 9, octaves: 5, scale: 5, contrast: 2.0, bands: 2.6 },
    { seed: 21, octaves: 5, scale: 8, contrast: 2.5, bands: 1 }
  ];
  return specs.map((spec) => {
    const one = makeSkin(512, 256, spec);
    const two = document.createElement("canvas");
    two.width = 1024;
    two.height = 256;
    const c = two.getContext("2d");
    c.drawImage(one, 0, 0);
    c.drawImage(one, 512, 0);
    return two;
  });
}

let scratchCanvas = null;
function scratch(size) {
  if (!scratchCanvas) scratchCanvas = document.createElement("canvas");
  if (scratchCanvas.width < size || scratchCanvas.height < size) {
    scratchCanvas.width = Math.max(size, 520);
    scratchCanvas.height = Math.max(size, 520);
  }
  return scratchCanvas;
}

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/**
 * Paint one planet into a square canvas of size B. The planet itself takes
 * up 80% of the width, leaving room for its glow. `rot` (0..1) is how far
 * it has turned: the skin is wrapped round a sphere, strip by strip, so the
 * clouds really do curve and slide as it spins.
 */
export function drawPlanet(ctx, B, palette, charted, skin, rot) {
  const c = B / 2;
  const rad = B * 0.4;
  ctx.clearRect(0, 0, B, B);

  // atmosphere
  let g = ctx.createRadialGradient(c, c, rad * 0.9, c, c, rad * 1.26);
  g.addColorStop(0, rgba(palette.glow, charted ? 0.42 : 0.16));
  g.addColorStop(1, rgba(palette.glow, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, B, B);

  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, rad, 0, TAU);
  ctx.clip();

  // body colour, lit from the upper left
  g = ctx.createRadialGradient(c - rad * 0.35, c - rad * 0.4, rad * 0.1, c, c, rad * 1.08);
  g.addColorStop(0, palette.light);
  g.addColorStop(0.5, palette.mid);
  g.addColorStop(1, palette.dark);
  ctx.fillStyle = g;
  ctx.fillRect(c - rad, c - rad, rad * 2, rad * 2);

  // the skin, wrapped round the sphere. Strips go onto a scratch canvas
  // first (opaque, overlapping) so no seams or double-blended lines show.
  if (skin) {
    const strips = Math.max(24, Math.min(90, Math.round(rad / 1.6)));
    const tw = skin.width / 2;
    const th = skin.height;
    const sc = scratch(Math.ceil(rad * 2));
    const sx0 = sc.getContext("2d");
    const side = Math.ceil(rad * 2);
    sx0.clearRect(0, 0, side, side);
    for (let i = 0; i < strips; i += 1) {
      const x0 = -rad + (i * 2 * rad) / strips;
      const x1 = -rad + ((i + 1) * 2 * rad) / strips;
      const a0 = Math.asin(x0 / rad);
      const a1 = Math.asin(Math.min(1, x1 / rad));
      const sx = (((a0 + Math.PI / 2) / TAU + rot) % 1) * tw;
      const sw = Math.max(1, ((a1 - a0) / TAU) * tw);
      sx0.drawImage(skin, sx, 0, sw, th, x0 + rad, 0, x1 - x0 + 1.2, rad * 2);
    }
    ctx.globalCompositeOperation = "soft-light";
    ctx.globalAlpha = charted ? 0.75 : 0.9;
    ctx.drawImage(sc, 0, 0, side, side, c - rad, c - rad, rad * 2, rad * 2);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  // shadow side and a soft highlight
  g = ctx.createRadialGradient(c - rad * 0.38, c - rad * 0.42, rad * 0.35, c - rad * 0.1, c - rad * 0.1, rad * 1.15);
  g.addColorStop(0, "rgba(2,6,23,0)");
  g.addColorStop(0.62, "rgba(2,6,23,0.42)");
  g.addColorStop(1, "rgba(2,6,23,0.82)");
  ctx.fillStyle = g;
  ctx.fillRect(c - rad, c - rad, rad * 2, rad * 2);

  g = ctx.createRadialGradient(c - rad * 0.4, c - rad * 0.45, 0, c - rad * 0.4, c - rad * 0.45, rad * 0.5);
  g.addColorStop(0, `rgba(255,255,255,${charted ? 0.26 : 0.13})`);
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(c - rad, c - rad, rad * 2, rad * 2);
  ctx.restore();

  // thin rim light on the lit edge
  ctx.strokeStyle = rgba(palette.light, charted ? 0.32 : 0.16);
  ctx.lineWidth = Math.max(1, B / 200);
  ctx.beginPath();
  ctx.arc(c, c, rad - 0.5, 0, TAU);
  ctx.stroke();
}
