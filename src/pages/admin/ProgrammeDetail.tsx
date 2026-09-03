import { useState, lazy, Suspense, type ReactNode, type ComponentProps } from "react";
import { Link, useParams } from "react-router-dom";
import {
  useProgramme,
  useProgrammeMembers,
  useProgrammeMemberStatuses,
  useAddProgrammeMember,
  useResendProgrammeInvites,
  useRemoveProgrammeMember,
  useGrantSystemAdmin,
  useProgrammeBudget,
  useAddBudgetLine,
  useUpdateBudgetLine,
  useDeleteBudgetLine,
  useProgrammeInstitutions,
  useProgrammeEngagements,
  useAddEngagement,
  useDeleteEngagement,
  useEngagementFollowups,
  useAddEngagementFollowup,
  type ProgrammeMemberRole,
  type ProgrammeBudgetLine,
  type ProgrammeInstitution,
} from "@/hooks/usePrograms";
import { useProgrammeRecommendedScenarios } from "@/hooks/useScenarios";
import { useAuth } from "@/contexts/AuthContext";
import InstitutionCombobox, { MultiInstitutionCombobox } from "@/components/programme/InstitutionCombobox";
import InstitutionMap from "@/components/programme/InstitutionMap";
import { FUEL_PROPERTIES, type FuelKey } from "@/lib/cookingCost";
import { getProgrammeBaseline, type BaselineGroup } from "@/lib/baseline/taitaTaveta";

// ECharts is heavy (~380 KB gzip). Load it lazily so the programme shell —
// stats, tables, cards — paints instantly and the charts stream in after,
// instead of blocking the whole page behind the charting bundle.
const ReactECharts = lazy(() => import("echarts-for-react"));

// Chart wrapper: renders the ECharts lazily with a light placeholder so there's
// no layout shift while the bundle loads.
function Chart(props: ComponentProps<typeof ReactECharts>) {
  const height = (props.style as { height?: number | string } | undefined)?.height ?? 300;
  return (
    <Suspense fallback={<div style={{ height }} className="grid place-items-center text-xs text-muted-foreground">Loading chart…</div>}>
      <ReactECharts {...props} />
    </Suspense>
  );
}
import steamImg from "@/assets/fuels/steam.webp";
import lpgImg from "@/assets/fuels/lpg-tank.jpg";
import electricImg from "@/assets/fuels/electric-induction.webp";
import briquettesImg from "@/assets/fuels/briquettes.jpg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft, Users, FolderKanban, Loader2, Plus, Trash2, UserPlus, Wallet,
  Phone, Pencil, Building2, MapPin, Utensils, Search, ChevronLeft, ChevronRight,
  Handshake, CalendarDays, MessageSquarePlus, CornerDownRight, Send,
  Download, GraduationCap, Stethoscope, Landmark, Fuel, Zap, Users2, ArrowRight,
} from "lucide-react";

// Turns a resend-invite summary into a single human-readable toast line.
function resendSummary(r: { sent: number; skipped: number; failed: number }): string {
  const parts: string[] = [];
  if (r.sent) parts.push(`${r.sent} invite${r.sent === 1 ? "" : "s"} resent`);
  if (r.skipped) parts.push(`${r.skipped} skipped (already set password)`);
  if (r.failed) parts.push(`${r.failed} failed`);
  return parts.join(" · ") || "No pending invites to resend";
}

const programmeStatusColors: Record<string, string> = {
  planning: "bg-muted text-muted-foreground",
  procurement: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  completed: "bg-emerald-100 text-emerald-800",
};

const roleLabels: Record<ProgrammeMemberRole, string> = {
  programme_lead: "Lead",
  programme_editor: "Editor",
  programme_viewer: "Viewer",
  county_pipeline_viewer: "County pipeline (read-only)",
};

const fmtKsh = (n: number) => `KSh ${Math.round(n).toLocaleString()}`;

// Admin route wrapper (host — full edit + member management, with a back link
// to the Projects list).
export default function ProgrammeDetail() {
  const { id } = useParams<{ id: string }>();
  return <ProgrammeWorkspace programmeId={id!} canEdit canManageMembers showBack />;
}

// The shared project workspace, reused by the admin console (host) and the
// member portal (src/pages/programme/ProgrammeMemberPage.tsx). Capabilities are
// passed in: `canEdit` gates budget/supplier changes, `canManageMembers` gates
// adding/removing users. RLS is the real backstop; these just hide controls.
export function ProgrammeWorkspace({
  programmeId,
  canEdit,
  canManageMembers,
  showBack = false,
}: {
  programmeId: string;
  canEdit: boolean;
  canManageMembers: boolean;
  showBack?: boolean;
}) {
  const { data: programme, isLoading } = useProgramme(programmeId);

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!programme) {
    return (
      <div className="space-y-4">
        {showBack && <BackLink />}
        <p className="text-sm text-muted-foreground">Programme not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showBack && <BackLink />}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <FolderKanban className="h-6 w-6 text-primary" /> {programme.name}
          </h1>
          {programme.description && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{programme.description}</p>}
        </div>
        <Badge className={`${programmeStatusColors[programme.status] ?? ""}`}>{programme.status}</Badge>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="institutions">Institutions</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="map">Map</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-4">
          <OverviewTab programmeId={programme.id} />
        </TabsContent>
        <TabsContent value="institutions" className="pt-4">
          <ProgrammeInstitutions programmeId={programme.id} />
        </TabsContent>
        <TabsContent value="equipment" className="pt-4">
          <EquipmentTab />
        </TabsContent>
        <TabsContent value="members" className="pt-4">
          <MembersTab programmeId={programme.id} canManage={canManageMembers} />
        </TabsContent>
        <TabsContent value="engagement" className="pt-4">
          <EngagementTab programmeId={programme.id} canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="map" className="pt-4">
          <MapTab programmeId={programme.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/admin/programmes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" /> Programmes
    </Link>
  );
}

