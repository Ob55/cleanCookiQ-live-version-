import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { sendEmail, emailSignAgreement } from "@/lib/emailService";
import { Loader2, ExternalLink, Mail, Filter, ClipboardCheck, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { DownloadReportButton, dateColumn } from "@/components/admin/DownloadReportButton";

interface CsccRow {
  id: string;
  provider_id: string;
  selections: Record<string, Record<string, boolean>>;
  updated_at: string;
  provider?: { company_name: string; contact_email: string | null; contact_phone: string | null };
}

const CSCC_SECTIONS: { id: string; title: string; items: { id: string; label: string }[] }[] = [
  { id: "section_a", title: "A: Business Compliance", items: [
    { id: "business_registration", label: "Business Registration" },
    { id: "tax_compliance", label: "Tax Compliance" },
    { id: "physical_address", label: "Physical Address" },
  ]},
  { id: "section_b", title: "B: Equipment Manufacturers", items: [
    { id: "kebs_certification", label: "KEBS Product Certification" },
    { id: "quality_sticker", label: "Quality Sticker" },
    { id: "lab_test_report", label: "Lab Test Report" },
    { id: "product_specifications", label: "Product Specifications" },
    { id: "warranty_terms", label: "Warranty Terms" },
  ]},
  { id: "section_c", title: "C: Installation & Service", items: [
    { id: "technical_certifications", label: "Technical Certifications" },
    { id: "insurance_coverage", label: "Insurance Coverage" },
    { id: "haccp_knowledge", label: "HACCP Knowledge" },
    { id: "customer_references", label: "Customer References" },
  ]},
  { id: "section_d", title: "D: Biogas Suppliers", items: [
    { id: "pressure_vessel", label: "Pressure Vessel Certification" },
    { id: "biogas_technician", label: "Technician Certification" },
    { id: "biogas_standards", label: "Biogas System Standards" },
  ]},
  { id: "section_e", title: "E: LPG Suppliers", items: [
    { id: "gas_installation_license", label: "Gas Installation License" },
    { id: "safety_compliance", label: "Safety Compliance" },
  ]},
  { id: "section_f", title: "F: Tiered Approval", items: [
    { id: "tier2_in_progress", label: "Tier 2 – In Progress" },
    { id: "tier3_uncertified", label: "Tier 3 – Uncertified" },
  ]},
];

interface AgreementDoc {
  id: string;
  organisation_id: string;
  org_type: string;
  document_type: string;
  organisation_name: string | null;
  status: string;
  signed_file_url: string | null;
  sign_requested_at: string | null;
  signed_at: string | null;
  created_at: string;
}

interface Institution {
  id: string;
  name: string;
  contact_email: string | null;
}

interface Provider {
  id: string;
  company_name: string;
  contact_email: string | null;
}

type FilterMode = "all" | "signed_mou" | "signed_ipa";

export default function AdminMOUIPA() {
  const [docs, setDocs] = useState<AgreementDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [requestOpen, setRequestOpen] = useState(false);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [reqType, setReqType] = useState<"ipa" | "mou">("ipa");
  const [reqOrgId, setReqOrgId] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");

  // CSCC state
  const [csccRows, setCsccRows] = useState<CsccRow[]>([]);
  const [csccLoading, setCsccLoading] = useState(true);
  const [expandedCscc, setExpandedCscc] = useState<string | null>(null);
  const [csccSearch, setCsccSearch] = useState("");

  const loadDocs = async () => {
    const { data } = await supabase
      .from("mou_ipa_documents")
      .select("*")
      .order("created_at", { ascending: false });
    setDocs(data ?? []);
    setLoading(false);
  };

  const loadOrgs = async () => {
    const [{ data: insts }, { data: provs }] = await Promise.all([
      supabase.from("institutions").select("id, name, contact_email").order("name"),
      supabase.from("providers").select("id, company_name, contact_email").order("company_name"),
    ]);
    setInstitutions(insts ?? []);
    setProviders(provs ?? []);
  };

  const loadCscc = async () => {
    setCsccLoading(true);
    try {
      const { data } = await (supabase as any)
        .from("cscc_submissions")
        .select("id, provider_id, selections, updated_at")
        .order("updated_at", { ascending: false });

      if (!data || data.length === 0) { setCsccRows([]); setCsccLoading(false); return; }

      const providerIds = [...new Set(data.map((r: any) => r.provider_id))];
      const { data: provData } = await supabase
        .from("providers")
        .select("id, company_name, contact_email, contact_phone")
        .in("id", providerIds as string[]);

      const provMap = Object.fromEntries((provData ?? []).map((p: any) => [p.id, p]));
      setCsccRows(data.map((r: any) => ({ ...r, provider: provMap[r.provider_id] ?? null })));
    } catch {
      setCsccRows([]);
    } finally {
      setCsccLoading(false);
    }
  };

  useEffect(() => {
    loadDocs();
    loadOrgs();
    loadCscc();
  }, []);

  const filtered = docs.filter(d => {
    const matchSearch = !search || (d.organisation_name ?? "").toLowerCase().includes(search.toLowerCase());
    if (filter === "signed_mou") return d.document_type === "mou" && d.status === "signed" && matchSearch;
    if (filter === "signed_ipa") return d.document_type === "ipa" && d.status === "signed" && matchSearch;
    return matchSearch;
  });

  const handleRequestSignature = async () => {
    if (!reqOrgId) return;
    setSending(true);

    const isIpa = reqType === "ipa";
    const org = isIpa
      ? institutions.find(i => i.id === reqOrgId)
      : providers.find(p => p.id === reqOrgId);

    const orgName = isIpa
      ? (org as Institution | undefined)?.name ?? ""
      : (org as Provider | undefined)?.company_name ?? "";
    const contactEmail = org?.contact_email ?? "";

    // Upsert a pending record
    const { error: upsertErr } = await supabase
      .from("mou_ipa_documents")
      .upsert(
        {
          organisation_id: reqOrgId,
          org_type: isIpa ? "institution" : "supplier",
          document_type: reqType,
          organisation_name: orgName,
          status: "pending",
          sign_requested_at: new Date().toISOString(),
        },
        { onConflict: "organisation_id,document_type", ignoreDuplicates: false }
      );

    if (upsertErr) {
      toast.error("Failed to create request: " + upsertErr.message);
      setSending(false);
      return;
    }

    // Send email if contact email available
    if (contactEmail) {
      await sendEmail({
        to: contactEmail,
        subject: `Please sign your ${reqType.toUpperCase()} — cleancookIQ`,
        html: emailSignAgreement(orgName, reqType),
      });
    }

    toast.success(`Signature request sent${contactEmail ? ` to ${contactEmail}` : ""}`);
    setSending(false);
    setRequestOpen(false);
    setReqOrgId("");
    await loadDocs();
  };

  const filterButtons: { label: string; value: FilterMode }[] = [
    { label: "All", value: "all" },
    { label: "Signed MOU", value: "signed_mou" },
    { label: "Signed IPA", value: "signed_ipa" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold">MOU &amp; IPA</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage Memoranda of Understanding and Institution Partnership Agreements
          </p>
        </div>
        <div className="flex gap-2">
          <DownloadReportButton
            rows={filtered}
            columns={[
              { key: "organisation_name", label: "Organisation" },
              { key: "org_type", label: "Org Type" },
              { key: "document_type", label: "Document" },
              { key: "status", label: "Status" },
              { key: "signed_file_url", label: "Signed File URL" },
              dateColumn("sign_requested_at", "Requested"),
              dateColumn("signed_at", "Signed"),
              dateColumn("created_at", "Created"),
            ]}
            title="MOU & IPA"
            filename="mou-ipa"
            subtitle={`Filter: ${filter}`}
          />
          <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Mail className="h-4 w-4" />
                Request Signature
              </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Signature</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Document Type</Label>
                <Select value={reqType} onValueChange={(v) => { setReqType(v as "ipa" | "mou"); setReqOrgId(""); }}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ipa">IPA — Institution Partnership Agreement</SelectItem>
                    <SelectItem value="mou">MOU — Memorandum of Understanding (Supplier)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{reqType === "ipa" ? "Institution" : "Supplier"}</Label>
                <Select value={reqOrgId} onValueChange={setReqOrgId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={`Select ${reqType === "ipa" ? "institution" : "supplier"}…`} />
                  </SelectTrigger>
                  <SelectContent>
                    {reqType === "ipa"
                      ? institutions.map(i => (
                          <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                        ))
                      : providers.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.company_name}</SelectItem>
                        ))
                    }
                  </SelectContent>
                </Select>
              </div>

              <p className="text-xs text-muted-foreground">
                An email will be sent to the organisation's contact email: "Kindly sign your {reqType.toUpperCase()} for further processing."
              </p>

              <Button
                onClick={handleRequestSignature}
                disabled={!reqOrgId || sending}
                className="w-full gap-2"
              >
                {sending
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                  : <><Mail className="h-4 w-4" /> Send Signature Request</>
                }
              </Button>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Filter className="h-3.5 w-3.5 text-muted-foreground ml-1" />
          {filterButtons.map(b => (
            <button
              key={b.value}
              onClick={() => setFilter(b.value)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                filter === b.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
        <Input
          placeholder="Search organisation…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
          <p className="text-muted-foreground text-sm">No documents found</p>
          <p className="text-xs text-muted-foreground mt-1">Use "Request Signature" to send requests to organisations</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Organisation</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Requested</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Signed</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Document</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc, i) => (
                <tr key={doc.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                  <td className="px-4 py-3 font-medium">{doc.organisation_name ?? doc.organisation_id.slice(0, 8) + "…"}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="uppercase text-xs">
                      {doc.document_type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {doc.status === "signed" ? (
                      <Badge className="bg-green-100 text-green-800 border-green-200">Signed</Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-300">Pending</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {doc.sign_requested_at ? new Date(doc.sign_requested_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {doc.signed_at ? new Date(doc.signed_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {doc.signed_file_url ? (
                      <a
                        href={doc.signed_file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
                      >
                        <ExternalLink className="h-3 w-3" /> View
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── CSCC Section ── */}
      <div className="space-y-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-display font-bold">Supplier Certification Checklists (CSCC)</h2>
              <p className="text-sm text-muted-foreground">Submitted certification checklists from suppliers</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">{csccRows.length} submission{csccRows.length !== 1 ? "s" : ""}</Badge>
        </div>

        <Input
          placeholder="Search supplier…"
          value={csccSearch}
          onChange={e => setCsccSearch(e.target.value)}
          className="max-w-xs"
        />

        {csccLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : csccRows.filter(r => !csccSearch || (r.provider?.company_name ?? "").toLowerCase().includes(csccSearch.toLowerCase())).length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
            <ClipboardCheck className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No CSCC submissions yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {csccRows
              .filter(r => !csccSearch || (r.provider?.company_name ?? "").toLowerCase().includes(csccSearch.toLowerCase()))
              .map(row => {
                const isExpanded = expandedCscc === row.id;
                const totalChecked = Object.values(row.selections ?? {}).reduce((acc, section) =>
                  acc + Object.values(section).filter(Boolean).length, 0);
                const totalItems = CSCC_SECTIONS.reduce((acc, s) => acc + s.items.length, 0);

                return (
                  <div key={row.id} className="border border-border rounded-xl overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                      onClick={() => setExpandedCscc(isExpanded ? null : row.id)}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <ClipboardCheck className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{row.provider?.company_name ?? row.provider_id.slice(0, 8) + "…"}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            {row.provider?.contact_email && <span className="text-xs text-muted-foreground">{row.provider.contact_email}</span>}
                            {row.provider?.contact_phone && <span className="text-xs text-muted-foreground">{row.provider.contact_phone}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge variant="outline" className="text-xs">{totalChecked}/{totalItems} items</Badge>
                        <span className="text-xs text-muted-foreground">{new Date(row.updated_at).toLocaleDateString()}</span>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-border px-4 py-4 bg-muted/10">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {CSCC_SECTIONS.map(section => (
                            <div key={section.id}>
                              <p className="text-xs font-bold text-foreground mb-1">{section.title}</p>
                              <div className="space-y-1">
                                {section.items.map(item => {
                                  const checked = row.selections?.[section.id]?.[item.id] ?? false;
                                  return (
                                    <div key={item.id} className="flex items-center gap-2">
                                      <span className={`h-3 w-3 rounded-sm border flex items-center justify-center shrink-0 ${checked ? "bg-primary border-primary" : "border-muted-foreground/40"}`}>
                                        {checked && <span className="text-[8px] text-white font-bold">✓</span>}
                                      </span>
                                      <span className={`text-xs ${checked ? "text-foreground" : "text-muted-foreground line-through"}`}>{item.label}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
