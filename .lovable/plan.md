

## Plan: Auto-logout, "Learn More" → Admin Login, and Remaining Feature Completion

### Summary

Three changes requested:
1. **20-second inactivity auto-logout** in the admin console
2. **"Learn More" button on homepage** → navigates to `/auth/login` instead of `/about`
3. **Complete remaining placeholder pages** (Intelligence, Providers) with real functionality

---

### 1. Inactivity Auto-Logout (20 seconds)

**File: `src/hooks/useInactivityLogout.ts`** (new)
- Create a custom hook that listens for `mousemove`, `keydown`, `click`, `scroll`, `touchstart` events
- Resets a 20-second timer on each interaction
- When timer expires, calls `signOut()` from AuthContext and navigates to `/auth/login`
- Shows a toast: "Session expired due to inactivity"

**File: `src/components/layouts/AdminLayout.tsx`**
- Import and use the `useInactivityLogout()` hook so it activates only inside the admin console

---

### 2. "Learn More" → Admin Login

**File: `src/pages/HomePage.tsx`**
- Change the CTA "Learn More" button link from `/about` to `/auth/login`
- Update button text to "Admin Login" or keep "Learn More" — link target changes to `/auth/login`

---

### 3. Complete Public Pages with Real Functionality

**File: `src/pages/ProvidersPage.tsx`**
- Replace placeholder with a real provider directory
- Query `providers` table for verified providers
- Display card grid with name, services, technology types, counties served, rating, verified badge
- Add search bar and filters (by service category, technology type, county)

**File: `src/pages/IntelligencePage.tsx`**
- Replace placeholder with aggregate statistics dashboard
- Query `institutions` table for county breakdowns, pipeline stage distribution, technology mix
- Display charts using recharts (bar chart for counties, pie for tech mix, funnel for pipeline stages)
- Show summary KPI cards (total institutions, assessed count, average readiness score)

---

### Technical Details

- The inactivity hook uses `useEffect` with `setTimeout`/`clearTimeout` pattern
- Event listeners are added to `document` and cleaned up on unmount
- Provider directory uses `useQuery` with the existing `providers` table
- Intelligence page aggregates data client-side from the `institutions` table
- No database migrations needed — all tables already exist

