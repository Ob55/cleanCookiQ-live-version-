/**
 * Persona registry. Maps a PersonaId to its full bot config.
 *
 * Only the personas built so far are registered; the rest (supplier, funder,
 * researcher, kplc, other) are quick clones — add a knowledge file and a
 * registry entry following the same shape, no other code changes needed.
 */

import type { PersonaConfig, PersonaId } from "./types";
import { publicKnowledge } from "./knowledge/public";
import { adminKnowledge } from "./knowledge/admin";
import { institutionKnowledge } from "./knowledge/institution";
import { supplierKnowledge } from "./knowledge/supplier";
import { funderKnowledge } from "./knowledge/funder";
import { researcherKnowledge } from "./knowledge/researcher";
import { kplcKnowledge } from "./knowledge/kplc";
import { csrKnowledge } from "./knowledge/csr";
import { otherKnowledge } from "./knowledge/other";

export { getAnswer, greeting } from "./engine";
export type { PersonaConfig, PersonaId, AnswerResult } from "./types";

/** Brand colours used across the personas. */
const GOLD = "#D4AF37";
const GREEN = "#00712D";
const ORANGE = "#F5871F";
const AMBER = "#C8881A";
const ROSE = "#E0556E";
const STEEL = "#3B6EA5";

const PERSONAS: Partial<Record<PersonaId, PersonaConfig>> = {
  public: {
    id: "public",
    name: "Iggy",
    role: "Platform Guide",
    greeting:
      "👋 Hi, I'm **Iggy** — your guide to CleanCookIQ. Ask me what the platform does, who it's for, or how to join. What would you like to know?",
    accent: GOLD,
    scopeNote:
      "I can explain what CleanCookIQ is, how it works, who it's for, and how to get started.",
    suggestions: [
      "What is CleanCookIQ?",
      "How does it work?",
      "Who is it for?",
      "How do I join?",
    ],
    knowledge: publicKnowledge,
    fallback:
      "I'm not totally sure about that one — I'm best on what CleanCookIQ is, how it works, who it's for, financing, the map, and how to join. Try rephrasing, or [book a demo](/book-demo) to talk to the team. Here are some things I can help with:",
  },

  admin: {
    id: "admin",
    name: "Atlas",
    role: "Admin Console Guide",
    greeting:
      "👋 Hey, I'm **Atlas** — your admin console sidekick. I can help you find anything in here: pipeline, organisations, delivery, M&E, reference data, content, finance and users. What do you need?",
    accent: STEEL,
    scopeNote:
      "I can help you navigate the admin console — pipeline, assessments, organisations, delivery, M&E, reference data, content, finance, agreements, users and approvals.",
    suggestions: [
      "How do I get around the console?",
      "Where do I approve new accounts?",
      "Where's the pipeline?",
      "How do I import institutions?",
    ],
    knowledge: adminKnowledge,
    fallback:
      "I'm not sure about that one — I'm best on the console itself: pipeline, organisations, delivery, M&E, reference data, content, finance, agreements and users. Try rephrasing it. Here's what I can help with:",
  },

  institution: {
    id: "institution",
    name: "Ada",
    role: "Institution Assistant",
    greeting:
      "👋 Hi, I'm **Ada** — your assistant inside the institution portal. I can help you find your way around, update your profile, log your cooking, and more. What do you need?",
    accent: GREEN,
    scopeNote:
      "I can help you navigate your portal, update your details, log cooking data, manage documents, understand your readiness score, and get support.",
    suggestions: [
      "How do I get around my portal?",
      "What are my next steps?",
      "How do I update my profile?",
      "What's my readiness score?",
    ],
    knowledge: institutionKnowledge,
    fallback:
      "I'm not sure about that specific thing — I'm best on navigating your portal, your profile, Cooking Counting, documents, the IPA, your readiness score, and getting support. Try rephrasing, or open a [ticket](/institution/support). Here's what I can help with:",
  },

  supplier: {
    id: "supplier",
    name: "Max",
    role: "Supplier Assistant",
    greeting:
      "👋 Hi, I'm **Max** — your assistant in the supplier portal. I can help with listing products and services, compliance, opportunities and quote requests. What do you need?",
    accent: ORANGE,
    scopeNote:
      "I can help you list products and services, get verified, understand CSCC and your MOU, and handle opportunities and quote requests.",
    suggestions: [
      "How do I get around my portal?",
      "How do I list a product?",
      "What is CSCC?",
      "Where are my quote requests?",
    ],
    knowledge: supplierKnowledge,
    fallback:
      "I'm not sure about that one — I'm best on products, services, compliance/CSCC, your MOU, opportunities and quotes. Try rephrasing, or open a [ticket](/supplier/support). Here's what I can help with:",
  },

  funder: {
    id: "funder",
    name: "Vera",
    role: "Funder Assistant",
    greeting:
      "👋 Hi, I'm **Vera** — your assistant in the funder portal. I can help with deal flow, the readiness score, financial metrics, your portfolio and impact. What would you like to know?",
    accent: GREEN,
    scopeNote:
      "I can help you understand deal flow, the readiness rubric, the TCO/NPV/IRR model, your portfolio, co-investment and impact reporting.",
    suggestions: [
      "What's in Deal Flow?",
      "How does the readiness score work?",
      "What financial metrics do I get?",
      "How is impact measured?",
    ],
    knowledge: funderKnowledge,
    fallback:
      "I'm not sure about that one — I'm best on deal flow, the readiness score, financial metrics, portfolio, co-investment and impact. Try rephrasing, or open a [ticket](/funder/support). Here's what I can help with:",
  },

  researcher: {
    id: "researcher",
    name: "Niko",
    role: "Research Assistant",
    greeting:
      "👋 Hi, I'm **Niko** — your research assistant. I can point you to the platform's data, intelligence, policy library and resources, and help you request access. What are you looking for?",
    accent: GOLD,
    scopeNote:
      "I can help you find the platform's data and intelligence, the policy library, resources, how the data is sourced, and how to request access.",
    suggestions: [
      "Where's the data and intelligence?",
      "Where's the policy library?",
      "How is the data sourced?",
      "How do I request a dataset?",
    ],
    knowledge: researcherKnowledge,
    fallback:
      "I'm not sure about that one — I'm best on the platform's data and intelligence, the policy library, resources, data sourcing, and requesting access. Try rephrasing, or open a [ticket](/researcher/support). Here's what I can help with:",
  },

  kplc: {
    id: "kplc",
    name: "Volt",
    role: "Utilities Assistant",
    greeting:
      "👋 Hi, I'm **Volt** — your depot assistant. I can help you see institutions in your area, understand new electric-cooking demand, and find your way around. What do you need?",
    accent: AMBER,
    scopeNote:
      "I can help you navigate your depot portal, read the institutions view, and understand how electric cooking affects load in your service area.",
    suggestions: [
      "How do I get around my portal?",
      "What does the Institutions view show?",
      "Why does electric cooking matter here?",
      "How do I raise a ticket?",
    ],
    knowledge: kplcKnowledge,
    fallback:
      "I'm not sure about that one — I'm best on your depot dashboard, the institutions in your area, and electric-cooking demand. Try rephrasing, or open a [ticket](/kplc/support). Here's what I can help with:",
  },

  csr: {
    id: "csr",
    name: "Joy",
    role: "CSR Partner Assistant",
    greeting:
      "👋 Hi, I'm **Joy** — your CSR partner assistant. I can help you find projects to sponsor, track your sponsorships, and report on your impact. How can I help?",
    accent: ROSE,
    scopeNote:
      "I can help you find sponsorship opportunities, track your sponsorships, manage documents, and understand your impact reporting.",
    suggestions: [
      "How do I sponsor a project?",
      "How is my impact measured?",
      "Where are opportunities?",
      "How do I track my sponsorships?",
    ],
    knowledge: csrKnowledge,
    fallback:
      "I'm not sure about that one — I'm best on sponsorship opportunities, your sponsorships, documents and impact reporting. Try rephrasing, or open a [ticket](/csr/support). Here's what I can help with:",
  },

  other: {
    id: "other",
    name: "Sam",
    role: "Welcome Assistant",
    greeting:
      "👋 Hi, I'm **Sam**. Thanks for registering! Your account is under review — meanwhile I can explain what CleanCookIQ is, what happens next, and how to get in touch. What would you like to know?",
    accent: GOLD,
    scopeNote:
      "I can explain your account status, what CleanCookIQ is, who it's for, what happens after approval, and how to get in touch.",
    suggestions: [
      "What's my account status?",
      "What is CleanCookIQ?",
      "What happens after approval?",
      "How do I get in touch?",
    ],
    knowledge: otherKnowledge,
    fallback:
      "I'm not sure about that one — I'm best on your account status, what CleanCookIQ is, who it's for, and what happens next. Try rephrasing, or [book a demo](/book-demo) to talk to the team. Here's what I can help with:",
  },
};

/** Get a persona config, or undefined if that bot isn't built yet. */
export function getPersona(id: PersonaId): PersonaConfig | undefined {
  return PERSONAS[id];
}
