import { describe, it, expect } from "vitest";
import { institutionLabel, institutionLabelOrNull } from "@/lib/institutionDisplay";

describe("institutionLabel — default (abstracted) view", () => {
  it("returns the code for funder/supplier/researcher/CSR views", () => {
    expect(institutionLabel({ institution_code: "CCQ-NRB-0042", institution_name: "St Mary's High School" }))
      .toBe("CCQ-NRB-0042");
  });

  it("falls back when no code is present (does NOT leak the name)", () => {
    expect(institutionLabel({ institution_name: "Sensitive Name" })).toBe("—");
  });

  it("falls back with the supplied label when provided", () => {
    expect(institutionLabel({ institution_name: "Sensitive Name" }, { fallback: "Unknown" }))
      .toBe("Unknown");
  });

  it("handles null/undefined safely", () => {
    expect(institutionLabel(null)).toBe("—");
    expect(institutionLabel(undefined)).toBe("—");
  });

  it("accepts the alternate { code, name } shape used by researcher views", () => {
    expect(institutionLabel({ code: "CCQ-MSA-0007", name: "Anything" })).toBe("CCQ-MSA-0007");
  });
});

describe("institutionLabel — revealName=true (admin / own view)", () => {
  it("returns the name when revealName is set", () => {
    expect(institutionLabel(
      { institution_code: "CCQ-NRB-0042", institution_name: "St Mary's" },
      { revealName: true },
    )).toBe("St Mary's");
  });

  it("falls back to code when revealName is set but name is missing", () => {
    expect(institutionLabel({ institution_code: "CCQ-NRB-0042" }, { revealName: true }))
      .toBe("CCQ-NRB-0042");
  });

  it("falls back to the fallback when neither name nor code exist", () => {
    expect(institutionLabel({}, { revealName: true })).toBe("—");
  });
});

describe("institutionLabelOrNull", () => {
  it("returns null when no code is present (so callers can conditionally render)", () => {
    expect(institutionLabelOrNull({})).toBeNull();
    expect(institutionLabelOrNull(null)).toBeNull();
  });

  it("returns the code when present", () => {
    expect(institutionLabelOrNull({ institution_code: "CCQ-NRB-0042" })).toBe("CCQ-NRB-0042");
  });
});
