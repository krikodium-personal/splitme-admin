-- Script simple para verificar órdenes del restaurante
-- Restaurant ID: 2e0110b2-5977-4cef-b987-49afddd1795d

-- 1. Verificar todas las órdenes de este restaurante en TABLA ORDERS (todos los status)
SELECT 
    'ÓRDENES EN TABLA ORDERS' as tipo,
    status,
    COUNT(*) as cantidad,
    SUM(total_amount) as total_ventas
FROM orders
WHERE restaurant_id = '2e0110b2-5977-4cef-b987-49afddd1795d'
GROUP BY status
ORDER BY cantidad DESC;

-- 2. Verificar todas las órdenes de este restaurante en TABLA ORDERS_ARCHIVE
SELECT 
    'ÓRDENES EN TABLA ORDERS_ARCHIVE' as tipo,
    status,
    COUNT(*) as cantidad,
    SUM(total_amount) as total_ventas
FROM orders_archive
WHERE restaurant_id = '2e0110b2-5977-4cef-b987-49afddd1795d'
GROUP BY status
ORDER BY cantidad DESC;

-- 3. Mostrar algunas órdenes de ejemplo de ORDERS (últimas 10)
SELECT 
    'EJEMPLO ÓRDENES (orders)' as tipo,
    id::text as order_id,
    status,
    total_amount,
    created_at,
    table_id::text
FROM orders
WHERE restaurant_id = '2e0110b2-5977-4cef-b987-49afddd1795d'
ORDER BY created_at DESC
LIMIT 10;

-- 4. Mostrar algunas órdenes de ejemplo de ORDERS_ARCHIVE (últimas 10)
SELECT 
    'EJEMPLO ÓRDENES (orders_archive)' as tipo,
    id::text as order_id,
    status,
    total_amount,
    created_at,
    archived_at,
    table_id::text
FROM orders_archive
WHERE restaurant_id = '2e0110b2-5977-4cef-b987-49afddd1795d'
ORDER BY archived_at DESC
LIMIT 10;

-- 5. Verificar si hay órdenes pagadas en ORDERS
SELECT 
    'ÓRDENES PAGADAS (orders)' as tipo,
    COUNT(*) as cantidad,
    SUM(total_amount) as total_ventas
FROM orders
WHERE restaurant_id = '2e0110b2-5977-4cef-b987-49afddd1795d'
AND status = 'Pagado';

-- 6. Verificar si hay órdenes pagadas en ORDERS_ARCHIVE
SELECT 
    'ÓRDENES PAGADAS (orders_archive)' as tipo,
    COUNT(*) as cantidad,
    SUM(total_amount) as total_ventas
FROM orders_archive
WHERE restaurant_id = '2e0110b2-5977-4cef-b987-49afddd1795d'
AND status = 'Pagado';

-- 4. Verificar eventos en dashboard para este restaurante
SELECT 
    'EVENTOS EN DASHBOARD' as tipo,
    COUNT(*) as cantidad,
    SUM(total_amount) as total_ventas
FROM dashboard_order_events
WHERE restaurant_id = '2e0110b2-5977-4cef-b987-49afddd1795d';

-- 5. Verificar resúmenes en dashboard para este restaurante
SELECT 
    'RESÚMENES EN DASHBOARD' as tipo,
    COUNT(*) as cantidad,
    SUM(total_sales) as total_ventas
FROM dashboard_daily_summary
WHERE restaurant_id = '2e0110b2-5977-4cef-b987-49afddd1795d';
