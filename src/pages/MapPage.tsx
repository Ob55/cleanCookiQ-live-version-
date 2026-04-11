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

const stageColors: Record<string, string> = {
  identified: "#94a3b8",
  contacted: "#64748b",
  assessed: "#3b82f6",
  scored: "#8b5cf6",
  least_cost_path_assigned: "#f59e0b",
  provider_matched: "#f97316",
  financed: "#ec4899",
  in_delivery: "#22c55e",
  monitored_dmrv: "#059669",
};

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const [countyFilter, setCountyFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");

  const { data: institutions, isLoading } = useQuery({
    queryKey: ["map-institutions"],
    queryFn: async () => {
      const { data } = await supabase.from("institutions").select("*");
      return data ?? [];
    },
  });

  const filtered = institutions?.filter(i => {
    if (countyFilter !== "all" && i.county !== countyFilter) return false;
    if (stageFilter !== "all" && i.pipeline_stage !== stageFilter) return false;
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
    geoFiltered.forEach(inst => {
      const color = stageColors[inst.pipeline_stage] || "#94a3b8";
      const marker = L.circleMarker([inst.latitude!, inst.longitude!], {
        radius: 8,
        fillColor: color,
        color: "#fff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      });

      const fuelOfChoice = (inst as any).fuel_of_choice || inst.current_fuel || "—";
      const mealsServed = (inst as any).meals_served_per_day || inst.meals_per_day || 0;
      const recommendedSolution = (inst as any).recommended_solution || "—";
      const annualSavings = (inst as any).annual_savings_ksh || 0;
      const co2Reduction = (inst as any).co2_reduction_tonnes_pa || 0;

      marker.bindPopup(`
        <div style="font-family: system-ui; min-width: 220px; line-height: 1.6;">
          <strong style="font-size: 14px;">${inst.name}</strong><br/>
          <span style="text-transform: capitalize; color: ${color}; font-size: 12px;">● ${inst.pipeline_stage.replace(/_/g, ' ')}</span><br/>
          <small style="color: #666;">${inst.county}${inst.sub_county ? ', ' + inst.sub_county : ''}</small>
          <hr style="margin: 6px 0; border: none; border-top: 1px solid #eee;"/>
          <div style="font-size: 12px;">
            <div><strong>Fuel of Choice:</strong> ${fuelOfChoice}</div>
            <div><strong>Meals Served:</strong> ${mealsServed.toLocaleString()} meals/day</div>
            <div><strong>Recommended Solution:</strong> ${recommendedSolution}</div>
            <div><strong>Savings Potential:</strong> KSh ${Number(annualSavings).toLocaleString()}/year</div>
            <div><strong>CO₂ Reduction:</strong> ${Number(co2Reduction).toLocaleString()} tonnes/year</div>
          </div>
        </div>
      `);
      markersRef.current!.addLayer(marker);
    });
  }, [geoFiltered]);

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
          <div className="flex gap-2">
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

      <div className="bg-card border-t border-border p-3">
        <div className="container flex flex-wrap gap-3 items-center">
          <span className="text-xs font-medium text-muted-foreground">Legend:</span>
          {Object.entries(stageColors).map(([stage, color]) => (
            <div key={stage} className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[10px] capitalize">{stage.replace(/_/g, ' ')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
