-- Script para agregar columna 'is_new' a la tabla menu_items
-- Esta columna permite marcar productos como "Nuevo" en los parámetros de publicación
--
-- Ejecuta este script en el SQL Editor de Supabase

-- Paso 1: Verificar la estructura actual de la tabla
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'menu_items'
ORDER BY ordinal_position;

-- Paso 2: Agregar la columna 'is_new' (booleano, por defecto false)
ALTER TABLE menu_items
ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT false NOT NULL;

-- Paso 3: Agregar un comentario a la columna para documentación
COMMENT ON COLUMN menu_items.is_new IS 'Indica si el producto debe mostrarse como "Nuevo" en los parámetros de publicación';

-- Paso 4: Verificar que la columna se agregó correctamente
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'menu_items'
    AND column_name = 'is_new';

-- Paso 5: (Opcional) Actualizar registros existentes si es necesario
-- Si quieres marcar productos creados recientemente como "nuevos":
-- UPDATE menu_items
-- SET is_new = true
-- WHERE created_at >= NOW() - INTERVAL '30 days';
