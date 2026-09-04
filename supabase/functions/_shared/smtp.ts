// Shared SMTP transport for edge functions.
//
// One place to build the nodemailer transport + From header so every mail-
// sending function (send-email, add-programme-member, nudge-unverified-user,
// book-demo) behaves the same.
//
// Configure via Supabase secrets (NOT files) — e.g. for Gmail with an app
// password:
//   supabase secrets set \
//     SMTP_HOST=smtp.gmail.com SMTP_PORT=587 \
//     SMTP_USER=info@ignis-innovation.com \
//     SMTP_PASS=your16charapppassword \
//     SMTP_FROM="Ignis Innovation <info@ignis-innovation.com>"
//
// Both env spellings are accepted: SMTP_USER/SMTP_PASS and
// SMTP_USERNAME/SMTP_PASSWORD. The legacy SSLv3 cipher workaround is applied
// ONLY for Office365/Outlook hosts — Gmail uses plain STARTTLS on 587 and
// breaks if SSLv3 ciphers are forced.
import nodemailer from "npm:nodemailer@6.9.9";

function env(...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = Deno.env.get(k);
    if (v && v.trim()) return v.trim();
  }
  return undefined;
}

export function smtpTransport() {
  const host = env("SMTP_HOST") || "smtp.gmail.com";
  const port = parseInt(env("SMTP_PORT") || "587", 10);
  const user = env("SMTP_USERNAME", "SMTP_USER");
  const pass = env("SMTP_PASSWORD", "SMTP_PASS");
  // 465 is implicit TLS; anything else (587) is STARTTLS. SMTP_SECURE can force it.
  const secure = (env("SMTP_SECURE") || "").toLowerCase() === "true" || port === 465;
  const isOffice365 = /office365|outlook/i.test(host);

  const opts: Record<string, unknown> = {
    host,
    port,
    secure,
    auth: user || pass ? { user, pass } : undefined,
  };
  if (isOffice365) {
    // Legacy Office365 relay needs the SSLv3 cipher list.
    opts.tls = { ciphers: "SSLv3" };
  } else if (!secure) {
    // Gmail and most modern providers: require STARTTLS on 587.
    opts.requireTLS = true;
  }
  return nodemailer.createTransport(opts);
}

// Builds the From header. If SMTP_FROM already carries a display name
// ("Ignis Innovation <info@…>"), it is used verbatim; a bare address is
// wrapped with `label`.
export function smtpFrom(label = "CleanCookIQ"): string {
  const from = env("SMTP_FROM") || "info@ignis-innovation.com";
  if (from.includes("<") && from.includes(">")) return from;
  return `"${label}" <${from}>`;
}
