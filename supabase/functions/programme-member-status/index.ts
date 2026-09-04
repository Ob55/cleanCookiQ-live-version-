import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";

// Read-only: returns each programme member's invite status so the UI can show a
// Pending / Active badge.
//
//   Body: { programme_id }
//   Returns: { statuses: { [member_id]: "pending" | "active" } }
//
// "active"  = the auth user has signed in at least once (last_sign_in_at set) —
//             i.e. they've set their password.
// "pending" = never signed in — the invite is outstanding.
serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return json({ error: "Unauthorized" }, 401);

    const { programme_id } = await req.json().catch(() => ({}));
    if (!programme_id) return json({ error: "programme_id is required" }, 400);

    // Authorize: caller must be host (admin/manager) or the programme's manager.
    const { data: callerRoles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", caller.id);
    const isHost = callerRoles?.some((r: { role: string }) => ["admin", "manager"].includes(r.role));
    if (!isHost) {
      const { data: prog } = await supabaseAdmin.from("programmes").select("programme_manager_id").eq("id", programme_id).maybeSingle();
      if (!prog || prog.programme_manager_id !== caller.id) {
        return json({ error: "Forbidden: host or programme manager only" }, 403);
      }
    }

    const { data: members, error: membersErr } = await supabaseAdmin
      .from("programme_members")
      .select("id, user_id")
      .eq("programme_id", programme_id);
    if (membersErr) throw membersErr;

    const statuses: Record<string, "pending" | "active"> = {};
    for (const m of members ?? []) {
      const { data: target } = await supabaseAdmin.auth.admin.getUserById(m.user_id);
      statuses[m.id] = target?.user?.last_sign_in_at ? "active" : "pending";
    }

    return json({ statuses });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("programme-member-status error:", message);
    return json({ error: message }, 500);
  }
});
