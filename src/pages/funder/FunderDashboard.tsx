import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Flame, Users, Building2, GraduationCap, Stethoscope, ShieldCheck } from "lucide-react";
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

type GroupDef = {
  key: string;
  label: string;
  instType: string;
  ownershipType?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icon: any;
  iconClass: string;
  typeKey: string; // for the type filter
};

const GROUP_DEFS: GroupDef[] = [
  { key: "gov_school",   label: "Government Schools",   instType: "school",   ownershipType: "government", Icon: GraduationCap, iconClass: "text-blue-600 bg-blue-50",   typeKey: "school" },
  { key: "priv_school",  label: "Private Schools",      instType: "school",   ownershipType: "private",    Icon: GraduationCap, iconClass: "text-purple-600 bg-purple-50", typeKey: "school" },
  { key: "faith_school", label: "Faith-based Schools",  instType: "school",   ownershipType: "faith_based",Icon: GraduationCap, iconClass: "text-amber-600 bg-amber-50",   typeKey: "school" },
  { key: "school_other", label: "Other Schools",        instType: "school",                                 Icon: GraduationCap, iconClass: "text-teal-600 bg-teal-50",    typeKey: "school" },
  { key: "hospital",     label: "Hospitals",             instType: "hospital",                              Icon: Stethoscope,   iconClass: "text-rose-600 bg-rose-50",     typeKey: "hospital" },
  { key: "correctional", label: "Correctional Facilities", instType: "prison",                             Icon: ShieldCheck,   iconClass: "text-slate-600 bg-slate-50",   typeKey: "correctional" },
];

function dominantFuel(list: { current_fuel?: string }[]): string | null {
  const tally: Record<string, number> = {};
  list.forEach(i => { if (i.current_fuel) tally[i.current_fuel] = (tally[i.current_fuel] || 0) + 1; });
  const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
  return top?.[0] ?? null;
}

export default function FunderDashboard() {
  const [fuelFilter, setFuelFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: institutions, isLoading } = useQuery({
    queryKey: ["funder-institutions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institutions")
        .select("id, county, current_fuel, number_of_students, meals_per_day, assessment_category, ownership_type, institution_type")
        .order("created_at");
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

  const base = (institutions ?? []).filter((inst: any) => {
    if (fuelFilter !== "all" && inst.current_fuel !== fuelFilter) return false;
    if (typeFilter === "school" && inst.institution_type !== "school") return false;
    if (typeFilter === "hospital" && inst.institution_type !== "hospital") return false;
    if (typeFilter === "correctional" && inst.institution_type !== "prison") return false;
    return true;
  });

  const totalStudents = base.reduce((s: number, i: any) => s + (i.number_of_students || 0), 0);
  const countyCount = new Set(base.map((i: any) => i.county).filter(Boolean)).size;
  const readyCount = base.filter((i: any) => i.assessment_category === "Ready Now").length;

  // Build groups — "school_other" catches schools with no/unrecognised ownership
  const groups = GROUP_DEFS.map(g => {
    const members = base.filter((i: any) => {
      if (i.institution_type !== g.instType) return false;
      if (g.ownershipType) {
        // "school_other" should only catch schools NOT in gov/private/faith_based
        if (g.key === "school_other") {
          return !["government", "private", "faith_based"].includes(i.ownership_type ?? "");
        }
        return i.ownership_type === g.ownershipType;
      }
      return true; // hospital / correctional — no ownership sub-filter
    });
    return { ...g, members };
  }).filter(g => {
    if (typeFilter !== "all" && g.typeKey !== typeFilter) return false;
    return g.members.length > 0;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Funder Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Institution overview across Kenya — ready for clean cooking transition.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={fuelFilter} onValueChange={setFuelFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Fuel Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Fuel Types</SelectItem>
            {Object.entries(FUEL_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All Institution Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="school">Schools</SelectItem>
            <SelectItem value="hospital">Hospitals</SelectItem>
            <SelectItem value="correctional">Correctional</SelectItem>
          </SelectContent>
        </Select>

        {(fuelFilter !== "all" || typeFilter !== "all") && (
          <button
            className="text-sm text-muted-foreground hover:text-foreground underline"
            onClick={() => { setFuelFilter("all"); setTypeFilter("all"); }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total Institutions</p>
            <p className="text-2xl font-bold mt-0.5">{base.length}</p>
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
            <p className="text-xs text-muted-foreground">Total Residents / Students</p>
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

      {/* Collective group cards */}
      {!groups.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            No institutions match the selected filters.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map(g => {
            const fuel = dominantFuel(g.members);
            const readyNow = g.members.filter((i: any) => i.assessment_category === "Ready Now").length;
            const minorActions = g.members.filter((i: any) => i.assessment_category === "Ready with Minor Actions").length;
            const studs = g.members.reduce((s: number, i: any) => s + (i.number_of_students || 0), 0);
            const counties = new Set(g.members.map((i: any) => i.county).filter(Boolean));

            return (
              <Card key={g.key} className="h-full">
                <CardContent className="p-5 space-y-4">
                  {/* Group heading */}
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${g.iconClass}`}>
                      <g.Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm leading-snug">{g.label}</h3>
                      <p className="text-xs text-muted-foreground">
                        {g.members.length} institution{g.members.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  <div className="space-y-2.5">
                    {/* Students / residents */}
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Residents / Students</p>
                        <p className="text-sm font-semibold">{studs > 0 ? studs.toLocaleString() : "—"}</p>
                      </div>
                    </div>

                    {/* Dominant fuel */}
                    {fuel && (
                      <div className="flex items-center gap-2">
                        <Flame className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Primary Fuel</p>
                          <Badge variant="secondary" className={`text-xs mt-0.5 ${FUEL_COLORS[fuel] || ""}`}>
                            {FUEL_LABELS[fuel] || fuel}
                          </Badge>
                        </div>
                      </div>
                    )}

                    {/* Counties spread */}
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Counties</p>
                        <p className="text-sm font-semibold">{counties.size}</p>
                      </div>
                    </div>
                  </div>

                  {/* Readiness badges */}
                  {(readyNow > 0 || minorActions > 0) && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {readyNow > 0 && (
                        <Badge variant="secondary" className="text-xs bg-emerald-500/20 text-emerald-700">
                          {readyNow} Ready Now
                        </Badge>
                      )}
                      {minorActions > 0 && (
                        <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-700">
                          {minorActions} Minor Actions
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
