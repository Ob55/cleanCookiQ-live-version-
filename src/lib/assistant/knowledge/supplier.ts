/**
 * Knowledge base for the supplier / provider portal assistant ("Max").
 * Grounded in the supplier layout's navigation: equipment, installation,
 * maintenance, opportunities, quotes and CSCC compliance.
 */

import type { KnowledgeEntry } from "../types";

export const supplierKnowledge: KnowledgeEntry[] = [
  {
    id: "navigate",
    topic: "Getting around your portal",
    keywords: ["navigate", "menu", "find", "where", "sidebar", "sections", "pages", "around"],
    answer:
      "Your supplier portal has these sections:\n\n- **[Dashboard](/supplier/dashboard)** — your overview and activity.\n- **[Products](/supplier/products)** — the equipment you sell.\n- **[Services](/supplier/services)** — installation, maintenance and support you offer.\n- **[Documents & Compliance](/supplier/documents)** — certifications and CSCC paperwork.\n- **[Opportunities](/supplier/opportunities)** — institutions matched to you.\n- **[Quote Requests](/supplier/quotes)** — requests waiting for your response.\n- **[MOU / CSCC](/supplier/mou)** — your agreement and compliance tier.\n- **[Tickets](/supplier/support)** — get help from the team.",
    followups: ["How do I add a product?", "Where are my quote requests?", "What is CSCC?"],
  },
  {
    id: "products",
    topic: "Listing products",
    keywords: ["product", "products", "equipment", "catalog", "catalogue", "add", "list", "stock", "cookstove"],
    answer:
      "Open **[Products](/supplier/products)** to add and manage the equipment you supply — cookstoves, LPG systems, biogas digesters, electric cookers and more. Clear, complete listings help institutions and funders find the right fit and reach out to you.",
    followups: ["How do I add a service?", "Where do opportunities come from?"],
  },
  {
    id: "services",
    topic: "Services (installation & maintenance)",
    keywords: ["service", "services", "install", "installation", "maintenance", "repair", "support", "after sales"],
    answer:
      "Use **[Services](/supplier/services)** to list what you offer beyond hardware — installation, commissioning, maintenance contracts and technical support. Institutions plan their transition around the full package, so showing your service coverage matters.",
    followups: ["How do I list a product?", "What is the CSCC tier?"],
  },
  {
    id: "opportunities",
    topic: "Opportunities",
    keywords: ["opportunity", "opportunities", "leads", "matched", "institution", "demand", "pipeline", "clients"],
    answer:
      "**[Opportunities](/supplier/opportunities)** shows institutions matched to you — filtered by fuel, region and the kind of work you do. Because everyone works off one shared pipeline, a single field visit can surface a whole cluster of nearby institutions instead of one-off leads.",
    followups: ["How do I respond to a quote?", "How are opportunities matched?"],
  },
  {
    id: "quotes",
    topic: "Quote requests",
    keywords: ["quote", "quotes", "quotation", "request", "respond", "pricing", "bid", "proposal"],
    answer:
      "**[Quote Requests](/supplier/quotes)** is your inbox for institutions (or admins) asking you to price a job. Respond promptly and completely — your quote becomes part of that institution's shared record that suppliers, funders and the team all see.",
    followups: ["Where do opportunities come from?", "How do I raise a ticket?"],
  },
  {
    id: "compliance",
    topic: "Documents & compliance",
    keywords: ["document", "documents", "compliance", "certification", "certificate", "upload", "paperwork", "verify", "vetting"],
    answer:
      "**[Documents & Compliance](/supplier/documents)** is where you upload certifications and the paperwork that gets you vetted. Verified suppliers are the ones surfaced to institutions and funders, so keeping this current keeps you visible.",
    followups: ["What is CSCC?", "What is the MOU?"],
  },
  {
    id: "cscc-mou",
    topic: "MOU & CSCC tier",
    keywords: ["cscc", "mou", "tier", "agreement", "compliance tier", "rating", "memorandum", "tier 1"],
    answer:
      "**[MOU / CSCC](/supplier/mou)** holds your memorandum of understanding and your **CSCC compliance tier**. That tier travels with you — a Tier 1 supplier in one county is Tier 1 anywhere you serve — so a strong tier helps you scale across regions, not just win one deal.",
    followups: ["Where do I upload compliance docs?", "Where are my opportunities?"],
  },
  {
    id: "support",
    topic: "Getting help",
    keywords: ["support", "ticket", "help", "issue", "problem", "stuck", "contact", "question"],
    answer:
      "Need a hand? Open **[Tickets](/supplier/support)** to reach the CleanCookIQ team. Watch the bell icon at the top for replies.",
    followups: ["How do I add a product?", "Where are my quote requests?"],
  },
  {
    id: "next-steps",
    topic: "What to do next",
    keywords: ["next", "steps", "todo", "should", "now", "start", "first", "begin"],
    answer:
      "A good order to set up:\n\n1. Complete your **[Products](/supplier/products)** and **[Services](/supplier/services)** so institutions see your full offer.\n2. Upload certifications under **[Documents & Compliance](/supplier/documents)** to get verified.\n3. Sign your **[MOU and confirm your CSCC tier](/supplier/mou)**.\n4. Watch **[Opportunities](/supplier/opportunities)** and **[Quote Requests](/supplier/quotes)** and respond quickly.",
    followups: ["What is CSCC?", "How are opportunities matched?"],
  },
];
