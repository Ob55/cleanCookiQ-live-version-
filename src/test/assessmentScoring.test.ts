import { describe, it, expect } from "vitest";
import {
  calculateAssessmentScore,
  DEFAULT_READINESS_WEIGHTS,
  READINESS_WEIGHT_KEYS,
  type ScoringInput,
} from "@/lib/assessmentScoring";

const HIGH: ScoringInput = {
  current_fuel: "electric",
  consumption_per_term: 12,
  has_dedicated_kitchen: true,
  kitchen_condition: "clean_ready",
  financing_preference: "loan",
  number_of_students: 1500,
  monthly_fuel_spend: 150_000,
  financial_decision_maker: "head_teacher",
};

const LOW: ScoringInput = {
  current_fuel: "firewood",
  consumption_per_term: null,
  has_dedicated_kitchen: false,
  kitchen_condition: "major_renovation",
  financing_preference: "not_sure",
  number_of_students: 50,
  monthly_fuel_spend: 5_000,
  financial_decision_maker: "county_government",
};

describe("DEFAULT_READINESS_WEIGHTS", () => {
  it("sum to 1.0 (within float epsilon)", () => {
    const total = READINESS_WEIGHT_KEYS.reduce(
      (acc, k) => acc + DEFAULT_READINESS_WEIGHTS[k],
      0,
    );
    expect(total).toBeCloseTo(1, 6);
  });

  it("declares one weight per scoring input", () => {
    const inputKeys = Object.keys(HIGH) as Array<keyof ScoringInput>;
    for (const k of inputKeys) {
      expect(READINESS_WEIGHT_KEYS).toContain(k);
    }
  });
});

describe("calculateAssessmentScore — category boundaries", () => {
  it("returns 'Ready Now' for top-scoring inputs (≥80)", () => {
    const { score, category } = calculateAssessmentScore(HIGH);
    expect(score).toBeGreaterThanOrEqual(80);
    expect(category).toBe("Ready Now");
  });

  it("returns 'Longer-Term Opportunity' for worst-case inputs (<40)", () => {
    const { score, category } = calculateAssessmentScore(LOW);
    expect(score).toBeLessThan(40);
    expect(category).toBe("Longer-Term Opportunity");
  });

  it("returns 'Needs Enabling Support' in the 40–59 band", () => {
    // Mix of medium-tier sub-scores designed to land in the 40s.
    const input: ScoringInput = {
      current_fuel: "lpg",                  // 60
      consumption_per_term: 3,              // 50
      has_dedicated_kitchen: true,          // 100
      kitchen_condition: "major_renovation",// 20
      financing_preference: "grant",        // 40
      number_of_students: 100,              // 25
      monthly_fuel_spend: 10_000,           // 25
      financial_decision_maker: "pta",      // 40
    };
    const { score, category } = calculateAssessmentScore(input);
    expect(category).toBe("Needs Enabling Support");
    expect(score).toBeGreaterThanOrEqual(40);
    expect(score).toBeLessThan(60);
  });

  it("returns 'Ready with Minor Actions' in the 60–79 band", () => {
    const input: ScoringInput = {
      current_fuel: "biogas",                 // 90
      consumption_per_term: 6,                // 75
      has_dedicated_kitchen: true,            // 100
      kitchen_condition: "minor_renovation",  // 60
      financing_preference: "partial",        // 75
      number_of_students: 600,                // 75
      monthly_fuel_spend: 30_000,             // 50
      financial_decision_maker: "board_of_governors", // 80
    };
    const { score, category } = calculateAssessmentScore(input);
    expect(category).toBe("Ready with Minor Actions");
    expect(score).toBeGreaterThanOrEqual(60);
    expect(score).toBeLessThan(80);
  });
});

describe("calculateAssessmentScore — input handling", () => {
  it("treats null fuel as 0 sub-score for that dimension", () => {
    const a = calculateAssessmentScore({ ...HIGH, current_fuel: null });
    const b = calculateAssessmentScore(HIGH);
    expect(a.score).toBeLessThan(b.score);
  });

  it("respects custom weights — putting everything on one dimension", () => {
    const weights = {
      current_fuel: 1, consumption_per_term: 0, has_dedicated_kitchen: 0,
      kitchen_condition: 0, financing_preference: 0, number_of_students: 0,
      monthly_fuel_spend: 0, financial_decision_maker: 0,
    };
    // electric → 100 × 1 = 100
    const { score } = calculateAssessmentScore({ ...HIGH, current_fuel: "electric" }, weights);
    expect(score).toBe(100);
  });

  it("clamps to whole-number scores via Math.round", () => {
    const { score } = calculateAssessmentScore(HIGH);
    expect(Number.isInteger(score)).toBe(true);
  });

  it("an unknown fuel value scores 0 on the fuel dimension", () => {
    const a = calculateAssessmentScore({ ...HIGH, current_fuel: "nuclear" as any });
    const b = calculateAssessmentScore({ ...HIGH, current_fuel: "electric" });
    expect(a.score).toBeLessThan(b.score);
  });
});
