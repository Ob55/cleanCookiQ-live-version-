import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sbAny } from "@/lib/sbAny";
import { fetchAllRows } from "@/lib/fetchAllRows";
import type { Database } from "@/integrations/supabase/types";

// Institution row + the tenancy/finance columns added by the 2026-08-08/11
// migrations that aren't in the generated types yet.
type InstitutionRow = Database["public"]["Tables"]["institutions"]["Row"];
export type ProgrammeInstitution = InstitutionRow & {
  programme_id: string | null;
  segment: string | null;
  sub_type: string | null;
  verification_status: string | null;
  women_led: boolean | null;
  consent_status: string | null;
  data_source: string | null;
};

// Programme (tenant) data access. One hook per domain, react-query over
// Supabase, mirroring src/hooks/useDeliveries.ts.
//
// The list reads the `programmes` table directly (always present) and
// enriches with best-effort counts, so a freshly-created project is visible
// even before the tenancy migration / v_programme_overview view is applied.
// programme_members / budget lines aren't in the generated types, so those
// reads go through sbAny (see src/lib/sbAny.ts).

const STALE_MS = 1000 * 60 * 5;

export type ProgrammeOverview = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  county_scope: string[] | null;
  target_institution_count: number;
  total_budget_ksh: number;
  programme_manager_id: string | null;
  created_at: string;
  institution_count: number;
  installed_count: number;
  member_count: number;
  rfq_count: number;
};

export type ProgrammeMemberRole =
  | "programme_lead"
  | "programme_editor"
  | "programme_viewer"
  | "county_pipeline_viewer";

export type ProgrammeMember = {
  id: string;
  programme_id: string;
  user_id: string;
  role: ProgrammeMemberRole;
  invited_email: string | null;
  created_at: string;
};

export type ProgrammeBudgetLine = {
  id: string;
  programme_id: string;
  category: string | null;
  name: string;
  description: string | null;
  institution_id: string | null;
  institution_ids: string[] | null;
  amount_ksh: number;
  funding_source: string | null;
  added_by_name: string | null;
  assignee: string | null;
  created_at: string;
};

export type ProgrammeEngagementFollowup = {
  id: string;
  engagement_id: string;
  note: string;
  added_by_name: string | null;
  created_at: string;
};

export type ProgrammeEngagement = {
  id: string;
  programme_id: string;
  title: string;
  organisation: string | null;
  engagement_date: string | null;
  notes: string | null;
  institution_id: string | null;
  added_by_name: string | null;
  created_at: string;
};

export type ProgrammeVendor = {
  id: string;
  programme_id: string;
  supplier_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
};

// Best-effort count maps; any failure (e.g. column/table not migrated yet)
// resolves to empty so the project list still renders.
async function loadCounts() {
  // Paginate each read so the per-programme tallies aren't truncated by the
  // ~1,000-row response cap (which otherwise mis-counts once the roster > 1k).
  const [inst, members, rfqs] = await Promise.all([
    fetchAllRows<{ programme_id: string; pipeline_stage: string }>((f, t) =>
      sbAny.from("institutions").select("programme_id, pipeline_stage").not("programme_id", "is", null).range(f, t),
    ).catch(() => []),
    fetchAllRows<{ programme_id: string }>((f, t) =>
      sbAny.from("programme_members").select("programme_id").range(f, t),
    ).catch(() => []),
    fetchAllRows<{ programme_id: string }>((f, t) =>
      sbAny.from("procurement_rfqs").select("programme_id").range(f, t),
    ).catch(() => []),
  ]);

  const institutionCount: Record<string, number> = {};
  const installedCount: Record<string, number> = {};
  for (const i of inst) {
    institutionCount[i.programme_id] = (institutionCount[i.programme_id] ?? 0) + 1;
    if (i.pipeline_stage === "installed") installedCount[i.programme_id] = (installedCount[i.programme_id] ?? 0) + 1;
  }
  const memberCount: Record<string, number> = {};
  for (const m of members) memberCount[m.programme_id] = (memberCount[m.programme_id] ?? 0) + 1;
  const rfqCount: Record<string, number> = {};
  for (const r of rfqs) if (r.programme_id) rfqCount[r.programme_id] = (rfqCount[r.programme_id] ?? 0) + 1;

  return { institutionCount, installedCount, memberCount, rfqCount };
}

type ProgrammeRow = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  county_scope: string[] | null;
  target_institution_count: number;
  total_budget_ksh: number;
  programme_manager_id: string | null;
  created_at: string;
};

function toOverview(p: ProgrammeRow, counts: Awaited<ReturnType<typeof loadCounts>>): ProgrammeOverview {
  return {
    ...p,
    institution_count: counts.institutionCount[p.id] ?? 0,
    installed_count: counts.installedCount[p.id] ?? 0,
    member_count: counts.memberCount[p.id] ?? 0,
    rfq_count: counts.rfqCount[p.id] ?? 0,
  };
}

