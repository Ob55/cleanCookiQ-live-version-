import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Verify caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify the caller has an admin role
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

    const { userId } = await req.json();
    if (!userId) throw new Error("userId is required");

    // Delete all user data in order (child tables first)
    const tables = [
      { table: "notifications", col: "user_id" },
      { table: "support_tickets", col: "raised_by" },
      { table: "financing_applications", col: "created_by" },
      { table: "expressions_of_interest", col: "created_by" },
      { table: "rfq_responses", col: "created_by" },
      { table: "procurement_rfqs", col: "created_by" },
      { table: "institution_documents", col: "uploaded_by" },
      { table: "institution_selected_products", col: "created_by" },
      { table: "institution_selected_services", col: "created_by" },
      { table: "institution_needs", col: "created_by" },
      { table: "assessments", col: "created_by" },
      { table: "readiness_scores", col: "created_by" },
      { table: "dmrv_records", col: "created_by" },
      { table: "funder_institution_links", col: "created_by" },
      { table: "funder_profiles", col: "user_id" },
      { table: "provider_documents", col: "uploaded_by" },
      { table: "provider_products", col: "created_by" },
      { table: "provider_services", col: "created_by" },
      { table: "supplier_interest", col: "user_id" },
      { table: "institutions", col: "created_by" },
      { table: "providers", col: "created_by" },
      { table: "user_roles", col: "user_id" },
      { table: "profiles", col: "user_id" },
    ];

    for (const { table, col } of tables) {
      await supabaseAdmin.from(table).delete().eq(col, userId);
    }

    // Finally delete the auth user
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("delete-user error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
