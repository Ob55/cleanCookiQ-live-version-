import { useMemo, useRef, useState } from "react";
import { read, utils, writeFile } from "xlsx";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Upload, Loader2, AlertCircle, CheckCircle2, FileSpreadsheet, Info, Download,
  ShieldCheck, RefreshCw, Search, Trash2, Pencil, BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { sbAny } from "@/lib/sbAny";
import { fetchAllRows, countRows } from "@/lib/fetchAllRows";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { parseInstitutionSheet, exampleTemplateRows, type ImportResult } from "@/lib/excelImport";
import { missingFields, normaliseName, canonicalCounty } from "@/lib/institutionValidation";
import { runInstitutionValidation } from "@/lib/runInstitutionValidation";
import { proposeForInstitutions } from "@/lib/runRecommendation";
import { InstitutionCard, type InstitutionCardData } from "@/components/admin/InstitutionCard";
import { InstitutionForm } from "@/pages/admin/InstitutionManagement";

const CHUNK = 500;
const PAGE = 60;
const CARD_COLS =
  "id, name, institution_code, institution_type, county, current_fuel, meals_per_day, verification_status, validation_issues";

type Phase = "idle" | "parsing" | "ready" | "uploading" | "validating" | "done";
type Summary = { inserted: number; checked: number; passed: number; flagged: number };

async function readSheet(f: File) {
  const wb = read(await f.arrayBuffer(), { type: "array" }); // xlsx parses .csv too
  return utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: null });
}

/** Validate, then propose methods/providers for everything that passed. */
async function validateAndPropose(onlyIds?: string[]) {
  const res = await runInstitutionValidation(onlyIds);
  if (res.passedIds.length) await proposeForInstitutions(res.passedIds);
  return res;
}