export function usePrograms() {
  return useQuery({
    queryKey: ["programmes_overview"],
    staleTime: STALE_MS,
    queryFn: async (): Promise<ProgrammeOverview[]> => {
      const { data, error } = await supabase
        .from("programmes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const counts = await loadCounts();
      return (data ?? []).map((p) => toOverview(p as unknown as ProgrammeRow, counts));
    },
  });
}

// Delete a project (host / programme manager, enforced by RLS). Cascades to
// members/budget/vendors; assigned institutions are unassigned (programme_id
// set null), not deleted.
export function useDeleteProgramme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("programmes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programmes_overview"] });
    },
  });
}

export function useProgramme(id: string | undefined) {
  return useQuery({
    queryKey: ["programme", id],
    enabled: Boolean(id),
    staleTime: STALE_MS,
    // Detail page only needs the programme row itself (counts aren't shown),
    // so skip the extra count queries — one fast round-trip.
    queryFn: async (): Promise<ProgrammeOverview | null> => {
      const { data, error } = await supabase.from("programmes").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return toOverview(data as unknown as ProgrammeRow, {
        institutionCount: {}, installedCount: {}, memberCount: {}, rfqCount: {},
      });
    },
  });
}

export function useProgrammeMembers(programmeId: string | undefined) {
  return useQuery({
    queryKey: ["programme_members", programmeId],
    enabled: Boolean(programmeId),
    staleTime: STALE_MS,
    queryFn: async (): Promise<ProgrammeMember[]> => {
      const { data, error } = await sbAny
        .from("programme_members")
        .select("*")
        .eq("programme_id", programmeId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ProgrammeMember[];
    },
  });
}

// Invite status per member (Pending = never signed in / hasn't set a password,
// Active = has signed in). Comes from an edge function because sign-in data
// lives in auth, not the programme_members table.
export type ProgrammeMemberStatus = "pending" | "active";
export function useProgrammeMemberStatuses(programmeId: string | undefined) {
  return useQuery({
    queryKey: ["programme_member_statuses", programmeId],
    enabled: Boolean(programmeId),
    staleTime: STALE_MS,
    queryFn: async (): Promise<Record<string, ProgrammeMemberStatus>> => {
      const { data, error } = await supabase.functions.invoke("programme-member-status", {
        body: { programme_id: programmeId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return (data?.statuses ?? {}) as Record<string, ProgrammeMemberStatus>;
    },
  });
}

// Institutions assigned to a programme (RLS-scoped for non-host callers).
export function useProgrammeInstitutions(programmeId: string | undefined) {
  return useQuery({
    queryKey: ["programme_institutions", programmeId],
    enabled: Boolean(programmeId),
    staleTime: STALE_MS,
    queryFn: async (): Promise<ProgrammeInstitution[]> => {
      const { data, error } = await supabase
        .from("institutions")
        .select("*")
        .eq("programme_id", programmeId!)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ProgrammeInstitution[];
    },
  });
}

export function useAddProgrammeMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      programme_id: string;
      email: string;
      role: ProgrammeMemberRole;
      full_name?: string;
      org_name?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("add-programme-member", {
        body: { ...input, app_url: typeof window !== "undefined" ? window.location.origin : undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { member: unknown; created?: boolean; email_sent?: boolean };
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["programme_members", vars.programme_id] });
      queryClient.invalidateQueries({ queryKey: ["programme_member_statuses", vars.programme_id] });
      queryClient.invalidateQueries({ queryKey: ["programmes_overview"] });
    },
  });
}

// Resend the "set your password" invite to programme members who haven't set
// one yet. Members who already set a password (have signed in) are skipped by
// the edge function — they never get the invite link again. Omit member_id to
// resend to every pending member of the programme.
export type ResendInviteResult = {
  results: { email: string | null; role: string; status: "sent" | "skipped" | "failed"; reason?: string }[];
  sent: number;
  skipped: number;
  failed: number;
};
export function useResendProgrammeInvites() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { programme_id: string; member_id?: string }) => {
      const { data, error } = await supabase.functions.invoke("resend-programme-invite", {
        body: { ...input, app_url: typeof window !== "undefined" ? window.location.origin : undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as ResendInviteResult;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["programme_members", vars.programme_id] });
      queryClient.invalidateQueries({ queryKey: ["programme_member_statuses", vars.programme_id] });
    },
  });
}

// Grant a user full platform access (user_roles 'admin') — used when a member
// is added as "Admin (full access)". Only a host admin can call this (RLS on
// user_roles: "Admins can manage roles"). Idempotent via upsert.
export function useGrantSystemAdmin() {
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await sbAny
        .from("user_roles")
        .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
      if (error) throw error;
    },
  });
}

