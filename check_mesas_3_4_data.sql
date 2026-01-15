-- Script simplificado para verificar datos de las mesas 3 y 4

-- 1. Información básica de las órdenes archivadas
SELECT 
    'INFO ÓRDENES' as tipo,
    oa.id::text as order_id,
    t.table_number,
    oa.guest_count,
    oa.total_amount,
    oa.status,
    oa.created_at
FROM orders_archive oa
INNER JOIN tables t ON oa.table_id = t.id
WHERE oa.id IN (
    'c537e51a-6e61-4d52-82dd-64b42903f032',  -- Mesa 3
    'c787ed4d-7fa8-4c71-be8d-1d554b99c557'   -- Mesa 4
)
ORDER BY t.table_number;

-- 2. Verificar si hay payments en tabla activa
SELECT 
    'PAYMENTS ACTIVOS' as tipo,
    p.*
FROM payments p
WHERE p.order_id IN (
    'c537e51a-6e61-4d52-82dd-64b42903f032',
    'c787ed4d-7fa8-4c71-be8d-1d554b99c557'
)
ORDER BY p.order_id, p.created_at;

-- 3. Verificar si hay payments archivados
SELECT 
    'PAYMENTS ARCHIVADOS' as tipo,
    pa.*
FROM payments_archive pa
WHERE pa.order_id IN (
    'c537e51a-6e61-4d52-82dd-64b42903f032',
    'c787ed4d-7fa8-4c71-be8d-1d554b99c557'
)
ORDER BY pa.order_id, pa.created_at;

-- 4. Resumen: ¿Hay alguna información que pueda ayudar?
SELECT 
    'RESUMEN' as tipo,
    'Mesa 3' as mesa,
    (SELECT COUNT(*) FROM payments WHERE order_id = 'c537e51a-6e61-4d52-82dd-64b42903f032') as payments_activos,
    (SELECT COUNT(*) FROM payments_archive WHERE order_id = 'c537e51a-6e61-4d52-82dd-64b42903f032') as payments_archivados,
    (SELECT guest_count FROM orders_archive WHERE id = 'c537e51a-6e61-4d52-82dd-64b42903f032') as guest_count_orden,
    (SELECT total_amount FROM orders_archive WHERE id = 'c537e51a-6e61-4d52-82dd-64b42903f032') as total_amount_orden

UNION ALL

SELECT 
    'RESUMEN' as tipo,
    'Mesa 4' as mesa,
    (SELECT COUNT(*) FROM payments WHERE order_id = 'c787ed4d-7fa8-4c71-be8d-1d554b99c557') as payments_activos,
    (SELECT COUNT(*) FROM payments_archive WHERE order_id = 'c787ed4d-7fa8-4c71-be8d-1d554b99c557') as payments_archivados,
    (SELECT guest_count FROM orders_archive WHERE id = 'c787ed4d-7fa8-4c71-be8d-1d554b99c557') as guest_count_orden,
    (SELECT total_amount FROM orders_archive WHERE id = 'c787ed4d-7fa8-4c71-be8d-1d554b99c557') as total_amount_orden;
