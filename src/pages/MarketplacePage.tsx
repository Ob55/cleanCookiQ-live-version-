import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ShoppingBag, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarketplaceProducts, useProductCategories } from "@/hooks/useMarketplace";
import { useCounties } from "@/hooks/useCounties";
import { applyMarketplaceFilters, type MarketplaceFilters, type MarketplaceProduct } from "@/lib/marketplace";
import { DownloadReportButton, listColumn } from "@/components/admin/DownloadReportButton";

export default function MarketplacePage() {
  const { data: products, isLoading: productsLoading } = useMarketplaceProducts();
  const { data: categories } = useProductCategories();
  const { data: counties } = useCounties();
  const [filters, setFilters] = useState<MarketplaceFilters>({});

  const filtered = useMemo(
    () => applyMarketplaceFilters(products ?? [], filters),
    [products, filters],
  );

  return (
    <div className="container py-10 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <ShoppingBag className="h-7 w-7 text-primary" /> Marketplace
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Browse certified clean-cooking products from verified Kenyan suppliers.
            Filter by technology, county served, and request a quote when you find a fit.
          </p>
        </div>
        <DownloadReportButton
          rows={filtered}
          columns={[
            { key: "name", label: "Product" },
            { key: "category_name", label: "Category" },
            { key: "provider_name", label: "Provider" },
            { key: "price", label: "Price" },
            { key: "price_currency", label: "Currency" },
            { key: "sku", label: "SKU" },
            { key: "warranty_months", label: "Warranty (months)" },
            { key: "in_stock", label: "In Stock" },
            { key: "avg_rating", label: "Avg Rating" },
            { key: "review_count", label: "Reviews" },
            listColumn("certifications", "Certifications"),
            listColumn("provider_counties", "Provider Counties"),
            { key: "datasheet_url", label: "Datasheet URL" },
          ]}
          title="Marketplace Products"
          filename="marketplace"
          subtitle={`Filters — category: ${filters.category ?? "all"}, county: ${filters.county ?? "any"}, search: "${filters.search || "—"}"`}
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products, suppliers, SKU..."
              className="pl-9"
              value={filters.search ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={!filters.category}
              onClick={() => setFilters((f) => ({ ...f, category: null }))}
            >
              All categories
            </FilterChip>
            {categories?.map((c) => (
              <FilterChip
                key={c.id}
                active={filters.category === c.slug}
                onClick={() => setFilters((f) => ({ ...f, category: c.slug }))}
              >
                {c.name}
              </FilterChip>
            ))}
          </div>

          {counties && counties.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">County served:</span>
              <select
                aria-label="County served"
                value={filters.county ?? ""}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, county: e.target.value || null }))
                }
                className="text-sm rounded-md border border-input bg-background px-2 py-1"
              >
                <option value="">Any county</option>
                {counties.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
              <label className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={Boolean(filters.inStockOnly)}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, inStockOnly: e.target.checked }))
                  }
                />
                In stock only
              </label>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {productsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No products match your filters yet. Try clearing them or browse all categories.
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Showing {filtered.length} of {products?.length ?? 0} products
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-muted-foreground border-border hover:border-primary/40"
      }`}
    >
      {children}
    </button>
  );
}

function ProductCard({ product }: { product: MarketplaceProduct }) {
  return (
    <Link to={`/products/${product.id}`} className="group">
      <Card className="h-full overflow-hidden transition-shadow hover:shadow-md group-hover:border-primary/50">
        <div className="aspect-video w-full bg-muted">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <ShoppingBag className="h-8 w-8 opacity-30" />
            </div>
          )}
        </div>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-tight">{product.name}</CardTitle>
            {product.provider_verified && (
              <Badge variant="secondary" className="text-[10px] uppercase shrink-0">
                Verified
              </Badge>
            )}
          </div>
          {product.category_name && (
            <Badge variant="outline" className="w-fit text-xs">{product.category_name}</Badge>
          )}
        </CardHeader>
        <CardContent className="pt-0 space-y-2 text-sm">
          {product.provider_name && (
            <p className="text-xs text-muted-foreground">by {product.provider_name}</p>
          )}
          <div className="flex items-center justify-between">
            <span className="font-semibold">
              {product.price != null
                ? `${product.price_currency} ${product.price.toLocaleString()}`
                : "Quote on request"}
            </span>
            {product.review_count > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {product.avg_rating.toFixed(1)} ({product.review_count})
              </span>
            )}
          </div>
          {!product.in_stock && (
            <Badge variant="destructive" className="text-[10px]">Out of stock</Badge>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