function BudgetStat({ label, value, tone }: { label: string; value: string; tone?: "danger" }) {
  return (
    <div className={`rounded-xl p-5 shadow-card border ${tone === "danger" ? "border-destructive bg-destructive/5" : "border-border bg-card"}`}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-2xl font-display font-bold mt-1 ${tone === "danger" ? "text-destructive" : ""}`}>{value}</p>
    </div>
  );
}

// Shared budget maths used by both Overview and Budget tabs (react-query
// caches the underlying fetch, so adding an item on the Budget tab reflects
// on Overview automatically). Budget lines are standalone allocations now —
// there is no programme-level total to draw down against.
function useBudgetSummary(programmeId: string) {
  const query = useProgrammeBudget(programmeId);
  const allocated = (query.data ?? []).reduce((sum, l) => sum + Number(l.amount_ksh || 0), 0);
  return { ...query, allocated };
}

// ---- Institution roster ---------------------------------------------------
// Formats a "meals/day" figure; the seed derives it from headcount so it may
// be an estimate (see the Taita Taveta seed migration) or blank (catering).
const fmtMeals = (row: { meals_per_day: number | null; meals_served_per_day: number | null }) => {
  const m = row.meals_per_day ?? row.meals_served_per_day;
  return m != null ? Number(m).toLocaleString() : "—";
};

const fmtLocation = (row: { sub_county: string | null; county: string | null }) =>
  [row.sub_county, row.county].filter(Boolean).join(", ") || "—";

// Headcount of people at the institution, labelled by type. Schools carry
// students, prisons inmates, hospitals beds; catering outlets have no cover
// count surveyed so they fall back to kitchen staff.
const UNIT_BY_TYPE: Record<string, string> = {
  school: "students", prison: "inmates", hospital: "beds",
  hotel: "staff", restaurant: "staff",
};
const fmtHeadcount = (row: {
  institution_type: string; number_of_students: number | null; number_of_staff: number | null;
}) => {
  const n = row.number_of_students ?? row.number_of_staff;
  if (n == null) return "—";
  const unit = UNIT_BY_TYPE[row.institution_type] ?? "people";
  return `${Number(n).toLocaleString()} ${unit}`;
};

// Shared roster of a programme's institutions with the fields the team asked
// to see on the Overview: name, meals/day, contact, and location. Reused by
// the admin Overview tab and (via ProgrammeWorkspace) any host surface.
// Verification status → a small coloured dot with a tooltip.
const VERIFY_TONE: Record<string, string> = {
  verified: "bg-green-500",
  flagged: "bg-destructive",
  unverified: "bg-muted-foreground/40",
};

const fmtPayback = (months: number | null | undefined) => {
  if (months == null) return "—";
  if (months < 12) return `${months} mo`;
  return `${(months / 12).toFixed(1)} yr`;
};

const PER_PAGE = 50;

type RecommendedMap = Record<string, { payback_months?: number | null } | undefined>;

// The searchable, paginated institution table. Extracted so it can back both
// the generic (non-baseline) programme view and each dataset-card drill-down.
// `title` labels the table header (e.g. the dataset group name).
function InstitutionTable({
  rows: all,
  recommended,
  title = "Institutions",
}: {
  rows: ProgrammeInstitution[];
  recommended: RecommendedMap;
  title?: string;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  // Search by institution name OR contact (person / phone).
  const q = query.trim().toLowerCase();
  const filtered = q
    ? all.filter((i) =>
        [i.name, i.contact_person, i.contact_phone]
          .some((v) => (v ?? "").toLowerCase().includes(q)))
    : all;

  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const clampedPage = Math.min(page, pageCount - 1);
  const rows = filtered.slice(clampedPage * PER_PAGE, clampedPage * PER_PAGE + PER_PAGE);
  const onSearch = (v: string) => { setQuery(v); setPage(0); };

  return (
    <div className="rounded-xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border flex-wrap">
        <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" /> {title}
          <Badge variant="secondary">{filtered.length}</Badge>
        </p>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search by name or contact…"
            className="pl-8 h-9"
          />
        </div>
      </div>

      {!all.length ? (
        <p className="text-sm text-muted-foreground text-center py-12">No institutions assigned to this programme yet.</p>
      ) : !rows.length ? (
        <p className="text-sm text-muted-foreground text-center py-12">No institutions match “{query}”.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                <th className="px-5 py-2 font-medium">Institution</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap">People</th>
                <th className="px-3 py-2 font-medium text-right whitespace-nowrap">Meals / day</th>
                <th className="px-3 py-2 font-medium text-right whitespace-nowrap">Payback</th>
                <th className="px-3 py-2 font-medium">Contact</th>
                <th className="px-5 py-2 font-medium">Location</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                  <td className="px-5 py-2.5 font-medium">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 ${VERIFY_TONE[i.verification_status] ?? VERIFY_TONE.unverified}`}
                        title={`Data ${i.verification_status ?? "unverified"}`}
                      />
                      {i.name}
                      {i.women_led && (
                        <Badge variant="secondary" className="text-[9px] font-normal">women-led</Badge>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge variant="outline" className="text-[10px] font-normal capitalize">
                      {String(i.institution_type).replace(/_/g, " ")}
                    </Badge>
                    {i.segment && (
                      <span className="block text-[10px] text-muted-foreground mt-0.5 capitalize">{i.segment}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{fmtHeadcount(i)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 justify-end">
                      <Utensils className="h-3 w-3 text-muted-foreground" />{fmtMeals(i)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap text-muted-foreground">
                    {fmtPayback(recommended[i.id]?.payback_months)}
                  </td>
                  <td className="px-3 py-2.5">
                    {i.contact_person || i.contact_phone ? (
                      <div className="leading-tight">
                        {i.contact_person && <span className="block">{i.contact_person}</span>}
                        {i.contact_phone && (
                          <a href={`tel:${i.contact_phone}`} className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
                            <Phone className="h-3 w-3" />{i.contact_phone}
                          </a>
                        )}
                      </div>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-5 py-2.5">
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3 w-3" />{fmtLocation(i)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pageCount > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-border text-xs text-muted-foreground">
              <span>
                {clampedPage * PER_PAGE + 1}–{clampedPage * PER_PAGE + rows.length} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" disabled={clampedPage === 0} onClick={() => setPage(clampedPage - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span>Page {clampedPage + 1} / {pageCount}</span>
                <Button size="icon" variant="ghost" className="h-7 w-7" disabled={clampedPage >= pageCount - 1} onClick={() => setPage(clampedPage + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Per-group icon + accent used on the dataset cards and drill-down header.
const GROUP_STYLE: Record<string, { Icon: typeof GraduationCap; tint: string; ring: string }> = {
  learning: { Icon: GraduationCap, tint: "text-blue-600 bg-blue-100", ring: "hover:border-blue-300" },
  catering: { Icon: Utensils, tint: "text-amber-600 bg-amber-100", ring: "hover:border-amber-300" },
  health: { Icon: Stethoscope, tint: "text-rose-600 bg-rose-100", ring: "hover:border-rose-300" },
  correctional: { Icon: Landmark, tint: "text-emerald-700 bg-emerald-100", ring: "hover:border-emerald-300" },
};

// A single dataset-overview card (from the workbook Executive Dashboard). The
// big number is the live DB count for the group (which equals the workbook
// record count); the exact %/population/funder stats are the published baseline.
function DatasetCard({
  group, liveCount, onSelect,
}: {
  group: BaselineGroup;
  liveCount: number;
  onSelect: () => void;
}) {
  const style = GROUP_STYLE[group.key];
  const Icon = style.Icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group flex h-full flex-col text-left rounded-xl border border-border bg-card shadow-card p-5 transition
        hover:shadow-lg hover:-translate-y-0.5 ${style.ring} focus:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`h-10 w-10 rounded-lg grid place-items-center ${style.tint}`}>
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display font-bold leading-tight">{group.title}</p>
            <p className="text-[11px] text-muted-foreground">{group.source}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-display font-bold tabular-nums leading-none">{liveCount.toLocaleString()}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">Records</p>
        </div>
      </div>

      <dl className="mt-4 space-y-2.5">
        <StatLine icon={<Fuel className="h-3.5 w-3.5" />} label="Primary cooking fuel" value={group.primaryFuel} />
        <StatLine icon={<Zap className="h-3.5 w-3.5" />} label="Electricity access" value={group.electricityAccess} />
        <StatLine icon={<Users2 className="h-3.5 w-3.5" />} label="Key population metric" value={group.keyPopulation} />
        <StatLine icon={<Handshake className="h-3.5 w-3.5" />} label="Data collection funder / implementers" value={group.funders} />
      </dl>

      <span className="mt-auto pt-4 inline-flex items-center gap-1 text-xs font-medium text-primary">
        View institutions <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}

function StatLine({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground/70 mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
        <dd className="text-xs text-foreground leading-snug">{value}</dd>
      </div>
    </div>
  );
}

// Institutions tab. For the IRENA – Taita Taveta baseline programme this shows
// four dataset-overview cards (Learning / Catering / Health / Correctional)
// that drill down into a filtered roster; every other programme keeps the plain
// searchable table.
export function ProgrammeInstitutions({ programmeId }: { programmeId: string }) {
  const { data: programme } = useProgramme(programmeId);
  const { data: institutions, isLoading } = useProgrammeInstitutions(programmeId);
  const { data: recommended = {} } = useProgrammeRecommendedScenarios(programmeId);
  const all = institutions ?? [];
  const baseline = getProgrammeBaseline(programme?.name);
  const [group, setGroup] = useState<BaselineGroup | null>(null);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      </div>
    );
  }

  // Non-baseline programmes: the original flat, searchable table.
  if (!baseline) {
    return <InstitutionTable rows={all} recommended={recommended} />;
  }

  // Baseline drill-down: a selected group's roster with a back button.
  if (group) {
    const groupRows = all.filter((i) => group.institutionTypes.includes(i.institution_type));
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-1 px-2" onClick={() => setGroup(null)}>
            <ArrowLeft className="h-4 w-4" /> All categories
          </Button>
          <span className="text-sm font-medium text-muted-foreground">{group.title}</span>
        </div>
        <InstitutionTable key={group.key} rows={groupRows} recommended={recommended} title={group.title} />
      </div>
    );
  }

  // Baseline landing: the four dataset-overview cards.
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {baseline.groups.map((g) => (
        <DatasetCard
          key={g.key}
          group={g}
          liveCount={all.filter((i) => g.institutionTypes.includes(i.institution_type)).length}
          onSelect={() => setGroup(g)}
        />
      ))}
    </div>
  );
}

// Blue → teal → green gradient family (top-light, bottom-saturated per bar) —
// gives the cooking-method bars the glossy, multi-colour look of the reference
// design without needing the echarts-gl 3D extension.
const COOKING_BAR_COLORS: [string, string][] = [
  ["#60a5fa", "#2563eb"], // blue
  ["#38bdf8", "#0ea5e9"], // sky
  ["#2dd4bf", "#0d9488"], // teal
  ["#4ade80", "#16a34a"], // green
  ["#a3e635", "#65a30d"], // lime
  ["#fbbf24", "#d97706"], // amber (overflow)
];

// Vertical gradient bar chart, styled after the requested reference: coloured
// gradient columns with the value printed on top of each bar. Shared by the
// cooking-method chart and the derived-energy charts. `unit` is the noun in the
// tooltip; `valueFmt` formats both the tooltip and on-bar labels.
function categoryBarOption(
  items: { name: string; value: number }[],
  opts: { unit: string; valueFmt?: (v: number) => string },
) {
  const fmt = opts.valueFmt ?? ((v: number) => Number(v).toLocaleString());
  return {
    textStyle: { fontFamily: "'DM Sans', system-ui, sans-serif" },
    grid: { top: 36, right: 16, bottom: 28, left: 40, containLabel: true },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: "rgba(20, 40, 30, 0.92)",
      borderColor: "transparent",
      textStyle: { color: "#fff", fontSize: 12 },
      formatter: (p: { name: string; value: number }[]) =>
        `${p[0].name}<br/><b>${fmt(p[0].value)}</b> ${opts.unit}`,
    },
    xAxis: {
      type: "category",
      data: items.map((i) => i.name),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: "#cbd5e1" } },
      axisLabel: { fontSize: 12, color: "#475569" },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { type: "dashed", color: "#e5e7eb" } },
      axisLabel: { show: false },
    },
    series: [{
      type: "bar",
      barWidth: "52%",
      data: items.map((i, idx) => {
        const [top, bottom] = COOKING_BAR_COLORS[idx % COOKING_BAR_COLORS.length];
        return {
          value: i.value,
          itemStyle: {
            borderRadius: [6, 6, 0, 0],
            color: {
              type: "linear", x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: top }, { offset: 1, color: bottom }],
            },
          },
        };
      }),
      label: {
        show: true,
        position: "top",
        fontSize: 12,
        fontWeight: "bold",
        color: "#334155",
        formatter: (p: { value: number }) => fmt(p.value),
      },
    }],
  };
}

