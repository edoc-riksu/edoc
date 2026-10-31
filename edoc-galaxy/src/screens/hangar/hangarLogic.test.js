import { describe, expect, it } from "vitest";
import { getCardVisualState, getEquipButtonState, getUnlockDetail } from "./hangarLogic";

describe("getUnlockDetail", () => {
  it("falls back before module stats load", () => {
    expect(getUnlockDetail(null)).toBe("finish a module");
  });

  it("reports progress once module stats load", () => {
    expect(getUnlockDetail({ done: 2, total: 6 })).toBe("finish a module (2 of 6 modules done)");
  });
});

describe("getCardVisualState", () => {
  it("is locked even if it happens to be previewed", () => {
    expect(getCardVisualState({ locked: true, isEquipped: false, isPreviewed: true })).toBe("locked");
  });

  it("is equipped when it matches the saved loadout", () => {
    expect(getCardVisualState({ locked: false, isEquipped: true, isPreviewed: true })).toBe("equipped");
  });

  it("is selected when previewed but not the saved loadout", () => {
    expect(getCardVisualState({ locked: false, isEquipped: false, isPreviewed: true })).toBe("selected");
  });

  it("is available otherwise", () => {
    expect(getCardVisualState({ locked: false, isEquipped: false, isPreviewed: false })).toBe("available");
  });
});

describe("getEquipButtonState", () => {
  it("is Locked and disabled when previewing a locked suit", () => {
    expect(getEquipButtonState({ previewLocked: true, previewMatchesEquipped: false })).toEqual({
      label: "Locked",
      disabled: true,
      locked: true
    });
  });

  it("is Equipped and disabled when the preview matches the saved loadout", () => {
    expect(getEquipButtonState({ previewLocked: false, previewMatchesEquipped: true })).toEqual({
      label: "Equipped",
      disabled: true,
      locked: false
    });
  });

  it("is Equip and enabled for an unlocked, unequipped preview", () => {
    expect(getEquipButtonState({ previewLocked: false, previewMatchesEquipped: false })).toEqual({
      label: "Equip",
      disabled: false,
      locked: false
    });
  });

  it("is Equipped, not Locked, when a player's own equipped suit briefly re-checks as locked", () => {
    // Can happen right after a reload: previewMatchesEquipped is already true
    // from the saved loadout, but starfarerUnlocked hasn't finished loading
    // yet, so previewLocked is also momentarily true. The player's own
    // equipped choice must never read as locked.
    expect(getEquipButtonState({ previewLocked: true, previewMatchesEquipped: true })).toEqual({
      label: "Equipped",
      disabled: true,
      locked: false
    });
  });
});
