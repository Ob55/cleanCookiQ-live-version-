import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Globe, MapPin, Phone, Mail, ShoppingBag, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CSCCTierBadge } from "@/components/CSCCTierBadge";
import {
  useMarketplaceProducts,
  useSupplierStorefronts,
} from "@/hooks/useMarketplace";
import { deriveCsccTier } from "@/lib/marketplace";

export default function SupplierStorefrontPage() {
  const { id } = useParams<{ id: string }>();
  const { data: storefronts, isLoading } = useSupplierStorefronts();
  const { data: products } = useMarketplaceProducts();

  const supplier = storefronts?.find((s) => s.id === id);
  const tier = deriveCsccTier(supplier?.cscc_selections ?? null);
  const supplierProducts = (products ?? []).filter((p) => p.provider_id === id);

  if (isLoading) {
    return (
      <div className="container py-10 space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="container py-10 space-y-3">
        <Link to="/marketplace" className="text-primary text-sm inline-flex items-center gap-1 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to marketplace
        </Link>
        <h1 className="text-2xl font-display font-bold">Supplier not found</h1>
      </div>
    );
  }

  return (
    <div className="container py-10 space-y-8">
      <Link to="/marketplace" className="text-primary text-sm inline-flex items-center gap-1 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to marketplace
      </Link>

      {/* Header */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-3xl font-display font-bold">{supplier.name}</h1>
                <CSCCTierBadge tier={tier} />
                {supplier.verified && (
                  <Badge variant="secondary">Verified by CleanCookiQ</Badge>
                )}
              </div>
              {supplier.website && (
                <a
                  href={supplier.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-1"
                >
                  <Globe className="h-4 w-4" /> {supplier.website} <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            {supplier.rating != null && supplier.rating > 0 && (
              <span className="inline-flex items-center gap-1 text-sm">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                {supplier.rating.toFixed(1)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-muted-foreground">
            {supplier.contact_person && (
              <div>Contact: <span className="text-foreground">{supplier.contact_person}</span></div>
            )}
            {supplier.contact_phone && (
              <div className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                <a href={`tel:${supplier.contact_phone}`} className="hover:underline text-foreground">
                  {supplier.contact_phone}
                </a>
              </div>
            )}
            {supplier.contact_email && (
              <div className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                <a href={`mailto:${supplier.contact_email}`} className="hover:underline text-foreground">
                  {supplier.contact_email}
                </a>
              </div>
            )}
          </div>

          {supplier.counties_served && supplier.counties_served.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <MapPin className="h-3 w-3" /> Counties served
              </p>
              <div className="flex flex-wrap gap-1">
                {supplier.counties_served.map((c) => (
                  <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                ))}
              </div>
            </div>
          )}

          {supplier.technology_types && supplier.technology_types.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Technologies</p>
              <div className="flex flex-wrap gap-1">
                {supplier.technology_types.map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs capitalize">{t}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Products */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-display font-semibold flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" /> Products
          </h2>
          <span className="text-xs text-muted-foreground">
            {supplier.listed_product_count} listed · {supplier.service_count} services
          </span>
        </div>
        {supplierProducts.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              This supplier has not listed any products yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {supplierProducts.map((p) => (
              <Link key={p.id} to={`/products/${p.id}`} className="group">
                <Card className="h-full overflow-hidden transition-shadow hover:shadow-md group-hover:border-primary/50">
                  <div className="aspect-video bg-muted">
                    {p.image_url && (
                      <img src={p.image_url} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{p.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <span className="font-semibold">
                      {p.price != null
                        ? `${p.price_currency} ${p.price.toLocaleString()}`
                        : "Quote on request"}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
