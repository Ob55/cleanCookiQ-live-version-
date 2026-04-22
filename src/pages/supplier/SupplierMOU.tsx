import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Download, Upload, Loader2, CheckCircle2, Clock, FileText,
  Eye, X, ExternalLink, AlertTriangle, Save, ClipboardCheck,
} from "lucide-react";
import { toast } from "sonner";
import mammoth from "mammoth";

interface MouRecord {
  id: string;
  status: string;
  signed_file_url: string | null;
  sign_requested_at: string | null;
  signed_at: string | null;
}

const TEMPLATE_PATH = "/templates/mou-supplier-template.docx";
const TEMPLATE_DOWNLOAD_NAME = "MEMORANDUM OF UNDERSTANDING supplier.docx";

// ─── Checklist data from CLEANCOOKIQ SUPPLIER CERTIFICATION CHECKLIST PDF ────
const CHECKLIST_SECTIONS = [
  {
    id: "section_a",
    title: "Section A: Business Compliance",
    subtitle: "Required for ALL suppliers",
    items: [
      { id: "business_registration", requirement: "Business Registration", document: "Certificate of Incorporation / Business Registration Certificate" },
      { id: "tax_compliance", requirement: "Tax Compliance", document: "Valid KRA Tax Compliance Certificate" },
      { id: "physical_address", requirement: "Physical Address", document: "Utility bill or lease agreement as proof of premises" },
    ],
  },
  {
    id: "section_b",
    title: "Section B: Equipment Manufacturers / Suppliers",
    subtitle: "If applicable to your supplier type",
    items: [
      { id: "kebs_certification", requirement: "KEBS Product Certification", document: "KS 1814:2019 certificate for biomass stoves" },
      { id: "quality_sticker", requirement: "Quality Sticker", document: "KEBS/CCAK quality sticker for certified products" },
      { id: "lab_test_report", requirement: "Lab Test Report", document: "Test results from accredited lab (e.g., Strathmore Energy Research Centre)" },
      { id: "product_specifications", requirement: "Product Specifications", document: "Technical datasheet for each product model" },
      { id: "warranty_terms", requirement: "Warranty Terms", document: "Written warranty policy for customers" },
    ],
  },
  {
    id: "section_c",
    title: "Section C: Installation & Service Providers",
    subtitle: "If applicable to your supplier type",
    items: [
      { id: "technical_certifications", requirement: "Technical Certifications", document: "Certificates for installation staff (relevant to fuel type)" },
      { id: "insurance_coverage", requirement: "Insurance Coverage", document: "Valid liability insurance certificate" },
      { id: "haccp_knowledge", requirement: "HACCP Knowledge", document: "HACCP training certificate or awareness (for food service institutions)" },
      { id: "customer_references", requirement: "Customer References", document: "Minimum 2 references from past institutional installations" },
    ],
  },
  {
    id: "section_d",
    title: "Section D: Biogas Suppliers",
    subtitle: "Additional requirements for biogas suppliers",
    items: [
      { id: "pressure_vessel", requirement: "Pressure Vessel Certification", document: "KEBS certification for biogas pressure vessels" },
      { id: "biogas_technician", requirement: "Installation Technician Certification", document: "Certified biogas technician credentials" },
      { id: "biogas_standards", requirement: "Biogas System Standards", document: "Compliance with relevant KS biogas standards" },
    ],
  },
  {
    id: "section_e",
    title: "Section E: LPG Suppliers",
    subtitle: "Additional requirements for LPG suppliers",
    items: [
      { id: "gas_installation_license", requirement: "Gas Installation License", document: "Valid license from Energy and Petroleum Regulatory Authority (EPRA)" },
      { id: "safety_compliance", requirement: "Safety Compliance", document: "Gas safety certificates" },
    ],
  },
  {
    id: "section_f",
    title: "Section F: Tiered Approval",
    subtitle: "For suppliers without full certification",
    items: [
      { id: "tier2_in_progress", requirement: "Tier 2 – In Progress", document: "Proof of KEBS certification application submitted (valid 6 months)" },
      { id: "tier3_uncertified", requirement: "Tier 3 – Uncertified", document: "Not eligible for listing; referral to certification pathway" },
    ],
  },
];

type Selections = Record<string, Record<string, boolean>>;

const defaultSelections = (): Selections =>
  Object.fromEntries(CHECKLIST_SECTIONS.map(s => [s.id, Object.fromEntries(s.items.map(i => [i.id, false]))]));

