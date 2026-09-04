-- ============================================================
-- Programme vendors — suppliers/vendors a programme (tenant) works with.
-- Lightweight contact records (supplier name + a contact person, phone,
-- email), scoped to the programme. Separate from the platform-wide
-- `providers` table so a programme can track its own vendor list without
-- touching global supplier data.
--
-- Scoping follows the host-tenant model (see 20260808100000): host manages
-- all, the programme manager manages their own, members read their own.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.programme_vendors (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id  uuid NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  supplier_name text NOT NULL,
  contact_name  text,
  phone         text,
  email         text,
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_programme_vendors_programme
  ON public.programme_vendors (programme_id);

ALTER TABLE public.programme_vendors ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_programme_vendors_updated_at ON public.programme_vendors;
CREATE TRIGGER trg_programme_vendors_updated_at
  BEFORE UPDATE ON public.programme_vendors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Host, the programme manager, or a lead/editor member may write.
DROP POLICY IF EXISTS "pv_host_manage" ON public.programme_vendors;
DROP POLICY IF EXISTS "pv_lead_manage" ON public.programme_vendors;
DROP POLICY IF EXISTS "pv_edit_manage" ON public.programme_vendors;
CREATE POLICY "pv_edit_manage" ON public.programme_vendors
  FOR ALL TO authenticated
  USING (public.can_edit_programme(auth.uid(), programme_id))
  WITH CHECK (public.can_edit_programme(auth.uid(), programme_id));

DROP POLICY IF EXISTS "pv_member_read" ON public.programme_vendors;
CREATE POLICY "pv_member_read" ON public.programme_vendors
  FOR SELECT TO authenticated
  USING (programme_id IN (SELECT public.user_programme_ids(auth.uid())));
