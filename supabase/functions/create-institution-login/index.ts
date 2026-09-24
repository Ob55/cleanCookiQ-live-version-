import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { smtpTransport, smtpFrom } from "../_shared/smtp.ts";

// Admin creates a login for an institution that was collected in the field
// but never registered itself.
//   * caller must be admin/manager
//   * creates a confirmed auth user (org_type institution -> trigger assigns
//     institution_admin) with a server-generated password
//   * links profile + institution via an organisations row and makes the new
//     user the institution's owner (created_by), which is what the
//     institution-portal RLS keys on
//   * emails the credentials and returns the password ONCE to the admin;
//     it is never stored or logged
const FROM = smtpFrom();

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function generatePassword(len = 14): string {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "23456789", "!@#$%*?"];
  const all = sets.join("");
  const rand = (n: number) => crypto.getRandomValues(new Uint32Array(1))[0] % n;
  const chars = sets.map((s) => s[rand(s.length)]); // one of each class
  while (chars.length < len) chars.push(all[rand(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) { const j = rand(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
  return chars.join("");
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const callerClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return json({ error: "Unauthorized" }, 401);

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", caller.id);
    if (!roles?.some((r: { role: string }) => ["admin", "manager"].includes(r.role))) {
      return json({ error: "Forbidden: admin only" }, 403);
    }

    const { institution_id, email, full_name, phone, app_url } = await req.json().catch(() => ({}));
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    // The person who will use the login (head teacher / principal / lead).
    const leadName = typeof full_name === "string" ? full_name.trim().slice(0, 120) : "";
    const leadPhone = typeof phone === "string" ? phone.trim().slice(0, 30) : "";
    if (!institution_id || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizedEmail)) {
      return json({ error: "institution_id and a valid email are required" }, 400);
    }
    const appUrl = (typeof app_url === "string" && /^https?:\/\//.test(app_url) ? app_url : null)
      || (Deno.env.get("CORS_ALLOW_ORIGINS") || "").split(",")[0].trim()
      || "https://cleancookiq.com";

    const { data: inst, error: instErr } = await admin.from("institutions")
      .select("id, name, county, contact_person, contact_phone, created_by, organisation_id")
      .eq("id", institution_id).maybeSingle();
    if (instErr) throw instErr;
    if (!inst) return json({ error: "Institution not found" }, 404);

    // Already owned by an institution login?
    if (inst.created_by) {
      const { data: ownerRoles } = await admin.from("user_roles").select("role").eq("user_id", inst.created_by);
      if (ownerRoles?.some((r: { role: string }) => ["institution_admin", "institution_user"].includes(r.role))) {
        return json({ error: "This institution already has a login" }, 409);
      }
    }

    const password = generatePassword();
    const personName = leadName || inst.contact_person || inst.name;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: personName, org_name: inst.name, org_type: "institution" },
    });
    if (createErr) {
      const taken = /already.*(registered|exists)/i.test(createErr.message);
      return json({ error: taken ? `${normalizedEmail} already has an account` : createErr.message }, taken ? 409 : 400);
    }
    const userId = created.user.id;

    let orgId = inst.organisation_id as string | null;
    if (!orgId) {
      const { data: org, error: orgErr } = await admin.from("organisations")
        .insert({ name: inst.name, org_type: "institution", county: inst.county, contact_email: normalizedEmail, contact_phone: leadPhone || inst.contact_phone })
        .select("id").single();
      if (orgErr) { await admin.auth.admin.deleteUser(userId); throw orgErr; }
      orgId = org.id;
    }

    const [{ error: pErr }, { error: iErr }] = await Promise.all([
      admin.from("profiles").update({
        approval_status: "approved", org_type: "institution", organisation_id: orgId,
        email: normalizedEmail, org_name: inst.name, full_name: personName,
        ...(leadPhone ? { phone: leadPhone } : {}),
      }).eq("user_id", userId),
      admin.from("institutions").update({
        created_by: userId, organisation_id: orgId, setup_completed: true,
        contact_email: normalizedEmail,
        ...(leadName ? { contact_person: leadName } : {}),
        ...(leadPhone ? { contact_phone: leadPhone } : {}),
      }).eq("id", inst.id),
    ]);
    if (pErr || iErr) {
      // Don't leave a half-linked account behind.
      await admin.auth.admin.deleteUser(userId);
      throw pErr ?? iErr;
    }

    let emailSent = false;
    try {
      await smtpTransport().sendMail({
        from: FROM,
        to: normalizedEmail,
        subject: "Your CleanCookIQ login",
        html: `
          <p>Hello ${esc(personName)},</p>
          <p>A CleanCookIQ account has been created for <strong>${esc(inst.name)}</strong>.</p>
          <p>Email: <strong>${esc(normalizedEmail)}</strong><br>Temporary password: <strong>${esc(password)}</strong></p>
          <p><a href="${esc(appUrl)}/auth/login" style="display:inline-block;padding:10px 18px;background:#00712D;color:#fff;text-decoration:none;border-radius:6px">Sign in</a></p>
          <p>After signing in you'll see your institution's dashboard: its details, the cooking method proposed for it and its funding status. Open <em>Profile → Login details</em> to change your email or password.</p>
          <p>Lost this password? Use <em>Forgot password?</em> on the sign-in page to set a new one.</p>
        `,
      });
      emailSent = true;
    } catch (mailErr) {
      console.error("create-institution-login: email failed:", mailErr instanceof Error ? mailErr.message : "unknown");
    }

    return json({ email: normalizedEmail, password, email_sent: emailSent });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("create-institution-login error:", message);
    return json({ error: message }, 500);
  }
});
