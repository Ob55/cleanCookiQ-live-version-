import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { KENYA_COUNTIES, countySlug } from "@/lib/counties";
import { usePageMeta, formatPageTitle } from "@/hooks/usePageMeta";

const read = (p: string) => readFileSync(path.resolve(__dirname, "../..", p), "utf8");

describe("public/sitemap.xml", () => {
  const locs = [...read("public/sitemap.xml").matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);

  it("lists every county page with the same slug the app resolves", () => {
    for (const c of KENYA_COUNTIES) {
      expect(locs).toContain(`https://cleancookiq.com/counties/${countySlug(c)}`);
    }
  });

  it("only lists public routes that robots.txt allows", () => {
    const disallowed = [...read("public/robots.txt").matchAll(/^Disallow:\s*(\S+)/gm)].map((m) => m[1]);
    for (const loc of locs) {
      const p = new URL(loc).pathname;
      expect(disallowed.some((d) => p.startsWith(d))).toBe(false);
    }
  });
});

describe("usePageMeta", () => {
  beforeEach(() => {
    document.head.innerHTML =
      '<meta name="description" content="default"><link rel="canonical" href="https://cleancookiq.com/">';
    document.title = "Default";
  });

  it("sets title, description and canonical, then restores defaults on unmount", () => {
    const { unmount } = renderHook(() =>
      usePageMeta({ title: "About", description: "About us", path: "/about" }),
    );
    expect(document.title).toBe(formatPageTitle("About"));
    expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toBe("About us");
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("https://cleancookiq.com/about");

    unmount();
    expect(document.title).toBe("Default");
    expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toBe("default");
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("https://cleancookiq.com/");
  });

  it("noindex pages drop the canonical and set robots noindex", () => {
    const { unmount } = renderHook(() => usePageMeta({ title: "Page not found", noindex: true }));
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("noindex, follow");

    unmount();
    expect(document.querySelector('link[rel="canonical"]')).not.toBeNull();
    expect(document.querySelector('meta[name="robots"]')).toBeNull();
  });
});
