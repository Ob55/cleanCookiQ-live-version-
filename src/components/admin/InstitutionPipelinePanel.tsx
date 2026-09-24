import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2, AlertTriangle, Lightbulb, HandCoins, KeyRound, Info, Loader2, Copy, Factory, Search, RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sbAny } from "@/lib/sbAny";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { missingFields } from "@/lib/institutionValidation";
import { METHOD_LABELS, recommendCookingMethod, suggestProviders, type ProviderForMatch } from "@/lib/institutionDerived";
import { proposeForInstitutions } from "@/lib/runRecommendation";

type Inst = Record<string, any>;
type FunderLink = { id: string; funder_id: string; funder_profiles: { organisation_name: string | null; full_name: string | null } | null } | null;

/**
 * Admin transition pipeline for one institution:
 * validation → method proposal (+ providers) → funder allocation → login.
 */
export function InstitutionPipelinePanel({ inst, linkedFunder }: { inst: Inst; linkedFunder: FunderLink }) {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["institution", inst.id] });
    qc.invalidateQueries({ queryKey: ["linked-funder", inst.id] });
    qc.invalidateQueries({ queryKey: ["institutions"] });
    qc.invalidateQueries({ queryKey: ["institution-funder-map"] });
  };

  const passed = inst.verification_status === "verified";
  const method: string | null = inst.recommended_solution;
  const funderName = linkedFunder?.funder_profiles?.organisation_name || linkedFunder?.funder_profiles?.full_name || null;
  const ready = passed && !!method && !!funderName;
  const missing = missingFields(inst);
  const issues: { message: string }[] = inst.validation_issues ?? [];

  return (
    <div className="space-y-4">
      {/* The three labels that make an institution ready for transition */}
      <div className={cn("rounded-xl border p-4 flex flex-wrap items-center gap-2", ready ? "border-primary bg-primary/5" : "bg-card")}>
        <Step done={passed} icon={passed ? CheckCircle2 : AlertTriangle} label={passed ? "Passed validation" : inst.verification_status === "flagged" ? "Flagged" : "Not validated"} tone={passed ? "bg-emerald-600" : "bg-destructive"} />
        <Step done={!!method} icon={Lightbulb} label={method ? `Method: ${METHOD_LABELS[method] ?? method}` : "No method proposed"} tone="bg-sky-600" />
        <Step done={!!funderName} icon={HandCoins} label={funderName ? `Funder: ${funderName}` : "No funder allocated"} tone="bg-amber-500" />
        <span className={cn("ml-auto text-sm font-semibold", ready ? "text-primary" : "text-muted-foreground")}>
          {ready ? "Ready for transition" : `${[passed, !!method, !!funderName].filter(Boolean).length}/3 steps done`}
        </span>
      </div>

      <LoginCard inst={inst} onChanged={refresh} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Info className="h-4 w-4 text-primary" /> Validation & missing information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {inst.verification_note && <p className="text-muted-foreground">{inst.verification_note}</p>}
            {issues.length > 0 && (
              <ul className="space-y-1">
                {issues.map((x, k) => <li key={k} className="rounded-md bg-destructive/10 text-destructive px-3 py-1.5 text-xs">{x.message}</li>)}
              </ul>
            )}
            {missing.length ? (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Missing information</p>
                <div className="flex flex-wrap gap-1.5">
                  {missing.map((m) => <span key={m} className="rounded-full border px-2 py-0.5 text-xs">{m}</span>)}
                </div>
              </div>
            ) : <p className="text-xs text-emerald-700">All key profile fields are filled in.</p>}
          </CardContent>
        </Card>

        <MethodCard inst={inst} disabled={!passed} onChanged={refresh} />
        <FunderCard inst={inst} linkedFunder={linkedFunder} funderName={funderName} disabled={!passed} onChanged={refresh} />
      </div>
    </div>
  );
}

function Step({ done, icon: Icon, label, tone }: { done: boolean; icon: typeof CheckCircle2; label: string; tone: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
      done ? `${tone} text-white` : "border text-muted-foreground")}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </span>
  );
}

