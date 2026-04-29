import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useState } from "react";
import {
  ArrowLeft, Factory, Check, X, Loader2, Star, FileText, Package,
  Wrench, Mail, Phone, Globe, MapPin, ShieldCheck,
} from "lucide-react";

const categoryLabels: Record<string, string> = {
  equipment_provider: "Equipment Provider",
  installation_technician: "Installation Technician",
  logistics_provider: "Logistics Provider",
  service_product_provider: "Service/Product Provider",
};

const NDA_TEXT = `NON-DISCLOSURE AGREEMENT (NDA)\n\nThis Non-Disclosure Agreement ("Agreement") is entered into by and between the Provider ("Receiving Party") and cleancookIQ / Ignis ("Disclosing Party").\n\n1. CONFIDENTIAL INFORMATION: All proprietary data, institution records, pipeline intelligence, scoring models, cost tables, and platform methodologies shared through cleancookIQ.\n\n2. OBLIGATIONS: The Receiving Party agrees to:\n   a) Hold all Confidential Information in strict confidence\n   b) Not disclose to any third party without prior written consent\n   c) Use information solely for the purposes of the cleancookIQ platform engagement\n   d) Return or destroy all materials upon termination\n\n3. DURATION: This NDA remains in effect for 3 years from the date of signing.\n\n4. REMEDIES: Any breach may result in immediate removal from the platform and legal action.`;

const MOU_TEXT = `MEMORANDUM OF UNDERSTANDING (MoU)\n\nThis Memorandum of Understanding establishes the terms of participation on the cleancookIQ platform.\n\n1. SCOPE: The Provider agrees to participate in the cleancookIQ marketplace as a verified service provider.\n\n2. OBLIGATIONS:\n   a) Maintain accurate and up-to-date profile information\n   b) Respond to opportunity notifications within agreed timelines\n   c) Deliver services to the standards specified in awarded contracts\n   d) Participate in platform quality reviews and ratings\n\n3. PLATFORM COMMITMENTS:\n   a) cleancookIQ will provide fair and transparent matching\n   b) Pipeline data shared will be verified and accurate\n   c) Payment terms will be clearly defined per engagement\n\n4. TERMINATION: Either party may terminate with 30 days written notice.\n\n5. DISPUTE RESOLUTION: Disputes will be resolved through mediation before escalation.`;

const hasLegalAgreements = (p: any) => !!p?.nda_signed_at && !!p?.mou_signed_at;

