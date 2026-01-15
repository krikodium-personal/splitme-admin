-- Script para verificar si la función archive_order existe y está funcionando

-- 1. Verificar si la función existe
SELECT 
    'FUNCIÓN archive_order' as tipo,
    proname as nombre_funcion,
    pronargs as num_parametros,
    pg_get_function_arguments(oid) as argumentos
FROM pg_proc
WHERE proname = 'archive_order';

-- 2. Verificar si las tablas de archivo existen
SELECT 
    'TABLAS DE ARCHIVO' as tipo,
    table_name,
    CASE 
        WHEN table_name IN ('orders_archive', 'order_batches_archive', 'order_items_archive', 'order_guests_archive', 'payments_archive')
        THEN '✓ Existe'
        ELSE '✗ No existe'
    END as estado
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%_archive'
ORDER BY table_name;

-- 3. Verificar permisos de la función
SELECT 
    'PERMISOS' as tipo,
    grantee as usuario,
    privilege_type as permiso
FROM information_schema.routine_privileges
WHERE routine_name = 'archive_order';

-- 4. Mostrar órdenes pagadas que NO están archivadas
SELECT 
    'ÓRDENES PAGADAS NO ARCHIVADAS' as tipo,
    o.id::text as order_id,
    o.restaurant_id::text,
    o.status,
    o.table_id::text,
    o.total_amount,
    o.created_at,
    CASE 
        WHEN EXISTS (SELECT 1 FROM orders_archive oa WHERE oa.id = o.id)
        THEN '✓ Archivada'
        ELSE '✗ No archivada'
    END as estado_archivo
FROM orders o
WHERE o.status = 'Pagado'
ORDER BY o.created_at DESC
LIMIT 10;
