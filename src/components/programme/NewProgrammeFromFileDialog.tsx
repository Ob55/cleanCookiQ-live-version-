import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { read, utils } from "xlsx";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, Loader2, AlertCircle, FileSpreadsheet, Info, CheckCircle2, Circle, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { parseInstitutionSheet, type ImportResult } from "@/lib/excelImport";
import { toInstitutionInserts, type ResolvedCoords } from "@/lib/programmeImport";
import { geocodeInstitution, GEOCODE_MIN_INTERVAL_MS } from "@/lib/geocode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const CHUNK = 50;
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB — ample for an institution sheet.

type Phase = "idle" | "parsing" | "ready" | "creating";
// Ordered sub-steps within the "creating" phase (see create()).
type Step = "programme" | "geocoding" | "inserting" | null;

const hasCoords = (i: { latitude?: number | null; longitude?: number | null }) =>
  i.latitude != null && i.longitude != null;

function formatDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// "New from file" — creates a whole programme from an uploaded institution sheet
// in one step: parse (same engine as the Import Institutions page) → preview →
// look up any missing GPS (server-side geocoding) → insert the programme + all
// its institutions (linked via programme_id), flagging rows with missing data.
// The programme then renders through the shared ProgrammeWorkspace, with its
// Overview / Institutions charts derived live from these rows.
export default function NewProgrammeFromFileDialog({
  open, onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [filename, setFilename] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [parseErr, setParseErr] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [step, setStep] = useState<Step>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  // Live "generating" timer — ticks while a step is running so the UI can show
  // elapsed time and an estimated "~N s left" (derived from geocoding pace).
  const [nowTs, setNowTs] = useState(0);
  const startedAt = useRef(0);
  const stepStartedAt = useRef(0);

  useEffect(() => {
    if (phase !== "creating") return;
    const id = setInterval(() => setNowTs(Date.now()), 250);
    return () => clearInterval(id);
  }, [phase]);

  function reset() {
    setName(""); setDescription(""); setFilename(null); setPhase("idle");
    setParseErr(null); setResult(null); setStep(null); setProgress({ done: 0, total: 0 });
    if (fileInput.current) fileInput.current.value = "";
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_FILE_BYTES) {
      setParseErr(`File is too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Max 10 MB.`);
      setPhase("idle");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    setFilename(f.name);
    setParseErr(null);
    setResult(null);
    setPhase("parsing");
    // Default the programme name to the file name (minus extension) if empty.
    if (!name.trim()) setName(f.name.replace(/\.[^.]+$/, ""));
    try {
      const buf = await f.arrayBuffer();
      const wb = read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const aoa = utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });
      setResult(parseInstitutionSheet(aoa));
      setPhase("ready");
    } catch (err) {
      setParseErr(err instanceof Error ? err.message : String(err));
      setPhase("idle");
    }
  }

  async function create() {
    if (!result || !name.trim()) return;
    setPhase("creating");
    setStep("programme");
    setProgress({ done: 0, total: 0 });
    startedAt.current = Date.now();
    setNowTs(Date.now());

    // Step 1: create the programme. If this fails, nothing was written — safe to retry.
    const { data: created, error } = await supabase
      .from("programmes")
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        programme_manager_id: user?.id,
      })
      .select("id")
      .single();
    if (error) {
      setPhase("ready");
      setStep(null);
      toast.error(`Failed to create programme: ${error.message}`);
      return;
    }
    const programmeId = created!.id;

    // Step 2: look up GPS for rows that arrived without coordinates. Sequential +
    // throttled (Nominatim ~1 req/s); a failed lookup returns null and the row is
    // simply flagged as missing GPS. Rows that already have coords are skipped.
    const missingRows = result.rows.filter((r) => !hasCoords(r.institution));
    const coordsByRowIndex: Record<number, ResolvedCoords | null> = {};
    let geocoded = 0;
    if (missingRows.length > 0) {
      setStep("geocoding");
      setProgress({ done: 0, total: missingRows.length });
      stepStartedAt.current = Date.now();
      for (let i = 0; i < missingRows.length; i++) {
        const r = missingRows[i];
        const t0 = Date.now();
        const coords = await geocodeInstitution({
          name: r.institution.name,
          county: r.institution.county,
        });
        coordsByRowIndex[r.rowIndex] = coords;
        if (coords) geocoded++;
        setProgress({ done: i + 1, total: missingRows.length });
        // Pace to respect the rate limit (skip the wait after the last one).
        if (i < missingRows.length - 1) {
          const elapsed = Date.now() - t0;
          if (elapsed < GEOCODE_MIN_INTERVAL_MS) await sleep(GEOCODE_MIN_INTERVAL_MS - elapsed);
        }
      }
    }

    // Step 3: bulk-insert institutions in chunks, with resolved coords + data
    // flags. county is NOT NULL, so it falls back to "Unspecified".
    // The programme already exists now, so on any error we still navigate to it
    // (rather than returning to "ready", which would create a *second* programme
    // on retry). Partial rows can be topped up from the programme's own view.
    setStep("inserting");
    setProgress({ done: 0, total: result.rows.length });
    stepStartedAt.current = Date.now();
    const payloads = toInstitutionInserts(result.rows, {
      programmeId,
      createdBy: user?.id,
      coordsByRowIndex,
    });
    const flagged = payloads.filter((p) => p.verification_status === "flagged").length;
    let inserted = 0;
    let insertErr: string | null = null;
    for (let i = 0; i < payloads.length; i += CHUNK) {
      const batch = payloads.slice(i, i + CHUNK);
      const { error: instErr } = await supabase.from("institutions").insert(batch as never);
      if (instErr) { insertErr = instErr.message; break; }
      inserted += batch.length;
      setProgress((p) => ({ ...p, done: inserted }));
    }

    queryClient.invalidateQueries({ queryKey: ["programmes_overview"] });
    if (insertErr) {
      toast.error(`Programme created, but import stopped at ${inserted}/${result.rows.length}: ${insertErr}`);
    } else {
      const bits = [`${inserted} institutions`];
      if (geocoded > 0) bits.push(`${geocoded} GPS located`);
      if (flagged > 0) bits.push(`${flagged} flagged for missing data`);
      toast.success(`Created “${name.trim()}” — ${bits.join(", ")}`);
    }
    setStep(null);
    onOpenChange(false);
    reset();
    navigate(`/admin/programmes/${programmeId}`);
  }

  const busy = phase === "parsing" || phase === "creating";
  const missingGpsCount = result ? result.rows.filter((r) => !hasCoords(r.institution)).length : 0;

  // Live elapsed + ETA (ETA only meaningful during the paced geocoding step).
  const elapsedMs = phase === "creating" && startedAt.current ? nowTs - startedAt.current : 0;
  let etaLabel = "";
  if (step === "geocoding" && progress.done > 0 && progress.done < progress.total) {
    const perItem = (nowTs - stepStartedAt.current) / progress.done;
    etaLabel = ` · ~${formatDuration(perItem * (progress.total - progress.done))} left`;
  }
  const pct = progress.total ? (progress.done / progress.total) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (busy) return; onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New programme from file</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Programme name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} disabled={busy} className="mt-1" placeholder="e.g. Kitui County Cooking Baseline" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={busy} className="mt-1" rows={2} />
          </div>

          <div>
            <Label>Institutions file (.xlsx / .xls)</Label>
            <input ref={fileInput} type="file" accept=".xlsx,.xls" onChange={onFile} className="hidden" />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={busy}
              className="mt-1 w-full rounded-lg border-2 border-dashed border-border bg-card px-4 py-6 text-center transition hover:border-primary/40 disabled:opacity-60"
            >
              {phase === "parsing" ? (
                <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Parsing {filename}…
                </span>
              ) : filename ? (
                <span className="inline-flex items-center gap-2 text-sm">
                  <FileSpreadsheet className="h-4 w-4 text-primary" /> {filename} — choose a different file
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Upload className="h-4 w-4" /> Choose an Excel file
                </span>
              )}
            </button>
            <p className="text-[11px] text-muted-foreground mt-1">
              Columns are auto-mapped by name. Required: <code>name</code>. Recognised: county,
              institution_type, current_fuel, meals_per_day, number_of_students, number_of_staff,
              contact_person, contact_phone, contact_email, latitude, longitude, sub_county, notes.
            </p>
          </div>

          {parseErr && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Could not parse file</AlertTitle>
              <AlertDescription>{parseErr}</AlertDescription>
            </Alert>
          )}

          {result && phase === "ready" && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>{result.rows.length} institutions ready{result.skipped.length ? `, ${result.skipped.length} skipped` : ""}</AlertTitle>
              <AlertDescription className="text-xs space-y-1">
                {result.unmappedHeaders.length > 0 && <div>{result.unmappedHeaders.length} column(s) ignored: {result.unmappedHeaders.join(", ")}</div>}
                {result.rows.length === 0 && <div>No rows with a recognised name column were found.</div>}
                {missingGpsCount > 0 && (
                  <div className="inline-flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {missingGpsCount} of {result.rows.length} row(s) missing GPS — coordinates will be looked up on create.
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {phase === "creating" && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Generating programme…
                </span>
                <span className="tabular-nums">{formatDuration(elapsedMs)} elapsed</span>
              </div>

              <StepRow
                label="Look up missing GPS"
                state={step === "geocoding" ? "active" : step === "inserting" ? "done" : "pending"}
                skipped={missingGpsCount === 0}
                detail={step === "geocoding" ? `${progress.done}/${progress.total}${etaLabel}` : undefined}
              />
              <StepRow
                label="Save institutions"
                state={step === "inserting" ? "active" : "pending"}
                detail={step === "inserting" ? `${progress.done}/${progress.total}` : undefined}
              />

              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}

          <Button
            onClick={create}
            disabled={busy || !name.trim() || !result || result.rows.length === 0}
            className="w-full"
          >
            {phase === "creating" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {phase === "creating"
              ? "Creating programme…"
              : result ? `Create programme + ${result.rows.length} institutions` : "Create programme"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StepRow({
  label, state, detail, skipped,
}: {
  label: string;
  state: "pending" | "active" | "done";
  detail?: string;
  skipped?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="inline-flex items-center gap-2">
        {skipped ? (
          <CheckCircle2 className="h-4 w-4 text-muted-foreground/50" />
        ) : state === "done" ? (
          <CheckCircle2 className="h-4 w-4 text-primary" />
        ) : state === "active" ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground/40" />
        )}
        <span className={state === "pending" && !skipped ? "text-muted-foreground" : ""}>
          {label}{skipped ? " — none needed" : ""}
        </span>
      </span>
      {detail && <span className="text-xs text-muted-foreground tabular-nums">{detail}</span>}
    </div>
  );
}
