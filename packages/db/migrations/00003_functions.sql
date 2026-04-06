-- 00003_functions.sql

-- ==========================================
-- 1. UPDATE TIMESTAMPS
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ==========================================
-- 2. CREATE PROFILE AFTER AUTHENTICATION
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, role, full_name, avatar_url)
  VALUES (
    NEW.id,
    'customer',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 3. INVENTORY CHECK AND DECREMENT
-- ==========================================
CREATE OR REPLACE FUNCTION public.decrement_stock(product_id UUID, variant_id UUID, quantity INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    current_stock INTEGER;
BEGIN
    IF variant_id IS NOT NULL THEN
        -- Check variant stock
        SELECT stock_quantity INTO current_stock FROM public.product_variants WHERE id = variant_id FOR UPDATE;
        IF current_stock >= quantity THEN
            UPDATE public.product_variants SET stock_quantity = stock_quantity - quantity WHERE id = variant_id;
            RETURN true;
        END IF;
    ELSE
        -- Check product stock
        SELECT stock_quantity INTO current_stock FROM public.products WHERE id = product_id FOR UPDATE;
        IF current_stock >= quantity THEN
            UPDATE public.products SET stock_quantity = stock_quantity - quantity WHERE id = product_id;
            RETURN true;
        END IF;
    END IF;
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 4. HANDLE ADMIN SUSPENSION
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_admin_suspension(target_admin_id UUID, suspension_reason TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    admin_shop_id UUID;
    is_admin BOOLEAN;
BEGIN
    -- Only superadmins can suspend
    IF NOT public.is_superadmin() THEN
        RAISE EXCEPTION 'Not authorized to suspend';
    END IF;

    -- Get admin's shop id
    SELECT shop_id INTO admin_shop_id FROM public.profiles WHERE user_id = target_admin_id AND role = 'admin';
    
    IF admin_shop_id IS NULL THEN
        RAISE EXCEPTION 'User is not an admin or has no shop';
    END IF;

    -- Suspend profile
    UPDATE public.profiles 
    SET is_suspended = true, 
        suspended_at = timezone('utc'::text, now()), 
        suspended_by = auth.uid() 
    WHERE user_id = target_admin_id;

    -- Hide all products of this admin's shop
    UPDATE public.products 
    SET is_visible = false 
    WHERE shop_id = admin_shop_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
