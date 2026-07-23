/**
 * Knowledge base for the CSR partner portal assistant ("Joy").
 * Grounded in the CSR layout: opportunities, sponsorships and impact reporting
 * for companies sponsoring clean cooking projects.
 */

import type { KnowledgeEntry } from "../types";

export const csrKnowledge: KnowledgeEntry[] = [
  {
    id: "navigate",
    topic: "Getting around your portal",
    keywords: ["navigate", "menu", "find", "where", "sidebar", "sections", "pages", "around", "portal"],
    answer:
      "Your CSR partner portal has these sections:\n\n- **[Dashboard](/csr/dashboard)** — your overview and activity.\n- **[Opportunities](/csr/opportunities)** — projects you could sponsor.\n- **[Sponsorships](/csr/sponsorships)** — the projects you're funding.\n- **[Impact Report](/csr/impact)** — the verified results of your support.\n- **[Documents](/csr/documents)** — your files and agreements.\n- **[Tickets](/csr/support)** — get help from the team.",
    followups: ["How do I sponsor a project?", "How is my impact measured?", "Where are opportunities?"],
  },
  {
    id: "opportunities",
    topic: "Sponsorship opportunities",
    keywords: ["opportunity", "opportunities", "sponsor", "fund", "project", "projects", "support", "choose", "browse"],
    answer:
      "**[Opportunities](/csr/opportunities)** lists clean cooking projects you could sponsor — each tied to a verified institution with a readiness score and clear expected impact, so you can pick causes that match your CSR goals with confidence.",
    followups: ["How do I track my sponsorships?", "How is impact measured?"],
  },
  {
    id: "sponsorships",
    topic: "Your sponsorships",
    keywords: ["sponsorship", "sponsorships", "funding", "commitments", "track", "manage", "giving", "contributions"],
    answer:
      "**[Sponsorships](/csr/sponsorships)** tracks the projects you're funding — their stage, delivery and progress — against the same shared institution record everyone works from, so you always know where your support stands.",
    followups: ["How is my impact measured?", "Where are opportunities?"],
  },
  {
    id: "impact",
    topic: "Impact reporting",
    keywords: ["impact", "report", "reporting", "results", "carbon", "emissions", "co2", "outcomes", "verified", "esg"],
    answer:
      "**[Impact Report](/csr/impact)** turns your sponsorships into verifiable outcomes — clean fuel used, baseline fuel displaced, meals served and tonnes of CO₂ avoided — every figure traceable to a sourced data point. It's reporting you can stand behind for ESG and stakeholder communications.",
    followups: ["How do I sponsor a project?", "Where are my documents?"],
  },
  {
    id: "documents",
    topic: "Documents",
    keywords: ["document", "documents", "upload", "file", "agreement", "paperwork", "download"],
    answer:
      "**[Documents](/csr/documents)** is where you manage your files and agreements related to your sponsorships. Keeping them here means everyone involved in a project sees the same up-to-date record.",
    followups: ["How is impact measured?", "How do I raise a ticket?"],
  },
  {
    id: "support",
    topic: "Getting help",
    keywords: ["support", "ticket", "help", "issue", "problem", "stuck", "contact", "question"],
    answer:
      "Open a **[Ticket](/csr/support)** to reach the CleanCookIQ team. Replies appear under the bell icon at the top of the page.",
    followups: ["How do I sponsor a project?", "How is impact measured?"],
  },
];
