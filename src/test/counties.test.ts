import { describe, it, expect } from "vitest";
import { countySlug, groupCountiesByRegion } from "@/lib/counties";

describe("countySlug", () => {
  it("lowercases simple names", () => {
    expect(countySlug("Mombasa")).toBe("mombasa");
  });

  it("strips apostrophes (Murang'a)", () => {
    expect(countySlug("Murang'a")).toBe("muranga");
  });

  it("replaces hyphens consistently", () => {
    expect(countySlug("Elgeyo-Marakwet")).toBe("elgeyo-marakwet");
    expect(countySlug("Tana River")).toBe("tana-river");
  });

  it("collapses multiple separators and trims", () => {
    expect(countySlug("  --Tharaka-Nithi  ")).toBe("tharaka-nithi");
  });
});

describe("groupCountiesByRegion", () => {
  const counties = [
    { name: "Mombasa", region: "Coast" },
    { name: "Nairobi", region: "Nairobi" },
    { name: "Kiambu", region: "Central" },
    { name: "Kilifi", region: "Coast" },
    { name: "Orphan", region: null },
  ];

  it("groups by region and sorts groups alphabetically", () => {
    const out = groupCountiesByRegion(counties);
    expect(out.map((g) => g.region)).toEqual(["Central", "Coast", "Nairobi", "Other"]);
  });

  it("sorts counties within a group alphabetically", () => {
    const out = groupCountiesByRegion(counties);
    const coast = out.find((g) => g.region === "Coast")!;
    expect(coast.counties.map((c) => c.name)).toEqual(["Kilifi", "Mombasa"]);
  });

  it("places null-region counties under 'Other'", () => {
    const out = groupCountiesByRegion(counties);
    expect(out.find((g) => g.region === "Other")?.counties).toHaveLength(1);
  });
});
