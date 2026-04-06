-- supabase/migrations/006_supabase_auth_roles_alignment.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique
ON profiles (email)
WHERE email IS NOT NULL;

ALTER TABLE shops
  ALTER COLUMN admin_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_shops_admin_id_unique
ON shops (admin_id)
WHERE admin_id IS NOT NULL;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS brand TEXT NOT NULL DEFAULT 'HappyPets',
  ADD COLUMN IF NOT EXISTS discount NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS manufacture_date DATE,
  ADD COLUMN IF NOT EXISTS expiry_date DATE,
  ADD COLUMN IF NOT EXISTS sold_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) NOT NULL DEFAULT 4.8;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'wishlist_items'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'favorites'
  ) THEN
    ALTER TABLE public.wishlist_items RENAME TO favorites;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS admin_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revoked')),
  reason TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category_display_position
ON products (category_id, display_section, position);

CREATE INDEX IF NOT EXISTS idx_products_tags_gin
ON products USING gin (tags);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id
ON favorites (user_id);

CREATE INDEX IF NOT EXISTS idx_admin_requests_status_created_at
ON admin_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_actor_created_at
ON activity_logs (actor_user_id, created_at DESC);

INSERT INTO categories (name, slug, pet_type, sort_order)
VALUES
  ('Dog', 'dog', 'dog', 1),
  ('Cat', 'cat', 'cat', 2),
  ('Fish', 'fish', 'fish', 3),
  ('Hamster', 'hamster', 'small_animal', 4),
  ('Rabbit', 'rabbit', 'small_animal', 5),
  ('Birds', 'birds', 'bird', 6)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    pet_type = EXCLUDED.pet_type,
    sort_order = EXCLUDED.sort_order;

UPDATE profiles
SET email = COALESCE(email, auth_users.email)
FROM auth.users AS auth_users
WHERE profiles.id = auth_users.id;

INSERT INTO public.profiles (id, email, full_name, role, approved)
SELECT
  auth_users.id,
  auth_users.email,
  COALESCE(
    NULLIF(auth_users.raw_user_meta_data->>'full_name', ''),
    split_part(COALESCE(auth_users.email, 'user@happypets.com'), '@', 1)
  ) AS full_name,
  CASE
    WHEN COALESCE(auth_users.raw_user_meta_data->>'requested_role', 'customer') = 'admin' THEN 'admin'
    ELSE 'customer'
  END AS role,
  CASE
    WHEN COALESCE(auth_users.raw_user_meta_data->>'requested_role', 'customer') = 'admin' THEN false
    ELSE true
  END AS approved
FROM auth.users AS auth_users
LEFT JOIN public.profiles ON public.profiles.id = auth_users.id
WHERE public.profiles.id IS NULL;

INSERT INTO public.admin_requests (user_id, status)
SELECT profiles.id, 'pending'
FROM public.profiles
LEFT JOIN public.admin_requests ON public.admin_requests.user_id = public.profiles.id
WHERE profiles.role = 'admin'
  AND public.admin_requests.user_id IS NULL;

INSERT INTO public.shops (admin_id, name, slug, status)
SELECT
  profiles.id,
  profiles.full_name || ' Store',
  lower(
    regexp_replace(
      profiles.full_name || '-' || left(profiles.id::text, 8),
      '[^a-zA-Z0-9]+',
      '-',
      'g'
    )
  ),
  CASE WHEN profiles.approved THEN 'active' ELSE 'pending' END
FROM public.profiles AS profiles
LEFT JOIN public.shops ON public.shops.admin_id = profiles.id
WHERE profiles.role = 'admin'
  AND public.shops.id IS NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  requested_role TEXT;
  resolved_role TEXT;
  resolved_name TEXT;
  resolved_email TEXT;
  shop_name TEXT;
  shop_slug TEXT;
BEGIN
  requested_role := COALESCE(NEW.raw_user_meta_data->>'requested_role', 'customer');
  resolved_role := CASE
    WHEN requested_role IN ('customer', 'admin') THEN requested_role
    ELSE 'customer'
  END;
  resolved_email := NEW.email;
  resolved_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    split_part(COALESCE(NEW.email, 'user@happypets.com'), '@', 1)
  );

  INSERT INTO public.profiles (id, email, full_name, role, approved)
  VALUES (
    NEW.id,
    resolved_email,
    resolved_name,
    resolved_role,
    resolved_role <> 'admin'
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);

  IF resolved_role = 'admin' THEN
    INSERT INTO public.admin_requests (user_id, status)
    VALUES (NEW.id, 'pending')
    ON CONFLICT (user_id) DO NOTHING;

    shop_name := resolved_name || ' Store';
    shop_slug := lower(
      regexp_replace(
        resolved_name || '-' || left(NEW.id::text, 8),
        '[^a-zA-Z0-9]+',
        '-',
        'g'
      )
    );

    INSERT INTO public.shops (admin_id, name, slug, status)
    VALUES (NEW.id, shop_name, shop_slug, 'pending')
    ON CONFLICT (slug) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

DROP TRIGGER IF EXISTS set_timestamp_profiles ON profiles;
CREATE TRIGGER set_timestamp_profiles
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS set_timestamp_shops ON shops;
CREATE TRIGGER set_timestamp_shops
BEFORE UPDATE ON shops
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS set_timestamp_products ON products;
CREATE TRIGGER set_timestamp_products
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS set_timestamp_admin_requests ON admin_requests;
CREATE TRIGGER set_timestamp_admin_requests
BEFORE UPDATE ON admin_requests
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
