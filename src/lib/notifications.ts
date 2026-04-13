import { supabase } from "@/integrations/supabase/client";

export async function sendNotification(userId: string, title: string, body: string) {
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    title,
    body,
  });
  if (error) console.error("Failed to send notification:", error);
}

export async function notifyAdmins(title: string, body: string) {
  const { data: adminRoles } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");
  if (!adminRoles?.length) return;
  const inserts = adminRoles.map((r) => ({ user_id: r.user_id, title, body }));
  const { error } = await supabase.from("notifications").insert(inserts);
  if (error) console.error("Failed to notify admins:", error);
}

export async function notifyFunders(title: string, body: string) {
  const { data: funderRoles } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "financing_partner");
  if (!funderRoles?.length) return;
  const inserts = funderRoles.map((r) => ({ user_id: r.user_id, title, body }));
  const { error } = await supabase.from("notifications").insert(inserts);
  if (error) console.error("Failed to notify funders:", error);
}

export async function notifyInstitutionOwner(institutionId: string, title: string, body: string) {
  const { data: inst } = await supabase
    .from("institutions")
    .select("created_by")
    .eq("id", institutionId)
    .single();
  if (inst?.created_by) {
    await sendNotification(inst.created_by, title, body);
  }
}
