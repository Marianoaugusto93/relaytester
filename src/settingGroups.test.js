import { describe, it, expect } from "vitest";
import {
  GROUP_COUNT,
  GROUP_LABELS,
  mkGroups,
  normalizeGroups,
  clampGroupIdx,
  applyGroupSwitch,
  copyGroupPure,
} from "./settingGroups.js";
import { deepClone } from "./defaults.js";

// Simples objeto de proteção fake para testes
const fakeProt = () => ({
  "51": { enabled: true, stages: [{ id: "51-1", pickup: 5 }] },
  "50": { enabled: false, stages: [{ id: "50-1", pickup: 10 }] },
});

describe("settingGroups — GROUP_COUNT e GROUP_LABELS", () => {
  it("GROUP_COUNT equals 4", () => {
    expect(GROUP_COUNT).toBe(4);
  });

  it("GROUP_LABELS = [G1, G2, G3, G4]", () => {
    expect(GROUP_LABELS).toEqual(["G1", "G2", "G3", "G4"]);
  });
});

describe("settingGroups — mkGroups", () => {
  it("returns 4 independent clones of prot", () => {
    const p = fakeProt();
    const groups = mkGroups(p);

    expect(groups).toHaveLength(4);
    groups.forEach((g) => {
      expect(g).toEqual(p);
      expect(g).not.toBe(p); // independent clone
    });
  });

  it("mutating one group does not affect others", () => {
    const p = fakeProt();
    const groups = mkGroups(p);

    // Mutate group 0
    groups[0]["51"].stages[0].pickup = 999;

    // Check other groups are unchanged
    expect(groups[1]["51"].stages[0].pickup).toBe(5);
    expect(groups[2]["51"].stages[0].pickup).toBe(5);
    expect(groups[3]["51"].stages[0].pickup).toBe(5);
    // Original is unchanged
    expect(p["51"].stages[0].pickup).toBe(5);
  });
});

describe("settingGroups — normalizeGroups", () => {
  it("null/undefined groups → 4 clones of prot", () => {
    const p = fakeProt();
    const result1 = normalizeGroups(null, p);
    const result2 = normalizeGroups(undefined, p);

    expect(result1).toHaveLength(4);
    expect(result2).toHaveLength(4);
    result1.forEach((g) => expect(g).toEqual(p));
    result2.forEach((g) => expect(g).toEqual(p));
  });

  it("empty array → 4 clones of prot", () => {
    const p = fakeProt();
    const result = normalizeGroups([], p);

    expect(result).toHaveLength(4);
    result.forEach((g) => expect(g).toEqual(p));
  });

  it("array with 2 items → fills missing 2 slots with clones of prot", () => {
    const p = fakeProt();
    const g0 = { "51": { enabled: true, stages: [{ id: "51-1", pickup: 7 }] } };
    const g1 = { "51": { enabled: false, stages: [{ id: "51-1", pickup: 9 }] } };

    const result = normalizeGroups([g0, g1], p);

    expect(result).toHaveLength(4);
    expect(result[0]).toEqual(g0);
    expect(result[1]).toEqual(g1);
    expect(result[2]).toEqual(p);
    expect(result[3]).toEqual(p);
  });

  it("array with >4 items → truncates to 4", () => {
    const p = fakeProt();
    const input = [
      { "51": { enabled: true } },
      { "51": { enabled: false } },
      { "51": { enabled: true } },
      { "51": { enabled: false } },
      { "51": { enabled: true } }, // Extra
      { "51": { enabled: false } }, // Extra
    ];

    const result = normalizeGroups(input, p);

    expect(result).toHaveLength(4);
  });
});

describe("settingGroups — clampGroupIdx", () => {
  it("NaN → 0", () => {
    expect(clampGroupIdx(NaN)).toBe(0);
  });

  it("negative → 0", () => {
    expect(clampGroupIdx(-1)).toBe(0);
    expect(clampGroupIdx(-100)).toBe(0);
  });

  it(">= 4 → 3", () => {
    expect(clampGroupIdx(4)).toBe(3);
    expect(clampGroupIdx(100)).toBe(3);
  });

  it("valid index in [0,3] → returns as-is", () => {
    expect(clampGroupIdx(0)).toBe(0);
    expect(clampGroupIdx(1)).toBe(1);
    expect(clampGroupIdx(2)).toBe(2);
    expect(clampGroupIdx(3)).toBe(3);
  });

  it("parses string to number (e.g., '2') → 2", () => {
    expect(clampGroupIdx("2")).toBe(2);
  });

  it("truncates floats (e.g., 2.9) → 2", () => {
    expect(clampGroupIdx(2.9)).toBe(2);
  });
});

