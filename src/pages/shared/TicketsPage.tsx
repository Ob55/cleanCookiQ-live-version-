import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sbAny } from "@/lib/sbAny";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Send, Loader2, Ticket, MessageSquare, ChevronRight } from "lucide-react";
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

export default function TicketsPage() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState<any | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>("medium");
  const [reply, setReply] = useState("");

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["my-tickets", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("raised_by", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["ticket-messages", activeTicket?.id],
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

  // Realtime: refresh messages when a staff reply lands.
  useEffect(() => {
    if (!activeTicket) return;
    const channel = supabase
      .channel(`ticket-messages-${activeTicket.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ticket_messages", filter: `ticket_id=eq.${activeTicket.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["ticket-messages", activeTicket.id] });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeTicket, queryClient]);

  const createTicket = useMutation({
    mutationFn: async () => {
      const { data: ticket, error } = await supabase.from("support_tickets").insert({
        title,
        description,
        priority: priority as any,
        raised_by: user!.id,
        raised_by_email: user!.email,
        raised_by_name: profile?.full_name || user!.email,
        raised_by_role: profile?.org_type || "unknown",
        project_id: null,
      }).select().single();
      if (error) throw error;

      // First message = ticket description, so the conversation has a starting point.
      await sbAny.from("ticket_messages").insert({
        ticket_id: (ticket as any).id,
        author_id: user!.id,
        author_role: "user",
        author_name: profile?.full_name || user!.email,
        body: description,
      });
    },
    onSuccess: () => {
      toast.success("Ticket submitted");
      queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
      setCreateOpen(false);
      setTitle("");
      setDescription("");
      setPriority("medium");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const postReply = useMutation({
    mutationFn: async () => {
      if (!activeTicket || !reply.trim()) return;
      const { error } = await sbAny.from("ticket_messages").insert({
        ticket_id: activeTicket.id,
        author_id: user!.id,
        author_role: "user",
        author_name: profile?.full_name || user!.email,
        body: reply.trim(),
      });
      if (error) throw error;

      // If the ticket was resolved/closed, reopen it on user reply.
      if (activeTicket.status === "resolved" || activeTicket.status === "closed") {
        await supabase.from("support_tickets")
          .update({ status: "open" })
          .eq("id", activeTicket.id);
      }
    },
    onSuccess: () => {
      setReply("");
      queryClient.invalidateQueries({ queryKey: ["ticket-messages", activeTicket?.id] });
      queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Ticket className="h-6 w-6 text-primary" /> Support Tickets
          </h1>
          <p className="text-sm text-muted-foreground">Submit and track your support requests</p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> New Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" /> Submit a Support Ticket
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>Subject</Label>
                <Input
                  placeholder="Brief summary of your issue…"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Message</Label>
                <Textarea
                  placeholder="Describe your issue in detail."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="mt-1 min-h-[150px]"
                />
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={() => createTicket.mutate()}
                disabled={!title.trim() || !description.trim() || createTicket.isPending}
              >
                {createTicket.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Ticket
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !tickets?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Ticket className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No tickets yet. Click "New Ticket" to submit a support request.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map(ticket => (
            <Card
              key={ticket.id}
              className="cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => setActiveTicket(ticket)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{ticket.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${priorityColors[ticket.priority]}`}>{ticket.priority}</Badge>
                    <Badge className={`text-xs ${statusColors[ticket.status]}`}>{ticket.status.replace(/_/g, " ")}</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">{ticket.description}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Last activity {formatDistanceToNow(new Date(ticket.updated_at || ticket.created_at), { addSuffix: true })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Conversation drawer */}
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
                <div className="flex items-center gap-2 pt-1">
                  <Badge className={`text-xs ${priorityColors[activeTicket.priority]}`}>{activeTicket.priority}</Badge>
                  <Badge className={`text-xs ${statusColors[activeTicket.status]}`}>{activeTicket.status.replace(/_/g, " ")}</Badge>
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
                          {m.author_role === "staff" ? "Support" : (m.author_name || "You")}
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
                  placeholder="Type your reply…"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  className="min-h-[80px]"
                />
                <Button
                  className="w-full"
                  onClick={() => postReply.mutate()}
                  disabled={!reply.trim() || postReply.isPending}
                >
                  {postReply.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send reply
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
