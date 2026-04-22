import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Download, Upload, Loader2, CheckCircle2, Clock, FileText } from "lucide-react";
import { toast } from "sonner";

interface MouRecord {
  id: string;
  status: string;
  signed_file_url: string | null;
  sign_requested_at: string | null;
  signed_at: string | null;
}

export default function SupplierMOU() {
  const { user } = useAuth();
  const [providerId, setProviderId] = useState<string | null>(null);
  const [record, setRecord] = useState<MouRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organisation_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.organisation_id) { setLoading(false); return; }

      const { data: prov } = await supabase
        .from("providers")
        .select("id")
        .eq("organisation_id", profile.organisation_id)
        .maybeSingle();

      if (!prov?.id) { setLoading(false); return; }
      setProviderId(prov.id);

      const { data } = await supabase
        .from("mou_ipa_documents")
        .select("*")
        .eq("organisation_id", prov.id)
        .eq("document_type", "mou")
        .maybeSingle();

      setRecord(data ?? null);
      setLoading(false);
    })();
  }, [user]);

  const handleUpload = async () => {
    if (!file || !providerId || !user) return;
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `mou-signed/${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("supplier-assets")
      .upload(path, file);

    if (upErr) {
      toast.error("Upload failed: " + upErr.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("supplier-assets")
      .getPublicUrl(path);

    let error;
    if (record?.id) {
      ({ error } = await supabase
        .from("mou_ipa_documents")
        .update({ status: "signed", signed_file_url: urlData.publicUrl, signed_at: new Date().toISOString() })
        .eq("id", record.id));
    } else {
      const { data: newRec, error: insertErr } = await supabase
        .from("mou_ipa_documents")
        .insert({
          organisation_id: providerId,
          org_type: "supplier",
          document_type: "mou",
          status: "signed",
          signed_file_url: urlData.publicUrl,
          uploaded_by: user.id,
          signed_at: new Date().toISOString(),
        })
        .select()
        .single();
      error = insertErr;
      if (!error && newRec) setRecord(newRec);
    }

    setUploading(false);
    if (error) { toast.error(error.message); return; }

    setRecord(prev => prev
      ? { ...prev, status: "signed", signed_file_url: urlData.publicUrl, signed_at: new Date().toISOString() }
      : null
    );
    setFile(null);
    toast.success("Signed MOU uploaded successfully!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const isSigned = record?.status === "signed";

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-bold">MEMORANDUM OF UNDERSTANDING</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Download the MOU, sign it, and upload the signed copy below.
        </p>
      </div>

      {record?.sign_requested_at && !isSigned && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <Clock className="h-4 w-4 shrink-0" />
          Signature requested on {new Date(record.sign_requested_at).toLocaleDateString()}. Please download, sign, and upload the document.
        </div>
      )}

      {isSigned && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          MOU signed and submitted on {record?.signed_at ? new Date(record.signed_at).toLocaleDateString() : "—"}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            MOU Template Document
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Download the Memorandum of Understanding template, print it, sign it, scan it, and upload the signed version below.
          </p>
          <a href="/templates/mou-supplier-template.docx" download="MEMORANDUM OF UNDERSTANDING supplier.docx">
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Download MOU Template
            </Button>
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            Upload Signed MOU
            {isSigned && <Badge className="bg-green-100 text-green-800 border-green-200">Signed</Badge>}
            {record && !isSigned && <Badge variant="outline" className="text-amber-600 border-amber-300">Pending</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSigned && record?.signed_file_url && (
            <div className="p-3 rounded-lg bg-muted text-sm flex items-center justify-between">
              <span className="text-muted-foreground">Signed document on file</span>
              <a
                href={record.signed_file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline text-xs"
              >
                View document
              </a>
            </div>
          )}

          <div>
            <Label>{isSigned ? "Replace signed document" : "Upload signed document"}</Label>
            <Input
              type="file"
              accept=".pdf,.doc,.docx,image/*"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">Accepted: PDF, Word document, or scanned image</p>
          </div>

          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full gap-2"
          >
            {uploading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
              : <><Upload className="h-4 w-4" /> {isSigned ? "Replace Signed MOU" : "Submit Signed MOU"}</>
            }
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
