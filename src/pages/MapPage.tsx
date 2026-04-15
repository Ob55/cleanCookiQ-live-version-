import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Loader2, Filter } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const pipelineStages = [
  "identified", "contacted", "assessed", "scored", "least_cost_path_assigned",
  "provider_matched", "financed", "in_delivery", "monitored_dmrv",
];

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
  other: "#64748b",
};

const institutionTypeLabels: Record<string, string> = {
  school: "School",
  hospital: "Hospital",
  prison: "Prison",
  factory: "Factory",
  hotel: "Hotel",
  restaurant: "Restaurant",
  other: "Other",
};

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
    if (typeFilter === "all_orgs") return false; // hide institutions when viewing orgs only
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

    // Add institution markers (colored by institution type)
    if (typeFilter !== "all_orgs") {
      geoFiltered.forEach(inst => {
        const color = institutionTypeColors[inst.institution_type] || "#64748b";
        const marker = L.circleMarker([inst.latitude!, inst.longitude!], {
          radius: 8, fillColor: color, color: "#fff", weight: 2, opacity: 1, fillOpacity: 0.8,
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
            <span style="color: #999; font-size: 11px;"> · ${escapeHtml(inst.pipeline_stage.replace(/_/g, " "))}</span><br/>
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
  }, [geoFiltered, organisations, typeFilter]);

  const counties = [...new Set(institutions?.map(i => i.county) ?? [])].sort();

  return (
    <div className="min-h-[85vh] flex flex-col">
      <div className="bg-card border-b border-border p-4">
        <div className="container flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-display font-bold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" /> Pipeline Intelligence Map
            </h1>
            <p className="text-xs text-muted-foreground">{geoFiltered.length} institutions with coordinates · {filtered.length} total</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={countyFilter} onValueChange={setCountyFilter}>
              <SelectTrigger className="w-[150px] h-8 text-xs"><Filter className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Counties</SelectItem>
                {counties.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(institutionTypeLabels).map(([k, v]) =>
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                )}
              </SelectContent>
            </Select>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {pipelineStages.map(s =>
                  <SelectItem key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
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

      {/* Legend */}
      <div className="bg-card border-t border-border p-3">
        <div className="container flex flex-wrap gap-4 items-center">
          <span className="text-xs font-medium text-muted-foreground">Institution Types:</span>
          {Object.entries(institutionTypeColors).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[10px] capitalize">{institutionTypeLabels[type]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
