import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.9";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, userId, subject, html, text } = await req.json();

    let recipientEmail = to;

    if (userId && !recipientEmail) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (error || !user?.email) throw new Error("Could not find user email");
      recipientEmail = user.email;
    }

    if (!recipientEmail) throw new Error("No recipient email provided");

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
      to: recipientEmail,
      subject,
      html,
      text: text || "",
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("send-email error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
