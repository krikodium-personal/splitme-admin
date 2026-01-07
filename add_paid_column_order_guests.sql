-- Script para agregar columna 'paid' a la tabla order_guests
-- Esta columna permite marcar manualmente cuando un pago en efectivo o transferencia ha sido recibido
--
-- Ejecuta este script en el SQL Editor de Supabase

-- Paso 1: Verificar la estructura actual de la tabla
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'order_guests'
ORDER BY ordinal_position;

-- Paso 2: Agregar la columna 'paid' (booleano, por defecto false)
ALTER TABLE order_guests
ADD COLUMN IF NOT EXISTS paid BOOLEAN DEFAULT false NOT NULL;

-- Paso 3: Agregar un comentario a la columna para documentación
COMMENT ON COLUMN order_guests.paid IS 'Indica si el pago en efectivo o transferencia ha sido marcado como recibido por el mesero/admin';

-- Paso 4: Verificar que la columna se agregó correctamente
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'order_guests'
    AND column_name = 'paid';

-- Paso 5: (Opcional) Actualizar registros existentes si es necesario
-- Si quieres que todos los pagos completados se marquen como pagados automáticamente:
-- UPDATE order_guests
-- SET paid = true
-- WHERE payment_method IN ('efectivo', 'transferencia')
--   AND EXISTS (
--     SELECT 1 FROM payments p 
--     WHERE p.guest_id = order_guests.id 
--       AND p.status = 'completed'
--   );

