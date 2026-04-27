import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Truck, MapPin, ShieldCheck, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeliveries } from "@/hooks/useDeliveries";
import {
  DELIVERY_STAGES, deliveryProgress, stageLabel,
  type DeliveryStage, type DeliverySummary,
} from "@/lib/delivery";

const STAGE_COLORS: Record<string, string> = {
  manufacturing: "bg-slate-100 text-slate-700",
  dispatched: "bg-blue-100 text-blue-700",
  in_transit: "bg-blue-100 text-blue-700",
  on_site: "bg-amber-100 text-amber-700",
  installing: "bg-amber-100 text-amber-700",
  commissioned: "bg-emerald-100 text-emerald-700",
  handover: "bg-emerald-100 text-emerald-700",
  acceptance_window: "bg-emerald-100 text-emerald-700",
  monitoring: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function AdminDeliveries() {
  const { data, isLoading, error } = useDeliveries();
  const [stageFilter, setStageFilter] = useState<DeliveryStage | "">("");

  const filtered = useMemo(() => {
    if (!stageFilter) return data ?? [];
    return (data ?? []).filter((d) => d.stage === stageFilter);
  }, [data, stageFilter]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    (data ?? []).forEach((d) => map.set(d.stage, (map.get(d.stage) ?? 0) + 1));
    return map;
  }, [data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Truck className="h-6 w-6 text-primary" /> Deliveries & Installations
        </h1>
        <p className="text-muted-foreground mt-1">
          Track every contracted project from manufacturing through commissioning,
          handover, and the 30-day acceptance window.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load deliveries.
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStageFilter("")}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                stageFilter === ""
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/40"
              }`}
            >
              All ({data?.length ?? 0})
            </button>
            {DELIVERY_STAGES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStageFilter(s)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  stageFilter === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/40"
                }`}
              >
                {stageLabel(s)} ({counts.get(s) ?? 0})
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No deliveries match the current filter.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <DeliveryRow key={d.id} delivery={d} />
          ))}
        </div>
      )}
    </div>
  );
}

function DeliveryRow({ delivery: d }: { delivery: DeliverySummary }) {
  const progress = Math.round(deliveryProgress(d.stage) * 100);
  return (
    <Link to={`/admin/deliveries/${d.id}`}>
      <Card className="hover:shadow-md hover:border-primary/40 transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-base">{d.project_title}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {d.institution_name}{d.institution_county ? ` · ${d.institution_county}` : ""}
                {d.provider_name ? ` · supplied by ${d.provider_name}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <Badge className={STAGE_COLORS[d.stage] ?? ""}>{stageLabel(d.stage)}</Badge>
              {d.signed_off && <Badge variant="secondary" className="gap-1"><ShieldCheck className="h-3 w-3" /> Signed</Badge>}
              {!d.signed_off && d.commissioning_complete && (
                <Badge variant="outline" className="gap-1">
                  <AlertCircle className="h-3 w-3" /> Awaiting signoff
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
            {d.delivery_county && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {d.delivery_county}
              </div>
            )}
            {d.crew_name && <div>Crew: {d.crew_name}</div>}
            {d.total_items != null && d.total_items > 0 && (
              <div>
                Checklist: {d.completed_items} / {d.total_items}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
