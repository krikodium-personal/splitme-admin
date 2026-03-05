-- ============================================
-- Migración: Sistema de variantes de productos
-- ============================================
-- Soporta:
-- 1. Pizzas: tamaños (grande, chica, porción) con precio distinto por tamaño
-- 2. Pastas: salsas incluidas vs salsas especiales con recargo
--
-- Ejecutar en Supabase SQL Editor

-- ============================================
-- 1. Tabla variant_groups
-- ============================================
-- Grupos de variantes por producto (ej: "Tamaño", "Salsa")
CREATE TABLE IF NOT EXISTS variant_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_variant_groups_menu_item_id ON variant_groups(menu_item_id);

COMMENT ON TABLE variant_groups IS 'Grupos de variantes por producto (ej: Tamaño, Salsa)';
COMMENT ON COLUMN variant_groups.required IS 'Si true, el comensal debe elegir una opción antes de agregar al carrito';
COMMENT ON COLUMN variant_groups.sort_order IS 'Orden de visualización del grupo';

-- ============================================
-- 2. Tabla variant_options
-- ============================================
-- Opciones dentro de cada grupo (ej: "Grande $12000", "Salsa Alfredo +$2000")
CREATE TABLE IF NOT EXISTS variant_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_group_id UUID NOT NULL REFERENCES variant_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_type TEXT NOT NULL CHECK (price_type IN ('replace', 'add')),
  price_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_variant_options_group_id ON variant_options(variant_group_id);

COMMENT ON TABLE variant_options IS 'Opciones de cada grupo de variantes';
COMMENT ON COLUMN variant_options.price_type IS 'replace: precio total del producto (pizzas por tamaño). add: recargo sobre precio base (pastas con salsa especial)';
COMMENT ON COLUMN variant_options.price_amount IS 'Para replace: precio total. Para add: recargo a sumar al precio base';

-- ============================================
-- 3. Columna variant_selections en order_items
-- ============================================
-- Guarda las opciones elegidas: { "variant_group_id": "variant_option_id", ... }
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_selections JSONB DEFAULT NULL;

COMMENT ON COLUMN order_items.variant_selections IS 'Opciones elegidas: { "variant_group_id": "variant_option_id" }. unit_price ya es el precio final calculado.';

-- ============================================
-- 4. Sincronizar order_items_archive
-- ============================================
ALTER TABLE order_items_archive ADD COLUMN IF NOT EXISTS variant_selections JSONB DEFAULT NULL;

-- ============================================
-- 5. RLS (opcional - si menu_items usa RLS)
-- ============================================
-- variant_groups y variant_options se acceden vía menu_items.
-- Si el admin usa service_role o bypass RLS, no hace falta.
-- Si usas RLS por restaurant_id, descomenta y ajusta:

-- ALTER TABLE variant_groups ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE variant_options ENABLE ROW LEVEL SECURITY;

-- DROP POLICY IF EXISTS "variant_groups_by_restaurant" ON variant_groups;
-- CREATE POLICY "variant_groups_by_restaurant" ON variant_groups
--   FOR ALL USING (
--     menu_item_id IN (
--       SELECT id FROM menu_items
--       WHERE restaurant_id = (current_setting('app.current_restaurant_id')::uuid)
--     )
--   );

-- DROP POLICY IF EXISTS "variant_options_by_restaurant" ON variant_options;
-- CREATE POLICY "variant_options_by_restaurant" ON variant_options
--   FOR ALL USING (
--     variant_group_id IN (
--       SELECT vg.id FROM variant_groups vg
--       JOIN menu_items mi ON mi.id = vg.menu_item_id
--       WHERE mi.restaurant_id = (current_setting('app.current_restaurant_id')::uuid)
--     )
--   );

-- ============================================
-- Ejemplos de datos (comentados)
-- ============================================
/*
-- PIZZA: grupo "Tamaño" con precio replace
INSERT INTO variant_groups (menu_item_id, name, required, sort_order)
SELECT id, 'Tamaño', true, 0 FROM menu_items WHERE name ILIKE '%pizza%' LIMIT 1;

INSERT INTO variant_options (variant_group_id, name, price_type, price_amount, sort_order)
SELECT id, 'Grande', 'replace', 12000, 0 FROM variant_groups WHERE name = 'Tamaño' ORDER BY created_at DESC LIMIT 1;
INSERT INTO variant_options (variant_group_id, name, price_type, price_amount, sort_order)
SELECT id, 'Chica', 'replace', 8000, 1 FROM variant_groups WHERE name = 'Tamaño' ORDER BY created_at DESC LIMIT 1;
INSERT INTO variant_options (variant_group_id, name, price_type, price_amount, sort_order)
SELECT id, 'Porción', 'replace', 2500, 2 FROM variant_groups WHERE name = 'Tamaño' ORDER BY created_at DESC LIMIT 1;

-- PASTA: grupo "Salsa" con precio add (0 = incluida, >0 = recargo)
INSERT INTO variant_groups (menu_item_id, name, required, sort_order)
SELECT id, 'Salsa', true, 0 FROM menu_items WHERE name ILIKE '%pasta%' OR name ILIKE '%ñoquis%' LIMIT 1;

INSERT INTO variant_options (variant_group_id, name, price_type, price_amount, sort_order)
SELECT id, 'Salsa fileto', 'add', 0, 0 FROM variant_groups WHERE name = 'Salsa' ORDER BY created_at DESC LIMIT 1;
INSERT INTO variant_options (variant_group_id, name, price_type, price_amount, sort_order)
SELECT id, 'Salsa Alfredo', 'add', 2000, 1 FROM variant_groups WHERE name = 'Salsa' ORDER BY created_at DESC LIMIT 1;
INSERT INTO variant_options (variant_group_id, name, price_type, price_amount, sort_order)
SELECT id, 'Salsa pesto', 'add', 1500, 2 FROM variant_groups WHERE name = 'Salsa' ORDER BY created_at DESC LIMIT 1;
*/
