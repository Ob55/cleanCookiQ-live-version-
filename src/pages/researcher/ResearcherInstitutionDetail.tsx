import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, ArrowLeft, MapPin, Flame, Users, UtensilsCrossed, Building2, Send } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const FUEL_LABELS: Record<string, string> = {
  firewood: "Firewood", charcoal: "Charcoal", lpg: "LPG",
  biogas: "Biogas", electric: "Electric (Induction)", other: "Biomass Pellets",
};

const READINESS_COLORS: Record<string, string> = {
  "Ready Now": "bg-emerald-500/20 text-emerald-700",
  "Ready with Minor Actions": "bg-amber-500/20 text-amber-700",
  "Needs Enabling Support": "bg-orange-500/20 text-orange-700",
};

export default function ResearcherInstitutionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [reportOpen, setReportOpen] = useState(false);
  const [reportTitle, setReportTitle] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: inst, isLoading } = useQuery({
    queryKey: ["researcher-institution", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institutions")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const handleSendReport = async () => {
    if (!user || !profile || !reportTitle.trim()) return;
    setSubmitting(true);
    try {
      let fileNote = "";
      if (reportFile) {
        const ext = reportFile.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("researcher-reports")
          .upload(path, reportFile);
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from("researcher-reports").getPublicUrl(path);
          fileNote = `\n\nAttached file: ${urlData.publicUrl}`;
        }
      }

      const { error } = await supabase.from("support_tickets").insert({
        title: `📊 Research Report: ${reportTitle.trim()}`,
        description: (`Institution: ${inst?.name}\n\n${reportDescription}${fileNote}`).trim(),
        priority: "medium" as any,
        raised_by: user.id,
        raised_by_email: user.email,
        raised_by_name: profile.full_name,
        raised_by_role: "researcher",
      });
      if (error) throw error;

      toast.success("Report submitted successfully!");
      setReportOpen(false);
      setReportTitle("");
      setReportDescription("");
      setReportFile(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!inst) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        Institution not found.
        <Button variant="link" onClick={() => navigate("/researcher/dashboard")}>Go back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/researcher/dashboard")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">{inst.name}</h1>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
            <MapPin className="h-4 w-4" />
            {inst.county}{inst.sub_county ? `, ${inst.sub_county}` : ""}
          </div>
        </div>
        <Button onClick={() => setReportOpen(true)} variant="outline" className="flex items-center gap-2 shrink-0">
          <Send className="h-4 w-4" />
          Submit Report
        </Button>
      </div>

      {inst.assessment_category && (
        <Badge variant="secondary" className={`text-sm px-3 py-1 ${READINESS_COLORS[inst.assessment_category] || "bg-muted text-muted-foreground"}`}>
          {inst.assessment_category}
          {inst.assessment_score != null ? `, Score: ${inst.assessment_score}` : ""}
        </Badge>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Institution Info</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Type: <span className="font-medium capitalize">{inst.ownership_type || "—"}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Students: <span className="font-medium">{inst.number_of_students?.toLocaleString() || "—"}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Staff: <span className="font-medium">{inst.number_of_staff?.toLocaleString() || "—"}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Meals/day: <span className="font-medium">{inst.meals_per_day || "—"}</span></span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Energy Profile</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Current Fuel: <span className="font-medium">{inst.current_fuel ? FUEL_LABELS[inst.current_fuel] || inst.current_fuel : "—"}</span></span>
            </div>
            <div className="text-sm">Consumption/term: <span className="font-medium">{inst.consumption_per_term ? `${inst.consumption_per_term} ${inst.consumption_unit || ""}` : "—"}</span></div>
            <div className="text-sm">Monthly fuel spend: <span className="font-medium">{inst.monthly_fuel_spend ? `KSh ${inst.monthly_fuel_spend.toLocaleString()}` : "—"}</span></div>
            <div className="text-sm">Kitchen: <span className="font-medium capitalize">{inst.kitchen_condition?.replace(/_/g, " ") || "—"}</span></div>
          </CardContent>
        </Card>
      </div>

      {inst.transition_needs && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Transition Needs</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm">{inst.transition_needs}</p>
          </CardContent>
        </Card>
      )}

      {/* Send Report Dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Research Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Report Title</Label>
              <Input value={reportTitle} onChange={e => setReportTitle(e.target.value)} placeholder="e.g. Fuel Usage Analysis" className="mt-1" />
            </div>
            <div>
              <Label>Description / Summary</Label>
              <Textarea value={reportDescription} onChange={e => setReportDescription(e.target.value)} placeholder="Summary of findings..." rows={4} className="mt-1" />
            </div>
            <div>
              <Label>Attach File (optional)</Label>
              <Input type="file" accept=".pdf,.doc,.docx,.xlsx,.csv" onChange={e => setReportFile(e.target.files?.[0] || null)} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button onClick={handleSendReport} disabled={submitting || !reportTitle.trim()}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
