-- Script para verificar el estado final de las órdenes

-- Verificar en orders
SELECT 
    'EN ORDERS' as tabla,
    id::text as order_id,
    status,
    restaurant_id::text,
    created_at
FROM orders
WHERE id IN (
    'c537e51a-6e61-4d52-82dd-64b42903f032',
    'c787ed4d-7fa8-4c71-be8d-1d554b99c557'
)
ORDER BY created_at DESC;

-- Verificar en orders_archive
SELECT 
    'EN ORDERS_ARCHIVE' as tabla,
    id::text as order_id,
    status,
    restaurant_id::text,
    archived_at,
    created_at
FROM orders_archive
WHERE id IN (
    'c537e51a-6e61-4d52-82dd-64b42903f032',
    'c787ed4d-7fa8-4c71-be8d-1d554b99c557'
)
ORDER BY archived_at DESC;

-- Resumen
SELECT 
    'RESUMEN' as tipo,
    (SELECT COUNT(*) FROM orders WHERE id IN ('c537e51a-6e61-4d52-82dd-64b42903f032', 'c787ed4d-7fa8-4c71-be8d-1d554b99c557')) as en_orders,
    (SELECT COUNT(*) FROM orders_archive WHERE id IN ('c537e51a-6e61-4d52-82dd-64b42903f032', 'c787ed4d-7fa8-4c71-be8d-1d554b99c557')) as en_orders_archive;
