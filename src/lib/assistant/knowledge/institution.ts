/**
 * Knowledge base for the institution-portal assistant ("Ada").
 * Grounded in the institution layout's navigation and workflow so it can both
 * answer questions and help users navigate their dashboard.
 */

import type { KnowledgeEntry } from "../types";

export const institutionKnowledge: KnowledgeEntry[] = [
  {
    id: "navigate",
    topic: "Getting around your portal",
    keywords: ["navigate", "menu", "find", "where", "sidebar", "sections", "pages", "around", "go"],
    answer:
      "Your portal has these sections in the left sidebar:\n\n- **[Dashboard](/institution/dashboard)** — your overview and progress at a glance.\n- **[My Institution](/institution/profile)** — your institution's profile and details.\n- **[Cooking Counting](/institution/alchemy)** — log and work out your cooking/fuel use.\n- **[Documents](/institution/documents)** — upload and manage your files.\n- **[IPA](/institution/ipa)** — your investment / partnership agreement.\n- **[Supplier Details](/institution/supplier-details)** — appears once an admin shares a supplier with you.\n- **[Tickets](/institution/support)** — get help and raise issues.",
    followups: ["How do I update my profile?", "How do I upload documents?", "What is the IPA?"],
  },
  {
    id: "dashboard",
    topic: "Your dashboard",
    keywords: ["dashboard", "overview", "home", "summary", "status", "progress"],
    answer:
      "Your [Dashboard](/institution/dashboard) is your home base — it shows where your institution is in the transition journey, your readiness, and what to do next. Start here each time you log in.",
    followups: ["What's my readiness score?", "What are the next steps?"],
  },
  {
    id: "profile",
    topic: "Your institution profile",
    keywords: ["profile", "details", "update", "edit", "information", "institution", "change"],
    answer:
      "Open **[My Institution](/institution/profile)** to view and update your details — current fuel, meals served per day, budget, location and decision-maker contact. Keeping this accurate improves your assessment and helps the right suppliers and funders find you.",
    followups: ["Why does accurate info matter?", "What's the readiness score?"],
  },
  {
    id: "alchemy",
    topic: "Cooking Counting",
    keywords: ["cooking counting", "alchemy", "log", "fuel", "consumption", "usage", "meals", "calculate"],
    answer:
      "**[Cooking Counting](/institution/alchemy)** is where you record and work out your cooking — your current fuel, how much you use, and meals served. This data drives your assessment and the savings/impact estimates for switching to a clean option.",
    followups: ["How is my assessment calculated?", "How do I update my profile?"],
  },
  {
    id: "documents",
    topic: "Documents",
    keywords: ["documents", "upload", "file", "attach", "paperwork", "download"],
    answer:
      "Use **[Documents](/institution/documents)** to upload and manage your files — assessments, agreements, photos and any paperwork suppliers or funders need. Keeping documents here means everyone working on your transition sees the same up-to-date record.",
    followups: ["What documents do I need?", "What is the IPA?"],
  },
  {
    id: "ipa",
    topic: "IPA (your agreement)",
    keywords: ["ipa", "agreement", "partnership", "investment", "contract", "terms"],
    answer:
      "**[IPA](/institution/ipa)** is your investment / partnership agreement — the terms of your transition project. Review it here, and raise a [ticket](/institution/support) if anything needs clarifying before you proceed.",
    followups: ["How do I raise a ticket?", "Where are my documents?"],
  },
  {
    id: "supplier-details",
    topic: "Supplier Details",
    keywords: ["supplier details", "provider", "installer", "vendor", "supplier", "locked", "unlock"],
    answer:
      "The **Supplier Details** section unlocks automatically once an admin shares a supplier with your institution. Until then it shows a lock icon. When a supplier is matched to you, you'll see their details and a badge on the menu item.",
    followups: ["How are suppliers matched to me?", "How do I raise a ticket?"],
  },
  {
    id: "tickets-support",
    topic: "Getting help",
    keywords: ["support", "ticket", "help", "issue", "problem", "stuck", "contact", "question"],
    answer:
      "Need a hand? Open **[Tickets](/institution/support)** to raise an issue or ask the CleanCookIQ team a question. You'll get notified of replies via the bell icon at the top of the page.",
    followups: ["How do I update my profile?", "What are the next steps?"],
  },
  {
    id: "assessment",
    topic: "Your readiness & assessment",
    keywords: ["assess", "readiness", "score", "rating", "evaluation", "ready", "rubric"],
    answer:
      "Your institution is scored against an eight-dimension readiness rubric — current fuel, kitchen condition, financing preference, scale, monthly fuel spend, decision-maker authority and more. A higher, well-evidenced score makes your project easier for funders to back. Keep your profile and Cooking Counting up to date to improve it.",
    followups: ["How do I update my profile?", "Where do I log cooking data?"],
  },
  {
    id: "next-steps",
    topic: "What to do next",
    keywords: ["next", "steps", "todo", "should", "now", "start", "first"],
    answer:
      "A good order to work through:\n\n1. Complete **[My Institution](/institution/profile)** so your details are accurate.\n2. Log your cooking in **[Cooking Counting](/institution/alchemy)**.\n3. Upload any required files in **[Documents](/institution/documents)**.\n4. Check your **[Dashboard](/institution/dashboard)** for your readiness and next actions.\n5. Raise a **[ticket](/institution/support)** anytime you're unsure.",
    followups: ["What's the readiness score?", "How do I upload documents?"],
  },
  {
    id: "notifications",
    topic: "Notifications & account",
    keywords: ["notification", "bell", "alert", "account", "organisation", "settings", "signout", "logout"],
    answer:
      "The **bell** icon at the top shows your notifications (e.g. ticket replies or supplier matches). The **circle with your initials** opens your organisation account settings. To sign out, use **Sign Out** at the bottom of the sidebar.",
    followups: ["How do I raise a ticket?", "How do I update my profile?"],
  },
];
