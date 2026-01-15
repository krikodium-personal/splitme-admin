-- Script para verificar si los order_guests están archivados para las órdenes de las mesas 3 y 4

-- Primero, identificar las órdenes de las mesas 3 y 4
SELECT 
    'ÓRDENES DE MESAS 3 Y 4' as tipo,
    oa.id::text as order_id,
    oa.table_id::text,
    t.table_number,
    oa.status,
    oa.archived_at
FROM orders_archive oa
INNER JOIN tables t ON oa.table_id = t.id
WHERE t.table_number IN ('3', '4')
ORDER BY oa.archived_at DESC;

-- Verificar order_guests archivados para esas órdenes
SELECT 
    'ORDER_GUESTS ARCHIVADOS' as tipo,
    og.order_id::text,
    og.id::text as guest_id,
    og.name,
    og.individual_amount,
    og.paid,
    og.payment_method,
    og.archived_at
FROM order_guests_archive og
WHERE og.order_id IN (
    SELECT oa.id
    FROM orders_archive oa
    INNER JOIN tables t ON oa.table_id = t.id
    WHERE t.table_number IN ('3', '4')
)
ORDER BY og.order_id, og.name;

-- Verificar order_guests en la tabla activa (no deberían estar)
SELECT 
    'ORDER_GUESTS EN TABLA ACTIVA (no deberían estar)' as tipo,
    og.order_id::text,
    og.id::text as guest_id,
    og.name,
    og.individual_amount,
    og.paid,
    og.payment_method
FROM order_guests og
WHERE og.order_id IN (
    SELECT oa.id
    FROM orders_archive oa
    INNER JOIN tables t ON oa.table_id = t.id
    WHERE t.table_number IN ('3', '4')
);

-- Comparar con la mesa 5 (que sí tiene los datos)
SELECT 
    'MESA 5 - ORDER_GUESTS ARCHIVADOS' as tipo,
    og.order_id::text,
    og.id::text as guest_id,
    og.name,
    og.individual_amount,
    og.paid,
    og.payment_method,
    og.archived_at
FROM order_guests_archive og
WHERE og.order_id IN (
    SELECT oa.id
    FROM orders_archive oa
    INNER JOIN tables t ON oa.table_id = t.id
    WHERE t.table_number = '5'
)
ORDER BY og.order_id, og.name;

-- Contar order_guests por orden
SELECT 
    'CONTEO DE ORDER_GUESTS POR ORDEN' as tipo,
    oa.id::text as order_id,
    t.table_number,
    COUNT(og.id) as num_guests_archivados
FROM orders_archive oa
INNER JOIN tables t ON oa.table_id = t.id
LEFT JOIN order_guests_archive og ON og.order_id = oa.id
WHERE t.table_number IN ('3', '4', '5')
GROUP BY oa.id, t.table_number
ORDER BY t.table_number;
