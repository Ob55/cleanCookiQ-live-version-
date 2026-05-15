// Hardened send-email function.
//
// Previously this was an unauthenticated open mail relay — any caller
// could send arbitrary HTML to any recipient via the platform's SMTP.
// Now:
//   - Requires POST + valid Authorization (Supabase JWT)
//   - A non-admin caller can only email themselves (the JWT subject's email)
//     or a known platform user via userId (still resolved to the *user's
//     own* email, not an arbitrary recipient).
//   - Admins/managers can email any platform user by userId.
//   - Subject is stripped of CR/LF (header-injection defence) and length-capped.
//   - html / text are length-capped.
//   - Method-checked; OPTIONS handled.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.9";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUBJECT_MAX = 200;
const BODY_MAX = 50_000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify the caller's JWT.
    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser();
    if (callerErr || !caller) return json({ error: "Unauthorized" }, 401);

    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);
    const isAdmin = callerRoles?.some((r: any) => ["admin", "manager"].includes(r.role));

    // Parse + validate payload.
    let payload: { to?: unknown; userId?: unknown; subject?: unknown; html?: unknown; text?: unknown };
    try {
      payload = await req.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    const rawSubject = typeof payload.subject === "string" ? payload.subject : "";
    const rawHtml    = typeof payload.html === "string" ? payload.html : "";
    const rawText    = typeof payload.text === "string" ? payload.text : "";

    if (!rawSubject.trim()) return json({ error: "subject is required" }, 400);
    if (rawSubject.length > SUBJECT_MAX) return json({ error: "subject too long" }, 400);
    if (rawHtml.length > BODY_MAX || rawText.length > BODY_MAX) return json({ error: "body too long" }, 400);

    // Strip CR/LF from subject to prevent header injection.
    const subject = rawSubject.replace(/[\r\n]+/g, " ");

    // Resolve the recipient.
    //   - `userId` always wins and is resolved to that user's *actual* email.
    //   - `to` is only honoured if (a) the caller is admin OR (b) it equals the caller's email.
    let recipientEmail: string | undefined;
    const userId = typeof payload.userId === "string" ? payload.userId : undefined;
    const toCandidate = typeof payload.to === "string" ? payload.to.trim() : undefined;

    if (userId) {
      if (!isAdmin && userId !== caller.id) {
        return json({ error: "Forbidden: cannot email other users" }, 403);
      }
      const { data: target, error: targetErr } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (targetErr || !target?.user?.email) {
        return json({ error: "Recipient not found" }, 404);
      }
      recipientEmail = target.user.email;
    } else if (toCandidate) {
      if (isAdmin) {
        // Even admins can only send to known platform users — no external recipients.
        const { data: profileRow } = await supabaseAdmin
          .from("profiles")
          .select("email")
          .ilike("email", toCandidate)
          .maybeSingle();
        if (!profileRow?.email) {
          return json({ error: "Recipient is not a platform user" }, 403);
        }
        recipientEmail = profileRow.email;
      } else if (toCandidate.toLowerCase() === (caller.email ?? "").toLowerCase()) {
        recipientEmail = caller.email!;
      } else {
        return json({ error: "Forbidden: can only email yourself" }, 403);
      }
    } else {
      return json({ error: "to or userId is required" }, 400);
    }

    if (!recipientEmail) return json({ error: "Could not resolve recipient" }, 400);

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
      from: `"CleanCookIQ" <${Deno.env.get("SMTP_FROM") || "info@ignis-innovation.com"}>`,
      to: recipientEmail,
      subject,
      html: rawHtml || undefined,
      text: rawText || undefined,
    });

    return json({ success: true });
  } catch (err: any) {
    console.error("send-email error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
