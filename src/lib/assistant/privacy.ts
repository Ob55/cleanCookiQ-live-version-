/**
 * Role-aware privacy guard.
 *
 * Each role only gets to discuss what belongs to its role. When a user asks
 * about data that is private to another party — e.g. an institution asking for
 * funder details, or anyone fishing for another organisation's contacts or
 * financials — the guard returns a polite deflection that offers to connect
 * them with the right people, instead of leaking anything.
 *
 * It runs AFTER the normal knowledge match, so a persona's own legitimate
 * answers (including the reassuring "how is my data protected" entry) always
 * win first; the guard is the safety net for out-of-scope requests.
 */

import type { PersonaId } from "./types";

type Topic = {
  id: string;
  /** Noun phrase used in the deflection: "I can't share **<label>**". */
  label: string;
  /** Substring matches against the lowercased question. */
  phrases: string[];
  /** Whole-word matches (word-boundary) against the question. */
  words?: string[];
};

// Sensitive domains the guard can recognise. Kept deliberately specific so it
// doesn't trip on ordinary portal questions.
const TOPICS: Record<string, Topic> = {
  funder: {
    id: "funder",
    label: "funder details",
    phrases: [
      "funder", "funders", "who funds", "who is funding", "who's funding", "funding partner",
      "funding source", "who pays", "grant provider", "which donor", "the donor", "donor details",
      "financier", "who's the investor", "who is the investor",
    ],
    words: ["funder", "funders", "donor", "donors", "financier"],
  },
  otherOrgs: {
    id: "otherOrgs",
    label: "other organisations' private information",
    phrases: [
      "other institution", "other institutions", "another school", "other schools",
      "another hospital", "other hospitals", "other prison", "list of institutions",
      "which institutions", "other organisation", "other organisations", "other users",
      "another supplier", "other suppliers", "other providers", "other funders",
      "another funder", "someone else's", "somebody else's", "other clients",
    ],
  },
  contacts: {
    id: "contacts",
    label: "other people's contact details",
    phrases: [
      "phone number of", "phone number for", "email of", "email address of", "contact details of",
      "contact for the", "number for the", "who runs the", "who is in charge of the",
      "personal details of", "home address of",
    ],
  },
  dealTerms: {
    id: "dealTerms",
    label: "private financial or deal details",
    phrases: [
      "deal terms", "how much did they", "how much money", "their margin", "profit margin",
      "their price", "their quote", "their pricing", "wholesale price", "their financials",
      "their budget", "budget of", "how much profit", "their cost", "their revenue",
    ],
  },
  adminOps: {
    id: "adminOps",
    label: "admin-only controls",
    phrases: [
      "approve account", "approve accounts", "delete user", "delete account", "reset password for",
      "user management", "system settings", "grant access", "revoke access", "who has access",
      "make me admin", "give me admin", "change someone's role", "other people's accounts",
    ],
  },
};

type Rule = { restricted: string[]; support: string; contact: string };

// What each role may NOT discuss, and where to send them. `admin` is null —
// the admin console legitimately sees everything, so its bot isn't guarded.
const RULES: Record<PersonaId, Rule | null> = {
  admin: null,
  institution: {
    restricted: ["funder", "otherOrgs", "contacts", "dealTerms", "adminOps"],
    support: "/institution/support",
    contact: "the CleanCookIQ admin",
  },
  supplier: {
    restricted: ["funder", "otherOrgs", "contacts", "dealTerms", "adminOps"],
    support: "/supplier/support",
    contact: "the CleanCookIQ admin",
  },
  funder: {
    // Funders legitimately discuss funding and deal economics for their own
    // portfolio — but not other funders, other orgs' PII, or admin controls.
    restricted: ["otherOrgs", "contacts", "adminOps"],
    support: "/funder/support",
    contact: "the CleanCookIQ team",
  },
  researcher: {
    // Researchers get aggregated / anonymised data only.
    restricted: ["funder", "otherOrgs", "contacts", "dealTerms", "adminOps"],
    support: "/researcher/support",
    contact: "the CleanCookIQ data team",
  },
  kplc: {
    restricted: ["funder", "otherOrgs", "contacts", "dealTerms", "adminOps"],
    support: "/kplc/support",
    contact: "the CleanCookIQ team",
  },
  csr: {
    restricted: ["funder", "otherOrgs", "contacts", "dealTerms", "adminOps"],
    support: "/csr/support",
    contact: "the CleanCookIQ team",
  },
  public: {
    restricted: ["funder", "otherOrgs", "contacts", "dealTerms", "adminOps"],
    support: "/book-demo",
    contact: "the CleanCookIQ team",
  },
  other: {
    restricted: ["funder", "otherOrgs", "contacts", "dealTerms", "adminOps"],
    support: "/book-demo",
    contact: "the CleanCookIQ team",
  },
};

function topicMatches(topic: Topic, lower: string): boolean {
  for (const p of topic.phrases) {
    if (lower.includes(p)) return true;
  }
  if (topic.words) {
    for (const w of topic.words) {
      if (new RegExp(`\\b${w}\\b`, "i").test(lower)) return true;
    }
  }
  return false;
}

/**
 * Returns a polite deflection if `query` asks this role about something that is
 * private to another party; otherwise null (let the normal engine continue).
 */
export function guardAnswer(personaId: PersonaId, query: string): string | null {
  const rule = RULES[personaId];
  if (!rule) return null;
  const lower = (query || "").toLowerCase();
  if (!lower.trim()) return null;

  for (const topicId of rule.restricted) {
    const topic = TOPICS[topicId];
    if (topic && topicMatches(topic, lower)) {
      const link = rule.support.includes("support")
        ? `[open a ticket](${rule.support})`
        : `[book a demo](${rule.support})`;
      return (
        `I can't share **${topic.label}** — that's kept private to protect everyone's data. 🔒\n\n` +
        `But I can link you up with ${rule.contact} for that — ${link}. ` +
        `Is there something in your own space I can help with instead?`
      );
    }
  }
  return null;
}

/** Convenience: a bound guard for a given persona, for wiring into config. */
export function makeGuard(personaId: PersonaId): (query: string) => string | null {
  return (query: string) => guardAnswer(personaId, query);
}
