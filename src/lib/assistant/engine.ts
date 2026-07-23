/**
 * The local matching engine that powers every assistant.
 *
 * Design goals:
 *  - Robust: never throws on weird input; always returns something useful.
 *  - Handles multi-part questions ("what is X and how do I Y?") by splitting
 *    and answering each part, then combining.
 *  - Cheap and synchronous, but exposed behind an async `getAnswer()` seam so
 *    a real LLM backend can replace it later with zero UI changes.
 */

import type { AnswerResult, KnowledgeEntry, PersonaConfig } from "./types";

const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "am", "be", "to", "of", "and", "or", "in",
  "on", "for", "with", "i", "you", "we", "they", "it", "this", "that", "do",
  "does", "did", "can", "could", "would", "should", "will", "my", "me", "our",
  "your", "what", "whats", "how", "why", "when", "where", "who", "which", "as",
  "at", "by", "from", "if", "so", "but", "about", "into", "there", "here",
  "please", "tell", "show", "help", "need", "want", "get", "any", "some",
]);

/** Light synonym map so users don't have to use our exact wording. */
const SYNONYMS: Record<string, string> = {
  signup: "register", "sign-up": "register", join: "register", enrol: "register",
  enroll: "register", registration: "register", account: "register",
  login: "signin", "log-in": "signin", "sign-in": "signin",
  cost: "price", pricing: "price", fee: "price", fees: "price", charge: "price",
  money: "finance", funding: "finance", financing: "finance", loan: "finance",
  loans: "finance", grant: "finance", grants: "finance", invest: "finance",
  investment: "finance", investor: "finance", capital: "finance",
  stove: "cookstove", stoves: "cookstove", cooker: "cookstove",
  lpg: "fuel", gas: "fuel", biogas: "fuel", electric: "fuel", firewood: "fuel",
  charcoal: "fuel", briquette: "fuel", ethanol: "fuel", pellet: "fuel",
  school: "institution", schools: "institution", hospital: "institution",
  prison: "institution", institutions: "institution",
  supplier: "provider", suppliers: "provider", vendor: "provider",
  providers: "provider", seller: "provider", installer: "provider",
  map: "map", maps: "map", county: "county", counties: "county",
  document: "documents", docs: "documents", file: "documents",
  upload: "documents", quote: "quotes", quotation: "quotes",
  assessment: "assess", score: "assess", scoring: "assess", readiness: "assess",
  carbon: "emissions", co2: "emissions", climate: "emissions",
  contact: "support", ticket: "support", tickets: "support", issue: "support",
  problem: "support", helpdesk: "support",
};