// Short axis labels for the derived-energy charts (the full category names are
// too long to sit under narrow columns).
const ENERGY_SHORT: Record<string, string> = {
  "Learning Institutions": "Learning",
  "Catering Outlets (SMEs)": "Catering",
  "Health Facilities": "Health",
  "Correctional Institutions": "Correctional",
};

// Solid slice colours drawn from the same blue → green family as the bars, so
// the pie sits in the same palette as the rest of the programme dashboard.
const PIE_COLORS = ["#2563eb", "#0ea5e9", "#0d9488", "#16a34a", "#94a3b8"];

// Donut chart mirroring the workbook's Cross-Cutting Analysis pies (Figure 8):
// each slice labelled with its name and share on the outside, legend on top.
function sharePieOption(items: { name: string; value: number }[], unit: string) {
  return {
    textStyle: { fontFamily: "'DM Sans', system-ui, sans-serif" },
    color: PIE_COLORS,
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(20, 40, 30, 0.92)",
      borderColor: "transparent",
      textStyle: { color: "#fff", fontSize: 12 },
      formatter: (p: { name: string; value: number; percent: number }) =>
        `${p.name}<br/><b>${Number(p.value).toLocaleString()}</b> ${unit} (${p.percent}%)`,
    },
    legend: { top: 0, left: "center", icon: "circle", itemWidth: 9, itemHeight: 9, textStyle: { fontSize: 12, color: "#475569" } },
    series: [{
      type: "pie",
      radius: ["42%", "68%"],
      center: ["50%", "58%"],
      avoidLabelOverlap: true,
      itemStyle: { borderColor: "#fff", borderWidth: 2 },
      label: {
        show: true, position: "outside", lineHeight: 15,
        formatter: "{b}\n{d}%", fontSize: 12, fontWeight: "bold", color: "#334155",
      },
      labelLine: { show: true, length: 12, length2: 10 },
      data: items,
    }],
  };
}

