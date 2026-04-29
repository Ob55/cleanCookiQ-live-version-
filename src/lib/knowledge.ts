/**
 * Knowledge hub types + pure helpers (Workstream 3).
 */

export type PolicyStatus = "draft" | "proposed" | "in_force" | "expired" | "repealed";
export type PolicyJurisdiction = "national" | "regional" | "sectoral" | "international";
export type ResourceType =
  | "guide" | "standard" | "template" | "report" | "case_study"
  | "training_module" | "toolkit" | "dataset" | "presentation" | "other";
export type EventType =
  | "summit" | "webinar" | "workshop" | "training" | "launch" | "field_visit" | "other";
export type EventStatus = "draft" | "upcoming" | "past" | "cancelled";
export type LocationType = "in_person" | "virtual" | "hybrid";
export type NewsStatus = "draft" | "published" | "archived";

export interface Policy {
  id: string;
  slug: string;
  title: string;
  jurisdiction: PolicyJurisdiction;
  policy_type: string | null;
  status: PolicyStatus;
  effective_date: string | null;
  expires_date: string | null;
  summary: string | null;
  full_text_url: string | null;
  source_id: string | null;
  applies_to_org_types: string[];
  applies_to_fuels: string[];
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Resource {
  id: string;
  slug: string;
  title: string;
  resource_type: ResourceType;
  audience: string[];
  description: string | null;
  file_url: string | null;
  external_url: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  page_count: number | null;
  thumbnail_url: string | null;
  source_id: string | null;
  tags: string[];
  requires_signin: boolean;
  view_count: number;
  download_count: number;
  is_published: boolean;
  published_at: string;
}

export interface NewsArticle {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  body_markdown: string | null;
  hero_image_url: string | null;
  author_name: string | null;
  status: NewsStatus;
  published_at: string | null;
  tags: string[];
  county_id: string | null;
  view_count: number;
}

export interface EventSummary {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  event_type: EventType;
  start_at: string;
  end_at: string | null;
  timezone: string;
  location_type: LocationType;
  venue_name: string | null;
  venue_address: string | null;
  county_id: string | null;
  county_name: string | null;
  county_code: string | null;
  virtual_url: string | null;
  registration_required: boolean;
  capacity: number | null;
  hero_image_url: string | null;
  recording_url: string | null;
  status: EventStatus;
  organiser: string | null;
  contact_email: string | null;
  tags: string[];
  is_published: boolean;
  registration_count: number;
  seats_remaining: number | null;
  is_past: boolean;
}

const POLICY_STATUS_LABELS: Record<PolicyStatus, string> = {
  draft: "Draft",
  proposed: "Proposed",
  in_force: "In force",
  expired: "Expired",
  repealed: "Repealed",
};

export function policyStatusLabel(s: PolicyStatus): string {
  return POLICY_STATUS_LABELS[s];
}

const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  guide: "Guide",
  standard: "Standard",
  template: "Template",
  report: "Report",
  case_study: "Case Study",
  training_module: "Training Module",
  toolkit: "Toolkit",
  dataset: "Dataset",
  presentation: "Presentation",
  other: "Other",
};

export function resourceTypeLabel(t: ResourceType): string {
  return RESOURCE_TYPE_LABELS[t];
}

/** Format file size in human-readable form. Pure for testability. */
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(size < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export interface ResourceFilters {
  type?: ResourceType | null;
  audience?: string | null;
  search?: string | null;
}

export function applyResourceFilters(
  resources: Resource[],
  filters: ResourceFilters,
): Resource[] {
  return resources.filter((r) => {
    if (filters.type && r.resource_type !== filters.type) return false;
    if (filters.audience && !r.audience.includes(filters.audience)) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      if (!q) return true;
      const haystack = `${r.title} ${r.description ?? ""} ${r.tags.join(" ")}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

/**
 * Split events into upcoming (future, sorted soonest first) and past
 * (most recent first). The is_past flag from the view drives the bucket.
 */
export function partitionEvents<T extends { is_past: boolean; start_at: string }>(
  events: T[],
): { upcoming: T[]; past: T[] } {
  const upcoming = events
    .filter((e) => !e.is_past)
    .sort((a, b) => a.start_at.localeCompare(b.start_at));
  const past = events
    .filter((e) => e.is_past)
    .sort((a, b) => b.start_at.localeCompare(a.start_at));
  return { upcoming, past };
}

/** Build an iCalendar (.ics) blob string for a single event. Pure. */
export function eventToIcs(event: EventSummary, baseUrl: string): string {
  const fmt = (iso: string) =>
    iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "").replace(/Z$/, "Z");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//cleancookIQ//Events//EN",
    "BEGIN:VEVENT",
    `UID:${event.id}@cleancookiq.com`,
    `DTSTAMP:${fmt(new Date().toISOString())}`,
    `DTSTART:${fmt(event.start_at)}`,
    event.end_at ? `DTEND:${fmt(event.end_at)}` : null,
    `SUMMARY:${event.title.replace(/\n/g, " ")}`,
    event.description ? `DESCRIPTION:${event.description.replace(/\n/g, "\\n")}` : null,
    event.venue_address ? `LOCATION:${event.venue_address.replace(/\n/g, " ")}` : null,
    `URL:${baseUrl}/events/${event.slug}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.join("\r\n");
}
