-- ============================================================
-- Threaded conversations on support tickets.
--
-- Replaces the single-shot `support_tickets.admin_reply` column
-- pattern with a full conversation table so both sides can go
-- back and forth without leaving the platform.
--
-- A trigger fires an in-app notification to the *other* party on
-- every new message. NotificationBell + the existing realtime
-- subscription pick that up.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_role  TEXT NOT NULL CHECK (author_role IN ('user', 'staff')),
  author_name  TEXT,
  body         TEXT NOT NULL,
  attachments  JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{url, name, mime, size}]
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket
  ON public.ticket_messages(ticket_id, created_at);

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ticket_messages_read"   ON public.ticket_messages;
DROP POLICY IF EXISTS "ticket_messages_insert" ON public.ticket_messages;

-- The ticket raiser can read messages on their own tickets.
-- Admins/managers can read all. Authenticated staff (admin role)
-- writes as 'staff'; the raiser writes as 'user'.
CREATE POLICY "ticket_messages_read"
  ON public.ticket_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND (
          t.raised_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
          )
        )
    )
  );

CREATE POLICY "ticket_messages_insert"
  ON public.ticket_messages
  FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND (
          (t.raised_by = auth.uid() AND author_role = 'user')
          OR (
            author_role = 'staff'
            AND EXISTS (
              SELECT 1 FROM public.user_roles
              WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
            )
          )
        )
    )
  );

-- Backfill: copy any existing admin_reply into the messages table so
-- the conversation view shows old replies in-thread. Only run if the
-- legacy column still exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'support_tickets'
      AND column_name = 'admin_reply'
  ) THEN
    INSERT INTO public.ticket_messages (ticket_id, author_id, author_role, author_name, body, created_at)
    SELECT t.id, NULL, 'staff', 'Support', t.admin_reply, COALESCE(t.resolved_at, NOW())
    FROM public.support_tickets t
    WHERE t.admin_reply IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.ticket_messages m WHERE m.ticket_id = t.id
      );
  END IF;
END $$;

-- ============================================================
-- Notify the *other* party whenever a new message lands.
--
-- A staff reply notifies the ticket raiser; a user reply notifies
-- all active admins. The body of the notification is a short
-- excerpt so the bell-popover preview is meaningful.
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_on_ticket_message()
RETURNS TRIGGER AS $$
DECLARE
  ticket_record RECORD;
  excerpt       TEXT;
BEGIN
  SELECT id, title, raised_by, raised_by_name
    INTO ticket_record
    FROM public.support_tickets
    WHERE id = NEW.ticket_id;

  excerpt := CASE
    WHEN length(NEW.body) > 140 THEN substring(NEW.body FROM 1 FOR 137) || '…'
    ELSE NEW.body
  END;

  IF NEW.author_role = 'staff' THEN
    -- Notify the raiser.
    IF ticket_record.raised_by IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body)
      VALUES (
        ticket_record.raised_by,
        'New reply on: ' || ticket_record.title,
        excerpt
      );
    END IF;
  ELSE
    -- Notify every admin/manager except the author.
    INSERT INTO public.notifications (user_id, title, body)
    SELECT ur.user_id,
           'New ticket message: ' || ticket_record.title,
           COALESCE(ticket_record.raised_by_name, 'A user') || ': ' || excerpt
    FROM public.user_roles ur
    WHERE ur.role IN ('admin', 'manager')
      AND ur.user_id <> NEW.author_id;
  END IF;

  -- Touch the ticket so it sorts to the top.
  UPDATE public.support_tickets
    SET updated_at = NOW()
    WHERE id = NEW.ticket_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_ticket_messages_notify ON public.ticket_messages;
CREATE TRIGGER trg_ticket_messages_notify
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_ticket_message();
