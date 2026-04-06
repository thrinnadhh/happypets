-- supabase/migrations/011_validation_guards.sql

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_price_positive'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_price_positive CHECK (price_inr > 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_stock_nonnegative'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_stock_nonnegative CHECK (stock_quantity >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_discount_nonnegative'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_discount_nonnegative CHECK (discount >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_dates_valid'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_dates_valid
      CHECK (
        manufacture_date IS NULL
        OR expiry_date IS NULL
        OR manufacture_date < expiry_date
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'product_variants_price_positive'
  ) THEN
    ALTER TABLE public.product_variants
      ADD CONSTRAINT product_variants_price_positive CHECK (price_inr > 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'product_variants_stock_nonnegative'
  ) THEN
    ALTER TABLE public.product_variants
      ADD CONSTRAINT product_variants_stock_nonnegative CHECK (stock_quantity >= 0);
  END IF;
END $$;

ALTER TABLE public.banners
  DROP CONSTRAINT IF EXISTS banners_position_range;

ALTER TABLE public.banners
  ADD CONSTRAINT banners_position_range CHECK (position BETWEEN 1 AND 10);
