BEGIN;

CREATE TABLE IF NOT EXISTS public.product_shop_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  stock_quantity INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, shop_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'product_shop_inventory_stock_nonnegative'
  ) THEN
    ALTER TABLE public.product_shop_inventory
      ADD CONSTRAINT product_shop_inventory_stock_nonnegative
      CHECK (stock_quantity >= 0);
  END IF;
END $$;

ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS origin_lat NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS origin_lng NUMERIC(9,6);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shops_origin_lat_range'
  ) THEN
    ALTER TABLE public.shops
      ADD CONSTRAINT shops_origin_lat_range
      CHECK (origin_lat IS NULL OR origin_lat BETWEEN -90 AND 90);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shops_origin_lng_range'
  ) THEN
    ALTER TABLE public.shops
      ADD CONSTRAINT shops_origin_lng_range
      CHECK (origin_lng IS NULL OR origin_lng BETWEEN -180 AND 180);
  END IF;
END $$;

INSERT INTO public.product_shop_inventory (product_id, shop_id, stock_quantity, is_active)
SELECT p.id, p.shop_id, COALESCE(p.stock_quantity, 0), COALESCE(p.is_active, true)
FROM public.products p
ON CONFLICT (product_id, shop_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_product_shop_inventory_product_id
ON public.product_shop_inventory (product_id);

CREATE INDEX IF NOT EXISTS idx_product_shop_inventory_shop_id
ON public.product_shop_inventory (shop_id);

ALTER TABLE public.product_shop_inventory ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_timestamp_product_shop_inventory ON public.product_shop_inventory;
CREATE TRIGGER set_timestamp_product_shop_inventory
BEFORE UPDATE ON public.product_shop_inventory
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP POLICY IF EXISTS "product_shop_inventory_select_admin_or_superadmin" ON public.product_shop_inventory;
CREATE POLICY "product_shop_inventory_select_admin_or_superadmin" ON public.product_shop_inventory
FOR SELECT
USING (
  public.is_superadmin()
  OR public.is_approved_admin()
);

DROP POLICY IF EXISTS "product_shop_inventory_manage_admin_or_superadmin" ON public.product_shop_inventory;
CREATE POLICY "product_shop_inventory_manage_admin_or_superadmin" ON public.product_shop_inventory
FOR ALL
USING (
  public.is_superadmin()
  OR public.is_approved_admin()
)
WITH CHECK (
  public.is_superadmin()
  OR public.is_approved_admin()
);

COMMIT;
