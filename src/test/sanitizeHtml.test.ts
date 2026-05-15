import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "@/lib/sanitizeHtml";

describe("sanitizeHtml — XSS hardening", () => {
  it("strips <script> blocks entirely", () => {
    const dirty = `<p>Hi</p><script>alert(1)</script>`;
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toMatch(/<script/i);
    expect(clean).not.toMatch(/alert/);
    expect(clean).toContain("Hi");
  });

  it("strips inline event handlers", () => {
    const dirty = `<img src="x" onerror="alert(1)" />`;
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toMatch(/onerror/i);
    expect(clean).not.toMatch(/alert/);
  });

  it("strips javascript: hrefs", () => {
    const dirty = `<a href="javascript:alert(1)">click</a>`;
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toMatch(/javascript:/i);
  });

  it("strips <iframe> tags", () => {
    const dirty = `<iframe src="https://evil.example/"></iframe>`;
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toMatch(/<iframe/i);
  });

  it("strips <form> tags (phishing-via-injection defence)", () => {
    const dirty = `<form action="https://evil.example/"><input/></form>`;
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toMatch(/<form/i);
  });

  it("preserves benign HTML used by mammoth", () => {
    const dirty = `<h1>Title</h1><p>Body with <strong>bold</strong> and <em>italics</em>.</p>`;
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain("<h1>");
    expect(clean).toContain("<strong>");
    expect(clean).toContain("<em>");
    expect(clean).toContain("Body with");
  });

  it("preserves benign attributes (href on regular links)", () => {
    const dirty = `<a href="https://example.com">click</a>`;
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain("https://example.com");
  });
});
