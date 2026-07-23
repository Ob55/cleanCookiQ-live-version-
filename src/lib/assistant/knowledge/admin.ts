/**
 * Knowledge base for the admin console assistant ("Atlas").
 * Grounded in the AdminLayout navigation: operations, organisations, delivery,
 * M&E, reference data, content, finance, agreements, people and support.
 */

import type { KnowledgeEntry } from "../types";

export const adminKnowledge: KnowledgeEntry[] = [
  {
    id: "navigate",
    topic: "Getting around the console",
    keywords: ["navigate", "menu", "find", "where", "sidebar", "sections", "console", "around", "overview", "map"],
    answer:
      "The admin console sidebar is grouped into sections:\n\n- **Operations** — Pipeline, Assessments, Opportunities.\n- **Organisations** — Institutions (+ import), Providers, Link Institution ↔ Supplier, KPLC Depots.\n- **Delivery** — Deliveries, Installation Crews.\n- **M&E** — Monitoring, Risk Register, Carbon Ledger, Credit Verifications.\n- **Reference Data** — data sources, data points, financing instruments, templates, product categories.\n- **Content** — Events, News, Resources.\n- **Finance** — BD Dashboard, Financing Designer, Portfolio.\n- **Agreements**, **People**, **Support** and **Analytics**.",
    followups: ["Where do I approve new accounts?", "Where's the pipeline?", "How do I import institutions?"],
  },
  {
    id: "approvals",
    topic: "Approving accounts",
    keywords: ["approve", "approval", "pending", "verify", "activate", "review", "registration", "accept", "reject"],
    answer:
      "New sign-ups arrive as **pending** and wait for admin approval. Review and approve (or reject) them from the relevant **People / Organisations** section — **[Users](/admin/users)** for accounts in general, or the matching list like **[Institutions](/admin/institutions)**, **[Providers](/admin/providers)**, **[Researchers](/admin/researchers)** and **[Others](/admin/others)**. Once approved, the user gets access to their portal.",
    followups: ["Where do I manage users?", "Where are 'Other' organisations?"],
  },
  {
    id: "pipeline",
    topic: "Pipeline",
    keywords: ["pipeline", "stage", "stages", "deal", "progress", "transition", "track"],
    answer:
      "**[Pipeline](/admin/pipeline)** is your command centre for moving institutions through the transition stages — from registered through assessed, matched, contracted and installed. It's usually the first place to look each day.",
    followups: ["Where are assessments?", "Where are opportunities?"],
  },
  {
    id: "assessments",
    topic: "Assessments",
    keywords: ["assessment", "assessments", "score", "scoring", "readiness", "evaluate", "rubric"],
    answer:
      "**[Assessments](/admin/assessments)** is where institutions are scored against the readiness rubric. Keeping assessments current is what makes the pipeline and funder deal flow trustworthy.",
    followups: ["Where's the pipeline?", "Where are opportunities?"],
  },
  {
    id: "opportunities",
    topic: "Opportunities",
    keywords: ["opportunity", "opportunities", "needs", "match", "matching", "leads"],
    answer:
      "**[Opportunities](/admin/opportunities)** manages the institution needs/opportunities that get matched to suppliers and funders across the platform.",
    followups: ["How do I link an institution to a supplier?", "Where's the pipeline?"],
  },
  {
    id: "organisations",
    topic: "Organisations & imports",
    keywords: ["institution", "institutions", "provider", "providers", "supplier", "import", "link", "depot", "kplc", "organisation", "org"],
    answer:
      "Manage every organisation here:\n\n- **[Institutions](/admin/institutions)** — and **[Import Institutions](/admin/institutions/import)** for bulk uploads.\n- **[Providers](/admin/providers)** — suppliers and service partners.\n- **[Link Institution ↔ Supplier](/admin/link-institution-supplier)** — connect the two (this unlocks the institution's Supplier Details view).\n- **[KPLC Depots](/admin/kplc-depots)** — utility depots.",
    followups: ["How do I import institutions?", "Where do I approve accounts?"],
  },
  {
    id: "delivery",
    topic: "Delivery & installation",
    keywords: ["delivery", "deliveries", "install", "installation", "crew", "crews", "logistics", "deploy"],
    answer:
      "Track rollout under **Delivery**: **[Deliveries](/admin/deliveries)** for equipment dispatch and **[Installation Crews](/admin/installation-crews)** for the teams doing the installs.",
    followups: ["Where's monitoring?", "Where's the pipeline?"],
  },
  {
    id: "me",
    topic: "Monitoring & evaluation",
    keywords: ["monitoring", "risk", "carbon", "ledger", "credit", "verification", "emissions", "m&e", "me", "impact"],
    answer:
      "The **M&E** section covers post-install tracking:\n\n- **[Monitoring](/admin/monitoring)** — monthly readings (clean fuel used, baseline displaced, meals served).\n- **[Risk Register](/admin/risk)** — open risks and relapse flags.\n- **[Carbon Ledger](/admin/carbon)** — forecast vs verified tonnes.\n- **[Credit Verifications](/admin/credit-verifications)** — third-party verification of carbon credits.",
    followups: ["Where's the carbon ledger?", "Where are deliveries?"],
  },
  {
    id: "reference",
    topic: "Reference data",
    keywords: ["reference", "data source", "data point", "financing instrument", "template", "commissioning", "product category", "catalog", "lookup"],
    answer:
      "**Reference Data** holds the building blocks the rest of the platform relies on:\n\n- **[Data Sources](/admin/reference/data-sources)** and **[Data Points](/admin/reference/data-points)** — the sourced-evidence backbone.\n- **[Financing Instruments](/admin/reference/financing-instruments)** — reusable loan/grant templates.\n- **[Commissioning Templates](/admin/reference/commissioning-templates)** and **[Product Categories](/admin/reference/product-categories)**.",
    followups: ["Where's the financing designer?", "Where's the carbon ledger?"],
  },
  {
    id: "content",
    topic: "Content (events, news, resources)",
    keywords: ["content", "event", "events", "news", "article", "resource", "resources", "publish", "blog"],
    answer:
      "Publish to the public site from **Content**: **[Events](/admin/content/events)**, **[News](/admin/content/news)** and **[Resources](/admin/content/resources)**. Anything published here shows up on the public Discover/Insights pages.",
    followups: ["Where do I manage users?", "Where's the pipeline?"],
  },
  {
    id: "finance",
    topic: "Finance",
    keywords: ["finance", "bd", "financing designer", "portfolio", "aggregation", "tco", "deal", "investment", "money"],
    answer:
      "The **Finance** tools:\n\n- **[BD Dashboard](/admin/bd)** — business-development overview.\n- **[Financing Designer](/admin/financing-designer)** — model deal economics (TCO, NPV, IRR, payback).\n- **[Portfolio](/admin/portfolio)** and **[Portfolio Aggregation](/admin/portfolio-aggregation)** — track and roll up funded projects.",
    followups: ["Where are financing instruments?", "Where's MOU & IPA?"],
  },
  {
    id: "agreements",
    topic: "Agreements (MOU & IPA)",
    keywords: ["agreement", "mou", "ipa", "contract", "memorandum", "sign"],
    answer:
      "**[MOU & IPA](/admin/mou-ipa)** is where you manage memoranda of understanding and investment/partnership agreements across organisations.",
    followups: ["Where do I manage providers?", "Where's the portfolio?"],
  },
  {
    id: "people",
    topic: "People & users",
    keywords: ["people", "user", "users", "researcher", "researchers", "other", "others", "subscriber", "subscribers", "account", "manage"],
    answer:
      "The **People** section:\n\n- **[Users](/admin/users)** — all platform accounts and roles.\n- **[Researchers](/admin/researchers)** and **[Others](/admin/others)** — those organisation types.\n- **[Subscribers](/admin/subscribers)** — newsletter / interest list.",
    followups: ["Where do I approve new accounts?", "Where are tickets?"],
  },
  {
    id: "support-analytics",
    topic: "Tickets & analytics",
    keywords: ["ticket", "tickets", "support", "help desk", "engagement", "analytics", "usage", "activity"],
    answer:
      "**[Tickets](/admin/tickets)** is the support queue from every portal. **[Engagement](/admin/engagement)** under Analytics shows how people are using the platform.",
    followups: ["Where do I manage users?", "How do I get around the console?"],
  },
];
