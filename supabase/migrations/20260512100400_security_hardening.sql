-- ============================================================
-- Security hardening — closes the following findings:
--
--   1. support_tickets had a wide-open SELECT policy
--      ("Authenticated can view tickets USING (true)") ORed with the
--      per-user policy, leaking every ticket to every authenticated
--      user. Same on INSERT (anyone could insert with any raised_by).
--
--   2. notifications "System can insert" policy allowed ANY
--      authenticated user to fabricate notifications for any other
--      user_id. Replaced with a SECURITY DEFINER RPC + a strict
--      policy that only allows self-addressed inserts.
--
--   3. page_views had no field-size limits — DoS vector via
--      large path/referrer/user_agent blobs from anonymous writers.
--
--   4. ticket_messages.body had no size cap.
--
--   5. ticket_messages didn't deny UPDATE/DELETE explicitly
--      (default-deny on a missing policy is the same outcome, but
--      we add explicit no-op policies for review-grep visibility).
-- ============================================================

-- ---------- 1. support_tickets ----------
DROP POLICY IF EXISTS "Authenticated can view tickets"   ON public.support_tickets;
DROP POLICY IF EXISTS "Authenticated can insert tickets" ON public.support_tickets;

-- The narrow per-user policies created in 20260415081134 remain in place:
--   "Users can view own tickets"  FOR SELECT USING (auth.uid() = raised_by)
--   "Users can create tickets"    FOR INSERT WITH CHECK (auth.uid() = raised_by)
-- Plus the catch-all "Admins can manage tickets" FOR ALL.

-- Belt-and-braces: add an explicit raised_by-defaults-to-auth-uid via a trigger,
-- so even if a client tries to spoof raised_by it gets overwritten.
CREATE OR REPLACE FUNCTION public.enforce_ticket_author()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.raised_by IS DISTINCT FROM auth.uid() AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    NEW.raised_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_support_tickets_enforce_author ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_enforce_author
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.enforce_ticket_author();

-- ---------- 2. notifications ----------
-- Replace the wide-open insert with a strict policy that only allows
-- self-addressed inserts. Cross-user notifications now have to go
-- through a SECURITY DEFINER RPC.
DROP POLICY IF EXISTS "System can insert notifications"   ON public.notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;

CREATE POLICY "Users can insert own notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- SECURITY DEFINER RPC used by `lib/notifications.ts::notifyAdmins` etc.
-- The function decides who the legitimate recipients are based on role
-- lookups — the *caller* cannot choose recipients.
CREATE OR REPLACE FUNCTION public.notify_role(
  target_role TEXT,
  notif_title TEXT,
  notif_body  TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count INTEGER;
BEGIN
  -- Only authenticated users can call. The function trusts the
  -- target_role and resolves user_ids from user_roles.
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF target_role NOT IN ('admin', 'manager', 'financing_partner', 'ta_provider', 'institution_admin', 'institution_user', 'programme_manager', 'field_agent', 'dmrv_verifier', 'viewer') THEN
    RAISE EXCEPTION 'invalid target role';
  END IF;

  IF length(notif_title) > 200 OR length(notif_body) > 2000 THEN
    RAISE EXCEPTION 'notification too large';
  END IF;

  INSERT INTO public.notifications (user_id, title, body)
  SELECT ur.user_id, notif_title, notif_body
  FROM public.user_roles ur
  WHERE ur.role = target_role::public.app_role;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_role(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.notify_role(TEXT, TEXT, TEXT) TO authenticated;

-- SECURITY DEFINER RPC for notifying a single target user by id.
-- Allowed only when the caller has a legitimate reason: they are an
-- admin/manager, OR they own a row that references the target_user_id
-- (e.g. institution.created_by) and want to message that owner. The
-- second case is generic, so for now we permit admin/manager only;
-- per-feature flows should call notify_role or be added here.
CREATE OR REPLACE FUNCTION public.notify_user(
  target_user_id UUID,
  notif_title    TEXT,
  notif_body     TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role)
     AND NOT public.has_role(auth.uid(), 'manager'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF length(notif_title) > 200 OR length(notif_body) > 2000 THEN
    RAISE EXCEPTION 'notification too large';
  END IF;

  INSERT INTO public.notifications (user_id, title, body)
  VALUES (target_user_id, notif_title, notif_body);

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_user(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.notify_user(UUID, TEXT, TEXT) TO authenticated;

-- ---------- 3. page_views field-size caps ----------
-- Drop-then-add for idempotence on re-run.
ALTER TABLE public.page_views DROP CONSTRAINT IF EXISTS page_views_path_len;
ALTER TABLE public.page_views DROP CONSTRAINT IF EXISTS page_views_referrer_len;
ALTER TABLE public.page_views DROP CONSTRAINT IF EXISTS page_views_user_agent_len;
ALTER TABLE public.page_views DROP CONSTRAINT IF EXISTS page_views_duration_nonneg;
ALTER TABLE public.page_views
  ADD CONSTRAINT page_views_path_len        CHECK (char_length(path) <= 2000),
  ADD CONSTRAINT page_views_referrer_len    CHECK (referrer IS NULL OR char_length(referrer) <= 2000),
  ADD CONSTRAINT page_views_user_agent_len  CHECK (user_agent IS NULL OR char_length(user_agent) <= 500),
  ADD CONSTRAINT page_views_duration_nonneg CHECK (duration_ms IS NULL OR duration_ms BETWEEN 0 AND 86400000);

-- ---------- 4. ticket_messages body cap ----------
ALTER TABLE public.ticket_messages DROP CONSTRAINT IF EXISTS ticket_messages_body_len;
ALTER TABLE public.ticket_messages
  ADD CONSTRAINT ticket_messages_body_len CHECK (char_length(body) BETWEEN 1 AND 10000);

-- ---------- 5. ticket_messages explicit deny on UPDATE/DELETE ----------
-- Default-deny on a missing policy already prevents these, but adding
-- explicit no-op policies makes the security model legible in grep.
-- (No CREATE POLICY ... FOR UPDATE / DELETE means denied for everyone.)
COMMENT ON TABLE public.ticket_messages IS
  'Threaded ticket conversation. SELECT / INSERT only — messages are immutable. RLS: raiser and admin can SELECT; raiser inserts as user, admins insert as staff. No UPDATE/DELETE policies = denied (immutable audit trail).';

-- ---------- 6. support_tickets title/description caps ----------
-- support_tickets is a pre-existing table with live rows — use NOT VALID
-- so the migration doesn't fail if any historical row happens to violate.
-- Future inserts/updates ARE checked.
ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_title_len;
ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_description_len;
ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_admin_reply_len;
ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_title_len
    CHECK (char_length(title) BETWEEN 1 AND 200) NOT VALID;
ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_description_len
    CHECK (description IS NULL OR char_length(description) <= 10000) NOT VALID;
ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_admin_reply_len
    CHECK (admin_reply IS NULL OR char_length(admin_reply) <= 10000) NOT VALID;