export default function InstitutionValidation() {
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [revalidating, setRevalidating] = useState(false);

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["validation-pending-count"],
    queryFn: () => countRows(() =>
      sbAny.from("institutions").select("id", { count: "exact", head: true }).eq("verification_status", "unverified")),
  });

  const { data: flagged = [], isLoading } = useQuery({
    queryKey: ["validation-flagged"],
    queryFn: () => fetchAllRows<InstitutionCardData>((from, to) =>
      sbAny.from("institutions").select(CARD_COLS).eq("verification_status", "flagged")
        .order("validation_checked_at", { ascending: false }).range(from, to)),
  });

  const refresh = () => {
    for (const k of ["validation-flagged", "validation-pending-count", "institutions", "institution"]) {
      qc.invalidateQueries({ queryKey: [k] });
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? flagged.filter((i) =>
      [i.name, i.institution_code, i.county].some((v) => v?.toLowerCase().includes(q))) : flagged;
  }, [flagged, search]);

  async function revalidateAll() {
    setRevalidating(true);
    try {
      const r = await validateAndPropose();
      toast.success(`Checked ${r.checked}: ${r.passed} passed, ${r.flagged} flagged`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Validation failed");
    } finally {
      setRevalidating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold">Validation</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Upload the institutions exported from Kobo. Each one is checked automatically and labelled in
            <b>Institutions</b>. Only Passed ones count on dashboards. Flagged ones are listed here until fixed or passed by an admin.
          </p>
        </div>
        <Button variant="outline" onClick={revalidateAll} disabled={revalidating}>
          {revalidating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Validate pending{pendingCount ? ` (${pendingCount.toLocaleString()})` : ""}
        </Button>
      </div>

      <Tabs defaultValue="upload">
        <TabsList>
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="flagged">Flagged ({flagged.length.toLocaleString()})</TabsTrigger>
          <TabsTrigger value="registry">Official registry</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-4">
          <UploadPanel onDone={refresh} />
        </TabsContent>

        <TabsContent value="flagged" className="mt-4 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search flagged institutions..." value={search}
              onChange={(e) => { setSearch(e.target.value); setShown(PAGE); }} className="pl-10" />
          </div>
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ShieldCheck className="h-12 w-12 mx-auto mb-3 text-emerald-600" />
              No flagged institutions.
            </div>
          ) : (
            <>
              <div className="grid gap-2.5 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
                {filtered.slice(0, shown).map((i) => (
                  <InstitutionCard key={i.id} inst={i} onClick={() => setOpenId(i.id)} />
                ))}
              </div>
              {shown < filtered.length && (
                <div className="text-center">
                  <Button variant="outline" onClick={() => setShown((s) => s + PAGE)}>
                    Show more ({(filtered.length - shown).toLocaleString()} left)
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="registry" className="mt-4">
          <RegistryPanel />
        </TabsContent>
      </Tabs>

      <FlaggedSheet id={openId} onClose={() => setOpenId(null)} onChanged={refresh} />
    </div>
  );
}

function UploadPanel({ onDone }: { onDone: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [filename, setFilename] = useState<string | null>(null);
  const [parseErr, setParseErr] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [commitErr, setCommitErr] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFilename(f.name); setParseErr(null); setResult(null); setCommitErr(null); setSummary(null);
    setPhase("parsing");
    try {
      setResult(parseInstitutionSheet(await readSheet(f)));
      setPhase("ready");
    } catch (err) {
      setParseErr(err instanceof Error ? err.message : String(err));
      setPhase("idle");
    }
  }

  async function commit() {
    if (!result?.rows.length) return;
    setPhase("uploading"); setCommitErr(null);
    setProgress({ done: 0, total: result.rows.length });
    try {
      const ids: string[] = [];
      for (let i = 0; i < result.rows.length; i += CHUNK) {
        const batch = result.rows.slice(i, i + CHUNK).map((r) => r.institution);
        const { data, error } = await supabase.from("institutions").insert(batch as never).select("id");
        if (error) throw error;
        ids.push(...(data ?? []).map((d) => d.id));
        setProgress((p) => ({ ...p, done: p.done + batch.length }));
      }
      setPhase("validating");
      const v = await validateAndPropose();
      setSummary({ inserted: ids.length, checked: v.checked, passed: v.passed, flagged: v.flagged });
      setPhase("done");
      toast.success(`Uploaded ${ids.length}: ${v.passed} passed, ${v.flagged} flagged`);
      onDone();
    } catch (err) {
      setCommitErr(err instanceof Error ? err.message : String(err));
      setPhase("ready");
      toast.error("Upload failed");
    }
  }

  function reset() {
    setPhase("idle"); setFilename(null); setParseErr(null); setResult(null);
    setCommitErr(null); setSummary(null); setProgress({ done: 0, total: 0 });
    if (fileInput.current) fileInput.current.value = "";
  }

  function downloadTemplate() {
    const wb = utils.book_new();
    utils.book_append_sheet(wb, utils.aoa_to_sheet(exampleTemplateRows()), "institutions");
    writeFile(wb, "cleancookiq-institutions-template.xlsx");
  }

  const warnings = result?.rows.flatMap((r) => r.warnings.map((w) => `row ${r.rowIndex}: ${w}`)) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
        <span>CSV or Excel. Required column: <code>name</code>. For location checks include <code>county</code>, <code>latitude</code>, <code>longitude</code>.</span>
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="h-4 w-4 mr-1" /> Template
        </Button>
      </div>

      <input ref={fileInput} type="file" accept=".csv,.xlsx,.xls" onChange={onFile} className="hidden" />
      {phase === "idle" && (
        <div className="bg-card border-2 border-dashed border-border rounded-xl p-10 text-center">
          <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="font-medium mb-1">Select a CSV or Excel file</p>
          <p className="text-xs text-muted-foreground mb-6">Nothing is saved until you click Upload &amp; validate.</p>
          <Button onClick={() => fileInput.current?.click()}><Upload className="h-4 w-4 mr-2" /> Choose file</Button>
        </div>
      )}

      {phase === "parsing" && (
        <div className="bg-card border rounded-xl p-10 text-center">
          <Loader2 className="h-6 w-6 mx-auto text-primary animate-spin mb-3" />
          <p className="text-sm text-muted-foreground">Reading {filename}…</p>
        </div>
      )}

      {parseErr && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" /><AlertTitle>Could not read file</AlertTitle>
          <AlertDescription>{parseErr}</AlertDescription>
        </Alert>
      )}

      {result && phase !== "idle" && phase !== "parsing" && (
        <div className="space-y-4">
          <div className="bg-card border rounded-xl p-4 text-sm">
            <p className="font-semibold">{filename}: {result.rows.length} rows ready, {result.skipped.length} skipped</p>
            {result.unmappedHeaders.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">Ignored columns: {result.unmappedHeaders.join(", ")}</p>
            )}
            {result.skipped.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Skipped: {result.skipped.slice(0, 5).map((s) => `row ${s.rowIndex} (${s.reason})`).join("; ")}
                {result.skipped.length > 5 ? "…" : ""}
              </p>
            )}
            {warnings.length > 0 && (
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer">{warnings.length} mapping warnings</summary>
                <ul className="mt-2 max-h-40 overflow-auto text-muted-foreground">
                  {warnings.slice(0, 50).map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </details>
            )}
          </div>

          {commitErr && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" /><AlertTitle>Upload failed</AlertTitle>
              <AlertDescription>{commitErr}</AlertDescription>
            </Alert>
          )}

          {(phase === "uploading" || phase === "validating") && (
            <div className="bg-card border rounded-xl p-4 text-sm">
              <div className="flex items-center gap-3">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                {phase === "uploading" ? `Uploading ${progress.done} / ${progress.total}` : "Checking every institution…"}
              </div>
              {phase === "uploading" && (
                <div className="h-1.5 w-full bg-muted rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-primary transition-all"
                    style={{ width: progress.total ? `${(progress.done / progress.total) * 100}%` : "0%" }} />
                </div>
              )}
            </div>
          )}

          {phase === "done" && summary && (
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Uploaded" value={summary.inserted} />
              <Stat label="Passed" value={summary.passed} tone="text-emerald-600" />
              <Stat label="Flagged" value={summary.flagged} tone="text-destructive" />
            </div>
          )}

          <div className="flex gap-2">
            {phase === "ready" && (
              <Button onClick={commit}><Upload className="h-4 w-4 mr-2" /> Upload &amp; validate {result.rows.length} rows</Button>
            )}
            <Button variant="outline" onClick={reset}>{phase === "done" ? "Upload another file" : "Reset"}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="bg-card border rounded-xl p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${tone ?? ""}`}>{value.toLocaleString()}</p>
    </div>
  );
}

function FlaggedSheet({ id, onClose, onChanged }: { id: string | null; onClose: () => void; onChanged: () => void }) {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  const { data: inst, refetch } = useQuery({
    queryKey: ["institution", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await sbAny.from("institutions").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Record<string, any>;
    },
  });

  const close = () => { setReason(""); setEditing(false); onClose(); };

  async function markPassed() {
    if (!id || !reason.trim()) return;
    setBusy(true);
    const { error } = await sbAny.from("institutions").update({
      verification_status: "verified",
      verification_note: `Passed by admin: ${reason.trim()}`,
      verified_by: user?.id ?? null,
      verified_at: new Date().toISOString(),
    }).eq("id", id);
    if (!error) await proposeForInstitutions([id]).catch(() => undefined);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Marked as passed — moved to Institutions");
    onChanged(); close();
  }

  async function revalidate() {
    if (!id) return;
    setBusy(true);
    try {
      const r = await validateAndPropose([id]);
      toast[r.passed ? "success" : "warning"](r.passed ? "Passed validation" : "Still flagged");
      onChanged(); await refetch();
      if (r.passed) close();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Validation failed");
    } finally { setBusy(false); }
  }

  async function remove() {
    if (!id || !confirm("Delete this institution permanently?")) return;
    setBusy(true);
    const { error } = await supabase.from("institutions").delete().eq("id", id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    onChanged(); close();
  }

  const issues: { message: string }[] = inst?.validation_issues ?? [];
  const missing = inst ? missingFields(inst) : [];
  const details: [string, unknown][] = inst ? [
    ["Code", inst.institution_code], ["Type", inst.institution_type], ["County", inst.county],
    ["Sub-county", inst.sub_county], ["GPS", inst.latitude != null ? `${inst.latitude}, ${inst.longitude}` : null],
    ["Current fuel", inst.current_fuel], ["Students", inst.number_of_students], ["Staff", inst.number_of_staff],
    ["Meals/day", inst.meals_per_day], ["Contact", inst.contact_person], ["Phone", inst.contact_phone],
    ["Email", inst.contact_email], ["Notes", inst.notes],
  ] : [];

  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && close()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {!inst ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : editing ? (
          <>
            <SheetHeader><SheetTitle>Edit {inst.name}</SheetTitle></SheetHeader>
            <div className="mt-4">
              <InstitutionForm initial={inst} onSuccess={async () => { setEditing(false); await revalidate(); }} />
            </div>
          </>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle className="pr-6">{inst.name}</SheetTitle>
              <SheetDescription>
                <span className="inline-flex items-center gap-1 rounded-full bg-destructive text-destructive-foreground px-2 py-0.5 text-[10px] font-semibold">Flagged</span>
              </SheetDescription>
            </SheetHeader>

            <div className="mt-5 space-y-5 text-sm">
              <section>
                <h3 className="font-semibold mb-2 flex items-center gap-2"><AlertCircle className="h-4 w-4 text-destructive" /> Why it was flagged</h3>
                <ul className="space-y-1.5">
                  {issues.length ? issues.map((x, k) => (
                    <li key={k} className="rounded-md bg-destructive/10 text-destructive px-3 py-2 text-xs">{x.message}</li>
                  )) : <li className="text-muted-foreground text-xs">Not checked yet.</li>}
                </ul>
              </section>

              {missing.length > 0 && (
                <section>
                  <h3 className="font-semibold mb-2 flex items-center gap-2"><Info className="h-4 w-4" /> Missing information</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {missing.map((m) => <span key={m} className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">{m}</span>)}
                  </div>
                </section>
              )}

              <section>
                <h3 className="font-semibold mb-2">Details</h3>
                <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1.5 text-xs">
                  {details.map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="capitalize-first break-words">{v == null || v === "" ? "—" : String(v)}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section className="border-t pt-4 space-y-2">
                <Label htmlFor="pass-reason">Pass anyway — reason (required)</Label>
                <Textarea id="pass-reason" value={reason} onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Confirmed by phone with the head teacher; GPS taken at the gate" rows={3} />
                <Button className="w-full" onClick={markPassed} disabled={busy || !reason.trim()}>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Mark as passed
                </Button>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)} disabled={busy}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
                  <Button variant="outline" size="sm" onClick={revalidate} disabled={busy}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Re-check</Button>
                  <Button variant="outline" size="sm" onClick={remove} disabled={busy} className="text-destructive"><Trash2 className="h-3.5 w-3.5 mr-1" /> Delete</Button>
                </div>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function RegistryPanel() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const { data: counts = [] } = useQuery({
    queryKey: ["registry-counts"],
    queryFn: async () => {
      const rows = await fetchAllRows<{ county: string | null }>((f, t) =>
        sbAny.from("institution_registry").select("county").range(f, t));
      const m = new Map<string, number>();
      for (const r of rows) m.set(r.county ?? "—", (m.get(r.county ?? "—") ?? 0) + 1);
      return [...m].sort((a, b) => b[1] - a[1]);
    },
  });

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const parsed = parseInstitutionSheet(await readSheet(f));
      const rows = parsed.rows.map(({ institution: i }) => ({
        name: i.name, name_norm: normaliseName(i.name), county: canonicalCounty(i.county) ?? i.county ?? null,
        sub_county: i.sub_county ?? null, latitude: i.latitude ?? null, longitude: i.longitude ?? null, source: f.name,
      }));
      // Replace the registry for the counties this file covers.
      const counties = [...new Set(rows.map((r) => r.county).filter(Boolean))] as string[];
      if (counties.length) {
        const { error } = await sbAny.from("institution_registry").delete().in("county", counties);
        if (error) throw error;
      }
      for (let i = 0; i < rows.length; i += CHUNK) {
        const { error } = await sbAny.from("institution_registry").insert(rows.slice(i, i + CHUNK));
        if (error) throw error;
      }
      toast.success(`Registry updated: ${rows.length} institutions in ${counties.length} counties`);
      qc.invalidateQueries({ queryKey: ["registry-counts"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registry upload failed");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-card border rounded-xl p-5 text-sm space-y-3">
        <p className="flex items-center gap-2 font-semibold"><BookOpen className="h-4 w-4" /> Official institution list</p>
        <p className="text-muted-foreground text-xs max-w-2xl">
          Optional. Upload an official list (e.g. a Ministry of Education school list) with <code>name</code>, <code>county</code> and,
          if available, <code>latitude</code>/<code>longitude</code>. For every county on this list, uploaded institutions
          must match a name on it (and be within 2 km if it has coordinates). Uploading replaces the list for the counties in the file.
        </p>
        <input ref={fileInput} type="file" accept=".csv,.xlsx,.xls" onChange={onFile} className="hidden" />
        <Button variant="outline" onClick={() => fileInput.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />} Upload registry file
        </Button>
      </div>
      {counts.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {counts.map(([c, n]) => (
            <span key={c} className="rounded-full border bg-card px-3 py-1 text-xs">{c}: {n.toLocaleString()}</span>
          ))}
        </div>
      ) : <p className="text-xs text-muted-foreground">No registry uploaded — only built-in checks run.</p>}
    </div>
  );
}
