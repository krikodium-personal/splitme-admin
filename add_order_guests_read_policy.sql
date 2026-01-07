-- Script para agregar políticas RLS que permitan leer order_guests
-- Ejecuta este script en el SQL Editor de Supabase

-- Paso 1: Verificar si RLS está habilitado en order_guests
SELECT 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename = 'order_guests';

-- Paso 2: Habilitar RLS si no está habilitado
ALTER TABLE order_guests ENABLE ROW LEVEL SECURITY;

-- Paso 3: Verificar políticas existentes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'order_guests';

-- Paso 4: Eliminar política existente si existe (para evitar duplicados)
DROP POLICY IF EXISTS "Allow authenticated users to read order_guests" ON order_guests;

-- Paso 5: Crear política para permitir lectura a usuarios autenticados
-- Esta política permite que cualquier usuario autenticado pueda leer order_guests
CREATE POLICY "Allow authenticated users to read order_guests"
ON order_guests
FOR SELECT
TO authenticated
USING (true);

-- Paso 6: Verificar que la política se creó correctamente
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'order_guests'
    AND policyname = 'Allow authenticated users to read order_guests';

-- Paso 7: Probar la lectura (esto debería funcionar después de crear la política)
-- SELECT COUNT(*) FROM order_guests;

