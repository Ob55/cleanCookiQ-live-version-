
ALTER TABLE public.institutions
ADD COLUMN IF NOT EXISTS cooking_time_minutes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS kitchen_photo_url text;
