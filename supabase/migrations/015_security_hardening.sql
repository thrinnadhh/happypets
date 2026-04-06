BEGIN;

CREATE TABLE IF NOT EXISTS public.security_rate_limits (
  scope_key TEXT NOT NULL,
  action TEXT NOT NULL,
  request_count INT NOT NULL DEFAULT 0,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (scope_key, action)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'security_rate_limits_request_count_nonnegative'
  ) THEN
    ALTER TABLE public.security_rate_limits
      ADD CONSTRAINT security_rate_limits_request_count_nonnegative
      CHECK (request_count >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_security_rate_limits_updated_at
ON public.security_rate_limits (updated_at DESC);

ALTER TABLE public.security_rate_limits ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_timestamp_security_rate_limits ON public.security_rate_limits;
CREATE TRIGGER set_timestamp_security_rate_limits
BEFORE UPDATE ON public.security_rate_limits
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

COMMIT;
