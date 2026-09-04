/**
 * Knowledge base for the "Other organisation" assistant ("Sam").
 * Other orgs land on the pending-approval screen, so this bot reassures them
 * about what's happening and explains the platform while they wait.
 */

import type { KnowledgeEntry } from "../types";

export const otherKnowledge: KnowledgeEntry[] = [
  {
    id: "your-project",
    topic: "Your project",
    keywords: ["project", "workspace", "programme", "what can i do", "overview", "budget", "members", "suppliers", "pipeline", "see"],
    answer:
      "You've been added to a **project** on CleanCookIQ, and you'll only ever see that project. Depending on your role you'll see some of these tabs:\n\n- **Overview** — the budget picture (total, allocated, remaining).\n- **Budget** — the project's budget items.\n- **Members** — the people on the project.\n- **Suppliers** — the project's vendor contacts.\n\nIf you're a **Viewer**, everything is read-only. If you're an **Editor** or **Lead**, you can add and change budget items and suppliers.",
    followups: ["How do I set my password?", "Why can't I edit anything?"],
  },
  {
    id: "first-login",
    topic: "Signing in the first time",
    keywords: ["password", "first", "login", "log in", "invite", "set password", "sign in", "link"],
    answer:
      "When you're added to a project, you're emailed a **link to set your password**. Click it, choose your own password (enter it twice to confirm), then sign in with your **email and that password** — you'll go straight to your project. If the link has expired, use **Forgot password** on the sign-in page to get a fresh one.",
    followups: ["What can I do in my project?", "Why can't I edit anything?"],
  },
  {
    id: "why-readonly",
    topic: "Why you can't edit",
    keywords: ["can't edit", "cannot edit", "read only", "read-only", "no button", "permission", "role", "view only", "greyed"],
    answer:
      "Access is set by your **role** on the project. **Viewers** can see everything but not change it; **Editors** and **Leads** can add and edit budget items and suppliers; only a **Lead** (or the Ignis team) can add or remove members. If you need a different level of access, ask the person who added you to the project.",
    followups: ["What can I do in my project?", "How do I set my password?"],
  },
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
