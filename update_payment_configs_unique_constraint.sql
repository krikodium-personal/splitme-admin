-- Script para cambiar la restricción única en payment_configs
-- De: UNIQUE (restaurant_id)
-- A: UNIQUE (restaurant_id, provider)
--
-- Esto permite que cada restaurante tenga múltiples métodos de pago:
-- - Un registro con provider='mercadopago'
-- - Un registro con provider='transferencia'
--
-- Ejecuta este script en el SQL Editor de Supabase

-- Paso 1: Verificar qué restricciones únicas existen actualmente
-- (Esto es solo informativo, puedes ejecutarlo para ver el estado actual)
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'payment_configs'::regclass
    AND contype = 'u';

-- Paso 2: Eliminar la restricción única existente en restaurant_id
-- Nota: El nombre de la restricción puede variar. Los nombres comunes son:
-- - payment_configs_restaurant_id_key
-- - payment_configs_restaurant_id_unique
-- - payment_configs_pkey (si es la clave primaria, no la elimines)

-- Primero, intentamos encontrar y eliminar la restricción única en restaurant_id
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Buscar el nombre de la restricción única en restaurant_id
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'payment_configs'::regclass
        AND contype = 'u'
        AND pg_get_constraintdef(oid) LIKE '%restaurant_id%'
        AND pg_get_constraintdef(oid) NOT LIKE '%provider%'
    LIMIT 1;
    
    -- Si encontramos la restricción, la eliminamos
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE payment_configs DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Restricción única eliminada: %', constraint_name;
    ELSE
        RAISE NOTICE 'No se encontró una restricción única en restaurant_id. Puede que ya esté eliminada o tenga otro nombre.';
    END IF;
END $$;

-- Paso 3: Crear la nueva restricción única compuesta (restaurant_id, provider)
-- Esto permite múltiples registros por restaurante, pero solo uno por cada combinación de restaurant_id + provider
ALTER TABLE payment_configs
ADD CONSTRAINT payment_configs_restaurant_id_provider_unique 
UNIQUE (restaurant_id, provider);

-- Paso 4: Verificar que la nueva restricción se creó correctamente
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'payment_configs'::regclass
    AND contype = 'u'
    AND conname = 'payment_configs_restaurant_id_provider_unique';

-- Paso 5: Verificar que no hay datos duplicados que violen la nueva restricción
-- Si hay duplicados, este query los mostrará y deberás eliminarlos manualmente antes de crear la restricción
SELECT 
    restaurant_id,
    provider,
    COUNT(*) as count
FROM payment_configs
GROUP BY restaurant_id, provider
HAVING COUNT(*) > 1;

-- Si el query anterior devuelve filas, significa que hay duplicados.
-- En ese caso, necesitarás eliminar los duplicados antes de ejecutar el Paso 3.
-- Ejemplo de cómo eliminar duplicados (manteniendo solo el más reciente):
-- DELETE FROM payment_configs
-- WHERE id NOT IN (
--     SELECT DISTINCT ON (restaurant_id, provider) id
--     FROM payment_configs
--     ORDER BY restaurant_id, provider, created_at DESC
-- );

