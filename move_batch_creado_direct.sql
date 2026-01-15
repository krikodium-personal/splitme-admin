-- Script directo para mover el batch CREADO
-- Ejecuta cada paso manualmente si es necesario

-- Paso 1: Verificar que existe
SELECT 
    'BATCH EN ARCHIVE' as paso,
    id::text,
    order_id::text,
    batch_number,
    status,
    created_at
FROM order_batches_archive
WHERE id = '40d8624b-0684-449a-86ef-41e20fb7fee3';

-- Paso 2: Insertar en order_batches (ejecutar esto primero)
INSERT INTO order_batches (
    id,
    order_id,
    batch_number,
    status,
    created_at,
    served_at
)
SELECT 
    id,
    order_id,
    batch_number,
    status,
    created_at,
    served_at
FROM order_batches_archive
WHERE id = '40d8624b-0684-449a-86ef-41e20fb7fee3'
ON CONFLICT (id) DO NOTHING;

-- Paso 3: Insertar items en order_items
INSERT INTO order_items (
    id,
    batch_id,
    menu_item_id,
    quantity,
    price,
    status,
    created_at
)
SELECT 
    id,
    batch_id,
    menu_item_id,
    quantity,
    price,
    status,
    created_at
FROM order_items_archive
WHERE batch_id = '40d8624b-0684-449a-86ef-41e20fb7fee3'
ON CONFLICT (id) DO NOTHING;

-- Paso 4: Verificar que se insertó correctamente
SELECT 
    'BATCH EN ORDER_BATCHES' as paso,
    COUNT(*) as cantidad
FROM order_batches
WHERE id = '40d8624b-0684-449a-86ef-41e20fb7fee3';

SELECT 
    'ITEMS EN ORDER_ITEMS' as paso,
    COUNT(*) as cantidad
FROM order_items
WHERE batch_id = '40d8624b-0684-449a-86ef-41e20fb7fee3';

-- Paso 5: Eliminar de archive (ejecutar esto DESPUÉS de verificar que se insertó)
-- DESCOMENTA ESTAS LÍNEAS DESPUÉS DE VERIFICAR QUE EL INSERT FUNCIONÓ:
/*
DELETE FROM order_items_archive
WHERE batch_id = '40d8624b-0684-449a-86ef-41e20fb7fee3';

DELETE FROM order_batches_archive
WHERE id = '40d8624b-0684-449a-86ef-41e20fb7fee3';
*/

-- Paso 6: Verificación final
SELECT 
    'VERIFICACIÓN FINAL - ORDER_BATCHES' as tipo,
    COUNT(*) as cantidad
FROM order_batches
WHERE id = '40d8624b-0684-449a-86ef-41e20fb7fee3';

SELECT 
    'VERIFICACIÓN FINAL - ORDER_BATCHES_ARCHIVE' as tipo,
    COUNT(*) as cantidad
FROM order_batches_archive
WHERE id = '40d8624b-0684-449a-86ef-41e20fb7fee3';
