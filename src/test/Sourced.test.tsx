import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sourced } from "@/components/Sourced";
import type { DataPoint } from "@/lib/dataPoints";

const point: DataPoint = {
  id: "1",
  metric_key: "fuel.cost_per_unit",
  value_numeric: 250,
  value_text: null,
  unit: "KSh/kg",
  fuel_type: "lpg",
  county_id: null,
  county_name: null,
  county_code: null,
  source_id: "src-1",
  source_slug: "epra",
  source_title: "EPRA Petroleum Pricing 2026",
  source_publisher: "EPRA",
  source_url: "https://epra.example",
  source_confidence: "high",
  valid_from: "2026-01-01",
  valid_until: null,
  notes: "Monthly retail price",
};

describe("Sourced", () => {
  it("renders the wrapped value", () => {
    render(<Sourced point={point}>KSh 250</Sourced>);
    expect(screen.getByText("KSh 250")).toBeInTheDocument();
  });

  it("renders an info trigger labeled for screen readers", () => {
    render(<Sourced point={point}>KSh 250</Sourced>);
    expect(
      screen.getByRole("button", { name: /view source citation/i }),
    ).toBeInTheDocument();
  });

  it("falls back to a 'pending source' affordance when point is null", () => {
    render(<Sourced point={null}>KSh 250</Sourced>);
    expect(screen.getByText("KSh 250")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /source pending/i }),
    ).toBeInTheDocument();
  });
});
