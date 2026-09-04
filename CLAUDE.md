# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is Bun (`bun.lockb`/`bun.lock` present) but npm/yarn work too since there's no Bun-specific tooling in scripts.

- `npm run dev` — start Vite dev server on port 8080
- `npm run build` — production build
- `npm run build:dev` — development-mode build (unminified, used for debugging build issues)
- `npm run lint` — ESLint over `**/*.{ts,tsx}`
- `npm run test` — run the full Vitest suite once (`vitest run`)
- `npm run test:watch` — Vitest watch mode
- Single test file: `npx vitest run src/test/risk.test.ts` (or any path); single test case: add `-t "name"`
- `npm run preview` — preview a production build locally

Supabase (project ref `bnbhattryqbterblybzw`, linked via `supabase/config.toml`): migrations live in `supabase/migrations/`, applied in filename-timestamp order. Edge functions live in `supabase/functions/*` and deploy individually via the Supabase CLI (`supabase functions deploy <name>`). `src/integrations/supabase/client.ts` and `types.ts` are auto-generated — do not hand-edit; regenerate types with `supabase gen types typescript` after a schema change.

Requires a `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (the client throws at import time if either is missing).

## Architecture

This is **CleanCookIQ**, a React 18 + Vite + TypeScript SPA (shadcn/ui + Tailwind, react-router-dom, @tanstack/react-query, Supabase JS client) for Ignis Innovation. It tracks Kenyan institutions' (schools, hospitals, prisons, etc.) transition to clean cooking fuels/technologies (LPG, biogas, pellets, electric, charcoal/improved-charcoal), and coordinates the surrounding ecosystem: financing, a supplier marketplace, delivery/installation, risk monitoring, carbon credit estimation, and a funder portal — plus an internal admin console that runs the whole pipeline.

### Routing and role model (`src/App.tsx`)

Routes fall into distinct areas, each with its own layout:

- **Public/marketing**: `/`, `/map`, `/intelligence`, `/providers`, `/marketing`, `/counties(/:slug)`, `/marketplace`, `/products/:id`, `/suppliers/:id`, `/policy`, `/resources`, `/news`, `/events`, `/book-demo`, `/about`.
- **Auth**: `/auth/login`, `/auth/register`, `/auth/verify-email`, `/auth/pending`, `/auth/forgot-password`, `/auth/reset-password`.
- **Role portals**, each gated by `ProtectedRoute` on `allowedRoles`/`allowedOrgTypes`: Institution, Supplier/TA-provider, Funder, KPLC depot, Researcher, CSR. Each portal has its own setup/onboarding flow, dashboard, and a shared `AIAssistant` widget.
- **Admin console** (`requireAdmin`, ~35 routes): pipeline, institution/provider management + import/linking, assessments, opportunities, financing designer, deliveries, risk/monitoring/carbon, content CMS, portfolios, KPLC depots, tickets, users, reference data, etc.

Two identity dimensions gate access, both read off `profiles`/`user_roles`: **role** (`admin`/`manager`/`field_agent` → `isAdmin`; plus `institution_admin`, `institution_user`, `ta_provider`, `financing_partner`, `kplc_depot_admin`, `viewer`) and **org_type** (`institution`, `supplier`, `funder`, `researcher`, `kplc_depot`, `csr`, `other`). After email verification, `LoginPage.redirectUser()` branches on admin/pending/rejected/org_type and sends users without an `organisation_id` into that portal's setup wizard; `useOnboardingGate.ts` independently re-checks `onboarding_progress` on every load and can redirect back into setup.

Session idle-logout is handled globally by `IdleLogoutGuard.tsx` (mounted once in `App.tsx`, ~3 min timeout + warning + countdown). `useInactivityLogout.ts` is a second, unused implementation — don't wire it up without removing/reconciling the other one.

### Business logic lives in `src/lib/`, not components

Pages and hooks are thin; the actual domain rules are pure functions in `src/lib/` and are the most heavily unit-tested part of the repo (`src/test/`):

- `assessmentScoring.ts` — weighted readiness score (0–100) → readiness category.
- `tco.ts` — NPV/IRR (Newton-Raphson)/payback financing engine behind the Financing Designer and funder deal-matching.
- `marketplace.ts` — CSCC supplier certification tier derivation.
- `delivery.ts` — delivery state machine (`manufacturing → dispatched → in_transit → on_site → installing → commissioned → handover → acceptance_window → monitoring`, plus cancellation).
- `risk.ts` — severity×likelihood risk scoring and clean-fuel-share relapse detection; also carbon credit estimation.
- `institutionDisplay.ts` — masks institution names behind an `institution_code` (`CCQ-{bucket}-{NNNN}`) for any actor that isn't the owning institution (funders/suppliers/researchers/CSR/TA all see codes, not names) — this privacy boundary is enforced in code, not just RLS, so don't bypass it when adding new cross-actor views.
- `onboarding.ts` — a generic, unrelated pure wizard-navigation engine (step index/validators) used by `Wizard.tsx`; not the same thing as the `onboarding_progress` DB-backed gate above.

When adding a table Supabase's generated types don't cover yet, `lib/sbAny.ts` is the existing escape hatch pattern — follow it rather than casting ad hoc.

### Data access pattern

Each domain area has one hook in `src/hooks/` (`useInstitution`, `useFinancing`, `useFunder`, `useKnowledge`, `useCounties`, `useDataPoints`, `useMarketplace`, `useDeliveries`, `useRisk`) wrapping `@tanstack/react-query` over Supabase. Most reads go through `v_*` views (e.g. `v_funder_deal_flow`, `v_county_intelligence_summary`, `v_marketplace_products`, `v_delivery_summary`, `v_risk_summary`, `v_carbon_summary`) rather than raw tables — these views are `security_invoker=true` so RLS still applies as the querying user. Prefer querying an existing view over a raw table join when one already covers the need.

### Supabase backend (`supabase/`)

Schema evolved through named workstream migrations (`ws0` data integrity → `ws8` onboarding, dated 2026-04-27) laid on top of an earlier foundational schema (institutions, providers, assessments, financing, tickets, etc. from 2026-04-10 through 2026-04-23), followed by May 2026 hardening/fixes. Access control centers on a SECURITY DEFINER `has_role(user_id, role)` function checked against `user_roles` (kept separate from `profiles` deliberately, to avoid privilege-escalation via a self-editable role column) — reuse this function rather than inlining role checks in new RLS policies. Security has gone through three hardening passes (`fix_security_advisors`, `security_hardening`, `security_hardening_round2`, then `rls_tighten_documents_financing_assessments`); the last of these is the most recent migration and explicitly left the `institution-assets` storage bucket as public-read (documents readable by anyone with the URL) as a known gap — be aware of this if working on document storage/signing.

Edge functions (`supabase/functions/`) follow one pattern: an anon-key client to identify the caller + a service-role client to authorize/act. `book-demo` is the only public (non-admin-gated) function.

### Notable library usage (so you know where to look before adding a new one)

- `echarts`/`echarts-for-react` — `IntelligencePage` dashboards only (kept out of the main bundle via a manual Vite chunk, see `vite.config.ts`).
- `recharts` — simpler in-app charts (shadcn `chart.tsx`, Cooking Alchemy comparisons).
- `leaflet`/`react-leaflet` — `MapPage` (raw Leaflet) and KPLC institutions map (react-leaflet); also split into its own chunk.
- `jspdf`/`jspdf-autotable` — `lib/reportExport.ts`, the shared PDF "Download Report" generator reused across admin pages.
- `mammoth` — renders uploaded `.docx` (IPA/MOU/CSCC docs) to sanitized HTML client-side.
- `xlsx` — both `lib/reportExport.ts` (Excel export) and `lib/excelImport.ts` (bulk institution import).
- `src/lib/assistant/` — a homegrown rule-based assistant (keyword matching against per-role static knowledge bases), not an LLM call; has an async seam left for wiring in a real backend later.

Vite manually chunks the above heavy libraries (`vite.config.ts` `manualChunks`) since they're only used on specific pages — keep new heavy/page-scoped dependencies out of the default vendor chunk the same way.
