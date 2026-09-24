import { Building2, MapPin, Flame, Utensils, AlertTriangle, CheckCircle2, Lightbulb, HandCoins } from "lucide-react";
import { cn } from "@/lib/utils";
import { METHOD_LABELS } from "@/lib/institutionDerived";

export interface InstitutionCardData {
  id: string;
  name: string;
  institution_code?: string | null;
  institution_type?: string | null;
  county?: string | null;
  current_fuel?: string | null;
  meals_per_day?: number | null;
  verification_status?: string | null;
  validation_issues?: { message: string }[] | null;
  recommended_solution?: string | null;
}

/** Small clickable institution "profile" card with status chips top-right. */
export function InstitutionCard({ inst, funderName, onClick }: {
  inst: InstitutionCardData;
  funderName?: string | null;
  onClick: () => void;
}) {
  const flagged = inst.verification_status === "flagged";
  const passed = inst.verification_status === "verified";
  const pending = !flagged && !passed;
  const method = inst.recommended_solution;
  const ready = passed && !!method && !!funderName;
  const issues = inst.validation_issues ?? [];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative w-full text-left bg-card border rounded-lg p-3 shadow-sm transition",
        "hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        flagged ? "border-destructive/40" : "border-border",
        ready && "ring-2 ring-primary/60",
      )}
    >
      <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
        {flagged && (
          <span className="inline-flex items-center gap-1 rounded-full bg-destructive text-destructive-foreground px-2 py-0.5 text-[10px] font-semibold">
            <AlertTriangle className="h-3 w-3" /> Flagged
          </span>
        )}
        {pending && (
          <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground border px-2 py-0.5 text-[10px] font-semibold">
            Not validated
          </span>
        )}
        {passed && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 text-white px-2 py-0.5 text-[10px] font-semibold">
            <CheckCircle2 className="h-3 w-3" /> Passed V
          </span>
        )}
        {passed && method && (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-600 text-white px-2 py-0.5 text-[10px] font-semibold">
            <Lightbulb className="h-3 w-3" /> {(METHOD_LABELS[method] ?? method).split(" ")[0]}
          </span>
        )}
        {passed && funderName && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 text-white px-2 py-0.5 text-[10px] font-semibold max-w-[9rem] truncate">
            <HandCoins className="h-3 w-3 shrink-0" /> <span className="truncate">{funderName}</span>
          </span>
        )}
      </div>

      <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center mb-2">
        <Building2 className="h-3.5 w-3.5 text-primary" />
      </div>
      <p className="font-semibold text-[13px] leading-snug line-clamp-2 pr-20">{inst.name}</p>
      <p className="font-mono text-[11px] text-muted-foreground mt-0.5">{inst.institution_code ?? "—"}</p>

      <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
        <p className="flex items-center gap-1.5 capitalize"><MapPin className="h-3 w-3" />{inst.county || "No county"} · {inst.institution_type || "—"}</p>
        <p className="flex items-center gap-1.5 capitalize"><Flame className="h-3 w-3" />{inst.current_fuel || "—"}
          <span className="mx-1">·</span><Utensils className="h-3 w-3" />{inst.meals_per_day ?? 0} meals/day</p>
      </div>

      {flagged && issues.length > 0 && (
        <p className="mt-2 text-[11px] text-destructive line-clamp-2">
          {issues[0].message}{issues.length > 1 ? ` (+${issues.length - 1} more)` : ""}
        </p>
      )}
      {ready && <p className="mt-2 text-[11px] font-semibold text-primary">Ready for transition</p>}
    </button>
  );
}
