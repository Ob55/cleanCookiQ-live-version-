import { useMemo, useState } from "react";
import { Inbox, MailOpen } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface QuoteRequest {
  id: string;
  product_id: string | null;
  provider_id: string;
  buyer_user_id: string;
  buyer_county: string | null;
  quantity: number;
  message: string;
  status: "open" | "quoted" | "accepted" | "rejected" | "withdrawn" | "expired";
  quoted_amount: number | null;
  quoted_currency: string;
  quoted_at: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  open:      "bg-blue-100 text-blue-700",
  quoted:    "bg-amber-100 text-amber-700",
  accepted:  "bg-emerald-100 text-emerald-700",
  rejected:  "bg-red-100 text-red-700",
  withdrawn: "bg-slate-100 text-slate-700",
  expired:   "bg-slate-100 text-slate-700",
};

export default function SupplierQuotes() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const orgId = profile?.organisation_id ?? undefined;

  const { data: providerId } = useQuery({
    queryKey: ["supplier-provider-id", orgId],
    enabled: Boolean(orgId),
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from("providers")
        .select("id")
        .eq("organisation_id", orgId!)
        .limit(1);
      if (error) throw error;
      return data?.[0]?.id ?? null;
    },
  });

  const { data: requests, isLoading } = useQuery({
    queryKey: ["quote_requests", "supplier", providerId],
    enabled: Boolean(providerId),
    queryFn: async (): Promise<QuoteRequest[]> => {
      const { data, error } = (await (supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (col: string, v: unknown) => {
              order: (col: string, opts?: { ascending?: boolean }) => Promise<{
                data: QuoteRequest[] | null; error: unknown;
              }>;
            };
          };
        };
      })
        .from("quote_requests")
        .select("*")
        .eq("provider_id", providerId!)
        .order("created_at", { ascending: false }));
      if (error) throw error;
      return data ?? [];
    },
  });

  const respond = useMutation({
    mutationFn: async ({ id, status, amount }: { id: string; status: string; amount?: number | null }) => {
      const update: Record<string, unknown> = {
        status,
        ...(amount !== undefined && amount !== null
          ? { quoted_amount: amount, quoted_at: new Date().toISOString() }
          : {}),
        ...(status === "accepted" || status === "rejected" || status === "expired"
          ? { closed_at: new Date().toISOString() }
          : {}),
      };
      const { error } = await (supabase as unknown as {
        from: (t: string) => {
          update: (vals: unknown) => { eq: (col: string, v: unknown) => Promise<{ error: unknown }> };
        };
      })
        .from("quote_requests")
        .update(update)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quote_requests", "supplier", providerId] });
    },
  });

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<QuoteRequest | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [reply, setReply] = useState<string>("");

  const sorted = useMemo(() => requests ?? [], [requests]);

  const startQuote = (r: QuoteRequest) => {
    setActive(r);
    setAmount(r.quoted_amount?.toString() ?? "");
    setReply("");
    setOpen(true);
  };

  const submitQuote = async () => {
    if (!active) return;
    const a = Number(amount);
    if (!Number.isFinite(a) || a <= 0) { toast.error("Enter a positive quote amount."); return; }
    try {
      await respond.mutateAsync({ id: active.id, status: "quoted", amount: a });
      toast.success("Quote sent to buyer");
      setOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const reject = async (r: QuoteRequest) => {
    if (!confirm("Decline this RFQ?")) return;
    try { await respond.mutateAsync({ id: r.id, status: "rejected" }); toast.success("Declined"); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };

  if (!orgId) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-display font-bold">Quote requests</h1>
        <p className="text-muted-foreground text-sm">No organisation linked to your account yet.</p>
      </div>
    );
  }

  if (!providerId) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-display font-bold">Quote requests</h1>
        <p className="text-muted-foreground text-sm">Your organisation hasn't completed supplier setup yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Inbox className="h-6 w-6 text-primary" /> Quote Requests
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Buyer-submitted RFQs addressed to your products. Send a quote, accept, or decline.
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : sorted.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><MailOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />No requests in your inbox.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {sorted.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <CardTitle className="text-base">RFQ #{r.id.slice(0, 8)}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {r.buyer_county ?? "Unknown county"} · qty {r.quantity} · {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className={STATUS_COLORS[r.status] ?? ""}>{r.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="whitespace-pre-line text-muted-foreground italic">"{r.message}"</p>
                {r.quoted_amount && (
                  <p className="text-sm">
                    Last quote: <span className="font-medium">{r.quoted_currency} {r.quoted_amount.toLocaleString()}</span>
                    {r.quoted_at && <span className="text-xs text-muted-foreground"> on {new Date(r.quoted_at).toLocaleDateString()}</span>}
                  </p>
                )}
                {(r.status === "open" || r.status === "quoted") && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => startQuote(r)}>{r.quoted_amount ? "Update quote" : "Send quote"}</Button>
                    <Button size="sm" variant="outline" onClick={() => reject(r)}>Decline</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send a quote</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Quote amount (KSh)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Optional reply</Label>
              <Textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)}
                placeholder="Lead time, terms, anything else the buyer should know."/>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submitQuote} disabled={respond.isPending}>{respond.isPending ? "Sending..." : "Send quote"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
