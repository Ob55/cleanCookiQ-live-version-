import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Handshake, Plus, Loader2, Check, X, Send, Inbox, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { sbAny as supabase } from "@/lib/sbAny";
import { useAuth } from "@/contexts/AuthContext";
import { DownloadReportButton, dateColumn } from "@/components/admin/DownloadReportButton";

type IntroStatus = "pending" | "accepted" | "declined" | "withdrawn";

type Intro = {
  id: string;
  requester_org_id: string;
  target_org_id: string;
  project_id: string | null;
  message: string;
  status: IntroStatus;
  responded_at: string | null;
  created_at: string;
  requester_org?: { name: string } | null;
  target_org?: { name: string } | null;
  project?: { id: string } | null;
};

type ComposeState = {
  target_org_id: string;
  project_id: string;
  message: string;
};

const EMPTY: ComposeState = { target_org_id: "", project_id: "", message: "" };

const statusBadge = (s: IntroStatus) => {
  switch (s) {
    case "pending": return <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-300">Pending</Badge>;
    case "accepted": return <Badge className="bg-primary/10 text-primary border-primary/30">Accepted</Badge>;
    case "declined": return <Badge variant="outline" className="text-muted-foreground">Declined</Badge>;
    case "withdrawn": return <Badge variant="outline" className="text-muted-foreground">Withdrawn</Badge>;
  }
};

