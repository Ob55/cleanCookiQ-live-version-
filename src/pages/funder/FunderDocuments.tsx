import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, FileCheck, Loader2, Upload, Image, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Doc {
  id: string;
  title: string;
  file_url: string | null;
  uploaded_by: string;
  created_at: string;
}

export default function FunderDocuments() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("institution_documents")
        .select("*")
        .eq("uploaded_by", user.id)
        .order("created_at", { ascending: false });
      setDocs(data ?? []);
      setLoading(false);
    };
    load();
  }, [user]);

  const handleUpload = async () => {
    if (!user || !title.trim() || !file) return;
    setSaving(true);

    const ext = file.name.split(".").pop();
    const path = `documents/${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("institution-assets").upload(path, file);
    if (upErr) { toast.error("Upload failed"); setSaving(false); return; }
    const { data: urlData } = supabase.storage.from("institution-assets").getPublicUrl(path);

    const { data, error } = await supabase.from("institution_documents").insert({
      title: title.trim(),
      file_url: urlData.publicUrl,
      uploaded_by: user.id,
    } as any).select().single();

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setDocs(prev => [data, ...prev]);
    setTitle("");
    setFile(null);
    setDialogOpen(false);
    toast.success("Document uploaded!");
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Documents</h1>
          <p className="text-muted-foreground text-sm mt-1">Upload and manage your documents</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Upload Document</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Due diligence report" className="mt-1" />
              </div>
              <div>
                <Label>File (Image or PDF)</Label>
                <Input type="file" accept="image/*,.pdf" onChange={e => setFile(e.target.files?.[0] ?? null)} className="mt-1" />
              </div>
              <Button onClick={handleUpload} className="w-full" disabled={saving || !title.trim() || !file}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                <Upload className="h-4 w-4 mr-2" /> Upload
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
                <div className="flex items-center justify-between mt-2">
                  {doc.file_url && (
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <ExternalLink className="h-3 w-3" /> View
                    </a>
                  )}
                  <Button variant="ghost" size="sm" className="text-destructive h-7 px-2" onClick={async () => {
                    const { error } = await supabase.from("institution_documents").delete().eq("id", doc.id);
                    if (error) { toast.error(error.message); return; }
                    setDocs(prev => prev.filter(d => d.id !== doc.id));
                    toast.success("Deleted");
                  }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}