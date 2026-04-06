-- supabase/migrations/012_cart_validation_trigger.sql

CREATE OR REPLACE FUNCTION public.validate_cart_item()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  product_row RECORD;
BEGIN
  SELECT
    stock_quantity,
    expiry_date,
    is_active
  INTO product_row
  FROM public.products
  WHERE id = NEW.product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found.';
  END IF;

  IF NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'Requested quantity must be at least 1.';
  END IF;

  IF COALESCE(product_row.is_active, true) = false OR product_row.stock_quantity <= 0 THEN
    RAISE EXCEPTION 'This product is out of stock.';
  END IF;

  IF product_row.expiry_date IS NOT NULL AND product_row.expiry_date <= CURRENT_DATE THEN
    RAISE EXCEPTION 'This product has expired and cannot be added to the cart.';
  END IF;

  IF NEW.quantity > product_row.stock_quantity THEN
    RAISE EXCEPTION 'Requested quantity exceeds available stock.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_cart_item_trigger ON public.cart_items;

CREATE TRIGGER validate_cart_item_trigger
BEFORE INSERT OR UPDATE ON public.cart_items
FOR EACH ROW
EXECUTE PROCEDURE public.validate_cart_item();
