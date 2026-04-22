import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useInstitutionId } from "@/hooks/useInstitution";
import { Download, Upload, Loader2, CheckCircle2, Clock, FileText } from "lucide-react";
import { toast } from "sonner";

interface IpaRecord {
  id: string;
  status: string;
  signed_file_url: string | null;
  sign_requested_at: string | null;
  signed_at: string | null;
}

export default function InstitutionIPA() {
  const { user } = useAuth();
  const { institutionId, loading: instLoading } = useInstitutionId();
  const [record, setRecord] = useState<IpaRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!institutionId) return;
    (async () => {
      const { data } = await supabase
        .from("mou_ipa_documents")
        .select("*")
        .eq("organisation_id", institutionId)
        .eq("document_type", "ipa")
        .maybeSingle();
      setRecord(data ?? null);
      setLoading(false);
    })();
  }, [institutionId]);

  const handleUpload = async () => {
    if (!file || !institutionId || !user) return;
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `ipa-signed/${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("institution-assets")
      .upload(path, file);

    if (upErr) {
      toast.error("Upload failed: " + upErr.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("institution-assets")
      .getPublicUrl(path);

    const payload = {
      organisation_id: institutionId,
      org_type: "institution",
      document_type: "ipa",
      status: "signed",
      signed_file_url: urlData.publicUrl,
      uploaded_by: user.id,
      signed_at: new Date().toISOString(),
    };

    let error;
    if (record?.id) {
      ({ error } = await supabase
        .from("mou_ipa_documents")
        .update({ status: "signed", signed_file_url: urlData.publicUrl, signed_at: new Date().toISOString() })
        .eq("id", record.id));
    } else {
      const { data: newRec, error: insertErr } = await supabase
        .from("mou_ipa_documents")
        .insert(payload)
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
    toast.success("Signed IPA uploaded successfully!");
  };

  if (instLoading || loading) {
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
        <h1 className="text-2xl font-display font-bold">INSTITUTION PARTNERSHIP AGREEMENT</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Download the agreement, sign it, and upload the signed copy below.
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
          IPA signed and submitted on {record?.signed_at ? new Date(record.signed_at).toLocaleDateString() : "—"}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            IPA Template Document
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Download the Institution Partnership Agreement template, print it, sign it, scan it, and upload the signed version below.
          </p>
          <a href="/templates/ipa-template.docx" download="INSTITUTION PARTNERSHIP AGREEMENT 2026.docx">
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Download IPA Template
            </Button>
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            Upload Signed IPA
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
              : <><Upload className="h-4 w-4" /> {isSigned ? "Replace Signed IPA" : "Submit Signed IPA"}</>
            }
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