export default function SupplierMOU() {
  const { user } = useAuth();
  const [providerId, setProviderId] = useState<string | null>(null);
  const [record, setRecord] = useState<MouRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [docHtml, setDocHtml] = useState<string | null>(null);
  const [docLoading, setDocLoading] = useState(false);

  // CSCC state
  const [selections, setSelections] = useState<Selections>(defaultSelections());
  const [csccSaved, setCsccSaved] = useState(false);
  const [savingCscc, setSavingCscc] = useState(false);

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

      const { data: mouData } = await supabase
        .from("mou_ipa_documents")
        .select("*")
        .eq("organisation_id", prov.id)
        .eq("document_type", "mou")
        .maybeSingle();
      setRecord(mouData ?? null);

      // Load existing CSCC submission
      const { data: csccData } = await (supabase as any)
        .from("cscc_submissions")
        .select("selections")
        .eq("provider_id", prov.id)
        .maybeSingle();

      if (csccData?.selections) {
        setSelections({ ...defaultSelections(), ...csccData.selections });
        setCsccSaved(true);
      }

      setLoading(false);
    })();
  }, [user]);

  const openViewer = async () => {
    setViewerOpen(true);
    if (docHtml) return;
    setDocLoading(true);
    try {
      const res = await fetch(TEMPLATE_PATH);
      const arrayBuffer = await res.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      setDocHtml(result.value);
    } catch {
      setDocHtml("<p style='color:red'>Failed to load document.</p>");
    } finally {
      setDocLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !providerId || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `mou-signed/${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("supplier-assets").upload(path, file);
    if (upErr) { toast.error("Upload failed: " + upErr.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("supplier-assets").getPublicUrl(path);
    const now = new Date().toISOString();
    let error;
    if (record?.id) {
      ({ error } = await supabase.from("mou_ipa_documents").update({ status: "signed", signed_file_url: urlData.publicUrl, signed_at: now }).eq("id", record.id));
    } else {
      const { data: newRec, error: insertErr } = await supabase.from("mou_ipa_documents")
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

  const toggleItem = (sectionId: string, itemId: string) => {
    setSelections(prev => ({
      ...prev,
      [sectionId]: { ...prev[sectionId], [itemId]: !prev[sectionId][itemId] },
    }));
  };

  const handleSaveCscc = async () => {
    if (!providerId || !user) return;
    setSavingCscc(true);
    try {
      const { error } = await (supabase as any).from("cscc_submissions").upsert(
        { provider_id: providerId, selections, submitted_by: user.id, updated_at: new Date().toISOString() },
        { onConflict: "provider_id" }
      );
      if (error) throw error;
      setCsccSaved(true);
      toast.success("CSCC checklist saved successfully!");
    } catch (e: any) {
      toast.error("Could not save: " + (e?.message ?? "Unknown error"));
    } finally {
      setSavingCscc(false);
    }
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
          <div className="flex items-center justify-between px-4 py-3 bg-[#1a3c2e] shrink-0">
            <div className="flex items-center gap-2 text-white">
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">{TEMPLATE_DOWNLOAD_NAME}</span>
            </div>
            <button onClick={() => setViewerOpen(false)} className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm transition-colors">
              <X className="h-4 w-4" /> Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto bg-gray-100 p-4">
            {docLoading
              ? <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              : <div className="max-w-3xl mx-auto bg-white shadow-lg rounded p-8 sm:p-12"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif", lineHeight: 1.7, color: "#1a1a1a" }}
                  dangerouslySetInnerHTML={{ __html: docHtml ?? "" }} />
            }
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">MOU &amp; Certification</h1>
          <p className="text-sm text-muted-foreground mt-1">Complete your Memorandum of Understanding and Supplier Certification Checklist</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">

          {/* ── LEFT: MOU ────────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#1a3c2e]/10 text-[#1a3c2e] border border-[#1a3c2e]/20 uppercase tracking-wide">MOU</span>
              {isSigned
                ? <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Signed</Badge>
                : record?.sign_requested_at
                  ? <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">Action Required</Badge>
                  : null}
            </div>
            <h2 className="text-lg font-display font-bold">Memorandum of Understanding</h2>

            {record?.sign_requested_at && !isSigned && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Signature requested</p>
                  <p className="text-xs text-amber-700 mt-0.5">Requested on {new Date(record.sign_requested_at).toLocaleDateString()}. Download, sign, and upload below.</p>
                </div>
              </div>
            )}
            {isSigned && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-green-50 border border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800">MOU submitted successfully</p>
                  <p className="text-xs text-green-700 mt-0.5">Signed on {record?.signed_at ? new Date(record.signed_at).toLocaleDateString() : "—"}.</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {[{ step: "1", title: "Download", desc: "Get the MOU template" }, { step: "2", title: "Sign", desc: "Print, sign & scan" }, { step: "3", title: "Upload", desc: "Submit your copy" }].map(s => (
                <div key={s.step} className="flex items-start gap-2 p-3 rounded-lg border border-border bg-muted/30">
                  <span className="flex-shrink-0 h-5 w-5 rounded-full bg-[#1a3c2e] text-white text-xs font-bold flex items-center justify-center">{s.step}</span>
                  <div><p className="text-xs font-semibold">{s.title}</p><p className="text-xs text-muted-foreground">{s.desc}</p></div>
                </div>
              ))}
            </div>

            <Card className="border-2 border-[#1a3c2e]/15 shadow-sm">
              <CardHeader className="pb-3 bg-[#1a3c2e]/5 rounded-t-xl border-b border-[#1a3c2e]/10">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-[#1a3c2e]/10 flex items-center justify-center"><FileText className="h-4 w-4 text-[#1a3c2e]" /></div>
                  <div><CardTitle className="text-sm text-[#1a3c2e]">MOU Template</CardTitle><p className="text-xs text-muted-foreground">Memorandum of Understanding — Supplier</p></div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">This MOU outlines the terms of engagement between your company and CleanCookIQ / Ignis Innovation for the supply of clean cooking solutions.</p>
                <div className="flex gap-2 flex-wrap">
                  <a href={TEMPLATE_PATH} download={TEMPLATE_DOWNLOAD_NAME}>
                    <Button variant="outline" size="sm" className="gap-2 border-[#1a3c2e]/30 text-[#1a3c2e] hover:bg-[#1a3c2e]/5"><Download className="h-3.5 w-3.5" />Download</Button>
                  </a>
                  <Button variant="ghost" size="sm" className="gap-2 text-[#1a3c2e] hover:bg-[#1a3c2e]/5" onClick={openViewer}><Eye className="h-3.5 w-3.5" />View Document</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Upload Signed MOU</CardTitle>
                  {isSigned && <Badge className="bg-green-100 text-green-800 border-green-200">Signed</Badge>}
                  {record && !isSigned && <Badge variant="outline" className="text-amber-600 border-amber-300">Pending</Badge>}
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {isSigned && record?.signed_file_url && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                    <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /><span className="text-sm text-green-800 font-medium">Signed document on file</span></div>
                    <a href={record.signed_file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><ExternalLink className="h-3 w-3" />View</a>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium">{isSigned ? "Replace signed document" : "Upload your signed document"}</Label>
                  <Input type="file" accept=".pdf,.doc,.docx,image/*" onChange={e => setFile(e.target.files?.[0] ?? null)} className="mt-1.5" />
                  <p className="text-xs text-muted-foreground mt-1.5">Accepted: PDF, Word (.doc/.docx), or scanned image</p>
                </div>
                <Button onClick={handleUpload} disabled={!file || uploading} className="w-full gap-2 bg-[#1a3c2e] hover:bg-[#1a3c2e]/90">
                  {uploading ? <><Loader2 className="h-4 w-4 animate-spin" />Uploading…</> : <><Upload className="h-4 w-4" />{isSigned ? "Replace Signed MOU" : "Submit Signed MOU"}</>}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* ── RIGHT: CSCC ──────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wide">CSCC</span>
              {csccSaved && <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Saved</Badge>}
            </div>
            <h2 className="text-lg font-display font-bold">Supplier Certification Checklist</h2>

            {/* Red warning note */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-red-600">
                NOTE: Kindly go through this document carefully before filling in the checklist.
              </p>
            </div>

            {/* Info note */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
              <ClipboardCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700">
                Kindly share the relevant supporting documents on the <strong>Documents &amp; Compliance</strong> area before checking the boxes on the CSCC checklist.
              </p>
            </div>

            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3 bg-muted/30 rounded-t-xl border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center"><ClipboardCheck className="h-4 w-4 text-primary" /></div>
                  <div>
                    <CardTitle className="text-sm">CLEANCOOKIQ Supplier Certification Checklist</CardTitle>
                    <p className="text-xs text-muted-foreground">Complete all applicable sections. Allow 5–10 business days for review.</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-5">

                {CHECKLIST_SECTIONS.map(section => (
                  <div key={section.id}>
                    <p className="text-xs font-bold uppercase tracking-wide text-foreground mb-0.5">{section.title}</p>
                    <p className="text-xs text-muted-foreground mb-2">{section.subtitle}</p>
                    <div className="border border-border rounded-lg overflow-hidden">
                      <div className="grid grid-cols-[1fr_40px] bg-muted/50 px-3 py-1.5 border-b border-border">
                        <p className="text-[11px] font-medium text-muted-foreground">Requirement / Document Needed</p>
                        <p className="text-[11px] font-medium text-muted-foreground text-center">✓</p>
                      </div>
                      {section.items.map((item, idx) => (
                        <div key={item.id} className={`grid grid-cols-[1fr_40px] items-center px-3 py-2.5 gap-2 ${idx < section.items.length - 1 ? "border-b border-border/50" : ""} hover:bg-muted/20`}>
                          <div>
                            <p className="text-xs font-medium">{item.requirement}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{item.document}</p>
                          </div>
                          <div className="flex justify-center">
                            <Checkbox
                              checked={selections[section.id]?.[item.id] ?? false}
                              onCheckedChange={() => toggleItem(section.id, item.id)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <Button onClick={handleSaveCscc} disabled={savingCscc} className="w-full gap-2">
                  {savingCscc
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
                    : <><Save className="h-4 w-4" />{csccSaved ? "Update Checklist" : "Save Checklist"}</>}
                </Button>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </>
  );
}