/** Normalise free text into a deduped list of meaningful, synonym-folded tokens. */
export function tokenize(text: string): string[] {
  const raw = (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const out: string[] = [];
  for (const word of raw) {
    if (STOPWORDS.has(word)) continue;
    out.push(SYNONYMS[word] ?? word);
  }
  return out;
}

/** Score how well an entry matches the question. */
export function scoreEntry(
  entry: KnowledgeEntry,
  tokens: string[],
  rawLower: string,
): number {
  const tokenSet = new Set(tokens);
  let score = 0;
  for (const kwRaw of entry.keywords) {
    const kw = kwRaw.toLowerCase();
    if (kw.includes(" ")) {
      // Multi-word phrase: substring match against the raw question, weighted higher.
      if (rawLower.includes(kw)) score += 3;
    } else {
      const folded = SYNONYMS[kw] ?? kw;
      if (tokenSet.has(folded) || tokenSet.has(kw)) score += 1;
    }
  }
  // Small boost when a topic word shows up in the question.
  for (const t of tokenize(entry.topic)) {
    if (tokenSet.has(t)) score += 0.5;
  }
  return score;
}

/** Best single entry for a question fragment, or null if nothing clears the bar. */
function bestEntry(fragment: string, entries: KnowledgeEntry[]): KnowledgeEntry | null {
  const tokens = tokenize(fragment);
  if (tokens.length === 0) return null;
  const rawLower = fragment.toLowerCase();
  let best: KnowledgeEntry | null = null;
  let bestScore = 0;
  for (const entry of entries) {
    const s = scoreEntry(entry, tokens, rawLower);
    if (s > bestScore) {
      bestScore = s;
      best = entry;
    }
  }
  return bestScore >= 1 ? best : null;
}

/**
 * Split a question into independent parts so multi-part questions all get
 * answered. We split on punctuation plus the common "and"/comma joiners.
 * Over-splitting is harmless: fragments with no real keywords resolve to
 * nothing and are dropped, and duplicate matches are de-duped by the caller.
 */
function splitQuestion(query: string): string[] {
  const parts = query
    .split(/\?|;|\band also\b|\balso\b|\bplus\b|,|\s+and\s+/gi)
    .map((p) => p.trim())
    .filter((p) => p.length > 2);
  return parts.length ? parts : [query.trim()];
}

// Small-talk intent patterns so the bots feel human, not like a wall.
const GREETING_RE = /\b(hi+|hey+|hello+|yo|howdy|hallo|sasa|niaje|mambo|jambo|habari|hola|good (morning|afternoon|evening))\b/i;
const HOWRU_RE = /\b(how are you|how(?:'?s| is) it going|how are things|how(?:'?s| is) your day|you (?:doing )?(?:ok|okay|good|well|fine)|what'?s up|whats up|wassup|sup)\b/i;
const NAME_RE = /\b(your name|who are you|what are you|introduce yourself)\b/i;
const BOT_RE = /\b(are you (?:a )?(?:robot|bot|ai|human|real|person)|made you|created you|built you|who made)\b/i;
const JOKE_RE = /\b(joke|make me laugh|funny|cheer me up)\b/i;
const THANKS_RE = /\b(thanks|thank you|thx|asante|cheers|appreciate|nice one)\b/i;
const BYE_RE = /\b(bye|goodbye|see ya|see you|later|cya|take care)\b/i;
const COMPLIMENT_RE = /\b(you(?:'?re| are) (?:great|awesome|nice|cool|helpful|smart|the best|amazing|the goat|legend)|i love you|good (?:bot|job|boy)|well done|nice work)\b/i;
const CAPABILITY_RE = /\b(what can you (?:do|help)|how can you help|what do you do|help me with|capabilit)/i;
const LAUGH_RE = /\b(lol|lmao|lmfao|rofl|haha+|hehe+|hihi|😂|🤣|😅)\b/i;
const BORED_RE = /\b(i'?m bored|so bored|bored|entertain me|this is boring)\b/i;

/** Extract a usable first name, or "" if there isn't a clean one. */
function firstName(name?: string): string {
  if (!name) return "";
  const n = name.trim().split(/\s+/)[0];
  return /^[a-z][a-z'-]*$/i.test(n) ? n.charAt(0).toUpperCase() + n.slice(1) : "";
}

/** Pick a random variant so replies don't feel canned. */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** A warm, slangy opener, optionally using the person's name. */
function hey(name: string): string {
  return name
    ? pick([`Yo ${name}!`, `Heyy ${name}!`, `Ayy ${name}!`, `Hey hey ${name}!`])
    : pick(["Yo!", "Heyy!", "Ayy!", "Hey hey!"]);
}

/** ", Brian" or "" — convenient suffix for warm lines. */
function comma(name: string): string {
  return name ? `, ${name}` : "";
}

/** Casual, slangy openers — keep the vibe, not corporate. */
const OPENERS = [
  "What's good? 😎",
  "Whatchu need today? 🔥",
  "Talk to me — what's up? 👀",
  "Ask me anything, fam 💬",
  "What we doing today? 😄",
  "Hit me with it 👇",
];

/** The opening message shown when a chat panel is first opened. Warm, not formal. */
export function greeting(persona: PersonaConfig, userName?: string): string {
  const name = firstName(userName);
  return `${hey(name)} 👋 I'm **${persona.name}**. ${pick(OPENERS)}`;
}

/** Find the best knowledge entries for a (possibly multi-part) question. */
function findHits(query: string, persona: PersonaConfig): KnowledgeEntry[] {
  const seen = new Set<string>();
  const hits: KnowledgeEntry[] = [];
  for (const part of splitQuestion(query)) {
    if (hits.length >= 3) break;
    const entry = bestEntry(part, persona.knowledge);
    if (entry && !seen.has(entry.id)) {
      seen.add(entry.id);
      hits.push(entry);
    }
  }
  return hits;
}

/** Resolve a question to an answer: real knowledge first, then natural small talk. */
export function resolve(
  query: string,
  persona: PersonaConfig,
  opts?: { userName?: string },
): AnswerResult {
  const name = firstName(opts?.userName);
  const q = (query || "").trim();
  if (!q) {
    return { text: greeting(persona, opts?.userName), matched: true, followups: persona.suggestions };
  }

  // 1) Real knowledge wins — even if wrapped in a greeting ("hi, how do I join?").
  const hits = findHits(q, persona);
  if (hits.length > 0) {
    let text =
      hits.length === 1
        ? hits[0].answer
        : hits.map((h) => `**${h.topic}**\n${h.answer}`).join("\n\n");
    const followups =
      hits.length === 1
        ? hits[0].followups ?? []
        : Array.from(new Set(hits.flatMap((h) => h.followups ?? []))).slice(0, 4);
    if (GREETING_RE.test(q) || HOWRU_RE.test(q)) {
      text = `${pick([`Gotchu${comma(name)}! 🙌`, `Bet${comma(name)} — say less 👇`, `Easy${comma(name)}! 😎`, `Aight${comma(name)}, here you go 🔥`])}\n\n${text}`;
    }
    return { text, matched: true, followups };
  }

  // 2) No knowledge match — keep the conversation human.
  if (COMPLIMENT_RE.test(q)) {
    return {
      text: pick([
        `Ayy thank you${comma(name)}! 😎🙏 means a lot fr`,
        `You're the real MVP${comma(name)}! 🙌 what's next?`,
        `Stop it, you 😄 — whatchu need${comma(name)}?`,
        `That made my circuits happy ⚡😊 what's up${comma(name)}?`,
        `Right back at you${comma(name)}! 🤙 how can I help?`,
        `Aw shucks 🥹 you're too sweet${comma(name)}! what we doing?`,
      ]),
      matched: true,
      followups: persona.suggestions,
    };
  }
  if (JOKE_RE.test(q) || BORED_RE.test(q)) {
    return {
      text: pick([
        "Why did the cook switch to clean energy? The old stove was just too *fuelish*. 😄",
        "I'd tell you a cooking joke, but I don't want to *grill* you. 😅",
        "What's a stove's favourite music? Anything with a good *gas* line. 🔥",
        "Why don't pots ever win arguments? They always get a *lid* on it. 🍲",
        "I tried to make a joke about firewood… but it didn't really *spark*. 🪵😆",
        "What did the kettle say to the cook? \"You're *steaming* me up!\" ☕",
        "Why did the charcoal go to school? To get a little *brighter*. 🔥",
        "How does an electric cooker say sorry? \"My bad, I had a *current* lapse.\" ⚡😄",
        "Why was the biogas digester so calm? It just goes with the *flow*. 💨",
        "Two stoves walk into a kitchen. One says: \"Is it just me, or is it getting hot in here?\" 🔥😂",
      ]),
      matched: true,
      followups: persona.suggestions,
    };
  }
  if (LAUGH_RE.test(q)) {
    return {
      text: pick([
        `Hahah glad I could make you laugh${comma(name)}! 😂 want another?`,
        `😂😂 right?? anyway${comma(name)} — whatchu need?`,
        `Glad you're vibing${comma(name)}! 😁 what's up?`,
        `LMAO okay I'm kinda funny ngl 😎 what can I do${comma(name)}?`,
      ]),
      matched: true,
      followups: persona.suggestions,
    };
  }
  if (BOT_RE.test(q)) {
    return {
      text: `Good question${comma(name)}! 😄 I'm **${persona.name}**, a lil AI assistant built into CleanCookIQ — not human, but I gotchu fr. ${persona.scopeNote}`,
      matched: true,
      followups: persona.suggestions,
    };
  }
  if (NAME_RE.test(q) || CAPABILITY_RE.test(q)) {
    return {
      text: `I'm **${persona.name}**${name ? `, nice to meet you ${name}` : ""} 😎 — ${persona.scopeNote} Try one of these:`,
      matched: true,
      followups: persona.suggestions,
    };
  }
  if (HOWRU_RE.test(q)) {
    return {
      text: pick([
        `I'm vibing${comma(name)}, thanks for asking! 😎 what's good?`,
        `Lowkey thriving rn ⚡ wbu${comma(name)}? whatchu need?`,
        `All good fam, no cap 🙌 how can I help?`,
        `Charged up and ready 🔋 what we doing${comma(name)}?`,
        `Can't complain${comma(name)} — don't even need coffee ☕😄 what's up?`,
      ]),
      matched: true,
      followups: persona.suggestions,
    };
  }
  if (GREETING_RE.test(q)) {
    return {
      text: pick([
        `${hey(name)} 👋 I'm **${persona.name}**. ${pick(OPENERS)}`,
        `${hey(name)} 😎 good to see you — whatchu need?`,
        `${hey(name)} 🙌 I'm **${persona.name}**. what's on your mind?`,
        `${hey(name)} 🔥 what's good today?`,
      ]),
      matched: true,
      followups: persona.suggestions,
    };
  }
  if (THANKS_RE.test(q)) {
    return {
      text: pick([
        `Anytime${comma(name)}! 🙌`,
        `Gotchu${comma(name)}! 😎 anything else?`,
        `No worries fam 💯`,
        `Easy${comma(name)}! holla if you need more 😄`,
        `You got it${comma(name)}! 🤙`,
      ]),
      matched: true,
      followups: persona.suggestions,
    };
  }
  if (BYE_RE.test(q)) {
    return {
      text: pick([
        `Catch you later${comma(name)}! ✌️`,
        `Laters${comma(name)}! stay clean & green 🌱`,
        `Peace${comma(name)}! ✌️😄 I gotchu whenever`,
        `Bye for now${comma(name)}! holla anytime 🔥`,
      ]),
      matched: true,
      followups: [],
    };
  }

  // 3) Nothing matched — graceful fallback.
  return { text: persona.fallback, matched: false, followups: persona.suggestions };
}

/**
 * Public async seam. Today it runs the local engine; swap the body for a
 * `fetch()` to an edge function when a live model is wired up — the UI awaits
 * this and needs no changes.
 */
export function getAnswer(
  query: string,
  persona: PersonaConfig,
  opts?: { userName?: string },
): Promise<AnswerResult> {
  try {
    return Promise.resolve(resolve(query, persona, opts));
  } catch {
    return Promise.resolve({ text: persona.fallback, matched: false, followups: persona.suggestions });
  }
}
