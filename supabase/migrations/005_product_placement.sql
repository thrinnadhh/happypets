ALTER TABLE products
ADD COLUMN IF NOT EXISTS display_section TEXT NOT NULL DEFAULT 'Home'
CHECK (display_section IN ('Home', 'Dog', 'Cat', 'Fish', 'Hamster', 'Rabbit', 'Birds'));

ALTER TABLE products
ADD COLUMN IF NOT EXISTS position INT NOT NULL DEFAULT 999;

CREATE INDEX IF NOT EXISTS idx_products_display_section_position
ON products (display_section, position);
