import { supabase } from "@/integrations/supabase/client";

interface SendEmailParams {
  to?: string;
  userId?: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const { error } = await supabase.functions.invoke("send-email", {
    body: params,
  });
  if (error) {
    console.error("Failed to send email:", error);
    // Non-fatal — log but don't block the primary action
  }
}

const BASE_STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  max-width: 560px; margin: 0 auto; background: #ffffff;
  border-radius: 8px; overflow: hidden;
  border: 1px solid #e5e7eb;
`;
const HEADER_STYLE = `background: #1a3c2e; padding: 28px 32px; text-align: center;`;
const BODY_STYLE = `padding: 32px;`;
const FOOTER_STYLE = `padding: 20px 32px; background: #f9fafb; text-align: center;
  font-size: 12px; color: #6b7280;`;
const BTN_STYLE = `display: inline-block; padding: 12px 28px; background: #2d6a4f;
  color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;
  font-size: 15px; margin-top: 16px;`;

function layout(body: string): string {
  return `
<!DOCTYPE html><html><body style="margin:0;padding:16px;background:#f3f4f6;">
<div style="${BASE_STYLE}">
  <div style="${HEADER_STYLE}">
    <img src="https://bnbhattryqbterblybzw.supabase.co/storage/v1/object/public/assets/logo.png"
      alt="CleanCook IQ" height="36" style="display:inline-block;" onerror="this.style.display='none'" />
    <h1 style="color:#ffffff;margin:8px 0 0;font-size:20px;font-weight:700;">CleanCook IQ</h1>
  </div>
  <div style="${BODY_STYLE}">${body}</div>
  <div style="${FOOTER_STYLE}">
    &copy; 2026 Ignis Innovation · <a href="mailto:info@ignis-innovation.com" style="color:#6b7280;">info@ignis-innovation.com</a>
  </div>
</div>
</body></html>`;
}

export function emailAccountApproved(name: string, dashboardUrl: string): string {
  return layout(`
    <h2 style="color:#1a3c2e;margin-top:0;">Your Account Has Been Approved!</h2>
    <p style="color:#374151;line-height:1.6;">Hi ${name || "there"},</p>
    <p style="color:#374151;line-height:1.6;">
      Great news! Your CleanCook IQ account has been reviewed and <strong>approved</strong>.
      You can now log in and access your dashboard to get started.
    </p>
    <p style="text-align:center;">
      <a href="${dashboardUrl}" style="${BTN_STYLE}">Go to Dashboard</a>
    </p>
    <p style="color:#6b7280;font-size:13px;margin-top:24px;">
      If you have any questions, reach out to our support team.
    </p>
  `);
}

export function emailAccountRejected(name: string): string {
  return layout(`
    <h2 style="color:#1a3c2e;margin-top:0;">Account Application Update</h2>
    <p style="color:#374151;line-height:1.6;">Hi ${name || "there"},</p>
    <p style="color:#374151;line-height:1.6;">
      Thank you for your interest in CleanCook IQ. After reviewing your application,
      we're unable to approve your account at this time.
    </p>
    <p style="color:#374151;line-height:1.6;">
      If you believe this is an error or would like more information, please contact us at
      <a href="mailto:info@ignis-innovation.com" style="color:#2d6a4f;">info@ignis-innovation.com</a>.
    </p>
  `);
}

const FUEL_DISPLAY: Record<string, string> = {
  firewood: "firewood",
  charcoal: "charcoal",
  lpg: "LPG",
  biogas: "biogas",
  electric: "electric (induction)",
  other: "biomass pellets",
};

export function emailInstitutionWelcome(name: string, institutionName: string, currentFuel?: string): string {
  const fuelLabel = currentFuel ? (FUEL_DISPLAY[currentFuel] || currentFuel) : "current fuel";
  return layout(`
    <h2 style="color:#1a3c2e;margin-top:0;">Welcome to CleanCook IQ</h2>
    <p style="color:#374151;line-height:1.6;">Hi ${name || "there"},</p>
    <p style="color:#374151;line-height:1.6;">
      We see you registered on CleanCookIQ. Your <strong>${fuelLabel}</strong> usage suggests
      real opportunities to cut fuel costs per meal and reduce CO₂ emissions.
      We help institutions move from registration to financed installation.
    </p>
    <p style="color:#374151;line-height:1.6;font-style:italic;">
      May we walk you through your least-cost pathway?
    </p>
    <p style="text-align:center;">
      <a href="${import.meta.env.VITE_APP_URL || "https://cleancookiq.com"}/institution/dashboard" style="${BTN_STYLE}">View Your Dashboard</a>
    </p>
    <p style="color:#6b7280;font-size:13px;margin-top:24px;">
      Reply to this email or contact us at
      <a href="mailto:info@ignis-innovation.com" style="color:#2d6a4f;">info@ignis-innovation.com</a> to get started.
    </p>
  `);
}

export function emailSupplierWelcome(name: string, companyName: string): string {
  return layout(`
    <h2 style="color:#1a3c2e;margin-top:0;">Welcome to CleanCook IQ</h2>
    <p style="color:#374151;line-height:1.6;">Hi ${name || "there"},</p>
    <p style="color:#374151;line-height:1.6;">
      Your company <strong>${companyName}</strong> has been registered as a supplier on CleanCook IQ.
      You can now browse institution opportunities and submit proposals.
    </p>
    <p style="text-align:center;">
      <a href="${import.meta.env.VITE_APP_URL || "https://cleancookiq.com"}/supplier/dashboard" style="${BTN_STYLE}">View Dashboard</a>
    </p>
  `);
}

