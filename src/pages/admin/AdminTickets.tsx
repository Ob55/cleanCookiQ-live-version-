import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sbAny } from "@/lib/sbAny";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Ticket, Send, MessageSquare, AlertTriangle, CheckCircle } from "lucide-react";
import { DownloadReportButton, dateColumn } from "@/components/admin/DownloadReportButton";
import { formatDistanceToNow } from "date-fns";

const statusColors: Record<string, string> = {
  open: "bg-amber-100 text-amber-700",
  in_progress: "bg-blue-100 text-blue-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-muted text-muted-foreground",
};

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  critical: "bg-red-100 text-red-700",
};

interface TicketMessage {
  id: string;
  ticket_id: string;
  author_id: string | null;
  author_role: "user" | "staff";
  author_name: string | null;
  body: string;
  created_at: string;
}

export default function AdminTickets() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [activeTicket, setActiveTicket] = useState<any | null>(null);
  const [reply, setReply] = useState("");

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["admin-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["admin-ticket-messages", activeTicket?.id],
    queryFn: async () => {
      const { data, error } = await sbAny
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", activeTicket!.id)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as TicketMessage[];
    },
    enabled: !!activeTicket,
  });

  // Realtime: refresh when the user replies.
  useEffect(() => {
    if (!activeTicket) return;
    const channel = supabase
      .channel(`admin-ticket-${activeTicket.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ticket_messages", filter: `ticket_id=eq.${activeTicket.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-ticket-messages", activeTicket.id] });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeTicket, queryClient]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const update: any = { status };
      if (status === "resolved") update.resolved_at = new Date().toISOString();
      const { error } = await supabase.from("support_tickets").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const postReply = useMutation({
    mutationFn: async (opts: { resolve: boolean }) => {
      if (!activeTicket || !reply.trim()) return;
      const { error } = await sbAny.from("ticket_messages").insert({
        ticket_id: activeTicket.id,
        author_id: user!.id,
        author_role: "staff",
        author_name: profile?.full_name || "Support",
        body: reply.trim(),
      });
      if (error) throw error;

      // Move ticket to in_progress on first staff reply, or resolved if requested.
      const nextStatus = opts.resolve ? "resolved" : (activeTicket.status === "open" ? "in_progress" : activeTicket.status);
      const update: any = { status: nextStatus };
      if (opts.resolve) update.resolved_at = new Date().toISOString();
      await supabase.from("support_tickets").update(update).eq("id", activeTicket.id);
    },
    onSuccess: () => {
      setReply("");
      queryClient.invalidateQueries({ queryKey: ["admin-ticket-messages", activeTicket?.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      toast.success("Reply sent");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const ticketsByStatus = (status: string) => tickets?.filter(t => t.status === status) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Ticket className="h-6 w-6 text-primary" /> Support Tickets
          </h1>
          <p className="text-sm text-muted-foreground">Threaded conversations — replies notify users in-app</p>
        </div>
        <DownloadReportButton
          rows={tickets ?? []}
          columns={[
            { key: "title", label: "Title" },
            { key: "description", label: "Description" },
            { key: "priority", label: "Priority" },
            { key: "status", label: "Status" },
            { key: "raised_by_name", label: "Raised By" },
            { key: "raised_by_role", label: "Role" },
            dateColumn("created_at", "Created"),
            dateColumn("updated_at", "Last activity"),
            dateColumn("resolved_at", "Resolved"),
          ]}
          title="Support Tickets"
          filename="support-tickets"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {["open", "in_progress", "resolved"].map(status => (
            <div key={status} className="space-y-3">
              <h3 className="text-sm font-bold capitalize flex items-center gap-2">
                {status === "open" && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                {status === "in_progress" && <Loader2 className="h-4 w-4 text-blue-500" />}
                {status === "resolved" && <CheckCircle className="h-4 w-4 text-green-500" />}
                {status.replace(/_/g, " ")} ({ticketsByStatus(status).length})
              </h3>
              {ticketsByStatus(status).map(t => (
                <Card
                  key={t.id}
                  className="shadow-card cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => setActiveTicket(t)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{t.title}</CardTitle>
                      <Badge className={`text-[10px] ${priorityColors[t.priority]}`}>{t.priority}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {t.description && (
                      <p className="text-xs text-muted-foreground line-clamp-3">{t.description}</p>
                    )}
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>From: {(t as any).raised_by_name || "Unknown"}</p>
                      <p>Role: {(t as any).raised_by_role || "—"}</p>
                      <p>{formatDistanceToNow(new Date(t.updated_at || t.created_at), { addSuffix: true })}</p>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      {status === "open" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatus.mutate({ id: t.id, status: "in_progress" });
                          }}
                        >
                          Mark In Progress
                        </Button>
                      )}
                      <Button size="sm" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); setActiveTicket(t); }}>
                        <MessageSquare className="h-3 w-3 mr-1" /> Open thread
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {!ticketsByStatus(status).length && (
                <div className="bg-muted/30 border border-dashed border-border rounded-lg p-4 text-center">
                  <p className="text-xs text-muted-foreground">No tickets</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Threaded conversation drawer */}
      <Dialog
        open={!!activeTicket}
        onOpenChange={(v) => { if (!v) { setActiveTicket(null); setReply(""); } }}
      >
        <DialogContent className="sm:max-w-2xl">
          {activeTicket && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  {activeTicket.title}
                </DialogTitle>
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <Badge className={`text-xs ${priorityColors[activeTicket.priority]}`}>{activeTicket.priority}</Badge>
                  <Badge className={`text-xs ${statusColors[activeTicket.status]}`}>{activeTicket.status.replace(/_/g, " ")}</Badge>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {(activeTicket as any).raised_by_name} · {(activeTicket as any).raised_by_role}
                  </span>
                </div>
              </DialogHeader>

              <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1 mt-2">
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No messages yet.</p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-lg p-3 text-sm ${
                        m.author_role === "staff"
                          ? "bg-primary/5 border border-primary/15 ml-6"
                          : "bg-muted/60 mr-6"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-semibold ${m.author_role === "staff" ? "text-primary" : "text-foreground"}`}>
                          {m.author_role === "staff" ? (m.author_name || "Support") : (m.author_name || "User")}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-foreground/90">{m.body}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-border pt-3 mt-2 space-y-2">
                <Textarea
                  placeholder="Reply to the user…"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  className="min-h-[80px]"
                />
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={() => postReply.mutate({ resolve: false })}
                    disabled={!reply.trim() || postReply.isPending}
                  >
                    {postReply.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                    Send reply
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => postReply.mutate({ resolve: true })}
                    disabled={!reply.trim() || postReply.isPending}
                  >
                    Send & resolve
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
