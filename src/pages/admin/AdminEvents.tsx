import { useMemo, useState } from "react";
import { Calendar, Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useEvents } from "@/hooks/useKnowledge";
import { useDeleteContent, useUpsertContent } from "@/hooks/useContentMutations";
import { marketplaceSlug } from "@/lib/marketplace";
import type { EventSummary } from "@/lib/knowledge";
import { DownloadReportButton, dateColumn, listColumn } from "@/components/admin/DownloadReportButton";

type FormState = {
  id?: string;
  slug: string;
  title: string;
  description: string;
  event_type: string;
  start_at: string;
  end_at: string;
  location_type: string;
  venue_name: string;
  venue_address: string;
  virtual_url: string;
  capacity: string;
  organiser: string;
  contact_email: string;
  is_published: boolean;
};

const EMPTY: FormState = {
  slug: "", title: "", description: "", event_type: "webinar",
  start_at: "", end_at: "", location_type: "in_person",
  venue_name: "", venue_address: "", virtual_url: "",
  capacity: "", organiser: "", contact_email: "", is_published: true,
};

export default function AdminEvents() {
  const { data, isLoading } = useEvents();
  const upsert = useUpsertContent({ table: "events", invalidateKey: "v_event_summary" });
  const del = useDeleteContent({ table: "events", invalidateKey: "v_event_summary" });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  const sorted = useMemo(
    () => (data ?? []).slice().sort((a, b) => b.start_at.localeCompare(a.start_at)),
    [data],
  );

  const startEdit = (e: EventSummary) => {
    setForm({
      id: e.id,
      slug: e.slug,
      title: e.title,
      description: e.description ?? "",
      event_type: e.event_type,
      start_at: e.start_at.slice(0, 16),
      end_at: e.end_at?.slice(0, 16) ?? "",
      location_type: e.location_type,
      venue_name: e.venue_name ?? "",
      venue_address: e.venue_address ?? "",
      virtual_url: e.virtual_url ?? "",
      capacity: e.capacity?.toString() ?? "",
      organiser: e.organiser ?? "",
      contact_email: e.contact_email ?? "",
      is_published: e.is_published,
    });
    setOpen(true);
  };

  const startCreate = () => { setForm(EMPTY); setOpen(true); };

  const handleSave = async () => {
    if (!form.title || !form.start_at) {
      toast.error("Title and start date are required.");
      return;
    }
    const slug = form.slug || marketplaceSlug(form.title);
    const values: Record<string, unknown> = {
      slug,
      title: form.title,
      description: form.description || null,
      event_type: form.event_type,
      start_at: new Date(form.start_at).toISOString(),
      end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
      location_type: form.location_type,
      venue_name: form.venue_name || null,
      venue_address: form.venue_address || null,
      virtual_url: form.virtual_url || null,
      capacity: form.capacity ? Number(form.capacity) : null,
      organiser: form.organiser || null,
      contact_email: form.contact_email || null,
      is_published: form.is_published,
      status: new Date(form.start_at) < new Date() ? "past" : "upcoming",
    };
    try {
      await upsert.mutateAsync({ id: form.id, values });
      toast.success(form.id ? "Event updated" : "Event created");
      setOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
      toast.error(msg);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this event? Registrations are cascade-deleted.")) return;
    try {
      await del.mutateAsync({ id });
      toast.success("Event deleted");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" /> Events
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Create and manage summits, webinars, workshops, and trainings.
          </p>
        </div>
        <div className="flex gap-2">
          <DownloadReportButton
            rows={sorted}
            columns={[
              { key: "title", label: "Title" },
              { key: "event_type", label: "Type" },
              { key: "status", label: "Status" },
              { key: "location_type", label: "Location Type" },
              { key: "venue_name", label: "Venue" },
              { key: "county_name", label: "County" },
              dateColumn("start_at", "Start"),
              dateColumn("end_at", "End"),
              { key: "capacity", label: "Capacity" },
              { key: "registration_count", label: "Registered" },
              { key: "seats_remaining", label: "Seats Remaining" },
              { key: "organiser", label: "Organiser" },
              { key: "contact_email", label: "Contact Email" },
              { key: "is_published", label: "Published" },
              listColumn("tags", "Tags"),
            ]}
            title="Events"
            filename="events"
          />
          <Button onClick={startCreate}><Plus className="h-4 w-4 mr-1" /> New event</Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : sorted.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No events yet.</CardContent></Card>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-base">All events</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2 px-3">Title</th>
                  <th className="text-left py-2 px-3">Type</th>
                  <th className="text-left py-2 px-3">Start</th>
                  <th className="text-left py-2 px-3">Venue</th>
                  <th className="text-right py-2 px-3">Registrations</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-right py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((e) => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="py-2 px-3">
                      <div className="font-medium">{e.title}</div>
                      {!e.is_published && <Badge variant="outline" className="text-[10px]">Hidden</Badge>}
                    </td>
                    <td className="py-2 px-3 capitalize">{e.event_type}</td>
                    <td className="py-2 px-3">{new Date(e.start_at).toLocaleString()}</td>
                    <td className="py-2 px-3 text-muted-foreground">{e.venue_name ?? "—"}</td>
                    <td className="py-2 px-3 text-right">{e.registration_count}</td>
                    <td className="py-2 px-3 capitalize">{e.status}</td>
                    <td className="py-2 px-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(e)}><Pencil className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(e.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{form.id ? "Edit event" : "New event"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><Label className="text-xs">Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label className="text-xs">Slug (auto if blank)</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated" /></div>
            <div>
              <Label className="text-xs">Type</Label>
              <select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} className="w-full text-sm rounded-md border border-input bg-background px-2 py-1.5">
                {["summit","webinar","workshop","training","launch","field_visit","other"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div><Label className="text-xs">Start at</Label><Input type="datetime-local" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} /></div>
            <div><Label className="text-xs">End at (optional)</Label><Input type="datetime-local" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div>
              <Label className="text-xs">Location type</Label>
              <select value={form.location_type} onChange={(e) => setForm({ ...form, location_type: e.target.value })} className="w-full text-sm rounded-md border border-input bg-background px-2 py-1.5">
                {["in_person","virtual","hybrid"].map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
              </select>
            </div>
            <div><Label className="text-xs">Capacity</Label><Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></div>
            <div><Label className="text-xs">Venue name</Label><Input value={form.venue_name} onChange={(e) => setForm({ ...form, venue_name: e.target.value })} /></div>
            <div><Label className="text-xs">Venue address</Label><Input value={form.venue_address} onChange={(e) => setForm({ ...form, venue_address: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Virtual URL</Label><Input value={form.virtual_url} onChange={(e) => setForm({ ...form, virtual_url: e.target.value })} /></div>
            <div><Label className="text-xs">Organiser</Label><Input value={form.organiser} onChange={(e) => setForm({ ...form, organiser: e.target.value })} /></div>
            <div><Label className="text-xs">Contact email</Label><Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
            <label className="sm:col-span-2 flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} />
              Published (visible to public)
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsert.isPending}>{upsert.isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
