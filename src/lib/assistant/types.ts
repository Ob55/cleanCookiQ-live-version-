/**
 * Types for the in-app AI assistants ("bots").
 *
 * Each role on the platform gets its own persona — a floating robot that
 * answers questions about that part of CleanCookIQ. The bots are knowledge
 * driven (no external API): every persona ships a curated knowledge base and
 * a local matching engine resolves a user's question to the best answer.
 *
 * The seam is deliberate: `getAnswer()` in ./engine returns a Promise, so a
 * live LLM backend (e.g. a Supabase edge function calling Claude) can be
 * dropped in later without touching the UI.
 */

export type PersonaId =
  | "public"
  | "admin"
  | "institution"
  | "supplier"
  | "funder"
  | "researcher"
  | "kplc"
  | "csr"
  | "other";

/** A single unit of knowledge the engine can match a question against. */
export interface KnowledgeEntry {
  /** Stable id, unique within a persona. */
  id: string;
  /** Short human label shown as a heading when several answers are combined. */
  topic: string;
  /**
   * Trigger terms. Single words match against query tokens; multi-word
   * phrases match as a substring of the raw question. All lowercase.
   */
  keywords: string[];
  /** The answer, in a tiny markdown subset (paragraphs, **bold**, "- " bullets, [text](/path) links). */
  answer: string;
  /** Optional suggested follow-up questions surfaced after this answer. */
  followups?: string[];
}

/** Everything that defines one bot. */
export interface PersonaConfig {
  id: PersonaId;
  /** The bot's name, e.g. "Iggy". */
  name: string;
  /** The bot's role line, e.g. "Platform Guide". */
  role: string;
  /** First message shown when the panel opens. */
  greeting: string;
  /** Brand accent colour (hex) for this persona. */
  accent: string;
  /** One-line description of what this bot can / can't help with. */
  scopeNote: string;
  /** Starter question chips. */
  suggestions: string[];
  /** The curated knowledge base. */
  knowledge: KnowledgeEntry[];
  /** Shown when nothing matches confidently. */
  fallback: string;
}

/** The result of answering a question. */
export interface AnswerResult {
  /** The answer text (markdown subset). */
  text: string;
  /** Whether the engine matched real knowledge (false = fallback). */
  matched: boolean;
  /** Suggested follow-up questions to show as chips. */
  followups: string[];
}
