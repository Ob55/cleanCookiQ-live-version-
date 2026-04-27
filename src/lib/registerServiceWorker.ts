/**
 * Register the PWA service worker on production builds only.
 * Skipped in dev so Vite HMR isn't shadowed.
 */
export function registerServiceWorker(): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (import.meta.env.DEV) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      // Telemetry-only — failure to register the SW must never block the app
      console.warn("[ccq] service worker registration failed", err);
    });
  });
}
