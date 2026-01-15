-- Script para verificar por qué el dashboard no tiene datos
-- Ejecuta este script para ver el estado actual

-- 1. Verificar órdenes con status 'Pagado'
SELECT 
    'ÓRDENES PAGADAS' as tipo,
    COUNT(*) as cantidad,
    COUNT(DISTINCT restaurant_id) as restaurantes_distintos
FROM orders 
WHERE status = 'Pagado';

-- 2. Mostrar algunas órdenes pagadas de ejemplo
SELECT 
    'EJEMPLO ÓRDENES PAGADAS' as tipo,
    id::text as order_id,
    restaurant_id::text,
    status,
    total_amount,
    created_at
FROM orders 
WHERE status = 'Pagado'
ORDER BY created_at DESC
LIMIT 10;

-- 3. Verificar eventos en dashboard
SELECT 
    'EVENTOS EN DASHBOARD' as tipo,
    COUNT(*) as cantidad,
    COUNT(DISTINCT restaurant_id) as restaurantes_distintos
FROM dashboard_order_events;

-- 4. Verificar resúmenes en dashboard
SELECT 
    'RESÚMENES EN DASHBOARD' as tipo,
    COUNT(*) as cantidad,
    COUNT(DISTINCT restaurant_id) as restaurantes_distintos
FROM dashboard_daily_summary;

-- 5. Verificar si hay órdenes con otros status que deberían estar cerradas
SELECT 
    'TODOS LOS STATUS' as tipo,
    status,
    COUNT(*) as cantidad
FROM orders
GROUP BY status
ORDER BY cantidad DESC;

-- 6. Verificar el trigger
SELECT 
    'ESTADO DEL TRIGGER' as tipo,
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    CASE tgenabled 
        WHEN 'O' THEN 'Enabled'
        WHEN 'D' THEN 'Disabled'
        ELSE 'Unknown'
    END as status
FROM pg_trigger
WHERE tgname = 'trg_record_dashboard_order_event'
  AND tgrelid = 'orders'::regclass;

-- 7. Verificar la función
SELECT 
    'ESTADO DE LA FUNCIÓN' as tipo,
    proname as function_name,
    pronargs as num_args
FROM pg_proc
WHERE proname = 'record_dashboard_order_event';

-- 8. Si hay órdenes pagadas pero no eventos, mostrar el restaurant_id específico
DO $$
DECLARE
    v_restaurant_id uuid;
    v_paid_count integer;
    v_events_count integer;
BEGIN
    FOR v_restaurant_id IN 
        SELECT DISTINCT restaurant_id 
        FROM orders 
        WHERE status = 'Pagado'
    LOOP
        SELECT COUNT(*) INTO v_paid_count 
        FROM orders 
        WHERE status = 'Pagado' 
        AND restaurant_id = v_restaurant_id;
        
        SELECT COUNT(*) INTO v_events_count 
        FROM dashboard_order_events 
        WHERE restaurant_id = v_restaurant_id;
        
        RAISE NOTICE 'Restaurant %: % órdenes pagadas, % eventos en dashboard', 
            v_restaurant_id, v_paid_count, v_events_count;
    END LOOP;
END $$;
