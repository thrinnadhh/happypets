BEGIN;

CREATE TABLE IF NOT EXISTS public.shop_delivery_configs (
  shop_id UUID PRIMARY KEY REFERENCES public.shops(id) ON DELETE CASCADE,
  origin_address TEXT NOT NULL,
  origin_lat NUMERIC(9,6) NOT NULL,
  origin_lng NUMERIC(9,6) NOT NULL,
  base_fee_inr NUMERIC(10,2) NOT NULL DEFAULT 0,
  included_distance_km NUMERIC(10,2) NOT NULL DEFAULT 0,
  extra_per_km_inr NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_service_distance_km NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.delivery_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  cart_signature TEXT NOT NULL,
  destination_address TEXT NOT NULL,
  destination_lat NUMERIC(9,6) NOT NULL,
  destination_lng NUMERIC(9,6) NOT NULL,
  distance_meters INT NOT NULL,
  duration_seconds INT NOT NULL,
  delivery_fee_inr NUMERIC(10,2) NOT NULL,
  serviceable BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shop_delivery_configs_base_fee_nonnegative'
  ) THEN
    ALTER TABLE public.shop_delivery_configs
      ADD CONSTRAINT shop_delivery_configs_base_fee_nonnegative
      CHECK (base_fee_inr >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shop_delivery_configs_included_distance_nonnegative'
  ) THEN
    ALTER TABLE public.shop_delivery_configs
      ADD CONSTRAINT shop_delivery_configs_included_distance_nonnegative
      CHECK (included_distance_km >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shop_delivery_configs_extra_per_km_nonnegative'
  ) THEN
    ALTER TABLE public.shop_delivery_configs
      ADD CONSTRAINT shop_delivery_configs_extra_per_km_nonnegative
      CHECK (extra_per_km_inr >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shop_delivery_configs_max_distance_positive'
  ) THEN
    ALTER TABLE public.shop_delivery_configs
      ADD CONSTRAINT shop_delivery_configs_max_distance_positive
      CHECK (max_service_distance_km > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shop_delivery_configs_origin_lat_range'
  ) THEN
    ALTER TABLE public.shop_delivery_configs
      ADD CONSTRAINT shop_delivery_configs_origin_lat_range
      CHECK (origin_lat BETWEEN -90 AND 90);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shop_delivery_configs_origin_lng_range'
  ) THEN
    ALTER TABLE public.shop_delivery_configs
      ADD CONSTRAINT shop_delivery_configs_origin_lng_range
      CHECK (origin_lng BETWEEN -180 AND 180);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'delivery_quotes_distance_nonnegative'
  ) THEN
    ALTER TABLE public.delivery_quotes
      ADD CONSTRAINT delivery_quotes_distance_nonnegative
      CHECK (distance_meters >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'delivery_quotes_duration_nonnegative'
  ) THEN
    ALTER TABLE public.delivery_quotes
      ADD CONSTRAINT delivery_quotes_duration_nonnegative
      CHECK (duration_seconds >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'delivery_quotes_fee_nonnegative'
  ) THEN
    ALTER TABLE public.delivery_quotes
      ADD CONSTRAINT delivery_quotes_fee_nonnegative
      CHECK (delivery_fee_inr >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'delivery_quotes_destination_lat_range'
  ) THEN
    ALTER TABLE public.delivery_quotes
      ADD CONSTRAINT delivery_quotes_destination_lat_range
      CHECK (destination_lat BETWEEN -90 AND 90);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'delivery_quotes_destination_lng_range'
  ) THEN
    ALTER TABLE public.delivery_quotes
      ADD CONSTRAINT delivery_quotes_destination_lng_range
      CHECK (destination_lng BETWEEN -180 AND 180);
  END IF;
END $$;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_fee_inr NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_distance_meters INT,
  ADD COLUMN IF NOT EXISTS delivery_duration_seconds INT,
  ADD COLUMN IF NOT EXISTS delivery_origin_shop_id UUID REFERENCES public.shops(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivery_quote_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_delivery_quotes_user_created
ON public.delivery_quotes (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_delivery_quotes_shop_created
ON public.delivery_quotes (shop_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_delivery_quotes_expires_at
ON public.delivery_quotes (expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_delivery_origin_shop_id
ON public.orders (delivery_origin_shop_id);

ALTER TABLE public.shop_delivery_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_quotes ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_timestamp_shop_delivery_configs ON public.shop_delivery_configs;
CREATE TRIGGER set_timestamp_shop_delivery_configs
BEFORE UPDATE ON public.shop_delivery_configs
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS set_timestamp_delivery_quotes ON public.delivery_quotes;
CREATE TRIGGER set_timestamp_delivery_quotes
BEFORE UPDATE ON public.delivery_quotes
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP POLICY IF EXISTS "shop_delivery_configs_select_admin_or_superadmin" ON public.shop_delivery_configs;
CREATE POLICY "shop_delivery_configs_select_admin_or_superadmin" ON public.shop_delivery_configs
FOR SELECT
USING (
  public.is_superadmin()
  OR shop_id = public.get_admin_shop_id()
);

DROP POLICY IF EXISTS "shop_delivery_configs_insert_admin_or_superadmin" ON public.shop_delivery_configs;
CREATE POLICY "shop_delivery_configs_insert_admin_or_superadmin" ON public.shop_delivery_configs
FOR INSERT
WITH CHECK (
  public.is_superadmin()
  OR (public.is_approved_admin() AND shop_id = public.get_admin_shop_id())
);

DROP POLICY IF EXISTS "shop_delivery_configs_update_admin_or_superadmin" ON public.shop_delivery_configs;
CREATE POLICY "shop_delivery_configs_update_admin_or_superadmin" ON public.shop_delivery_configs
FOR UPDATE
USING (
  public.is_superadmin()
  OR (public.is_approved_admin() AND shop_id = public.get_admin_shop_id())
)
WITH CHECK (
  public.is_superadmin()
  OR (public.is_approved_admin() AND shop_id = public.get_admin_shop_id())
);

DROP POLICY IF EXISTS "delivery_quotes_select_own_or_superadmin" ON public.delivery_quotes;
CREATE POLICY "delivery_quotes_select_own_or_superadmin" ON public.delivery_quotes
FOR SELECT
USING (
  auth.uid() = user_id
  OR public.is_superadmin()
);

COMMIT;
