-- ============================================
-- Plantillas de variantes reutilizables
-- ============================================
-- Una plantilla agrupa varios grupos (ej: Tamaño + Recargos) para aplicar a otros platos.
-- Cada plato recibe su propia copia que puede editarse independientemente.
--
-- Ejecutar en Supabase SQL Editor

-- ============================================
-- 1. Tabla variant_templates (plantilla = conjunto de grupos)
-- ============================================
CREATE TABLE IF NOT EXISTS variant_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_variant_templates_restaurant ON variant_templates(restaurant_id);

COMMENT ON TABLE variant_templates IS 'Plantilla reutilizable: conjunto de grupos (ej: Pizza clásica = Tamaño + Recargos)';

-- ============================================
-- 2. Tabla variant_group_templates
-- ============================================
CREATE TABLE IF NOT EXISTS variant_group_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_template_id UUID NOT NULL REFERENCES variant_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_variant_group_templates_template ON variant_group_templates(variant_template_id);

COMMENT ON TABLE variant_group_templates IS 'Grupos dentro de una plantilla (ej: Tamaño, Recargos)';

-- ============================================
-- 3. Tabla variant_option_templates
-- ============================================
CREATE TABLE IF NOT EXISTS variant_option_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_group_template_id UUID NOT NULL REFERENCES variant_group_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_type TEXT NOT NULL CHECK (price_type IN ('replace', 'add')),
  price_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_variant_option_templates_group ON variant_option_templates(variant_group_template_id);

COMMENT ON TABLE variant_option_templates IS 'Opciones de cada grupo dentro de la plantilla';
