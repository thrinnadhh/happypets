-- supabase/migrations/007_supabase_rls_policies.sql

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'superadmin'
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_approved_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND approved = true
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_admin_shop_id()
RETURNS uuid AS $$
  SELECT id
  FROM public.shops
  WHERE admin_id = auth.uid()
  ORDER BY created_at ASC
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
FOR SELECT USING (auth.uid() = id OR public.is_superadmin());

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
FOR UPDATE USING (auth.uid() = id OR public.is_superadmin());

DROP POLICY IF EXISTS "shops_select_admin_or_superadmin" ON shops;
CREATE POLICY "shops_select_admin_or_superadmin" ON shops
FOR SELECT USING (admin_id = auth.uid() OR public.is_superadmin());

DROP POLICY IF EXISTS "shops_superadmin_manage" ON shops;
CREATE POLICY "shops_superadmin_manage" ON shops
FOR ALL USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "categories_public_read" ON categories;
CREATE POLICY "categories_public_read" ON categories
FOR SELECT USING (true);

DROP POLICY IF EXISTS "products_public_read_active" ON products;
CREATE POLICY "products_public_read_active" ON products
FOR SELECT USING (
  is_active = true
  OR shop_id = public.get_admin_shop_id()
  OR public.is_superadmin()
);

DROP POLICY IF EXISTS "products_admin_insert" ON products;
CREATE POLICY "products_admin_insert" ON products
FOR INSERT WITH CHECK (
  (public.is_approved_admin() AND shop_id = public.get_admin_shop_id())
  OR public.is_superadmin()
);

DROP POLICY IF EXISTS "products_admin_update" ON products;
CREATE POLICY "products_admin_update" ON products
FOR UPDATE USING (
  (public.is_approved_admin() AND shop_id = public.get_admin_shop_id())
  OR public.is_superadmin()
)
WITH CHECK (
  (public.is_approved_admin() AND shop_id = public.get_admin_shop_id())
  OR public.is_superadmin()
);

DROP POLICY IF EXISTS "products_admin_delete" ON products;
CREATE POLICY "products_admin_delete" ON products
FOR DELETE USING (
  (public.is_approved_admin() AND shop_id = public.get_admin_shop_id())
  OR public.is_superadmin()
);

DROP POLICY IF EXISTS "favorites_manage_own" ON favorites;
CREATE POLICY "favorites_manage_own" ON favorites
FOR ALL USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_requests_select_own_or_superadmin" ON admin_requests;
CREATE POLICY "admin_requests_select_own_or_superadmin" ON admin_requests
FOR SELECT USING (auth.uid() = user_id OR public.is_superadmin());

DROP POLICY IF EXISTS "admin_requests_superadmin_update" ON admin_requests;
CREATE POLICY "admin_requests_superadmin_update" ON admin_requests
FOR UPDATE USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "activity_logs_superadmin_read" ON activity_logs;
CREATE POLICY "activity_logs_superadmin_read" ON activity_logs
FOR SELECT USING (public.is_superadmin());

DROP POLICY IF EXISTS "activity_logs_insert_authenticated" ON activity_logs;
CREATE POLICY "activity_logs_insert_authenticated" ON activity_logs
FOR INSERT WITH CHECK (auth.uid() = actor_user_id OR public.is_superadmin());

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
CREATE POLICY "product_images_public_read" ON storage.objects
FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product_images_admin_insert" ON storage.objects;
CREATE POLICY "product_images_admin_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (public.is_approved_admin() OR public.is_superadmin())
);

DROP POLICY IF EXISTS "product_images_admin_update" ON storage.objects;
CREATE POLICY "product_images_admin_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'product-images'
  AND (public.is_approved_admin() OR public.is_superadmin())
)
WITH CHECK (
  bucket_id = 'product-images'
  AND (public.is_approved_admin() OR public.is_superadmin())
);

DROP POLICY IF EXISTS "product_images_admin_delete" ON storage.objects;
CREATE POLICY "product_images_admin_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'product-images'
  AND (public.is_approved_admin() OR public.is_superadmin())
);
