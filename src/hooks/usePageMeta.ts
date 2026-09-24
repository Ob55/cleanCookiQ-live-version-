/**
 * Per-route <head> metadata for the public pages (title, description,
 * canonical, og/twitter, robots). index.html carries the site-wide
 * defaults; this overrides them while a page is mounted and restores them
 * on unmount. Googlebot renders JS, so this is what it indexes per URL.
 */
import { useEffect } from "react";

export const SITE_ORIGIN = "https://cleancookiq.com";
const SITE_NAME = "CleanCookIQ";

export interface PageMeta {
  /** Page-specific title; " | CleanCookIQ" is appended. Omit on the home page. */
  title?: string;
  description?: string;
  /** Route path for the canonical URL, e.g. "/about". Omit to skip canonical (e.g. 404). */
  path?: string;
  noindex?: boolean;
}

type Tag = { selector: string; create: () => HTMLElement; attr: "content" | "href" };

const meta = (key: "name" | "property", value: string): Tag => ({
  selector: `meta[${key}="${value}"]`,
  create: () => {
    const el = document.createElement("meta");
    el.setAttribute(key, value);
    return el;
  },
  attr: "content",
});

const TAGS = {
  description: meta("name", "description"),
  robots: meta("name", "robots"),
  ogTitle: meta("property", "og:title"),
  ogDescription: meta("property", "og:description"),
  ogUrl: meta("property", "og:url"),
  twitterTitle: meta("name", "twitter:title"),
  twitterDescription: meta("name", "twitter:description"),
  canonical: {
    selector: 'link[rel="canonical"]',
    create: () => {
      const el = document.createElement("link");
      el.setAttribute("rel", "canonical");
      return el;
    },
    attr: "href",
  } as Tag,
};

type TagKey = keyof typeof TAGS;

/** Set a tag's value, creating it if missing; returns the previous value (null = didn't exist). */
function setTag(tag: Tag, value: string): string | null {
  let el = document.head.querySelector<HTMLElement>(tag.selector);
  const prev = el ? el.getAttribute(tag.attr) : null;
  if (!el) {
    el = tag.create();
    document.head.appendChild(el);
  }
  el.setAttribute(tag.attr, value);
  return prev;
}

function restoreTag(tag: Tag, prev: string | null) {
  const el = document.head.querySelector<HTMLElement>(tag.selector);
  if (!el) return;
  if (prev === null) el.remove();
  else el.setAttribute(tag.attr, prev);
}

export function formatPageTitle(title?: string): string {
  return title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Kenya's Clean Cooking Transition Platform`;
}

export function usePageMeta({ title, description, path, noindex }: PageMeta) {
  useEffect(() => {
    const prevTitle = document.title;
    const fullTitle = formatPageTitle(title);
    document.title = fullTitle;

    const values: Partial<Record<TagKey, string>> = {
      ogTitle: fullTitle,
      twitterTitle: fullTitle,
      robots: noindex ? "noindex, follow" : "index, follow",
    };
    if (description) {
      values.description = description;
      values.ogDescription = description;
      values.twitterDescription = description;
    }
    if (path) {
      const url = `${SITE_ORIGIN}${path}`;
      values.canonical = url;
      values.ogUrl = url;
    }

    const prev = new Map<TagKey, string | null>();
    for (const key of Object.keys(values) as TagKey[]) {
      prev.set(key, setTag(TAGS[key], values[key]!));
    }
    // A page without its own canonical (404) must not inherit the homepage's.
    const canonicalEl = !path ? document.head.querySelector(TAGS.canonical.selector) : null;
    canonicalEl?.remove();

    return () => {
      document.title = prevTitle;
      prev.forEach((value, key) => restoreTag(TAGS[key], value));
      if (canonicalEl) document.head.appendChild(canonicalEl);
    };
  }, [title, description, path, noindex]);
}
