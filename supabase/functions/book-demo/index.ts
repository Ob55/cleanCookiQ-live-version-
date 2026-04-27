import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.9";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const NOTIFY_TO = "bmwangi@ignis-innovation.com";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s\-().]{6,}$/;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const BASE_STYLE = `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;`;
const HEADER_STYLE = `background:#1a3c2e;padding:28px 32px;text-align:center;`;
const BODY_STYLE = `padding:32px;`;
const FOOTER_STYLE = `padding:20px 32px;background:#f9fafb;text-align:center;font-size:12px;color:#6b7280;`;

function layout(body: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:16px;background:#f3f4f6;">
<div style="${BASE_STYLE}">
  <div style="${HEADER_STYLE}">
    <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:700;">CleanCookIQ</h1>
  </div>
  <div style="${BODY_STYLE}">${body}</div>
  <div style="${FOOTER_STYLE}">
    &copy; 2026 Ignis Innovation · <a href="mailto:info@ignis-innovation.com" style="color:#6b7280;">info@ignis-innovation.com</a>
  </div>
</div></body></html>`;
}

function confirmationHtml(name: string): string {
  return layout(`
    <h2 style="color:#1a3c2e;margin-top:0;">We received your demo request</h2>
    <p style="color:#374151;line-height:1.6;">Hi ${name},</p>
    <p style="color:#374151;line-height:1.6;">
      Thanks for your interest in CleanCookIQ! We've received your demo request and someone
      from our team will reach out within 24 hours to schedule a time that works for you.
    </p>
    <p style="color:#374151;line-height:1.6;">
      In the meantime, if you have any urgent questions, feel free to reply directly to this email.
    </p>
    <p style="color:#374151;line-height:1.6;margin-top:24px;">Talk soon,<br/>The CleanCookIQ Team</p>
  `);
}

function notificationHtml(name: string, email: string, phone: string, submittedAt: string): string {
  return layout(`
    <h2 style="color:#1a3c2e;margin-top:0;">🔔 New demo request</h2>
    <p style="color:#374151;line-height:1.6;">A new demo has been requested on CleanCookIQ.</p>
    <p style="color:#374151;line-height:1.6;"><strong>Requester details:</strong></p>
    <ul style="color:#374151;line-height:1.8;padding-left:20px;">
      <li><strong>Name:</strong> ${name}</li>
      <li><strong>Email:</strong> <a href="mailto:${email}" style="color:#2d6a4f;">${email}</a></li>
      <li><strong>Phone:</strong> ${phone}</li>
      <li><strong>Submitted:</strong> ${submittedAt}</li>
    </ul>
    <p style="color:#374151;line-height:1.6;">Please follow up within 24 hours.</p>
    <p style="color:#6b7280;font-size:13px;margin-top:24px;">— CleanCookIQ Platform</p>
  `);
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!),
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { name?: unknown; email?: unknown; phone?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";

  if (!name || name.length > 200) return json({ error: "Name is required" }, 400);
  if (!email || !EMAIL_RE.test(email) || email.length > 320) {
    return json({ error: "A valid email is required" }, 400);
  }
  if (!phone || !PHONE_RE.test(phone) || phone.length > 40) {
    return json({ error: "A valid phone number is required" }, 400);
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("demo_requests")
    .insert({ name, email, phone })
    .select("id, created_at")
    .single();

  if (insertError) {
    console.error("demo_requests insert failed:", insertError);
    return json({ error: "Could not save your request. Please try again." }, 500);
  }

  // Email delivery is best-effort — never block success on it.
  try {
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
    const from = `"CleanCookIQ" <${Deno.env.get("SMTP_FROM") || "info@ignis-innovation.com"}>`;
    const submittedAt = new Date(inserted.created_at).toUTCString();
    const safeName = escape(name);
    const safeEmail = escape(email);
    const safePhone = escape(phone);

    await Promise.allSettled([
      transporter.sendMail({
        from,
        to: email,
        subject: "We received your demo request — CleanCookIQ",
        html: confirmationHtml(safeName),
      }),
      transporter.sendMail({
        from,
        to: NOTIFY_TO,
        replyTo: email,
        subject: `🔔 New demo request — ${name}`,
        html: notificationHtml(safeName, safeEmail, safePhone, submittedAt),
      }),
    ]);
  } catch (err) {
    console.error("book-demo email send failed (non-fatal):", err);
  }

  return json({ success: true, id: inserted.id });
});
