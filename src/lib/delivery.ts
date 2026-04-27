/**
 * Delivery & installation domain (Workstream 5).
 *
 * Pure helpers around the delivery sub-stage pipeline:
 *   manufacturing -> dispatched -> in_transit -> on_site
 *   -> installing -> commissioned -> handover -> acceptance_window
 *   -> monitoring
 *
 * Stage progression is monotonic except for `cancelled`, which can be
 * entered from any stage. The helpers here drive the timeline UI.
 */

export const DELIVERY_STAGES = [
  "manufacturing",
  "dispatched",
  "in_transit",
  "on_site",
  "installing",
  "commissioned",
  "handover",
  "acceptance_window",
  "monitoring",
] as const;

export type DeliveryStage = (typeof DELIVERY_STAGES)[number] | "cancelled";

export const STAGE_LABELS: Record<DeliveryStage, string> = {
  manufacturing: "Manufacturing",
  dispatched: "Dispatched",
  in_transit: "In transit",
  on_site: "On site",
  installing: "Installing",
  commissioned: "Commissioned",
  handover: "Handover",
  acceptance_window: "Acceptance window",
  monitoring: "Monitoring",
  cancelled: "Cancelled",
};

export interface DeliverySummary {
  id: string;
  project_id: string;
  installation_crew_id: string | null;
  stage: DeliveryStage;
  carrier: string | null;
  tracking_ref: string | null;
  delivery_county: string | null;
  delivery_address: string | null;
  planned_dispatch_at: string | null;
  actual_dispatch_at: string | null;
  planned_arrival_at: string | null;
  actual_arrival_at: string | null;
  planned_install_at: string | null;
  actual_install_at: string | null;
  commissioned_at: string | null;
  acceptance_due_at: string | null;
  notes: string | null;
  project_title: string;
  institution_id: string;
  institution_name: string;
  institution_county: string | null;
  provider_id: string | null;
  provider_name: string | null;
  crew_name: string | null;
  crew_lead: string | null;
  crew_phone: string | null;
  commissioning_complete: boolean | null;
  completed_items: number | null;
  total_items: number | null;
  signed_off: boolean;
  signed_off_at: string | null;
  signed_off_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommissioningTemplate {
  id: string;
  slug: string;
  name: string;
  fuel_type: string | null;
  description: string | null;
  items: Array<{ id: string; requirement: string; evidence_required?: string }>;
  is_active: boolean;
}

export interface CommissioningResponse {
  checked: boolean;
  note?: string;
  evidence_url?: string;
}

export interface CommissioningChecklist {
  id: string;
  delivery_id: string;
  template_id: string | null;
  responses: Record<string, CommissioningResponse>;
  completed_items: number;
  total_items: number;
  is_complete: boolean;
  completed_at: string | null;
}

/** Fraction of stages completed (0..1). cancelled returns 0. */
export function deliveryProgress(stage: DeliveryStage): number {
  if (stage === "cancelled") return 0;
  const idx = DELIVERY_STAGES.indexOf(stage);
  if (idx < 0) return 0;
  return (idx + 1) / DELIVERY_STAGES.length;
}

/** Next stage in the pipeline, or null if at the end / cancelled. */
export function nextStage(stage: DeliveryStage): DeliveryStage | null {
  if (stage === "cancelled") return null;
  const idx = DELIVERY_STAGES.indexOf(stage);
  if (idx < 0 || idx === DELIVERY_STAGES.length - 1) return null;
  return DELIVERY_STAGES[idx + 1];
}

/** Allowed forward transitions from a given stage (plus cancellation). */
export function allowedTransitions(stage: DeliveryStage): DeliveryStage[] {
  if (stage === "cancelled" || stage === "monitoring") return [];
  const next = nextStage(stage);
  return next ? [next, "cancelled"] : ["cancelled"];
}

/**
 * A delivery is acceptance-ready when commissioning is fully complete
 * AND it has reached at least the handover stage. Sign-off cannot happen
 * before the equipment is installed and commissioned.
 */
export function isReadyForSignoff(d: DeliverySummary): boolean {
  if (d.signed_off) return false;
  if (!d.commissioning_complete) return false;
  const handoverIdx = DELIVERY_STAGES.indexOf("handover");
  const stageIdx = DELIVERY_STAGES.indexOf(d.stage as (typeof DELIVERY_STAGES)[number]);
  return stageIdx >= handoverIdx;
}

export function commissioningPercent(checklist: CommissioningChecklist | null | undefined): number {
  if (!checklist || checklist.total_items === 0) return 0;
  return checklist.completed_items / checklist.total_items;
}

/** Recompute completed_items / total_items / is_complete from responses. Pure. */
export function summarizeChecklist(
  template: CommissioningTemplate,
  responses: Record<string, CommissioningResponse>,
): { completed_items: number; total_items: number; is_complete: boolean } {
  const total = template.items.length;
  const completed = template.items.filter((it) => responses[it.id]?.checked === true).length;
  return {
    completed_items: completed,
    total_items: total,
    is_complete: total > 0 && completed === total,
  };
}

export function stageLabel(stage: DeliveryStage): string {
  return STAGE_LABELS[stage] ?? stage;
}
