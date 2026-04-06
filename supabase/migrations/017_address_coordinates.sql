BEGIN;

ALTER TABLE public.addresses
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'addresses_latitude_range'
  ) THEN
    ALTER TABLE public.addresses
      ADD CONSTRAINT addresses_latitude_range
      CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'addresses_longitude_range'
  ) THEN
    ALTER TABLE public.addresses
      ADD CONSTRAINT addresses_longitude_range
      CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_addresses_user_created_at
ON public.addresses (user_id, created_at DESC);

COMMIT;
