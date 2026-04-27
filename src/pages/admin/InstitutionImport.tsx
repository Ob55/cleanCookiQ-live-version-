import { useMemo, useRef, useState } from "react";
import { read, utils, writeFile } from "xlsx";
import { Upload, Loader2, AlertCircle, CheckCircle2, FileSpreadsheet, Info, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { parseInstitutionSheet, exampleTemplateRows, type ImportResult } from "@/lib/excelImport";

const CHUNK = 50;

type Phase = "idle" | "parsing" | "ready" | "uploading" | "done";

export default function InstitutionImport() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [filename, setFilename] = useState<string | null>(null);
  const [parseErr, setParseErr] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [commitErr, setCommitErr] = useState<string | null>(null);
  const [commitStats, setCommitStats] = useState<{ inserted: number } | null>(null);

  const stats = useMemo(() => {
    if (!result) return null;
    const types: Record<string, number> = {};
    const fuels: Record<string, number> = {};
    for (const r of result.rows) {
      const t = r.institution.institution_type ?? "(unset)";
      types[t] = (types[t] ?? 0) + 1;
      const f = r.institution.current_fuel ?? "(unset)";
      fuels[f] = (fuels[f] ?? 0) + 1;
    }
    const warnings = result.rows.flatMap((r, i) =>
      r.warnings.map((w) => ({ idx: i, msg: w })),
    );
    return { types, fuels, warnings };
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
      const parsed = parseInstitutionSheet(aoa);
      setResult(parsed);
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
    setProgress({ done: 0, total: result.rows.length });
    try {
      let inserted = 0;
      for (let i = 0; i < result.rows.length; i += CHUNK) {
        const batch = result.rows.slice(i, i + CHUNK).map((r) => r.institution);
        const { error, count } = await supabase
          .from("institutions")
          .insert(batch, { count: "exact" });
        if (error) throw error;
        inserted += count ?? batch.length;
        setProgress((p) => ({ ...p, done: p.done + batch.length }));
      }
      setCommitStats({ inserted });
      setPhase("done");
      toast.success(`Imported ${inserted} institutions`);
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

  function downloadTemplate() {
    const aoa = exampleTemplateRows();
    const wb = utils.book_new();
    const ws = utils.aoa_to_sheet(aoa);
    utils.book_append_sheet(wb, ws, "institutions");
    writeFile(wb, "cleancookiq-institutions-template.xlsx");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Import Institutions</h1>
        <p className="text-sm text-muted-foreground">
          Upload an Excel (.xlsx / .xls) sheet of institutions. Columns are auto-mapped
          by name (case- and punctuation-insensitive). Required: <code>name</code>.
          Recognised: county, institution_type, current_fuel, meals_per_day,
          number_of_students, number_of_staff, contact_person, contact_phone,
          contact_email, latitude, longitude, sub_county, notes.
        </p>
        <Button variant="outline" size="sm" className="mt-3" onClick={downloadTemplate}>
          <Download className="h-4 w-4 mr-1" /> Download example template
        </Button>
      </div>

      {phase === "idle" && (
        <div className="bg-card border-2 border-dashed border-border rounded-xl p-10 text-center">
          <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="font-medium mb-1">Select an Excel file</p>
          <p className="text-xs text-muted-foreground mb-6">
            Parsing happens in your browser — nothing uploads until you click Commit.
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
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h2 className="font-display font-bold mb-4">
              {filename} — {result.rows.length} rows ready, {result.skipped.length} skipped
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div>
                <p className="font-semibold mb-1">Institution type</p>
                {Object.entries(stats.types).map(([k, v]) => (
                  <p key={k} className="text-muted-foreground text-xs">
                    {String(v).padStart(3)} × {k}
                  </p>
                ))}
              </div>
              <div>
                <p className="font-semibold mb-1">Current fuel</p>
                {Object.entries(stats.fuels).map(([k, v]) => (
                  <p key={k} className="text-muted-foreground text-xs">
                    {String(v).padStart(3)} × {k}
                  </p>
                ))}
              </div>
              <div>
                <p className="font-semibold mb-1">Mapping</p>
                <p className="text-muted-foreground text-xs">{stats.warnings.length} warnings</p>
                <p className="text-muted-foreground text-xs">{result.unmappedHeaders.length} columns ignored</p>
              </div>
            </div>
          </div>

          {result.unmappedHeaders.length > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>{result.unmappedHeaders.length} column(s) ignored</AlertTitle>
              <AlertDescription className="text-xs">
                {result.unmappedHeaders.join(", ")}
              </AlertDescription>
            </Alert>
          )}

          {result.skipped.length > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>{result.skipped.length} rows skipped</AlertTitle>
              <AlertDescription>
                <ul className="text-xs mt-1 space-y-0.5">
                  {result.skipped.slice(0, 10).map((s, i) => (
                    <li key={i}>row {s.rowIndex}: {s.reason}</li>
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
                {stats.warnings.length > 50 && <li>… and {stats.warnings.length - 50} more</li>}
              </ul>
            </details>
          )}

          {/* Preview */}
          <PreviewTable rows={result.rows.slice(0, 20)} />

          {commitErr && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Import failed</AlertTitle>
              <AlertDescription>{commitErr}</AlertDescription>
            </Alert>
          )}

          {phase === "uploading" && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-3 text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Uploading {progress.done} / {progress.total}
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: progress.total ? `${(progress.done / progress.total) * 100}%` : "0%" }}
                />
              </div>
            </div>
          )}

          {phase === "done" && commitStats && (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertTitle>Import complete</AlertTitle>
              <AlertDescription>
                Inserted {commitStats.inserted} institutions.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            {phase === "ready" && (
              <Button onClick={commit}>
                <Upload className="h-4 w-4 mr-2" /> Commit {result.rows.length} rows
              </Button>
            )}
            <Button variant="outline" onClick={reset}>Reset</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewTable({ rows }: { rows: ImportResult["rows"] }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-2 border-b text-xs font-medium text-muted-foreground">
        Preview — first {rows.length} rows
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">#</th>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">County</th>
              <th className="text-left px-3 py-2">Type</th>
              <th className="text-left px-3 py-2">Fuel</th>
              <th className="text-right px-3 py-2">Students</th>
              <th className="text-right px-3 py-2">Meals/day</th>
              <th className="text-left px-3 py-2">Contact</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.rowIndex} className="border-b last:border-0">
                <td className="px-3 py-2 text-muted-foreground">{r.rowIndex}</td>
                <td className="px-3 py-2 font-medium">{r.institution.name}</td>
                <td className="px-3 py-2">{r.institution.county ?? "—"}</td>
                <td className="px-3 py-2 capitalize">{r.institution.institution_type ?? "—"}</td>
                <td className="px-3 py-2 capitalize">{r.institution.current_fuel ?? "—"}</td>
                <td className="px-3 py-2 text-right">{r.institution.number_of_students ?? "—"}</td>
                <td className="px-3 py-2 text-right">{r.institution.meals_per_day ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.institution.contact_person ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
