import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, FileText, ShoppingBag, Star } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMarketplaceProduct, useSubmitQuoteRequest } from "@/hooks/useMarketplace";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: product, isLoading } = useMarketplaceProduct(id);
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const submit = useSubmitQuoteRequest();

  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");

  if (isLoading) {
    return (
      <div className="container py-10 space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container py-10">
        <Link to="/marketplace" className="text-primary text-sm inline-flex items-center gap-1 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to marketplace
        </Link>
        <h1 className="mt-4 text-2xl font-display font-bold">Product not found</h1>
      </div>
    );
  }

  const requireSignIn = !user;
  const isInstitution = profile?.org_type === "institution";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requireSignIn) {
      navigate(`/auth/register?redirect=/products/${product.id}`);
      return;
    }
    if (!isInstitution) {
      toast.error("Only institution accounts can request quotes.");
      return;
    }
    if (!message.trim()) {
      toast.error("Please describe what you need so the supplier can respond.");
      return;
    }
    try {
      await submit.mutateAsync({
        productId: product.id,
        providerId: product.provider_id,
        buyerUserId: user!.id,
        buyerOrgId: profile?.organisation_id ?? null,
        quantity,
        message: message.trim(),
      });
      toast.success("Quote request sent to the supplier.");
      setMessage("");
      setQuantity(1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send request.";
      toast.error(msg);
    }
  };

  const specEntries = Object.entries(product.specifications ?? {});

  return (
    <div className="container py-10 space-y-8">
      <Link to="/marketplace" className="text-primary text-sm inline-flex items-center gap-1 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to marketplace
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Hero image */}
        <div className="aspect-video bg-muted rounded-lg overflow-hidden">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <ShoppingBag className="h-16 w-16 opacity-30" />
            </div>
          )}
        </div>

        {/* Header info */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {product.category_name && (
              <Badge variant="outline">{product.category_name}</Badge>
            )}
            {product.provider_verified && (
              <Badge variant="secondary">Verified supplier</Badge>
            )}
            {!product.in_stock && (
              <Badge variant="destructive">Out of stock</Badge>
            )}
          </div>
          <h1 className="text-3xl font-display font-bold">{product.name}</h1>
          {product.provider_name && (
            <p className="text-muted-foreground">
              by{" "}
              <Link to={`/suppliers/${product.provider_id}`} className="text-primary hover:underline">
                {product.provider_name}
              </Link>
            </p>
          )}
          {product.review_count > 0 && (
            <p className="inline-flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              {product.avg_rating.toFixed(1)} · {product.review_count} review{product.review_count === 1 ? "" : "s"}
            </p>
          )}
          <div className="text-2xl font-bold">
            {product.price != null
              ? `${product.price_currency} ${product.price.toLocaleString()}`
              : "Price on request"}
          </div>
          {product.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-line">{product.description}</p>
          )}
          {product.datasheet_url && (
            <a
              href={product.datasheet_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <FileText className="h-4 w-4" /> Download datasheet <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      {/* Specs + RFQ side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Specifications & compliance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {specEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                The supplier has not yet uploaded detailed specifications. Request a quote
                below to receive a full datasheet.
              </p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {specEntries.map(([k, v]) => (
                    <tr key={k} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium capitalize">{k.replace(/_/g, " ")}</td>
                      <td className="py-2 text-muted-foreground">{String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {product.certifications.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Certifications</p>
                <div className="flex flex-wrap gap-1">
                  {product.certifications.map((c) => (
                    <Badge key={c} variant="secondary">{c}</Badge>
                  ))}
                </div>
              </div>
            )}
            {product.warranty_months != null && (
              <p className="text-xs text-muted-foreground">
                Warranty: {product.warranty_months} months
              </p>
            )}
          </CardContent>
        </Card>

        {/* RFQ */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Request a quote</CardTitle>
            <CardDescription>
              {requireSignIn
                ? "Sign up as an institution to send the supplier a quote request."
                : isInstitution
                ? "Send the supplier a request and they'll respond directly to you."
                : "Quote requests are reserved for institution accounts."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Quantity</label>
                <Input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                  disabled={requireSignIn || !isInstitution}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Message to supplier</label>
                <Textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Briefly describe your kitchen, current fuel, target install date..."
                  disabled={requireSignIn || !isInstitution}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={submit.isPending || (!requireSignIn && !isInstitution)}
              >
                {requireSignIn
                  ? "Sign up to request a quote"
                  : submit.isPending
                  ? "Sending..."
                  : "Send quote request"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
