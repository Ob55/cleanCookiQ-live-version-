import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Send, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import RobotAvatar from "./RobotAvatar";
import { getAnswer, getPersona, greeting, type PersonaId } from "@/lib/assistant";

interface ChatMessage {
  id: number;
  role: "bot" | "user";
  text: string;
  followups?: string[];
}

/** Render the tiny markdown subset our answers use: **bold**, [text](/path) links. */
function renderInline(text: string, keyPrefix: string, onLink: () => void): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).filter(Boolean);
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) return <strong key={key} className="font-semibold text-foreground">{bold[1]}</strong>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const [, label, href] = link;
      if (href.startsWith("/")) {
        return (
          <Link key={key} to={href} onClick={onLink} className="text-[#00712D] font-medium underline underline-offset-2 hover:text-[#D4AF37]">
            {label}
          </Link>
        );
      }
      return (
        <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="text-[#00712D] font-medium underline underline-offset-2 hover:text-[#D4AF37]">
          {label}
        </a>
      );
    }
    return <span key={key}>{part}</span>;
  });
}

/** Render answer text into paragraphs, bullet lists and ordered lists. */
function FormattedText({ text, onLink }: { text: string; onLink: () => void }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  let ordered: string[] = [];

  const flushBullets = () => {
    if (!bullets.length) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="list-disc pl-4 space-y-1 my-1">
        {bullets.map((b, i) => <li key={i}>{renderInline(b, `ul-${blocks.length}-${i}`, onLink)}</li>)}
      </ul>,
    );
    bullets = [];
  };
  const flushOrdered = () => {
    if (!ordered.length) return;
    blocks.push(
      <ol key={`ol-${blocks.length}`} className="list-decimal pl-4 space-y-1 my-1">
        {ordered.map((b, i) => <li key={i}>{renderInline(b, `ol-${blocks.length}-${i}`, onLink)}</li>)}
      </ol>,
    );
    ordered = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("- ")) {
      flushOrdered();
      bullets.push(line.slice(2));
    } else if (/^\d+\.\s/.test(line)) {
      flushBullets();
      ordered.push(line.replace(/^\d+\.\s/, ""));
    } else {
      flushBullets();
      flushOrdered();
      if (line) {
        blocks.push(<p key={`p-${blocks.length}`} className="my-1">{renderInline(line, `p-${blocks.length}`, onLink)}</p>);
      }
    }
  }
  flushBullets();
  flushOrdered();
  return <div className="leading-relaxed">{blocks}</div>;
}

/**
 * Floating role-aware AI assistant. Drop one per layout with the matching
 * persona id; it picks up that persona's name, accent, greeting and knowledge.
 */
export default function AIAssistant({ persona: personaId }: { persona: PersonaId }) {
  const persona = getPersona(personaId);
  const { profile } = useAuth();
  const userName = profile?.full_name ?? undefined;
  const firstName = userName?.trim().split(/\s+/)[0];
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const idRef = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // One-time gentle nudge bubble a few seconds after load.
  useEffect(() => {
    if (!persona) return;
    const t = setTimeout(() => setShowBubble(true), 4000);
    const t2 = setTimeout(() => setShowBubble(false), 12000);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [persona]);

  // Seed the greeting the first time the panel opens.
  useEffect(() => {
    if (open && persona && messages.length === 0) {
      setMessages([{ id: idRef.current++, role: "bot", text: greeting(persona, userName), followups: persona.suggestions }]);
    }
  }, [open, persona, messages.length, userName]);

  // Keep the latest message in view.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  // Esc closes the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!persona) return null;

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || thinking) return;
    setInput("");
    setShowBubble(false);
    setMessages((m) => [...m, { id: idRef.current++, role: "user", text: q }]);
    setThinking(true);
    const result = await getAnswer(q, persona, { userName });
    setThinking(false);
    setMessages((m) => [...m, { id: idRef.current++, role: "bot", text: result.text, followups: result.followups }]);
  };

  const lastFollowups = messages.length ? messages[messages.length - 1].followups ?? [] : [];

  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col items-end print:hidden">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-label={`${persona.name}, ${persona.role}`}
            className="mb-3 w-[calc(100vw-2.5rem)] max-w-[380px] h-[min(70vh,560px)] flex flex-col rounded-3xl bg-white border border-black/10 shadow-2xl overflow-hidden"
          >
            {/* header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-black/10" style={{ background: `${persona.accent}10` }}>
              <div className="shrink-0"><RobotAvatar accent={persona.accent} size={40} state={thinking ? "thinking" : "idle"} /></div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-sm text-foreground leading-tight">{persona.name}</p>
                <p className="text-[11px] text-foreground/55 leading-tight">{persona.role}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
                className="h-8 w-8 grid place-items-center rounded-full text-foreground/50 hover:bg-black/5 hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 text-sm text-foreground/90">
              {messages.map((m) => (
                <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2.5",
                      m.role === "user"
                        ? "bg-[#00712D] text-white rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md",
                    )}
                  >
                    {m.role === "bot"
                      ? <FormattedText text={m.text} onLink={() => setOpen(false)} />
                      : <span>{m.text}</span>}
                  </div>
                </div>
              ))}

              {thinking && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="h-2 w-2 rounded-full bg-foreground/40"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* suggestion / follow-up chips */}
              {!thinking && lastFollowups.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {lastFollowups.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-[12px] px-3 py-1.5 rounded-full border border-[#00712D]/30 text-[#00712D] hover:bg-[#00712D] hover:text-white transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <div ref={endRef} />
            </div>

            {/* input */}
            <form
              onSubmit={(e) => { e.preventDefault(); send(input); }}
              className="flex items-center gap-2 p-3 border-t border-black/10"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ask ${persona.name} anything…`}
                aria-label="Type your question"
                className="flex-1 h-10 rounded-full bg-muted px-4 text-sm text-foreground placeholder:text-foreground/40 outline-none focus:ring-2 focus:ring-[#00712D]/30"
              />
              <button
                type="submit"
                disabled={!input.trim() || thinking}
                aria-label="Send"
                className="h-10 w-10 shrink-0 grid place-items-center rounded-full bg-[#00712D] text-white disabled:opacity-40 hover:bg-[#D4AF37] hover:text-black transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* nudge bubble */}
      <AnimatePresence>
        {!open && showBubble && (
          <motion.button
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            onClick={() => setOpen(true)}
            className="mb-3 mr-1 max-w-[230px] rounded-2xl rounded-br-md bg-white border border-black/10 shadow-lg px-3.5 py-2.5 text-left text-[13px] text-foreground/80"
          >
            <span className="font-semibold text-foreground">Hi{firstName ? ` ${firstName}` : ""}, I'm {persona.name}!</span> Need a hand? Ask me anything.
          </motion.button>
        )}
      </AnimatePresence>

      {/* launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label={`Open ${persona.name}, the ${persona.role}`}
          aria-expanded={open}
          className="relative h-16 w-16 grid place-items-center rounded-full bg-white border border-black/10 shadow-xl hover:shadow-2xl transition-shadow"
        >
          <RobotAvatar accent={persona.accent} size={52} />
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 grid place-items-center">
            <Sparkles className="h-4 w-4" style={{ color: persona.accent }} />
          </span>
        </button>
      )}
    </div>
  );
}
