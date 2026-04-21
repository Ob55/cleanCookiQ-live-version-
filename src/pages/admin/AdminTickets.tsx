import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Ticket, Send, MessageSquare, AlertTriangle, CheckCircle } from "lucide-react";
import { sendEmail, emailTicketResolved } from "@/lib/emailService";

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

export default function AdminTickets() {
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["admin-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

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

  const sendReply = useMutation({
    mutationFn: async () => {
      if (!selectedTicket) return;
      // Update ticket with reply and mark resolved
      const { error } = await supabase
        .from("support_tickets")
        .update({
          admin_reply: replyText,
          status: "resolved" as any,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", selectedTicket.id);
      if (error) throw error;

      // Send in-app notification
      if (selectedTicket.raised_by) {
        await supabase.from("notifications").insert({
          user_id: selectedTicket.raised_by,
          title: "Ticket Resolved: " + selectedTicket.title,
          body: replyText,
        });
      }

      // Send email notification
      if (selectedTicket.raised_by_email) {
        await sendEmail({
          to: selectedTicket.raised_by_email,
          subject: `Support Ticket Resolved: ${selectedTicket.title}`,
          html: emailTicketResolved(
            selectedTicket.raised_by_name || "",
            selectedTicket.title,
            replyText,
          ),
        });
      }
    },
    onSuccess: () => {
      toast.success("Reply sent and ticket resolved");
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      setReplyDialogOpen(false);
      setReplyText("");
      setSelectedTicket(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const ticketsByStatus = (status: string) => tickets?.filter(t => t.status === status) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Ticket className="h-6 w-6 text-primary" /> Support Tickets
        </h1>
        <p className="text-sm text-muted-foreground">Manage and respond to user support requests</p>
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
                <Card key={t.id} className="shadow-card">
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
                      <p>{new Date(t.created_at).toLocaleDateString()}</p>
                    </div>

                    {t.admin_reply && (
                      <div className="bg-primary/5 border border-primary/20 rounded p-2">
                        <p className="text-xs font-medium text-primary">Reply sent:</p>
                        <p className="text-xs text-muted-foreground">{t.admin_reply}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      {status !== "resolved" && (
                        <>
                          {status === "open" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => updateStatus.mutate({ id: t.id, status: "in_progress" })}
                            >
                              In Progress
                            </Button>
                          )}
                          <Button
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => {
                              setSelectedTicket(t);
                              setReplyText("");
                              setReplyDialogOpen(true);
                            }}
                          >
                            <MessageSquare className="h-3 w-3 mr-1" /> Reply & Resolve
                          </Button>
                        </>
                      )}
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

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" /> Reply to Ticket
            </DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4 mt-2">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm font-medium">{selectedTicket.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{selectedTicket.description}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  From: {selectedTicket.raised_by_name} ({selectedTicket.raised_by_email})
                </p>
              </div>
              <div>
                <Textarea
                  placeholder="Write your reply to the user…"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  className="min-h-[150px]"
                />
              </div>
              <Button
                className="w-full"
                onClick={() => sendReply.mutate()}
                disabled={!replyText.trim() || sendReply.isPending}
              >
                {sendReply.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Reply & Resolve
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
