import { useMemo, useState } from "react";
import { ExternalLink, Scale, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePolicies } from "@/hooks/useKnowledge";
import { policyStatusLabel } from "@/lib/knowledge";
import { DownloadReportButton, dateColumn, listColumn } from "@/components/admin/DownloadReportButton";

export default function PolicyLibraryPage() {
  const { data, isLoading, error } = usePolicies();
  const [search, setSearch] = useState("");
  const [jurisdiction, setJurisdiction] = useState<string>("");

  const filtered = useMemo(() => {
    let list = data ?? [];
    if (jurisdiction) list = list.filter((p) => p.jurisdiction === jurisdiction);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.summary ?? "").toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [data, search, jurisdiction]);

  return (
    <div className="container py-10 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <Scale className="h-7 w-7 text-primary" /> Policy Library
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            National, sectoral, and international policies relevant to clean cooking
            deployments in Kenya — EPRA licensing, KEBS standards, KRA tax incentives,
            NEMA requirements, and more.
          </p>
        </div>
        <DownloadReportButton
          rows={filtered}
          columns={[
            { key: "title", label: "Title" },
            { key: "jurisdiction", label: "Jurisdiction" },
            { key: "policy_type", label: "Type" },
            { key: "status", label: "Status", format: (r) => policyStatusLabel(r.status) },
            dateColumn("effective_date", "Effective"),
            dateColumn("expires_date", "Expires"),
            { key: "summary", label: "Summary" },
            { key: "full_text_url", label: "Document URL" },
            listColumn("applies_to_org_types", "Applies To Org Types"),
            listColumn("applies_to_fuels", "Applies To Fuels"),
            listColumn("tags", "Tags"),
          ]}
          title="Policy Library"
          filename="policies"
          subtitle={`Filters — jurisdiction: ${jurisdiction || "all"}, search: "${search || "—"}"`}
        />
      </div>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search policies..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {["", "national", "regional", "sectoral", "international"].map((j) => (
              <button
                key={j || "all"}
                type="button"
                onClick={() => setJurisdiction(j)}
                className={`px-3 py-1.5 rounded-full border transition-colors ${
                  jurisdiction === j
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/40"
                }`}
              >
                {j === "" ? "All" : j.charAt(0).toUpperCase() + j.slice(1)}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load policies.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No policies match your filters.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((policy) => (
            <Card key={policy.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{policy.title}</CardTitle>
                  <Badge variant={policy.status === "in_force" ? "secondary" : "outline"} className="text-xs">
                    {policyStatusLabel(policy.status)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground capitalize">
                  {policy.jurisdiction}
                  {policy.policy_type ? ` · ${policy.policy_type}` : ""}
                  {policy.effective_date ? ` · effective ${policy.effective_date}` : ""}
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {policy.summary && <p className="text-sm">{policy.summary}</p>}
                {policy.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {policy.tags.map((t) => (
                      <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                )}
                {policy.full_text_url && (
                  <a
                    href={policy.full_text_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Read full text <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
