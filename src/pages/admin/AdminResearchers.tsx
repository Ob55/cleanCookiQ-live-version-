import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, CheckCircle, XCircle, Trash2, Eye, FileText, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { format } from "date-fns";

export default function AdminResearchers() {
  const queryClient = useQueryClient();
  const [viewResearcher, setViewResearcher] = useState<any>(null);
  const [viewReports, setViewReports] = useState<{ researcher: any; reports: any[] } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const { data: researchers, isLoading } = useQuery({
    queryKey: ["admin-researchers"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, approval_status, created_at, email")
        .eq("org_type", "researcher")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Supplement with email + org_name from prime access tickets (fallback)
      const userIds = (profiles ?? []).map((p: any) => p.user_id);
      const emailFallback: Record<string, string> = {};
      const orgMap: Record<string, string> = {};

      if (userIds.length > 0) {
        const { data: tickets } = await supabase
          .from("support_tickets")
          .select("raised_by, raised_by_email, description")
          .in("raised_by", userIds)
          .ilike("title", "%Prime Access Request%");

        (tickets ?? []).forEach((t: any) => {
          if (t.raised_by && t.raised_by_email) emailFallback[t.raised_by] = t.raised_by_email;
          const match = t.description?.match(/from (.+?) is requesting/);
          if (match && t.raised_by) orgMap[t.raised_by] = match[1];
        });
      }

      return (profiles ?? []).map((p: any) => ({
        ...p,
        email: p.email || emailFallback[p.user_id] || "—",
        org_name: orgMap[p.user_id] || "—",
      }));
    },
  });

  const { data: accessRequests } = useQuery({
    queryKey: ["researcher-access-requests"],
    queryFn: async () => {
      const { data } = await supabase
        .from("support_tickets")
        .select("id, raised_by, raised_by_email, raised_by_name, status, created_at")
        .ilike("title", "%Prime Access Request%")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const fetchReports = async (userId: string) => {
    const { data } = await supabase
      .from("support_tickets")
      .select("id, title, description, created_at, status")
      .eq("raised_by", userId)
      .ilike("title", "%Research Report:%")
      .order("created_at", { ascending: false });
    return data ?? [];
  };

  const handleGrantAccess = async (userId: string, grant: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ approval_status: grant ? "approved" : "pending" })
      .eq("user_id", userId);

    if (error) { toast.error("Failed to update access"); return; }

    await supabase.from("notifications").insert({
      user_id: userId,
      title: grant ? "Prime Access Granted" : "Prime Access Revoked",
      body: grant
        ? "You have been granted prime access to institution data on CleanCookIQ."
        : "Your prime access to institution data has been revoked.",
    });

    queryClient.invalidateQueries({ queryKey: ["admin-researchers"] });
    toast.success(grant ? "Access granted" : "Access revoked");
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Delete this researcher? This cannot be undone.")) return;
    setDeleting(userId);
    await supabase.from("profiles").delete().eq("user_id", userId);
    queryClient.invalidateQueries({ queryKey: ["admin-researchers"] });
    setDeleting(null);
    toast.success("Researcher removed");
  };

  const handleViewReports = async (researcher: any) => {
    const reports = await fetchReports(researcher.user_id);
    setViewReports({ researcher, reports });
  };

  const pendingRequests = (accessRequests ?? []).filter(
    (r: any) => (researchers ?? []).some((res: any) => res.user_id === r.raised_by && res.approval_status === "pending")
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Researchers</h1>
        <p className="text-sm text-muted-foreground">Manage researcher accounts and access permissions.</p>
      </div>

      {/* Pending access requests banner */}
      {pendingRequests.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4 flex items-center gap-3">
            <FlaskConical className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800 font-medium">
              {pendingRequests.length} researcher{pendingRequests.length > 1 ? "s" : ""} requesting prime access — review below.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Researchers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !(researchers ?? []).length ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No researchers registered yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(researchers ?? []).map((r: any) => (
                  <TableRow key={r.user_id}>
                    <TableCell className="font-medium">{r.full_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.email}</TableCell>
                    <TableCell className="text-sm">{r.org_name}</TableCell>
                    <TableCell>
                      <Badge variant={r.approval_status === "approved" ? "default" : "secondary"}
                        className={r.approval_status === "approved" ? "bg-emerald-500 text-white" : ""}>
                        {r.approval_status === "approved" ? "Prime Access" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.created_at ? format(new Date(r.created_at), "d MMM yyyy") : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          title="View details"
                          onClick={() => setViewResearcher(r)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="View reports"
                          onClick={() => handleViewReports(r)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        {r.approval_status !== "approved" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Grant prime access"
                            className="text-emerald-600 hover:text-emerald-700"
                            onClick={() => handleGrantAccess(r.user_id, true)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Revoke prime access"
                            className="text-amber-600 hover:text-amber-700"
                            onClick={() => handleGrantAccess(r.user_id, false)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Delete researcher"
                          className="text-destructive hover:text-destructive"
                          disabled={deleting === r.user_id}
                          onClick={() => handleDelete(r.user_id)}
                        >
                          {deleting === r.user_id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Researcher Details Dialog */}
      <Dialog open={!!viewResearcher} onOpenChange={() => setViewResearcher(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Researcher Details</DialogTitle>
          </DialogHeader>
          {viewResearcher && (
            <div className="space-y-3 text-sm">
              <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{viewResearcher.full_name || "—"}</span></div>
              <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{viewResearcher.email}</span></div>
              <div><span className="text-muted-foreground">Organization:</span> <span className="font-medium">{viewResearcher.org_name}</span></div>
              <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{viewResearcher.phone || "—"}</span></div>
              <div><span className="text-muted-foreground">Status:</span>{" "}
                <Badge variant={viewResearcher.approval_status === "approved" ? "default" : "secondary"}
                  className={viewResearcher.approval_status === "approved" ? "bg-emerald-500 text-white" : ""}>
                  {viewResearcher.approval_status === "approved" ? "Prime Access" : "Pending"}
                </Badge>
              </div>
              <div><span className="text-muted-foreground">Joined:</span> <span className="font-medium">{viewResearcher.created_at ? format(new Date(viewResearcher.created_at), "d MMM yyyy") : "—"}</span></div>
              <div className="flex gap-2 pt-2">
                {viewResearcher.approval_status !== "approved" ? (
                  <Button size="sm" onClick={() => { handleGrantAccess(viewResearcher.user_id, true); setViewResearcher(null); }}>
                    <CheckCircle className="h-4 w-4 mr-1" /> Grant Prime Access
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => { handleGrantAccess(viewResearcher.user_id, false); setViewResearcher(null); }}>
                    <XCircle className="h-4 w-4 mr-1" /> Revoke Access
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Reports Dialog */}
      <Dialog open={!!viewReports} onOpenChange={() => setViewReports(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Reports from {viewReports?.researcher?.full_name || "Researcher"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {!(viewReports?.reports ?? []).length ? (
              <p className="text-sm text-muted-foreground text-center py-6">No reports submitted yet.</p>
            ) : (
              viewReports?.reports.map((report: any) => (
                <Card key={report.id}>
                  <CardContent className="p-3">
                    <p className="font-medium text-sm">{report.title.replace("📊 Research Report: ", "")}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(report.created_at), "d MMM yyyy")}</p>
                    {report.description && (
                      <p className="text-sm mt-2 text-muted-foreground line-clamp-3">{report.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
