import { describe, it, expect } from "vitest";
import {
  resolveDataPoint,
  formatSourceCitation,
  type DataPoint,
} from "@/lib/dataPoints";

const base: Omit<DataPoint, "id" | "metric_key" | "fuel_type" | "county_id" | "value_numeric"> = {
  value_text: null,
  unit: "KSh/kg",
  county_name: null,
  county_code: null,
  source_id: "src-1",
  source_slug: "test-source",
  source_title: "Test Source",
  source_publisher: "Test Publisher",
  source_url: "https://example.org",
  source_confidence: "medium",
  valid_from: "2026-01-01",
  valid_until: null,
  notes: null,
};

function dp(overrides: Partial<DataPoint>): DataPoint {
  return {
    id: "x",
    metric_key: "fuel.cost_per_unit",
    fuel_type: null,
    county_id: null,
    value_numeric: 0,
    ...base,
    ...overrides,
  };
}

describe("resolveDataPoint", () => {
  it("returns null for empty candidate set", () => {
    expect(
      resolveDataPoint([], { metricKey: "fuel.cost_per_unit", fuel: "lpg" }),
    ).toBeNull();
  });

  it("returns null when metric_key does not match", () => {
    const candidates = [dp({ metric_key: "other.key", value_numeric: 99 })];
    expect(
      resolveDataPoint(candidates, { metricKey: "fuel.cost_per_unit" }),
    ).toBeNull();
  });

  it("prefers county+fuel exact match over fuel-only", () => {
    const candidates = [
      dp({ id: "a", fuel_type: "lpg", value_numeric: 250 }), // national fuel
      dp({ id: "b", fuel_type: "lpg", county_id: "c1", value_numeric: 270 }), // county+fuel
    ];
    const out = resolveDataPoint(candidates, {
      metricKey: "fuel.cost_per_unit",
      fuel: "lpg",
      countyId: "c1",
    });
    expect(out?.id).toBe("b");
    expect(out?.value_numeric).toBe(270);
  });

  it("falls back to national fuel when county-specific is missing", () => {
    const candidates = [
      dp({ id: "a", fuel_type: "lpg", value_numeric: 250 }),
      dp({ id: "b", fuel_type: "charcoal", county_id: "c1", value_numeric: 99 }),
    ];
    const out = resolveDataPoint(candidates, {
      metricKey: "fuel.cost_per_unit",
      fuel: "lpg",
      countyId: "c1",
    });
    expect(out?.id).toBe("a");
  });

  it("returns generic national entry when fuel is undefined", () => {
    const candidates = [
      dp({ id: "a", fuel_type: "lpg", value_numeric: 250 }),
      dp({ id: "b", fuel_type: null, value_numeric: 0.4 }),
    ];
    const out = resolveDataPoint(candidates, {
      metricKey: "fuel.cost_per_unit",
    });
    expect(out?.id).toBe("b");
  });

  it("handles county-only (no fuel) lookup", () => {
    const candidates = [
      dp({ id: "a", fuel_type: null, county_id: null, value_numeric: 0.4 }),
      dp({ id: "b", fuel_type: null, county_id: "c1", value_numeric: 0.45 }),
    ];
    const out = resolveDataPoint(candidates, {
      metricKey: "fuel.cost_per_unit",
      countyId: "c1",
    });
    expect(out?.id).toBe("b");
  });
});

describe("formatSourceCitation", () => {
  it("includes publisher and date", () => {
    const point = dp({ value_numeric: 250, fuel_type: "lpg" });
    expect(formatSourceCitation(point)).toBe("Test Publisher — as of 2026-01-01");
  });

  it("falls back to title when publisher is null", () => {
    const point = dp({
      value_numeric: 250,
      fuel_type: "lpg",
      source_publisher: null,
    });
    expect(formatSourceCitation(point)).toBe("Test Source — as of 2026-01-01");
  });
});
