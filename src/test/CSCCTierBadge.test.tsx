import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CSCCTierBadge } from "@/components/CSCCTierBadge";

describe("CSCCTierBadge", () => {
  it("renders the tier label text", () => {
    render(<CSCCTierBadge tier="tier_1" />);
    expect(screen.getByText(/Compliant/i)).toBeInTheDocument();
  });

  it("exposes an accessible label for the trigger button", () => {
    render(<CSCCTierBadge tier="tier_2" />);
    expect(
      screen.getByRole("button", { name: /Tier 2.*click for details/i }),
    ).toBeInTheDocument();
  });

  it("renders an Unrated state when no tier is known", () => {
    render(<CSCCTierBadge tier="unrated" />);
    expect(screen.getByText("Unrated")).toBeInTheDocument();
  });
});
