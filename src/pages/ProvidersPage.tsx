import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Factory, Search, CheckCircle, Star, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DownloadReportButton, listColumn } from "@/components/admin/DownloadReportButton";

export default function ProvidersPage() {
  const [search, setSearch] = useState("");
  const [countyFilter, setCountyFilter] = useState("all");
  const [techFilter, setTechFilter] = useState("all");

  const { data: providers, isLoading } = useQuery({
    queryKey: ["public-providers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("providers").select("*").eq("verified", true);
      if (error) throw error;
      return data ?? [];
    },
  });

  const counties = [...new Set(providers?.flatMap((p) => p.counties_served ?? []) ?? [])].sort();
  const techs = [...new Set(providers?.flatMap((p) => p.technology_types ?? []) ?? [])].sort();

  const filtered = providers?.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (countyFilter !== "all" && !(p.counties_served ?? []).includes(countyFilter)) return false;
    if (techFilter !== "all" && !(p.technology_types ?? []).includes(techFilter)) return false;
    return true;
  });

  return (
    <div className="min-h-[80vh] bg-background py-12">
      <div className="container">
        <div className="text-center mb-10 relative">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Factory className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-2">Provider Directory</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">Vetted suppliers and service providers across all clean cooking categories.</p>
          <div className="mt-4 flex justify-center">
            <DownloadReportButton
              rows={filtered ?? []}
              columns={[
                { key: "name", label: "Provider" },
                { key: "provider_category", label: "Category" },
                { key: "contact_person", label: "Contact" },
                { key: "contact_email", label: "Email" },
                { key: "contact_phone", label: "Phone" },
                { key: "website", label: "Website" },
                listColumn("services", "Services"),
                listColumn("technology_types", "Technologies"),
                listColumn("counties_served", "Counties Served"),
                { key: "verified", label: "Verified" },
                { key: "rating", label: "Rating" },
              ]}
              title="Provider Directory"
              filename="provider-directory"
              subtitle={`Filters — county: ${countyFilter}, technology: ${techFilter}, search: "${search || "—"}"`}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-8 max-w-3xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search providers…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={countyFilter} onValueChange={setCountyFilter}>
            <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="County" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Counties</SelectItem>
              {counties.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={techFilter} onValueChange={setTechFilter}>
            <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Technology" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Technologies</SelectItem>
              {techs.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map((i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
          </div>
        ) : filtered && filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((p) => (
              <div key={p.id} className="bg-card rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-display font-bold text-lg">{p.name}</h3>
                  <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                </div>
                {p.rating != null && p.rating > 0 && (
                  <div className="flex items-center gap-1 mb-3 text-accent">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="text-sm font-medium">{Number(p.rating).toFixed(1)}</span>
                  </div>
                )}
                {(p.technology_types ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {p.technology_types!.map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                  </div>
                )}
                {(p.services ?? []).length > 0 && (
                  <p className="text-sm text-muted-foreground mb-3">{p.services!.join(", ")}</p>
                )}
                {(p.counties_served ?? []).length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{p.counties_served!.slice(0, 3).join(", ")}{p.counties_served!.length > 3 ? ` +${p.counties_served!.length - 3}` : ""}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-16">No providers found matching your criteria.</p>
        )}
      </div>
    </div>
  );
}