function MethodCard({ inst, disabled, onChanged }: { inst: Inst; disabled: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const ids: string[] = inst.recommended_providers ?? [];
  const { data: providers = [] } = useQuery({
    queryKey: ["providers-for-match"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from("providers").select("id, name, technology_types, counties_served, verified");
      if (error) throw error;
      return (data ?? []) as ProviderForMatch[];
    },
  });
  const suggested = ids.map((id) => providers.find((p) => p.id === id)).filter(Boolean) as ProviderForMatch[];

  async function propose() {
    setBusy(true);
    try { await proposeForInstitutions([inst.id]); toast.success("Method proposed"); onChanged(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  }

  async function override(method: string) {
    setBusy(true);
    const auto = recommendCookingMethod(inst);
    const recommended_providers = suggestProviders(inst.county, method, providers).map((p) => p.id);
    const { error } = await sbAny.from("institutions").update({
      recommended_solution: method,
      recommendation_reason: method === auto.method ? auto.reason : `Set by admin (system suggested ${METHOD_LABELS[auto.method] ?? auto.method}).`,
      recommended_providers,
    }).eq("id", inst.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Method updated"); onChanged();
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><Lightbulb className="h-4 w-4 text-sky-600" /> Proposed cooking method</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {inst.recommended_solution ? (
          <>
            <p className="text-lg font-semibold">{METHOD_LABELS[inst.recommended_solution] ?? inst.recommended_solution}</p>
            {inst.recommendation_reason && <p className="text-muted-foreground">{inst.recommendation_reason}</p>}
          </>
        ) : <p className="text-muted-foreground">{disabled ? "Available once the institution passes validation." : "No method proposed yet."}</p>}

        <div>
          <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1"><Factory className="h-3 w-3" /> Suggested service providers</p>
          {suggested.length ? (
            <ul className="space-y-1">
              {suggested.map((p) => (
                <li key={p.id} className="flex items-center justify-between">
                  <Link to={`/admin/providers/${p.id}`} className="text-primary hover:underline">{p.name}</Link>
                  <span className="text-[11px] text-muted-foreground">
                    {(p.counties_served ?? []).some((c) => c.toLowerCase() === String(inst.county ?? "").toLowerCase()) ? `Serves ${inst.county}` : "Outside county"}
                    {p.verified ? " · verified" : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : <p className="text-xs text-muted-foreground">{inst.recommended_solution ? "No provider offers this method yet." : "—"}</p>}
        </div>

        <div className="flex gap-2 items-center pt-1">
          <Select value={inst.recommended_solution ?? undefined} onValueChange={override} disabled={disabled || busy}>
            <SelectTrigger className="h-8 w-[190px] text-xs"><SelectValue placeholder="Change method" /></SelectTrigger>
            <SelectContent>
              {Object.entries(METHOD_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={propose} disabled={disabled || busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />} Re-propose
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FunderCard({ inst, linkedFunder, funderName, disabled, onChanged }: {
  inst: Inst; linkedFunder: FunderLink; funderName: string | null; disabled: boolean; onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: funders = [], isLoading } = useQuery({
    queryKey: ["funder-profiles-list"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from("funder_profiles").select("id, organisation_name, full_name, funding_type").order("organisation_name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? funders.filter((f) => [f.organisation_name, f.full_name].some((v) => v?.toLowerCase().includes(s))) : funders;
  }, [funders, q]);

  async function allocate(funderId: string) {
    setBusy(true);
    // One active funder per institution: retire the current link, then link the new one.
    const { error: e1 } = await supabase.from("funder_institution_links")
      .update({ status: "inactive" }).eq("institution_id", inst.id).eq("status", "active").neq("funder_id", funderId);
    const { error: e2 } = e1 ? { error: e1 } : await supabase.from("funder_institution_links")
      .upsert({ funder_id: funderId, institution_id: inst.id, status: "active" }, { onConflict: "funder_id,institution_id" });
    setBusy(false);
    if (e2) { toast.error(e2.message); return; }
    toast.success("Funder allocated — they can now see this institution");
    setOpen(false); onChanged();
  }

  async function unallocate() {
    if (!linkedFunder || !confirm("Remove this funder allocation?")) return;
    const { error } = await supabase.from("funder_institution_links").update({ status: "inactive" }).eq("id", linkedFunder.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Funder allocation removed"); onChanged();
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><HandCoins className="h-4 w-4 text-amber-500" /> Funder allocation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>{funderName ? <span className="font-semibold">{funderName}</span> : <span className="text-muted-foreground">{disabled ? "Available once the institution passes validation." : "No funder allocated yet."}</span>}</p>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setOpen(true)} disabled={disabled}>
            <HandCoins className="h-3.5 w-3.5 mr-1" /> {funderName ? "Change funder" : "Allocate funder"}
          </Button>
          {linkedFunder && <Button size="sm" variant="ghost" onClick={unallocate}>Remove</Button>}
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Allocate a funder</DialogTitle>
            <DialogDescription>The funder will see this institution (by code) in their portal.</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search funders..." className="pl-9" />
          </div>
          <div className="max-h-72 overflow-y-auto divide-y border rounded-md">
            {isLoading ? <div className="p-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
              : shown.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No funders registered.</p>
              : shown.map((f) => (
                <button key={f.id} type="button" disabled={busy} onClick={() => allocate(f.id)}
                  className={cn("w-full text-left px-3 py-2 hover:bg-muted text-sm", linkedFunder?.funder_id === f.id && "bg-primary/10")}>
                  <p className="font-medium">{f.organisation_name || f.full_name}</p>
                  <p className="text-xs text-muted-foreground">{f.full_name} · {f.funding_type}</p>
                </button>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function LoginCard({ inst, onChanged }: { inst: Inst; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string>(inst.contact_email ?? "");
  const [leadName, setLeadName] = useState<string>(inst.contact_person ?? "");
  const [phone, setPhone] = useState<string>(inst.contact_phone ?? "");
  const [busy, setBusy] = useState(false);
  const [creds, setCreds] = useState<{ email: string; password: string; email_sent: boolean } | null>(null);

  // An institution login owns the record (created_by) and has an organisation.
  const { data: hasLogin } = useQuery({
    queryKey: ["institution-has-login", inst.id, inst.created_by],
    enabled: !!inst.created_by,
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", inst.created_by)
        .in("role", ["institution_admin", "institution_user"]);
      return (data?.length ?? 0) > 0;
    },
  });

  async function create() {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("create-institution-login", {
      body: { institution_id: inst.id, email, full_name: leadName, phone, app_url: window.location.origin },
    });
    setBusy(false);
    if (error) {
      const body = await (error as { context?: Response }).context?.json?.().catch(() => null);
      toast.error(body?.error ?? error.message);
      return;
    }
    setCreds(data);
    onChanged();
  }

  const close = () => { setOpen(false); setCreds(null); };

  return (
    <Card className={cn(!hasLogin && "border-primary/40 bg-primary/5")}>
      <CardContent className="p-4 flex items-center gap-3 flex-wrap text-sm">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <KeyRound className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-[220px]">
          <p className="font-semibold">Institution login</p>
          {hasLogin ? (
            <p className="text-muted-foreground">
              {inst.contact_person ? <span className="font-medium text-foreground">{inst.contact_person}</span> : "The institution"} can sign in
              {inst.contact_email ? <> as <span className="font-medium text-foreground">{inst.contact_email}</span></> : null} and see this institution's dashboard.
            </p>
          ) : (
            <p className="text-muted-foreground">No login yet. Create one for the head teacher / lead so they can sign in and see this institution's dashboard.</p>
          )}
        </div>
        {!hasLogin && (
          <Button onClick={() => setOpen(true)}><KeyRound className="h-4 w-4 mr-2" /> Create login</Button>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{creds ? "Login created" : "Create institution login"}</DialogTitle>
            <DialogDescription>
              {creds ? "Copy the password now — it won't be shown again." : "The head teacher / lead signs in with this email. A password is generated automatically and emailed to them."}
            </DialogDescription>
          </DialogHeader>
          {creds ? (
            <div className="space-y-3 text-sm">
              <div className="rounded-md border bg-muted/40 p-3 space-y-1 font-mono text-xs">
                <p>Email: {creds.email}</p>
                <p>Password: {creds.password}</p>
              </div>
              <Button variant="outline" className="w-full" onClick={() => {
                navigator.clipboard.writeText(`Email: ${creds.email}\nPassword: ${creds.password}`);
                toast.success("Copied");
              }}><Copy className="h-4 w-4 mr-2" /> Copy login details</Button>
              <p className={cn("text-xs", creds.email_sent ? "text-emerald-700" : "text-amber-700")}>
                {creds.email_sent ? `Also emailed to ${creds.email}.` : "The email could not be sent — pass these details on yourself."}
              </p>
              <p className="text-xs text-muted-foreground">If they lose it, they can use "Forgot password?" on the sign-in page.</p>
              <Button className="w-full" onClick={close}>Done</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label htmlFor="login-name">Head teacher / lead name</Label>
                <Input id="login-name" value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="e.g. Jane Mutua (Principal)" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="login-email">Login email</Label>
                <Input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="login-phone">Phone (optional)</Label>
                <Input id="login-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07xx xxx xxx" className="mt-1" />
              </div>
              <Button className="w-full" onClick={create} disabled={busy || !leadName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())}>
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Create login
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
