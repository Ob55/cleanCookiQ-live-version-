import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Wizard } from "@/components/Wizard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { combineValidators, required, type WizardStep } from "@/lib/onboarding";
import { useAuth } from "@/contexts/AuthContext";
import { useCounties } from "@/hooks/useCounties";
import { useFinancingInstruments } from "@/hooks/useFinancing";
import { supabase } from "@/integrations/supabase/client";

interface FunderOnboardingData {
  name: string;
  ticketSizeMin: number | null;
  ticketSizeMax: number | null;
  preferredCounties: string[];
  preferredFuels: string[];
  preferredInstruments: string[];
  maxRiskScore: number | null;
  esgFocus: string[];
  notes: string;
}

const FUELS = ["firewood", "charcoal", "lpg", "biogas", "electric"];
const ESG_OPTIONS = ["climate", "gender", "education", "health", "livelihoods"];

const steps: WizardStep<FunderOnboardingData>[] = [
  { id: "identity", title: "Who you are",
    description: "How your organisation appears to other funders and admins.",
    validate: combineValidators(required("name", "Organisation name")) },
  { id: "ticket", title: "Ticket size",
    description: "What deal sizes you typically write a cheque for.",
    validate: (d) => {
      const out: string[] = [];
      if (d.ticketSizeMin !== null && d.ticketSizeMin < 0) out.push("Min ticket size cannot be negative.");
      if (d.ticketSizeMax !== null && d.ticketSizeMin !== null && d.ticketSizeMax < d.ticketSizeMin) {
        out.push("Max ticket size must be at least the min.");
      }
      return out;
    } },
  { id: "geo-fuel", title: "Where & what",
    description: "Filter your deal flow to counties and fuel transitions you care about." },
  { id: "instruments", title: "Instruments",
    description: "Which financing structures you can offer." },
  { id: "risk", title: "Risk appetite",
    description: "We'll exclude or down-rank deals above this risk score." },
  { id: "esg", title: "ESG focus",
    description: "Tags used to surface relevant deals and impact reports." },
];

