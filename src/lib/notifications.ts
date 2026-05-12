import { supabase } from "@/integrations/supabase/client";
import { sbAny } from "@/lib/sbAny";

/**
 * Notification primitives.
 *
 * RLS (after the 2026-05-12 security hardening):
 *   - A user can only insert notifications addressed to themselves.
 *   - Cross-user notifications must go through SECURITY DEFINER RPCs
 *     (`notify_role`, `notify_user`) so callers cannot fabricate
 *     notifications for arbitrary user_ids.
 *
 * sendNotification(self) is the only direct-insert path retained,
 * for self-addressed reminders. Cross-user paths use RPCs.
 */

/** Self-addressed notification — only valid when userId === auth.uid(). */
export async function sendNotification(userId: string, title: string, body: string) {
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    title,
    body,
  });
  if (error) console.error("Failed to send notification:", error);
}

/** Notify every user with the `admin` role. SECURITY DEFINER on the DB side. */
export async function notifyAdmins(title: string, body: string) {
  const { error } = await sbAny.rpc("notify_role", {
    target_role: "admin",
    notif_title: title,
    notif_body: body,
  });
  if (error) console.error("Failed to notify admins:", error);
}

/** Notify every user with the `financing_partner` role. */
export async function notifyFunders(title: string, body: string) {
  const { error } = await sbAny.rpc("notify_role", {
    target_role: "financing_partner",
    notif_title: title,
    notif_body: body,
  });
  if (error) console.error("Failed to notify funders:", error);
}

/**
 * Notify the user who created an institution. The current implementation
 * is admin/manager-only because notify_user is RBAC-gated. Non-admin
 * flows that need to message an institution owner must add a per-feature
 * SECURITY DEFINER RPC (e.g. one that validates the caller's relationship
 * to the institution) — never a wide-open insert.
 */
export async function notifyInstitutionOwner(institutionId: string, title: string, body: string) {
  const { data: inst } = await supabase
    .from("institutions")
    .select("created_by")
    .eq("id", institutionId)
    .single();
  if (!inst?.created_by) return;
  const { error } = await sbAny.rpc("notify_user", {
    target_user_id: inst.created_by,
    notif_title: title,
    notif_body: body,
  });
  if (error) console.error("Failed to notify institution owner:", error);
}
