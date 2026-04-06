BEGIN;

ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'coupons'
      AND column_name = 'starts_at'
  ) THEN
    EXECUTE '
      UPDATE public.coupons
      SET valid_from = COALESCE(valid_from, starts_at)
      WHERE starts_at IS NOT NULL
    ';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'coupons'
      AND column_name = 'ends_at'
  ) THEN
    EXECUTE '
      UPDATE public.coupons
      SET valid_until = COALESCE(valid_until, ends_at)
      WHERE ends_at IS NOT NULL
    ';
  END IF;
END $$;

DROP POLICY IF EXISTS "coupons_admin_insert" ON public.coupons;
CREATE POLICY "coupons_admin_insert"
ON public.coupons
FOR INSERT
WITH CHECK (
  (public.is_approved_admin() AND shop_id = public.get_admin_shop_id())
  OR public.is_superadmin()
);

DROP POLICY IF EXISTS "coupons_admin_update" ON public.coupons;
CREATE POLICY "coupons_admin_update"
ON public.coupons
FOR UPDATE
USING (
  (public.is_approved_admin() AND shop_id = public.get_admin_shop_id())
  OR public.is_superadmin()
)
WITH CHECK (
  (public.is_approved_admin() AND shop_id = public.get_admin_shop_id())
  OR public.is_superadmin()
);

DROP POLICY IF EXISTS "coupons_admin_delete" ON public.coupons;
CREATE POLICY "coupons_admin_delete"
ON public.coupons
FOR DELETE
USING (
  (public.is_approved_admin() AND shop_id = public.get_admin_shop_id())
  OR public.is_superadmin()
);

COMMIT;
