import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, FileCheck, Loader2, Upload, Image, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Doc {
  id: string;
  title: string;
  file_url: string | null;
  document_type: string | null;
  created_at: string;
}

interface EOI {
  id: string;
  proposal_text: string | null;
  proposed_cost: number | null;
  status: string;
  submitted_at: string;
  opportunities?: { title: string; institutions?: { name: string } | null } | null;
}

export default function SupplierDocuments() {
  const { user, profile } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [eois, setEois] = useState<EOI[]>([]);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!profile?.organisation_id) return;
    const load = async () => {
      const { data: prov } = await supabase.from("providers").select("id").eq("organisation_id", profile.organisation_id!).maybeSingle();
      if (prov) {
        setProviderId(prov.id);
        const [{ data: docsData }, { data: eoisData }] = await Promise.all([
          supabase.from("provider_documents").select("*").eq("provider_id", prov.id).order("created_at", { ascending: false }),
          supabase.from("expressions_of_interest").select("*, opportunities(title, institutions(name))").eq("provider_id", prov.id).order("submitted_at", { ascending: false }),
        ]);
        setDocs(docsData ?? []);
        setEois((eoisData as any) ?? []);
      }
      setLoading(false);
    };
    load();
  }, [profile]);

  const handleUpload = async () => {
    if (!providerId || !user || !title.trim() || !file) return;
    setSaving(true);

    const ext = file.name.split(".").pop();
    const path = `documents/${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("supplier-assets").upload(path, file);
    if (upErr) { toast.error("Upload failed"); setSaving(false); return; }
    const { data: urlData } = supabase.storage.from("supplier-assets").getPublicUrl(path);

    const { data, error } = await supabase.from("provider_documents").insert({
      provider_id: providerId,
      title: title.trim(),
      file_url: urlData.publicUrl,
      document_type: "project_photo",
      created_by: user.id,
    }).select().single();

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setDocs(prev => [data, ...prev]);
    setTitle("");
    setFile(null);
    setDialogOpen(false);
    toast.success("Document uploaded!");
  };

  const statusColor = (s: string) => {
    switch (s.toLowerCase()) {
      case "submitted": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "shortlisted": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "awarded": return "bg-green-500/10 text-green-600 border-green-500/20";
      case "rejected": return "bg-red-500/10 text-red-600 border-red-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      {/* Documents Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-display font-bold">Documents & Compliance</h1>
            <p className="text-muted-foreground text-sm mt-1">Upload project photos, documentation, and track your EOIs</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Upload Document</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Project Document</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Completed installation at Nairobi School" className="mt-1" />
                </div>
                <div>
                  <Label>File (Image or PDF)</Label>
                  <Input type="file" accept="image/*,.pdf" onChange={e => setFile(e.target.files?.[0] ?? null)} className="mt-1" />
                </div>
                <Button onClick={handleUpload} className="w-full" disabled={saving || !title.trim() || !file}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {docs.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
            <Image className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-muted-foreground text-sm">No documents uploaded yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {docs.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="p-4">
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-3">
                    {doc.file_url?.match(/\.(jpg|jpeg|png|gif|webp)/i) ? (
                      <img src={doc.file_url} alt={doc.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileCheck className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm truncate">{doc.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{new Date(doc.created_at).toLocaleDateString()}</p>
                  {doc.file_url && (
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary mt-2 hover:underline">
                      <ExternalLink className="h-3 w-3" /> View File
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* EOIs Section */}
      <Card>
        <CardHeader>
          <CardTitle>Expressions of Interest (EOIs)</CardTitle>
        </CardHeader>
        <CardContent>
          {eois.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No EOIs submitted yet</p>
          ) : (
            <div className="space-y-3">
              {eois.map((eoi) => (
                <div key={eoi.id} className="border border-border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{(eoi as any).opportunities?.title ?? "Opportunity"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(eoi as any).opportunities?.institutions?.name ?? "—"} · Submitted {new Date(eoi.submitted_at).toLocaleDateString()}
                    </p>
                    {eoi.proposed_cost && (
                      <p className="text-xs text-muted-foreground mt-0.5">Proposed: KSh {eoi.proposed_cost.toLocaleString()}</p>
                    )}
                  </div>
                  <Badge className={statusColor(eoi.status)}>{eoi.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
