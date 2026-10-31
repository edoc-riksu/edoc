"use client";

import { useEffect, useRef } from "react";
import { drawPilot } from "./hangarArt";

/**
 * A small static snapshot of the same pilot figure the bay scene draws, used
 * in place of the generic icon tile on an explorer's card — picking a person
 * should feel different from picking an outfit, not use the same small glyph.
 * Always drawn in the base suit so the portrait doesn't change with the
 * player's current suit pick.
 */
export default function ExplorerPortrait({ explorer, size = 56 }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    drawPilot(ctx, size * 0.5, size * 0.9, size * 1.05, "base", explorer, 0, true);
  }, [explorer, size]);

  return <canvas ref={ref} className="hg-portrait" aria-hidden="true" style={{ width: size, height: size }} />;
}