export default function FunderOnboarding() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { data: counties } = useCounties();
  const { data: instruments } = useFinancingInstruments();

  const [data, setData] = useState<FunderOnboardingData>({
    name: "",
    ticketSizeMin: null,
    ticketSizeMax: null,
    preferredCounties: [],
    preferredFuels: [],
    preferredInstruments: [],
    maxRiskScore: null,
    esgFocus: [],
    notes: "",
  });

  const handleFinish = async (final: FunderOnboardingData) => {
    if (!user || !profile?.organisation_id) {
      toast.error("You must be signed in as a funder organisation to complete onboarding.");
      return;
    }
    const payload = {
      organisation_id: profile.organisation_id,
      name: final.name,
      ticket_size_min: final.ticketSizeMin,
      ticket_size_max: final.ticketSizeMax,
      preferred_counties: final.preferredCounties,
      preferred_fuels: final.preferredFuels,
      preferred_instruments: final.preferredInstruments,
      max_risk_score: final.maxRiskScore,
      esg_focus: final.esgFocus,
      notes: final.notes || null,
    };
    const { error } = await (supabase as unknown as {
      from: (t: string) => {
        upsert: (rows: unknown, opts?: { onConflict?: string }) => Promise<{ error: unknown }>;
      };
    })
      .from("funder_preferences")
      .upsert(payload, { onConflict: "organisation_id" });
    if (error) {
      toast.error("Could not save preferences. " + (error as { message?: string }).message);
      return;
    }
    // Mark onboarding complete
    await (supabase as unknown as {
      from: (t: string) => {
        upsert: (rows: unknown, opts?: { onConflict?: string }) => Promise<{ error: unknown }>;
      };
    })
      .from("onboarding_progress")
      .upsert(
        {
          user_id: user.id,
          journey: "funder",
          step_index: steps.length,
          total_steps: steps.length,
          is_complete: true,
          completed_at: new Date().toISOString(),
          data: { name: final.name },
        },
        { onConflict: "user_id,journey" },
      );

    await refreshProfile();
    toast.success("Welcome to CleanCookiQ.");
    navigate("/funder/deals");
  };

  return (
    <div className="container max-w-2xl py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Funder onboarding</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          A short setup so we can curate the right deal flow for you. Takes about 3 minutes.
        </p>
      </div>

      <Wizard<FunderOnboardingData>
        steps={steps}
        data={data}
        setData={setData}
        onFinish={handleFinish}
        finishLabel="Save preferences"
        renderStep={(index, d, setD) => {
          if (index === 0) {
            return (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Organisation name</Label>
                  <Input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
                </div>
              </div>
            );
          }
          if (index === 1) {
            return (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Ticket size — min (KSh)</Label>
                  <Input
                    type="number"
                    value={d.ticketSizeMin ?? ""}
                    onChange={(e) => setD({ ...d, ticketSizeMin: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Ticket size — max (KSh)</Label>
                  <Input
                    type="number"
                    value={d.ticketSizeMax ?? ""}
                    onChange={(e) => setD({ ...d, ticketSizeMax: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
              </div>
            );
          }
          if (index === 2) {
            return (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Preferred counties (leave empty for all)</Label>
                  <select
                    multiple
                    className="w-full text-sm rounded-md border border-input bg-background px-2 py-1.5 h-32"
                    value={d.preferredCounties}
                    onChange={(e) =>
                      setD({
                        ...d,
                        preferredCounties: Array.from(e.target.selectedOptions, (o) => o.value),
                      })
                    }
                  >
                    {(counties ?? []).map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Preferred baseline fuels</Label>
                  <div className="flex flex-wrap gap-2">
                    {FUELS.map((f) => (
                      <Toggle
                        key={f}
                        active={d.preferredFuels.includes(f)}
                        onClick={() =>
                          setD({
                            ...d,
                            preferredFuels: d.preferredFuels.includes(f)
                              ? d.preferredFuels.filter((x) => x !== f)
                              : [...d.preferredFuels, f],
                          })
                        }
                      >
                        {f}
                      </Toggle>
                    ))}
                  </div>
                </div>
              </div>
            );
          }
          if (index === 3) {
            return (
              <div className="flex flex-wrap gap-2">
                {(instruments ?? []).map((i) => (
                  <Toggle
                    key={i.id}
                    active={d.preferredInstruments.includes(i.slug)}
                    onClick={() =>
                      setD({
                        ...d,
                        preferredInstruments: d.preferredInstruments.includes(i.slug)
                          ? d.preferredInstruments.filter((x) => x !== i.slug)
                          : [...d.preferredInstruments, i.slug],
                      })
                    }
                  >
                    {i.name}
                  </Toggle>
                ))}
              </div>
            );
          }
          if (index === 4) {
            return (
              <div>
                <Label className="text-xs">Max risk score (1-25, leave blank for any)</Label>
                <Input
                  type="number"
                  min={1}
                  max={25}
                  value={d.maxRiskScore ?? ""}
                  onChange={(e) => setD({ ...d, maxRiskScore: e.target.value ? Number(e.target.value) : null })}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Severity × likelihood. 16+ = critical.
                </p>
              </div>
            );
          }
          if (index === 5) {
            return (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">ESG focus areas</Label>
                  <div className="flex flex-wrap gap-2">
                    {ESG_OPTIONS.map((e) => (
                      <Toggle
                        key={e}
                        active={d.esgFocus.includes(e)}
                        onClick={() =>
                          setD({
                            ...d,
                            esgFocus: d.esgFocus.includes(e)
                              ? d.esgFocus.filter((x) => x !== e)
                              : [...d.esgFocus, e],
                          })
                        }
                      >
                        {e}
                      </Toggle>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Notes (optional)</Label>
                  <Textarea
                    rows={3}
                    value={d.notes}
                    onChange={(e) => setD({ ...d, notes: e.target.value })}
                    placeholder="Anything else our team should know about your mandate?"
                  />
                </div>
              </div>
            );
          }
          return null;
        }}
      />
    </div>
  );
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full border capitalize transition-colors ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-muted-foreground border-border hover:border-primary/40"
      }`}
    >
      {children}
    </button>
  );
}
