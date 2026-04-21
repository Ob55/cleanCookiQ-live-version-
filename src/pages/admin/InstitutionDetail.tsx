import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useState } from "react";
import {
  ArrowLeft, Building2, MapPin, Flame, Users, Loader2, UserCheck,
  Phone, Mail, Clock, Utensils, Leaf, DollarSign, Camera, FileText,
  BarChart3, Gauge, Plus, Bell, Factory, ShoppingCart,
} from "lucide-react";
import TransitionProductSelector from "@/components/institution/TransitionProductSelector";
import { TRANSITION_TARGET_LABELS } from "@/components/institution/TransitionTarget";

const FUEL_LABELS: Record<string, string> = {
  firewood: "Firewood", charcoal: "Charcoal", lpg: "LPG",
  biogas: "Biogas", electric: "Electric (Induction)", other: "Other",
};

const KITCHEN_CONDITION_LABELS: Record<string, string> = {
  clean_ready: "Clean and ready",
  minor_renovation: "Minor renovation needed",
  major_renovation: "Major renovation needed",
};

const FINANCING_LABELS: Record<string, string> = {
  loan: "Loan acceptable",
  partial: "Partial grant + partial loan",
  grant: "Full grant only",
  not_sure: "Not sure",
};

const DECISION_MAKER_LABELS: Record<string, string> = {
  head_teacher: "Head Teacher / Principal",
  board_of_governors: "Board of Governors",
  religious_body: "Religious Sponsoring Body",
  pta: "Parent Teacher Association",
  county_government: "County Government / Ministry",
};

