import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Download, Upload, Loader2, CheckCircle2, Clock, FileText, Eye, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface MouRecord {
  id: string;
  status: string;
  signed_file_url: string | null;
  sign_requested_at: string | null;
  signed_at: string | null;
}

const TEMPLATE_PATH = "/templates/mou-supplier-template.docx";
const TEMPLATE_DOWNLOAD_NAME = "MEMORANDUM OF UNDERSTANDING supplier.docx";

export default function SupplierMOU() {
  const { user } = useAuth();
  const [providerId, setProviderId] = useState<string | null>(null);
  const [record, setRecord] = useState<MouRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const templateUrl = `${window.location.origin}${TEMPLATE_PATH}`;
  const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(templateUrl)}`;

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

    if (upErr) { toast.error("Upload failed: " + upErr.message); setUploading(false); return; }

    const { data: urlData } = supabase.storage.from("supplier-assets").getPublicUrl(path);
    const now = new Date().toISOString();

    let error;
    if (record?.id) {
      ({ error } = await supabase
        .from("mou_ipa_documents")
        .update({ status: "signed", signed_file_url: urlData.publicUrl, signed_at: now })
        .eq("id", record.id));
    } else {
      const { data: newRec, error: insertErr } = await supabase
        .from("mou_ipa_documents")
        .insert({ organisation_id: providerId, org_type: "supplier", document_type: "mou", status: "signed", signed_file_url: urlData.publicUrl, uploaded_by: user.id, signed_at: now })
        .select().single();
      error = insertErr;
      if (!error && newRec) setRecord(newRec);
    }

    setUploading(false);
    if (error) { toast.error(error.message); return; }
    setRecord(prev => prev ? { ...prev, status: "signed", signed_file_url: urlData.publicUrl, signed_at: now } : null);
    setFile(null);
    toast.success("Signed MOU uploaded successfully!");
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const isSigned = record?.status === "signed";

  return (
    <>
      {/* Document Viewer Overlay */}
      {viewerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 py-3 bg-[#1a3c2e]">
            <div className="flex items-center gap-2 text-white">
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">{TEMPLATE_DOWNLOAD_NAME}</span>
            </div>
            <button
              onClick={() => setViewerOpen(false)}
              className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm transition-colors"
            >
              <X className="h-4 w-4" /> Close
            </button>
          </div>
          <iframe
            src={officeViewerUrl}
            className="flex-1 w-full border-0"
            title="MOU Document Viewer"
          />
        </div>
      )}

      <div className="space-y-6 max-w-2xl">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#1a3c2e]/10 text-[#1a3c2e] border border-[#1a3c2e]/20 uppercase tracking-wide">
                MOU
              </span>
              {isSigned
                ? <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Signed</Badge>
                : record?.sign_requested_at
                  ? <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">Action Required</Badge>
                  : null
              }
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground leading-tight">
              Memorandum of Understanding
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Review the MOU, sign it, and upload your signed copy to proceed.
            </p>
          </div>
        </div>

        {/* Status Banner */}
        {record?.sign_requested_at && !isSigned && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Signature requested</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Requested on {new Date(record.sign_requested_at).toLocaleDateString()}. Download the document below, sign it, and upload your signed copy.
              </p>
            </div>
          </div>
        )}

        {isSigned && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-green-50 border border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800">MOU submitted successfully</p>
              <p className="text-xs text-green-700 mt-0.5">
                Signed document received on {record?.signed_at ? new Date(record.signed_at).toLocaleDateString() : "—"}.
              </p>
            </div>
          </div>
        )}

        {/* Process Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { step: "1", title: "Download", desc: "Get the MOU template document" },
            { step: "2", title: "Sign", desc: "Print, sign, and scan the document" },
            { step: "3", title: "Upload", desc: "Submit your signed copy below" },
          ].map(s => (
            <div key={s.step} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30">
              <span className="flex-shrink-0 h-6 w-6 rounded-full bg-[#1a3c2e] text-white text-xs font-bold flex items-center justify-center">
                {s.step}
              </span>
              <div>
                <p className="text-sm font-semibold">{s.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Document Card */}
        <Card className="border-2 border-[#1a3c2e]/15 shadow-sm">
          <CardHeader className="pb-3 bg-[#1a3c2e]/5 rounded-t-xl border-b border-[#1a3c2e]/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-[#1a3c2e]/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-[#1a3c2e]" />
              </div>
              <div>
                <CardTitle className="text-base text-[#1a3c2e]">MOU Template</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Memorandum of Understanding — Supplier</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              This Memorandum of Understanding outlines the terms of engagement between your company and CleanCook IQ / Ignis Innovation for the supply of clean cooking solutions to institutions.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <a href={TEMPLATE_PATH} download={TEMPLATE_DOWNLOAD_NAME}>
                <Button variant="outline" size="sm" className="gap-2 border-[#1a3c2e]/30 text-[#1a3c2e] hover:bg-[#1a3c2e]/5">
                  <Download className="h-3.5 w-3.5" />
                  Download
                </Button>
              </a>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-[#1a3c2e] hover:bg-[#1a3c2e]/5"
                onClick={() => setViewerOpen(true)}
              >
                <Eye className="h-3.5 w-3.5" />
                View Document
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Upload Card */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Upload Signed MOU</CardTitle>
              {isSigned && <Badge className="bg-green-100 text-green-800 border-green-200">Signed</Badge>}
              {record && !isSigned && <Badge variant="outline" className="text-amber-600 border-amber-300">Pending</Badge>}
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {isSigned && record?.signed_file_url && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-800 font-medium">Signed document on file</span>
                </div>
                <a
                  href={record.signed_file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> View
                </a>
              </div>
            )}
            <div>
              <Label className="text-sm font-medium">{isSigned ? "Replace signed document" : "Upload your signed document"}</Label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,image/*"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1.5">Accepted formats: PDF, Word (.doc/.docx), or scanned image</p>
            </div>
            <Button onClick={handleUpload} disabled={!file || uploading} className="w-full gap-2 bg-[#1a3c2e] hover:bg-[#1a3c2e]/90">
              {uploading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
                : <><Upload className="h-4 w-4" /> {isSigned ? "Replace Signed MOU" : "Submit Signed MOU"}</>
              }
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
