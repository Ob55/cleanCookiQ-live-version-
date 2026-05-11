import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { HandHeart, Search, MapPin, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFunderPortfolio, useFunderDealFlow } from "@/hooks/useFunder";
import { DownloadReportButton, dateColumn } from "@/components/admin/DownloadReportButton";

const ksh = (v: number | null | undefined) =>
  v == null ? "—" : `KSh ${Math.round(v).toLocaleString()}`;

const STATUS_TINT: Record<string, string> = {
  pipeline: "bg-slate-100 text-slate-700",
  committed: "bg-amber-100 text-amber-700",
  disbursed: "bg-emerald-100 text-emerald-700",
  repaid: "bg-blue-100 text-blue-700",
  written_off: "bg-red-100 text-red-700",
};

export default function CSRSponsorships() {
  const { profile } = useAuth();
  const orgId = profile?.organisation_id ?? undefined;
  const { data: portfolio, isLoading: pLoading } = useFunderPortfolio(orgId);
  const { data: deals, isLoading: dLoading } = useFunderDealFlow();

  const [search, setSearch] = useState("");

  const dealById = useMemo(() => new Map((deals ?? []).map((d) => [d.project_id, d])), [deals]);

  const rows = useMemo(() => {
    return (portfolio ?? [])
      .map((p) => ({ portfolio: p, deal: dealById.get(p.project_id) }))
      .filter((row) => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (
          (row.deal?.institution_name ?? "").toLowerCase().includes(s) ||
          (row.deal?.institution_code ?? "").toLowerCase().includes(s) ||
          (row.deal?.county ?? "").toLowerCase().includes(s)
        );
      });
  }, [portfolio, dealById, search]);

  const totals = useMemo(() => {
    const committed = (portfolio ?? [])
      .filter((p) => ["committed", "disbursed", "repaid"].includes(p.status))
      .reduce((s, p) => s + (p.capital_amount ?? 0), 0);
    const disbursed = (portfolio ?? [])
      .filter((p) => p.status === "disbursed")
      .reduce((s, p) => s + (p.capital_amount ?? 0), 0);
    return { committed, disbursed };
  }, [portfolio]);

  const isLoading = pLoading || dLoading;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <HandHeart className="h-6 w-6 text-rose-500" /> Your Sponsorships
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Institutions you've committed to support. Status reflects whether the contribution is in pipeline, committed, or disbursed.
          </p>
        </div>
        <DownloadReportButton
          rows={rows.map(({ portfolio, deal }) => ({
            institution_code: deal?.institution_code ?? "",
            institution_name: deal?.institution_name ?? "",
            county: deal?.county ?? "",
            capital_amount: portfolio.capital_amount,
            capital_currency: portfolio.capital_currency,
            status: portfolio.status,
            committed_at: portfolio.committed_at,
            disbursed_at: portfolio.disbursed_at ?? "",
            notes: portfolio.notes ?? "",
          }))}
          columns={[
            { key: "institution_code", label: "Institution Code" },
            { key: "institution_name", label: "Institution" },
            { key: "county", label: "County" },
            { key: "capital_amount", label: "Contribution (KSh)" },
            { key: "capital_currency", label: "Currency" },
            { key: "status", label: "Status" },
            dateColumn("committed_at", "Committed On"),
            dateColumn("disbursed_at", "Disbursed On"),
            { key: "notes", label: "Notes" },
          ]}
          title="CSR Sponsorships"
          filename="csr-sponsorships"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total sponsorships</p>
            <p className="text-2xl font-bold mt-0.5">{(portfolio ?? []).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total committed</p>
            <p className="text-2xl font-bold mt-0.5">{ksh(totals.committed)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total disbursed</p>
            <p className="text-2xl font-bold mt-0.5">{ksh(totals.disbursed)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by institution, code, county…"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            {(portfolio ?? []).length === 0
              ? "No sponsorships yet. Browse Opportunities to commit your first contribution."
              : "No sponsorships match your search."}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b bg-muted/30">
                <tr>
                  <th className="text-left py-2 px-3">Institution</th>
                  <th className="text-left py-2 px-3">County</th>
                  <th className="text-right py-2 px-3">Contribution</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-left py-2 px-3">Committed</th>
                  <th className="text-right py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ portfolio, deal }) => (
                  <tr key={portfolio.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {deal?.institution_code && (
                          <span className="font-mono text-[10px] text-muted-foreground">{deal.institution_code}</span>
                        )}
                        <span className="font-medium">{deal?.institution_name ?? "—"}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">
                      {deal?.county ? (
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{deal.county}</span>
                      ) : "—"}
                    </td>
                    <td className="py-2 px-3 text-right font-mono">{ksh(portfolio.capital_amount)}</td>
                    <td className="py-2 px-3">
                      <Badge className={`text-xs capitalize ${STATUS_TINT[portfolio.status] ?? "bg-muted"}`}>
                        {portfolio.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-xs text-muted-foreground">
                      {portfolio.committed_at?.slice(0, 10) ?? "—"}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {deal && (
                        <Link
                          to={`/funder/institution/${deal.institution_id}`}
                          className="text-rose-600 hover:text-rose-700 text-xs flex items-center justify-end gap-1"
                        >
                          View <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
