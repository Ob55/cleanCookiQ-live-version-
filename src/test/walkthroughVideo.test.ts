import { describe, it, expect } from "vitest";
import { toEmbedUrl } from "@/lib/walkthroughVideo";

describe("toEmbedUrl", () => {
  it("returns null for empty / nullish input", () => {
    expect(toEmbedUrl(null)).toBeNull();
    expect(toEmbedUrl(undefined)).toBeNull();
    expect(toEmbedUrl("")).toBeNull();
    expect(toEmbedUrl("   ")).toBeNull();
  });

  it("converts a Loom share URL to the embed URL", () => {
    expect(toEmbedUrl("https://www.loom.com/share/abc123def456")).toBe(
      "https://www.loom.com/embed/abc123def456",
    );
  });

  it("leaves an already-embed Loom URL untouched (idempotent)", () => {
    expect(toEmbedUrl("https://www.loom.com/embed/abc123def456")).toBe(
      "https://www.loom.com/embed/abc123def456",
    );
  });

  it("handles UUID-style Loom IDs", () => {
    expect(toEmbedUrl("https://www.loom.com/share/abc-12-34-56-deadbeef")).toBe(
      "https://www.loom.com/embed/abc-12-34-56-deadbeef",
    );
  });

  it("converts a YouTube watch URL", () => {
    expect(toEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });

  it("converts a youtu.be short URL", () => {
    expect(toEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });

  it("converts a YouTube watch URL with additional query params", () => {
    expect(toEmbedUrl("https://www.youtube.com/watch?si=foo&v=dQw4w9WgXcQ&t=10")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });

  it("converts a Vimeo URL", () => {
    expect(toEmbedUrl("https://vimeo.com/123456789")).toBe(
      "https://player.vimeo.com/video/123456789",
    );
  });

  it("returns null for unrecognised URLs", () => {
    expect(toEmbedUrl("https://example.com/video.mp4")).toBeNull();
    expect(toEmbedUrl("definitely not a url")).toBeNull();
  });

  it("trims whitespace before parsing", () => {
    expect(toEmbedUrl("  https://www.loom.com/share/abc123  ")).toBe(
      "https://www.loom.com/embed/abc123",
    );
  });
});
