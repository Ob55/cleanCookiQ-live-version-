import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sbAny } from "@/lib/sbAny";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Loader2, Factory, Package, Mail, Phone, ArrowRight, Inbox, ShieldCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Provider = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  verified: boolean | null;
};
type Product = {
  id: string;
  provider_id: string;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
};
type LinkRow = {
  id: string;
  institution_id: string;
  provider_id: string;
  product_ids: string[];
  notes: string | null;
  created_at: string;
};

export default function InstitutionSupplierDetails() {
  const { user } = useAuth();

  // Find the institution this user belongs to (created_by OR profile.organisation_id)
  const { data: myInstitutionId } = useQuery({
    queryKey: ["my-institution-id", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      // Try created_by first
      const { data: byCreator } = await supabase
        .from("institutions")
        .select("id")
        .eq("created_by", user.id)
        .limit(1)
        .maybeSingle();
      if (byCreator?.id) return byCreator.id as string;
      // Fall back to profile.organisation_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("organisation_id")
        .eq("user_id", user.id)
        .maybeSingle();
      return (profile?.organisation_id as string | null) ?? null;
    },
  });

  const { data: links, isLoading } = useQuery({
    queryKey: ["my-supplier-links", myInstitutionId],
    enabled: !!myInstitutionId,
    queryFn: async (): Promise<LinkRow[]> => {
      const { data } = await sbAny
        .from("institution_supplier_links")
        .select("id, institution_id, provider_id, product_ids, notes, created_at")
        .eq("institution_id", myInstitutionId)
        .order("created_at", { ascending: false });
      return (data ?? []) as LinkRow[];
    },
  });

  const providerIds = (links ?? []).map(l => l.provider_id);
  const productIds = Array.from(
    new Set((links ?? []).flatMap(l => l.product_ids ?? []))
  );

  const { data: providers } = useQuery({
    queryKey: ["my-link-providers", providerIds],
    enabled: providerIds.length > 0,
    queryFn: async (): Promise<Provider[]> => {
      const { data } = await supabase
        .from("providers")
        .select("id, name, category, description, contact_email, contact_phone, verified")
        .in("id", providerIds);
      return (data ?? []) as Provider[];
    },
  });

  // When product_ids is empty for a link → admin shared *all* the supplier's products,
  // so we need a separate "all products by this provider" lookup. We fetch products by
  // BOTH specific ids and provider ids in one query and filter client-side.
  const { data: products } = useQuery({
    queryKey: ["my-link-products", providerIds, productIds],
    enabled: providerIds.length > 0,
    queryFn: async (): Promise<Product[]> => {
      const { data } = await supabase
        .from("provider_products")
        .select("id, provider_id, name, description, price, image_url")
        .in("provider_id", providerIds);
      return (data ?? []) as Product[];
    },
  });

  const providerById = new Map<string, Provider>();
  (providers ?? []).forEach(p => providerById.set(p.id, p));

  if (isLoading || !myInstitutionId) {
    return (
      <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    );
  }

  if (!links || links.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Factory className="h-6 w-6 text-primary" />
            Supplier Details
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Suppliers and products that admin has matched to your institution will show up here.
          </p>
        </div>

        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <div className="h-14 w-14 mx-auto rounded-full bg-muted flex items-center justify-center">
              <Inbox className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">No suppliers shared with you yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Once an admin reviews your institution and links it to a supplier, this page lights up. You'll also get a notification on the bell.
              </p>
            </div>
            <Link to="/marketplace">
              <Button variant="outline" className="gap-2">
                Browse the public marketplace <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Factory className="h-6 w-6 text-primary" />
          Supplier Details
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {links.length} supplier{links.length === 1 ? "" : "s"} matched to your institution by admin.
        </p>
      </div>

      <div className="space-y-5">
        {links.map((link) => {
          const provider = providerById.get(link.provider_id);
          // If product_ids is empty, admin shared "all" — show all products for this provider.
          const myProducts = (products ?? []).filter((p) => {
            if (p.provider_id !== link.provider_id) return false;
            if (link.product_ids.length === 0) return true;
            return link.product_ids.includes(p.id);
          });

          return (
            <Card key={link.id} className="overflow-hidden">
              <CardContent className="p-0">
                {/* Supplier header */}
                <div className="p-5 bg-muted/30 border-b border-border">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-display font-bold text-lg">{provider?.name ?? "—"}</h2>
                        {provider?.verified && (
                          <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 text-xs gap-1">
                            <ShieldCheck className="h-3 w-3" /> Verified
                          </Badge>
                        )}
                        {provider?.category && (
                          <Badge variant="secondary" className="text-xs">{provider.category}</Badge>
                        )}
                      </div>
                      {provider?.description && (
                        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{provider.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 mt-2.5 text-xs text-muted-foreground">
                        {provider?.contact_email && (
                          <a href={`mailto:${provider.contact_email}`} className="inline-flex items-center gap-1.5 hover:text-primary">
                            <Mail className="h-3.5 w-3.5" /> {provider.contact_email}
                          </a>
                        )}
                        {provider?.contact_phone && (
                          <a href={`tel:${provider.contact_phone}`} className="inline-flex items-center gap-1.5 hover:text-primary">
                            <Phone className="h-3.5 w-3.5" /> {provider.contact_phone}
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Shared</p>
                      <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(link.created_at), { addSuffix: true })}</p>
                    </div>
                  </div>

                  {link.notes && (
                    <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                      <p className="text-[10px] uppercase tracking-widest text-primary font-semibold mb-1">Admin note</p>
                      <p className="text-foreground/85">{link.notes}</p>
                    </div>
                  )}
                </div>

                {/* Products */}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">
                      {link.product_ids.length === 0 ? "All products" : "Selected products"}
                      <span className="ml-1.5 text-muted-foreground font-normal">({myProducts.length})</span>
                    </p>
                  </div>

                  {myProducts.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-3">No products from this supplier yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {myProducts.map((p) => (
                        <Link
                          key={p.id}
                          to={`/products/${p.id}`}
                          className="group rounded-lg border border-border overflow-hidden hover:border-primary/40 transition-colors flex flex-col"
                        >
                          {p.image_url && (
                            <div className="aspect-[4/3] overflow-hidden bg-muted">
                              <img
                                src={p.image_url}
                                alt={p.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                              />
                            </div>
                          )}
                          <div className="p-3 flex-1 flex flex-col">
                            <p className="text-sm font-medium leading-snug">{p.name}</p>
                            {p.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 flex-1">{p.description}</p>
                            )}
                            {p.price != null && (
                              <p className="text-sm font-semibold text-primary mt-2">KSh {Number(p.price).toLocaleString()}</p>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
