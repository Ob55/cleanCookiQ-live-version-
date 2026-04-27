import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { PhotoUploader } from "@/components/PhotoUploader";

interface ProjectOption {
  id: string;
  title: string;
}

export default function AdminMonitoringEntry() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: projects } = useQuery({
    queryKey: ["projects-options"],
    queryFn: async (): Promise<ProjectOption[]> => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, title")
        .order("title", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ProjectOption[];
    },
  });

  const [projectId, setProjectId] = useState<string>("");
  const [periodStart, setPeriodStart] = useState<string>("");
  const [periodEnd, setPeriodEnd] = useState<string>("");
  const [cleanFuelUnits, setCleanFuelUnits] = useState<string>("");
  const [cleanFuelUnit, setCleanFuelUnit] = useState<string>("kg");
  const [baselineFuelUnits, setBaselineFuelUnits] = useState<string>("");
  const [baselineFuelUnit, setBaselineFuelUnit] = useState<string>("kg");
  const [meals, setMeals] = useState<string>("");
  const [hours, setHours] = useState<string>("");
  const [downtime, setDowntime] = useState<string>("0");
  const [satisfaction, setSatisfaction] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!projectId) { toast.error("Pick a project."); return; }
    if (!periodStart || !periodEnd) { toast.error("Period start + end are required."); return; }
    if (new Date(periodEnd) < new Date(periodStart)) { toast.error("End must be on or after start."); return; }
    setSubmitting(true);
    try {
      const { error } = await (supabase as unknown as {
        from: (t: string) => {
          insert: (rows: unknown) => Promise<{ data: unknown; error: unknown }>;
        };
      })
        .from("monitoring_readings")
        .insert({
          project_id: projectId,
          period_start: periodStart,
          period_end: periodEnd,
          clean_fuel_units: Number(cleanFuelUnits) || 0,
          clean_fuel_unit: cleanFuelUnit || null,
          baseline_fuel_units: Number(baselineFuelUnits) || 0,
          baseline_fuel_unit: baselineFuelUnit || null,
          meals_served: meals ? Number(meals) : null,
          hours_operated: hours ? Number(hours) : null,
          downtime_hours: Number(downtime) || 0,
          cook_satisfaction_1to5: satisfaction ? Number(satisfaction) : null,
          notes: notes || null,
          evidence_photo_urls: photos,
          recorded_by: user?.id ?? null,
        });
      if (error) throw error;
      toast.success("Reading saved. Relapse trigger checked automatically.");
      navigate("/admin/monitoring");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Button variant="ghost" size="sm" onClick={() => navigate("/admin/monitoring")}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to monitoring
      </Button>
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" /> Record monitoring reading
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Two consecutive readings with clean-fuel share &lt; 50% will automatically open a
          behavioural-relapse risk and a refresher-training ticket.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Reading details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Project</Label>
            <select className="w-full text-sm rounded-md border border-input bg-background px-2 py-1.5"
              value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">— select —</option>
              {(projects ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Period start</Label><Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} /></div>
            <div><Label className="text-xs">Period end</Label><Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2"><Label className="text-xs">Clean fuel used</Label><Input type="number" step="0.01" value={cleanFuelUnits} onChange={(e) => setCleanFuelUnits(e.target.value)} /></div>
            <div>
              <Label className="text-xs">Unit</Label>
              <select className="w-full text-sm rounded-md border border-input bg-background px-2 py-1.5"
                value={cleanFuelUnit} onChange={(e) => setCleanFuelUnit(e.target.value)}>
                {["kg","kWh","m3","L"].map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2"><Label className="text-xs">Baseline fuel still used (firewood/charcoal)</Label><Input type="number" step="0.01" value={baselineFuelUnits} onChange={(e) => setBaselineFuelUnits(e.target.value)} /></div>
            <div>
              <Label className="text-xs">Unit</Label>
              <select className="w-full text-sm rounded-md border border-input bg-background px-2 py-1.5"
                value={baselineFuelUnit} onChange={(e) => setBaselineFuelUnit(e.target.value)}>
                {["kg","tonne","bag"].map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label className="text-xs">Meals served</Label><Input type="number" value={meals} onChange={(e) => setMeals(e.target.value)} /></div>
            <div><Label className="text-xs">Hours operated</Label><Input type="number" step="0.1" value={hours} onChange={(e) => setHours(e.target.value)} /></div>
            <div><Label className="text-xs">Downtime hours</Label><Input type="number" step="0.1" value={downtime} onChange={(e) => setDowntime(e.target.value)} /></div>
          </div>
          <div>
            <Label className="text-xs">Cook satisfaction (1-5)</Label>
            <Input type="number" min={1} max={5} value={satisfaction} onChange={(e) => setSatisfaction(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything qualitative — equipment issues, supply gaps, training needs..." />
          </div>
          <div>
            <Label className="text-xs">Evidence photos</Label>
            <PhotoUploader value={photos} onChange={setPhotos} pathPrefix="monitoring" />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Saving..." : "Save reading"}</Button>
        <Button variant="outline" onClick={() => navigate("/admin/monitoring")}>Cancel</Button>
      </div>
    </div>
  );
}
