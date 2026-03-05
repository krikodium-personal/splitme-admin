-- ============================================
-- Subtítulos para agrupar productos en la lista
-- ============================================
-- Permite crear secciones (ej: "Carnes", "Acompañamientos") dentro de una categoría/subcategoría.
--
-- Ejecutar en Supabase SQL Editor

-- Tabla de subtítulos/secciones
CREATE TABLE IF NOT EXISTS menu_section_headers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  subcategory_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_section_headers_category ON menu_section_headers(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_section_headers_subcategory ON menu_section_headers(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_menu_section_headers_restaurant ON menu_section_headers(restaurant_id);

COMMENT ON TABLE menu_section_headers IS 'Subtítulos para agrupar productos en la lista (ej: Carnes, Acompañamientos)';

-- Columna section_id en menu_items
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES menu_section_headers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_menu_items_section_id ON menu_items(section_id);

COMMENT ON COLUMN menu_items.section_id IS 'Sección/subtítulo al que pertenece el producto. NULL = sin sección.';
