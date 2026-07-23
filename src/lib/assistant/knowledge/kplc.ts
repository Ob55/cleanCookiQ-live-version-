/**
 * Knowledge base for the Electricity & Utilities (KPLC depot) assistant ("Volt").
 * Grounded in the KPLC layout: depot dashboard and the institutions map for a
 * region/service area moving to electric cooking.
 */

import type { KnowledgeEntry } from "../types";

export const kplcKnowledge: KnowledgeEntry[] = [
  {
    id: "navigate",
    topic: "Getting around your portal",
    keywords: ["navigate", "menu", "find", "where", "sidebar", "sections", "pages", "around", "portal"],
    answer:
      "Your depot portal has these sections:\n\n- **[Dashboard](/kplc/dashboard)** — your depot overview and activity.\n- **[Institutions](/kplc/institutions)** — the institutions in your service area and where they are in the transition.\n- **[Tickets](/kplc/support)** — get help from the CleanCookIQ team.",
    followups: ["What does the Institutions view show?", "How do I raise a ticket?"],
  },
  {
    id: "dashboard",
    topic: "Your depot dashboard",
    keywords: ["dashboard", "overview", "home", "summary", "depot", "status", "region", "branch"],
    answer:
      "The **[Dashboard](/kplc/dashboard)** is your depot's home base — an overview of clean cooking activity across your regional office or service area, so you can see demand for electric cooking building in your patch.",
    followups: ["What does the Institutions view show?", "Why does electric cooking matter here?"],
  },
  {
    id: "institutions",
    topic: "Institutions in your area",
    keywords: ["institution", "institutions", "map", "list", "area", "coverage", "schools", "hospitals", "load", "connections"],
    answer:
      "**[Institutions](/kplc/institutions)** shows the institutions in your service area on a map — their current fuel, readiness to switch, and transition progress. It helps you anticipate new electric-cooking load and coordinate connections, capacity and support where demand is concentrating.",
    followups: ["Why does electric cooking matter here?", "How do I raise a ticket?"],
  },
  {
    id: "why-electric",
    topic: "Electric cooking & the grid",
    keywords: ["electric", "electricity", "grid", "power", "load", "epc", "pressure cooker", "demand", "utility", "why"],
    answer:
      "As institutions switch from firewood, charcoal and LPG to electric cooking (including electric pressure cookers), they become meaningful, predictable new load. Seeing that demand build by area lets a utility plan connections and capacity ahead of time — and position itself as a partner in the clean cooking transition rather than reacting after the fact.",
    followups: ["What does the Institutions view show?", "What's on my dashboard?"],
  },
  {
    id: "support",
    topic: "Getting help",
    keywords: ["support", "ticket", "help", "issue", "problem", "stuck", "contact", "question"],
    answer:
      "Open a **[Ticket](/kplc/support)** to reach the CleanCookIQ team. Replies show under the bell icon at the top of the page.",
    followups: ["What does the Institutions view show?", "What's on my dashboard?"],
  },
];