export default function ProviderDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showLegalDialog, setShowLegalDialog] = useState(false);
  const [legalNda, setLegalNda] = useState(false);
  const [legalMou, setLegalMou] = useState(false);

  const { data: provider, isLoading } = useQuery({
    queryKey: ["provider", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("providers").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["provider-detail", id],
    queryFn: async () => {
      const [products, services, documents] = await Promise.all([
        supabase.from("provider_products").select("*").eq("provider_id", id!),
        supabase.from("provider_services").select("*").eq("provider_id", id!),
        supabase.from("provider_documents").select("*").eq("provider_id", id!),
      ]);
      return {
        products: products.data || [],
        services: services.data || [],
        documents: documents.data || [],
      };
    },
    enabled: !!id,
  });

  const updateVerified = useMutation({
    mutationFn: async ({ verified }: { verified: boolean }) => {
      const { error } = await supabase.from("providers").update({ verified }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: (_, { verified }) => {
      toast.success(verified ? "Provider verified" : "Verification revoked");
      queryClient.invalidateQueries({ queryKey: ["provider", id] });
    },
  });

  const signLegal = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      const { error } = await supabase.from("providers").update({ nda_signed_at: now, mou_signed_at: now }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Legal agreements signed");
      setShowLegalDialog(false);
      queryClient.invalidateQueries({ queryKey: ["provider", id] });
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!provider) {
    return <div className="p-8 text-center text-muted-foreground">Provider not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin/providers">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Factory className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{provider.name}</h1>
            <div className="flex gap-2 mt-1">
              <Badge variant={provider.verified ? "default" : "secondary"} className={`text-xs ${provider.verified ? "bg-primary/20 text-primary" : "bg-amber-500/20 text-amber-600"}`}>
                {provider.verified ? "Verified" : "Pending"}
              </Badge>
              {hasLegalAgreements(provider) ? (
                <Badge className="bg-green-100 text-green-700 text-xs">NDA + MoU ✓</Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-700 text-xs">Pending legal</Badge>
              )}
              {provider.rating != null && (
                <Badge variant="outline" className="text-xs"><Star className="h-3 w-3 mr-1 text-amber-500" />{provider.rating}</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {!hasLegalAgreements(provider) && (
            <Button variant="outline" onClick={() => { setLegalNda(false); setLegalMou(false); setShowLegalDialog(true); }}>
              <FileText className="h-4 w-4 mr-2" /> Sign Legal
            </Button>
          )}
          {!provider.verified && hasLegalAgreements(provider) && (
            <Button onClick={() => updateVerified.mutate({ verified: true })}>
              <Check className="h-4 w-4 mr-2" /> Verify Provider
            </Button>
          )}
          {provider.verified && (
            <Button variant="destructive" onClick={() => updateVerified.mutate({ verified: false })}>
              <X className="h-4 w-4 mr-2" /> Revoke Verification
            </Button>
          )}
        </div>
      </div>

      {/* Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Factory className="h-4 w-4 shrink-0" />
                <span className="font-medium text-foreground">{provider.contact_person || "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                <span>{provider.contact_email || "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0" />
                <span>{provider.contact_phone || "—"}</span>
              </div>
              {provider.website && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="h-4 w-4 shrink-0" />
                  <a href={provider.website} target="_blank" rel="noreferrer" className="text-primary underline">{provider.website}</a>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Category & Technologies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Category</p>
                <Badge variant="secondary">{categoryLabels[provider.provider_category || ""] || "Not set"}</Badge>
              </div>
              {provider.technology_types && provider.technology_types.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Technologies</p>
                  <div className="flex flex-wrap gap-1">
                    {provider.technology_types.map((t: string) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                  </div>
                </div>
              )}
              {provider.counties_served && provider.counties_served.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Counties Served</p>
                  <div className="flex flex-wrap gap-1">
                    {provider.counties_served.map((c: string) => (
                      <Badge key={c} variant="outline" className="text-xs"><MapPin className="h-3 w-3 mr-1" />{c}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Middle column - Products */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Package className="h-4 w-4" /> Products ({detail?.products.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {detailLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              ) : !detail?.products.length ? (
                <p className="text-sm text-muted-foreground">No products listed</p>
              ) : (
                <div className="space-y-3">
                  {detail.products.map(prod => (
                    <div key={prod.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                      {prod.image_url ? (
                        <img src={prod.image_url} alt={prod.name} className="h-12 w-12 rounded object-cover" />
                      ) : (
                        <div className="h-12 w-12 rounded bg-muted flex items-center justify-center"><Package className="h-5 w-5 text-muted-foreground" /></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{prod.name}</p>
                        {prod.description && <p className="text-xs text-muted-foreground truncate">{prod.description}</p>}
                        {prod.price != null && <p className="text-xs text-primary font-semibold">KSh {prod.price.toLocaleString()}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Wrench className="h-4 w-4" /> Services ({detail?.services.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {detailLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              ) : !detail?.services.length ? (
                <p className="text-sm text-muted-foreground">No services listed</p>
              ) : (
                <div className="space-y-3">
                  {detail.services.map(svc => (
                    <div key={svc.id} className="p-3 rounded-lg bg-muted/30">
                      <p className="text-sm font-medium">{svc.name}</p>
                      {svc.details && <p className="text-xs text-muted-foreground mt-0.5">{svc.details}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column - Documents */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" /> Documents ({detail?.documents.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {detailLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              ) : !detail?.documents.length ? (
                <p className="text-sm text-muted-foreground">No documents uploaded</p>
              ) : (
                <div className="space-y-3">
                  {detail.documents.map(doc => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
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
        </div>
      </div>

      {/* Legal Dialog */}
      <Dialog open={showLegalDialog} onOpenChange={setShowLegalDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Sign Legal Agreements — {provider.name}
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
              onClick={() => signLegal.mutate()}
              disabled={!legalNda || !legalMou || signLegal.isPending}
              className="w-full"
            >
              {signLegal.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Sign & Complete Legal Agreements
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
