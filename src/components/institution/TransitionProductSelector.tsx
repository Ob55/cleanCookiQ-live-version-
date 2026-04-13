import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, X, Loader2, ShoppingCart, Package } from "lucide-react";
import { toast } from "sonner";

interface Props {
  institutionId: string;
  editable?: boolean;
}

export default function TransitionProductSelector({ institutionId, editable = true }: Props) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Fetch selected products
  const { data: selectedProducts = [], isLoading } = useQuery({
    queryKey: ["institution-selected-products", institutionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institution_selected_products")
        .select("*, provider_products(*, providers(name))")
        .eq("institution_id", institutionId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!institutionId,
  });

  // Search all products
  const { data: searchResults = [], isFetching: searching } = useQuery({
    queryKey: ["search-products", search],
    queryFn: async () => {
      if (!search.trim()) return [];
      const { data } = await supabase
        .from("provider_products")
        .select("*, providers(name)")
        .ilike("name", `%${search}%`)
        .limit(10);
      return data ?? [];
    },
    enabled: search.length >= 2,
  });

  const selectedIds = selectedProducts.map((sp: any) => sp.product_id);

  const addProduct = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from("institution_selected_products")
        .insert({ institution_id: institutionId, product_id: productId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["institution-selected-products", institutionId] });
      toast.success("Product added to transition needs");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeProduct = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from("institution_selected_products")
        .delete()
        .eq("institution_id", institutionId)
        .eq("product_id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["institution-selected-products", institutionId] });
      toast.success("Product removed");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const totalCost = selectedProducts.reduce((sum: number, sp: any) => {
    const price = sp.provider_products?.price || 0;
    return sum + price * (sp.quantity || 1);
  }, 0);

  if (isLoading) {
    return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Selected Products */}
      {selectedProducts.length > 0 ? (
        <div className="space-y-3">
          {selectedProducts.map((sp: any) => {
            const product = sp.provider_products;
            if (!product) return null;
            return (
              <div key={sp.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="h-16 w-16 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.providers?.name || "Unknown provider"}</p>
                    </div>
                    {editable && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => removeProduct.mutate(sp.product_id)}
                        disabled={removeProduct.isPending}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  {product.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
                  )}
                  {product.price != null && (
                    <p className="text-sm font-bold text-primary mt-1">KSh {Number(product.price).toLocaleString()}</p>
                  )}
                </div>
              </div>
            );
          })}

          {/* Total Cost */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold">Estimated Total Transition Cost</span>
            </div>
            <span className="text-lg font-bold text-primary">KSh {totalCost.toLocaleString()}</span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          No products selected yet. {editable ? "Search and add products needed for your transition." : ""}
        </p>
      )}

      {/* Search & Add */}
      {editable && (
        <div className="space-y-3">
          {!showSearch ? (
            <Button variant="outline" size="sm" onClick={() => setShowSearch(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Products / Services
            </Button>
          ) : (
            <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search products by name..."
                    className="pl-9"
                    autoFocus
                  />
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setShowSearch(false); setSearch(""); }}>
                  Cancel
                </Button>
              </div>

              {searching && (
                <div className="flex justify-center py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}

              {search.length >= 2 && !searching && searchResults.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-3">No products found</p>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {searchResults.map((product: any) => {
                    const alreadySelected = selectedIds.includes(product.id);
                    return (
                      <div key={product.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="h-10 w-10 rounded object-cover shrink-0" />
                        ) : (
                          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.providers?.name} {product.price ? `• KSh ${Number(product.price).toLocaleString()}` : ""}</p>
                        </div>
                        {alreadySelected ? (
                          <Badge variant="secondary" className="text-xs shrink-0">Added</Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs shrink-0"
                            onClick={() => addProduct.mutate(product.id)}
                            disabled={addProduct.isPending}
                          >
                            <Plus className="h-3 w-3 mr-1" /> Add
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
