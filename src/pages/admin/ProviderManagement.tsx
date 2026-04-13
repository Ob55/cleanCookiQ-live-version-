import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Factory, Check, X, Loader2, Plus, Search, Star, FileText, Eye, Package, Wrench, Mail, Phone, Globe, MapPin, ShieldCheck } from "lucide-react";
import { useState, useEffect } from "react";

const categoryLabels: Record<string, string> = {
  equipment_provider: "Equipment Provider",
  installation_technician: "Installation Technician",
  logistics_provider: "Logistics Provider",
  service_product_provider: "Service/Product Provider",
};

const NDA_TEXT = `NON-DISCLOSURE AGREEMENT (NDA)\n\nThis Non-Disclosure Agreement ("Agreement") is entered into by and between the Provider ("Receiving Party") and CleanCookIQ / Ignis ("Disclosing Party").\n\n1. CONFIDENTIAL INFORMATION: All proprietary data, institution records, pipeline intelligence, scoring models, cost tables, and platform methodologies shared through CleanCookIQ.\n\n2. OBLIGATIONS: The Receiving Party agrees to:\n   a) Hold all Confidential Information in strict confidence\n   b) Not disclose to any third party without prior written consent\n   c) Use information solely for the purposes of the CleanCookIQ platform engagement\n   d) Return or destroy all materials upon termination\n\n3. DURATION: This NDA remains in effect for 3 years from the date of signing.\n\n4. REMEDIES: Any breach may result in immediate removal from the platform and legal action.`;

const MOU_TEXT = `MEMORANDUM OF UNDERSTANDING (MoU)\n\nThis Memorandum of Understanding establishes the terms of participation on the CleanCookIQ platform.\n\n1. SCOPE: The Provider agrees to participate in the CleanCookIQ marketplace as a verified service provider.\n\n2. OBLIGATIONS:\n   a) Maintain accurate and up-to-date profile information\n   b) Respond to opportunity notifications within agreed timelines\n   c) Deliver services to the standards specified in awarded contracts\n   d) Participate in platform quality reviews and ratings\n\n3. PLATFORM COMMITMENTS:\n   a) CleanCookIQ will provide fair and transparent matching\n   b) Pipeline data shared will be verified and accurate\n   c) Payment terms will be clearly defined per engagement\n\n4. TERMINATION: Either party may terminate with 30 days written notice.\n\n5. DISPUTE RESOLUTION: Disputes will be resolved through mediation before escalation.`;

interface ProviderDetail {
  products: any[];
  services: any[];
  documents: any[];
}

