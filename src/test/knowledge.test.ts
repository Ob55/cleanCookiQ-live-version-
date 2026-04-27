import { describe, it, expect } from "vitest";
import {
  applyResourceFilters,
  eventToIcs,
  formatFileSize,
  partitionEvents,
  policyStatusLabel,
  resourceTypeLabel,
  type EventSummary,
  type Resource,
} from "@/lib/knowledge";

const baseResource: Resource = {
  id: "r1",
  slug: "kebs-stove-standard",
  title: "KEBS Cookstove Standard KS 2861",
  resource_type: "standard",
  audience: ["supplier", "institution"],
  description: "Performance and safety requirements for biomass cookstoves.",
  file_url: "https://example.org/kebs.pdf",
  external_url: null,
  file_size_bytes: 2_400_000,
  mime_type: "application/pdf",
  page_count: 42,
  thumbnail_url: null,
  source_id: null,
  tags: ["kebs", "biomass"],
  requires_signin: true,
  view_count: 0,
  download_count: 0,
  is_published: true,
  published_at: "2026-01-01",
};

const baseEvent: EventSummary = {
  id: "e1",
  slug: "kenya-clean-cooking-summit-2026",
  title: "Kenya Clean Cooking Summit 2026",
  description: "Annual gathering of the sector",
  event_type: "summit",
  start_at: "2026-09-15T09:00:00.000Z",
  end_at: "2026-09-15T17:00:00.000Z",
  timezone: "Africa/Nairobi",
  location_type: "in_person",
  venue_name: "KICC",
  venue_address: "Nairobi",
  county_id: null,
  county_name: "Nairobi",
  county_code: "047",
  virtual_url: null,
  registration_required: true,
  capacity: 500,
  hero_image_url: null,
  recording_url: null,
  status: "upcoming",
  organiser: "CleanCookiQ",
  contact_email: null,
  tags: [],
  is_published: true,
  registration_count: 120,
  seats_remaining: 380,
  is_past: false,
};

describe("formatFileSize", () => {
  it("returns dash for zero/null/undefined", () => {
    expect(formatFileSize(0)).toBe("—");
    expect(formatFileSize(null)).toBe("—");
    expect(formatFileSize(undefined)).toBe("—");
  });

  it("formats bytes, KB, MB, GB", () => {
    expect(formatFileSize(500)).toBe("500 B");
    expect(formatFileSize(2048)).toBe("2.0 KB");
    expect(formatFileSize(1_500_000)).toBe("1.4 MB");
    expect(formatFileSize(2_400_000_000)).toBe("2.2 GB");
  });
});

describe("policyStatusLabel & resourceTypeLabel", () => {
  it("policy labels", () => {
    expect(policyStatusLabel("in_force")).toBe("In force");
    expect(policyStatusLabel("draft")).toBe("Draft");
  });
  it("resource labels", () => {
    expect(resourceTypeLabel("standard")).toBe("Standard");
    expect(resourceTypeLabel("training_module")).toBe("Training Module");
  });
});

describe("applyResourceFilters", () => {
  const list = [
    baseResource,
    {
      ...baseResource,
      id: "r2",
      title: "Funder ROI Toolkit",
      description: "Spreadsheet for modelling concessional loan IRR.",
      resource_type: "toolkit" as const,
      audience: ["funder"],
      tags: ["finance"],
    },
  ];

  it("filters by type", () => {
    expect(applyResourceFilters(list, { type: "toolkit" })).toHaveLength(1);
  });

  it("filters by audience", () => {
    expect(applyResourceFilters(list, { audience: "funder" })).toHaveLength(1);
    expect(applyResourceFilters(list, { audience: "supplier" })).toHaveLength(1);
  });

  it("searches across title, description, tags", () => {
    expect(applyResourceFilters(list, { search: "kebs" })).toHaveLength(1);
    expect(applyResourceFilters(list, { search: "finance" })).toHaveLength(1);
    expect(applyResourceFilters(list, { search: "biomass" })).toHaveLength(1);
  });

  it("returns all with empty filters", () => {
    expect(applyResourceFilters(list, {})).toHaveLength(2);
  });
});

describe("partitionEvents", () => {
  const events: EventSummary[] = [
    { ...baseEvent, id: "future-late", start_at: "2026-12-01T00:00:00.000Z", is_past: false },
    { ...baseEvent, id: "past-recent", start_at: "2026-03-01T00:00:00.000Z", is_past: true },
    { ...baseEvent, id: "future-soon", start_at: "2026-05-01T00:00:00.000Z", is_past: false },
    { ...baseEvent, id: "past-ancient", start_at: "2025-01-01T00:00:00.000Z", is_past: true },
  ];

  it("buckets by is_past flag", () => {
    const out = partitionEvents(events);
    expect(out.upcoming.map((e) => e.id)).toEqual(["future-soon", "future-late"]);
    expect(out.past.map((e) => e.id)).toEqual(["past-recent", "past-ancient"]);
  });

  it("upcoming sorted ascending, past descending", () => {
    const out = partitionEvents(events);
    expect(out.upcoming[0].start_at < out.upcoming[1].start_at).toBe(true);
    expect(out.past[0].start_at > out.past[1].start_at).toBe(true);
  });
});

describe("eventToIcs", () => {
  it("produces a valid VCALENDAR/VEVENT block", () => {
    const ics = eventToIcs(baseEvent, "https://cleancookiq.com");
    expect(ics).toMatch(/^BEGIN:VCALENDAR/);
    expect(ics).toMatch(/END:VCALENDAR$/);
    expect(ics).toMatch(/BEGIN:VEVENT/);
    expect(ics).toMatch(/END:VEVENT/);
    expect(ics).toMatch(/SUMMARY:Kenya Clean Cooking Summit 2026/);
    expect(ics).toMatch(/UID:e1@cleancookiq\.com/);
    expect(ics).toMatch(/URL:https:\/\/cleancookiq\.com\/events\/kenya-clean-cooking-summit-2026/);
    expect(ics).toMatch(/DTSTART:\d{8}T\d{6}Z/);
  });

  it("handles events with no end_at or address", () => {
    const minimal: EventSummary = { ...baseEvent, end_at: null, venue_address: null, description: null };
    const ics = eventToIcs(minimal, "https://example.com");
    expect(ics).not.toMatch(/DTEND:/);
    expect(ics).not.toMatch(/LOCATION:/);
    expect(ics).not.toMatch(/DESCRIPTION:/);
  });
});
