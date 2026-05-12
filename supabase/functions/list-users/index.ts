import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

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
    if (!caller) throw new Error("Unauthorized");

    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    const adminRoles = ["admin", "manager"];
    const isAdmin = callerRoles?.some((r: any) => adminRoles.includes(r.role));
    if (!isAdmin) throw new Error("Forbidden: admin only");

    // Page through every auth user (perPage=1000 is the Supabase Auth admin max)
    const authUsers: any[] = [];
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      authUsers.push(...data.users);
      if (data.users.length < perPage) break;
      page += 1;
      if (page > 100) break; // safety cap (100k users)
    }

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("*");
    if (profilesError) throw profilesError;

    const profilesByUserId = new Map<string, any>();
    for (const p of profiles ?? []) profilesByUserId.set(p.user_id, p);

    const seenUserIds = new Set<string>();
    const merged = authUsers.map((u) => {
      seenUserIds.add(u.id);
      const p = profilesByUserId.get(u.id);
      return {
        user_id: u.id,
        email: u.email ?? p?.email ?? null,
        email_confirmed_at: u.email_confirmed_at ?? null,
        last_sign_in_at: u.last_sign_in_at ?? null,
        auth_created_at: u.created_at,
        profile_id: p?.id ?? null,
        full_name: p?.full_name ?? u.user_metadata?.full_name ?? null,
        phone: p?.phone ?? u.user_metadata?.phone ?? null,
        org_type: p?.org_type ?? u.user_metadata?.org_type ?? null,
        org_name: p?.org_name ?? u.user_metadata?.org_name ?? null,
        approval_status: p?.approval_status ?? null,
        created_at: p?.created_at ?? u.created_at,
        has_profile: !!p,
        source: "auth" as const,
      };
    });

    // Catch any profile rows whose auth user is missing (orphan profiles)
    for (const p of profiles ?? []) {
      if (seenUserIds.has(p.user_id)) continue;
      merged.push({
        user_id: p.user_id,
        email: p.email ?? null,
        email_confirmed_at: null,
        last_sign_in_at: null,
        auth_created_at: p.created_at,
        profile_id: p.id,
        full_name: p.full_name ?? null,
        phone: p.phone ?? null,
        org_type: p.org_type ?? null,
        org_name: p.org_name ?? null,
        approval_status: p.approval_status ?? null,
        created_at: p.created_at,
        has_profile: true,
        source: "orphan_profile" as const,
      });
    }

    // Newest first
    merged.sort((a, b) => new Date(b.auth_created_at).getTime() - new Date(a.auth_created_at).getTime());

    console.log(`list-users: returning ${merged.length} users (${authUsers.length} auth + ${merged.length - authUsers.length} orphan profiles)`);

    return new Response(JSON.stringify({
      users: merged,
      counts: {
        total: merged.length,
        auth_users: authUsers.length,
        profiles: profiles?.length ?? 0,
        missing_profile: authUsers.filter((u) => !profilesByUserId.has(u.id)).length,
        orphan_profiles: merged.length - authUsers.length,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("list-users error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