export default function FunderCoinvestment() {
  const { profile } = useAuth();
  const myOrgId = profile?.organisation_id ?? null;
  const qc = useQueryClient();
  const [tab, setTab] = useState<"inbox" | "outbox">("inbox");
  const [composeOpen, setComposeOpen] = useState(false);
  const [compose, setCompose] = useState<ComposeState>(EMPTY);

  const { data: inbox, isLoading: loadingInbox } = useQuery({
    queryKey: ["coinvestment-inbox", myOrgId],
    enabled: !!myOrgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coinvestment_intros")
        .select("*, requester_org:organisations!requester_org_id(name), target_org:organisations!target_org_id(name)")
        .eq("target_org_id", myOrgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Intro[];
    },
  });

  const { data: outbox, isLoading: loadingOutbox } = useQuery({
    queryKey: ["coinvestment-outbox", myOrgId],
    enabled: !!myOrgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coinvestment_intros")
        .select("*, requester_org:organisations!requester_org_id(name), target_org:organisations!target_org_id(name)")
        .eq("requester_org_id", myOrgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Intro[];
    },
  });

  const { data: funderOrgs } = useQuery({
    queryKey: ["other-funder-orgs", myOrgId],
    enabled: !!myOrgId && composeOpen,
    queryFn: async () => {
      const { data } = await supabase
        .from("organisations")
        .select("id, name")
        .eq("org_type", "funder")
        .neq("id", myOrgId)
        .order("name");
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  const { data: projects } = useQuery({
    queryKey: ["funder-portfolio-projects", myOrgId],
    enabled: !!myOrgId && composeOpen,
    queryFn: async () => {
      const { data } = await supabase
        .from("funder_portfolio")
        .select("project_id, projects(id, opportunity_id, opportunities(title))")
        .eq("funder_org_id", myOrgId);
      return (data ?? []) as { project_id: string; projects: { id: string; opportunities: { title: string } | null } | null }[];
    },
  });

  const respond = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: IntroStatus }) => {
      const { error } = await supabase
        .from("coinvestment_intros")
        .update({ status, responded_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coinvestment-inbox", myOrgId] });
      qc.invalidateQueries({ queryKey: ["coinvestment-outbox", myOrgId] });
    },
  });

  const create = useMutation({
    mutationFn: async (values: ComposeState) => {
      if (!myOrgId) throw new Error("No funder organisation linked to your profile");
      const { error } = await supabase.from("coinvestment_intros").insert({
        requester_org_id: myOrgId,
        target_org_id: values.target_org_id,
        project_id: values.project_id || null,
        message: values.message,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coinvestment-outbox", myOrgId] });
      setComposeOpen(false);
      setCompose(EMPTY);
      toast.success("Intro sent");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to send"),
  });

  const handleAccept = (id: string) => respond.mutate({ id, status: "accepted" }, {
    onSuccess: () => toast.success("Intro accepted"),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Action failed"),
  });
  const handleDecline = (id: string) => respond.mutate({ id, status: "declined" }, {
    onSuccess: () => toast.success("Intro declined"),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Action failed"),
  });
  const handleWithdraw = (id: string) => respond.mutate({ id, status: "withdrawn" }, {
    onSuccess: () => toast.success("Intro withdrawn"),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Action failed"),
  });

  const handleSend = () => {
    if (!compose.target_org_id) { toast.error("Pick a co-investor"); return; }
    if (!compose.message.trim()) { toast.error("Add a message"); return; }
    create.mutate(compose);
  };

  if (!myOrgId) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-display font-bold">Co-investment</h1>
        <Card><CardContent className="py-8 text-center text-muted-foreground">
          Your profile is not linked to a funder organisation yet. Complete onboarding to use the co-investment feature.
        </CardContent></Card>
      </div>
    );
  }

  const list = tab === "inbox" ? inbox : outbox;
  const loading = tab === "inbox" ? loadingInbox : loadingOutbox;
  const pendingInboxCount = (inbox ?? []).filter(i => i.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Handshake className="h-6 w-6 text-primary" /> Co-investment
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Receive and send introductions to other funders for co-investing in pipeline projects.
          </p>
        </div>
        <div className="flex gap-2">
          <DownloadReportButton
            rows={list ?? []}
            columns={[
              { key: "requester_org", label: "From", format: (r) => r.requester_org?.name ?? "" },
              { key: "target_org", label: "To", format: (r) => r.target_org?.name ?? "" },
              { key: "project_id", label: "Project ID" },
              { key: "message", label: "Message" },
              { key: "status", label: "Status" },
              dateColumn("created_at", "Sent"),
              dateColumn("responded_at", "Responded"),
            ]}
            title={`Co-investment ${tab === "inbox" ? "Inbox" : "Sent"}`}
            filename={`coinvestment-${tab}`}
          />
          <Button onClick={() => { setCompose(EMPTY); setComposeOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> New intro
          </Button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setTab("inbox")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            tab === "inbox" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Inbox className="h-4 w-4" /> Inbox
          {pendingInboxCount > 0 && <Badge className="bg-amber-500 text-white">{pendingInboxCount}</Badge>}
        </button>
        <button
          onClick={() => setTab("outbox")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            tab === "outbox" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ArrowUpRight className="h-4 w-4" /> Sent
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (list ?? []).length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          {tab === "inbox" ? "No co-investment intros received yet." : "You haven't sent any intros yet."}
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {(list ?? []).map((intro) => {
            const counterpartName = tab === "inbox" ? intro.requester_org?.name : intro.target_org?.name;
            return (
              <Card key={intro.id}>
                <CardHeader className="flex-row items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">
                      {tab === "inbox" ? "From " : "To "}{counterpartName ?? "Unknown organisation"}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(intro.created_at).toLocaleString()}
                      {intro.project_id && ` · re: project ${intro.project_id.slice(0, 8)}`}
                    </p>
                  </div>
                  {statusBadge(intro.status)}
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{intro.message}</p>
                  {intro.status === "pending" && tab === "inbox" && (
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" onClick={() => handleAccept(intro.id)} disabled={respond.isPending}>
                        <Check className="h-4 w-4 mr-1" /> Accept
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDecline(intro.id)} disabled={respond.isPending}>
                        <X className="h-4 w-4 mr-1" /> Decline
                      </Button>
                    </div>
                  )}
                  {intro.status === "pending" && tab === "outbox" && (
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="outline" onClick={() => handleWithdraw(intro.id)} disabled={respond.isPending}>
                        Withdraw
                      </Button>
                    </div>
                  )}
                  {intro.responded_at && (
                    <p className="text-xs text-muted-foreground mt-3">
                      {intro.status === "accepted" ? "Accepted" : intro.status === "declined" ? "Declined" : "Withdrawn"} on{" "}
                      {new Date(intro.responded_at).toLocaleString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New co-investment intro</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Target funder *</Label>
              <select value={compose.target_org_id} onChange={(e) => setCompose({ ...compose, target_org_id: e.target.value })} className="w-full mt-1 text-sm rounded-md border border-input bg-background px-2 py-1.5">
                <option value="">Select co-investor…</option>
                {(funderOrgs ?? []).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Re: project (optional)</Label>
              <select value={compose.project_id} onChange={(e) => setCompose({ ...compose, project_id: e.target.value })} className="w-full mt-1 text-sm rounded-md border border-input bg-background px-2 py-1.5">
                <option value="">— No specific project —</option>
                {(projects ?? []).filter(p => !!p.projects).map(p => (
                  <option key={p.project_id} value={p.project_id}>
                    {p.projects?.opportunities?.title ?? p.project_id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Message *</Label>
              <Textarea
                rows={5}
                value={compose.message}
                onChange={(e) => setCompose({ ...compose, message: e.target.value })}
                placeholder="Brief context, ticket size you're proposing, deadline for response..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)}>Cancel</Button>
            <Button onClick={handleSend} disabled={create.isPending}>
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Send intro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
