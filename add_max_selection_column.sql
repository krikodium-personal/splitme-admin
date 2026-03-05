-- ============================================
-- Agregar columna max_selection a variant_groups
-- ============================================
-- Ejecutar en Supabase SQL Editor
-- Después de ejecutar: Dashboard → Settings → API → "Reload schema" (o esperar unos segundos)

ALTER TABLE variant_groups ADD COLUMN IF NOT EXISTS max_selection INTEGER DEFAULT NULL;
ALTER TABLE variant_group_templates ADD COLUMN IF NOT EXISTS max_selection INTEGER DEFAULT NULL;

COMMENT ON COLUMN variant_groups.max_selection IS 'Cuando selection=multiple: máximo de opciones elegibles. NULL = sin límite.';

-- Forzar recarga del schema cache de PostgREST (Supabase)
NOTIFY pgrst, 'reload schema';
