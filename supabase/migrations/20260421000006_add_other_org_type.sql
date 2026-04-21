-- Add 'other' as a valid org_type for organisations that don't fit existing categories
ALTER TYPE public.org_type ADD VALUE IF NOT EXISTS 'other';

-- Add org_name and description to profiles so admin can see who registered as 'other'
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS org_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS description text;
