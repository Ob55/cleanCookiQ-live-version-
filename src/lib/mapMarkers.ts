import L from "leaflet";

// Shared, non-component map helpers used by the national map
// (src/pages/MapPage.tsx) and the reusable <InstitutionMap> component. Kept in
// a plain module (no React exports) so component files stay fast-refresh clean.

export const pipelineStages = [
  "identified", "contacted", "assessed", "scored", "least_cost_path_assigned",
  "provider_matched", "financed", "in_delivery", "monitored_dmrv",
];

export const pipelineStageLabels: Record<string, string> = {
  identified: "Listed",
  contacted: "Contacted",
  assessed: "Assessed",
  scored: "Scored",
  least_cost_path_assigned: "Solution Selected",
  provider_matched: "Provider Assigned",
  financed: "Funded",
  in_delivery: "Being Installed",
  monitored_dmrv: "Being Monitored",
  matched: "Matched",
  negotiation: "In Negotiation",
  contracted: "Contracted",
  installed: "Installed",
  monitoring: "Being Monitored",
};

export const labelFor = (s: string) =>
  pipelineStageLabels[s] ?? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export const institutionTypeColors: Record<string, string> = {
  school: "#3b82f6",
  hospital: "#ef4444",
  prison: "#6b7280",
  factory: "#f59e0b",
  hotel: "#8b5cf6",
  restaurant: "#ec4899",
  faith_based: "#14b8a6",
  other: "#64748b",
};

export const institutionTypeLabels: Record<string, string> = {
  school: "School",
  hospital: "Hospital",
  prison: "Prison",
  factory: "Factory",
  hotel: "Hotel",
  restaurant: "Restaurant",
  faith_based: "Faith-Based",
  other: "Other",
};

// Per-institution-type SVG paths — used inside L.divIcon HTML so map markers
// show the actual icon (not a plain circle). Stroke-only style; the circle
// around them carries the colour.
const TYPE_SVG_PATHS: Record<string, string> = {
  school: '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  hospital: '<path d="M12 5v14M5 12h14" stroke-width="2.5"/>',
  prison: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  factory: '<path d="M2 20h20M4 20V8l5 4V8l5 4V8l5 4v8M9 20v-4M14 20v-4"/>',
  hotel: '<path d="M2 4v16M22 12v8M2 12h20M2 8h20M6 8v4"/>',
  restaurant: '<path d="M3 2v7a3 3 0 003 3v10M9 2v20M15 14V2c-2 0-4 2-4 6s2 6 4 6z"/>',
  faith_based: '<path d="M12 2v6M9 5h6M5 22V11l7-4 7 4v11M9 22v-7h6v7"/>',
  other: '<path d="M3 22V6a2 2 0 012-2h14a2 2 0 012 2v16M9 8h.01M15 8h.01M9 12h.01M15 12h.01M9 16h.01M15 16h.01"/>',
};

export function makeMarkerIcon(type: string, color: string): L.DivIcon {
  const svgPath = TYPE_SVG_PATHS[type] ?? TYPE_SVG_PATHS.other;
  const html = `
    <div style="
      width:30px;height:30px;border-radius:50%;
      background:${color};border:2px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,.35);
      display:flex;align-items:center;justify-content:center;
    ">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        ${svgPath}
      </svg>
    </div>`;
  return L.divIcon({
    html,
    className: "ccq-marker",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// The subset of institution fields the map needs. Both the national map (raw
// `institutions` rows) and the programme tab (ProgrammeInstitution) satisfy it.
export interface MapInstitution {
  latitude: number | null;
  longitude: number | null;
  institution_type: string;
  institution_code?: string | null;
  county?: string | null;
  sub_county?: string | null;
  pipeline_stage?: string | null;
  current_fuel?: string | null;
  fuel_of_choice?: string | null;
  meals_per_day?: number | null;
  meals_served_per_day?: number | null;
  recommended_solution?: string | null;
  annual_savings_ksh?: number | null;
  co2_reduction_tonnes_pa?: number | null;
}

export function institutionPopupHtml(inst: MapInstitution): string {
  const color = institutionTypeColors[inst.institution_type] || "#64748b";
  const fuelOfChoice = inst.fuel_of_choice || inst.current_fuel || "—";
  const mealsServed = inst.meals_served_per_day || inst.meals_per_day || 0;
  const recommendedSolution = inst.recommended_solution || "—";
  const annualSavings = inst.annual_savings_ksh || 0;
  const co2Reduction = inst.co2_reduction_tonnes_pa || 0;

  // Institution names are never shown on the map — surface the anonymised
  // institution_code instead, falling back to "<Type> in <Locality>".
  const typeLabel = institutionTypeLabels[inst.institution_type] || "Institution";
  const locality = inst.sub_county || inst.county || "Kenya";
  const displayName = inst.institution_code ? inst.institution_code : `${typeLabel} in ${locality}`;

  return `
    <div style="font-family: system-ui; min-width: 220px; line-height: 1.6;">
      <strong style="font-size: 14px;">${escapeHtml(displayName)}</strong><br/>
      <span style="text-transform: capitalize; color: ${color}; font-size: 12px;">● ${escapeHtml(inst.institution_type)}</span>
      <span style="color: #999; font-size: 11px;"> · ${escapeHtml(labelFor(inst.pipeline_stage ?? ""))}</span><br/>
      <small style="color: #666;">${escapeHtml(`${inst.county ?? ""}${inst.sub_county ? `, ${inst.sub_county}` : ""}`)}</small>
      <hr style="margin: 6px 0; border: none; border-top: 1px solid #eee;"/>
      <div style="font-size: 12px;">
        <div><strong>Fuel:</strong> ${escapeHtml(String(fuelOfChoice))}</div>
        <div><strong>Meals:</strong> ${Number(mealsServed).toLocaleString()}/day</div>
        <div><strong>Solution:</strong> ${escapeHtml(String(recommendedSolution))}</div>
        <div><strong>Savings:</strong> KSh ${Number(annualSavings).toLocaleString()}/yr</div>
        <div><strong>CO₂ Cut:</strong> ${Number(co2Reduction).toLocaleString()} t/yr</div>
      </div>
    </div>`;
}
