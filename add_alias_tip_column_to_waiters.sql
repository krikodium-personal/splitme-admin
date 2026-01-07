-- Script para agregar la columna alias_tip a la tabla waiters
-- Ejecuta este SQL en el SQL Editor de Supabase

-- Paso 1: Verificar la estructura actual de la tabla waiters
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'waiters'
ORDER BY ordinal_position;

-- Paso 2: Agregar la columna alias_tip
-- Esta columna es opcional (nullable) y de tipo VARCHAR para almacenar texto alfanumérico
ALTER TABLE public.waiters
ADD COLUMN IF NOT EXISTS alias_tip VARCHAR(255);

-- Paso 3: Agregar un comentario descriptivo a la columna
COMMENT ON COLUMN public.waiters.alias_tip IS 'Alias alfanumérico opcional para recibir propinas';

-- Paso 4: Verificar que la columna se agregó correctamente
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'waiters'
  AND column_name = 'alias_tip';

