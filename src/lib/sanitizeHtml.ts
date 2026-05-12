/**
 * Sanitise HTML before dangerouslySetInnerHTML.
 *
 * Used for content that *should* be trusted (static .docx templates
 * we control, mammoth output) — DOMPurify is a defence-in-depth layer
 * so a future content change that smuggles in <script> / onclick=
 * can't escape to XSS.
 */
import DOMPurify from "dompurify";

// DOMPurify already strips inline event handlers and javascript: URLs
// by default; we list them explicitly here as a self-documenting
// belt-and-braces guarantee.
const DEFAULT_CONFIG = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form"],
  FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
};

export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") return ""; // SSR safety
  return DOMPurify.sanitize(html, DEFAULT_CONFIG) as unknown as string;
}
