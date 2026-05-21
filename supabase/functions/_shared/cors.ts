// Shared CORS helper for edge functions.
//
// Reads CORS_ALLOW_ORIGINS env (comma-separated) and echoes back the
// request's Origin only if it's on the allowlist. Falls back to the
// first allowed origin for non-browser callers (no Origin header).
//
// To bootstrap a new deploy, set in Supabase:
//   CORS_ALLOW_ORIGINS="https://cleancookiq.com,https://www.cleancookiq.com,http://localhost:8080"
//
// If the env var is unset we permit "*" so existing deployments don't
// suddenly break — but the platform owner should set it explicitly.
const FALLBACK = "*";

function allowedOrigins(): string[] {
  const raw = Deno.env.get("CORS_ALLOW_ORIGINS") ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function buildCorsHeaders(req: Request, extraMethods = "POST, OPTIONS"): HeadersInit {
  const list = allowedOrigins();
  const reqOrigin = req.headers.get("Origin") ?? "";

  let allowOrigin: string;
  if (list.length === 0) {
    allowOrigin = FALLBACK;
  } else if (reqOrigin && list.includes(reqOrigin)) {
    allowOrigin = reqOrigin;
  } else {
    // Origin not on allowlist (or absent — non-browser caller).
    // Echo the first allowed value rather than "*" so browser preflight
    // for disallowed origins fails closed.
    allowOrigin = list[0];
  }

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": extraMethods,
    "Vary": "Origin",
  };
}
