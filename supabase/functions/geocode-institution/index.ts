import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";

// Geocode a single institution from its name + county via OpenStreetMap's
// Nominatim service (free, no API key). Runs server-side so the third-party call
// and its required User-Agent stay off the browser, and so we can swap providers
// later without touching the client. JWT-gated to admins/managers — same pattern
// as delete-user — because it's only used from the admin "New programme from
// file" flow.
//
// Returns { latitude, longitude, display_name } — latitude/longitude are null
// when there's no match or the upstream errors, so a single failed lookup never
// aborts the caller's import.

// Nominatim usage policy requires a descriptive User-Agent identifying the app.
const USER_AGENT = "CleanCookIQ/1.0 (institution geocoding; https://cleancookiq.com)";

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // --- Auth: verify caller JWT + admin/manager role (mirrors delete-user) ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Unauthorized");

    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);
    const adminRoles = ["admin", "manager"];
    const isAdmin = callerRoles?.some((r: any) => adminRoles.includes(r.role));
    if (!isAdmin) throw new Error("Forbidden: admin only");

    // --- Geocode ---
    const { name, county } = await req.json();
    if (!name || typeof name !== "string") throw new Error("name is required");

    const query = [name, county, "Kenya"].filter(Boolean).join(", ");
    const url =
      "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ke&q=" +
      encodeURIComponent(query);

    let latitude: number | null = null;
    let longitude: number | null = null;
    let display_name: string | undefined;

    try {
      const resp = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      });
      if (resp.ok) {
        const results = await resp.json();
        const hit = Array.isArray(results) ? results[0] : null;
        if (hit) {
          const lat = Number(hit.lat);
          const lon = Number(hit.lon);
          if (Number.isFinite(lat) && Number.isFinite(lon)) {
            latitude = lat;
            longitude = lon;
            display_name = hit.display_name;
          }
        }
      }
    } catch (fetchErr) {
      // Upstream/network failure — return nulls rather than failing the import.
      console.error("geocode fetch failed:", fetchErr);
    }

    return json({ latitude, longitude, display_name });
  } catch (err: any) {
    console.error("geocode-institution error:", err);
    const status = /unauthorized|forbidden/i.test(err?.message ?? "") ? 401 : 400;
    return json({ error: err.message }, status);
  }
});
