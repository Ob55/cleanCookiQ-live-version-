import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sbAny } from "@/lib/sbAny";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, Link2, Building2, Factory, Trash2, Search, Package, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Institution = { id: string; name: string; institution_code: string | null; county: string | null };
type Provider = { id: string; name: string; category: string | null; organisation_id: string | null };
type Product = { id: string; provider_id: string; name: string; price: number | null };
type ProfileRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  org_name: string | null;
  org_type: string | null;
  organisation_id: string | null;
};
type LinkRow = {
  id: string;
  institution_id: string;
  provider_id: string;
  product_ids: string[];
  notes: string | null;
  created_at: string;
};

/**
 * Picker rows — what shows up in the dropdown.
 * `selectable: false` rows render greyed-out because no backing record
 * exists yet (the user signed up but hasn't done setup).
 */
type PickerItem = {
  value: string;          // id used for link.institution_id / link.provider_id
  label: string;
  meta: string;
  search: string;
  selectable: boolean;
  registered: boolean;
  warning?: string;
};

export default function LinkInstitutionSupplier() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [institutionId, setInstitutionId] = useState("");
  const [providerId, setProviderId] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Source of truth for "who has joined the platform" — the profiles
  // table, scoped to the two relevant org types. This is the same dataset
  // the admin Users page surfaces, so the picker mirrors what admin sees
  // there.
  const { data: profiles } = useQuery({
    queryKey: ["link-picker-profiles"],
    queryFn: async (): Promise<ProfileRow[]> => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, org_name, org_type, organisation_id")
        .in("org_type", ["institution", "supplier"])
        .order("org_name");
      return (data ?? []) as ProfileRow[];
    },
  });

  // The institutions table — joined to institution-type profiles by
  // profiles.organisation_id = institutions.id.
  const { data: institutions } = useQuery({
    queryKey: ["all-institutions-link-picker"],
    queryFn: async (): Promise<Institution[]> => {
      const { data } = await supabase
        .from("institutions")
        .select("id, name, institution_code, county")
        .order("name");
      return (data ?? []) as Institution[];
    },
  });

  // The providers table — joined to supplier-type profiles by
  // providers.organisation_id = profiles.organisation_id.
  const { data: providers } = useQuery({
    queryKey: ["all-providers-link-picker"],
    queryFn: async (): Promise<Provider[]> => {
      const { data } = await supabase
        .from("providers")
        .select("id, name, category, organisation_id")
        .order("name");
      return (data ?? []) as Provider[];
    },
  });

  const institutionById = useMemo(() => {
    const m = new Map<string, Institution>();
    (institutions ?? []).forEach((i) => m.set(i.id, i));
    return m;
  }, [institutions]);

  const providerByOrgId = useMemo(() => {
    const m = new Map<string, Provider>();
    (providers ?? []).forEach((p) => {
      if (p.organisation_id) m.set(p.organisation_id, p);
    });
    return m;
  }, [providers]);

  // Dedupe profiles by organisation_id (or user_id) — when multiple
  // people from the same org signed up, the org should appear once.
  const institutionItems: PickerItem[] = useMemo(() => {
    const rows = (profiles ?? []).filter((p) => p.org_type === "institution");
    const seen = new Set<string>();
    const out: PickerItem[] = [];
    for (const p of rows) {
      const inst = p.organisation_id ? institutionById.get(p.organisation_id) : undefined;
      const key = inst?.id ?? `profile-${p.user_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (inst) {
        out.push({
          value: inst.id,
          label: inst.name,
          meta: [inst.institution_code, inst.county].filter(Boolean).join(" · ") || (p.email ?? ""),
          search: `${inst.name} ${inst.institution_code ?? ""} ${inst.county ?? ""} ${p.org_name ?? ""} ${p.email ?? ""}`,
          selectable: true,
          registered: true,
        });
      } else {
        out.push({
          value: `profile-${p.user_id}`,
          label: p.org_name || p.full_name || "(unnamed institution)",
          meta: p.email ?? "Setup not completed",
          search: `${p.org_name ?? ""} ${p.full_name ?? ""} ${p.email ?? ""}`,
          selectable: false,
          registered: true,
          warning: "Hasn't completed institution setup — can't be linked yet.",
        });
      }
    }
    // Also include institutions that exist in the table but have no
    // profile pointing at them (admin-imported / seeded), so admin can
    // still link them. They render without a "Registered" pill.
    const fromProfileIds = new Set(out.filter(o => o.registered).map(o => o.value));
    for (const inst of institutions ?? []) {
      if (fromProfileIds.has(inst.id)) continue;
      out.push({
        value: inst.id,
        label: inst.name,
        meta: [inst.institution_code, inst.county].filter(Boolean).join(" · "),
        search: `${inst.name} ${inst.institution_code ?? ""} ${inst.county ?? ""}`,
        selectable: true,
        registered: false,
      });
    }
    return out.sort((a, b) => a.label.localeCompare(b.label));
  }, [profiles, institutions, institutionById]);

  const supplierItems: PickerItem[] = useMemo(() => {
    const rows = (profiles ?? []).filter((p) => p.org_type === "supplier");
    const seen = new Set<string>();
    const out: PickerItem[] = [];
    for (const p of rows) {
      const prov = p.organisation_id ? providerByOrgId.get(p.organisation_id) : undefined;
      const key = prov?.id ?? `profile-${p.user_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (prov) {
        out.push({
          value: prov.id,
          label: prov.name,
          meta: [prov.category, p.email].filter(Boolean).join(" · ") || (p.org_name ?? ""),
          search: `${prov.name} ${prov.category ?? ""} ${p.org_name ?? ""} ${p.email ?? ""}`,
          selectable: true,
          registered: true,
        });
      } else {
        out.push({
          value: `profile-${p.user_id}`,
          label: p.org_name || p.full_name || "(unnamed supplier)",
          meta: p.email ?? "Setup not completed",
          search: `${p.org_name ?? ""} ${p.full_name ?? ""} ${p.email ?? ""}`,
          selectable: false,
          registered: true,
          warning: "Hasn't completed supplier setup — can't be linked yet.",
        });
      }
    }
    // Include providers without a profile (admin-imported) too.
    const fromProfileProvIds = new Set(out.filter(o => o.registered && o.selectable).map(o => o.value));
    for (const prov of providers ?? []) {
      if (fromProfileProvIds.has(prov.id)) continue;
      out.push({
        value: prov.id,
        label: prov.name,
        meta: prov.category ?? "",
        search: `${prov.name} ${prov.category ?? ""}`,
        selectable: true,
        registered: false,
      });
    }
    return out.sort((a, b) => a.label.localeCompare(b.label));
  }, [profiles, providers, providerByOrgId]);

  const selectableInstitutionCount = institutionItems.filter((i) => i.selectable).length;
  const selectableSupplierCount = supplierItems.filter((i) => i.selectable).length;

  const { data: products } = useQuery({
    queryKey: ["provider-products", providerId],
    enabled: !!providerId,
    queryFn: async (): Promise<Product[]> => {
      const { data } = await supabase
        .from("provider_products")
        .select("id, provider_id, name, price")
        .eq("provider_id", providerId)
        .order("name");
      return (data ?? []) as Product[];
    },
  });

  const { data: links } = useQuery({
    queryKey: ["institution-supplier-links"],
    queryFn: async (): Promise<LinkRow[]> => {
      const { data } = await sbAny
        .from("institution_supplier_links")
        .select("id, institution_id, provider_id, product_ids, notes, created_at")
        .order("created_at", { ascending: false });
      return (data ?? []) as LinkRow[];
    },
  });

  const institutionLookup = useMemo(() => {
    const map = new Map<string, Institution>();
    (institutions ?? []).forEach(i => map.set(i.id, i));
    return map;
  }, [institutions]);

  const providerLookup = useMemo(() => {
    const map = new Map<string, Provider>();
    (providers ?? []).forEach(p => map.set(p.id, p));
    return map;
  }, [providers]);

  const createLink = useMutation({
    mutationFn: async () => {
      if (!institutionId) throw new Error("Pick an institution");
      if (!providerId) throw new Error("Pick a supplier");
      const { error } = await sbAny
        .from("institution_supplier_links")
        .insert({
          institution_id: institutionId,
          provider_id: providerId,
          product_ids: selectedProducts,
          notes: notes.trim() || null,
          created_by: user?.id ?? null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Linked — the institution has been notified.");
      setInstitutionId("");
      setProviderId("");
      setSelectedProducts([]);
      setNotes("");
      qc.invalidateQueries({ queryKey: ["institution-supplier-links"] });
    },
    onError: (e: any) => {
      // Surface unique-constraint failure cleanly
      if (e.message?.toLowerCase().includes("duplicate") || e.code === "23505") {
        toast.error("That institution is already linked to this supplier. Delete the existing link first if you want to redo it.");
      } else {
        toast.error(e.message || "Failed to create link");
      }
    },
  });

  const deleteLink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sbAny.from("institution_supplier_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Link removed");
      qc.invalidateQueries({ queryKey: ["institution-supplier-links"] });
      setDeleteTarget(null);
    },
    onError: (e: any) => {
      toast.error(e.message || "Failed to delete link");
      setDeleteTarget(null);
    },
  });

  const filteredLinks = (links ?? []).filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const inst = institutionLookup.get(l.institution_id);
    const prov = providerLookup.get(l.provider_id);
    return (
      inst?.name?.toLowerCase().includes(q) ||
      inst?.county?.toLowerCase().includes(q) ||
      inst?.institution_code?.toLowerCase().includes(q) ||
      prov?.name?.toLowerCase().includes(q) ||
      l.notes?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Link2 className="h-6 w-6 text-primary" />
          Link Institution ↔ Supplier
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Share a vetted supplier (and optionally specific products) with a specific institution. They'll see it on their Supplier Details page and get a bell notification.
        </p>
      </div>

      {/* Create form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create a new link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> Institution
                <span className="text-xs text-muted-foreground font-normal ml-1">
                  ({selectableInstitutionCount} linkable, {institutionItems.length} total)
                </span>
              </Label>
              <SearchableSelect
                placeholder="Pick an institution"
                emptyText={
                  !profiles
                    ? "Loading institutions…"
                    : institutionItems.length === 0
                      ? "No institutions yet — none have registered or been imported."
                      : "No institutions match your search."
                }
                value={institutionId}
                onSelect={setInstitutionId}
                items={institutionItems}
              />
            </div>

            <div>
              <Label className="flex items-center gap-1.5">
                <Factory className="h-3.5 w-3.5" /> Supplier
                <span className="text-xs text-muted-foreground font-normal ml-1">
                  ({selectableSupplierCount} linkable, {supplierItems.length} total)
                </span>
              </Label>
              <SearchableSelect
                placeholder="Pick a supplier"
                emptyText={
                  !profiles
                    ? "Loading suppliers…"
                    : supplierItems.length === 0
                      ? "No suppliers yet — none have registered or been imported."
                      : "No suppliers match your search."
                }
                value={providerId}
                onSelect={(v) => { setProviderId(v); setSelectedProducts([]); }}
                items={supplierItems}
              />
            </div>
          </div>

          {/* Product selector — only when a supplier is picked */}
          {providerId && (
            <div>
              <Label className="flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5" /> Products to share
                <span className="text-xs text-muted-foreground font-normal">(optional — leave empty to share all)</span>
              </Label>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto rounded-lg border border-border p-3">
                {!products ? (
                  <div className="col-span-full flex items-center justify-center py-6 text-sm text-muted-foreground gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading products…
                  </div>
                ) : products.length === 0 ? (
                  <p className="col-span-full text-sm text-muted-foreground py-4 text-center">
                    This supplier hasn't listed any products yet.
                  </p>
                ) : (
                  products.map((p) => {
                    const checked = selectedProducts.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className={`flex items-start gap-2 rounded-lg border p-2.5 cursor-pointer transition-colors ${
                          checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                        }`}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            setSelectedProducts((curr) =>
                              v === true ? [...curr, p.id] : curr.filter((x) => x !== p.id)
                            );
                          }}
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          {p.price != null && (
                            <p className="text-xs text-muted-foreground">KSh {Number(p.price).toLocaleString()}</p>
                          )}
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <div>
            <Label>Notes for the institution <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Recommended for your kitchen capacity. Pre-approved on the financing track."
              rows={2}
              className="mt-1.5"
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => createLink.mutate()}
              disabled={createLink.isPending || !institutionId || !providerId}
              className="gap-2"
            >
              {createLink.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              Create link & notify
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing links */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-semibold">
            Existing links
            {links ? <span className="ml-2 text-muted-foreground font-normal">({links.length})</span> : null}
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search institution / supplier…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
        </div>
        {!links ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : filteredLinks.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            {search ? "No links match your search." : "No links yet. Use the form above to create one."}
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Institution</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Supplier</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Products</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Notes</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Created</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filteredLinks.map((l) => {
                const inst = institutionLookup.get(l.institution_id);
                const prov = providerLookup.get(l.provider_id);
                return (
                  <tr key={l.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3">
                      <p className="text-sm font-medium">{inst?.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {inst?.institution_code ?? ""} {inst?.county ? `· ${inst.county}` : ""}
                      </p>
                    </td>
                    <td className="p-3">
                      <p className="text-sm font-medium">{prov?.name ?? "—"}</p>
                      {prov?.category && <p className="text-xs text-muted-foreground">{prov.category}</p>}
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary" className="text-xs">
                        {l.product_ids.length > 0 ? `${l.product_ids.length} specific` : "All products"}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground max-w-[260px] truncate" title={l.notes ?? undefined}>
                      {l.notes || "—"}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {new Date(l.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteTarget(l.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this link?</AlertDialogTitle>
            <AlertDialogDescription>
              The institution will lose visibility to this supplier's details. Their existing notification stays in their bell.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteLink.mutate(deleteTarget)}
              disabled={deleteLink.isPending}
            >
              {deleteLink.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Remove link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Searchable select — Popover + Command (cmdk) — used for both the
// Institution and Supplier pickers so admin can type-to-search instead
// of scrolling through a long list.
type SearchableItem = {
  value: string;
  label: string;
  meta?: string;
  search: string;
  /** True when there's a registered user account behind this record. */
  registered?: boolean;
  /** When false, item is shown greyed out and can't be picked. */
  selectable?: boolean;
  warning?: string;
};

function SearchableSelect({
  value,
  onSelect,
  items,
  placeholder,
  emptyText,
}: {
  value: string;
  onSelect: (value: string) => void;
  items: SearchableItem[];
  placeholder: string;
  emptyText: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = items.find((i) => i.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="mt-1.5 w-full justify-between font-normal h-10"
        >
          {selected ? (
            <span className="flex items-baseline gap-2 min-w-0 truncate">
              <span className="font-medium truncate">{selected.label}</span>
              {selected.meta && <span className="text-xs text-muted-foreground truncate">{selected.meta}</span>}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command
          filter={(itemValue, search) => {
            // itemValue is what we pass as `value` on CommandItem — we
            // pass the searchable haystack there so cmdk's built-in
            // substring filtering does the right thing.
            return itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Type to search…" />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {items.map((item) => {
                const disabled = item.selectable === false;
                return (
                  <CommandItem
                    key={item.value}
                    value={item.search}
                    disabled={disabled}
                    onSelect={() => {
                      if (disabled) return;
                      onSelect(item.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-2",
                      disabled && "opacity-60 cursor-not-allowed",
                    )}
                  >
                    <Check className={cn("h-4 w-4 shrink-0", value === item.value ? "opacity-100" : "opacity-0")} />
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium truncate">{item.label}</span>
                        {item.registered && (
                          <span className="shrink-0 rounded-full bg-emerald-500/15 text-emerald-700 text-[9px] font-bold uppercase tracking-wider px-1.5 py-px">
                            Registered
                          </span>
                        )}
                        {disabled && (
                          <span className="shrink-0 rounded-full bg-amber-500/15 text-amber-700 text-[9px] font-bold uppercase tracking-wider px-1.5 py-px">
                            Setup pending
                          </span>
                        )}
                      </div>
                      {item.meta && <span className="text-xs text-muted-foreground truncate">{item.meta}</span>}
                      {item.warning && <span className="text-[10px] text-amber-700 truncate">{item.warning}</span>}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
