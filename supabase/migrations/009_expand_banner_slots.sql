-- supabase/migrations/009_expand_banner_slots.sql

ALTER TABLE public.banners
  DROP CONSTRAINT IF EXISTS banners_position_range;

ALTER TABLE public.banners
  ADD CONSTRAINT banners_position_range CHECK (position BETWEEN 1 AND 10);
