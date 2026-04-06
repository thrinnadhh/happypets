-- 00005_seed.sql

-- Insert default shop tag
INSERT INTO public.shop_tags (id, name, slug)
VALUES (
    '11111111-1111-1111-1111-111111111111', 
    'Premium', 
    'premium'
) ON CONFLICT (slug) DO NOTHING;

-- Insert top level categories
INSERT INTO public.categories (id, name, slug, image_url, sort_order)
VALUES 
    ('22222222-2222-2222-2222-222222222222', 'Dog Food', 'dog-food', 'https://res.cloudinary.com/test/image/upload/v1/dog.jpg', 1),
    ('33333333-3333-3333-3333-333333333333', 'Cat Food', 'cat-food', 'https://res.cloudinary.com/test/image/upload/v1/cat.jpg', 2)
ON CONFLICT (slug) DO NOTHING;
