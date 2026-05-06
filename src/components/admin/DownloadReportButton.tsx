import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  exportExcel,
  exportPdf,
  type ReportColumn,
  type ReportOptions,
} from "@/lib/reportExport";

type ReportFormat = "excel" | "pdf";

interface DownloadReportButtonProps<T> {
  /** Rows that go into the report. Pass the same array the page renders. */
  rows: T[] | undefined | null;
  /** Column spec — which fields to include and how to label/format them. */
  columns: ReportColumn<T>[];
  /** Report title (e.g. "Risk Register"). Appears at the top of the PDF and in the Excel sheet name. */
  title: string;
  /** Filename WITHOUT extension; date stamp is appended automatically. */
  filename: string;
  /** Optional subtitle (e.g. "Filtered to Nairobi · Open risks only"). */
  subtitle?: string;
  /** Optional override for the button label. Defaults to "Download report". */
  label?: string;
  /** Variant for the button — defaults to "outline". */
  variant?: "default" | "outline" | "ghost" | "secondary";
  /** Size for the button — defaults to "sm". */
  size?: "default" | "sm" | "lg" | "icon";
  /** Disable the button externally. The button is also disabled when there are no rows. */
  disabled?: boolean;
}

/**
 * Drop-in "Download report" button for any admin page.
 *
 * Click → opens a popup asking Excel vs PDF → downloads the file.
 * No data fetching here — the page passes in whatever rows it already has.
 */
export function DownloadReportButton<T>({
  rows,
  columns,
  title,
  filename,
  subtitle,
  label = "Download report",
  variant = "outline",
  size = "sm",
  disabled = false,
}: DownloadReportButtonProps<T>) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ReportFormat>("excel");
  const [busy, setBusy] = useState(false);

  const safeRows = Array.isArray(rows) ? rows : [];
  const noData = safeRows.length === 0;

  const handleDownload = async () => {
    if (noData) {
      toast.error("Nothing to export — there are no records to include in the report.");
      return;
    }
    setBusy(true);
    try {
      const opts: ReportOptions = { title, filename, subtitle };
      // Defer to the next tick so the spinner gets a chance to render before
      // the (sometimes blocking) export work begins.
      await new Promise((r) => setTimeout(r, 30));
      if (format === "excel") {
        exportExcel(safeRows, columns, opts);
      } else {
        exportPdf(safeRows, columns, opts);
      }
      toast.success(`Report downloaded as ${format === "excel" ? "Excel" : "PDF"}`);
      setOpen(false);
    } catch (err) {
      console.error("Report export failed:", err);
      toast.error("Could not generate the report. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        disabled={disabled || noData}
        className="gap-1.5"
        title={noData ? "No data to export yet" : "Download a report of this data"}
      >
        <Download className="h-4 w-4" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Download report</DialogTitle>
            <DialogDescription>
              Choose the format you'd like for the {title.toLowerCase()} report.
              {subtitle ? ` ${subtitle}.` : ""}
            </DialogDescription>
          </DialogHeader>

          <RadioGroup
            value={format}
            onValueChange={(v) => setFormat(v as ReportFormat)}
            className="space-y-2 py-2"
          >
            <label
              htmlFor="report-format-excel"
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                format === "excel" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
              }`}
            >
              <RadioGroupItem id="report-format-excel" value="excel" className="mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
                  <span className="font-medium">Excel spreadsheet (.xlsx)</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Best for analysis, sorting, filtering, and feeding into another tool.
                </p>
              </div>
            </label>

            <label
              htmlFor="report-format-pdf"
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                format === "pdf" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
              }`}
            >
              <RadioGroupItem id="report-format-pdf" value="pdf" className="mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-rose-700" />
                  <span className="font-medium">PDF document (.pdf)</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Best for sharing, printing, or attaching to a stakeholder report.
                </p>
              </div>
            </label>
          </RadioGroup>

          <p className="text-xs text-muted-foreground">
            {safeRows.length} record{safeRows.length === 1 ? "" : "s"} will be included.
          </p>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={handleDownload} disabled={busy} className="gap-1.5">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Helper: a column whose value is the row directly (e.g. arrays of strings get joined).
 * Useful for tag-like columns. Returned as ReportColumn<any> so it composes
 * cleanly inside a heterogeneous column array.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function listColumn(key: string, label: string, sep = ", "): ReportColumn<any> {
  return {
    key,
    label,
    format: (row) => {
      const v = (row as Record<string, unknown>)[key];
      if (Array.isArray(v)) return v.join(sep);
      return v == null ? "" : String(v);
    },
  };
}

/**
 * Helper: a column that formats an ISO date string as YYYY-MM-DD.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dateColumn(key: string, label: string): ReportColumn<any> {
  return {
    key,
    label,
    format: (row) => {
      const v = (row as Record<string, unknown>)[key];
      if (!v) return "";
      const s = String(v);
      // Already a YYYY-MM-DD-style date — keep as-is
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
      const d = new Date(s);
      if (isNaN(d.getTime())) return s;
      return d.toISOString().slice(0, 10);
    },
  };
}
