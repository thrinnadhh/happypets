ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS display_section TEXT NOT NULL DEFAULT 'Home'
CHECK (display_section IN ('Home', 'Dog', 'Cat', 'Fish', 'Hamster', 'Rabbit', 'Birds'));

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 999;

CREATE INDEX IF NOT EXISTS idx_products_display_section_position
ON public.products (display_section, position);
