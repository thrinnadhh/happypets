-- supabase/migrations/013_product_life_stage.sql

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS life_stage TEXT;
