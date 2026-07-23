/**
 * Knowledge base for the funder / financing-partner portal assistant ("Vera").
 * Grounded in the funder layout: deal flow, portfolio, co-investment, impact,
 * the readiness rubric and the TCO/financing model.
 */

import type { KnowledgeEntry } from "../types";

export const funderKnowledge: KnowledgeEntry[] = [
  {
    id: "navigate",
    topic: "Getting around your portal",
    keywords: ["navigate", "menu", "find", "where", "sidebar", "sections", "pages", "around"],
    answer:
      "Your funder portal has these sections:\n\n- **[Dashboard](/funder/dashboard)** — your overview, ranked against your preferences.\n- **[Deal Flow](/funder/deals)** — live, investment-ready opportunities.\n- **[Portfolio](/funder/portfolio)** — the projects you're backing.\n- **[Co-investment](/funder/coinvestment)** — deals to share with other funders.\n- **[Impact](/funder/impact)** — your impact and carbon reporting.\n- **[Documents](/funder/documents)** — your files and agreements.\n- **[Tickets](/funder/support)** — get help from the team.",
    followups: ["How does the readiness score work?", "What's in Deal Flow?", "How is impact measured?"],
  },
  {
    id: "deals",
    topic: "Deal flow",
    keywords: ["deal", "deals", "dealflow", "pipeline", "opportunity", "opportunities", "invest", "projects", "ready"],
    answer:
      "**[Deal Flow](/funder/deals)** ranks live opportunities against your stated preferences — county, fuel, ticket size and maximum acceptable risk — and flags hard mismatches up front. Every project is scored on the same rubric, so you compare apples to apples instead of scattered concept notes.",
    followups: ["How does the readiness score work?", "What financial metrics do I get?"],
  },
  {
    id: "readiness",
    topic: "Readiness score",
    keywords: ["readiness", "score", "rubric", "assess", "ready", "rating", "diligence", "due diligence", "criteria"],
    answer:
      "Every institution carries an **eight-dimension readiness score** — current fuel, kitchen condition, financing preference, scale, monthly fuel spend, decision-maker authority and more — each with an audit trail behind it. It gives every funder a shared, transparent definition of \"investment-ready\".",
    followups: ["What financial metrics do I get?", "What's in Deal Flow?"],
  },
  {
    id: "financials",
    topic: "Financial metrics (TCO / NPV / IRR)",
    keywords: ["tco", "npv", "irr", "payback", "return", "model", "financial", "metrics", "economics", "numbers"],
    answer:
      "A built-in **TCO and financing model** produces NPV, IRR, and simple and discounted payback for every project — on identical terms — so deals are directly comparable. Reusable financing instruments (concessional loans, blended grants, PAYGO and more) come pre-modelled with default terms.",
    followups: ["How does the readiness score work?", "How is impact measured?"],
  },
  {
    id: "portfolio",
    topic: "Portfolio",
    keywords: ["portfolio", "investments", "holdings", "track", "backing", "projects", "monitor"],
    answer:
      "**[Portfolio](/funder/portfolio)** tracks the projects you're backing — their stage, delivery progress and performance — against the same shared institution record everyone else works from. No re-asking the same questions; the next milestone is always visible.",
    followups: ["How is impact measured?", "What is co-investment?"],
  },
  {
    id: "coinvestment",
    topic: "Co-investment",
    keywords: ["coinvestment", "co-investment", "co invest", "syndicate", "share", "partner", "blended", "together"],
    answer:
      "**[Co-investment](/funder/coinvestment)** surfaces deals you can share with other funders — useful for larger tickets or blended structures where several partners come in together.",
    followups: ["What's in Deal Flow?", "How is impact measured?"],
  },
  {
    id: "impact",
    topic: "Impact & carbon",
    keywords: ["impact", "carbon", "emissions", "co2", "report", "reporting", "results", "outcomes", "credits", "verified"],
    answer:
      "**[Impact](/funder/impact)** shows verifiable outcomes from monthly monitoring — clean fuel used, baseline fuel displaced, meals served — every number traceable to a sourced data point. A carbon-credits ledger keeps forecast, estimated and independently-verified tonnes side by side, so you see what's promised versus what's banked.",
    followups: ["How does the readiness score work?", "Where's my portfolio?"],
  },
  {
    id: "support",
    topic: "Getting help",
    keywords: ["support", "ticket", "help", "issue", "problem", "stuck", "contact", "question"],
    answer:
      "Need a hand? Open **[Tickets](/funder/support)** to reach the CleanCookIQ team. Replies show under the bell icon at the top of the page.",
    followups: ["What's in Deal Flow?", "How does the readiness score work?"],
  },
];
