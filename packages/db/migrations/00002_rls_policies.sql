-- 00002_rls_policies.sql

-- Enable RLS on all tables
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_shop_tags ENABLE ROW LEVEL SECURITY;

-- Helper function to check roles
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'superadmin' AND is_suspended = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_admin_shop_id()
RETURNS uuid AS $$
  SELECT shop_id FROM public.profiles
  WHERE user_id = auth.uid() AND role = 'admin' AND is_suspended = false;
$$ LANGUAGE sql SECURITY DEFINER;

-- ==========================================
-- PROFILES
-- ==========================================
-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Admins can read profiles of users connected to their shop
CREATE POLICY "Admins can view shop profiles" ON public.profiles
    FOR SELECT USING (shop_id = public.get_admin_shop_id());

-- Superadmin can read all profiles
CREATE POLICY "Superadmins can view all profiles" ON public.profiles
    FOR SELECT USING (public.is_superadmin());

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Superadmin can update all profiles
CREATE POLICY "Superadmins can update all profiles" ON public.profiles
    FOR UPDATE USING (public.is_superadmin());

-- ==========================================
-- SHOPS
-- ==========================================
CREATE POLICY "Shops are publicly viewable" ON public.shops
    FOR SELECT USING (is_active = true OR public.is_superadmin() OR id = public.get_admin_shop_id());

CREATE POLICY "Superadmins can manage shops" ON public.shops
    FOR ALL USING (public.is_superadmin());

-- Admins can update their own shop details
CREATE POLICY "Admins can update own shop" ON public.shops
    FOR UPDATE USING (id = public.get_admin_shop_id());

-- ==========================================
-- CATEGORIES
-- ==========================================
CREATE POLICY "Categories are publicly viewable" ON public.categories
    FOR SELECT USING (true);

CREATE POLICY "Superadmins can manage categories" ON public.categories
    FOR ALL USING (public.is_superadmin());

-- ==========================================
-- BRANDS
-- ==========================================
CREATE POLICY "Brands are publicly viewable" ON public.brands
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage their shop brands" ON public.brands
    FOR ALL USING (shop_id = public.get_admin_shop_id() OR public.is_superadmin());

-- ==========================================
-- PRODUCTS & VARIANTS
-- ==========================================
CREATE POLICY "Visible products are publicly viewable" ON public.products
    FOR SELECT USING (is_visible = true AND deleted_at IS NULL);

CREATE POLICY "Admins can view all their shop products" ON public.products
    FOR SELECT USING (shop_id = public.get_admin_shop_id());

CREATE POLICY "Superadmins can view all products" ON public.products
    FOR SELECT USING (public.is_superadmin());

CREATE POLICY "Admins can manage their shop products" ON public.products
    FOR ALL USING (shop_id = public.get_admin_shop_id() OR public.is_superadmin());

-- Same for variants
CREATE POLICY "Visible variants are publicly viewable" ON public.product_variants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.products
            WHERE products.id = product_variants.product_id
            AND products.is_visible = true
            AND products.deleted_at IS NULL
        )
    );

CREATE POLICY "Admins can manage their shop variants" ON public.product_variants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.products
            WHERE products.id = product_variants.product_id
            AND (products.shop_id = public.get_admin_shop_id() OR public.is_superadmin())
        )
    );

-- ==========================================
-- ORDERS & ITEMS
-- ==========================================
CREATE POLICY "Users can view own orders" ON public.orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view shop orders" ON public.orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.order_items
            WHERE order_items.order_id = orders.id
            AND order_items.shop_id = public.get_admin_shop_id()
        )
    );

CREATE POLICY "Superadmins can view all orders" ON public.orders
    FOR SELECT USING (public.is_superadmin());

CREATE POLICY "Users can create own orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Order Items
CREATE POLICY "Users can view own order items" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
            AND orders.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage shop order items" ON public.order_items
    FOR ALL USING (shop_id = public.get_admin_shop_id() OR public.is_superadmin());

CREATE POLICY "Users can create order items" ON public.order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
            AND orders.user_id = auth.uid()
        )
    );

-- ==========================================
-- CART & WISHLIST
-- ==========================================
CREATE POLICY "Users can manage own cart" ON public.cart_items
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own wishlist" ON public.wishlists
    FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- REVIEWS
-- ==========================================
CREATE POLICY "Approved reviews are publicly viewable" ON public.reviews
    FOR SELECT USING (is_approved = true);

CREATE POLICY "Users can view own unapproved reviews" ON public.reviews
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view and manage shop reviews" ON public.reviews
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.products
            WHERE products.id = reviews.product_id
            AND (products.shop_id = public.get_admin_shop_id() OR public.is_superadmin())
        )
    );

CREATE POLICY "Users can create reviews" ON public.reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- ADDRESSES
-- ==========================================
CREATE POLICY "Users can manage own addresses" ON public.addresses
    FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- HOMEPAGE SECTIONS
-- ==========================================
CREATE POLICY "Homepage sections are publicly viewable" ON public.homepage_sections
    FOR SELECT USING (true);

CREATE POLICY "Admins and Superadmins can manage homepage" ON public.homepage_sections
    FOR ALL USING (
        public.is_superadmin() OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin') AND is_suspended = false
        )
    );

-- ==========================================
-- PAYMENTS
-- ==========================================
CREATE POLICY "Users can view own payments" ON public.payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = payments.order_id
            AND orders.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view shop payments" ON public.payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.order_items
            JOIN public.orders ON orders.id = order_items.order_id
            WHERE orders.id = payments.order_id
            AND order_items.shop_id = public.get_admin_shop_id()
        )
    );

CREATE POLICY "Superadmins can view all payments" ON public.payments
    FOR SELECT USING (public.is_superadmin());

-- ==========================================
-- TAGS
-- ==========================================
CREATE POLICY "Tags are publicly viewable" ON public.shop_tags
    FOR SELECT USING (true);

CREATE POLICY "Superadmins can manage tags" ON public.shop_tags
    FOR ALL USING (public.is_superadmin());

CREATE POLICY "Product tags are publicly viewable" ON public.product_shop_tags
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage their product tags" ON public.product_shop_tags
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.products
            WHERE products.id = product_shop_tags.product_id
            AND (products.shop_id = public.get_admin_shop_id() OR public.is_superadmin())
        )
    );
