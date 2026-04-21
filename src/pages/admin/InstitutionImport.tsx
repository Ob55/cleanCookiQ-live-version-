import { useMemo, useRef, useState } from "react";
import { read, utils } from "xlsx";
import { Upload, Loader2, AlertCircle, CheckCircle2, FileSpreadsheet, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { mapKoboRows, type MappedRow, type MapResult } from "@/lib/koboImport";
import { toast } from "sonner";

const CHUNK = 50;

type Phase = "idle" | "parsing" | "ready" | "uploading" | "done";

export default function InstitutionImport() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [filename, setFilename] = useState<string | null>(null);
  const [parseErr, setParseErr] = useState<string | null>(null);
  const [result, setResult] = useState<MapResult | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [commitErr, setCommitErr] = useState<string | null>(null);
  const [commitStats, setCommitStats] = useState<{
    inserted: number;
    rawInserted: number;
  } | null>(null);

  const stats = useMemo(() => {
    if (!result) return null;
    const types: Record<string, number> = {};
    const fuels: Record<string, number> = {};
    let spendCount = 0;
    for (const r of result.rows) {
      const t = r.institution.institution_type ?? "unknown";
      types[t] = (types[t] ?? 0) + 1;
      const f = r.institution.current_fuel ?? "(none)";
      fuels[f] = (fuels[f] ?? 0) + 1;
      if (r.institution.monthly_fuel_spend != null) spendCount += 1;
    }
    const warnings = result.rows.flatMap((r, i) =>
      r.warnings.map((w) => ({ idx: i, msg: w })),
    );
    return { types, fuels, spendCount, warnings };
  }, [result]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFilename(f.name);
    setParseErr(null);
    setResult(null);
    setCommitErr(null);
    setCommitStats(null);
    setPhase("parsing");
    try {
      const buf = await f.arrayBuffer();
      const wb = read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const aoa = utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });
      const mapped = mapKoboRows(aoa);
      setResult(mapped);
      setPhase("ready");
    } catch (err) {
      setParseErr(err instanceof Error ? err.message : String(err));
      setPhase("idle");
    }
  }

  async function commit() {
    if (!result || !result.rows.length) return;
    setPhase("uploading");
    setCommitErr(null);
    setProgress({ done: 0, total: result.rows.length * 2 }); // inst + raw

    try {
      // 1. Upsert institutions
      let insertedInst = 0;
      for (let i = 0; i < result.rows.length; i += CHUNK) {
        const batch = result.rows.slice(i, i + CHUNK).map((r) => r.institution);
        const { error, count } = await supabase
          .from("institutions")
          .upsert(batch, {
            onConflict: "kobo_submission_uuid",
            ignoreDuplicates: false,
            count: "exact",
          });
        if (error) throw error;
        insertedInst += count ?? batch.length;
        setProgress((p) => ({ ...p, done: p.done + batch.length }));
      }

      // 2. Upsert raw payloads
      let insertedRaw = 0;
      for (let i = 0; i < result.rows.length; i += CHUNK) {
        const batch = result.rows.slice(i, i + CHUNK).map((r) => ({
          kobo_submission_id: r.institution.kobo_submission_id ?? null,
          kobo_uuid: r.institution.kobo_submission_uuid ?? null,
          payload: r.raw,
        }));
        const { error, count } = await supabase
          .from("kobo_submissions_raw")
          .upsert(batch, {
            onConflict: "kobo_uuid",
            ignoreDuplicates: false,
            count: "exact",
          });
        if (error) throw error;
        insertedRaw += count ?? batch.length;
        setProgress((p) => ({ ...p, done: p.done + batch.length }));
      }

      setCommitStats({ inserted: insertedInst, rawInserted: insertedRaw });
      setPhase("done");
      toast.success(`Imported ${insertedInst} institutions`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setCommitErr(msg);
      setPhase("ready");
      toast.error("Import failed");
    }
  }

  function reset() {
    setPhase("idle");
    setFilename(null);
    setParseErr(null);
    setResult(null);
    setCommitErr(null);
    setCommitStats(null);
    setProgress({ done: 0, total: 0 });
    if (fileInput.current) fileInput.current.value = "";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Import Institutions</h1>
        <p className="text-sm text-muted-foreground">
          Upload a KoBo / ODK survey export (.xlsx) to populate the institutions pipeline.
          Rows are deduplicated on their KoBo submission UUID — re-uploading the same file
          updates existing records instead of creating duplicates.
        </p>
      </div>

      {phase === "idle" && (
        <div className="bg-card border-2 border-dashed border-border rounded-xl p-10 text-center">
          <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="font-medium mb-1">Select a KoBo .xlsx export</p>
          <p className="text-xs text-muted-foreground mb-6">
            Expected structure: 174-column KoBo survey. Parsing happens in your browser — no
            upload occurs until you click Commit.
          </p>
          <input
            ref={fileInput}
            type="file"
            accept=".xlsx,.xls"
            onChange={onFile}
            className="hidden"
          />
          <Button onClick={() => fileInput.current?.click()}>
            <Upload className="h-4 w-4 mr-2" /> Choose file
          </Button>
        </div>
      )}

      {phase === "parsing" && (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <Loader2 className="h-6 w-6 mx-auto text-primary animate-spin mb-3" />
          <p className="text-sm text-muted-foreground">Parsing {filename}…</p>
        </div>
      )}

      {parseErr && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Could not parse file</AlertTitle>
          <AlertDescription>{parseErr}</AlertDescription>
        </Alert>
      )}

      {result && stats && (phase === "ready" || phase === "uploading" || phase === "done") && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-card">
            <h2 className="font-display font-bold mb-4">
              {filename} — {result.rows.length} rows ready, {result.skipped.length} skipped
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div>
                <p className="font-semibold mb-1">Institution type</p>
                {Object.entries(stats.types).map(([k, v]) => (
                  <p key={k} className="text-muted-foreground text-xs">
                    {v.toString().padStart(3)} × {k}
                  </p>
                ))}
              </div>
              <div>
                <p className="font-semibold mb-1">Current fuel</p>
                {Object.entries(stats.fuels).map(([k, v]) => (
                  <p key={k} className="text-muted-foreground text-xs">
                    {v.toString().padStart(3)} × {k}
                  </p>
                ))}
              </div>
              <div>
                <p className="font-semibold mb-1">Derived fields</p>
                <p className="text-muted-foreground text-xs">
                  {stats.spendCount}/{result.rows.length} rows got a computed{" "}
                  <code>monthly_fuel_spend</code>
                </p>
                <p className="text-muted-foreground text-xs">
                  {stats.warnings.length} mapping warnings
                </p>
              </div>
            </div>
          </div>

          {result.skipped.length > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>{result.skipped.length} rows skipped</AlertTitle>
              <AlertDescription>
                <ul className="text-xs mt-1 space-y-0.5">
                  {result.skipped.slice(0, 10).map((s, i) => (
                    <li key={i}>
                      row {s.rowIndex}: {s.reason}
                    </li>
                  ))}
                  {result.skipped.length > 10 && (
                    <li>… and {result.skipped.length - 10} more</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {stats.warnings.length > 0 && (
            <details className="bg-card border border-border rounded-xl p-4 text-sm">
              <summary className="cursor-pointer font-medium">
                {stats.warnings.length} mapping warnings (click to expand)
              </summary>
              <ul className="mt-3 space-y-0.5 text-xs max-h-40 overflow-auto">
                {stats.warnings.slice(0, 50).map((w, i) => (
                  <li key={i} className="text-muted-foreground">
                    row {w.idx + 2}: {w.msg}
                  </li>
                ))}
                {stats.warnings.length > 50 && (
                  <li>… and {stats.warnings.length - 50} more</li>
                )}
              </ul>
            </details>
          )}

          {/* Preview table */}
          <PreviewTable rows={result.rows.slice(0, 20)} />

          {commitErr && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Upload failed</AlertTitle>
              <AlertDescription className="break-all">{commitErr}</AlertDescription>
            </Alert>
          )}

          {phase === "done" && commitStats && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Import complete</AlertTitle>
              <AlertDescription>
                {commitStats.inserted} institutions upserted, {commitStats.rawInserted} raw
                payloads archived. The Map page will reflect the new rows after a refresh.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-3">
            {phase === "ready" && (
              <>
                <Button onClick={commit} disabled={result.rows.length === 0}>
                  Commit {result.rows.length} rows
                </Button>
                <Button variant="outline" onClick={reset}>
                  Choose a different file
                </Button>
              </>
            )}
            {phase === "uploading" && (
              <div className="flex items-center gap-3 text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Uploading… {progress.done} / {progress.total}
              </div>
            )}
            {phase === "done" && (
              <Button variant="outline" onClick={reset}>
                Import another file
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewTable({ rows }: { rows: MappedRow[] }) {
  return (
    <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <h3 className="font-display font-semibold text-sm">Preview (first 20 rows)</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Name</th>
              <th className="text-left px-3 py-2 font-medium">Type</th>
              <th className="text-left px-3 py-2 font-medium">County</th>
              <th className="text-left px-3 py-2 font-medium">Sub-county</th>
              <th className="text-right px-3 py-2 font-medium">Lat</th>
              <th className="text-right px-3 py-2 font-medium">Lon</th>
              <th className="text-left px-3 py-2 font-medium">Fuel</th>
              <th className="text-right px-3 py-2 font-medium">Meals/day</th>
              <th className="text-right px-3 py-2 font-medium">Fuel spend KES/mo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-border/50">
                <td className="px-3 py-1.5">{r.institution.name}</td>
                <td className="px-3 py-1.5">{r.institution.institution_type}</td>
                <td className="px-3 py-1.5">{r.institution.county}</td>
                <td className="px-3 py-1.5 text-muted-foreground">
                  {r.institution.sub_county ?? "—"}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">
                  {r.institution.latitude?.toFixed(4)}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">
                  {r.institution.longitude?.toFixed(4)}
                </td>
                <td className="px-3 py-1.5">{r.institution.current_fuel ?? "—"}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">
                  {r.institution.meals_per_day ?? "—"}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">
                  {r.institution.monthly_fuel_spend != null
                    ? r.institution.monthly_fuel_spend.toLocaleString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
