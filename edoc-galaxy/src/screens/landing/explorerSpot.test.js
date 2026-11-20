import { describe, it, expect } from "vitest";
import { explorerSpot } from "./explorerSpot";

describe("explorerSpot", () => {
  it("stands behind the ship's tail on a wide window, looking toward it", () => {
    const s = explorerSpot(1280, 720);
    expect(s.left + s.width).toBeLessThan(256); // the ship's centre is at 20% of the width
    expect(s.left).toBeGreaterThanOrEqual(8);
    expect(s.toward).toBeGreaterThan(0);
  });

  it("stands in front of the nose on a phone, looking back at it", () => {
    const s = explorerSpot(390, 780);
    expect(s.left).toBeGreaterThan(195);
    expect(s.left + s.width).toBeLessThanOrEqual(390);
    expect(s.toward).toBeLessThan(0);
  });

  it("stays on screen and on the ground for any window", () => {
    for (const [W, h] of [[1920, 1080], [1024, 600], [800, 380], [360, 640], [600, 900]]) {
      const s = explorerSpot(W, h);
      expect(s.left).toBeGreaterThanOrEqual(0);
      expect(s.left + s.width).toBeLessThanOrEqual(W);
      expect(s.top + s.height).toBeLessThan(h);
      expect(s.height).toBeGreaterThan(40);
    }
  });
});
