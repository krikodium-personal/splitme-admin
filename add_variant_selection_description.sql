-- ============================================
-- Agregar selection a variant_groups y description a variant_options
-- ============================================
-- Ejecutar en Supabase SQL Editor

-- variant_groups: tipo de selección (individual = una opción, multiple = varias)
ALTER TABLE variant_groups ADD COLUMN IF NOT EXISTS selection TEXT NOT NULL DEFAULT 'individual' CHECK (selection IN ('individual', 'multiple'));

COMMENT ON COLUMN variant_groups.selection IS 'individual: elegir una opción. multiple: elegir varias opciones.';

-- variant_options: descripción opcional
ALTER TABLE variant_options ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;

COMMENT ON COLUMN variant_options.description IS 'Texto descriptivo de la opción.';

-- Sincronizar tablas de plantillas
ALTER TABLE variant_group_templates ADD COLUMN IF NOT EXISTS selection TEXT NOT NULL DEFAULT 'individual' CHECK (selection IN ('individual', 'multiple'));
ALTER TABLE variant_option_templates ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;

-- ============================================
-- max_selection: límite de selecciones cuando selection='multiple'
-- ============================================
-- NULL o vacío = sin límite
ALTER TABLE variant_groups ADD COLUMN IF NOT EXISTS max_selection INTEGER DEFAULT NULL;
ALTER TABLE variant_group_templates ADD COLUMN IF NOT EXISTS max_selection INTEGER DEFAULT NULL;

COMMENT ON COLUMN variant_groups.max_selection IS 'Cuando selection=multiple: máximo de opciones elegibles. NULL = sin límite.';
