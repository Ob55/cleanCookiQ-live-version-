import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Flame, Users, UtensilsCrossed, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const FUEL_LABELS: Record<string, string> = {
  firewood: "Firewood",
  charcoal: "Charcoal",
  lpg: "LPG",
  biogas: "Biogas",
  electric: "Electric (Induction)",
  other: "Biomass Pellets",
};

const FUEL_COLORS: Record<string, string> = {
  firewood: "bg-orange-100 text-orange-700",
  charcoal: "bg-stone-100 text-stone-700",
  lpg: "bg-blue-100 text-blue-700",
  biogas: "bg-emerald-100 text-emerald-700",
  electric: "bg-violet-100 text-violet-700",
  other: "bg-amber-100 text-amber-700",
};

export default function FunderDashboard() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: institutions, isLoading } = useQuery({
    queryKey: ["funder-institutions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institutions")
        .select("id, name, county, current_fuel, number_of_students, meals_per_day, assessment_score, assessment_category, ownership_type")
        .order("name");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const filtered = (institutions ?? []).filter((inst: any) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return inst.name?.toLowerCase().includes(q) || inst.county?.toLowerCase().includes(q);
  });

  const readyCount = filtered.filter((i: any) => i.assessment_category === "Ready Now").length;
  const totalStudents = filtered.reduce((s: number, i: any) => s + (i.number_of_students || 0), 0);
  const countyCount = new Set(filtered.map((i: any) => i.county).filter(Boolean)).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold">Funder Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Browse institutions across Kenya ready for clean cooking transition.
        </p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total Institutions</p>
            <p className="text-2xl font-bold mt-0.5">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Ready Now</p>
            <p className="text-2xl font-bold mt-0.5 text-emerald-600">{readyCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total Students</p>
            <p className="text-2xl font-bold mt-0.5">{totalStudents.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Counties</p>
            <p className="text-2xl font-bold mt-0.5">{countyCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or county…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Institution cards — 4 per row */}
      {!filtered.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            No institutions found yet. They will appear here once registered and approved.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map((inst: any) => (
            <Card key={inst.id} className="h-full">
              <CardContent className="p-4 space-y-3">
                {/* Name + county */}
                <div>
                  <div className="flex items-start gap-1">
                    <h3 className="font-semibold text-sm leading-snug line-clamp-2">
                      {inst.name}
                    </h3>
                  </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{inst.county || "—"}</span>
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  {/* 3 data points */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        <Flame className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Cooking Method</p>
                        <Badge variant="secondary" className={`text-xs mt-0.5 ${inst.current_fuel ? (FUEL_COLORS[inst.current_fuel] || "") : ""}`}>
                          {inst.current_fuel ? FUEL_LABELS[inst.current_fuel] || inst.current_fuel : "—"}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        <Users className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Students</p>
                        <p className="text-sm font-semibold">
                          {inst.number_of_students ? inst.number_of_students.toLocaleString() : "—"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        <UtensilsCrossed className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Meals / Day</p>
                        <p className="text-sm font-semibold">
                          {inst.meals_per_day ? `${inst.meals_per_day} meal${inst.meals_per_day > 1 ? "s" : ""}` : "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Readiness badge */}
                  {inst.assessment_category && (
                    <div className="pt-1">
                      <Badge variant="secondary" className={`text-xs w-full justify-center py-0.5 ${
                        inst.assessment_category === "Ready Now" ? "bg-emerald-500/20 text-emerald-700"
                        : inst.assessment_category === "Ready with Minor Actions" ? "bg-amber-500/20 text-amber-700"
                        : inst.assessment_category === "Needs Enabling Support" ? "bg-orange-500/20 text-orange-700"
                        : "bg-muted text-muted-foreground"
                      }`}>
                        {inst.assessment_category}
                      </Badge>
                    </div>
                  )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
