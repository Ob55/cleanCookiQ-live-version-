import { Printer, Leaf, Users, Wallet, Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useFunderPortfolio, useFunderPortfolioSummary } from "@/hooks/useFunder";
import { formatBigNumber } from "@/lib/funder";
import { DownloadReportButton, dateColumn } from "@/components/admin/DownloadReportButton";

export default function FunderImpactReport() {
  const { profile } = useAuth();
  const orgId = profile?.organisation_id ?? undefined;
  const { data: summary, isLoading } = useFunderPortfolioSummary(orgId);
  const { data: portfolio } = useFunderPortfolio(orgId);
  const today = new Date().toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-display font-bold">Quarterly Impact Report</h1>
          <p className="text-muted-foreground mt-1">
            Auto-generated from your portfolio + attribution ledger. Use Print to save as PDF.
          </p>
        </div>
        <div className="flex gap-2">
          <DownloadReportButton
            rows={portfolio ?? []}
            columns={[
              { key: "project_id", label: "Project ID" },
              { key: "capital_amount", label: "Capital (KSh)" },
              { key: "capital_currency", label: "Currency" },
              { key: "capital_share_pct", label: "Share %", format: (r) => r.capital_share_pct == null ? "" : `${(r.capital_share_pct * 100).toFixed(1)}%` },
              { key: "status", label: "Status" },
              dateColumn("committed_at", "Committed"),
              dateColumn("disbursed_at", "Disbursed"),
            ]}
            title="Quarterly Impact Report"
            filename="impact-report"
            subtitle={`${summary?.project_count ?? 0} projects · ${formatBigNumber(summary?.lifetime_tco2e)} tCO₂e attributed`}
          />
          <Button onClick={() => window.print()} size="sm" variant="outline">
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-xl">cleancookIQ — Impact Report</CardTitle>
            <p className="text-sm text-muted-foreground">
              Prepared for {profile?.full_name ?? "Funder"} on {today}
            </p>
          </CardHeader>
          <CardContent className="space-y-8 pt-6">
            <section>
              <h2 className="text-base font-semibold mb-3">Headline impact</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <ReportStat icon={<Briefcase />} label="Projects supported" value={String(summary?.project_count ?? 0)} />
                <ReportStat icon={<Wallet />} label="Capital deployed" value={`KSh ${formatBigNumber(summary?.total_disbursed)}`} />
                <ReportStat icon={<Leaf />} label="tCO₂e attributed" value={formatBigNumber(summary?.lifetime_tco2e)} />
                <ReportStat icon={<Users />} label="Meals attributed" value={formatBigNumber(summary?.lifetime_meals)} />
              </div>
            </section>

            <section>
              <h2 className="text-base font-semibold mb-3">Methodology</h2>
              <p className="text-sm text-muted-foreground">
                Outcomes are attributed pro-rata by capital share at the time of recording.
                tCO₂e attributable to your portfolio is sourced from monitored project readings
                using IPCC AR6 emission factors. Meals and jobs counts derive from the M&E
                module (monitoring_readings + project_milestones). Numbers in this report are
                point-in-time and may be revised as later monitoring lands.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold mb-3">Portfolio breakdown</h2>
              {(portfolio ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No commitments yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground border-b">
                    <tr>
                      <th className="text-left py-2">Project ID</th>
                      <th className="text-right py-2">Capital (KSh)</th>
                      <th className="text-right py-2">Share</th>
                      <th className="text-left py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(portfolio ?? []).map((row) => (
                      <tr key={row.id} className="border-b last:border-0">
                        <td className="py-2 font-mono text-xs">{row.project_id.slice(0, 8)}</td>
                        <td className="py-2 text-right">{row.capital_amount.toLocaleString()}</td>
                        <td className="py-2 text-right">
                          {row.capital_share_pct != null
                            ? `${(row.capital_share_pct * 100).toFixed(1)}%`
                            : "—"}
                        </td>
                        <td className="py-2 capitalize">{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <p className="text-xs text-muted-foreground border-t pt-4">
              This report is auto-generated by cleancookIQ. For methodology questions or to
              request third-party verification of any attribution number, contact your
              cleancookIQ relationship manager.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReportStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="border rounded-lg p-3 text-center">
      <div className="flex justify-center text-primary mb-1">{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
