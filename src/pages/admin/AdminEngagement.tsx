import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { sbAny } from "@/lib/sbAny";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  Eye,
  Users,
  TrendingUp,
  Loader2,
  Globe,
  Building2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { DownloadReportButton, dateColumn } from "@/components/admin/DownloadReportButton";

type WindowDays = 7 | 30 | 90;

interface TopPath {
  path: string;
  view_count: number;
  unique_visitors: number;
  avg_duration_ms: number | null;
  last_viewed_at: string;
}

interface OrgTypeRow {
  org_type: string;
  view_count: number;
  unique_visitors: number;
  signed_in_visitors: number;
}

interface OrgRecencyRow {
  organisation_id: string;
  org_type: string | null;
  view_count_30d: number;
  active_users_30d: number;
  active_days_30d: number;
  last_viewed_at: string;
}

interface DailyVolumeRow {
  day: string;
  view_count: number;
  unique_visitors: number;
}

interface RecentView {
  id: string;
  user_id: string | null;
  org_type: string | null;
  role: string | null;
  path: string;
  referrer: string | null;
  viewed_at: string;
}

function formatDuration(ms: number | null | undefined): string {
  if (!ms || !Number.isFinite(ms) || ms <= 0) return "—";
  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)} s`;
  const m = s / 60;
  return `${m.toFixed(1)} min`;
}

export default function AdminEngagement() {
  const [windowDays, setWindowDays] = useState<WindowDays>(30);
  const sinceIso = useMemo(
    () => new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString(),
    [windowDays],
  );

  const { data: topPaths, isLoading: topPathsLoading } = useQuery({
    queryKey: ["engagement-top-paths", windowDays],
    queryFn: async () => {
      // The view is fixed to 30 days, so for other windows we aggregate client-side.
      if (windowDays === 30) {
        const { data, error } = await sbAny
          .from("v_engagement_top_paths")
          .select("*")
          .order("view_count", { ascending: false })
          .limit(25);
        if (error) throw error;
        return (data ?? []) as TopPath[];
      }
      const { data, error } = await sbAny
        .from("page_views")
        .select("path, user_id, session_id, duration_ms, viewed_at")
        .gte("viewed_at", sinceIso)
        .limit(50_000);
      if (error) throw error;
      const agg = new Map<string, { count: number; visitors: Set<string>; totalDur: number; durCount: number; last: string }>();
      for (const row of (data ?? []) as any[]) {
        const key = row.path as string;
        const visitorKey = row.user_id ?? row.session_id;
        if (!agg.has(key)) agg.set(key, { count: 0, visitors: new Set(), totalDur: 0, durCount: 0, last: row.viewed_at });
        const e = agg.get(key)!;
        e.count++;
        e.visitors.add(visitorKey);
        if (row.duration_ms) { e.totalDur += row.duration_ms; e.durCount++; }
        if (row.viewed_at > e.last) e.last = row.viewed_at;
      }
      return Array.from(agg.entries())
        .map(([path, e]) => ({
          path,
          view_count: e.count,
          unique_visitors: e.visitors.size,
          avg_duration_ms: e.durCount > 0 ? Math.round(e.totalDur / e.durCount) : null,
          last_viewed_at: e.last,
        }))
        .sort((a, b) => b.view_count - a.view_count)
        .slice(0, 25);
    },
  });

  const { data: byOrgType, isLoading: byOrgTypeLoading } = useQuery({
    queryKey: ["engagement-by-org-type"],
    queryFn: async () => {
      const { data, error } = await sbAny
        .from("v_engagement_by_org_type")
        .select("*")
        .order("view_count", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OrgTypeRow[];
    },
  });

  const { data: orgRecency, isLoading: orgRecencyLoading } = useQuery({
    queryKey: ["engagement-org-recency"],
    queryFn: async () => {
      const { data, error } = await sbAny
        .from("v_engagement_org_recency")
        .select("*")
        .order("last_viewed_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as OrgRecencyRow[];
    },
  });

  const { data: dailyVolume } = useQuery({
    queryKey: ["engagement-daily-volume"],
    queryFn: async () => {
      const { data, error } = await sbAny
        .from("v_engagement_daily_volume")
        .select("*")
        .order("day");
      if (error) throw error;
      return (data ?? []) as DailyVolumeRow[];
    },
  });

  const { data: recentViews } = useQuery({
    queryKey: ["engagement-recent-views"],
    queryFn: async () => {
      const { data, error } = await sbAny
        .from("page_views")
        .select("id, user_id, org_type, role, path, referrer, viewed_at")
        .order("viewed_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as RecentView[];
    },
  });

  const totals = useMemo(() => {
    if (!byOrgType) return { views: 0, visitors: 0, signedIn: 0 };
    return byOrgType.reduce(
      (acc, r) => ({
        views: acc.views + r.view_count,
        visitors: acc.visitors + r.unique_visitors,
        signedIn: acc.signedIn + r.signed_in_visitors,
      }),
      { views: 0, visitors: 0, signedIn: 0 },
    );
  }, [byOrgType]);

  const maxDailyViews = useMemo(
    () => Math.max(1, ...(dailyVolume ?? []).map((d) => d.view_count)),
    [dailyVolume],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" /> Engagement
          </h1>
          <p className="text-sm text-muted-foreground">
            Who visited what, when. In-house tracking — no third-party scripts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={String(windowDays)} onValueChange={(v) => setWindowDays(Number(v) as WindowDays)}>
            <TabsList>
              <TabsTrigger value="7">7d</TabsTrigger>
              <TabsTrigger value="30">30d</TabsTrigger>
              <TabsTrigger value="90">90d</TabsTrigger>
            </TabsList>
          </Tabs>
          <DownloadReportButton
            rows={topPaths ?? []}
            columns={[
              { key: "path", label: "Path" },
              { key: "view_count", label: "Views" },
              { key: "unique_visitors", label: "Unique visitors" },
              { key: "avg_duration_ms", label: "Avg duration (ms)" },
              dateColumn("last_viewed_at", "Last viewed"),
            ]}
            title="Engagement — Top Paths"
            filename="engagement-top-paths"
          />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Eye className="h-3.5 w-3.5" /> Page views (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-display font-bold">{totals.views.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-3.5 w-3.5" /> Unique visitors (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-display font-bold">{totals.visitors.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5" /> Signed-in visitors (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-display font-bold">{totals.signedIn.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5" /> Active orgs (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-display font-bold">{(orgRecency?.length ?? 0).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily volume sparkline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily volume — last 30 days</CardTitle>
        </CardHeader>
        <CardContent>
          {!dailyVolume?.length ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No activity yet.</p>
          ) : (
            <div className="flex items-end gap-1 h-32">
              {dailyVolume.map((d) => {
                const h = (d.view_count / maxDailyViews) * 100;
                return (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1" title={`${d.day}: ${d.view_count} views`}>
                    <div
                      className="w-full bg-primary/70 rounded-t"
                      style={{ height: `${Math.max(2, h)}%` }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two-column: top paths + by org type */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Top paths</CardTitle>
          </CardHeader>
          <CardContent>
            {topPathsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : !topPaths?.length ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No views yet.</p>
            ) : (
              <div className="space-y-1">
                {topPaths.map((p) => (
                  <div key={p.path} className="flex items-center justify-between gap-3 py-1.5 border-b border-border last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono truncate">{p.path}</p>
                      <p className="text-[10px] text-muted-foreground">
                        avg {formatDuration(p.avg_duration_ms)} · last {formatDistanceToNow(new Date(p.last_viewed_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{p.view_count.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">{p.unique_visitors} unique</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">By visitor type</CardTitle>
          </CardHeader>
          <CardContent>
            {byOrgTypeLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : !byOrgType?.length ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No data.</p>
            ) : (
              <div className="space-y-2">
                {byOrgType.map((row) => (
                  <div key={row.org_type} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Globe className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm capitalize">{row.org_type}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold">{row.view_count.toLocaleString()}</span>
                      <span className="text-[10px] text-muted-foreground ml-2">{row.unique_visitors} u</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Org recency table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Most recently active organisations</CardTitle>
        </CardHeader>
        <CardContent>
          {orgRecencyLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : !orgRecency?.length ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No signed-in org activity yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b border-border">
                  <tr>
                    <th className="text-left py-2 pr-4">Organisation</th>
                    <th className="text-left py-2 pr-4">Type</th>
                    <th className="text-right py-2 pr-4">Views</th>
                    <th className="text-right py-2 pr-4">Active users</th>
                    <th className="text-right py-2 pr-4">Active days</th>
                    <th className="text-right py-2">Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {orgRecency.map((r) => (
                    <tr key={r.organisation_id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-4 font-mono text-xs">{r.organisation_id.slice(0, 8)}…</td>
                      <td className="py-2 pr-4 capitalize">{r.org_type || "—"}</td>
                      <td className="py-2 pr-4 text-right">{r.view_count_30d}</td>
                      <td className="py-2 pr-4 text-right">{r.active_users_30d}</td>
                      <td className="py-2 pr-4 text-right">{r.active_days_30d}</td>
                      <td className="py-2 text-right text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(r.last_viewed_at), { addSuffix: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live tail */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {!recentViews?.length ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No activity yet.</p>
          ) : (
            <div className="space-y-1">
              {recentViews.map((v) => (
                <div key={v.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-border last:border-0 text-sm">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {v.org_type ? (
                      <Badge variant="outline" className="capitalize text-[10px]">{v.org_type}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">anon</Badge>
                    )}
                    <span className="font-mono text-xs truncate">{v.path}</span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(v.viewed_at), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
