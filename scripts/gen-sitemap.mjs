#!/usr/bin/env node
/**
 * Regenerates public/sitemap.xml from the public marketing routes and the
 * 47 county pages. Run after adding a public route: `node scripts/gen-sitemap.mjs`.
 *
 * County names/slug logic mirror KENYA_COUNTIES + countySlug() in
 * src/lib/counties.ts (kept inline so this runs without a TS toolchain).
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ORIGIN = "https://cleancookiq.com";

// [path, changefreq, priority] — keep in sync with the public routes in src/App.tsx.
const PAGES = [
  ["/", "weekly", "1.0"],
  ["/intelligence", "weekly", "0.9"],
  ["/map", "weekly", "0.9"],
  ["/counties", "weekly", "0.8"],
  ["/marketplace", "weekly", "0.8"],
  ["/providers", "weekly", "0.7"],
  ["/policy", "monthly", "0.7"],
  ["/resources", "monthly", "0.7"],
  ["/news", "weekly", "0.7"],
  ["/events", "weekly", "0.6"],
  ["/about", "monthly", "0.6"],
  ["/book-demo", "monthly", "0.6"],
];

const KENYA_COUNTIES = [
  "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu",
  "Garissa", "Homa Bay", "Isiolo", "Kajiado", "Kakamega", "Kericho",
  "Kiambu", "Kilifi", "Kirinyaga", "Kisii", "Kisumu", "Kitui",
  "Kwale", "Laikipia", "Lamu", "Machakos", "Makueni", "Mandera",
  "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a", "Nairobi",
  "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua", "Nyeri",
  "Samburu", "Siaya", "Taita-Taveta", "Tana River", "Tharaka-Nithi",
  "Trans Nzoia", "Turkana", "Uasin Gishu", "Vihiga", "Wajir", "West Pokot",
];

function countySlug(name) {
  return name
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const lastmod = new Date().toISOString().slice(0, 10);
const entries = [
  ...PAGES,
  ...KENYA_COUNTIES.map((c) => [`/counties/${countySlug(c)}`, "monthly", "0.5"]),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    ([path, changefreq, priority]) => `  <url>
    <loc>${ORIGIN}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

const out = fileURLToPath(new URL("../public/sitemap.xml", import.meta.url));
writeFileSync(out, xml);
console.log(`Wrote ${entries.length} URLs to public/sitemap.xml`);
