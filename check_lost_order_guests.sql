-- Script para verificar si hay alguna forma de recuperar los order_guests perdidos

-- 1. Verificar estructura de la tabla payments primero
SELECT 
    'ESTRUCTURA DE PAYMENTS' as tipo,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'payments'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar si hay algún registro en payments que pueda dar pistas
SELECT 
    'PAYMENTS PARA MESAS 3 Y 4' as tipo,
    p.*
FROM payments p
WHERE p.order_id IN (
    'c537e51a-6e61-4d52-82dd-64b42903f032',
    'c787ed4d-7fa8-4c71-be8d-1d554b99c557'
)
ORDER BY p.order_id, p.created_at;

-- 3. Verificar estructura de payments_archive
SELECT 
    'ESTRUCTURA DE PAYMENTS_ARCHIVE' as tipo,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'payments_archive'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Verificar si hay payments archivados
SELECT 
    'PAYMENTS ARCHIVADOS PARA MESAS 3 Y 4' as tipo,
    pa.*
FROM payments_archive pa
WHERE pa.order_id IN (
    'c537e51a-6e61-4d52-82dd-64b42903f032',
    'c787ed4d-7fa8-4c71-be8d-1d554b99c557'
)
ORDER BY pa.order_id, pa.created_at;

-- 3. Verificar información de la orden archivada que pueda dar pistas
SELECT 
    'INFORMACIÓN DE ÓRDENES ARCHIVADAS' as tipo,
    oa.id::text as order_id,
    oa.guest_count,
    oa.total_amount,
    oa.status,
    t.table_number
FROM orders_archive oa
INNER JOIN tables t ON oa.table_id = t.id
WHERE oa.id IN (
    'c537e51a-6e61-4d52-82dd-64b42903f032',
    'c787ed4d-7fa8-4c71-be8d-1d554b99c557'
)
ORDER BY t.table_number;

-- 4. Comparar con la mesa 5 que sí tiene datos
SELECT 
    'MESA 5 - ORDER_GUESTS ARCHIVADOS (REFERENCIA)' as tipo,
    og.order_id::text,
    og.id::text as guest_id,
    og.name,
    og.individual_amount,
    og.paid,
    og.payment_method,
    og.payment_id
FROM order_guests_archive og
WHERE og.order_id = '6804bb42-3c50-4ae0-8fd7-3c863cb0a12a'
ORDER BY og.name;
