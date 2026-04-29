import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Users, Check, X, Loader2, Trash2 } from "lucide-react";
import { sendEmail, emailAccountApproved, emailAccountRejected } from "@/lib/emailService";

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<{ userId: string; name: string } | null>(null);

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ userId, status, name }: { userId: string; status: string; name: string }) => {
      const { error } = await supabase.from("profiles").update({ approval_status: status as any }).eq("user_id", userId);
      if (error) throw error;

      const appUrl = window.location.origin;
      if (status === "approved") {
        await sendEmail({
          userId,
          subject: "Your cleancookIQ Account Has Been Approved",
          html: emailAccountApproved(name, appUrl),
        });
      } else if (status === "rejected") {
        await sendEmail({
          userId,
          subject: "cleancookIQ Account Application Update",
          html: emailAccountRejected(name),
        });
      }
    },
    onSuccess: () => {
      toast.success("User status updated");
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.functions.invoke("delete-user", { body: { userId } });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("User and all their data deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      setDeleteTarget(null);
    },
    onError: (e: any) => {
      toast.error(e.message || "Failed to delete user");
      setDeleteTarget(null);
    },
  });

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-primary/20 text-primary",
    rejected: "bg-destructive/20 text-destructive",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">User Management</h1>
        <p className="text-sm text-muted-foreground">Manage user accounts and approval status</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Name</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Type</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Joined</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles?.map(p => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{p.full_name || "Unnamed"}</p>
                        <p className="text-xs text-muted-foreground">{p.phone || ""}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-sm capitalize">{p.org_type || "—"}</td>
                  <td className="p-3">
                    <Badge variant="secondary" className={statusColors[p.approval_status] || ""}>{p.approval_status}</Badge>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      {p.approval_status !== "approved" && (
                        <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ userId: p.user_id, status: "approved", name: p.full_name || "" })}>
                          <Check className="h-4 w-4 text-primary" />
                        </Button>
                      )}
                      {p.approval_status !== "rejected" && (
                        <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ userId: p.user_id, status: "rejected", name: p.full_name || "" })}>
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteTarget({ userId: p.user_id, name: p.full_name || "this user" })}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the account and <strong>all associated data</strong> — profile, roles, institution/supplier records, documents, tickets, and everything else. The user will need to sign up again from scratch.
              <br /><br />
              <span className="text-destructive font-medium">This cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteUser.mutate(deleteTarget.userId)}
              disabled={deleteUser.isPending}
            >
              {deleteUser.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Yes, delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
