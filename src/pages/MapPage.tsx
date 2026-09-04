import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  MapPin, Loader2, Filter, RotateCcw,
  GraduationCap, Stethoscope, Building2,
} from "lucide-react";
import InstitutionMap from "@/components/programme/InstitutionMap";
import { pipelineStages, labelFor, institutionTypeColors } from "@/lib/mapMarkers";
import heroBg from "@/assets/hero-bg.jpg";

export default function MapPage() {
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
        {/* National view: keep the fixed zoom-6 Kenya framing rather than
            fitting to the current filter selection. */}
        <InstitutionMap institutions={geoFiltered} fitToBounds={false} className="h-full min-h-[70vh] w-full" />
      </div>
    </div>
  );
}
