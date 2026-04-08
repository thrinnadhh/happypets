-- supabase/migrations/020_product_type.sql

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_type TEXT;

UPDATE public.products
SET product_type = COALESCE(NULLIF(TRIM(product_type), ''), 'Others')
WHERE product_type IS NULL OR TRIM(product_type) = '';
