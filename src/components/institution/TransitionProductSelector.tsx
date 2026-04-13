import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, X, Loader2, ShoppingCart, Package, Wrench } from "lucide-react";
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
  const { data: selectedProducts = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["institution-selected-products", institutionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institution_selected_products")
        .select("*, provider_products(*, providers(name))")
        .eq("institution_id", institutionId);
      if (error) throw error;
      return (data ?? []).map((sp: any) => ({ ...sp, type: "product" as const }));
    },
    enabled: !!institutionId,
  });

  // Fetch selected services
  const { data: selectedServices = [], isLoading: loadingServices } = useQuery({
    queryKey: ["institution-selected-services", institutionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institution_selected_services" as any)
        .select("*, provider_services(*, providers(name))")
        .eq("institution_id", institutionId);
      if (error) throw error;
      return ((data as any[]) ?? []).map((ss: any) => ({ ...ss, type: "service" as const }));
    },
    enabled: !!institutionId,
  });

  // Search products
  const { data: productResults = [], isFetching: searchingProducts } = useQuery({
    queryKey: ["search-products", search],
    queryFn: async () => {
      if (!search.trim()) return [];
      const { data } = await supabase
        .from("provider_products")
        .select("*, providers(name)")
        .ilike("name", `%${search}%`)
        .limit(10);
      return (data ?? []).map((p: any) => ({ ...p, type: "product" as const }));
    },
    enabled: search.length >= 2,
  });

  // Search services
  const { data: serviceResults = [], isFetching: searchingServices } = useQuery({
    queryKey: ["search-services", search],
    queryFn: async () => {
      if (!search.trim()) return [];
      const { data } = await supabase
        .from("provider_services")
        .select("*, providers(name)")
        .ilike("name", `%${search}%`)
        .limit(10);
      return ((data as any[]) ?? []).map((s: any) => ({ ...s, type: "service" as const }));
    },
    enabled: search.length >= 2,
  });

  const searchResults = [...productResults, ...serviceResults];
  const searching = searchingProducts || searchingServices;

  const selectedProductIds = selectedProducts.map((sp: any) => sp.product_id);
  const selectedServiceIds = selectedServices.map((ss: any) => ss.service_id);

  const addProduct = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from("institution_selected_products")
        .insert({ institution_id: institutionId, product_id: productId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["institution-selected-products", institutionId] });
      toast.success("Product added");
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

  const addService = useMutation({
    mutationFn: async (serviceId: string) => {
      const { error } = await supabase
        .from("institution_selected_services" as any)
        .insert({ institution_id: institutionId, service_id: serviceId } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["institution-selected-services", institutionId] });
      toast.success("Service added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeService = useMutation({
    mutationFn: async (serviceId: string) => {
      const { error } = await supabase
        .from("institution_selected_services" as any)
        .delete()
        .eq("institution_id", institutionId)
        .eq("service_id", serviceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["institution-selected-services", institutionId] });
      toast.success("Service removed");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Combine all selected items
  const allSelected = [
    ...selectedProducts.map((sp: any) => ({
      id: sp.id,
      itemId: sp.product_id,
      type: "product" as const,
      name: sp.provider_products?.name || "Unknown",
      description: sp.provider_products?.description,
      price: sp.provider_products?.price,
      image_url: sp.provider_products?.image_url,
      provider: sp.provider_products?.providers?.name || "Unknown provider",
      quantity: sp.quantity || 1,
    })),
    ...selectedServices.map((ss: any) => ({
      id: ss.id,
      itemId: ss.service_id,
      type: "service" as const,
      name: ss.provider_services?.name || "Unknown",
      description: ss.provider_services?.details,
      price: (ss.provider_services as any)?.price,
      image_url: null,
      provider: ss.provider_services?.providers?.name || "Unknown provider",
      quantity: ss.quantity || 1,
    })),
  ];

  const totalCost = allSelected.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);

  if (loadingProducts || loadingServices) {
    return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Selected Items */}
      {allSelected.length > 0 ? (
        <div className="space-y-3">
          {allSelected.map((item) => (
            <div key={`${item.type}-${item.itemId}`} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="h-16 w-16 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  {item.type === "product" ? <Package className="h-6 w-6 text-muted-foreground" /> : <Wrench className="h-6 w-6 text-muted-foreground" />}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{item.name}</p>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{item.type === "product" ? "Product" : "Service"}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{item.provider}</p>
                  </div>
                  {editable && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => item.type === "product" ? removeProduct.mutate(item.itemId) : removeService.mutate(item.itemId)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                {item.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>}
                {item.price != null && <p className="text-sm font-bold text-primary mt-1">KSh {Number(item.price).toLocaleString()}</p>}
              </div>
            </div>
          ))}

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
          No products or services selected yet. {editable ? "Search and add items needed for your transition." : ""}
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
                    placeholder="Search products & services by name..."
                    className="pl-9"
                    autoFocus
                  />
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setShowSearch(false); setSearch(""); }}>
                  Cancel
                </Button>
              </div>

              {searching && (
                <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
              )}

              {search.length >= 2 && !searching && searchResults.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-3">No products or services found</p>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {searchResults.map((item: any) => {
                    const isProduct = item.type === "product";
                    const alreadySelected = isProduct ? selectedProductIds.includes(item.id) : selectedServiceIds.includes(item.id);
                    const price = isProduct ? item.price : item.price;
                    const desc = isProduct ? item.description : item.details;

                    return (
                      <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="h-10 w-10 rounded object-cover shrink-0" />
                        ) : (
                          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                            {isProduct ? <Package className="h-4 w-4 text-muted-foreground" /> : <Wrench className="h-4 w-4 text-muted-foreground" />}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">{isProduct ? "Product" : "Service"}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.providers?.name}{price ? ` • KSh ${Number(price).toLocaleString()}` : ""}
                          </p>
                        </div>
                        {alreadySelected ? (
                          <Badge variant="secondary" className="text-xs shrink-0">Added</Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs shrink-0"
                            onClick={() => isProduct ? addProduct.mutate(item.id) : addService.mutate(item.id)}
                            disabled={addProduct.isPending || addService.isPending}
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
