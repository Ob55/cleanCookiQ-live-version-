-- ============================================================
-- Budget lines: allow multiple institutions per item.
-- Engagements: add a follow-up / discussion thread.
-- ============================================================

-- A budget item can now be attributed to several institutions.
ALTER TABLE public.programme_budget_lines
  ADD COLUMN IF NOT EXISTS institution_ids uuid[] NOT NULL DEFAULT '{}';

-- Carry over any single institution_id already set into the new array.
UPDATE public.programme_budget_lines
  SET institution_ids = ARRAY[institution_id]
  WHERE institution_id IS NOT NULL
    AND (institution_ids IS NULL OR array_length(institution_ids, 1) IS NULL);

-- ---------- engagement follow-ups (discussion thread) ----------
CREATE TABLE IF NOT EXISTS public.programme_engagement_followups (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES public.programme_engagements(id) ON DELETE CASCADE,
  note          text NOT NULL,
  added_by_name text,
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_engagement_followups_engagement
  ON public.programme_engagement_followups (engagement_id);

ALTER TABLE public.programme_engagement_followups ENABLE ROW LEVEL SECURITY;

-- Write when you can edit the parent engagement's programme; read when you can
-- see it. Scope resolves through programme_engagements → programme_id.
DROP POLICY IF EXISTS "pef_edit_manage" ON public.programme_engagement_followups;
CREATE POLICY "pef_edit_manage" ON public.programme_engagement_followups
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.programme_engagements e
    WHERE e.id = programme_engagement_followups.engagement_id
      AND public.can_edit_programme(auth.uid(), e.programme_id)))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.programme_engagements e
    WHERE e.id = programme_engagement_followups.engagement_id
      AND public.can_edit_programme(auth.uid(), e.programme_id)));

DROP POLICY IF EXISTS "pef_member_read" ON public.programme_engagement_followups;
CREATE POLICY "pef_member_read" ON public.programme_engagement_followups
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.programme_engagements e
    WHERE e.id = programme_engagement_followups.engagement_id
      AND e.programme_id IN (SELECT public.user_programme_ids(auth.uid()))));
