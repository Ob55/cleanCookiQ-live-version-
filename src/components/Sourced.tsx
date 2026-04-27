import { Info, ExternalLink } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { type DataPoint } from "@/lib/dataPoints";
import { cn } from "@/lib/utils";

interface SourcedProps {
  /** The rendered value (already formatted) */
  children: React.ReactNode;
  /** The underlying data point providing the citation */
  point: DataPoint | null | undefined;
  /** Optional fallback caption shown when no point is available */
  fallbackLabel?: string;
  className?: string;
}

const CONFIDENCE_STYLES: Record<string, string> = {
  high: "text-emerald-700 bg-emerald-50",
  medium: "text-sky-700 bg-sky-50",
  modeled: "text-amber-700 bg-amber-50",
  preliminary: "text-orange-700 bg-orange-50",
};

const CONFIDENCE_LABEL: Record<string, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  modeled: "Modeled",
  preliminary: "Preliminary",
};

/**
 * Renders a value with an info chip linking to its underlying citation.
 * If `point` is null, falls back to plain text + a "no source" indicator
 * so the gap is visible rather than silent.
 */
export function Sourced({ children, point, fallbackLabel, className }: SourcedProps) {
  return (
    <span className={cn("inline-flex items-baseline gap-1", className)}>
      <span>{children}</span>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={point ? "View source citation" : "Source pending"}
            className={cn(
              "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] transition-colors hover:opacity-80",
              point
                ? CONFIDENCE_STYLES[point.source_confidence] ?? "text-muted-foreground bg-muted"
                : "text-muted-foreground bg-muted/40 ring-1 ring-dashed ring-muted-foreground/30",
            )}
          >
            <Info className="h-2.5 w-2.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 text-sm">
          {point ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                    CONFIDENCE_STYLES[point.source_confidence] ?? "text-muted-foreground bg-muted",
                  )}
                >
                  {CONFIDENCE_LABEL[point.source_confidence] ?? point.source_confidence}
                </span>
                <span className="text-xs text-muted-foreground">
                  As of {point.valid_from}
                </span>
              </div>
              <p className="font-medium leading-tight">{point.source_title}</p>
              {point.source_publisher && (
                <p className="text-xs text-muted-foreground">{point.source_publisher}</p>
              )}
              {point.notes && (
                <p className="text-xs text-muted-foreground italic">{point.notes}</p>
              )}
              {point.source_url && (
                <a
                  href={point.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Open source <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {fallbackLabel ?? "No verified source on file yet for this value."}
            </p>
          )}
        </PopoverContent>
      </Popover>
    </span>
  );
}
