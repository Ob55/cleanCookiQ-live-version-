import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Loader2, Lock, FlaskConical, MapPin, Flame, Users,
  UtensilsCrossed, Send, Search,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const FUEL_LABELS: Record<string, string> = {
  firewood: "Firewood",
  charcoal: "Charcoal",
  lpg: "LPG",
  biogas: "Biogas",
  electric: "Electric (Induction)",
  other: "Biomass Pellets",
};

const FUEL_COLORS: Record<string, string> = {
  firewood: "bg-orange-100 text-orange-700",
  charcoal: "bg-stone-100 text-stone-700",
  lpg: "bg-blue-100 text-blue-700",
  biogas: "bg-emerald-100 text-emerald-700",
  electric: "bg-violet-100 text-violet-700",
  other: "bg-amber-100 text-amber-700",
};

export default function ResearcherDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const hasPrimeAccess = profile?.approval_status === "approved";

  const [searchTerm, setSearchTerm] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportTitle, setReportTitle] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: institutions, isLoading } = useQuery({
    queryKey: ["researcher-institutions"],
    enabled: hasPrimeAccess,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institutions")
        .select("id, name, county, current_fuel, number_of_students, meals_per_day, assessment_score, assessment_category, ownership_type")
        .order("name");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const filtered = (institutions ?? []).filter((inst: any) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return inst.name?.toLowerCase().includes(q) || inst.county?.toLowerCase().includes(q);
  });

  const handleRequestAccess = async () => {
    if (!user || !profile) return;
    setRequesting(true);
    try {
      const orgName = user.user_metadata?.org_name || "Unknown Organization";

      await supabase.from("support_tickets").insert({
        title: "🔬 Prime Access Request",
        description: `Researcher ${profile.full_name || "Unknown"} from ${orgName} is requesting prime access to institution data.`,
        priority: "high" as any,
        raised_by: user.id,
        raised_by_email: user.email,
        raised_by_name: profile.full_name,
        raised_by_role: "researcher",
      });

      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "manager"]);

      if (adminRoles?.length) {
        await supabase.from("notifications").insert(
          adminRoles.map((a: any) => ({
            user_id: a.user_id,
            title: "Researcher Access Request",
            body: `${profile.full_name || "A researcher"} from ${orgName} is requesting prime access to institution data.`,
          }))
        );
      }

      setRequestSent(true);
      toast.success("Access request sent. The admin will review it shortly.");
    } catch {
      toast.error("Failed to send request. Please try again.");
    } finally {
      setRequesting(false);
    }
  };

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
        description: (reportDescription + fileNote).trim() || "(No description provided)",
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Research Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {hasPrimeAccess
              ? "Browse institutions across Kenya ready for clean cooking transition."
              : "Request prime access to unlock institution data."}
          </p>
        </div>
        <Button onClick={() => setReportOpen(true)} variant="outline" className="flex items-center gap-2 shrink-0">
          <Send className="h-4 w-4" />
          Send Report
        </Button>
      </div>

      {/* Researcher identity card */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <FlaskConical className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{profile?.full_name || "Researcher"}</p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.user_metadata?.org_name || "Research Organization"}
            </p>
          </div>
          <div className="ml-auto shrink-0">
            <Badge variant={hasPrimeAccess ? "default" : "secondary"} className={hasPrimeAccess ? "bg-emerald-500 text-white" : ""}>
              {hasPrimeAccess ? "Prime Access" : "Pending Access"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Locked state */}
      {!hasPrimeAccess && (
        <Card>
          <CardContent className="py-14 text-center space-y-4">
            <Lock className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <h3 className="font-semibold text-lg">Prime Access Required</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Request prime access to view institution data, research insights, and clean cooking transition readiness across Kenya.
              </p>
            </div>
            <Button onClick={handleRequestAccess} disabled={requestSent || requesting}>
              {requesting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {requestSent ? "Request Sent — Awaiting Approval" : "Request Prime Access"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Institution data (prime access) */}
      {hasPrimeAccess && (
        <>
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or county…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !filtered.length ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground text-sm">
                No institutions found.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filtered.map((inst: any) => (
                <Card
                  key={inst.id}
                  className="h-full cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => navigate(`/researcher/institution/${inst.id}`)}
                >
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold text-sm leading-snug line-clamp-2">{inst.name}</h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{inst.county || "—"}</span>
                      </div>
                    </div>

                    <div className="h-px bg-border" />

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                          <Flame className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Cooking Method</p>
                          <Badge variant="secondary" className={`text-xs mt-0.5 ${inst.current_fuel ? (FUEL_COLORS[inst.current_fuel] || "") : ""}`}>
                            {inst.current_fuel ? FUEL_LABELS[inst.current_fuel] || inst.current_fuel : "—"}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                          <Users className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total Students</p>
                          <p className="text-sm font-semibold">
                            {inst.number_of_students ? inst.number_of_students.toLocaleString() : "—"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                          <UtensilsCrossed className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Meals / Day</p>
                          <p className="text-sm font-semibold">
                            {inst.meals_per_day ? `${inst.meals_per_day} meal${inst.meals_per_day > 1 ? "s" : ""}` : "—"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {inst.assessment_category && (
                      <div className="pt-1">
                        <Badge variant="secondary" className={`text-xs w-full justify-center py-0.5 ${
                          inst.assessment_category === "Ready Now" ? "bg-emerald-500/20 text-emerald-700"
                          : inst.assessment_category === "Ready with Minor Actions" ? "bg-amber-500/20 text-amber-700"
                          : "bg-orange-500/20 text-orange-700"
                        }`}>
                          {inst.assessment_category}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
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
              <Input
                value={reportTitle}
                onChange={e => setReportTitle(e.target.value)}
                placeholder="e.g. Clean Cooking Impact Assessment 2026"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description / Summary</Label>
              <Textarea
                value={reportDescription}
                onChange={e => setReportDescription(e.target.value)}
                placeholder="Brief summary of your report findings..."
                rows={4}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Attach Report File (optional)</Label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.xlsx,.csv"
                onChange={e => setReportFile(e.target.files?.[0] || null)}
                className="mt-1"
              />
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