export function useRemoveProgrammeMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; programme_id: string }) => {
      const { error } = await sbAny.from("programme_members").delete().eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["programme_members", vars.programme_id] });
      queryClient.invalidateQueries({ queryKey: ["programmes_overview"] });
    },
  });
}

// Assign / unassign institutions to a programme (host action).
export function useAssignInstitutions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { programmeId: string | null; institutionIds: string[] }) => {
      const { error } = await supabase
        .from("institutions")
        // programme_id isn't in generated types yet
        .update({ programme_id: input.programmeId } as never)
        .in("id", input.institutionIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programme_institutions"] });
      queryClient.invalidateQueries({ queryKey: ["institutions"] });
      queryClient.invalidateQueries({ queryKey: ["programmes_overview"] });
    },
  });
}

// ---------- Budget line items (draw down the programme's total budget) ----------
export function useProgrammeBudget(programmeId: string | undefined) {
  return useQuery({
    queryKey: ["programme_budget_lines", programmeId],
    enabled: Boolean(programmeId),
    staleTime: STALE_MS,
    queryFn: async (): Promise<ProgrammeBudgetLine[]> => {
      const { data, error } = await sbAny
        .from("programme_budget_lines")
        .select("*")
        .eq("programme_id", programmeId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProgrammeBudgetLine[];
    },
  });
}

export function useAddBudgetLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      programme_id: string;
      category?: string;
      name: string;
      description?: string;
      institution_ids?: string[];
      amount_ksh: number;
      funding_source?: string;
      added_by_name?: string;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      const ids = input.institution_ids ?? [];
      const { error } = await sbAny.from("programme_budget_lines").insert({
        programme_id: input.programme_id,
        category: input.category || null,
        name: input.name,
        description: input.description || null,
        institution_ids: ids,
        institution_id: ids[0] ?? null, // keep single col in sync for back-compat
        amount_ksh: input.amount_ksh,
        funding_source: input.funding_source || null,
        added_by_name: input.added_by_name || null,
        created_by: auth.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["programme_budget_lines", vars.programme_id] });
    },
  });
}

export function useUpdateBudgetLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      programme_id: string;
      category?: string;
      name: string;
      description?: string;
      institution_ids?: string[];
      amount_ksh: number;
      funding_source?: string;
    }) => {
      const ids = input.institution_ids ?? [];
      const { error } = await sbAny.from("programme_budget_lines").update({
        category: input.category || null,
        name: input.name,
        description: input.description || null,
        institution_ids: ids,
        institution_id: ids[0] ?? null,
        amount_ksh: input.amount_ksh,
        funding_source: input.funding_source || null,
      }).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["programme_budget_lines", vars.programme_id] });
    },
  });
}

export function useDeleteBudgetLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; programme_id: string }) => {
      const { error } = await sbAny.from("programme_budget_lines").delete().eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["programme_budget_lines", vars.programme_id] });
    },
  });
}

// ---------- Vendors (suppliers the programme works with) ----------
export function useProgrammeVendors(programmeId: string | undefined) {
  return useQuery({
    queryKey: ["programme_vendors", programmeId],
    enabled: Boolean(programmeId),
    staleTime: STALE_MS,
    queryFn: async (): Promise<ProgrammeVendor[]> => {
      const { data, error } = await sbAny
        .from("programme_vendors")
        .select("*")
        .eq("programme_id", programmeId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProgrammeVendor[];
    },
  });
}

export function useAddVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      programme_id: string;
      supplier_name: string;
      contact_name?: string;
      phone?: string;
      email?: string;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await sbAny.from("programme_vendors").insert({
        programme_id: input.programme_id,
        supplier_name: input.supplier_name,
        contact_name: input.contact_name || null,
        phone: input.phone || null,
        email: input.email || null,
        created_by: auth.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["programme_vendors", vars.programme_id] });
    },
  });
}

export function useDeleteVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; programme_id: string }) => {
      const { error } = await sbAny.from("programme_vendors").delete().eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["programme_vendors", vars.programme_id] });
    },
  });
}

