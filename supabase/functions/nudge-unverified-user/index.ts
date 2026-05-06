import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.9";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_STYLE = `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;
  overflow:hidden;border:1px solid #e5e7eb;`;
const HEADER_STYLE = `background:#1a3c2e;padding:28px 32px;text-align:center;`;
const BODY_STYLE = `padding:32px;`;
const FOOTER_STYLE = `padding:20px 32px;background:#f9fafb;text-align:center;
  font-size:12px;color:#6b7280;`;
const BTN_STYLE = `display:inline-block;padding:12px 28px;background:#2d6a4f;
  color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;
  font-size:15px;margin-top:16px;`;

function reminderHtml(name: string, magicLink: string): string {
  const display = name?.trim() ? name : "there";
  return `
<!DOCTYPE html><html><body style="margin:0;padding:16px;background:#f3f4f6;">
<div style="${BASE_STYLE}">
  <div style="${HEADER_STYLE}">
    <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:700;">cleancookIQ</h1>
  </div>
  <div style="${BODY_STYLE}">
    <h2 style="color:#1a3c2e;margin-top:0;">Just one click to finish setting up your account</h2>
    <p style="color:#374151;line-height:1.6;">Hi ${display},</p>
    <p style="color:#374151;line-height:1.6;">
      We noticed you started signing up for cleancookIQ but haven't yet
      verified your email. Click the button below to confirm your address
      and head straight to your dashboard.
    </p>
    <p style="text-align:center;">
      <a href="${magicLink}" style="${BTN_STYLE}">Verify my email</a>
    </p>
    <p style="color:#6b7280;font-size:13px;margin-top:24px;">
      If the button doesn't work, copy and paste this link into your browser:<br/>
      <span style="word-break:break-all;color:#2d6a4f;">${magicLink}</span>
    </p>
    <p style="color:#6b7280;font-size:13px;margin-top:24px;">
      Trouble signing in? Reply to this email or contact us at
      <a href="mailto:info@ignis-innovation.com" style="color:#2d6a4f;">info@ignis-innovation.com</a>.
    </p>
  </div>
  <div style="${FOOTER_STYLE}">
    &copy; 2026 Ignis Innovation
  </div>
</div>
</body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify caller is an admin / manager
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

    const { userId, email: emailFromBody } = await req.json();
    if (!userId && !emailFromBody) throw new Error("userId or email is required");

    // Resolve target user details
    let targetEmail = emailFromBody as string | undefined;
    let targetName: string | null = null;

    if (userId) {
      const { data: { user: target }, error } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (error || !target) throw new Error("Could not find user");
      if (target.email_confirmed_at || target.confirmed_at) {
        throw new Error("This user has already verified their email.");
      }
      targetEmail = target.email ?? targetEmail;
      targetName = (target.user_metadata as any)?.full_name ?? null;
    }
    if (!targetEmail) throw new Error("Could not resolve user's email");

    // Generate a one-click sign-in link. Clicking it confirms their email.
    const appUrl = Deno.env.get("APP_URL") || "https://cleancookiq.com";
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: targetEmail,
      options: { redirectTo: `${appUrl}/auth/login` },
    });
    if (linkErr || !linkData?.properties?.action_link) {
      throw new Error(linkErr?.message || "Could not generate sign-in link");
    }
    const magicLink = linkData.properties.action_link;

    // Send branded reminder via SMTP
    const transporter = nodemailer.createTransport({
      host: Deno.env.get("SMTP_HOST") || "smtp.office365.com",
      port: parseInt(Deno.env.get("SMTP_PORT") || "587"),
      secure: false,
      auth: {
        user: Deno.env.get("SMTP_USERNAME"),
        pass: Deno.env.get("SMTP_PASSWORD"),
      },
      tls: { ciphers: "SSLv3" },
    });

    await transporter.sendMail({
      from: `"CleanCook IQ" <${Deno.env.get("SMTP_FROM") || "info@ignis-innovation.com"}>`,
      to: targetEmail,
      subject: "Finish setting up your cleancookIQ account",
      html: reminderHtml(targetName ?? "", magicLink),
    });

    return new Response(JSON.stringify({ success: true, email: targetEmail }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("nudge-unverified-user error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
