-- supabase/migrations/010_banners_storage.sql

INSERT INTO storage.buckets (id, name, public)
VALUES ('banners', 'banners', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

DROP POLICY IF EXISTS "banners_storage_public_read" ON storage.objects;
CREATE POLICY "banners_storage_public_read" ON storage.objects
FOR SELECT
USING (bucket_id = 'banners');

DROP POLICY IF EXISTS "banners_storage_admin_insert" ON storage.objects;
CREATE POLICY "banners_storage_admin_insert" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'banners'
  AND (public.is_approved_admin() OR public.is_superadmin())
);

DROP POLICY IF EXISTS "banners_storage_admin_update" ON storage.objects;
CREATE POLICY "banners_storage_admin_update" ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'banners'
  AND (public.is_approved_admin() OR public.is_superadmin())
)
WITH CHECK (
  bucket_id = 'banners'
  AND (public.is_approved_admin() OR public.is_superadmin())
);

DROP POLICY IF EXISTS "banners_storage_admin_delete" ON storage.objects;
CREATE POLICY "banners_storage_admin_delete" ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'banners'
  AND (public.is_approved_admin() OR public.is_superadmin())
);
