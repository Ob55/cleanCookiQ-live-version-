import { describe, it, expect } from "vitest";
import {
  applyMarketplaceFilters,
  csccTierLabel,
  deriveCsccTier,
  marketplaceSlug,
  type CSCCSelections,
  type MarketplaceProduct,
} from "@/lib/marketplace";

const baseProduct: MarketplaceProduct = {
  id: "p1",
  provider_id: "prov1",
  name: "ECOCA Solar Cooker",
  description: "Solar-powered induction with battery",
  price: 18000,
  price_currency: "KES",
  image_url: null,
  slug: null,
  sku: "ECOCA-001",
  specifications: {},
  certifications: [],
  datasheet_url: null,
  warranty_months: 24,
  in_stock: true,
  is_listed: true,
  category_id: "c1",
  category_slug: "solar",
  category_name: "Solar Cookers",
  provider_name: "EcoMoto",
  provider_counties: ["Mombasa", "Kilifi"],
  provider_verified: true,
  avg_rating: 4.5,
  review_count: 12,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

describe("deriveCsccTier", () => {
  it("returns 'unrated' for null selections", () => {
    expect(deriveCsccTier(null)).toBe("unrated");
  });

  it("returns 'tier_3' when supplier self-declares uncertified", () => {
    const sel: CSCCSelections = {
      section_f: { tier3_uncertified: true, tier2_in_progress: false },
    };
    expect(deriveCsccTier(sel)).toBe("tier_3");
  });

  it("returns 'tier_2' for KEBS application in progress", () => {
    const sel: CSCCSelections = {
      section_f: { tier2_in_progress: true, tier3_uncertified: false },
    };
    expect(deriveCsccTier(sel)).toBe("tier_2");
  });

  it("tier_3 takes priority over tier_2 if both selected", () => {
    const sel: CSCCSelections = {
      section_f: { tier2_in_progress: true, tier3_uncertified: true },
    };
    expect(deriveCsccTier(sel)).toBe("tier_3");
  });

  it("returns 'tier_1' when section A AND any of B/C/D/E are fully complete", () => {
    const sel: CSCCSelections = {
      section_a: { biz_reg: true, kra_pin: true },
      section_b: { kebs_cert: true, warranty: true },
      section_c: {},
      section_d: {},
      section_e: {},
      section_f: {},
    };
    expect(deriveCsccTier(sel)).toBe("tier_1");
  });

  it("returns 'unrated' when section A is incomplete", () => {
    const sel: CSCCSelections = {
      section_a: { biz_reg: true, kra_pin: false },
      section_b: { kebs_cert: true },
    };
    expect(deriveCsccTier(sel)).toBe("unrated");
  });

  it("returns 'unrated' when no B/C/D/E section is complete", () => {
    const sel: CSCCSelections = {
      section_a: { biz_reg: true },
      section_b: { kebs_cert: true, warranty: false },
    };
    expect(deriveCsccTier(sel)).toBe("unrated");
  });
});

describe("csccTierLabel", () => {
  it("renders human labels for every tier", () => {
    expect(csccTierLabel("tier_1")).toMatch(/Compliant/);
    expect(csccTierLabel("tier_2")).toMatch(/In Progress/);
    expect(csccTierLabel("tier_3")).toMatch(/Uncertified/);
    expect(csccTierLabel("unrated")).toBe("Unrated");
  });
});

describe("applyMarketplaceFilters", () => {
  const products = [
    baseProduct,
    {
      ...baseProduct,
      id: "p2",
      name: "LPG Burner",
      description: "Industrial-grade LPG cookstove",
      sku: "LPG-200",
      price: 4500,
      category_slug: "lpg",
      category_name: "LPG",
      provider_counties: ["Nairobi"],
      in_stock: false,
    },
  ];

  it("returns all when no filters apply", () => {
    expect(applyMarketplaceFilters(products, {})).toHaveLength(2);
  });

  it("filters by category slug", () => {
    const out = applyMarketplaceFilters(products, { category: "solar" });
    expect(out.map((p) => p.id)).toEqual(["p1"]);
  });

  it("filters by county served", () => {
    expect(applyMarketplaceFilters(products, { county: "Nairobi" })).toHaveLength(1);
    expect(applyMarketplaceFilters(products, { county: "Mombasa" })).toHaveLength(1);
    expect(applyMarketplaceFilters(products, { county: "Kisumu" })).toHaveLength(0);
  });

  it("filters out-of-stock when inStockOnly is true", () => {
    expect(applyMarketplaceFilters(products, { inStockOnly: true })).toHaveLength(1);
  });

  it("matches search across name, description, sku, provider", () => {
    expect(applyMarketplaceFilters(products, { search: "ecoca" })).toHaveLength(1);
    expect(applyMarketplaceFilters(products, { search: "ecomoto" })).toHaveLength(2); // both have provider EcoMoto
    expect(applyMarketplaceFilters(products, { search: "burner" })).toHaveLength(1);
    expect(applyMarketplaceFilters(products, { search: "" })).toHaveLength(2);
  });

  it("respects price bounds", () => {
    expect(applyMarketplaceFilters(products, { minPrice: 5000 })).toHaveLength(1);
    expect(applyMarketplaceFilters(products, { maxPrice: 5000 })).toHaveLength(1);
  });
});

describe("marketplaceSlug", () => {
  it("converts a name to a URL-safe slug", () => {
    expect(marketplaceSlug("EcoMoto Industries Ltd.")).toBe("ecomoto-industries-ltd");
    expect(marketplaceSlug("ECOCA Solar 001")).toBe("ecoca-solar-001");
  });
});