describe("settingGroups — applyGroupSwitch", () => {
  it("switches active group and saves edits in old slot", () => {
    const p = fakeProt();
    const groups = mkGroups(p);

    // Mutate the protection object to simulate ongoing edits
    p["51"].stages[0].pickup = 7;

    // Switch from group 0 to group 1
    const result = applyGroupSwitch(groups, 0, p, 1);

    // Old slot (0) should have the mutated prot
    expect(result.groups[0]["51"].stages[0].pickup).toBe(7);
    // New active slot should be 1
    expect(result.active).toBe(1);
    // New prot should be a clone of group 1 (not the same object)
    expect(result.prot).toEqual(groups[1]);
    expect(result.prot).not.toBe(groups[1]);
  });

  it("switching to same group returns fresh clone of snapshot", () => {
    const p = fakeProt();
    p["51"].stages[0].pickup = 8;
    const groups = mkGroups(p);

    const result = applyGroupSwitch(groups, 1, p, 1);

    // Should still switch internally (save edits, return clone)
    expect(result.active).toBe(1);
    expect(result.prot).toEqual(p);
    expect(result.prot).not.toBe(p); // fresh clone
  });

  it("returned prot is independent (mutations don't affect groups)", () => {
    const p = fakeProt();
    const groups = mkGroups(p);

    const result = applyGroupSwitch(groups, 0, p, 1);

    // Mutate returned prot
    result.prot["51"].stages[0].pickup = 999;

    // groups[1] should be unchanged
    expect(result.groups[1]["51"].stages[0].pickup).toBe(5);
  });

  it("clamps source and destination indices", () => {
    const p = fakeProt();
    const groups = mkGroups(p);

    // Try to switch from -1 (clamped to 0) to 100 (clamped to 3)
    const result = applyGroupSwitch(groups, -1, p, 100);

    expect(result.active).toBe(3);
    expect(result.groups.length).toBe(4);
  });
});

describe("settingGroups — copyGroupPure", () => {
  it("copies from→to (deep clone); syncs active slot first", () => {
    const p = fakeProt();
    const groups = mkGroups(p);

    // Mutate source group to be different
    groups[0]["51"].stages[0].pickup = 10;
    // Edit the active prot
    p["51"].stages[0].pickup = 7;

    // Copy from group 0 to group 2 (active is 0)
    const result = copyGroupPure(groups, 0, p, 0, 2);

    // Group 0 should now have the edited prot (7)
    expect(result.groups[0]["51"].stages[0].pickup).toBe(7);
    // Group 2 should be cloned from group 0 (now 7)
    expect(result.groups[2]["51"].stages[0].pickup).toBe(7);
  });

  it("if destination is active, prot is updated to reflect copy", () => {
    const p = fakeProt();
    const groups = mkGroups(p);

    groups[0]["51"].stages[0].pickup = 10;
    groups[1]["51"].stages[0].pickup = 99;
    p["51"].stages[0].pickup = 7; // current active prot being edited
    // Active is 1

    const result = copyGroupPure(groups, 1, p, 0, 1);

    // Group 1 is active, so:
    // 1. next[1] = deepClone(prot) → group 1 synced to 7
    // 2. next[1] = deepClone(next[0]) → group 1 now cloned from group 0 (which is 10)
    // 3. prot is updated to deepClone(next[1]) → prot is now 10 (clone of new group 1)
    expect(result.prot["51"].stages[0].pickup).toBe(10);
  });

  it("if destination is not active, prot stays the same object", () => {
    const p = fakeProt();
    const groups = mkGroups(p);

    groups[0]["51"].stages[0].pickup = 10;
    groups[2]["51"].stages[0].pickup = 99;
    p["51"].stages[0].pickup = 7;
    // Active is 0

    const result = copyGroupPure(groups, 0, p, 1, 2);

    // Destination (2) is not active, so prot is unchanged (same object)
    expect(result.prot).toBe(p);
    // But group 2 should now be a clone of group 1
    expect(result.groups[2]).toEqual(result.groups[1]);
  });

  it("clamps from and to indices", () => {
    const p = fakeProt();
    const groups = mkGroups(p);

    // Copy from -1 (clamped to 0) to 100 (clamped to 3)
    const result = copyGroupPure(groups, 0, p, -1, 100);

    expect(result.groups[3]).toEqual(result.groups[0]);
    expect(result.groups.length).toBe(4);
  });

  it("when copying from active to non-active, prot is the input object", () => {
    const p = fakeProt();
    const groups = mkGroups(p);

    groups[0]["51"].stages[0].pickup = 10;
    p["51"].stages[0].pickup = 7; // active prot being edited
    // active is 0, copying from 0 to 2 (not active)

    const result = copyGroupPure(groups, 0, p, 0, 2);

    // next[0] = deepClone(p) → syncs active slot to current prot (7)
    // next[2] = deepClone(next[0]) → copies the synced value (7)
    expect(result.groups[0]["51"].stages[0].pickup).toBe(7);
    expect(result.groups[2]["51"].stages[0].pickup).toBe(7);
    // prot is unchanged (same object) because destination (2) is not active (0)
    expect(result.prot).toBe(p);
  });
});