// ---------- Engagements (interactions logged during the programme) ----------
export function useProgrammeEngagements(programmeId: string | undefined) {
  return useQuery({
    queryKey: ["programme_engagements", programmeId],
    enabled: Boolean(programmeId),
    staleTime: STALE_MS,
    queryFn: async (): Promise<ProgrammeEngagement[]> => {
      const { data, error } = await sbAny
        .from("programme_engagements")
        .select("*")
        .eq("programme_id", programmeId!)
        .order("engagement_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProgrammeEngagement[];
    },
  });
}

export function useAddEngagement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      programme_id: string;
      title: string;
      organisation?: string;
      engagement_date?: string | null;
      notes?: string;
      institution_id?: string | null;
      added_by_name?: string;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await sbAny.from("programme_engagements").insert({
        programme_id: input.programme_id,
        title: input.title,
        organisation: input.organisation || null,
        engagement_date: input.engagement_date || null,
        notes: input.notes || null,
        institution_id: input.institution_id || null,
        added_by_name: input.added_by_name || null,
        created_by: auth.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["programme_engagements", vars.programme_id] });
    },
  });
}

export function useDeleteEngagement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; programme_id: string }) => {
      const { error } = await sbAny.from("programme_engagements").delete().eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["programme_engagements", vars.programme_id] });
    },
  });
}

// Follow-up / discussion thread on a single engagement.
export function useEngagementFollowups(engagementId: string | undefined) {
  return useQuery({
    queryKey: ["engagement_followups", engagementId],
    enabled: Boolean(engagementId),
    staleTime: STALE_MS,
    queryFn: async (): Promise<ProgrammeEngagementFollowup[]> => {
      const { data, error } = await sbAny
        .from("programme_engagement_followups")
        .select("*")
        .eq("engagement_id", engagementId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ProgrammeEngagementFollowup[];
    },
  });
}

export function useAddEngagementFollowup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { engagement_id: string; note: string; added_by_name?: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await sbAny.from("programme_engagement_followups").insert({
        engagement_id: input.engagement_id,
        note: input.note,
        added_by_name: input.added_by_name || null,
        created_by: auth.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["engagement_followups", vars.engagement_id] });
    },
  });
}

// Per-programme pipeline stage grouping (config-not-code). Reads system_config
// programme_stages:<id>, falling back to programme_stages:default, then to the
// code default below — the same fallback ladder as loadReadinessWeights().
export type ProgrammeStageGroup = { label: string; keys: string[] };

export const DEFAULT_PROGRAMME_STAGES: ProgrammeStageGroup[] = [
  { label: "Identified", keys: ["identified"] },
  { label: "Assessed / Scored", keys: ["assessed", "scored"] },
  { label: "Contracted", keys: ["contracted", "in_delivery"] },
  { label: "Installed", keys: ["installed"] },
];

export function useProgrammeStages(programmeId: string | undefined) {
  return useQuery({
    queryKey: ["programme_stages", programmeId],
    staleTime: STALE_MS,
    queryFn: async (): Promise<ProgrammeStageGroup[]> => {
      const keys = [
        programmeId ? `programme_stages:${programmeId}` : null,
        "programme_stages:default",
      ].filter(Boolean) as string[];
      const { data } = await supabase
        .from("system_config")
        .select("config_key, config_value")
        .in("config_key", keys);
      const byKey = new Map((data ?? []).map((r) => [r.config_key, r.config_value]));
      const raw =
        (programmeId && byKey.get(`programme_stages:${programmeId}`)) ||
        byKey.get("programme_stages:default");
      const stages = (raw as { stages?: ProgrammeStageGroup[] } | null)?.stages;
      return Array.isArray(stages) && stages.length ? stages : DEFAULT_PROGRAMME_STAGES;
    },
  });
}

// The current user's programme memberships — powers the scoped portal guard
// and the post-login redirect for tenant-only users (e.g. county viewers).
export function useMyProgrammes() {
  return useQuery({
    queryKey: ["my_programme_members"],
    staleTime: STALE_MS,
    queryFn: async (): Promise<ProgrammeMember[]> => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return [];
      const { data, error } = await sbAny
        .from("programme_members")
        .select("*")
        .eq("user_id", uid);
      if (error) throw error;
      return (data ?? []) as ProgrammeMember[];
    },
  });
}

// The current user's programmes with names + their role in each — powers the
// member portal sidebar, which lists every project they've been added to.
export type MyProgramme = { id: string; name: string; role: ProgrammeMemberRole };

export function useMyProgrammeList() {
  return useQuery({
    queryKey: ["my_programme_list"],
    staleTime: STALE_MS,
    queryFn: async (): Promise<MyProgramme[]> => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return [];
      const { data: members } = await sbAny
        .from("programme_members")
        .select("programme_id, role")
        .eq("user_id", uid);
      const rows = (members ?? []) as { programme_id: string; role: ProgrammeMemberRole }[];
      if (!rows.length) return [];
      const roleById = new Map(rows.map((r) => [r.programme_id, r.role]));
      const { data: progs } = await supabase
        .from("programmes")
        .select("id, name")
        .in("id", rows.map((r) => r.programme_id));
      return (progs ?? []).map((p) => ({ id: p.id, name: p.name, role: roleById.get(p.id)! }));
    },
  });
}