// 100%-stacked bar (one stack per category, one series per fuel). Used for the
// fuel-mix chart: each category column sums to ~100% of that category.
function stackedBarOption(
  categories: string[],
  series: { name: string; color: string; data: number[] }[],
) {
  return {
    textStyle: { fontFamily: "'DM Sans', system-ui, sans-serif" },
    grid: { top: 40, right: 16, bottom: 28, left: 40, containLabel: true },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: "rgba(20, 40, 30, 0.92)",
      borderColor: "transparent",
      textStyle: { color: "#fff", fontSize: 12 },
      valueFormatter: (v: number) => `${Number(v).toFixed(1)}%`,
    },
    legend: { top: 0, left: "center", icon: "circle", itemWidth: 9, itemHeight: 9, textStyle: { fontSize: 12, color: "#475569" } },
    xAxis: {
      type: "category",
      data: categories,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: "#cbd5e1" } },
      axisLabel: { fontSize: 12, color: "#475569" },
    },
    yAxis: {
      type: "value", max: 100,
      splitLine: { lineStyle: { type: "dashed", color: "#e5e7eb" } },
      axisLabel: { fontSize: 11, color: "#94a3b8", formatter: "{value}%" },
    },
    series: series.map((s, i) => ({
      name: s.name,
      type: "bar",
      stack: "fuel",
      barWidth: "52%",
      data: s.data,
      itemStyle: {
        color: s.color,
        // Round only the top segment of each column.
        borderRadius: i === series.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0],
      },
    })),
  };
}

// Fuel colours for the mix chart — semantic and distinct, drawn from the app's
// palette. Firewood (earth), charcoal (slate), LPG (blue), other (muted).
const FUEL_MIX_COLORS = { firewood: "#a16207", charcoal: "#334155", lpg: "#2563eb", other: "#94a3b8" };

