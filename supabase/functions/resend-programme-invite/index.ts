import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { smtpTransport, smtpFrom } from "../_shared/smtp.ts";

// Resends the "set your password" invite to programme members who have NOT yet
// set a password (i.e. never signed in). Members who have already set their
// password are skipped — we never re-send them the invite link.
//
//   Body: { programme_id, member_id?, app_url? }
//     - member_id omitted -> resend to every pending member of the programme.
//     - member_id given    -> resend to just that member (if pending).
//
// "Pending" = the auth user has never signed in (last_sign_in_at is null). Once
// they click the link and set a password they've signed in, so they're skipped.
const FROM = smtpFrom();

const ROLE_LABELS: Record<string, string> = {
  programme_lead: "Lead",
  programme_editor: "Editor",
  programme_viewer: "Viewer",
  county_pipeline_viewer: "County pipeline (read-only)",
};

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

    const { programme_id, member_id, app_url } = await req.json().catch(() => ({}));
    if (!programme_id) return json({ error: "programme_id is required" }, 400);

    const appUrl = (typeof app_url === "string" && app_url.startsWith("http") ? app_url : null)
      || (Deno.env.get("CORS_ALLOW_ORIGINS") || "").split(",")[0].trim()
      || "https://cleancookiq.com";

    // Authorize: caller must be host (admin/manager) or the programme's manager.
    const { data: callerRoles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", caller.id);
    const isHost = callerRoles?.some((r: { role: string }) => ["admin", "manager"].includes(r.role));
    if (!isHost) {
      const { data: prog } = await supabaseAdmin.from("programmes").select("programme_manager_id").eq("id", programme_id).maybeSingle();
      if (!prog || prog.programme_manager_id !== caller.id) {
        return json({ error: "Forbidden: host or programme manager only" }, 403);
      }
    }

    // Programme name for the email copy.
    const { data: prog } = await supabaseAdmin.from("programmes").select("name").eq("id", programme_id).maybeSingle();
    const projectName = prog?.name ?? "a project";

    // Load target members.
    let membersQuery = supabaseAdmin
      .from("programme_members")
      .select("id, user_id, role, invited_email")
      .eq("programme_id", programme_id);
    if (member_id) membersQuery = membersQuery.eq("id", member_id);
    const { data: members, error: membersErr } = await membersQuery;
    if (membersErr) throw membersErr;

    const transporter = smtpTransport();
    const results: { email: string | null; role: string; status: "sent" | "skipped" | "failed"; reason?: string }[] = [];

    for (const m of members ?? []) {
      const role = ROLE_LABELS[m.role] ?? m.role;
      // Resolve the auth user to check whether they've ever signed in.
      const { data: target, error: targetErr } = await supabaseAdmin.auth.admin.getUserById(m.user_id);
      const email = target?.user?.email ?? m.invited_email ?? null;
      if (targetErr || !target?.user) {
        results.push({ email, role, status: "failed", reason: "user not found" });
        continue;
      }
      if (target.user.last_sign_in_at) {
        // Already set a password / signed in — never re-send the invite.
        results.push({ email, role, status: "skipped", reason: "already set password" });
        continue;
      }
      if (!email) {
        results.push({ email, role, status: "failed", reason: "no email on file" });
        continue;
      }

      try {
        const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
          type: "recovery",
          email,
          options: { redirectTo: `${appUrl}/auth/reset-password` },
        });
        if (linkErr) throw linkErr;
        const actionLink = linkData?.properties?.action_link;
        const fullName = (target.user.user_metadata as { full_name?: string } | null)?.full_name ?? "";
        await transporter.sendMail({
          from: FROM,
          to: email,
          subject: `Reminder: set your password for ${projectName} on CleanCookIQ`,
          html: `
            <p>Hello${fullName ? " " + fullName : ""},</p>
            <p>You've been added to <strong>${projectName}</strong> on CleanCookIQ as <strong>${role}</strong>.</p>
            <p>You haven't set your password yet. Click below to set it and sign in. After you set it, that's the password you'll use to log in from then on — and you'll only see this project.</p>
            <p><a href="${actionLink}" style="display:inline-block;padding:10px 18px;background:#00712D;color:#fff;text-decoration:none;border-radius:6px">Set your password &amp; sign in</a></p>
            <p style="color:#888;font-size:12px">If the button doesn't work, copy this link into your browser:<br>${actionLink}</p>
          `,
        });
        results.push({ email, role, status: "sent" });
      } catch (mailErr) {
        console.error("resend-programme-invite: email failed:", mailErr);
        results.push({ email, role, status: "failed", reason: "email send failed" });
      }
    }

    const sent = results.filter((r) => r.status === "sent").length;
    const skipped = results.filter((r) => r.status === "skipped").length;
    const failed = results.filter((r) => r.status === "failed").length;
    return json({ results, sent, skipped, failed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("resend-programme-invite error:", message);
    return json({ error: message }, 500);
  }
});
