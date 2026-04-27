import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  MapPin, Loader2, Filter, RotateCcw,
  GraduationCap, Stethoscope, Building2,
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import heroBg from "@/assets/hero-bg.jpg";

const pipelineStages = [
  "identified", "contacted", "assessed", "scored", "least_cost_path_assigned",
  "provider_matched", "financed", "in_delivery", "monitored_dmrv",
];

const pipelineStageLabels: Record<string, string> = {
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

const labelFor = (s: string) => pipelineStageLabels[s] ?? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const orgTypeColors: Record<string, string> = {
  institution: "#3b82f6",  // blue
  supplier: "#f97316",     // orange
  funder: "#22c55e",       // green
  csr: "#a855f7",          // purple
  researcher: "#ec4899",   // pink
};

const orgTypeLabels: Record<string, string> = {
  institution: "Institution",
  supplier: "Supplier / Provider",
  funder: "Funder / Financing Partner",
  csr: "CSR Partner",
  researcher: "Researcher",
};

const institutionTypeColors: Record<string, string> = {
  school: "#3b82f6",
  hospital: "#ef4444",
  prison: "#6b7280",
  factory: "#f59e0b",
  hotel: "#8b5cf6",
  restaurant: "#ec4899",
  faith_based: "#14b8a6",
  other: "#64748b",
};

const institutionTypeLabels: Record<string, string> = {
  school: "School",
  hospital: "Hospital",
  prison: "Prison",
  factory: "Factory",
  hotel: "Hotel",
  restaurant: "Restaurant",
  faith_based: "Faith-Based",
  other: "Other",
};

// Per-institution-type SVG paths — used inside L.divIcon HTML so map
// markers show the actual icon (not a plain circle). Stroke-only style;
// the circle around them carries the colour.
const TYPE_SVG_PATHS: Record<string, string> = {
  // GraduationCap (Lucide)
  school: '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  // Stethoscope-ish — use Lucide "Plus" cross for clarity at small size
  hospital: '<path d="M12 5v14M5 12h14" stroke-width="2.5"/>',
  // Shield (prison)
  prison: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  // Factory
  factory: '<path d="M2 20h20M4 20V8l5 4V8l5 4V8l5 4v8M9 20v-4M14 20v-4"/>',
  // Hotel/bed
  hotel: '<path d="M2 4v16M22 12v8M2 12h20M2 8h20M6 8v4"/>',
  // Utensils (restaurant)
  restaurant: '<path d="M3 2v7a3 3 0 003 3v10M9 2v20M15 14V2c-2 0-4 2-4 6s2 6 4 6z"/>',
  // Church (faith_based)
  faith_based: '<path d="M12 2v6M9 5h6M5 22V11l7-4 7 4v11M9 22v-7h6v7"/>',
  // Building (other)
  other: '<path d="M3 22V6a2 2 0 012-2h14a2 2 0 012 2v16M9 8h.01M15 8h.01M9 12h.01M15 12h.01M9 16h.01M15 16h.01"/>',
};

function makeMarkerIcon(type: string, color: string): L.DivIcon {
  const svgPath = TYPE_SVG_PATHS[type] ?? TYPE_SVG_PATHS.other;
  // 28×28 outer pin with the icon centred at 16×16
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const [countyFilter, setCountyFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [quickFilter, setQuickFilter] = useState<"all" | "school" | "hospital" | "other">("all");

  // Fetch institutions
  const { data: institutions, isLoading } = useQuery({
    queryKey: ["map-institutions"],
    queryFn: async () => {
      const { data } = await supabase.from("institutions").select("*");
      return data ?? [];
    },
  });

  // Fetch organisations with coordinates (from providers table which may have location)
  const { data: organisations } = useQuery({
    queryKey: ["map-organisations"],
    queryFn: async () => {
      const { data } = await supabase.from("organisations").select("*");
      return data ?? [];
    },
  });

  const filtered = institutions?.filter(i => {
    if (countyFilter !== "all" && i.county !== countyFilter) return false;
    if (stageFilter !== "all" && i.pipeline_stage !== stageFilter) return false;
    if (typeFilter !== "all" && typeFilter !== "all_orgs" && i.institution_type !== typeFilter) return false;
    if (typeFilter === "all_orgs") return false;
    if (quickFilter === "school" && i.institution_type !== "school") return false;
    if (quickFilter === "hospital" && i.institution_type !== "hospital") return false;
    if (quickFilter === "other" && (i.institution_type === "school" || i.institution_type === "hospital")) return false;
    return true;
  }) ?? [];

  const geoFiltered = filtered.filter(i => i.latitude && i.longitude);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;
    leafletMap.current = L.map(mapRef.current).setView([-0.0236, 37.9062], 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© OpenStreetMap contributors',
    }).addTo(leafletMap.current);
    markersRef.current = L.layerGroup().addTo(leafletMap.current);
  }, []);

  useEffect(() => {
    if (!markersRef.current) return;
    markersRef.current.clearLayers();

    // Add institution markers — divIcon with per-type SVG icons
    if (typeFilter !== "all_orgs") {
      geoFiltered.forEach(inst => {
        const color = institutionTypeColors[inst.institution_type] || "#64748b";
        const marker = L.marker([inst.latitude!, inst.longitude!], {
          icon: makeMarkerIcon(inst.institution_type, color),
        });

        const fuelOfChoice = inst.fuel_of_choice || inst.current_fuel || "—";
        const mealsServed = inst.meals_served_per_day || inst.meals_per_day || 0;
        const recommendedSolution = inst.recommended_solution || "—";
        const annualSavings = inst.annual_savings_ksh || 0;
        const co2Reduction = inst.co2_reduction_tonnes_pa || 0;

        marker.bindPopup(`
          <div style="font-family: system-ui; min-width: 220px; line-height: 1.6;">
            <strong style="font-size: 14px;">${escapeHtml(inst.name)}</strong><br/>
            <span style="text-transform: capitalize; color: ${color}; font-size: 12px;">● ${escapeHtml(inst.institution_type)}</span>
            <span style="color: #999; font-size: 11px;"> · ${escapeHtml(labelFor(inst.pipeline_stage))}</span><br/>
            <small style="color: #666;">${escapeHtml(`${inst.county}${inst.sub_county ? `, ${inst.sub_county}` : ""}`)}</small>
            <hr style="margin: 6px 0; border: none; border-top: 1px solid #eee;"/>
            <div style="font-size: 12px;">
              <div><strong>Fuel:</strong> ${escapeHtml(String(fuelOfChoice))}</div>
              <div><strong>Meals:</strong> ${Number(mealsServed).toLocaleString()}/day</div>
              <div><strong>Solution:</strong> ${escapeHtml(String(recommendedSolution))}</div>
              <div><strong>Savings:</strong> KSh ${Number(annualSavings).toLocaleString()}/yr</div>
              <div><strong>CO₂ Cut:</strong> ${Number(co2Reduction).toLocaleString()} t/yr</div>
            </div>
          </div>
        `);
        markersRef.current!.addLayer(marker);
      });
    }

    // Add organisation markers if relevant filter
    if (organisations && (typeFilter === "all" || typeFilter === "all_orgs")) {
      organisations.filter(o => o.county).forEach(org => {
        // Use approximate county center coordinates for orgs without exact lat/lng
        const color = orgTypeColors[org.org_type] || "#64748b";
        // Organisations don't have lat/lng in the table, so we skip them on the map
        // unless they have county info (we could geocode but for now just show institutions)
      });
    }
  }, [geoFiltered, organisations, typeFilter, quickFilter]);

  const counties = [...new Set(institutions?.map(i => i.county) ?? [])].sort();

  return (
    <div className="min-h-[85vh] flex flex-col">
      {/* Compact hero — gives the dropdowns clear space to overlay without
          fighting with the map filter chips for visual priority. */}
      <section
        className="relative h-40 sm:h-48 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <div className="absolute inset-0 bg-foreground/70" />
        <div className="container relative h-full flex flex-col justify-center text-primary-foreground">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/90 text-accent-foreground text-xs font-medium w-fit mb-2">
            <MapPin className="h-3.5 w-3.5" /> Institutional pipeline
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold">National Institution Map</h1>
          <p className="text-sm text-primary-foreground/80 mt-1 max-w-xl">
            Every institution in the clean cooking pipeline, by type, county, and stage.
          </p>
        </div>
      </section>

      <div className="bg-card border-b border-border p-4">
        <div className="container flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-display font-bold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> Filters
            </h2>
            <p className="text-xs text-muted-foreground">{geoFiltered.length} institutions shown, {filtered.length} total</p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {/* Quick filter buttons — now with proper Lucide icons + colour swatches */}
            <div className="flex gap-1 items-center border border-border rounded-md p-1 bg-muted/40">
              <Button
                size="sm"
                variant={quickFilter === "school" ? "default" : "ghost"}
                className="h-7 px-3 text-xs gap-1.5"
                onClick={() => setQuickFilter(quickFilter === "school" ? "all" : "school")}
              >
                <GraduationCap className="h-3.5 w-3.5" style={{ color: quickFilter === "school" ? "currentColor" : institutionTypeColors.school }} />
                Schools
              </Button>
              <Button
                size="sm"
                variant={quickFilter === "hospital" ? "default" : "ghost"}
                className="h-7 px-3 text-xs gap-1.5"
                onClick={() => setQuickFilter(quickFilter === "hospital" ? "all" : "hospital")}
              >
                <Stethoscope className="h-3.5 w-3.5" style={{ color: quickFilter === "hospital" ? "currentColor" : institutionTypeColors.hospital }} />
                Hospitals
              </Button>
              <Button
                size="sm"
                variant={quickFilter === "other" ? "default" : "ghost"}
                className="h-7 px-3 text-xs gap-1.5"
                onClick={() => setQuickFilter(quickFilter === "other" ? "all" : "other")}
              >
                <Building2 className="h-3.5 w-3.5" style={{ color: quickFilter === "other" ? "currentColor" : institutionTypeColors.faith_based }} />
                Other
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-muted-foreground"
                onClick={() => { setQuickFilter("all"); setCountyFilter("all"); setStageFilter("all"); setTypeFilter("all"); }}
                title="Reset all filters"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            </div>
            <Select value={countyFilter} onValueChange={setCountyFilter}>
              <SelectTrigger className="w-[150px] h-8 text-xs"><Filter className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Counties</SelectItem>
                {counties.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {pipelineStages.map(s =>
                  <SelectItem key={s} value={s}>{labelFor(s)}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

      </div>

      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-background/50 z-10 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        <div ref={mapRef} className="h-full min-h-[70vh] w-full" />
      </div>
    </div>
  );
}
