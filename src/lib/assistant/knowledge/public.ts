/**
 * Knowledge base for the public / marketing-site assistant ("Iggy").
 * Content is drawn from the live Home and About pages so answers stay true to
 * what the site actually says.
 */

import type { KnowledgeEntry } from "../types";

export const publicKnowledge: KnowledgeEntry[] = [
  {
    id: "what-is",
    topic: "What CleanCookIQ is",
    keywords: ["what", "cleancookiq", "platform", "about", "explain", "overview", "do"],
    answer:
      "**CleanCookIQ** is the coordination and intelligence layer for clean institutional cooking. It turns fragmented demand, dispersed supply, and available financing into one structured, verified national transition pipeline.\n\nIn short: it helps institutions across Africa switch to clean cooking, faster — and connects them with the suppliers and funders who can make it happen.",
    followups: ["How does it work?", "Who is it for?", "How do I join?"],
  },
  {
    id: "how-it-works",
    topic: "How it works",
    keywords: ["how", "work", "works", "process", "steps", "stages", "pipeline", "journey"],
    answer:
      "It works in five steps:\n\n- **Register** — institutions share their cooking details: current fuel, meals served, budget, and location.\n- **Assess** — each institution is assessed to find the best clean cooking option.\n- **Match & Finance** — ready institutions are connected with vetted suppliers and interested funders.\n- **Install** — equipment is installed and progress is tracked in real time.\n- **Monitor** — performance is tracked and impact and carbon reports are produced.",
    followups: ["How do I register?", "What clean cooking options are there?", "Explore the map"],
  },
  {
    id: "who-for",
    topic: "Who it's for",
    keywords: ["who", "for", "users", "stakeholder", "role", "audience", "serve"],
    answer:
      "CleanCookIQ serves a multi-stakeholder ecosystem:\n\n- **Institutions** — schools, hospitals and other large kitchens switching to clean cooking.\n- **Solution providers** — equipment suppliers, installers and service partners.\n- **Financiers & investors** — funders looking for curated, lower-risk, data-backed opportunities.\n- **Researchers** — academics and analysts using the data.\n- **Governments & partners** — coordinating large-scale change.\n\nWhatever your role, there's a place for you on the platform.",
    followups: ["How do I register?", "I'm a supplier — how do I join?", "I'm a funder — how do I join?"],
  },
  {
    id: "register",
    topic: "Joining the platform",
    keywords: ["register", "join", "start", "begin", "create", "onboard", "get started", "sign up"],
    answer:
      "Getting started is easy:\n\n1. Go to [Join the platform](/auth/register) and pick your organisation type (institution, supplier, funder, researcher, utility, or other).\n2. Verify your email.\n3. An admin reviews and approves your account.\n4. You complete setup and land in your own dashboard.\n\nYou can also [book a demo](/book-demo) first if you'd like a walkthrough.",
    followups: ["What organisation types are there?", "How long does approval take?", "Book a demo"],
  },
  {
    id: "login",
    topic: "Logging in",
    keywords: ["login", "signin", "log in", "access", "password", "forgot"],
    answer:
      "Already have an account? [Log in here](/auth/login). If you've forgotten your password, use the [reset link](/auth/forgot-password) on the login page. New here? [Create an account](/auth/register) first.",
    followups: ["How do I register?", "How long does approval take?"],
  },
  {
    id: "modules",
    topic: "What the platform offers",
    keywords: ["modules", "features", "offer", "tools", "capabilities", "directory", "tracking"],
    answer:
      "Six modules cover everything a transition needs:\n\n- **Institution Map** — every institution, its current fuel, readiness and transition progress.\n- **Provider Directory** — vetted suppliers, installers and service partners by category.\n- **Training & Technical Support** — connects institutions to qualified support partners.\n- **Financing** — grants, loans and investment in one place.\n- **Portfolio Tracking** — performance, service contracts and support after install.\n- **Programme Management** — procurement, provider bidding and due diligence at scale.",
    followups: ["Explore the map", "How does financing work?", "How do I join?"],
  },
  {
    id: "fuels",
    topic: "Clean cooking options",
    keywords: ["fuel", "cookstove", "options", "technology", "alternatives", "clean cooking", "type"],
    answer:
      "CleanCookIQ is technology-neutral — it helps each institution find the clean cooking option that fits them best, whether that's LPG, biogas, electric (including electric pressure cookers), ethanol, briquettes/pellets, or improved cookstoves. The assessment matches the right solution to each kitchen's needs and budget.",
    followups: ["How does the assessment work?", "How do I register my institution?"],
  },
  {
    id: "financing",
    topic: "Financing",
    keywords: ["finance", "price", "afford", "pay", "fund", "cost"],
    answer:
      "The platform brings grants, loans and investment together in one place and matches funders to investment-ready projects. Every opportunity is scored against the same readiness rubric and modelled for cost (TCO, NPV, IRR, payback) — so funders compare deals on identical terms and capital reaches the projects that are ready.",
    followups: ["I'm a funder — how do I join?", "How does the readiness score work?"],
  },
  {
    id: "map",
    topic: "The national map",
    keywords: ["map", "county", "explore", "where", "location", "coverage"],
    answer:
      "The [interactive map](/map) shows every tracked institution across Kenya's 47 counties — the fuel they cook with today, how ready they are to switch, and the progress of their transition. County pages add live metrics, fuel-price benchmarks and active policies.",
    followups: ["What do the readiness scores mean?", "Browse counties"],
  },
  {
    id: "impact",
    topic: "Impact & carbon",
    keywords: ["impact", "emissions", "savings", "benefit", "results", "monitor", "report"],
    answer:
      "After install, monthly monitoring captures clean fuel used, baseline fuel displaced, meals served and more — building a verifiable evidence trail. That feeds impact and carbon reporting, and a carbon-credits ledger that keeps forecast, estimated and independently-verified tonnes side by side.",
    followups: ["How does monitoring work?", "Who verifies the data?"],
  },
  {
    id: "demo-contact",
    topic: "Demos & contact",
    keywords: ["demo", "contact", "talk", "call", "reach", "sales", "book", "meeting"],
    answer:
      "Want a walkthrough? [Book a demo](/book-demo) and the team will show you the platform and answer your questions directly.",
    followups: ["How do I join?", "Who is it for?"],
  },
  {
    id: "coverage",
    topic: "Where it operates",
    keywords: ["kenya", "africa", "region", "country", "global", "expand", "rollout"],
    answer:
      "CleanCookIQ starts in **Kenya** (Wave 1), expands to **Uganda and Sierra Leone** (Wave 2), and then across **Africa and beyond** (Wave 3). It focuses first on institutional markets, where impact can be aggregated and scaled efficiently.",
    followups: ["Explore the map", "Who is it for?"],
  },
];
