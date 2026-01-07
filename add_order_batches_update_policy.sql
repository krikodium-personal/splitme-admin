-- Script para agregar políticas RLS que permitan actualizar order_batches
-- Ejecuta este SQL en el SQL Editor de Supabase

-- Paso 1: Verificar si RLS está habilitado en order_batches
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'order_batches';

-- Paso 2: Habilitar RLS si no está habilitado
ALTER TABLE order_batches ENABLE ROW LEVEL SECURITY;

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
WHERE tablename = 'order_batches';

-- Paso 4: Eliminar política existente si existe (para evitar duplicados)
DROP POLICY IF EXISTS "Allow authenticated users to update order_batches" ON order_batches;

-- Paso 5: Crear política para permitir actualizar order_batches a usuarios autenticados
-- Esta política permite que cualquier usuario autenticado pueda actualizar order_batches
-- donde el restaurante de la orden coincida con el restaurante del usuario
CREATE POLICY "Allow authenticated users to update order_batches"
ON order_batches
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_batches.order_id
    AND o.restaurant_id = (current_setting('app.current_restaurant_id')::uuid)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_batches.order_id
    AND o.restaurant_id = (current_setting('app.current_restaurant_id')::uuid)
  )
);

-- Alternativa más permisiva (si la anterior no funciona):
-- Descomenta esto si necesitas una política más abierta:

-- DROP POLICY IF EXISTS "Allow authenticated users to update order_batches" ON order_batches;
-- CREATE POLICY "Allow authenticated users to update order_batches"
-- ON order_batches
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
WHERE tablename = 'order_batches'
    AND policyname LIKE '%update%';

