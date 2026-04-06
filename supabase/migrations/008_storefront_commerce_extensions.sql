-- supabase/migrations/008_storefront_commerce_extensions.sql

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS weight TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS packet_count INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_sample BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_packet_count_positive'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_packet_count_positive CHECK (packet_count > 0);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  position INT NOT NULL UNIQUE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'banners_position_range'
  ) THEN
    ALTER TABLE public.banners
      ADD CONSTRAINT banners_position_range CHECK (position BETWEEN 1 AND 4);
  END IF;
END $$;

ALTER TABLE public.cart_items
  ADD COLUMN IF NOT EXISTS selected BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_address TEXT,
  ADD COLUMN IF NOT EXISTS mobile_number TEXT,
  ADD COLUMN IF NOT EXISTS delivery_time TEXT,
  ADD COLUMN IF NOT EXISTS coupon_code TEXT;

CREATE INDEX IF NOT EXISTS idx_banners_position
ON public.banners (position);

CREATE INDEX IF NOT EXISTS idx_cart_items_user_created
ON public.cart_items (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_user_created
ON public.orders (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.protect_profile_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.id := OLD.id;

  IF auth.uid() IS NOT NULL AND NOT public.is_superadmin() THEN
    NEW.role := OLD.role;
    NEW.approved := OLD.approved;
    NEW.is_active := OLD.is_active;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_admin_fields_trigger ON public.profiles;
CREATE TRIGGER protect_profile_admin_fields_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE PROCEDURE public.protect_profile_admin_fields();

DROP TRIGGER IF EXISTS set_timestamp_banners ON public.banners;
CREATE TRIGGER set_timestamp_banners
BEFORE UPDATE ON public.banners
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "addresses_manage_own" ON public.addresses;
CREATE POLICY "addresses_manage_own" ON public.addresses
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "cart_items_manage_own" ON public.cart_items;
CREATE POLICY "cart_items_manage_own" ON public.cart_items
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "orders_select_own_or_superadmin" ON public.orders;
CREATE POLICY "orders_select_own_or_superadmin" ON public.orders
FOR SELECT
USING (auth.uid() = user_id OR public.is_superadmin());

DROP POLICY IF EXISTS "orders_insert_own_or_superadmin" ON public.orders;
CREATE POLICY "orders_insert_own_or_superadmin" ON public.orders
FOR INSERT
WITH CHECK (auth.uid() = user_id OR public.is_superadmin());

DROP POLICY IF EXISTS "order_items_select_by_order_owner" ON public.order_items;
CREATE POLICY "order_items_select_by_order_owner" ON public.order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.orders
    WHERE public.orders.id = public.order_items.order_id
      AND (public.orders.user_id = auth.uid() OR public.is_superadmin())
  )
);

DROP POLICY IF EXISTS "order_items_insert_by_order_owner" ON public.order_items;
CREATE POLICY "order_items_insert_by_order_owner" ON public.order_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.orders
    WHERE public.orders.id = public.order_items.order_id
      AND (public.orders.user_id = auth.uid() OR public.is_superadmin())
  )
);

DROP POLICY IF EXISTS "coupons_read_active" ON public.coupons;
CREATE POLICY "coupons_read_active" ON public.coupons
FOR SELECT
USING (
  is_active = true
  OR public.is_superadmin()
  OR shop_id = public.get_admin_shop_id()
);

DROP POLICY IF EXISTS "banners_public_read" ON public.banners;
CREATE POLICY "banners_public_read" ON public.banners
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "banners_admin_insert" ON public.banners;
CREATE POLICY "banners_admin_insert" ON public.banners
FOR INSERT
WITH CHECK (
  public.is_superadmin()
  OR public.is_approved_admin()
);

DROP POLICY IF EXISTS "banners_admin_update" ON public.banners;
CREATE POLICY "banners_admin_update" ON public.banners
FOR UPDATE
USING (
  public.is_superadmin()
  OR public.is_approved_admin()
)
WITH CHECK (
  public.is_superadmin()
  OR public.is_approved_admin()
);

DROP POLICY IF EXISTS "banners_admin_delete" ON public.banners;
CREATE POLICY "banners_admin_delete" ON public.banners
FOR DELETE
USING (
  public.is_superadmin()
  OR public.is_approved_admin()
);
