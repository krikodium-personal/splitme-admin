-- Script de diagnóstico para verificar el campo 'paid' en order_guests
-- Ejecuta este script en el SQL Editor de Supabase para diagnosticar problemas

-- Paso 1: Verificar que la columna 'paid' existe
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'order_guests'
    AND column_name = 'paid';

-- Paso 2: Ver algunos registros de order_guests con el campo paid
SELECT 
    id,
    order_id,
    name,
    individual_amount,
    payment_method,
    paid,
    created_at
FROM order_guests
ORDER BY created_at DESC
LIMIT 10;

-- Paso 3: Verificar si hay políticas RLS que bloqueen UPDATE
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

-- Paso 4: Verificar si RLS está habilitado
SELECT 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename = 'order_guests';

-- Paso 5: Intentar un UPDATE de prueba (solo lectura, no ejecuta)
-- SELECT 'Para probar UPDATE, ejecuta: UPDATE order_guests SET paid = true WHERE id = ''TU_GUEST_ID_AQUI'';' AS instruccion;

-- Paso 6: Verificar si existe la función RPC
SELECT 
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name = 'mark_guest_as_paid';

