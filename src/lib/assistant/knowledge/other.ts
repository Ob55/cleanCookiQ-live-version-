/**
 * Knowledge base for the "Other organisation" assistant ("Sam").
 * Other orgs land on the pending-approval screen, so this bot reassures them
 * about what's happening and explains the platform while they wait.
 */

import type { KnowledgeEntry } from "../types";

export const otherKnowledge: KnowledgeEntry[] = [
  {
    id: "status",
    topic: "Your account status",
    keywords: ["status", "pending", "approve", "approval", "review", "waiting", "wait", "activate", "when", "long"],
    answer:
      "Thanks for registering! Your account is **under review** by our team. As an \"other\" organisation, we usually like to learn a bit more about how you'd like to work with CleanCookIQ before activating full access. We'll be in touch by email — keep an eye on your inbox.",
    followups: ["What is CleanCookIQ?", "What happens after approval?", "How do I get in touch?"],
  },
  {
    id: "what-is",
    topic: "What CleanCookIQ is",
    keywords: ["what", "cleancookiq", "platform", "about", "explain", "overview", "do", "purpose"],
    answer:
      "**CleanCookIQ** is the coordination and intelligence layer for clean institutional cooking. It turns scattered demand, dispersed supply and available financing into one structured, verified transition pipeline — helping institutions across Africa switch to clean cooking, faster.",
    followups: ["Who is it for?", "What happens after approval?"],
  },
  {
    id: "who-for",
    topic: "Who it's for",
    keywords: ["who", "for", "fit", "role", "type", "organisation", "organization", "stakeholder", "belong"],
    answer:
      "CleanCookIQ serves institutions, solution providers, financiers and investors, researchers, utilities, and government and other partners. If your organisation works around clean cooking in any of these ways, there's a place for you — tell us more via a quick note (see how to get in touch).",
    followups: ["What happens after approval?", "How do I get in touch?"],
  },
  {
    id: "after-approval",
    topic: "What happens after approval",
    keywords: ["after", "approval", "approved", "next", "then", "access", "unlock", "happens", "once"],
    answer:
      "Once your account is approved, you'll get access to the parts of the platform that fit your organisation — and the team will help point you to the right tools and data for what you're trying to do.",
    followups: ["What can I do while I wait?", "How do I get in touch?"],
  },
  {
    id: "meanwhile",
    topic: "While you wait",
    keywords: ["meanwhile", "explore", "wait", "waiting", "browse", "see", "learn", "now", "do"],
    answer:
      "While you wait, you can explore the public side of the platform:\n\n- **[About](/about)** — the story, the gaps we close, and our approach.\n- **[Map](/map)** — institutions across Kenya's 47 counties.\n- **[Resources](/resources)**, **[News](/news)** and **[Events](/events)** — the latest from the sector.",
    followups: ["What is CleanCookIQ?", "How do I get in touch?"],
  },
  {
    id: "contact",
    topic: "Getting in touch",
    keywords: ["contact", "touch", "reach", "email", "talk", "call", "support", "help", "demo", "team"],
    answer:
      "Keen to move things along? You can [book a demo](/book-demo) to talk with the team directly — a great way to tell us how your organisation would like to work with CleanCookIQ.",
    followups: ["What is CleanCookIQ?", "What happens after approval?"],
  },
];
