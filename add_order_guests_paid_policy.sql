-- Script para agregar políticas RLS que permitan actualizar el campo 'paid' en order_guests
-- Ejecuta este SQL en el SQL Editor de Supabase

-- Paso 1: Verificar si RLS está habilitado en order_guests
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'order_guests';

-- Paso 2: Habilitar RLS si no está habilitado
ALTER TABLE order_guests ENABLE ROW LEVEL SECURITY;

-- Paso 3: Eliminar política existente si existe (para evitar duplicados)
DROP POLICY IF EXISTS "Allow authenticated users to update paid field" ON order_guests;

-- Paso 4: Crear política para permitir actualizar el campo 'paid' a usuarios autenticados
-- Esta política permite que cualquier usuario autenticado pueda actualizar el campo 'paid'
CREATE POLICY "Allow authenticated users to update paid field"
ON order_guests
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Alternativa más restrictiva: Solo permitir actualizar si el usuario es admin del restaurante
-- Descomenta esto si quieres una política más restrictiva:

-- CREATE POLICY "Allow restaurant admins to update paid field"
-- ON order_guests
-- FOR UPDATE
-- TO authenticated
-- USING (
--   EXISTS (
--     SELECT 1 FROM profiles p
--     JOIN orders o ON o.id = order_guests.order_id
--     WHERE p.id = auth.uid()
--       AND (p.role = 'super_admin' OR (p.role = 'restaurant_admin' AND p.restaurant_id = o.restaurant_id))
--   )
-- )
-- WITH CHECK (
--   EXISTS (
--     SELECT 1 FROM profiles p
--     JOIN orders o ON o.id = order_guests.order_id
--     WHERE p.id = auth.uid()
--       AND (p.role = 'super_admin' OR (p.role = 'restaurant_admin' AND p.restaurant_id = o.restaurant_id))
--   )
-- );

-- Paso 5: Verificar que la política se creó correctamente
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
WHERE tablename = 'order_guests'
    AND policyname LIKE '%paid%';

-- Paso 6: (Opcional) Si prefieres usar la función RPC en lugar de políticas RLS,
-- puedes omitir las políticas anteriores y usar solo la función mark_guest_as_paid
-- que ya tiene SECURITY DEFINER y bypassa RLS

