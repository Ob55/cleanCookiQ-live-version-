import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Users, Check, X, Loader2, Trash2, Search, MailWarning, Send } from "lucide-react";
import { sendEmail, emailAccountApproved, emailAccountRejected } from "@/lib/emailService";
import { DownloadReportButton, dateColumn } from "@/components/admin/DownloadReportButton";

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
          subject: "Your CleanCookIQ Account Has Been Approved",
          html: emailAccountApproved(name, appUrl),
        });
      } else if (status === "rejected") {
        await sendEmail({
          userId,
          subject: "CleanCookIQ Account Application Update",
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
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email, name, org…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-72"
            />
          </div>
          <DownloadReportButton
            rows={users ?? []}
            columns={[
              { key: "full_name", label: "Full Name" },
              { key: "email", label: "Email" },
              { key: "phone", label: "Phone" },
              { key: "org_type", label: "Organisation Type" },
              { key: "org_name", label: "Organisation" },
              { key: "approval_status", label: "Approval Status" },
              dateColumn("created_at", "Joined"),
            ]}
            title="User Management"
            filename="users"
          />
        </div>
      </div>

      <UnverifiedRegistrationsPanel />

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

      {/* delete confirm */}
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

interface ListUsersRow {
  user_id: string;
  email: string | null;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  auth_created_at: string;
  full_name: string | null;
  org_name: string | null;
  org_type: string | null;
  has_profile: boolean;
  source: "auth" | "orphan_profile";
}

interface UnverifiedUser {
  id: string;
  email: string | null;
  full_name: string | null;
  org_name: string | null;
  org_type: string | null;
  created_at: string;
}

function UnverifiedRegistrationsPanel() {
  const queryClient = useQueryClient();
  const [nudgingId, setNudgingId] = useState<string | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["unverified-users"],
    queryFn: async (): Promise<UnverifiedUser[]> => {
      const { data: payload, error } = await supabase.functions.invoke("list-users");
      if (error) throw error;
      const rows = (payload?.users ?? []) as ListUsersRow[];
      // Filter to users whose email is NOT yet confirmed.
      // Skip orphan profiles (no auth row → can't send a verification link to them).
      return rows
        .filter((r) => !r.email_confirmed_at && r.source === "auth")
        .map((r) => ({
          id: r.user_id,
          email: r.email,
          full_name: r.full_name,
          org_name: r.org_name,
          org_type: r.org_type,
          created_at: r.auth_created_at,
        }))
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    },
  });

  const sendOne = async (userId: string) => {
    const { error } = await supabase.functions.invoke("nudge-unverified-user", {
      body: { userId },
    });
    if (error) throw error;
  };

  const nudgeOne = async (u: UnverifiedUser) => {
    setNudgingId(u.id);
    try {
      await sendOne(u.id);
      toast.success(`Reminder sent to ${u.email ?? "user"}`);
    } catch (e: any) {
      toast.error(e.message || "Could not send reminder");
    } finally {
      setNudgingId(null);
      // Refresh — the user may have verified between list & click
      queryClient.invalidateQueries({ queryKey: ["unverified-users"] });
    }
  };

  const nudgeAll = async () => {
    if (!data || data.length === 0) return;
    setBulkRunning(true);
    let ok = 0;
    let fail = 0;
    for (const u of data) {
      try {
        await sendOne(u.id);
        ok++;
      } catch {
        fail++;
      }
    }
    setBulkRunning(false);
    if (fail === 0) toast.success(`Reminder sent to ${ok} ${ok === 1 ? "person" : "people"}`);
    else toast.warning(`Sent ${ok} reminder${ok === 1 ? "" : "s"}, ${fail} failed`);
    queryClient.invalidateQueries({ queryKey: ["unverified-users"] });
  };

  return (
    <div className="bg-card border border-amber-200 rounded-xl shadow-card overflow-hidden">
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <MailWarning className="h-4 w-4 text-amber-700" />
          <p className="text-sm font-semibold text-amber-900">
            Unverified registrations
            {data ? <span className="ml-2 text-amber-700 font-normal">({data.length})</span> : null}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => refetch()} className="h-8 text-xs">
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={nudgeAll}
            disabled={bulkRunning || !data || data.length === 0}
            className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white"
          >
            {bulkRunning ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
            Send reminder to all
          </Button>
        </div>
      </div>

      <div className="p-4">
        <p className="text-xs text-muted-foreground mb-3">
          People who created an account but haven't yet clicked the verification link in their email.
          They don't appear on the platform until they verify. Click "Send reminder" to email them a
          fresh one-click sign-in link.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-amber-700" /></div>
        ) : error ? (
          <p className="text-sm text-destructive">Could not load unverified users. {(error as any).message}</p>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No unverified registrations. 🎉</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2 px-2">Name</th>
                  <th className="text-left py-2 px-2">Email</th>
                  <th className="text-left py-2 px-2">Org</th>
                  <th className="text-left py-2 px-2">Type</th>
                  <th className="text-left py-2 px-2">Registered</th>
                  <th className="text-right py-2 px-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="py-2 px-2">{u.full_name ?? "—"}</td>
                    <td className="py-2 px-2 font-mono text-xs">{u.email ?? "—"}</td>
                    <td className="py-2 px-2">{u.org_name ?? "—"}</td>
                    <td className="py-2 px-2 capitalize">{u.org_type ?? "—"}</td>
                    <td className="py-2 px-2 text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => nudgeOne(u)}
                        disabled={nudgingId === u.id || bulkRunning}
                        className="h-7 text-xs"
                      >
                        {nudgingId === u.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                        Send reminder
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
