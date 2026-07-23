/**
 * Knowledge base for the researcher portal assistant ("Niko").
 * The researcher portal is intentionally lean (Dashboard + Tickets), so this
 * bot also points researchers to the public Insights/Discover data surfaces.
 */

import type { KnowledgeEntry } from "../types";

export const researcherKnowledge: KnowledgeEntry[] = [
  {
    id: "navigate",
    topic: "Getting around",
    keywords: ["navigate", "menu", "find", "where", "sidebar", "sections", "pages", "around", "portal"],
    answer:
      "Your researcher portal keeps it simple:\n\n- **[Dashboard](/researcher/dashboard)** — your overview and access.\n- **[Tickets](/researcher/support)** — request data, access or help from the team.\n\nMost of the data lives on the public **Insights** and **Discover** sections — see below.",
    followups: ["Where's the data and intelligence?", "How do I request a dataset?", "Where's the policy library?"],
  },
  {
    id: "data",
    topic: "Data & intelligence",
    keywords: ["data", "dataset", "datasets", "intelligence", "insights", "statistics", "stats", "analysis", "metrics", "download"],
    answer:
      "Explore the platform's data through:\n\n- **[Intelligence](/intelligence)** — sector analysis and trends.\n- **[Market Insights](/marketing)** — market-level data.\n- **[Counties](/counties)** — county-by-county pipelines, fuel-price benchmarks and coverage.\n- **[Map](/map)** — every tracked institution and its readiness.\n\nEvery metric ties back to a sourced data point with publisher, citation, validity date and confidence level — so it's citable.",
    followups: ["Where's the policy library?", "How do I request a dataset?"],
  },
  {
    id: "policy",
    topic: "Policy library",
    keywords: ["policy", "policies", "regulation", "law", "library", "framework", "government"],
    answer:
      "The **[Policy Library](/policy)** collects clean cooking policies — national, regional and sectoral — with status, effective dates and the organisation types and fuels each applies to. Useful for grounding research in the current regulatory picture.",
    followups: ["Where's the data and intelligence?", "Where are resources and reports?"],
  },
  {
    id: "resources",
    topic: "Resources & reports",
    keywords: ["resource", "resources", "report", "reports", "publication", "guide", "case study", "toolkit", "reading"],
    answer:
      "The **[Resources](/resources)** library holds guides, standards, reports, case studies and datasets you can filter by type and audience. **[News](/news)** and **[Events](/events)** cover the latest from the sector.",
    followups: ["Where's the policy library?", "Where's the data and intelligence?"],
  },
  {
    id: "sourcing",
    topic: "How the data is sourced",
    keywords: ["source", "sourced", "citation", "cite", "reference", "evidence", "confidence", "verify", "methodology", "trust"],
    answer:
      "CleanCookIQ is built on traceable evidence: every metric links to a sourced data point recording its publisher, citation, validity date and confidence level. Monitoring readings (clean fuel used, baseline displaced, meals served) are captured against per-fuel templates an external verifier could audit.",
    followups: ["Where's the data and intelligence?", "How do I request a dataset?"],
  },
  {
    id: "request",
    topic: "Requesting data or access",
    keywords: ["request", "access", "permission", "api", "export", "collaborate", "partnership", "raw data"],
    answer:
      "Need a specific dataset, deeper access, or to discuss a research collaboration? Open a **[Ticket](/researcher/support)** and the team will follow up.",
    followups: ["Where's the data and intelligence?", "Where are resources and reports?"],
  },
  {
    id: "support",
    topic: "Getting help",
    keywords: ["support", "ticket", "help", "issue", "problem", "stuck", "contact", "question"],
    answer:
      "Open a **[Ticket](/researcher/support)** to reach the CleanCookIQ team — for access, data requests or anything else. Replies appear under the bell icon.",
    followups: ["How do I request a dataset?", "Where's the data and intelligence?"],
  },
];
