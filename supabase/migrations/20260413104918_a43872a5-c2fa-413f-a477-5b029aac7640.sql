
-- Create storage bucket for institution assets (kitchen photos etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('institution-assets', 'institution-assets', true);

-- Allow public read access
CREATE POLICY "Public can view institution assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'institution-assets');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload institution assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'institution-assets');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update institution assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'institution-assets');
