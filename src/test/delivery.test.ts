import { describe, it, expect } from "vitest";
import {
  DELIVERY_STAGES, allowedTransitions, commissioningPercent,
  deliveryProgress, isReadyForSignoff, nextStage, stageLabel,
  summarizeChecklist,
  type CommissioningChecklist, type CommissioningTemplate, type DeliverySummary,
} from "@/lib/delivery";

const baseDelivery: DeliverySummary = {
  id: "d1", project_id: "p1", installation_crew_id: null,
  stage: "manufacturing", carrier: null, tracking_ref: null,
  delivery_county: "Nairobi", delivery_address: null,
  planned_dispatch_at: null, actual_dispatch_at: null,
  planned_arrival_at: null, actual_arrival_at: null,
  planned_install_at: null, actual_install_at: null,
  commissioned_at: null, acceptance_due_at: null,
  notes: null,
  project_title: "School transition",
  institution_id: "i1", institution_name: "Test School", institution_county: "Nairobi",
  provider_id: "pv1", provider_name: "Acme",
  crew_name: null, crew_lead: null, crew_phone: null,
  commissioning_complete: false, completed_items: 0, total_items: 7,
  signed_off: false, signed_off_at: null, signed_off_by: null,
  created_at: "2026-01-01", updated_at: "2026-01-01",
};

describe("deliveryProgress", () => {
  it("returns increasing fraction across the pipeline", () => {
    const start = deliveryProgress("manufacturing");
    const mid = deliveryProgress("on_site");
    const end = deliveryProgress("monitoring");
    expect(start).toBeLessThan(mid);
    expect(mid).toBeLessThan(end);
    expect(end).toBeCloseTo(1.0, 5);
  });

  it("returns 0 for cancelled", () => {
    expect(deliveryProgress("cancelled")).toBe(0);
  });
});

describe("nextStage / allowedTransitions", () => {
  it("returns the next pipeline stage", () => {
    expect(nextStage("manufacturing")).toBe("dispatched");
    expect(nextStage("dispatched")).toBe("in_transit");
    expect(nextStage("monitoring")).toBeNull();
    expect(nextStage("cancelled")).toBeNull();
  });

  it("allows forward + cancellation, except from terminal states", () => {
    expect(allowedTransitions("on_site")).toEqual(["installing", "cancelled"]);
    expect(allowedTransitions("monitoring")).toEqual([]);
    expect(allowedTransitions("cancelled")).toEqual([]);
  });
});

describe("isReadyForSignoff", () => {
  it("requires commissioning complete", () => {
    expect(isReadyForSignoff({ ...baseDelivery, stage: "handover", commissioning_complete: false })).toBe(false);
  });

  it("requires at least handover stage", () => {
    expect(isReadyForSignoff({ ...baseDelivery, stage: "installing", commissioning_complete: true })).toBe(false);
  });

  it("returns true when both conditions met and not yet signed", () => {
    expect(isReadyForSignoff({ ...baseDelivery, stage: "handover", commissioning_complete: true })).toBe(true);
    expect(isReadyForSignoff({ ...baseDelivery, stage: "monitoring", commissioning_complete: true })).toBe(true);
  });

  it("returns false when already signed", () => {
    expect(isReadyForSignoff({ ...baseDelivery, stage: "handover", commissioning_complete: true, signed_off: true })).toBe(false);
  });
});

describe("commissioningPercent", () => {
  it("handles null", () => {
    expect(commissioningPercent(null)).toBe(0);
  });

  it("handles empty checklist", () => {
    const c: CommissioningChecklist = {
      id: "1", delivery_id: "d", template_id: null, responses: {},
      completed_items: 0, total_items: 0, is_complete: false, completed_at: null,
    };
    expect(commissioningPercent(c)).toBe(0);
  });

  it("computes fraction", () => {
    const c: CommissioningChecklist = {
      id: "1", delivery_id: "d", template_id: null, responses: {},
      completed_items: 3, total_items: 7, is_complete: false, completed_at: null,
    };
    expect(commissioningPercent(c)).toBeCloseTo(3 / 7, 5);
  });
});

describe("summarizeChecklist", () => {
  const template: CommissioningTemplate = {
    id: "t1", slug: "lpg", name: "LPG", fuel_type: "lpg", description: null,
    items: [
      { id: "a", requirement: "A" },
      { id: "b", requirement: "B" },
      { id: "c", requirement: "C" },
    ],
    is_active: true,
  };

  it("counts checked items", () => {
    const result = summarizeChecklist(template, {
      a: { checked: true },
      b: { checked: false },
      c: { checked: true },
    });
    expect(result.completed_items).toBe(2);
    expect(result.total_items).toBe(3);
    expect(result.is_complete).toBe(false);
  });

  it("flags is_complete when all checked", () => {
    const result = summarizeChecklist(template, {
      a: { checked: true }, b: { checked: true }, c: { checked: true },
    });
    expect(result.is_complete).toBe(true);
  });

  it("ignores items not in the template", () => {
    const result = summarizeChecklist(template, {
      a: { checked: true },
      stray: { checked: true },
    });
    expect(result.completed_items).toBe(1);
  });
});

describe("stageLabel", () => {
  it("returns human-readable labels", () => {
    expect(stageLabel("on_site")).toBe("On site");
    expect(stageLabel("acceptance_window")).toBe("Acceptance window");
    expect(stageLabel("cancelled")).toBe("Cancelled");
  });
});

describe("DELIVERY_STAGES", () => {
  it("has 9 forward stages (cancelled is excluded)", () => {
    expect(DELIVERY_STAGES).toHaveLength(9);
    expect(DELIVERY_STAGES).not.toContain("cancelled");
  });
});
