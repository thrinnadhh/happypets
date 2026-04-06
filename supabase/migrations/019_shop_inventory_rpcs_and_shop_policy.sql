BEGIN;

DROP POLICY IF EXISTS "shops_select_admin_or_superadmin" ON public.shops;
CREATE POLICY "shops_select_admin_or_superadmin" ON public.shops
FOR SELECT
USING (
  admin_id = auth.uid()
  OR public.is_superadmin()
  OR (public.is_approved_admin() AND status = 'active')
);

CREATE OR REPLACE FUNCTION public.decrement_product_shop_stock(
  p_product_id UUID,
  p_shop_id UUID,
  p_quantity INT
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.product_shop_inventory
  SET stock_quantity = stock_quantity - p_quantity,
      updated_at = now()
  WHERE product_id = p_product_id
    AND shop_id = p_shop_id
    AND is_active = true
    AND stock_quantity >= p_quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock for product % in shop %', p_product_id, p_shop_id;
  END IF;

  UPDATE public.products
  SET stock_quantity = COALESCE((
        SELECT SUM(stock_quantity)
        FROM public.product_shop_inventory
        WHERE product_id = p_product_id
          AND is_active = true
      ), 0),
      updated_at = now()
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_product_shop_stock(
  p_product_id UUID,
  p_shop_id UUID,
  p_quantity INT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.product_shop_inventory (product_id, shop_id, stock_quantity, is_active)
  VALUES (p_product_id, p_shop_id, p_quantity, true)
  ON CONFLICT (product_id, shop_id)
  DO UPDATE SET
    stock_quantity = public.product_shop_inventory.stock_quantity + p_quantity,
    is_active = true,
    updated_at = now();

  UPDATE public.products
  SET stock_quantity = COALESCE((
        SELECT SUM(stock_quantity)
        FROM public.product_shop_inventory
        WHERE product_id = p_product_id
          AND is_active = true
      ), 0),
      updated_at = now()
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
