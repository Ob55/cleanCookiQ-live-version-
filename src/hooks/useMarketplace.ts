import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  type MarketplaceProduct,
  type ProductCategory,
  type SupplierStorefront,
} from "@/lib/marketplace";

const STALE_MS = 1000 * 60 * 10;

type AnyTable = {
  from: (t: string) => {
    select: (s: string) => {
      eq: (col: string, v: unknown) => unknown;
      order: (col: string, opts?: { ascending?: boolean }) => unknown;
    };
    insert: (rows: unknown) => unknown;
  };
};
const sb = () => supabase as unknown as AnyTable;

export function useProductCategories() {
  return useQuery({
    queryKey: ["product_categories"],
    staleTime: STALE_MS,
    queryFn: async (): Promise<ProductCategory[]> => {
      const { data, error } = (await (sb()
        .from("product_categories")
        .select("id,slug,name,description,display_order")
        .order("display_order", { ascending: true }) as unknown as Promise<{
        data: ProductCategory[] | null;
        error: unknown;
      }>));
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMarketplaceProducts() {
  return useQuery({
    queryKey: ["v_marketplace_products"],
    staleTime: STALE_MS,
    queryFn: async (): Promise<MarketplaceProduct[]> => {
      const { data, error } = (await (sb()
        .from("v_marketplace_products")
        .select("*")
        .order("created_at", { ascending: false }) as unknown as Promise<{
        data: MarketplaceProduct[] | null;
        error: unknown;
      }>));
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMarketplaceProduct(productId: string | undefined) {
  return useQuery({
    queryKey: ["v_marketplace_products", productId],
    enabled: Boolean(productId),
    staleTime: STALE_MS,
    queryFn: async (): Promise<MarketplaceProduct | null> => {
      const { data, error } = (await (sb()
        .from("v_marketplace_products")
        .select("*")
        .eq("id", productId!) as unknown as Promise<{
        data: MarketplaceProduct[] | null;
        error: unknown;
      }>));
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
}

export function useSupplierStorefronts() {
  return useQuery({
    queryKey: ["v_supplier_storefronts"],
    staleTime: STALE_MS,
    queryFn: async (): Promise<SupplierStorefront[]> => {
      const { data, error } = (await (sb()
        .from("v_supplier_storefronts")
        .select("*")
        .order("listed_product_count", { ascending: false }) as unknown as Promise<{
        data: SupplierStorefront[] | null;
        error: unknown;
      }>));
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface SubmitQuoteInput {
  productId: string | null;
  providerId: string;
  buyerUserId: string;
  buyerOrgId?: string | null;
  buyerCounty?: string | null;
  quantity: number;
  message: string;
}

export function useSubmitQuoteRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubmitQuoteInput) => {
      const { data, error } = (await (sb()
        .from("quote_requests")
        .insert({
          product_id: input.productId,
          provider_id: input.providerId,
          buyer_user_id: input.buyerUserId,
          buyer_org_id: input.buyerOrgId ?? null,
          buyer_county: input.buyerCounty ?? null,
          quantity: input.quantity,
          message: input.message,
        }) as unknown as Promise<{ data: unknown; error: unknown }>));
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quote_requests"] });
    },
  });
}