export default function ProviderManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterVerified, setFilterVerified] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [ndaChecked, setNdaChecked] = useState(false);
  const [mouChecked, setMouChecked] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any | null>(null);
  const [providerDetail, setProviderDetail] = useState<ProviderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showLegalDialog, setShowLegalDialog] = useState(false);
  const [legalProvider, setLegalProvider] = useState<any | null>(null);
  const [legalNda, setLegalNda] = useState(false);
  const [legalMou, setLegalMou] = useState(false);
  const [newProvider, setNewProvider] = useState({
    name: "", contact_person: "", contact_email: "", contact_phone: "",
    website: "", services: [] as string[], technology_types: [] as string[],
    counties_served: [] as string[], provider_category: "" as string,
  });

  const { data: providers, isLoading } = useQuery({
    queryKey: ["admin-providers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("providers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Load provider details when selected
  useEffect(() => {
    if (!selectedProvider) { setProviderDetail(null); return; }
    const load = async () => {
      setDetailLoading(true);
      const [{ data: products }, { data: services }, { data: documents }] = await Promise.all([
        supabase.from("provider_products").select("*").eq("provider_id", selectedProvider.id).order("created_at", { ascending: false }),
        supabase.from("provider_services").select("*").eq("provider_id", selectedProvider.id).order("created_at", { ascending: false }),
        supabase.from("provider_documents").select("*").eq("provider_id", selectedProvider.id).order("created_at", { ascending: false }),
      ]);
      setProviderDetail({ products: products ?? [], services: services ?? [], documents: documents ?? [] });
      setDetailLoading(false);
    };
    load();
  }, [selectedProvider]);

  const updateVerified = useMutation({
    mutationFn: async ({ id, verified }: { id: string; verified: boolean }) => {
      const { error } = await supabase.from("providers").update({ verified }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Provider status updated");
      queryClient.invalidateQueries({ queryKey: ["admin-providers"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const signLegal = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase.from("providers").update({
        nda_signed_at: new Date().toISOString(),
        mou_signed_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Legal agreements signed successfully");
      setShowLegalDialog(false);
      setLegalProvider(null);
      setLegalNda(false);
      setLegalMou(false);
      queryClient.invalidateQueries({ queryKey: ["admin-providers"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createProvider = useMutation({
    mutationFn: async () => {
      if (!ndaChecked || !mouChecked) throw new Error("Both NDA and MoU must be signed");
      const { error } = await supabase.from("providers").insert({
        name: newProvider.name,
        contact_person: newProvider.contact_person,
        contact_email: newProvider.contact_email,
        contact_phone: newProvider.contact_phone,
        website: newProvider.website,
        services: newProvider.services.length ? newProvider.services : null,
        technology_types: newProvider.technology_types.length ? newProvider.technology_types : null,
        counties_served: newProvider.counties_served.length ? newProvider.counties_served : null,
        provider_category: newProvider.provider_category || null,
        nda_signed_at: new Date().toISOString(),
        mou_signed_at: new Date().toISOString(),
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Provider created with legal agreements signed");
      setShowAdd(false);
      setNdaChecked(false);
      setMouChecked(false);
      setNewProvider({ name: "", contact_person: "", contact_email: "", contact_phone: "", website: "", services: [], technology_types: [], counties_served: [], provider_category: "" });
      queryClient.invalidateQueries({ queryKey: ["admin-providers"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = providers?.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.contact_person?.toLowerCase().includes(search.toLowerCase());
    const matchVerified = filterVerified === "all" || (filterVerified === "verified" ? p.verified : !p.verified);
    const matchCategory = filterCategory === "all" || (p as any).provider_category === filterCategory;
    return matchSearch && matchVerified && matchCategory;
  });

  const serviceOptions = ["equipment_supply", "installation", "maintenance", "fuel_supply", "financing", "training"];
  const techOptions = ["biogas", "electric", "lpg", "briquettes", "solar_thermal"];

  const hasLegalAgreements = (p: any) => p.nda_signed_at && p.mou_signed_at;

  const openLegalSigning = (p: any) => {
    setLegalProvider(p);
    setLegalNda(false);
    setLegalMou(false);
    setShowLegalDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Provider Management</h1>
          <p className="text-sm text-muted-foreground">Manage providers, vetting queue, NDA/MoU compliance</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Provider</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add New Provider</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Company Name *</Label><Input value={newProvider.name} onChange={e => setNewProvider(p => ({ ...p, name: e.target.value }))} className="mt-1" /></div>
              
              <div>
                <Label>Provider Category *</Label>
                <Select value={newProvider.provider_category} onValueChange={v => setNewProvider(p => ({ ...p, provider_category: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><Label>Contact Person</Label><Input value={newProvider.contact_person} onChange={e => setNewProvider(p => ({ ...p, contact_person: e.target.value }))} className="mt-1" /></div>
                <div><Label>Phone</Label><Input value={newProvider.contact_phone} onChange={e => setNewProvider(p => ({ ...p, contact_phone: e.target.value }))} className="mt-1" /></div>
              </div>
              <div><Label>Email</Label><Input value={newProvider.contact_email} onChange={e => setNewProvider(p => ({ ...p, contact_email: e.target.value }))} className="mt-1" /></div>
              <div><Label>Website</Label><Input value={newProvider.website} onChange={e => setNewProvider(p => ({ ...p, website: e.target.value }))} className="mt-1" /></div>
              <div>
                <Label>Service Categories</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {serviceOptions.map(s => (
                    <Badge key={s} variant={newProvider.services.includes(s) ? "default" : "outline"} className="cursor-pointer"
                      onClick={() => setNewProvider(p => ({ ...p, services: p.services.includes(s) ? p.services.filter(x => x !== s) : [...p.services, s] }))}>
                      {s.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label>Technology Types</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {techOptions.map(t => (
                    <Badge key={t} variant={newProvider.technology_types.includes(t) ? "default" : "outline"} className="cursor-pointer"
                      onClick={() => setNewProvider(p => ({ ...p, technology_types: p.technology_types.includes(t) ? p.technology_types.filter(x => x !== t) : [...p.technology_types, t] }))}>
                      {t.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-2"><FileText className="h-4 w-4" /> Legal Agreements</h3>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Non-Disclosure Agreement (NDA)</Label>
                  <ScrollArea className="h-32 border border-border rounded-lg p-3 bg-muted/30">
                    <pre className="text-xs whitespace-pre-wrap font-body">{NDA_TEXT}</pre>
                  </ScrollArea>
                  <div className="flex items-center gap-2">
                    <Checkbox id="nda" checked={ndaChecked} onCheckedChange={(v) => setNdaChecked(!!v)} />
                    <label htmlFor="nda" className="text-sm">I agree to the Non-Disclosure Agreement (NDA)</label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Memorandum of Understanding (MoU)</Label>
                  <ScrollArea className="h-32 border border-border rounded-lg p-3 bg-muted/30">
                    <pre className="text-xs whitespace-pre-wrap font-body">{MOU_TEXT}</pre>
                  </ScrollArea>
                  <div className="flex items-center gap-2">
                    <Checkbox id="mou" checked={mouChecked} onCheckedChange={(v) => setMouChecked(!!v)} />
                    <label htmlFor="mou" className="text-sm">I agree to the Memorandum of Understanding (MoU)</label>
                  </div>
                </div>
              </div>

              <Button onClick={() => createProvider.mutate()} disabled={!newProvider.name || !newProvider.provider_category || !ndaChecked || !mouChecked || createProvider.isPending} className="w-full">
                {createProvider.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Create Provider
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search providers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterVerified} onValueChange={setFilterVerified}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(categoryLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Provider</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Category</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Technologies</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Rating</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Legal</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered?.map(p => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedProvider(p)}>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Factory className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.contact_person || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge variant="secondary" className="text-xs">
                      {categoryLabels[(p as any).provider_category] || "—"}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {p.technology_types?.slice(0, 2).map((t: string) => (
                        <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      <span className="text-sm">{p.rating || 0}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    {hasLegalAgreements(p) ? (
                      <Badge className="bg-green-100 text-green-700 text-xs">NDA + MoU ✓</Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 text-xs cursor-pointer hover:bg-amber-200" onClick={(e) => { e.stopPropagation(); openLegalSigning(p); }}>
                        Pending legal
                      </Badge>
                    )}
                  </td>
                  <td className="p-3">
                    <Badge variant={p.verified ? "default" : "secondary"} className={p.verified ? "bg-primary/20 text-primary" : "bg-amber-500/20 text-amber-600"}>
                      {p.verified ? "Verified" : "Pending"}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" title="View details" onClick={() => setSelectedProvider(p)}>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      {!hasLegalAgreements(p) && (
                        <Button size="sm" variant="ghost" title="Sign legal agreements" onClick={() => openLegalSigning(p)}>
                          <FileText className="h-4 w-4 text-amber-600" />
                        </Button>
                      )}
                      {!p.verified && hasLegalAgreements(p) && (
                        <Button size="sm" variant="ghost" title="Verify provider" onClick={() => updateVerified.mutate({ id: p.id, verified: true })}>
                          <Check className="h-4 w-4 text-primary" />
                        </Button>
                      )}
                      {p.verified && (
                        <Button size="sm" variant="ghost" title="Revoke verification" onClick={() => updateVerified.mutate({ id: p.id, verified: false })}>
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered?.length && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No providers found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Legal Signing Dialog */}
      <Dialog open={showLegalDialog} onOpenChange={setShowLegalDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Sign Legal Agreements — {legalProvider?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Review and sign the NDA and MoU on behalf of this provider to enable verification.
            </p>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Non-Disclosure Agreement (NDA)</Label>
              <ScrollArea className="h-36 border border-border rounded-lg p-3 bg-muted/30">
                <pre className="text-xs whitespace-pre-wrap font-body">{NDA_TEXT}</pre>
              </ScrollArea>
              <div className="flex items-center gap-2">
                <Checkbox id="legal-nda" checked={legalNda} onCheckedChange={(v) => setLegalNda(!!v)} />
                <label htmlFor="legal-nda" className="text-sm">I confirm the NDA has been agreed to</label>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Memorandum of Understanding (MoU)</Label>
              <ScrollArea className="h-36 border border-border rounded-lg p-3 bg-muted/30">
                <pre className="text-xs whitespace-pre-wrap font-body">{MOU_TEXT}</pre>
              </ScrollArea>
              <div className="flex items-center gap-2">
                <Checkbox id="legal-mou" checked={legalMou} onCheckedChange={(v) => setLegalMou(!!v)} />
                <label htmlFor="legal-mou" className="text-sm">I confirm the MoU has been agreed to</label>
              </div>
            </div>

            <Button
              onClick={() => legalProvider && signLegal.mutate({ id: legalProvider.id })}
              disabled={!legalNda || !legalMou || signLegal.isPending}
              className="w-full"
            >
              {signLegal.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Sign & Complete Legal Agreements
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Provider Detail Sheet */}
      <Sheet open={!!selectedProvider} onOpenChange={(open) => { if (!open) setSelectedProvider(null); }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedProvider && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Factory className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <span>{selectedProvider.name}</span>
                    <div className="flex gap-2 mt-1">
                      <Badge variant={selectedProvider.verified ? "default" : "secondary"} className={`text-xs ${selectedProvider.verified ? "bg-primary/20 text-primary" : "bg-amber-500/20 text-amber-600"}`}>
                        {selectedProvider.verified ? "Verified" : "Pending"}
                      </Badge>
                      {hasLegalAgreements(selectedProvider) ? (
                        <Badge className="bg-green-100 text-green-700 text-xs">NDA + MoU ✓</Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 text-xs">Pending legal</Badge>
                      )}
                    </div>
                  </div>
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Contact Info */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Factory className="h-4 w-4 shrink-0" />
                      <span className="font-medium text-foreground">{selectedProvider.contact_person || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4 shrink-0" />
                      <span>{selectedProvider.contact_email || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4 shrink-0" />
                      <span>{selectedProvider.contact_phone || "—"}</span>
                    </div>
                    {selectedProvider.website && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Globe className="h-4 w-4 shrink-0" />
                        <a href={selectedProvider.website} target="_blank" rel="noreferrer" className="text-primary underline">{selectedProvider.website}</a>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Category & Tech */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Category & Technologies</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Category</p>
                      <Badge variant="secondary">{categoryLabels[(selectedProvider as any).provider_category] || "Not set"}</Badge>
                    </div>
                    {selectedProvider.technology_types?.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Technologies</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedProvider.technology_types.map((t: string) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                        </div>
                      </div>
                    )}
                    {selectedProvider.services?.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Services</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedProvider.services.map((s: string) => <Badge key={s} variant="outline" className="text-xs">{s.replace(/_/g, " ")}</Badge>)}
                        </div>
                      </div>
                    )}
                    {selectedProvider.counties_served?.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Counties Served</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedProvider.counties_served.map((c: string) => (
                            <Badge key={c} variant="outline" className="text-xs"><MapPin className="h-3 w-3 mr-1" />{c}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Products, Services, Documents */}
                {detailLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : providerDetail && (
                  <>
                    {/* Products */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <Package className="h-4 w-4" /> Products ({providerDetail.products.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {providerDetail.products.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No products listed</p>
                        ) : (
                          <div className="space-y-2">
                            {providerDetail.products.map(prod => (
                              <div key={prod.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                                {prod.image_url ? (
                                  <img src={prod.image_url} alt={prod.name} className="h-10 w-10 rounded object-cover" />
                                ) : (
                                  <div className="h-10 w-10 rounded bg-muted flex items-center justify-center"><Package className="h-4 w-4 text-muted-foreground" /></div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{prod.name}</p>
                                  {prod.price != null && <p className="text-xs text-primary font-semibold">KSh {prod.price.toLocaleString()}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Services */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <Wrench className="h-4 w-4" /> Services ({providerDetail.services.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {providerDetail.services.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No services listed</p>
                        ) : (
                          <div className="space-y-2">
                            {providerDetail.services.map(svc => (
                              <div key={svc.id} className="p-2 rounded-lg bg-muted/30">
                                <p className="text-sm font-medium">{svc.name}</p>
                                {svc.details && <p className="text-xs text-muted-foreground mt-0.5">{svc.details}</p>}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Documents */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <FileText className="h-4 w-4" /> Documents ({providerDetail.documents.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {providerDetail.documents.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No documents uploaded</p>
                        ) : (
                          <div className="space-y-2">
                            {providerDetail.documents.map(doc => (
                              <div key={doc.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{doc.title}</p>
                                  <p className="text-xs text-muted-foreground">{doc.document_type?.replace(/_/g, " ")}</p>
                                </div>
                                {doc.file_url && (
                                  <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline shrink-0">View</a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {!hasLegalAgreements(selectedProvider) && (
                    <Button variant="outline" className="flex-1" onClick={() => openLegalSigning(selectedProvider)}>
                      <FileText className="h-4 w-4 mr-2" /> Sign Legal
                    </Button>
                  )}
                  {!selectedProvider.verified && hasLegalAgreements(selectedProvider) && (
                    <Button className="flex-1" onClick={() => { updateVerified.mutate({ id: selectedProvider.id, verified: true }); setSelectedProvider(null); }}>
                      <Check className="h-4 w-4 mr-2" /> Verify Provider
                    </Button>
                  )}
                  {selectedProvider.verified && (
                    <Button variant="destructive" className="flex-1" onClick={() => { updateVerified.mutate({ id: selectedProvider.id, verified: false }); setSelectedProvider(null); }}>
                      <X className="h-4 w-4 mr-2" /> Revoke Verification
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}