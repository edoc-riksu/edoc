import { describe, expect, it } from "vitest";
import { artPreviewsOpen } from "./previewAccess";

describe("artPreviewsOpen", () => {
  it("is open when developing", () => {
    expect(artPreviewsOpen({ NODE_ENV: "development" })).toBe(true);
  });
  it("is open on Vercel preview builds", () => {
    expect(artPreviewsOpen({ VERCEL_ENV: "preview" })).toBe(true);
  });
  it("is closed on the live production site", () => {
    expect(artPreviewsOpen({ VERCEL_ENV: "production" })).toBe(false);
  });
  it("can be opened on purpose", () => {
    expect(artPreviewsOpen({ VERCEL_ENV: "production", SHOW_ART_PREVIEWS: "1" })).toBe(true);
  });
});
