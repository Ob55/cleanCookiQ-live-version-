import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { smtpTransport, smtpFrom } from "../_shared/smtp.ts";

// Adds an authorized user to a programme (tenant) by email + role.
//
//   * If the email already has a CleanCookIQ account -> add membership and
//     email them a note that they now have access.
//   * If it does NOT (and a name is supplied) -> create the account, add
//     membership, and email an invite LINK. Clicking it opens the set-password
//     page (email + confirm); once set, that becomes their real password and
//     they land in their project. Uses the project's own SMTP.
const FROM = smtpFrom();

// Human-readable role labels used in the invite email (mirrors the frontend).
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

    const { programme_id, email, role, full_name, org_name, app_url } = await req.json().catch(() => ({}));
    if (!programme_id || !email) return json({ error: "programme_id and email are required" }, 400);

    const allowedRoles = ["programme_lead", "programme_editor", "programme_viewer", "county_pipeline_viewer"];
    const memberRole = allowedRoles.includes(role) ? role : "programme_viewer";
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

    // Resolve the email to an existing auth user.
    const normalizedEmail = String(email).trim().toLowerCase();
    let targetUserId: string | null = null;
    let page = 1;
    const perPage = 1000;
    while (!targetUserId) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      const match = data.users.find((u) => (u.email ?? "").toLowerCase() === normalizedEmail);
      if (match) targetUserId = match.id;
      if (data.users.length < perPage) break;
      page += 1;
      if (page > 100) break;
    }

    let created = false;
    if (!targetUserId) {
      if (!full_name || !String(full_name).trim()) {
        return json({ error: `No account found for ${normalizedEmail}. Provide a name to invite them.` }, 404);
      }
      const { data: createdUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: true,
        // A random placeholder; the user sets their real password via the link.
        password: crypto.randomUUID() + "Aa1!",
        user_metadata: {
          full_name: String(full_name).trim(),
          org_name: org_name ? String(org_name).trim() : null,
          org_type: "other",
        },
      });
      if (createErr) throw createErr;
      targetUserId = createdUser.user.id;
      created = true;

      await supabaseAdmin.from("profiles").update({
        approval_status: "approved",
        org_type: "other",
        full_name: String(full_name).trim(),
        org_name: org_name ? String(org_name).trim() : null,
        email: normalizedEmail,
      }).eq("user_id", targetUserId);
    }

    // Upsert membership.
    const { data: member, error: insertErr } = await supabaseAdmin
      .from("programme_members")
      .upsert(
        { programme_id, user_id: targetUserId, role: memberRole, invited_email: normalizedEmail, created_by: caller.id },
        { onConflict: "programme_id,user_id" },
      )
      .select("id, programme_id, user_id, role, invited_email")
      .single();
    if (insertErr) throw insertErr;

    // Project name for the email copy.
    const { data: prog } = await supabaseAdmin.from("programmes").select("name").eq("id", programme_id).maybeSingle();
    const projectName = prog?.name ?? "a project";

    let emailSent = false;
    try {
      const transporter = smtpTransport();
      if (created) {
        // New user: send a set-password link (recovery link → /auth/reset-password).
        const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
          type: "recovery",
          email: normalizedEmail,
          options: { redirectTo: `${appUrl}/auth/reset-password` },
        });
        if (linkErr) throw linkErr;
        const actionLink = linkData?.properties?.action_link;
        await transporter.sendMail({
          from: FROM,
          to: normalizedEmail,
          subject: `You've been added to ${projectName} on CleanCookIQ`,
          html: `
            <p>Hello${full_name ? " " + String(full_name).trim() : ""},</p>
            <p>You've been added to <strong>${projectName}</strong> on CleanCookIQ as <strong>${ROLE_LABELS[memberRole] ?? memberRole}</strong>.</p>
            <p>Click below to set your password and sign in. After you set it, that's the password you'll use to log in from then on — and you'll only see this project.</p>
            <p><a href="${actionLink}" style="display:inline-block;padding:10px 18px;background:#00712D;color:#fff;text-decoration:none;border-radius:6px">Set your password &amp; sign in</a></p>
            <p style="color:#888;font-size:12px">If the button doesn't work, copy this link into your browser:<br>${actionLink}</p>
          `,
        });
      } else {
        // Existing user: just let them know, with a sign-in link.
        await transporter.sendMail({
          from: FROM,
          to: normalizedEmail,
          subject: `You've been added to ${projectName} on CleanCookIQ`,
          html: `
            <p>Hello,</p>
            <p>You've been added to <strong>${projectName}</strong> on CleanCookIQ as <strong>${ROLE_LABELS[memberRole] ?? memberRole}</strong>.</p>
            <p>Sign in with your existing account to see it: <a href="${appUrl}/auth/login">${appUrl}/auth/login</a></p>
          `,
        });
      }
      emailSent = true;
    } catch (mailErr) {
      console.error("add-programme-member: email failed:", mailErr);
    }

    return json({ member, created, email_sent: emailSent });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("add-programme-member error:", message);
    return json({ error: message }, 500);
  }
});