export function emailOtherInterest(name: string, orgName: string): string {
  return layout(`
    <h2 style="color:#1a3c2e;margin-top:0;">Thank You for Your Interest!</h2>
    <p style="color:#374151;line-height:1.6;">Hi ${name || "there"},</p>
    <p style="color:#374151;line-height:1.6;">
      We have seen that <strong>${orgName || "your organisation"}</strong> has shown interest in CleanCook IQ.
      Kindly be patient as we prepare a dashboard for you.
    </p>
    <p style="color:#374151;line-height:1.6;">
      You will receive a call from our agent with further assistance regarding next steps.
    </p>
    <p style="color:#6b7280;font-size:13px;margin-top:24px;">
      In the meantime, feel free to reach out at
      <a href="mailto:info@ignis-innovation.com" style="color:#2d6a4f;">info@ignis-innovation.com</a>.
    </p>
  `);
}

export function emailRoleAssigned(name: string, roleLabel: string, dashboardUrl: string): string {
  return layout(`
    <h2 style="color:#1a3c2e;margin-top:0;">Your Account Has Been Approved!</h2>
    <p style="color:#374151;line-height:1.6;">Hi ${name || "there"},</p>
    <p style="color:#374151;line-height:1.6;">
      Great news! Your CleanCook IQ account has been reviewed and approved as a
      <strong>${roleLabel}</strong>.
    </p>
    <p style="color:#374151;line-height:1.6;">
      You can now log in and complete your setup to access your dashboard.
    </p>
    <p style="text-align:center;">
      <a href="${dashboardUrl}" style="${BTN_STYLE}">Go to Dashboard</a>
    </p>
    <p style="color:#6b7280;font-size:13px;margin-top:24px;">
      If you have any questions, reach out to our support team at
      <a href="mailto:info@ignis-innovation.com" style="color:#2d6a4f;">info@ignis-innovation.com</a>.
    </p>
  `);
}

export function emailSignAgreement(orgName: string, docType: "mou" | "ipa"): string {
  const docLabel = docType === "ipa"
    ? "Institution Partnership Agreement (IPA)"
    : "Memorandum of Understanding (MOU)";
  const portalUrl = docType === "ipa"
    ? `${import.meta.env.VITE_APP_URL || "https://cleancookiq.com"}/institution/ipa`
    : `${import.meta.env.VITE_APP_URL || "https://cleancookiq.com"}/supplier/mou`;
  return layout(`
    <h2 style="color:#1a3c2e;margin-top:0;">Action Required: Please Sign Your ${docType.toUpperCase()}</h2>
    <p style="color:#374151;line-height:1.6;">Dear ${orgName || "Partner"},</p>
    <p style="color:#374151;line-height:1.6;">
      Kindly sign your <strong>${docLabel}</strong> for further processing of your partnership with CleanCook IQ.
    </p>
    <p style="color:#374151;line-height:1.6;">
      Please log in to your portal, download the document, sign it, and upload the signed copy.
    </p>
    <p style="text-align:center;">
      <a href="${portalUrl}" style="${BTN_STYLE}">Sign ${docType.toUpperCase()} Now</a>
    </p>
    <p style="color:#6b7280;font-size:13px;margin-top:24px;">
      If you have any questions, please contact us at
      <a href="mailto:info@ignis-innovation.com" style="color:#2d6a4f;">info@ignis-innovation.com</a>.
    </p>
  `);
}

export function emailDemoConfirmation(name: string): string {
  return layout(`
    <h2 style="color:#1a3c2e;margin-top:0;">We received your demo request</h2>
    <p style="color:#374151;line-height:1.6;">Hi ${name || "there"},</p>
    <p style="color:#374151;line-height:1.6;">
      Thanks for your interest in CleanCookIQ! We've received your demo request and someone
      from our team will reach out within 24 hours to schedule a time that works for you.
    </p>
    <p style="color:#374151;line-height:1.6;">
      In the meantime, if you have any urgent questions, feel free to reply directly to this email.
    </p>
    <p style="color:#374151;line-height:1.6;margin-top:24px;">
      Talk soon,<br/>The CleanCookIQ Team
    </p>
  `);
}

export function emailDemoNotification(
  name: string,
  email: string,
  phone: string,
  submittedAt: string,
): string {
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

export function emailTicketResolved(name: string, ticketTitle: string, reply: string): string {
  return layout(`
    <h2 style="color:#1a3c2e;margin-top:0;">Your Support Ticket Has Been Resolved</h2>
    <p style="color:#374151;line-height:1.6;">Hi ${name || "there"},</p>
    <p style="color:#374151;line-height:1.6;">
      Your ticket <strong>"${ticketTitle}"</strong> has been resolved. Here's the response from our team:
    </p>
    <div style="background:#f0fdf4;border-left:4px solid #2d6a4f;padding:16px;border-radius:0 6px 6px 0;
      color:#374151;line-height:1.6;white-space:pre-wrap;">${reply}</div>
    <p style="color:#6b7280;font-size:13px;margin-top:24px;">
      If you need further assistance, please raise a new support ticket from your dashboard.
    </p>
  `);
}
