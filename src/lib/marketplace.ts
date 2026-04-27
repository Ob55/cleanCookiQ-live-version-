/**
 * Marketplace types + pure helpers (Workstream 2).
 *
 * The CSCC tier rule is intentionally pure so it can be unit-tested
 * without Supabase access. The shape of `selections` matches what
 * SupplierMOU.tsx writes today: a record of section_id → record of
 * item_id → boolean.
 */

export type CSCCTier = "tier_1" | "tier_2" | "tier_3" | "unrated";

export interface CSCCSelections {
  [sectionId: string]: { [itemId: string]: boolean };
}

export interface ProductCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  display_order: number;
}

export interface MarketplaceProduct {
  id: string;
  provider_id: string;
  name: string;
  description: string | null;
  price: number | null;
  price_currency: string;
  image_url: string | null;
  slug: string | null;
  sku: string | null;
  specifications: Record<string, unknown>;
  certifications: string[];
  datasheet_url: string | null;
  warranty_months: number | null;
  in_stock: boolean;
  is_listed: boolean;
  category_id: string | null;
  category_slug: string | null;
  category_name: string | null;
  provider_name: string | null;
  provider_counties: string[] | null;
  provider_verified: boolean | null;
  avg_rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
}

export interface SupplierStorefront {
  id: string;
  organisation_id: string | null;
  name: string;
  services: string[] | null;
  technology_types: string[] | null;
  counties_served: string[] | null;
  rating: number | null;
  verified: boolean | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  cscc_selections: CSCCSelections | null;
  cscc_updated_at: string | null;
  listed_product_count: number;
  service_count: number;
}

export interface MarketplaceFilters {
  category?: string | null;
  county?: string | null;
  search?: string | null;
  inStockOnly?: boolean;
  minPrice?: number | null;
  maxPrice?: number | null;
}

/**
 * CSCC tier rule.
 *
 *   Tier 3 (uncertified) — supplier has self-declared not eligible.
 *   Tier 2 (in progress) — supplier has KEBS application pending.
 *   Tier 1 (compliant)  — Section A complete AND at least one of B/C/D/E
 *                         fully complete (i.e. the supplier has fully
 *                         declared one product line: equipment, installation,
 *                         biogas, or LPG).
 *   Unrated             — no submission, or insufficient sections.
 */
export function deriveCsccTier(selections: CSCCSelections | null | undefined): CSCCTier {
  if (!selections) return "unrated";

  const tier3 = selections.section_f?.tier3_uncertified === true;
  if (tier3) return "tier_3";

  const tier2 = selections.section_f?.tier2_in_progress === true;
  if (tier2) return "tier_2";

  const sectionComplete = (id: string): boolean => {
    const items = selections[id];
    if (!items) return false;
    const values = Object.values(items);
    return values.length > 0 && values.every(Boolean);
  };

  const sectionAComplete = sectionComplete("section_a");
  const anyOfBCDE = ["section_b", "section_c", "section_d", "section_e"].some(sectionComplete);

  if (sectionAComplete && anyOfBCDE) return "tier_1";
  return "unrated";
}

const TIER_LABELS: Record<CSCCTier, string> = {
  tier_1: "Tier 1 — Compliant",
  tier_2: "Tier 2 — In Progress",
  tier_3: "Tier 3 — Uncertified",
  unrated: "Unrated",
};

const TIER_DESCRIPTIONS: Record<CSCCTier, string> = {
  tier_1: "Fully meets KEBS / EPRA / business-compliance requirements for at least one product line.",
  tier_2: "KEBS certification application in progress; provisional listing.",
  tier_3: "Supplier has self-declared no certification; not recommended for procurement.",
  unrated: "No CSCC submission on file; no compliance signal available yet.",
};

export function csccTierLabel(tier: CSCCTier): string {
  return TIER_LABELS[tier];
}

export function csccTierDescription(tier: CSCCTier): string {
  return TIER_DESCRIPTIONS[tier];
}

/**
 * Apply marketplace filters in-memory. Used both client-side and as the
 * spec for the equivalent SQL filter passed to Supabase.
 */
export function applyMarketplaceFilters(
  products: MarketplaceProduct[],
  filters: MarketplaceFilters,
): MarketplaceProduct[] {
  return products.filter((p) => {
    if (filters.category && p.category_slug !== filters.category) return false;
    if (filters.county) {
      const counties = p.provider_counties ?? [];
      if (!counties.includes(filters.county)) return false;
    }
    if (filters.inStockOnly && !p.in_stock) return false;
    if (filters.minPrice != null && (p.price ?? 0) < filters.minPrice) return false;
    if (filters.maxPrice != null && (p.price ?? Number.POSITIVE_INFINITY) > filters.maxPrice) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      if (!q) return true;
      const haystack = `${p.name} ${p.description ?? ""} ${p.sku ?? ""} ${p.provider_name ?? ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

/** URL-safe slug derived from a product or supplier name. */
export function marketplaceSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
