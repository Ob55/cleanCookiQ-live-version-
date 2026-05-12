/**
 * Fire-and-forget page-view tracking. Mounted once at the app shell.
 * duration_ms is filled in on in-app navigation (cleanup effect);
 * page closes / tab-kills are intentionally not tracked (sendBeacon
 * can't carry Supabase auth headers).
 */
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { sbAny } from "@/lib/sbAny";

const SESSION_KEY = "ccq_session_id";

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    // sessionStorage can throw in private mode / iframes — fall back to a per-load uuid.
    return crypto.randomUUID();
  }
}

export function usePageTracking() {
  const location = useLocation();
  const { user, profile, roles } = useAuth();

  const currentRowId = useRef<string | null>(null);

  useEffect(() => {
    const sessionId = getSessionId();
    const startMs = Date.now();
    currentRowId.current = null;

    const path = location.pathname + (location.search || "");
    const referrer = document.referrer || null;

    let cancelled = false;

    sbAny
      .from("page_views")
      .insert({
        user_id: user?.id ?? null,
        organisation_id: profile?.organisation_id ?? null,
        org_type: profile?.org_type ?? null,
        role: roles?.[0] ?? null,
        session_id: sessionId,
        path,
        referrer,
        user_agent: navigator.userAgent,
      })
      .select("id")
      .single()
      .then(({ data }) => {
        if (!cancelled && data?.id) currentRowId.current = data.id;
      });

    return () => {
      cancelled = true;
      // Fire-and-forget duration update for the row we just left.
      const rowId = currentRowId.current;
      if (rowId) {
        const duration = Date.now() - startMs;
        sbAny
          .from("page_views")
          .update({ duration_ms: duration })
          .eq("id", rowId)
          .then(() => undefined);
      }
    };
  }, [location.pathname, location.search, user?.id, profile?.organisation_id, profile?.org_type, roles]);
}