export default function InstitutionDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: institution, isLoading } = useQuery({
    queryKey: ["institution", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("institutions").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [needDialogOpen, setNeedDialogOpen] = useState(false);
  const [needDesc, setNeedDesc] = useState("");
  const [needTech, setNeedTech] = useState("");
  const [needSaving, setNeedSaving] = useState(false);

  const { data: scores } = useQuery({
    queryKey: ["readiness_scores", id],
    queryFn: async () => {
      const { data } = await supabase.from("readiness_scores").select("*").eq("institution_id", id!).order("calculated_at", { ascending: false }).limit(1);
      return data?.[0] ?? null;
    },
    enabled: !!id,
  });

  const { data: linkedFunder } = useQuery({
    queryKey: ["linked-funder", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("funder_institution_links")
        .select("*, funder_profiles(full_name, organisation_name, phone)")
        .eq("institution_id", id!)
        .eq("status", "active")
        .limit(1);
      return data?.[0] ?? null;
    },
    enabled: !!id,
  });

  const { data: instDocs } = useQuery({
    queryKey: ["institution_documents", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("institution_documents")
        .select("*")
        .eq("institution_id", id!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: needs } = useQuery({
    queryKey: ["institution_needs", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("institution_needs")
        .select("*, supplier_interest(*, providers(name))")
        .eq("institution_id", id!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!id,
  });

  const addNeed = async () => {
    if (!needDesc.trim() || !id || !user) return;
    setNeedSaving(true);
    const { error } = await supabase.from("institution_needs").insert({
      institution_id: id,
      description: needDesc.trim(),
      technology_type: needTech || null,
      created_by: user.id,
    });
    setNeedSaving(false);
    if (error) { toast.error(error.message); return; }
    setNeedDesc(""); setNeedTech(""); setNeedDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ["institution_needs", id] });
    toast.success("Need added — suppliers will be notified");
  };

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!institution) return <div className="text-center py-16"><p>Institution not found</p></div>;

  const scoreDims = scores ? [
    { label: "Infrastructure", value: Number(scores.infrastructure_score) },
    { label: "Financial", value: Number(scores.financial_score) },
    { label: "Operational", value: Number(scores.operational_score) },
    { label: "Technical", value: Number(scores.technical_score) },
    { label: "Social", value: Number(scores.social_score) },
  ] : [];

  const inst = institution;

  return (
    <div className="space-y-6">
      <Link to="/admin/institutions" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to institutions
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">{inst.name}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
              <span className="capitalize">{inst.institution_type}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{inst.county}{inst.sub_county ? `, ${inst.sub_county}` : ""}</span>
            </div>
          </div>
        </div>
        <Badge variant="secondary" className="capitalize text-sm px-3 py-1">{inst.pipeline_stage.replace(/_/g, " ")}</Badge>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Utensils className="h-5 w-5 text-primary" />} label="Meals/Day" value={inst.meals_per_day || inst.meals_served_per_day || 0} />
        <StatCard icon={<Users className="h-5 w-5 text-primary" />} label="Students" value={inst.number_of_students || 0} />
        <StatCard icon={<UserCheck className="h-5 w-5 text-primary" />} label="Staff" value={inst.number_of_staff || 0} />
        <StatCard icon={<Clock className="h-5 w-5 text-primary" />} label="Cooking Time" value={inst.cooking_time_minutes ? `${(inst.cooking_time_minutes / 60).toFixed(1)} hrs` : "—"} />
      </div>

      {/* Linked Funder */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Linked Funder / Financing Partner</p>
            <p className="text-sm font-semibold">
              {linkedFunder ? (linkedFunder as any).funder_profiles?.organisation_name || (linkedFunder as any).funder_profiles?.full_name || "Linked" : "N/A"}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Energy & Fuel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Flame className="h-4 w-4 text-orange-500" /> Energy & Fuel</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <DetailRow label="Current Fuel" value={inst.current_fuel ? FUEL_LABELS[inst.current_fuel] || inst.current_fuel : "—"} />
              <DetailRow label="Fuel of Choice" value={inst.fuel_of_choice || "—"} />
              <DetailRow label="Consumption/Term" value={inst.consumption_per_term ? `${inst.consumption_per_term} ${inst.consumption_unit || ""}` : "—"} />
              <DetailRow label="Recommended Solution" value={inst.recommended_solution || "—"} />
            </dl>
          </CardContent>
        </Card>

        {/* Financial Impact */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4 text-emerald-500" /> Financial & Environmental</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <DetailRow label="Monthly Fuel Spend" value={inst.monthly_fuel_spend ? `KSh ${Number(inst.monthly_fuel_spend).toLocaleString()}` : "—"} />
              <DetailRow label="Annual Savings" value={inst.annual_savings_ksh ? `KSh ${Number(inst.annual_savings_ksh).toLocaleString()}` : "—"} />
              <DetailRow label="CO₂ Reduction" value={inst.co2_reduction_tonnes_pa ? `${Number(inst.co2_reduction_tonnes_pa).toLocaleString()} t/yr` : "—"} />
              <DetailRow label="Ownership Type" value={inst.ownership_type || "—"} capitalize />
              <DetailRow label="Financing Preference" value={inst.financing_preference ? FINANCING_LABELS[inst.financing_preference] || inst.financing_preference : "—"} />
              <DetailRow label="Financial Decision Maker" value={inst.financial_decision_maker ? DECISION_MAKER_LABELS[inst.financial_decision_maker] || inst.financial_decision_maker : "—"} />
            </dl>
          </CardContent>
        </Card>

        {/* Kitchen & Assessment */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Gauge className="h-4 w-4 text-primary" /> Kitchen & Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <DetailRow label="Dedicated Kitchen" value={inst.has_dedicated_kitchen === true ? "Yes" : inst.has_dedicated_kitchen === false ? "No" : "Not set"} />
              <DetailRow label="Kitchen Condition" value={inst.kitchen_condition ? KITCHEN_CONDITION_LABELS[inst.kitchen_condition] || inst.kitchen_condition : "Not set"} />
              <DetailRow label="Assessment Score" value={inst.assessment_score ? `${inst.assessment_score}%` : "Not scored"} />
              <DetailRow label="Assessment Category" value={inst.assessment_category || "Not categorized"} />
              <DetailRow label="Transition Interest" value={inst.transition_interest || "Not set"} capitalize />
              <DetailRow
                label="Preferred Transition Method"
                value={inst.transition_target_fuel ? (TRANSITION_TARGET_LABELS[inst.transition_target_fuel] || inst.transition_target_fuel) : "Not selected yet"}
              />
            </dl>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Phone className="h-4 w-4 text-blue-500" /> Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <DetailRow label="Contact Person" value={inst.contact_person || "—"} />
              <DetailRow label="Phone" value={inst.contact_phone || "—"} />
              <DetailRow label="Email" value={inst.contact_email || "—"} />
            </dl>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4 text-red-500" /> Location</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <DetailRow label="County" value={inst.county} />
              <DetailRow label="Sub-County" value={inst.sub_county || "—"} />
              <DetailRow label="Coordinates" value={inst.latitude && inst.longitude ? `${inst.latitude}, ${inst.longitude}` : "—"} />
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Kitchen Photo */}
      {inst.kitchen_photo_url && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Camera className="h-4 w-4 text-purple-500" /> Kitchen Photo</CardTitle>
          </CardHeader>
          <CardContent>
            <img src={inst.kitchen_photo_url} alt="Kitchen" className="rounded-lg max-h-64 object-cover" />
          </CardContent>
        </Card>
      )}

      {/* Readiness Score */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Gauge className="h-4 w-4 text-primary" /> Readiness Score</CardTitle>
        </CardHeader>
        <CardContent>
          {scores ? (
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-20 w-20 rounded-full border-4 border-primary flex items-center justify-center">
                  <span className="text-2xl font-display font-bold">{Number(scores.overall_score).toFixed(0)}</span>
                </div>
                <p className="text-sm text-muted-foreground">Overall readiness score out of 100</p>
              </div>
              <div className="space-y-3">
                {scoreDims.map(dim => (
                  <div key={dim.label} className="flex items-center gap-3">
                    <span className="text-sm w-28 shrink-0">{dim.label}</span>
                    <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${dim.value}%` }} />
                    </div>
                    <span className="text-sm font-medium w-10 text-right">{dim.value.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No assessment scored yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Transition Products & Needs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-primary" /> What They Need for Transitioning</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <TransitionProductSelector institutionId={inst.id} editable={false} />
          {inst.transition_needs && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Additional Notes</p>
              <p className="text-sm whitespace-pre-wrap">{inst.transition_needs}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {inst.notes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /> Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{inst.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Institution Needs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4 text-accent" /> Institution Needs</CardTitle>
            <Dialog open={needDialogOpen} onOpenChange={setNeedDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Need</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Institution Need</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Description</Label>
                    <Textarea value={needDesc} onChange={e => setNeedDesc(e.target.value)} placeholder="What does this institution need?" className="mt-1" rows={3} />
                  </div>
                  <div>
                    <Label>Technology Type (optional)</Label>
                    <Input value={needTech} onChange={e => setNeedTech(e.target.value)} placeholder="e.g. Solar Cookstove, LPG System" className="mt-1" />
                  </div>
                  <Button onClick={addNeed} className="w-full" disabled={needSaving || !needDesc.trim()}>
                    {needSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Add Need
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {!needs || needs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No needs added yet. Add what this institution requires so suppliers can respond.</p>
          ) : (
            <div className="space-y-3">
              {needs.map((need: any) => (
                <div key={need.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{need.description}</p>
                      {need.technology_type && <Badge variant="secondary" className="mt-1 text-xs">{need.technology_type}</Badge>}
                    </div>
                    <Badge variant={need.status === "open" ? "default" : "outline"}>{need.status}</Badge>
                  </div>
                  {need.supplier_interest && need.supplier_interest.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                        <Factory className="h-3 w-3" /> Interested Suppliers ({need.supplier_interest.length})
                      </p>
                      <div className="space-y-1">
                        {need.supplier_interest.map((si: any) => (
                          <div key={si.id} className="flex items-center justify-between text-sm">
                            <span className="font-medium">{si.providers?.name ?? "Unknown"}</span>
                            <Badge className="text-xs bg-green-500/10 text-green-600 border-green-500/20">{si.status}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Uploaded Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {!instDocs || instDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No documents uploaded by this institution.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {instDocs.map((doc: any) => (
                <div key={doc.id} className="border border-border rounded-lg p-3">
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-2">
                    {doc.file_url?.match(/\.(jpg|jpeg|png|gif|webp)/i) ? (
                      <img src={doc.file_url} alt={doc.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileText className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium truncate">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(doc.created_at).toLocaleDateString()}</p>
                  {doc.file_url && (
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-block">View File</a>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{typeof value === "number" ? value.toLocaleString() : value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailRow({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`font-medium ${capitalize ? "capitalize" : ""}`}>{value}</dd>
    </div>
  );
}
