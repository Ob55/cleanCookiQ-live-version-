/**
 * CleanCookiQ service worker — v1.
 *
 * Strategy:
 *   - Pre-cache the app shell on install (root + manifest + logos).
 *   - Network-first for navigation requests with offline fallback.
 *   - Cache-first for hashed JS/CSS chunks (Vite emits content-hashed
 *     filenames, so they're safe to cache forever and bust on rebuild).
 *   - Bypass cache entirely for Supabase API and any cross-origin fetches.
 *
 * NOTE: This is a deliberately small shell — the app must still work
 * when the SW is absent (single-page app served from index.html).
 * Full offline editing for field agents is a follow-on (would require
 * IndexedDB sync queues for delivery_events and commissioning_checklists).
 */

const CACHE_VERSION = "ccq-v1";
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/cleancookiq-logo.png",
  "/cleancookiq-og-logo.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL).catch(() => undefined)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Never cache API / auth traffic
  if (
    req.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.hostname.includes("supabase")
  ) {
    return;
  }

  // Hashed assets: cache-first
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.open(CACHE_VERSION).then((cache) =>
        cache.match(req).then((hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          }),
        ),
      ),
    );
    return;
  }

  // Navigations: network-first, fall back to cached shell
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put("/", clone));
          }
          return res;
        })
        .catch(() => caches.match("/").then((hit) => hit || Response.error())),
    );
  }
});
