
CREATE TABLE public.institution_selected_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.provider_services(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(institution_id, service_id)
);

ALTER TABLE public.institution_selected_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage selected services"
ON public.institution_selected_services FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view selected services"
ON public.institution_selected_services FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Institution owners can insert selected services"
ON public.institution_selected_services FOR INSERT
TO authenticated
WITH CHECK (institution_id IN (SELECT id FROM public.institutions WHERE created_by = auth.uid()));

CREATE POLICY "Institution owners can delete selected services"
ON public.institution_selected_services FOR DELETE
TO authenticated
USING (institution_id IN (SELECT id FROM public.institutions WHERE created_by = auth.uid()));
