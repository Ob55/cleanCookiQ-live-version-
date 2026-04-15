import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Plus, Send, Loader2, Ticket, MessageSquare } from "lucide-react";

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

export default function TicketsPage() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>("medium");

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["my-tickets", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("raised_by", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createTicket = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("support_tickets").insert({
        title,
        description,
        priority: priority as any,
        raised_by: user!.id,
        raised_by_email: user!.email,
        raised_by_name: profile?.full_name || user!.email,
        raised_by_role: profile?.org_type || "unknown",
        project_id: null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ticket submitted successfully");
      queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
      setOpen(false);
      setTitle("");
      setDescription("");
      setPriority("medium");
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

        <Dialog open={open} onOpenChange={setOpen}>
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
                  placeholder="Describe your issue in detail. Include any relevant information that can help us assist you…"
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
            <Card key={ticket.id} className={ticket.admin_reply ? "border-primary/30" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{ticket.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${priorityColors[ticket.priority]}`}>{ticket.priority}</Badge>
                    <Badge className={`text-xs ${statusColors[ticket.status]}`}>{ticket.status.replace(/_/g, " ")}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{ticket.description}</p>
                <p className="text-xs text-muted-foreground">
                  Submitted {new Date(ticket.created_at).toLocaleDateString()}
                </p>
                {ticket.admin_reply && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mt-2">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold text-primary">Admin Reply</span>
                    </div>
                    <p className="text-sm">{ticket.admin_reply}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
