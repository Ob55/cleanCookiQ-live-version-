import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Users, Check, X, Loader2, Trash2, Search } from "lucide-react";
import { sendEmail, emailAccountApproved, emailAccountRejected } from "@/lib/emailService";

type AdminUser = {
  user_id: string;
  email: string | null;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  auth_created_at: string;
  profile_id: string | null;
  full_name: string | null;
  phone: string | null;
  org_type: string | null;
  org_name: string | null;
  approval_status: string | null;
  created_at: string;
  has_profile: boolean;
  source: "auth" | "orphan_profile";
};

type ListUsersResponse = {
  users: AdminUser[];
  counts: {
    total: number;
    auth_users: number;
    profiles: number;
    missing_profile: number;
    orphan_profiles: number;
  };
};

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<{ userId: string; name: string } | null>(null);
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-users-all"],
    queryFn: async (): Promise<ListUsersResponse> => {
      const { data, error } = await supabase.functions.invoke("list-users");
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as ListUsersResponse;
    },
  });
  const users = data?.users;
  const counts = data?.counts;

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
      queryClient.invalidateQueries({ queryKey: ["admin-users-all"] });
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
      queryClient.invalidateQueries({ queryKey: ["admin-users-all"] });
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

  const filtered = (users ?? []).filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.email?.toLowerCase().includes(q) ||
      u.full_name?.toLowerCase().includes(q) ||
      u.org_name?.toLowerCase().includes(q) ||
      u.org_type?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground">
            Every signed-up user.
            {counts ? (
              <>
                {" "}
                <strong>{counts.total}</strong> total
                {" — "}
                {counts.auth_users} auth, {counts.profiles} profiles
                {counts.missing_profile > 0 && (
                  <span className="text-amber-700"> · {counts.missing_profile} missing profile</span>
                )}
                {counts.orphan_profiles > 0 && (
                  <span className="text-amber-700"> · {counts.orphan_profiles} orphan profile</span>
                )}
              </>
            ) : null}
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email, name, org…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-72"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Failed to load users: {(error as Error).message}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground p-3">User</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Email</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Type</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Joined</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.user_id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{u.full_name || "Unnamed"}</p>
                        <p className="text-xs text-muted-foreground">{u.org_name || u.phone || ""}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="text-sm">{u.email || "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {u.email_confirmed_at ? "Verified" : "Unverified"}
                    </div>
                  </td>
                  <td className="p-3 text-sm capitalize">{u.org_type || "—"}</td>
                  <td className="p-3">
                    {u.has_profile ? (
                      <Badge variant="secondary" className={statusColors[u.approval_status ?? ""] || ""}>
                        {u.approval_status ?? "—"}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700">No profile</Badge>
                    )}
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      {u.has_profile && u.approval_status !== "approved" && (
                        <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ userId: u.user_id, status: "approved", name: u.full_name || "" })}>
                          <Check className="h-4 w-4 text-primary" />
                        </Button>
                      )}
                      {u.has_profile && u.approval_status !== "rejected" && (
                        <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ userId: u.user_id, status: "rejected", name: u.full_name || "" })}>
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteTarget({ userId: u.user_id, name: u.full_name || u.email || "this user" })}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">
                    {search ? "No users match your search." : "No users found."}
                  </td>
                </tr>
              )}
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
