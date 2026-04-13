import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Package, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
}

export default function SupplierProducts() {
  const { user, profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (!profile?.organisation_id) return;
    const load = async () => {
      const { data: prov } = await supabase
        .from("providers")
        .select("id")
        .eq("organisation_id", profile.organisation_id!)
        .maybeSingle();
      if (prov) {
        setProviderId(prov.id);
        const { data } = await supabase
          .from("provider_products")
          .select("*")
          .eq("provider_id", prov.id)
          .order("created_at", { ascending: false });
        setProducts(data ?? []);
      }
      setLoading(false);
    };
    load();
  }, [profile]);

  const handleAdd = async () => {
    if (!providerId || !user || !form.name.trim()) return;
    setSaving(true);

    let imageUrl: string | null = null;
    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `products/${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("supplier-assets").upload(path, imageFile);
      if (upErr) { toast.error("Image upload failed"); setSaving(false); return; }
      const { data: urlData } = supabase.storage.from("supplier-assets").getPublicUrl(path);
      imageUrl = urlData.publicUrl;
    }

    const { data, error } = await supabase.from("provider_products").insert({
      provider_id: providerId,
      name: form.name.trim(),
      description: form.description || null,
      price: form.price ? parseFloat(form.price) : null,
      image_url: imageUrl,
      created_by: user.id,
    }).select().single();

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setProducts(prev => [data, ...prev]);
    setForm({ name: "", description: "", price: "" });
    setImageFile(null);
    setDialogOpen(false);
    toast.success("Product added!");
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("provider_products").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setProducts(prev => prev.filter(p => p.id !== id));
    toast.success("Product removed");
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Products</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your product listings</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Product</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Product Name</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Solar Cook Stove 500W" className="mt-1" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the product..." className="mt-1" rows={3} />
              </div>
              <div>
                <Label>Price (KSh)</Label>
                <Input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="e.g. 45000" className="mt-1" />
              </div>
              <div>
                <Label>Product Image</Label>
                <Input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] ?? null)} className="mt-1" />
              </div>
              <Button onClick={handleAdd} className="w-full" disabled={saving || !form.name.trim()}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Add Product
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
          <Package className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground font-medium">No products yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add your first product to showcase to institutions</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <div key={product.id} className="group border border-border rounded-xl overflow-hidden bg-card hover:shadow-lg transition-shadow">
              <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-10 w-10 text-muted-foreground/30" />
                  </div>
                )}
                <button
                  onClick={() => handleDelete(product.id)}
                  className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-sm truncate">{product.name}</h3>
                {product.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
                )}
                {product.price != null && (
                  <p className="text-sm font-bold text-primary mt-2">
                    KSh {product.price.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