// Overview = at-a-glance programme summary: headline counts, the derived energy
// baseline (for the IRENA – Taita Taveta programme), and the current cooking-fuel
// mix. The full institution roster lives on its own tab.
function OverviewTab({ programmeId }: { programmeId: string }) {
  const { data: programme } = useProgramme(programmeId);
  const { data: institutions } = useProgrammeInstitutions(programmeId);
  const { data: members } = useProgrammeMembers(programmeId);
  const baseline = getProgrammeBaseline(programme?.name);

  // Derived annual energy consumption by category (workbook Table 19), split
  // into two compact charts so neither axis has to mix tonnes with kWh.
  const energyFuel = (baseline?.energyByCategory ?? []).map((e) => ({
    name: ENERGY_SHORT[e.category] ?? e.category, value: e.fuelTonnes,
  }));
  const energyElec = (baseline?.energyByCategory ?? []).map((e) => ({
    name: ENERGY_SHORT[e.category] ?? e.category, value: e.elecKwh,
  }));
  // Geographic distribution across all 409 records (workbook Figure 8).
  const geoData = (baseline?.geoDistribution ?? []).map((g) => ({
    name: g.subCounty, value: g.records,
  }));
  // Fuel mix by category (workbook Figure 4) — one stacked column per category.
  const fuelMixCategories = (baseline?.fuelMixByCategory ?? []).map(
    (f) => ENERGY_SHORT[f.category] ?? f.category);
  const fuelMixSeries = [
    { name: "Firewood", color: FUEL_MIX_COLORS.firewood, data: (baseline?.fuelMixByCategory ?? []).map((f) => f.firewood) },
    { name: "Charcoal", color: FUEL_MIX_COLORS.charcoal, data: (baseline?.fuelMixByCategory ?? []).map((f) => f.charcoal) },
    { name: "LPG", color: FUEL_MIX_COLORS.lpg, data: (baseline?.fuelMixByCategory ?? []).map((f) => f.lpg) },
    { name: "Other", color: FUEL_MIX_COLORS.other, data: (baseline?.fuelMixByCategory ?? []).map((f) => f.other) },
  ];
  // Electricity access by category (workbook Figure 2).
  const elecAccessData = (baseline?.electricityAccessByCategory ?? []).map((e) => ({
    name: ENERGY_SHORT[e.category] ?? e.category, value: e.accessPct,
  }));

  // Load the PDF/xlsx report generator (jspdf + xlsx, ~200 KB gzip) only on
  // click, so viewing a programme never pays for the export bundle upfront.
  const handleExport = async () => {
    if (!baseline || !programme || !institutions) return;
    const { exportIrenaReport } = await import("@/lib/irenaReport");
    exportIrenaReport({ programme: { name: programme.name }, institutions, baseline });
  };

  // Totals across every institution in the programme (students or, for
  // catering, kitchen staff) and their combined meals/day.
  const totalPeople = (institutions ?? []).reduce(
    (s, i) => s + (Number(i.number_of_students ?? i.number_of_staff) || 0), 0);
  const totalMeals = (institutions ?? []).reduce(
    (s, i) => s + (Number(i.meals_per_day ?? i.meals_served_per_day) || 0), 0);

  // How many institutions currently use each cooking method (their existing
  // fuel, before any clean-cooking transition). Drives the bar chart below.
  // A missing current_fuel is kept separate as "Not recorded" rather than
  // being lumped into the "other" (biomass pellets) enum value.
  const fuelCounts = (institutions ?? []).reduce<Record<string, number>>((acc, i) => {
    const fuel = (i.current_fuel as string) || "__unknown";
    acc[fuel] = (acc[fuel] ?? 0) + 1;
    return acc;
  }, {});
  const fuelData = Object.entries(fuelCounts)
    .map(([fuel, count]) => ({
      name: fuel === "__unknown" ? "Not recorded" : (FUEL_PROPERTIES[fuel as FuelKey]?.label ?? fuel),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  // Live "current cooking method" bar — shown for every programme (standalone
  // for non-baseline ones, paired with the fuel-mix chart for the baseline).
  const cookingMethodCard = (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">Institutions by current cooking method</p>
      {!institutions?.length ? (
        <p className="text-sm text-muted-foreground text-center py-10">No institutions yet.</p>
      ) : (
        <Chart style={{ height: 320 }} option={categoryBarOption(fuelData.map((f) => ({ name: f.name, value: f.count })), { unit: "institutions" })} notMerge lazyUpdate />
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {baseline && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-muted-foreground max-w-2xl">
            Baseline figures are drawn from the A2CT survey of {baseline.meta.totalRecords.toLocaleString()} institutions
            across {baseline.meta.subCounties} ({baseline.meta.period}).
          </p>
          <Button size="sm" onClick={handleExport} disabled={!institutions}>
            <Download className="h-4 w-4 mr-2" /> Export report
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <BudgetStat label="Institutions" value={(institutions?.length ?? 0).toLocaleString()} />
        <BudgetStat label="People" value={totalPeople.toLocaleString()} />
        <BudgetStat label="Meals / day" value={totalMeals.toLocaleString()} />
        <BudgetStat label="Members" value={(members?.length ?? 0).toLocaleString()} />
      </div>

      {baseline && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Estimated annual energy consumption</p>
          <p className="text-xs text-muted-foreground mb-4">Derived (Tier 3) from the A2CT baseline — per category, by fuel and electricity.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Cooking fuel — tonnes / year</p>
              <Chart style={{ height: 260 }} option={categoryBarOption(energyFuel, { unit: "tonnes / yr", valueFmt: (v) => Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 }) })} notMerge lazyUpdate />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Electricity — kWh / year</p>
              <Chart style={{ height: 260 }} option={categoryBarOption(energyElec, { unit: "kWh / yr", valueFmt: (v) => `${(v / 1000).toFixed(0)}k` })} notMerge lazyUpdate />
            </div>
          </div>
        </div>
      )}

      {baseline ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-border bg-card p-5 shadow-card">
              <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Geographic distribution</p>
              <p className="text-xs text-muted-foreground mb-1">By sub-county across all {baseline.meta.totalRecords.toLocaleString()} records.</p>
              <Chart style={{ height: 320 }} option={sharePieOption(geoData, "records")} notMerge lazyUpdate />
            </div>
            <div className="rounded-xl border border-border bg-card p-5 shadow-card">
              <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Electricity access</p>
              <p className="text-xs text-muted-foreground mb-1">Share of each category connected to the grid.</p>
              <Chart style={{ height: 320 }} option={categoryBarOption(elecAccessData, { unit: "electrified", valueFmt: (v) => `${v.toFixed(0)}%` })} notMerge lazyUpdate />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-border bg-card p-5 shadow-card">
              <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Primary fuel mix by category</p>
              <p className="text-xs text-muted-foreground mb-1">Share of each fuel within a category (% of category).</p>
              <Chart style={{ height: 320 }} option={stackedBarOption(fuelMixCategories, fuelMixSeries)} notMerge lazyUpdate />
            </div>
            {cookingMethodCard}
          </div>
        </>
      ) : (
        cookingMethodCard
      )}
    </div>
  );
}

// Clean-cooking technologies showcased for this programme. Defined once here
// (presentation catalog — not per-institution data). Images are royalty-free
// photos (Wikimedia Commons, CC-licensed) stored in src/assets/fuels.
type EquipmentSpec = { label: string; value: string };
type EquipmentItem = {
  key: string;
  name: string;
  tagline: string;
  image: string;
  description: string;
  specs: EquipmentSpec[];
};

const EQUIPMENT_CATALOG: EquipmentItem[] = [
  {
    key: "steam",
    name: "Steam Cooking",
    tagline: "Central boiler → steam-jacketed pots",
    image: steamImg,
    description:
      "A central boiler generates pressurised steam that is piped into steam-jacketed pots and tilting pans. Heat transfers gently and evenly through the jacket wall, so large batches of githeri, rice, beans and ugali cook thoroughly without scorching and with minimal stirring. This is the workhorse for the very largest institutional kitchens.",
    specs: [
      { label: "Efficiency", value: "High at scale — one boiler feeds many pots" },
      { label: "Heat source", value: "Electric, LPG or biomass-fired boiler" },
      { label: "Pot capacity", value: "50–500 L steam-jacketed vessels" },
      { label: "Labour", value: "Low — even heat, little pot-watching" },
      { label: "Lifespan", value: "15+ years, low maintenance" },
    ],
  },
  {
    key: "lpg",
    name: "LPG",
    tagline: "Clean gas burners & bulk reticulation",
    image: lpgImg,
    description:
      "Liquefied petroleum gas burns with a clean blue flame in high-output institutional burners, fed either from manifolded cylinders or a bulk reticulated tank. It is the fastest and most familiar leap away from firewood and charcoal — instant, finely controllable heat with no indoor smoke and a small kitchen footprint.",
    specs: [
      { label: "Burner efficiency", value: "~58% — high useful heat" },
      { label: "Control", value: "Instant ignition, precise flame adjustment" },
      { label: "Supply", value: "Manifolded cylinders or bulk reticulated tank" },
      { label: "Air quality", value: "No indoor smoke — healthier kitchens" },
      { label: "Availability", value: "Refills widely available across Kenya" },
    ],
  },
  {
    key: "electric",
    name: "Electric (Induction)",
    tagline: "Zero-emission induction & resistance cooking",
    image: electricImg,
    description:
      "Induction cookers heat the pot directly through a magnetic field, wasting almost no energy to the surrounding air, while resistance hotplates offer a simpler lower-cost electric option. Both produce zero on-site emissions and a cool, smoke-free kitchen, and pair naturally with a reliable grid connection or a solar-plus-storage system.",
    specs: [
      { label: "Efficiency", value: "~82% — the highest of all options" },
      { label: "Emissions", value: "Zero on-site; no smoke or flame" },
      { label: "Control", value: "Precise, programmable temperature" },
      { label: "Power", value: "Grid or solar + battery" },
      { label: "Cookware", value: "Needs induction-compatible flat-bottom pots" },
    ],
  },
  {
    key: "briquettes",
    name: "Briquettes",
    tagline: "Compressed biomass in efficient stoves",
    image: briquettesImg,
    description:
      "Briquettes are compressed logs or blocks of biomass — sawdust, char dust and agricultural residue — burned in improved or gasifier institutional stoves. With higher energy density and far less smoke than loose firewood, they are a renewable, lower-cost step up that also supports local briquette-making livelihoods.",
    specs: [
      { label: "Fuel", value: "Renewable, locally produced biomass" },
      { label: "Stove", value: "Improved / gasifier institutional stoves" },
      { label: "Energy density", value: "Higher & more consistent than firewood" },
      { label: "Running cost", value: "Lower than LPG or electricity" },
      { label: "Impact", value: "Supports local briquette producers" },
    ],
  },
];

// Equipment = the clean-cooking technology catalog for the programme (the tab
// formerly labelled "Budget"). Static presentation content shown programme-wide.
function EquipmentTab() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground max-w-3xl">
        Clean-cooking technologies profiled for this programme. Each is a candidate transition pathway for surveyed
        institutions — the right fit depends on meal volume, available energy, and budget.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {EQUIPMENT_CATALOG.map((eq) => (
          <div key={eq.key} className="rounded-xl border border-border bg-card shadow-card overflow-hidden flex flex-col">
            <div className="relative h-64 w-full bg-muted">
              <img src={eq.image} alt={eq.name} className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                <h3 className="text-white font-display font-bold text-lg leading-tight">{eq.name}</h3>
                <p className="text-white/85 text-xs">{eq.tagline}</p>
              </div>
            </div>
            <div className="p-5 flex flex-col gap-4 flex-1">
              <p className="text-sm text-muted-foreground leading-relaxed">{eq.description}</p>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                {eq.specs.map((s) => (
                  <div key={s.label} className="flex flex-col">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">{s.label}</dt>
                    <dd className="text-sm text-foreground">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Map = programme-scoped institution map. Reuses the shared InstitutionMap
// (same markers/popups as the national /map page) but shows only this
// programme's geolocated institutions and auto-zooms to fit them.
function MapTab({ programmeId }: { programmeId: string }) {
  const { data: institutions, isLoading } = useProgrammeInstitutions(programmeId);
  const geo = (institutions ?? []).filter((i) => i.latitude != null && i.longitude != null);

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <MapPin className="h-3.5 w-3.5 text-primary" />
        {geo.length.toLocaleString()} of {(institutions?.length ?? 0).toLocaleString()} institutions mapped
      </p>
      {geo.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground shadow-card">
          No institutions in this programme have map coordinates yet.
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden shadow-card">
          <InstitutionMap institutions={geo} className="h-[420px] w-full" />
        </div>
      )}
    </div>
  );
}

type BudgetForm = { name: string; description: string; institution_ids: string[]; amount_ksh: string };
const emptyBudgetForm: BudgetForm = { name: "", description: "", institution_ids: [], amount_ksh: "" };

function BudgetTab({ programmeId, canEdit }: { programmeId: string; canEdit: boolean }) {
  const { data: lines, isLoading, allocated } = useBudgetSummary(programmeId);
  const { data: institutions } = useProgrammeInstitutions(programmeId);
  const { profile, user } = useAuth();
  const addLine = useAddBudgetLine();
  const updateLine = useUpdateBudgetLine();
  const deleteLine = useDeleteBudgetLine();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BudgetForm>(emptyBudgetForm);

  const addedByName = profile?.full_name || user?.email || "Unknown";
  const instNames = (l: ProgrammeBudgetLine) => {
    const ids = l.institution_ids?.length ? l.institution_ids : (l.institution_id ? [l.institution_id] : []);
    return ids.map((id) => institutions?.find((i) => i.id === id)?.name).filter(Boolean) as string[];
  };

  const openAdd = () => { setEditingId(null); setForm(emptyBudgetForm); setOpen(true); };
  const openEdit = (l: ProgrammeBudgetLine) => {
    setEditingId(l.id);
    setForm({
      name: l.name,
      description: l.description ?? "",
      institution_ids: l.institution_ids?.length ? l.institution_ids : (l.institution_id ? [l.institution_id] : []),
      amount_ksh: String(l.amount_ksh),
    });
    setOpen(true);
  };

  const submit = () => {
    const amount = parseFloat(form.amount_ksh);
    if (!form.name.trim() || !amount || amount <= 0) {
      toast.error("Enter a name and a positive amount");
      return;
    }
    const common = {
      programme_id: programmeId,
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      institution_ids: form.institution_ids,
      amount_ksh: amount,
    };
    const onDone = (verb: string) => ({
      onSuccess: () => { toast.success(`Budget item ${verb}`); setOpen(false); setEditingId(null); setForm(emptyBudgetForm); },
      onError: (e: unknown) => toast.error(e instanceof Error ? e.message : `Failed to ${verb === "updated" ? "update" : "add"} budget item`),
    });
    if (editingId) {
      updateLine.mutate({ id: editingId, ...common }, onDone("updated"));
    } else {
      addLine.mutate({ ...common, added_by_name: addedByName }, onDone("added"));
    }
  };

  const saving = addLine.isPending || updateLine.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <BudgetStat label="Total allocated" value={fmtKsh(allocated)} />
        {canEdit && <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-2" /> Add budget item</Button>}
      </div>

      {canEdit && (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditingId(null); setForm(emptyBudgetForm); } }}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? "Edit budget item" : "Add budget item"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" placeholder="e.g. LPG cylinders x40" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1" rows={2} placeholder="What this budget item covers" />
              </div>
              <div>
                <Label>Institutions</Label>
                <MultiInstitutionCombobox
                  programmeId={programmeId}
                  value={form.institution_ids}
                  onChange={(ids) => setForm(f => ({ ...f, institution_ids: ids }))}
                  placeholder="Not tied to any institution"
                />
              </div>
              <div>
                <Label>Amount (KSh) *</Label>
                <Input type="number" value={form.amount_ksh} onChange={e => setForm(f => ({ ...f, amount_ksh: e.target.value }))} className="mt-1" />
              </div>
              {!editingId && (
                <p className="text-[11px] text-muted-foreground">Added by <strong>{addedByName}</strong> — recorded automatically.</p>
              )}
              <Button onClick={submit} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}{editingId ? "Save changes" : "Add item"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : !lines?.length ? (
        <p className="text-sm text-muted-foreground text-center py-8">No budget items yet.</p>
      ) : (
        <div className="space-y-2">
          {lines.map(l => (
            <div key={l.id} className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3 shadow-card">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Wallet className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{l.name}</p>
                    {instNames(l).map((n) => (
                      <Badge key={n} variant="secondary" className="text-[10px] font-normal flex items-center gap-1">
                        <Building2 className="h-3 w-3" />{n}
                      </Badge>
                    ))}
                  </div>
                  {l.description && <p className="text-xs text-muted-foreground mt-0.5">{l.description}</p>}
                  {l.added_by_name && <p className="text-[11px] text-muted-foreground mt-0.5">Added by {l.added_by_name}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium whitespace-nowrap">{fmtKsh(Number(l.amount_ksh))}</p>
                {canEdit && (
                  <>
                    <Button size="icon" variant="ghost" title="Edit" onClick={() => openEdit(l)}>
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Remove" onClick={() => deleteLine.mutate({ id: l.id, programme_id: programmeId })}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Dialog role choices. "admin" is a synthetic option that grants full platform
// access (user_roles admin) rather than a programme_member_role.
type MemberRoleChoice = "admin" | ProgrammeMemberRole;
const ROLE_OPTIONS: { value: MemberRoleChoice; label: string }[] = [
  { value: "admin", label: "Admin — full access (whole site)" },
  { value: "programme_editor", label: "Editor — edit this programme" },
  { value: "programme_viewer", label: "Viewer — read-only" },
];

function MembersTab({ programmeId, canManage }: { programmeId: string; canManage: boolean }) {
  const { data: members, isLoading } = useProgrammeMembers(programmeId);
  const { data: statuses } = useProgrammeMemberStatuses(programmeId);
  const addMember = useAddProgrammeMember();
  const resendInvites = useResendProgrammeInvites();
  const removeMember = useRemoveProgrammeMember();
  const grantAdmin = useGrantSystemAdmin();

  const resend = (member_id?: string) =>
    resendInvites.mutate(
      { programme_id: programmeId, member_id },
      {
        onSuccess: (data) => {
          if (data.failed && !data.sent) toast.error(resendSummary(data));
          else toast.success(resendSummary(data));
        },
        onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to resend invite"),
      },
    );
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", org_name: "", email: "" });
  const [roleChoice, setRoleChoice] = useState<MemberRoleChoice>("programme_viewer");

  const reset = () => {
    setForm({ full_name: "", org_name: "", email: "" });
    setRoleChoice("programme_viewer");
  };

  const submit = () => {
    const isAdmin = roleChoice === "admin";
    // Admins still get created/invited + a membership row (as lead), then are
    // elevated to a full platform admin so they see the whole site.
    const membershipRole: ProgrammeMemberRole = isAdmin ? "programme_lead" : roleChoice;
    addMember.mutate(
      {
        programme_id: programmeId,
        email: form.email.trim(),
        role: membershipRole,
        full_name: form.full_name.trim() || undefined,
        org_name: form.org_name.trim() || undefined,
      },
      {
        onSuccess: (data) => {
          if (isAdmin) {
            const uid = (data?.member as { user_id?: string } | undefined)?.user_id;
            if (uid) grantAdmin.mutate(uid);
          }
          if (data?.created) {
            toast.success(
              data.email_sent
                ? "Invite sent — they'll get a link to set their password (valid 24h)"
                : "User created, but the invite email failed to send",
            );
          } else {
            toast.success(data?.email_sent ? "User added — a notification was emailed" : "User added");
          }
          setOpen(false);
          reset();
        },
        onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to add member"),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">Authorized users in this tenant. Access is granted by role.</p>
        {canManage && (
        <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => resend()}
          disabled={resendInvites.isPending || !members?.length}
          title="Resend the set-password invite to everyone who hasn't set one yet"
        >
          {resendInvites.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
          Resend invites
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><UserPlus className="h-4 w-4 mr-2" /> Add user</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add user to project</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Full name</Label>
                <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className="mt-1" placeholder="Jane Doe" />
              </div>
              <div>
                <Label>Organization</Label>
                <Input value={form.org_name} onChange={e => setForm(f => ({ ...f, org_name: e.target.value }))} className="mt-1" placeholder="e.g. Taita Taveta County" />
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="mt-1" placeholder="user@partner.org" />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={roleChoice} onValueChange={v => setRoleChoice(v as MemberRoleChoice)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-[11px] text-muted-foreground">
                New users are emailed a link to set their password (valid 24h — re-add them to resend).
                Admins see the whole site; editors/viewers see only this programme.
              </p>
              <Button onClick={submit} disabled={!form.email.trim() || addMember.isPending} className="w-full">
                {addMember.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Add user
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : !members?.length ? (
        <p className="text-sm text-muted-foreground text-center py-8">No members yet.</p>
      ) : (
        <div className="space-y-2">
          {members.map(m => (
            <div key={m.id} className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3 shadow-card">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{m.invited_email ?? m.user_id}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="secondary" className="text-[10px]">{roleLabels[m.role]}</Badge>
                    {statuses?.[m.id] === "active" ? (
                      <Badge className="text-[10px] bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>
                    ) : statuses?.[m.id] === "pending" ? (
                      <Badge className="text-[10px] bg-amber-100 text-amber-700 hover:bg-amber-100">Pending</Badge>
                    ) : null}
                  </div>
                </div>
              </div>
              {canManage && (
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => resend(m.id)}
                    disabled={resendInvites.isPending}
                    title="Resend set-password invite (skips them if they've already set one)"
                  >
                    <Send className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeMember.mutate({ id: m.id, programme_id: programmeId })}
                    title="Remove member"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Engagement log — meetings, workshops, calls and other interactions the team
// has had during the programme (replaces the old Suppliers tab).
type EngagementForm = { title: string; organisation: string; engagement_date: string; notes: string; institution_id: string | null };
const emptyEngagementForm: EngagementForm = { title: "", organisation: "", engagement_date: "", notes: "", institution_id: null };

function EngagementTab({ programmeId, canEdit }: { programmeId: string; canEdit: boolean }) {
  const { data: engagements, isLoading } = useProgrammeEngagements(programmeId);
  const { data: institutions } = useProgrammeInstitutions(programmeId);
  const { profile, user } = useAuth();
  const addEngagement = useAddEngagement();
  const deleteEngagement = useDeleteEngagement();
  const [open, setOpen] = useState(false);
  const [openFollowup, setOpenFollowup] = useState<string | null>(null);
  const [form, setForm] = useState<EngagementForm>(emptyEngagementForm);

  const addedByName = profile?.full_name || user?.email || "Unknown";
  const instName = (id: string | null) => institutions?.find((i) => i.id === id)?.name;

  const submit = () => {
    if (!form.title.trim()) { toast.error("Enter what the engagement was"); return; }
    addEngagement.mutate(
      {
        programme_id: programmeId,
        title: form.title.trim(),
        organisation: form.organisation.trim() || undefined,
        engagement_date: form.engagement_date || null,
        notes: form.notes.trim() || undefined,
        institution_id: form.institution_id,
        added_by_name: addedByName,
      },
      {
        onSuccess: () => { toast.success("Engagement logged"); setOpen(false); setForm(emptyEngagementForm); },
        onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to log engagement"),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">Engagements the team has had during this programme — meetings, workshops, calls.</p>
        {canEdit && (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm(emptyEngagementForm); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Log engagement</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Log engagement</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Engagement *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="mt-1" placeholder="e.g. County kick-off meeting" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Organisation</Label>
                  <Input value={form.organisation} onChange={e => setForm(f => ({ ...f, organisation: e.target.value }))} className="mt-1" placeholder="e.g. Taita Taveta County" />
                </div>
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={form.engagement_date} onChange={e => setForm(f => ({ ...f, engagement_date: e.target.value }))} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Institution</Label>
                <InstitutionCombobox
                  programmeId={programmeId}
                  value={form.institution_id}
                  onChange={(id) => setForm(f => ({ ...f, institution_id: id }))}
                  placeholder="Not tied to an institution"
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="mt-1" rows={3} placeholder="What was discussed / agreed" />
              </div>
              <Button onClick={submit} disabled={!form.title.trim() || addEngagement.isPending} className="w-full">
                {addEngagement.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Log engagement
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : !engagements?.length ? (
        <p className="text-sm text-muted-foreground text-center py-8">No engagements logged yet.</p>
      ) : (
        <div className="space-y-2">
          {engagements.map(e => (
            <div key={e.id} className="bg-card border border-border rounded-lg px-4 py-3 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Handshake className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{e.title}</p>
                      {e.organisation && <Badge variant="secondary" className="text-[10px] font-normal">{e.organisation}</Badge>}
                      {instName(e.institution_id) && (
                        <Badge variant="outline" className="text-[10px] font-normal flex items-center gap-1">
                          <Building2 className="h-3 w-3" />{instName(e.institution_id)}
                        </Badge>
                      )}
                    </div>
                    {e.notes && <p className="text-xs text-muted-foreground mt-0.5">{e.notes}</p>}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground mt-0.5">
                      {e.engagement_date && <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{e.engagement_date}</span>}
                      {e.added_by_name && <span>Logged by {e.added_by_name}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="icon" variant="ghost" title="Add follow-up"
                    onClick={() => setOpenFollowup(openFollowup === e.id ? null : e.id)}
                  >
                    <MessageSquarePlus className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  {canEdit && (
                    <Button size="icon" variant="ghost" title="Remove" onClick={() => deleteEngagement.mutate({ id: e.id, programme_id: programmeId })}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              </div>
              {openFollowup === e.id && (
                <EngagementFollowups engagementId={e.id} canEdit={canEdit} addedByName={addedByName} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Follow-up / discussion thread shown when an engagement's follow-up action is
// toggled. Loads lazily (only the opened engagement is fetched).
function EngagementFollowups({ engagementId, canEdit, addedByName }: { engagementId: string; canEdit: boolean; addedByName: string }) {
  const { data: followups, isLoading } = useEngagementFollowups(engagementId);
  const addFollowup = useAddEngagementFollowup();
  const [note, setNote] = useState("");

  const submit = () => {
    if (!note.trim()) return;
    addFollowup.mutate(
      { engagement_id: engagementId, note: note.trim(), added_by_name: addedByName },
      {
        onSuccess: () => setNote(""),
        onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to add follow-up"),
      },
    );
  };

  return (
    <div className="mt-3 ml-11 border-l border-border pl-4 space-y-2">
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      ) : (
        (followups ?? []).map((f) => (
          <div key={f.id} className="text-xs">
            <p className="flex items-start gap-1.5 text-foreground">
              <CornerDownRight className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />{f.note}
            </p>
            <p className="text-[10px] text-muted-foreground ml-[18px]">
              {f.added_by_name ? `${f.added_by_name} · ` : ""}{f.created_at.slice(0, 10)}
            </p>
          </div>
        ))
      )}
      {canEdit && (
        <div className="flex items-center gap-2 pt-1">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder="Add a follow-up / discussion…"
            className="h-8 text-xs"
          />
          <Button size="sm" className="h-8" onClick={submit} disabled={!note.trim() || addFollowup.isPending}>
            {addFollowup.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
          </Button>
        </div>
      )}
    </div>
  );
}
