-- Script para agregar políticas RLS que permitan actualizar waiters
-- Ejecuta este SQL en el SQL Editor de Supabase

-- Paso 1: Verificar si RLS está habilitado en waiters
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'waiters';

-- Paso 2: Habilitar RLS si no está habilitado
ALTER TABLE waiters ENABLE ROW LEVEL SECURITY;

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
WHERE tablename = 'waiters';

-- Paso 4: Eliminar política existente si existe (para evitar duplicados)
DROP POLICY IF EXISTS "Allow authenticated users to update waiters" ON waiters;

-- Paso 5: Crear política para permitir actualizar waiters a usuarios autenticados
-- Esta política permite que cualquier usuario autenticado pueda actualizar waiters
-- donde el restaurante del waiter coincida con el restaurante del usuario
CREATE POLICY "Allow authenticated users to update waiters"
ON waiters
FOR UPDATE
TO authenticated
USING (
  restaurant_id = (current_setting('app.current_restaurant_id')::uuid)
)
WITH CHECK (
  restaurant_id = (current_setting('app.current_restaurant_id')::uuid)
);

-- Alternativa más permisiva (si la anterior no funciona por problemas con current_setting):
-- Descomenta esto si necesitas una política más abierta:

-- DROP POLICY IF EXISTS "Allow authenticated users to update waiters" ON waiters;
-- CREATE POLICY "Allow authenticated users to update waiters"
-- ON waiters
-- FOR UPDATE
-- TO authenticated
-- USING (true)
-- WITH CHECK (true);

-- Paso 6: Verificar que la política se creó correctamente
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'waiters'
    AND policyname LIKE '%update%';

-- Paso 7: (Opcional) Verificar también políticas de INSERT y SELECT si es necesario
SELECT 
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'waiters'
ORDER BY cmd, policyname;

